import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Prisma, WebhookEndpoint } from '@prisma/client';

export type WebhookEndpointWithApiToken = Prisma.WebhookEndpointGetPayload<{
  include: { apiToken: true };
}>;

export type WebhookEndpointWithDeliveries = Prisma.WebhookEndpointGetPayload<{
  include: { deliveries: true };
}>;

export type WebhookEndpointWithRelations = Prisma.WebhookEndpointGetPayload<{
  include: {
    apiToken: true;
    deliveries: true;
  };
}>;

@Injectable()
export class WebhookEndpointService {
  constructor(private database: DatabaseService) {}

  async webhookEndpoint(
    webhookEndpointWhereUniqueInput: Prisma.WebhookEndpointWhereUniqueInput,
  ): Promise<WebhookEndpoint | null> {
    return this.database.webhookEndpoint.findUnique({
      where: webhookEndpointWhereUniqueInput,
    });
  }

  async webhookEndpoints(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.WebhookEndpointWhereUniqueInput;
    where?: Prisma.WebhookEndpointWhereInput;
    orderBy?: Prisma.WebhookEndpointOrderByWithRelationInput;
  }): Promise<WebhookEndpoint[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.webhookEndpoint.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async findMany<T extends Prisma.WebhookEndpointFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.WebhookEndpointFindManyArgs>,
  ) {
    return this.database.webhookEndpoint.findMany<T>(args);
  }

  async findUnique<T extends Prisma.WebhookEndpointFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.WebhookEndpointFindUniqueArgs>,
  ) {
    return this.database.webhookEndpoint.findUnique<T>(args);
  }

  async webhookEndpointsWithApiToken(params: {
    where?: Prisma.WebhookEndpointWhereInput;
  }): Promise<WebhookEndpointWithApiToken[]> {
    return this.findMany({
      where: params.where,
      include: { apiToken: true },
    });
  }

  async webhookEndpointWithRelations(
    where: Prisma.WebhookEndpointWhereUniqueInput,
  ): Promise<WebhookEndpointWithRelations | null> {
    return this.findUnique({
      where,
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
  }

  async createWebhookEndpoint(
    data:
      | Prisma.WebhookEndpointCreateInput
      | Prisma.WebhookEndpointUncheckedCreateInput,
  ): Promise<WebhookEndpoint> {
    return this.database.webhookEndpoint.create({
      data,
    });
  }

  async create<T extends Prisma.WebhookEndpointCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.WebhookEndpointCreateArgs>,
  ) {
    return this.database.webhookEndpoint.create<T>(args);
  }

  async updateWebhookEndpoint(params: {
    where: Prisma.WebhookEndpointWhereUniqueInput;
    data:
      | Prisma.WebhookEndpointUpdateInput
      | Prisma.WebhookEndpointUncheckedUpdateInput;
  }): Promise<WebhookEndpoint> {
    const { where, data } = params;
    return this.database.webhookEndpoint.update({
      data,
      where,
    });
  }

  async update<T extends Prisma.WebhookEndpointUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.WebhookEndpointUpdateArgs>,
  ) {
    return this.database.webhookEndpoint.update<T>(args);
  }

  async deleteWebhookEndpoint(
    where: Prisma.WebhookEndpointWhereUniqueInput,
  ): Promise<WebhookEndpoint> {
    return this.database.webhookEndpoint.delete({
      where,
    });
  }

  async countWebhookEndpoints(
    where?: Prisma.WebhookEndpointWhereInput,
  ): Promise<number> {
    return this.database.webhookEndpoint.count({
      where,
    });
  }
}