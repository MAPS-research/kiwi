import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PendingEnrollment, Prisma } from '@prisma/client';

@Injectable()
export class PendingEnrollmentService {
  constructor(private database: DatabaseService) {}

  async pendingEnrollment(
    pendingEnrollmentWhereUniqueInput: Prisma.PendingEnrollmentWhereUniqueInput,
  ): Promise<PendingEnrollment | null> {
    return this.database.pendingEnrollment.findUnique({
      where: pendingEnrollmentWhereUniqueInput,
    });
  }

  async pendingEnrollments(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.PendingEnrollmentWhereUniqueInput;
    where?: Prisma.PendingEnrollmentWhereInput;
    orderBy?: Prisma.PendingEnrollmentOrderByWithRelationInput;
  }): Promise<PendingEnrollment[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.pendingEnrollment.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createPendingEnrollment(
    data:
      | Prisma.PendingEnrollmentCreateInput
      | Prisma.PendingEnrollmentUncheckedCreateInput,
  ): Promise<PendingEnrollment> {
    return this.database.pendingEnrollment.create({
      data,
    });
  }

  async updatePendingEnrollment(params: {
    where: Prisma.PendingEnrollmentWhereUniqueInput;
    data: Prisma.PendingEnrollmentUpdateInput;
  }): Promise<PendingEnrollment> {
    const { where, data } = params;
    return this.database.pendingEnrollment.update({
      data,
      where,
    });
  }

  async deletePendingEnrollment(
    pendingEnrollmentWhereUniqueInput: Prisma.PendingEnrollmentWhereUniqueInput,
  ): Promise<PendingEnrollment> {
    return this.database.pendingEnrollment.delete({
      where: pendingEnrollmentWhereUniqueInput,
    });
  }
}
