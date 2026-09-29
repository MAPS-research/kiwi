import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { WebhookEventService as DatabaseWebhookEventService } from '../common/database/webhook-event.service';
import { WebhookEventAuditService } from '../common/database/webhook-event-audit.service';
import { UserService } from '../common/database/user.service';
import { UserWhitelistService } from '../common/database/user-whistelist.service';
import { EnrollmentService } from '../common/database/enrollment.service';
import { ClassService } from '../common/database/class.service';
import { Prisma } from '@prisma/client';
import { InstructorClassService } from '../instructor-class/instructor-class.service';

@Injectable()
export class WebhookEventService {
  private readonly logger = new Logger(WebhookEventService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly webhookEventService: DatabaseWebhookEventService,
    private readonly webhookEventAuditService: WebhookEventAuditService,
    private readonly userService: UserService,
    private readonly userWhitelistService: UserWhitelistService,
    private readonly enrollmentService: EnrollmentService,
    private readonly classService: ClassService,
    private readonly instructorClassService: InstructorClassService,
  ) {}

  async createWebhookEvent(data: {
    webhookId: string;
    eventType: string;
    payload: any;
  }) {
    return this.webhookEventService.create({
      data: {
        webhookId: data.webhookId,
        eventType: data.eventType,
        payload: data.payload as Prisma.JsonObject,
        status: 'pending',
      },
    });
  }

  async getPendingEvents() {
    return this.webhookEventService.findMany({
      where: { status: 'pending' },
      include: {
        webhook: {
          select: {
            id: true,
            url: true,
            userId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Whether `userId` may see and decide on `event`. Enrollment events belong to
   * the class in their payload and can be handled by anyone who manages that
   * class; any other event type is admin-only.
   */
  async canActOnEvent(
    event: { eventType: string; payload: Prisma.JsonValue },
    userId: string,
  ): Promise<boolean> {
    const classId = (event.payload as { classId?: unknown } | null)?.classId;
    if (event.eventType === 'user.enroll' && typeof classId === 'string') {
      return this.instructorClassService.canManageClass(userId, classId);
    }
    const user = await this.userService.user({ id: userId });
    return user?.systemRole === 'admin';
  }

  /** Pending events the user is allowed to act on. */
  async getPendingEventsFor(userId: string) {
    const events = await this.getPendingEvents();
    const allowed = await Promise.all(
      events.map((event) => this.canActOnEvent(event, userId)),
    );
    return events.filter((_, i) => allowed[i]);
  }

  /**
   * Loads an event the user may act on. Events for classes the user doesn't
   * manage are reported as not found rather than forbidden.
   */
  async getWebhookEventFor(id: string, userId: string) {
    const event = await this.getWebhookEvent(id);
    if (!(await this.canActOnEvent(event, userId))) {
      throw new NotFoundException('Webhook event not found');
    }
    return event;
  }

  async getWebhookEvent(id: string) {
    const event = await this.webhookEventService.findUnique({
      where: { id },
      include: {
        webhook: {
          select: {
            id: true,
            url: true,
            events: true,
            isActive: true,
            userId: true,
            createdAt: true,
          },
        },
        approver: { select: { id: true, email: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Webhook event not found');
    }

    return event;
  }

  async approveEvent(eventId: string, adminUserId: string, metadata?: any) {
    const event = await this.getWebhookEvent(eventId);

    if (event.status !== 'pending') {
      throw new BadRequestException(`Event is already ${event.status}`);
    }

    // Update status to approved
    await this.webhookEventService.update({
      where: { id: eventId },
      data: {
        status: 'approved',
        approver: { connect: { id: adminUserId } },
        approvedAt: new Date(),
      },
    });

    // Create audit log
    await this.webhookEventAuditService.create({
      webhookEvent: { connect: { id: eventId } },
      action: 'approved',
      performer: { connect: { id: adminUserId } },
      metadata: metadata || null,
    });

    // Execute the event based on type
    if (event.eventType === 'user.enroll') {
      await this.executeUserEnrollment(eventId);
    }

    return { message: 'Event approved and executed successfully' };
  }

  async rejectEvent(
    eventId: string,
    adminUserId: string,
    reason?: string,
    metadata?: any,
  ) {
    const event = await this.getWebhookEvent(eventId);

    if (event.status !== 'pending') {
      throw new BadRequestException(`Event is already ${event.status}`);
    }

    const updatedEvent = await this.webhookEventService.update({
      where: { id: eventId },
      data: {
        status: 'rejected',
        approver: { connect: { id: adminUserId } },
        approvedAt: new Date(),
      },
    });

    // Create audit log
    await this.webhookEventAuditService.create({
      webhookEvent: { connect: { id: eventId } },
      action: 'rejected',
      performer: { connect: { id: adminUserId } },
      reason: reason || null,
      metadata: metadata || null,
    });

    return updatedEvent;
  }

  async executeUserEnrollment(eventId: string) {
    const event = await this.getWebhookEvent(eventId);

    if (event.eventType !== 'user.enroll') {
      throw new BadRequestException('Event is not a user enrollment event');
    }

    const payload = event.payload as any;
    const { email, classId } = payload;

    if (!email || !classId) {
      throw new BadRequestException(
        'Email and classId are required in payload',
      );
    }

    try {
      // 1. Check if class exists
      const classExists = await this.classService.class({ id: classId });
      if (!classExists) {
        throw new NotFoundException(`Class ${classId} not found`);
      }

      // 2. Add user to whitelist if not exists
      let whitelistEntry = await this.userWhitelistService.userWhitelist({
        email,
      });

      if (!whitelistEntry) {
        this.logger.log(`Adding ${email} to whitelist`);
        whitelistEntry = await this.userWhitelistService.createUserWhitelist({
          email,
        });
      } else if (whitelistEntry.status !== 'enabled') {
        // Enable the user if they were disabled
        await this.userWhitelistService.updateUserWhitelist({
          email,
          status: 'enabled',
        });
      }

      // 3. Check if user exists
      let user = await this.userService.user({ email });

      if (!user) {
        // Create user with minimal information
        // In a real system, you might want to send an invitation email
        this.logger.log(`Creating user account for ${email}`);
        user = await this.userService.createUser({
          email,
          oauthId: `webhook_${email}_${Date.now()}`, // Generate unique ID
          oauth: false,
          systemRole: 'user',
        });
      }

      // 4. Check if already enrolled
      const existingEnrollment = await this.enrollmentService.enrollment({
        classId_userId: {
          classId,
          userId: user.id,
        },
      });

      if (existingEnrollment) {
        this.logger.log(
          `User ${email} is already enrolled in class ${classId}`,
        );
        // Still mark as executed since the end goal is achieved
        await this.webhookEventService.update({
          where: { id: eventId },
          data: {
            status: 'executed',
            executedAt: new Date(),
            enrollmentId: `${classId}_${user.id}`,
          },
        });
        return existingEnrollment;
      }

      // 5. Enroll user in class
      this.logger.log(`Enrolling ${email} in class ${classId}`);
      const enrollment = await this.enrollmentService.createEnrollment({
        classId,
        userId: user.id,
        role: 'student',
      });

      // 6. Update webhook event status
      await this.webhookEventService.update({
        where: { id: eventId },
        data: {
          status: 'executed',
          executedAt: new Date(),
          enrollmentId: `${classId}_${user.id}`,
        },
      });

      this.logger.log(
        `Successfully enrolled ${email} in class ${classId} via webhook`,
      );

      return enrollment;
    } catch (error) {
      this.logger.error(`Failed to execute enrollment: ${error.message}`);

      // Update webhook event with error
      await this.webhookEventService.update({
        where: { id: eventId },
        data: {
          status: 'failed',
          executedAt: new Date(),
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  async getEventsByWebhook(webhookId: string, userId: string) {
    // Verify webhook belongs to user
    const webhook = await this.databaseService.webhookEndpoint.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || webhook.userId !== userId) {
      throw new ForbiddenException('Access denied to this webhook');
    }

    return this.webhookEventService.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // Audit history methods
  async getEventAuditHistory(eventId: string) {
    const audits =
      await this.webhookEventAuditService.findByWebhookEvent(eventId);
    return {
      audits,
      total: audits.length,
    };
  }

  async getAllAuditHistory(params?: {
    page?: number;
    limit?: number;
    skip?: number;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = params?.skip ?? (page - 1) * limit;

    const result = await this.webhookEventAuditService.getRecentAudits({
      take: limit,
      skip,
      action: params?.action,
      startDate: params?.startDate,
      endDate: params?.endDate,
    });

    const totalPages = Math.ceil(result.total / limit);

    return {
      audits: result.audits,
      total: result.total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async getUserAuditHistory(
    userId: string,
    params?: {
      page?: number;
      limit?: number;
      skip?: number;
      action?: string;
    },
  ) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = params?.skip ?? (page - 1) * limit;

    const [audits, total] = await Promise.all([
      this.webhookEventAuditService.findByUser(userId, {
        take: limit,
        skip,
        action: params?.action,
      }),
      this.webhookEventAuditService.count({
        performedBy: userId,
        ...(params?.action && { action: params.action }),
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      audits,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }
}
