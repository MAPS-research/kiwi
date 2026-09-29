import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { WebhookEndpointService } from '../common/database/webhook-endpoint.service';
import { WebhookDeliveryService } from '../common/database/webhook-delivery.service';
import { WebhookEventService } from './webhook-event.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly webhookEndpointService: WebhookEndpointService,
    private readonly webhookDeliveryService: WebhookDeliveryService,
    private readonly webhookEventService: WebhookEventService,
    @InjectQueue('webhook-delivery') private webhookQueue: Queue,
  ) {}

  async create(userId: string, createWebhookDto: CreateWebhookDto) {
    const secret =
      createWebhookDto.secret || crypto.randomBytes(32).toString('hex');

    // Create webhook with placeholder URL first
    const webhook = await this.databaseService.webhookEndpoint.create({
      data: {
        url: '', // Placeholder, will be updated with actual ID
        events: createWebhookDto.events,
        secret,
        userId,
      },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Update the URL to use the actual database ID
    const updatedWebhook = await this.databaseService.webhookEndpoint.update({
      where: { id: webhook.id },
      data: {
        url: `/webhooks/webhook/${webhook.id}`,
      },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      ...updatedWebhook,
      secret, // Return secret only on creation
    };
  }

  async findAll(userId: string) {
    return this.webhookEndpointService.findMany({
      where: { userId },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        apiToken: {
          select: {
            id: true,
            name: true,
            isActive: true,
            lastUsedAt: true,
          },
        },
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const webhook = await this.webhookEndpointService.findUnique({
      where: { id },
      include: {
        apiToken: true,
        deliveries: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this webhook',
      );
    }

    // Don't return the secret

    const { secret, ...webhookData } = webhook;
    return webhookData;
  }

  async update(userId: string, id: string, updateWebhookDto: UpdateWebhookDto) {
    const webhook = await this.webhookEndpointService.webhookEndpoint({
      id,
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this webhook',
      );
    }

    return this.webhookEndpointService.update({
      where: { id },
      data: updateWebhookDto,
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async remove(userId: string, id: string) {
    const webhook = await this.webhookEndpointService.webhookEndpoint({
      id,
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this webhook',
      );
    }

    // Soft delete - set webhook as inactive instead of deleting
    await this.webhookEndpointService.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Webhook deleted successfully' };
  }

  async handleWebhookEvent(webhookId: string, event: WebhookEventDto) {
    const webhook = await this.webhookEndpointService.findUnique({
      where: { id: webhookId },
      select: {
        id: true,
        events: true,
        isActive: true,
      },
    });

    if (!webhook || !webhook.isActive) {
      throw new NotFoundException('Webhook not found or inactive');
    }

    // Check if webhook is subscribed to this event
    if (
      !webhook.events.includes(event.event) &&
      !webhook.events.includes('*')
    ) {
      this.logger.log(
        `Webhook ${webhookId} not subscribed to event ${event.event}`,
      );
      return { message: 'Event ignored - not subscribed' };
    }

    // Log the webhook event
    this.logger.log(`Webhook ${webhookId} received event: ${event.event}`);
    this.logger.log(`Event data: ${JSON.stringify(event.data)}`);

    // Check if this is a user.enroll event that needs approval
    if (event.event === 'user.enroll') {
      // Reject a bad payload now, so the caller (e.g. n8n) sees the error
      // instead of the approver. Execution re-checks the class, since it can
      // be deleted before approval.
      const { email, classId } = event.data ?? {};
      if (typeof email !== 'string' || !email || typeof classId !== 'string') {
        throw new BadRequestException(
          'user.enroll requires string email and classId in data',
        );
      }
      const targetClass = await this.databaseService.class.findUnique({
        where: { id: classId },
        select: { id: true },
      });
      if (!targetClass) {
        throw new NotFoundException(`Class ${classId} not found`);
      }

      // Store the event for approval instead of processing immediately
      const webhookEvent = await this.webhookEventService.createWebhookEvent({
        webhookId,
        eventType: event.event,
        payload: event.data,
      });

      this.logger.log(
        `User enrollment event stored for approval: ${webhookEvent.id}`,
      );

      return {
        message: 'User enrollment event received and pending admin approval',
        eventId: webhookEvent.id,
        status: 'pending_approval',
      };
    }

    // For other events, process immediately
    // Create delivery record
    const delivery = await this.webhookDeliveryService.createWebhookDelivery({
      endpointId: webhookId,
      eventType: event.event,
      payload: event.data,
      status: 'pending',
    });

    // Queue for processing (in a real implementation, this would make HTTP calls)
    await this.webhookQueue.add('deliver-webhook', {
      deliveryId: delivery.id,
      webhookId,
      event: event.event,
      payload: event.data,
    });

    return {
      message: 'Webhook event received and queued for processing',
      deliveryId: delivery.id,
    };
  }

  async triggerEvent(eventType: string, data: any) {
    // Find all webhooks subscribed to this event
    const webhooks = await this.webhookEndpointService.webhookEndpoints({
      where: {
        isActive: true,
        OR: [{ events: { has: eventType } }, { events: { has: '*' } }],
      },
    });

    this.logger.log(
      `Triggering event ${eventType} for ${webhooks.length} webhooks`,
    );

    for (const webhook of webhooks) {
      await this.handleWebhookEvent(webhook.id, {
        event: eventType,
        data,
      });
    }

    return {
      event: eventType,
      webhooksTriggered: webhooks.length,
    };
  }

  async getDeliveries(userId: string, webhookId: string) {
    // First verify the webhook belongs to the user
    const webhook = await this.webhookEndpointService.webhookEndpoint({
      id: webhookId,
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view deliveries for this webhook',
      );
    }

    // Get deliveries for this webhook
    return this.webhookDeliveryService.getDeliveriesByWebhookId(webhookId, 100);
  }
}
