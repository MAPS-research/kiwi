import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { MaterialPersonalization, Prisma } from '@prisma/client';

/**
 * Rows kept when no explicit limit is passed. The query was previously
 * unbounded; one row per past session is far more than a prompt can use.
 */
const DEFAULT_LATEST_PERSONALIZATION_LIMIT = 10;

@Injectable()
export class MaterialPersonalizationService {
  constructor(private database: DatabaseService) {}

  async materialPersonalization(
    materialPersonalizationWhereUniqueInput: Prisma.MaterialPersonalizationWhereUniqueInput,
  ): Promise<MaterialPersonalization | null> {
    return this.database.materialPersonalization.findUnique({
      where: materialPersonalizationWhereUniqueInput,
    });
  }

  async materialPersonalizations(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.MaterialPersonalizationWhereUniqueInput;
    where?: Prisma.MaterialPersonalizationWhereInput;
    orderBy?: Prisma.MaterialPersonalizationOrderByWithRelationInput;
  }): Promise<MaterialPersonalization[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.materialPersonalization.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createMaterialPersonalization(
    data:
      | Prisma.MaterialPersonalizationCreateInput
      | Prisma.MaterialPersonalizationUncheckedCreateInput,
  ): Promise<MaterialPersonalization> {
    return this.database.materialPersonalization.create({
      data,
    });
  }

  async updateMaterialPersonalization(params: {
    where: Prisma.MaterialPersonalizationWhereUniqueInput;
    data: Prisma.MaterialPersonalizationUpdateInput;
  }): Promise<MaterialPersonalization> {
    const { where, data } = params;
    return this.database.materialPersonalization.update({
      data,
      where,
    });
  }

  /**
   * Latest personalization row per session for a user, most recent first.
   *
   * The ordering and the limit are load-bearing, not cosmetic: these rows are
   * rendered into a system message on every chat turn, and an unordered,
   * unbounded result set changes that message's bytes between turns — which
   * invalidates the provider's cached prompt prefix even when the content is
   * otherwise identical. `personalizationId` breaks ties on equal `endTime`.
   */
  async getLatestMaterialPersonalizationsByUser(
    userId: string,
    limit: number = DEFAULT_LATEST_PERSONALIZATION_LIMIT,
  ): Promise<MaterialPersonalization[]> {
    const take = Math.max(1, Math.floor(limit));
    const latestPersonalizations = await this.database.$queryRaw<
      MaterialPersonalization[]
    >`
      SELECT t.*
      FROM (
        SELECT "sessionId", MAX("endTime") AS "maxEndTime"
        FROM "MaterialPersonalization"
        WHERE "userId" = ${userId}
        GROUP BY "sessionId"
      ) m
      INNER JOIN "MaterialPersonalization" t
        ON t."sessionId" = m."sessionId" AND t."endTime" = m."maxEndTime"
      WHERE t."userId" = ${userId}
      ORDER BY t."endTime" DESC, t."personalizationId" ASC
      LIMIT ${take};
    `;
    return latestPersonalizations;
  }
}
