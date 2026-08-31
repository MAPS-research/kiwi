import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Class, Prisma } from '@prisma/client';

@Injectable()
export class ClassService {
  constructor(private database: DatabaseService) {}

  async class(
    classWhereUniqueInput: Prisma.ClassWhereUniqueInput,
  ): Promise<Class | null> {
    return this.database.class.findUnique({
      where: classWhereUniqueInput,
    });
  }

  async classes(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ClassWhereUniqueInput;
    where?: Prisma.ClassWhereInput;
    orderBy?: Prisma.ClassOrderByWithRelationInput;
  }): Promise<Class[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.class.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createClass(data: Prisma.ClassCreateInput): Promise<Class> {
    return this.database.class.create({
      data,
    });
  }

  async updateClass(params: {
    where: Prisma.ClassWhereUniqueInput;
    data: Prisma.ClassUpdateInput;
  }): Promise<Class> {
    const { where, data } = params;
    return this.database.class.update({
      data,
      where,
    });
  }

  async getClassById(id: string): Promise<Class> {
    const classInfo = await this.database.class.findUnique({
      where: { id },
    });

    if (!classInfo) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }

    return classInfo;
  }
}
