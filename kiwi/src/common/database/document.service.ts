import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Document, Prisma } from '@prisma/client';

export type DocumentWithClassMaterial = Prisma.DocumentGetPayload<{
  include: { classMaterial: true };
}>;

@Injectable()
export class DocumentService {
  constructor(private database: DatabaseService) {}

  async document(
    documentWhereUniqueInput: Prisma.DocumentWhereUniqueInput,
  ): Promise<Document | null> {
    return this.database.document.findUnique({
      where: documentWhereUniqueInput,
    });
  }

  async findUnique<T extends Prisma.DocumentFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.DocumentFindUniqueArgs>,
  ) {
    return this.database.document.findUnique<T>(args);
  }

  async documentWithClassMaterial(params: {
    where: Prisma.DocumentWhereUniqueInput;
  }): Promise<DocumentWithClassMaterial | null> {
    const { where } = params;
    return this.database.document.findUnique({
      where: where,
      include: { classMaterial: true },
    });
  }

  async documents(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.DocumentWhereUniqueInput;
    where?: Prisma.DocumentWhereInput;
    orderBy?: Prisma.DocumentOrderByWithRelationInput;
  }): Promise<Document[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.document.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createDocument(
    data: Prisma.DocumentCreateInput | Prisma.DocumentUncheckedCreateInput,
  ): Promise<Document> {
    return this.database.document.create({
      data,
    });
  }

  async deleteDocument(documentId: string) {
    // First delete all embeddings linked to the document
    await this.database.embedding.deleteMany({
      where: { documentId },
    });

    // Then delete the document itself
    await this.database.document.delete({
      where: { id: documentId },
    });
  }

  async updateDocument(params: {
    where: Prisma.DocumentWhereUniqueInput;
    data: Prisma.DocumentUpdateInput;
  }): Promise<Document> {
    const { where, data } = params;
    return this.database.document.update({
      data,
      where,
    });
  }
}
