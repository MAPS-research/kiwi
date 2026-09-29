import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { WebhookEvent, Prisma } from '@prisma/client';

@Injectable()
export class WebhookEventService {
  constructor(private database: DatabaseService) {}

  async webhookEvent(
    webhookEventWhereUniqueInput: Prisma.WebhookEventWhereUniqueInput,
  ): Promise<WebhookEvent | null> {
    return this.database.webhookEvent.findUnique({
      where: webhookEventWhereUniqueInput,
    });
  }

  async webhookEvents(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.WebhookEventWhereUniqueInput;
    where?: Prisma.WebhookEventWhereInput;
    orderBy?: Prisma.WebhookEventOrderByWithRelationInput;
    include?: Prisma.WebhookEventInclude;
    select?: Prisma.WebhookEventSelect;
  }): Promise<WebhookEvent[]> {
    const { skip, take, cursor, where, orderBy, include, select } = params;
    return this.database.webhookEvent.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      ...(select ? { select } : include ? { include } : {}),
    });
  }

  async createWebhookEvent(
    data:
      Prisma.WebhookEventCreateInput | Prisma.WebhookEventUncheckedCreateInput,
  ): Promise<WebhookEvent> {
    return this.database.webhookEvent.create({
      data,
    });
  }

  async updateWebhookEvent(params: {
    where: Prisma.WebhookEventWhereUniqueInput;
    data: Prisma.WebhookEventUpdateInput;
  }): Promise<WebhookEvent> {
    const { where, data } = params;
    return this.database.webhookEvent.update({
      data,
      where,
    });
  }

  async deleteWebhookEvent(
    where: Prisma.WebhookEventWhereUniqueInput,
  ): Promise<WebhookEvent> {
    return this.database.webhookEvent.delete({
      where,
    });
  }

  async findUnique(params: {
    where: Prisma.WebhookEventWhereUniqueInput;
    include?: Prisma.WebhookEventInclude;
    select?: Prisma.WebhookEventSelect;
  }) {
    const { where, include, select } = params;
    return this.database.webhookEvent.findUnique({
      where,
      ...(select ? { select } : include ? { include } : {}),
    });
  }

  async findMany(params: {
    where?: Prisma.WebhookEventWhereInput;
    orderBy?: Prisma.WebhookEventOrderByWithRelationInput;
    take?: number;
    skip?: number;
    include?: Prisma.WebhookEventInclude;
    select?: Prisma.WebhookEventSelect;
  }) {
    const { where, orderBy, take, skip, include, select } = params;
    return this.database.webhookEvent.findMany({
      where,
      orderBy,
      take,
      skip,
      ...(select ? { select } : include ? { include } : {}),
    });
  }

  async update(params: {
    where: Prisma.WebhookEventWhereUniqueInput;
    data: Prisma.WebhookEventUpdateInput;
    include?: Prisma.WebhookEventInclude;
    select?: Prisma.WebhookEventSelect;
  }) {
    const { where, data, include, select } = params;
    return this.database.webhookEvent.update({
      where,
      data,
      ...(select ? { select } : include ? { include } : {}),
    });
  }

  async create(params: {
    data:
      Prisma.WebhookEventCreateInput | Prisma.WebhookEventUncheckedCreateInput;
    include?: Prisma.WebhookEventInclude;
    select?: Prisma.WebhookEventSelect;
  }) {
    const { data, include, select } = params;
    return this.database.webhookEvent.create({
      data,
      ...(select ? { select } : include ? { include } : {}),
    });
  }
}
