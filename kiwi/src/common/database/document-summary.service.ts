import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DocumentSummary, Prisma } from '@prisma/client';

@Injectable()
export class DocumentSummaryService {
  constructor(private readonly database: DatabaseService) {}

  async documentSummary(
    documentSummaryWhereUniqueInput: Prisma.DocumentSummaryWhereUniqueInput,
  ): Promise<DocumentSummary | null> {
    return this.database.documentSummary.findUnique({
      where: documentSummaryWhereUniqueInput,
    });
  }

  async findUnique<T extends Prisma.DocumentSummaryFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.DocumentSummaryFindUniqueArgs>,
  ) {
    return this.database.documentSummary.findUnique<T>(args);
  }

  async documentSummaries<T extends Prisma.DocumentSummaryFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.DocumentSummaryFindManyArgs>,
  ) {
    return this.database.documentSummary.findMany<T>(args);
  }

  async createDocumentSummary(
    data:
      | Prisma.DocumentSummaryCreateInput
      | Prisma.DocumentSummaryUncheckedCreateInput,
  ): Promise<DocumentSummary> {
    return this.database.documentSummary.create({
      data,
    });
  }

  async updateDocumentSummary(params: {
    where: Prisma.DocumentSummaryWhereUniqueInput;
    data: Prisma.DocumentSummaryUpdateInput;
  }): Promise<DocumentSummary> {
    const { where, data } = params;
    return this.database.documentSummary.update({
      data,
      where,
    });
  }

  async deleteDocumentSummary(
    where: Prisma.DocumentSummaryWhereUniqueInput,
  ): Promise<DocumentSummary> {
    return this.database.documentSummary.delete({
      where,
    });
  }
}
