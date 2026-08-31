import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DocumentComment, Prisma } from '@prisma/client';

@Injectable()
export class DocumentCommentService {
  constructor(private readonly database: DatabaseService) {}

  async documentComment(
    documentCommentWhereUniqueInput: Prisma.DocumentCommentWhereUniqueInput,
  ): Promise<DocumentComment | null> {
    return this.database.documentComment.findUnique({
      where: documentCommentWhereUniqueInput,
    });
  }

  async findUnique<T extends Prisma.DocumentCommentFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.DocumentCommentFindUniqueArgs>,
  ) {
    return this.database.documentComment.findUnique<T>(args);
  }

  async documentComments<T extends Prisma.DocumentCommentFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.DocumentCommentFindManyArgs>,
  ) {
    return this.database.documentComment.findMany<T>(args);
  }

  async createDocumentComment(
    data:
      | Prisma.DocumentCommentCreateInput
      | Prisma.DocumentCommentUncheckedCreateInput,
  ): Promise<DocumentComment> {
    return this.database.documentComment.create({
      data,
    });
  }

  async updateDocumentComment(params: {
    where: Prisma.DocumentCommentWhereUniqueInput;
    data: Prisma.DocumentCommentUpdateInput;
  }): Promise<DocumentComment> {
    const { where, data } = params;
    return this.database.documentComment.update({
      data,
      where,
    });
  }

  async deleteDocumentComment(
    where: Prisma.DocumentCommentWhereUniqueInput,
  ): Promise<DocumentComment> {
    return this.database.documentComment.delete({
      where,
    });
  }
}
