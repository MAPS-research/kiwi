import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private database: DatabaseService) {}

  async user(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.database.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async classIdsByUserId(userId: string): Promise<string[]> {
    // first get the enrollments of the user
    const enrollments = await this.database.enrollment.findMany({
      where: {
        userId: userId,
        role: {
          in: ['student', 'professor', 'admin'],
        },
      },
    });
    // then get classIds from enrollments
    const classIds = enrollments.map((enrollment) => enrollment.classId);
    return classIds;
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.database.user.create({
      data,
    });
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return this.database.user.update({
      data,
      where,
    });
  }
}
