import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Enrollment, Prisma } from '@prisma/client';

@Injectable()
export class EnrollmentService {
  constructor(private database: DatabaseService) {}

  async enrollment(
    enrollmentWhereUniqueInput: Prisma.EnrollmentWhereUniqueInput,
  ): Promise<Enrollment | null> {
    return this.database.enrollment.findUnique({
      where: enrollmentWhereUniqueInput,
    });
  }

  async enrollments(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.EnrollmentWhereUniqueInput;
    where?: Prisma.EnrollmentWhereInput;
    orderBy?: Prisma.EnrollmentOrderByWithRelationInput;
  }): Promise<Enrollment[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.enrollment.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createEnrollment(
    data: Prisma.EnrollmentCreateInput | Prisma.EnrollmentUncheckedCreateInput,
  ): Promise<Enrollment> {
    return this.database.enrollment.create({
      data,
    });
  }

  async updateEnrollment(params: {
    where: Prisma.EnrollmentWhereUniqueInput;
    data: Prisma.EnrollmentUpdateInput;
  }): Promise<Enrollment> {
    const { where, data } = params;
    return this.database.enrollment.update({
      data,
      where,
    });
  }

  async deleteEnrollment(
    enrollmentWhereUniqueInput: Prisma.EnrollmentWhereUniqueInput,
  ): Promise<Enrollment> {
    return this.database.enrollment.delete({
      where: enrollmentWhereUniqueInput,
    });
  }
}
