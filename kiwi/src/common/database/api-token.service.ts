import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Prisma, ApiToken } from '@prisma/client';

export type ApiTokenWithWebhook = Prisma.ApiTokenGetPayload<{
  include: { webhook: true };
}>;

export type ApiTokenWithRelations = Prisma.ApiTokenGetPayload<{
  include: {
    webhook: true;
    user: true;
  };
}>;

@Injectable()
export class ApiTokenService {
  constructor(private database: DatabaseService) {}

  async apiToken(
    apiTokenWhereUniqueInput: Prisma.ApiTokenWhereUniqueInput,
  ): Promise<ApiToken | null> {
    return this.database.apiToken.findUnique({
      where: apiTokenWhereUniqueInput,
    });
  }

  async apiTokens(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ApiTokenWhereUniqueInput;
    where?: Prisma.ApiTokenWhereInput;
    orderBy?: Prisma.ApiTokenOrderByWithRelationInput;
  }): Promise<ApiToken[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.apiToken.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async findMany<T extends Prisma.ApiTokenFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ApiTokenFindManyArgs>,
  ) {
    return this.database.apiToken.findMany<T>(args);
  }

  async findUnique<T extends Prisma.ApiTokenFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.ApiTokenFindUniqueArgs>,
  ) {
    return this.database.apiToken.findUnique<T>(args);
  }

  async apiTokensWithWebhook(params: {
    where?: Prisma.ApiTokenWhereInput;
  }): Promise<ApiTokenWithWebhook[]> {
    return this.findMany({
      where: params.where,
      include: { webhook: true },
    });
  }

  async apiTokenWithRelations(
    where: Prisma.ApiTokenWhereUniqueInput,
  ): Promise<ApiTokenWithRelations | null> {
    return this.findUnique({
      where,
      include: {
        webhook: true,
        user: true,
      },
    });
  }

  async createApiToken(
    data: Prisma.ApiTokenCreateInput | Prisma.ApiTokenUncheckedCreateInput,
  ): Promise<ApiToken> {
    return this.database.apiToken.create({
      data,
    });
  }

  async create<T extends Prisma.ApiTokenCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.ApiTokenCreateArgs>,
  ) {
    return this.database.apiToken.create<T>(args);
  }

  async updateApiToken(params: {
    where: Prisma.ApiTokenWhereUniqueInput;
    data: Prisma.ApiTokenUpdateInput | Prisma.ApiTokenUncheckedUpdateInput;
  }): Promise<ApiToken> {
    const { where, data } = params;
    return this.database.apiToken.update({
      data,
      where,
    });
  }

  async update<T extends Prisma.ApiTokenUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.ApiTokenUpdateArgs>,
  ) {
    return this.database.apiToken.update<T>(args);
  }

  async deleteApiToken(
    where: Prisma.ApiTokenWhereUniqueInput,
  ): Promise<ApiToken> {
    return this.database.apiToken.delete({
      where,
    });
  }

  async findActiveTokens(): Promise<ApiTokenWithRelations[]> {
    return this.findMany({
      where: {
        isActive: true,
      },
      include: {
        webhook: true,
        user: true,
      },
    });
  }

  async countApiTokens(where?: Prisma.ApiTokenWhereInput): Promise<number> {
    return this.database.apiToken.count({
      where,
    });
  }
}
