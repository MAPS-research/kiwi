import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Embedding, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface EmbeddingCreateInput {
  embedding: number[];
  documentId: string;
  text: string;
  documentPageNumber: string;
  chunk: JSON;
  // The model this vector was produced by. When provided, the vector is also
  // stored in EmbeddingVector under that model.
  modelId?: string;
  // Vectors for the *same* chunk produced by other active models. They hang off
  // the one Embedding row rather than duplicating the chunk text per model, so
  // the chunk is retrievable from every engine that has a vector for it.
  extraVectors?: Array<{ modelId: string; embedding: number[] }>;
}

interface EmbeddingFindNearestNInput {
  embedding: number[];
  n: number;
  fileIds?: string[];
  pageNumber?: string;
  oMode?: boolean;
  // The model whose vectors to search against. Required for multi-model search;
  // when omitted, falls back to the legacy single-column Embedding table.
  modelId?: string;
  dimensions?: number;
}

@Injectable()
export class EmbeddingService {
  constructor(private database: DatabaseService) {}

  async embedding(
    embeddingWhereUniqueInput: Prisma.EmbeddingWhereUniqueInput,
  ): Promise<Embedding | null> {
    return this.database.embedding.findUnique({
      where: embeddingWhereUniqueInput,
    });
  }

  async embeddings(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.EmbeddingWhereUniqueInput;
    where?: Prisma.EmbeddingWhereInput;
    orderBy?: Prisma.EmbeddingOrderByWithRelationInput;
  }): Promise<Embedding[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.embedding.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createEmbedding(data: EmbeddingCreateInput): Promise<number> {
    const id = uuidv4();
    const chunkData = JSON.stringify(data.chunk);
    try {
      // Every vector for this chunk, primary first.
      const vectors = [
        ...(data.modelId
          ? [{ modelId: data.modelId, embedding: data.embedding }]
          : []),
        ...(data.extraVectors ?? []),
      ];

      // The Embedding row holds the chunk text/metadata. The legacy 1536-dim
      // column is written only for the OpenAI model (back-compat); all models —
      // including OpenAI — also get a row in EmbeddingVector. Look for OpenAI
      // across all the vectors, not just the primary: with multi-model
      // ingestion OpenAI may now arrive as a secondary, and the legacy column
      // must still be populated for it.
      const legacyOpenaiVector = vectors.find(
        (vector) => vector.modelId === 'emb-openai-3-small',
      );
      const legacyEmbedding = legacyOpenaiVector
        ? JSON.stringify(legacyOpenaiVector.embedding)
        : null;
      const result = await this.database.$executeRaw`
        INSERT INTO "Embedding" ("id", "embedding", "documentId", "text", "documentPageNumber", "chunk")
        VALUES (
          ${id},
          ${legacyEmbedding !== null ? Prisma.sql`${legacyEmbedding}::vector` : Prisma.sql`NULL`},
          ${data.documentId}, ${data.text}, ${data.documentPageNumber}, ${chunkData}::jsonb
        );
      `;

      for (const vector of vectors) {
        await this.database.$executeRaw`
          INSERT INTO "EmbeddingVector" ("id", "embeddingId", "modelId", "embedding")
          VALUES (${uuidv4()}, ${id}, ${vector.modelId}, ${JSON.stringify(vector.embedding)}::vector)
          ON CONFLICT ("embeddingId", "modelId") DO NOTHING;
        `;
      }

      return result;
    } catch (error) {
      console.error('Error executing raw SQL:', error);
      throw error;
    }
  }

  async nearestNNeighbors(
    params: EmbeddingFindNearestNInput,
  ): Promise<Embedding[]> {
    const { embedding, n, fileIds, pageNumber, oMode, modelId, dimensions } =
      params;
    const embeddingVector = JSON.stringify(embedding);

    // Multi-model path: search EmbeddingVector filtered by modelId, casting the
    // stored/query vectors to the model's dimension so the per-model partial
    // HNSW index is used and only same-model vectors are compared.
    if (modelId && dimensions) {
      return this.nearestNNeighborsByModel({
        embeddingVector,
        n,
        fileIds,
        pageNumber,
        oMode,
        modelId,
        dimensions,
      });
    }

    try {
      let result;
      if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
        if (pageNumber && pageNumber !== 'undefined') {
          // TODO: SOLVE THIS!
          if (oMode) {
            result = await this.database.$queryRaw`
            SELECT "id", "documentId", "text", "documentPageNumber", "chunk" FROM "Embedding"
            WHERE "documentId" IN (${Prisma.join(fileIds)}) AND "documentPageNumber" <> ${pageNumber}
            ORDER BY "embedding" <=> ${embeddingVector}::vector
            LIMIT ${n};
          `;
          } else {
            result = await this.database.$queryRaw`
            SELECT "id", "documentId", "text", "documentPageNumber", "chunk" FROM "Embedding"
            WHERE "documentId" IN (${Prisma.join(fileIds)}) AND "documentPageNumber" = ${pageNumber}
            ORDER BY "embedding" <=> ${embeddingVector}::vector
            LIMIT ${n};
          `;
          }
        } else {
          result = await this.database.$queryRaw`
          SELECT "id", "documentId", "text", "documentPageNumber", "chunk" FROM "Embedding"
          WHERE "documentId" IN (${Prisma.join(fileIds)})
          ORDER BY "embedding" <=> ${embeddingVector}::vector
          LIMIT ${n};
        `;
        }
      } else {
        result = await this.database.$queryRaw`
          SELECT "id", "documentId", "text", "documentPageNumber", "chunk" FROM "Embedding"
          ORDER BY "embedding" <=> ${embeddingVector}::vector
          LIMIT ${n};
        `;
      }
      return result as Embedding[];
    } catch (error) {
      console.error('Error executing raw SQL:', error);
      throw error;
    }
  }

  /**
   * Nearest-neighbour search against EmbeddingVector for a single model.
   * Joins back to Embedding for the chunk text/metadata, filters by modelId, and
   * casts both stored and query vectors to the model's dimension so the per-model
   * partial HNSW index is used and dimensions always match.
   */
  private async nearestNNeighborsByModel(params: {
    embeddingVector: string;
    n: number;
    fileIds?: string[];
    pageNumber?: string;
    oMode?: boolean;
    modelId: string;
    dimensions: number;
  }): Promise<Embedding[]> {
    const { embeddingVector, n, fileIds, pageNumber, oMode, modelId, dimensions } =
      params;

    // dimensions comes from our own EmbeddingModel registry, not user input.
    // Validate it's a positive integer before interpolating into the cast type
    // modifier (pgvector requires a literal there, not a bind parameter).
    if (!Number.isInteger(dimensions) || dimensions <= 0) {
      throw new Error(`Invalid embedding dimensions: ${dimensions}`);
    }
    const vectorType = Prisma.raw(`vector(${dimensions})`);

    const hasFiles = fileIds && Array.isArray(fileIds) && fileIds.length > 0;
    const hasPage = pageNumber && pageNumber !== 'undefined';

    const fileFilter = hasFiles
      ? Prisma.sql`AND e."documentId" IN (${Prisma.join(fileIds)})`
      : Prisma.empty;
    const pageFilter = hasPage
      ? oMode
        ? Prisma.sql`AND e."documentPageNumber" <> ${pageNumber}`
        : Prisma.sql`AND e."documentPageNumber" = ${pageNumber}`
      : Prisma.empty;

    try {
      const result = await this.database.$queryRaw`
        SELECT e."id", e."documentId", e."text", e."documentPageNumber", e."chunk"
        FROM "EmbeddingVector" ev
        JOIN "Embedding" e ON e."id" = ev."embeddingId"
        WHERE ev."modelId" = ${modelId}
          ${fileFilter}
          ${pageFilter}
        ORDER BY ev."embedding"::${vectorType} <=> ${embeddingVector}::${vectorType}
        LIMIT ${n};
      `;
      return result as Embedding[];
    } catch (error) {
      console.error('Error executing raw SQL (by model):', error);
      throw error;
    }
  }

  async updateEmbedding(params: {
    where: Prisma.EmbeddingWhereUniqueInput;
    data: Prisma.EmbeddingUpdateInput;
  }): Promise<Embedding> {
    const { where, data } = params;
    return this.database.embedding.update({
      data,
      where,
    });
  }

  async removeEmbedding(params: {
    where: Prisma.EmbeddingWhereUniqueInput;
  }): Promise<Embedding> {
    const { where } = params;
    return this.database.embedding.delete({
      where,
    });
  }

  /**
   * Drop every embedding for a document in one statement. EmbeddingVector rows
   * cascade. Returns how many were removed so callers can log it.
   */
  async removeEmbeddingsForDocument(documentId: string): Promise<number> {
    const { count } = await this.database.embedding.deleteMany({
      where: { documentId },
    });
    return count;
  }
}
