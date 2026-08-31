import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Prisma, WebhookEventAudit } from '@prisma/client';

@Injectable()
export class WebhookEventAuditService {
  constructor(private database: DatabaseService) {}

  async create(
    data: Prisma.WebhookEventAuditCreateInput,
  ): Promise<WebhookEventAudit> {
    return this.database.webhookEventAudit.create({
      data,
    });
  }

  async findMany(params: {
    where?: Prisma.WebhookEventAuditWhereInput;
    orderBy?: Prisma.WebhookEventAuditOrderByWithRelationInput;
    take?: number;
    skip?: number;
    include?: Prisma.WebhookEventAuditInclude;
  }) {
    const { where, orderBy, take, skip, include } = params;
    return this.database.webhookEventAudit.findMany({
      where,
      orderBy,
      take,
      skip,
      include,
    });
  }

  async count(where?: Prisma.WebhookEventAuditWhereInput): Promise<number> {
    return this.database.webhookEventAudit.count({ where });
  }

  async findByWebhookEvent(webhookEventId: string) {
    return this.database.webhookEventAudit.findMany({
      where: { webhookEventId },
      orderBy: { timestamp: 'desc' },
      include: {
        performer: {
          select: {
            id: true,
            email: true,
            systemRole: true,
          },
        },
      },
    });
  }

  async findByUser(
    userId: string,
    params?: {
      take?: number;
      skip?: number;
      action?: string;
    },
  ) {
    const { take, skip, action } = params || {};
    return this.database.webhookEventAudit.findMany({
      where: {
        performedBy: userId,
        ...(action && { action }),
      },
      orderBy: { timestamp: 'desc' },
      take,
      skip,
      include: {
        webhookEvent: {
          select: {
            id: true,
            eventType: true,
            status: true,
            createdAt: true,
          },
        },
        performer: {
          select: {
            id: true,
            email: true,
            systemRole: true,
          },
        },
      },
    });
  }

  async getRecentAudits(params?: {
    take?: number;
    skip?: number;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { take = 50, skip = 0, action, startDate, endDate } = params || {};

    const where: Prisma.WebhookEventAuditWhereInput = {
      ...(action && { action }),
      ...(startDate || endDate
        ? {
            timestamp: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    const [audits, total] = await Promise.all([
      this.database.webhookEventAudit.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take,
        skip,
        include: {
          webhookEvent: {
            select: {
              id: true,
              eventType: true,
              status: true,
              payload: true,
              createdAt: true,
              webhook: {
                select: {
                  id: true,
                  url: true,
                },
              },
            },
          },
          performer: {
            select: {
              id: true,
              email: true,
              systemRole: true,
            },
          },
        },
      }),
      this.count(where),
    ]);

    return { audits, total };
  }
}
