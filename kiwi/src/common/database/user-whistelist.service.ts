import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { UserWhitelist, Prisma } from '@prisma/client';

@Injectable()
export class UserWhitelistService {
  constructor(private database: DatabaseService) {}

  async userWhitelist(
    userWhitelistWhereUniqueInput: Prisma.UserWhitelistWhereUniqueInput,
  ): Promise<UserWhitelist | null> {
    return this.database.userWhitelist.findUnique({
      where: userWhitelistWhereUniqueInput,
    });
  }

  async userWhitelists(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhitelistWhereUniqueInput;
    where?: Prisma.UserWhitelistWhereInput;
    orderBy?: Prisma.UserWhitelistOrderByWithRelationInput;
  }): Promise<UserWhitelist[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.userWhitelist.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createUserWhitelist(params: { email: string }): Promise<UserWhitelist> {
    const data = {
      email: params.email,
      status: 'enabled',
    };
    return this.database.userWhitelist.create({
      data,
    });
  }

  async updateUserWhitelist(params: {
    email: string;
    status: 'enabled' | 'disabled';
  }): Promise<UserWhitelist> {
    const where: Prisma.UserWhitelistWhereUniqueInput = {
      email: params.email,
    };
    const data = {
      status: params.status,
    };
    return this.database.userWhitelist.update({
      data,
      where,
    });
  }
}
