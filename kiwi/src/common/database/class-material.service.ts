import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ClassMaterial, Prisma } from '@prisma/client';

@Injectable()
export class ClassMaterialService {
  constructor(private database: DatabaseService) {}

  async classMaterial(
    classMaterialWhereUniqueInput: Prisma.ClassMaterialWhereUniqueInput,
  ): Promise<ClassMaterial | null> {
    return this.database.classMaterial.findUnique({
      where: classMaterialWhereUniqueInput,
    });
  }

  async classMaterials(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ClassMaterialWhereUniqueInput;
    where?: Prisma.ClassMaterialWhereInput;
    orderBy?: Prisma.ClassMaterialOrderByWithRelationInput;
  }): Promise<ClassMaterial[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.classMaterial.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createClassMaterial(
    data:
      | Prisma.ClassMaterialCreateInput
      | Prisma.ClassMaterialUncheckedCreateInput,
  ): Promise<ClassMaterial> {
    return this.database.classMaterial.create({
      data,
    });
  }

  async updateClassMaterial(params: {
    where: Prisma.ClassMaterialWhereUniqueInput;
    data: Prisma.ClassMaterialUpdateInput;
  }): Promise<ClassMaterial> {
    const { where, data } = params;
    return this.database.classMaterial.update({
      data,
      where,
    });
  }
}
