import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PendingAdmin, Prisma } from '@prisma/client';

@Injectable()
export class PendingAdminService {
  constructor(private database: DatabaseService) {}

  async pendingAdmin(
    pendingAdminWhereUniqueInput: Prisma.PendingAdminWhereUniqueInput,
  ): Promise<PendingAdmin | null> {
    return this.database.pendingAdmin.findUnique({
      where: pendingAdminWhereUniqueInput,
    });
  }

  async pendingAdmins(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.PendingAdminWhereUniqueInput;
    where?: Prisma.PendingAdminWhereInput;
    orderBy?: Prisma.PendingAdminOrderByWithRelationInput;
  }): Promise<PendingAdmin[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.pendingAdmin.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createPendingAdmin(
    data:
      Prisma.PendingAdminCreateInput | Prisma.PendingAdminUncheckedCreateInput,
  ): Promise<PendingAdmin> {
    return this.database.pendingAdmin.create({
      data,
    });
  }

  async updatePendingAdmin(params: {
    where: Prisma.PendingAdminWhereUniqueInput;
    data: Prisma.PendingAdminUpdateInput;
  }): Promise<PendingAdmin> {
    const { where, data } = params;
    return this.database.pendingAdmin.update({
      data,
      where,
    });
  }

  async deletePendingAdmin(
    pendingAdminWhereUniqueInput: Prisma.PendingAdminWhereUniqueInput,
  ): Promise<PendingAdmin> {
    return this.database.pendingAdmin.delete({
      where: pendingAdminWhereUniqueInput,
    });
  }
}
