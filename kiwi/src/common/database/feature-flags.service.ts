import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Feature, FeatureFlag, Prisma } from '@prisma/client';

@Injectable()
export class FeatureFlagService {
  constructor(private database: DatabaseService) {}

  async featureFlag(
    featureFlagWhereUniqueInput: Prisma.FeatureFlagWhereUniqueInput,
  ): Promise<FeatureFlag | null> {
    return this.database.featureFlag.findUnique({
      where: featureFlagWhereUniqueInput,
    });
  }

  async featureFlags(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.FeatureFlagWhereUniqueInput;
    where?: Prisma.FeatureFlagWhereInput;
    orderBy?: Prisma.FeatureFlagOrderByWithRelationInput;
  }): Promise<FeatureFlag[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.featureFlag.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createFeatureFlag(
    data: Prisma.FeatureFlagCreateInput,
  ): Promise<FeatureFlag> {
    // Check if only one userId and classIs is present
    const { user, class: classObject } = data;

    if (user && classObject) {
      throw new Error('Only one of user or class can be present');
    }

    return this.database.featureFlag.create({
      data,
    });
  }

  async updateFeatureFlag(params: {
    where: Prisma.FeatureFlagWhereUniqueInput;
    data: Prisma.FeatureFlagUpdateInput;
  }): Promise<FeatureFlag> {
    const { where, data } = params;
    return this.database.featureFlag.update({
      data,
      where,
    });
  }

  async updateFeatureFlagByClass(params: {
    where: {
      classId: string;
      feature: Feature;
    };
    data: Prisma.FeatureFlagUpdateManyMutationInput;
  }): Promise<FeatureFlag[]> {
    const { where, data } = params;

    await this.database.featureFlag.updateMany({
      where: {
        classId: where.classId,
        feature: where.feature,
      },
      data,
    });

    return this.database.featureFlag.findMany({
      where: {
        classId: where.classId,
        feature: where.feature,
      },
    });
  }

  async updateFeatureFlagByUser(params: {
    where: {
      userId: string;
      feature: Feature;
    };
    data: Prisma.FeatureFlagUpdateManyMutationInput;
  }): Promise<FeatureFlag[]> {
    const { where, data } = params;

    await this.database.featureFlag.updateMany({
      where: {
        userId: where.userId,
        feature: where.feature,
      },
      data,
    });

    return this.database.featureFlag.findMany({
      where: {
        userId: where.userId,
        feature: where.feature,
      },
    });
  }

  // list who has access to this feature
  async checkFeatureFlagByName(
    params:
      | {
          feature: Feature;
          userId: string;
        }
      | {
          feature: Feature;
          classId: string;
        },
  ) {
    const featureFlags = await this.featureFlags({
      where:
        'userId' in params
          ? { feature: params.feature, userId: params.userId }
          : { feature: params.feature, classId: params.classId },
    });

    return featureFlags;
  }

  // check what features a user has access to
  async checkFeatureFlagByOwner(
    params: { userId: string } | { classId: string },
  ) {
    const featureFlags = await this.featureFlags({
      where:
        'userId' in params
          ? { userId: params.userId }
          : { classId: params.classId },
    });

    return featureFlags;
  }
}
