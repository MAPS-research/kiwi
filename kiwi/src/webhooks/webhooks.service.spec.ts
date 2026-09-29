import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhookEventService } from './webhook-event.service';
import { DatabaseService } from '../common/database/database.service';
import { WebhookEndpointService } from '../common/database/webhook-endpoint.service';
import { WebhookDeliveryService } from '../common/database/webhook-delivery.service';

describe('WebhooksService.handleWebhookEvent (user.enroll)', () => {
  let service: WebhooksService;
  let databaseService: any;
  let webhookEventService: any;

  beforeEach(async () => {
    databaseService = { class: { findUnique: jest.fn() } };
    webhookEventService = {
      createWebhookEvent: jest.fn().mockResolvedValue({ id: 'event-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: DatabaseService, useValue: databaseService },
        {
          provide: WebhookEndpointService,
          useValue: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'hook-1',
              events: ['user.enroll'],
              isActive: true,
            }),
          },
        },
        { provide: WebhookDeliveryService, useValue: {} },
        { provide: WebhookEventService, useValue: webhookEventService },
        { provide: getQueueToken('webhook-delivery'), useValue: {} },
      ],
    }).compile();

    service = module.get(WebhooksService);
  });

  const submit = (data: any) =>
    service.handleWebhookEvent('hook-1', { event: 'user.enroll', data });

  it('rejects a payload without email or classId', async () => {
    await expect(submit({ email: 'a@example.com' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(submit({ classId: 'class-1' })).rejects.toThrow(
      BadRequestException,
    );
    expect(webhookEventService.createWebhookEvent).not.toHaveBeenCalled();
  });

  it('rejects an unknown classId at submission', async () => {
    databaseService.class.findUnique.mockResolvedValue(null);

    await expect(
      submit({ email: 'a@example.com', classId: 'typo' }),
    ).rejects.toThrow(NotFoundException);
    expect(webhookEventService.createWebhookEvent).not.toHaveBeenCalled();
  });

  it('stores a valid event for approval', async () => {
    databaseService.class.findUnique.mockResolvedValue({ id: 'class-1' });

    await expect(
      submit({ email: 'a@example.com', classId: 'class-1' }),
    ).resolves.toMatchObject({
      eventId: 'event-1',
      status: 'pending_approval',
    });
  });
});
