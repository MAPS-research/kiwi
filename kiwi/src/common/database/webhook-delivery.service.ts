import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Prisma, WebhookDelivery } from '@prisma/client';

export type WebhookDeliveryWithEndpoint = Prisma.WebhookDeliveryGetPayload<{
  include: { endpoint: true };
}>;

@Injectable()
export class WebhookDeliveryService {
  constructor(private database: DatabaseService) {}

  async webhookDelivery(
    webhookDeliveryWhereUniqueInput: Prisma.WebhookDeliveryWhereUniqueInput,
  ): Promise<WebhookDelivery | null> {
    return this.database.webhookDelivery.findUnique({
      where: webhookDeliveryWhereUniqueInput,
    });
  }

  async webhookDeliveries(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.WebhookDeliveryWhereUniqueInput;
    where?: Prisma.WebhookDeliveryWhereInput;
    orderBy?: Prisma.WebhookDeliveryOrderByWithRelationInput;
  }): Promise<WebhookDelivery[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.webhookDelivery.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async findMany<T extends Prisma.WebhookDeliveryFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.WebhookDeliveryFindManyArgs>,
  ) {
    return this.database.webhookDelivery.findMany<T>(args);
  }

  async findUnique<T extends Prisma.WebhookDeliveryFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.WebhookDeliveryFindUniqueArgs>,
  ) {
    return this.database.webhookDelivery.findUnique<T>(args);
  }

  async createWebhookDelivery(
    data:
      | Prisma.WebhookDeliveryCreateInput
      | Prisma.WebhookDeliveryUncheckedCreateInput,
  ): Promise<WebhookDelivery> {
    return this.database.webhookDelivery.create({
      data,
    });
  }

  async create<T extends Prisma.WebhookDeliveryCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.WebhookDeliveryCreateArgs>,
  ) {
    return this.database.webhookDelivery.create<T>(args);
  }

  async updateWebhookDelivery(params: {
    where: Prisma.WebhookDeliveryWhereUniqueInput;
    data:
      | Prisma.WebhookDeliveryUpdateInput
      | Prisma.WebhookDeliveryUncheckedUpdateInput;
  }): Promise<WebhookDelivery> {
    const { where, data } = params;
    return this.database.webhookDelivery.update({
      data,
      where,
    });
  }

  async update<T extends Prisma.WebhookDeliveryUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.WebhookDeliveryUpdateArgs>,
  ) {
    return this.database.webhookDelivery.update<T>(args);
  }

  async deleteWebhookDelivery(
    where: Prisma.WebhookDeliveryWhereUniqueInput,
  ): Promise<WebhookDelivery> {
    return this.database.webhookDelivery.delete({
      where,
    });
  }

  async countWebhookDeliveries(
    where?: Prisma.WebhookDeliveryWhereInput,
  ): Promise<number> {
    return this.database.webhookDelivery.count({
      where,
    });
  }

  async getDeliveriesByWebhookId(
    webhookId: string,
    limit = 100,
  ): Promise<WebhookDelivery[]> {
    return this.findMany({
      where: { endpointId: webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        endpointId: true,
        eventType: true,
        payload: true,
        status: true,
        attempts: true,
        response: true,
        createdAt: true,
      },
    });
  }
}
