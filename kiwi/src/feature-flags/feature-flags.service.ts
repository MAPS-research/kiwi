import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Feature } from '@prisma/client';
import { FeatureFlagService as FeatureFlagsDatabaseService } from 'src/common/database/feature-flags.service';
import {
  AddFeatureRequest,
  EditFeatureRequest,
  FeatureResponse,
} from './dto/feature.dto';
import { EnrollmentService } from 'src/common/database/enrollment.service';
import { UserService } from 'src/common/database/user.service';
import { ClassService } from 'src/common/database/class.service';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(
    private featureFlagsDatabaseService: FeatureFlagsDatabaseService,
    private enrollmentService: EnrollmentService,
    private userService: UserService,
    private classService: ClassService,
  ) {}

  async isFeatureEnabled(params: {
    feature: Feature;
    userId: string;
    classId?: string;
  }) {
    if (params.classId) {
      // First check if class has access to the feature
      const featureFlags =
        await this.featureFlagsDatabaseService.checkFeatureFlagByName({
          feature: params.feature,
          classId: params.classId,
        });

      // Check if class feature flag is valid
      if (featureFlags.length > 0) {
        const featureFlag = featureFlags[0];

        if (featureFlag.validUntil) {
          const currentTime = new Date();
          if (featureFlag.validUntil < currentTime) {
            return false;
          }
        } else {
          return true;
        }
      }
    }

    // Check if user has access to the feature
    const userFeatureFlags =
      await this.featureFlagsDatabaseService.checkFeatureFlagByName({
        feature: params.feature,
        userId: params.userId,
      });

    // Check if user feature flag is valid
    if (userFeatureFlags.length > 0) {
      const userFeatureFlag = userFeatureFlags[0];

      if (userFeatureFlag.validUntil) {
        const currentTime = new Date();
        if (userFeatureFlag.validUntil < currentTime) {
          return false;
        } else {
          return true;
        }
      }
    } else {
      return false;
    }

    return true;
  }

  async addClassFeature(
    addFeatureRequest: AddFeatureRequest,
  ): Promise<FeatureResponse> {
    const { featureName, targetId: classId, validUntil } = addFeatureRequest;

    // Check if class exists
    const classExists = await this.classService.class({ id: classId });
    if (!classExists) {
      throw new BadRequestException('Class does not exist.');
    }

    // Check if already exists
    const existingFeatureFlag =
      await this.featureFlagsDatabaseService.checkFeatureFlagByName({
        feature: featureName,
        classId,
      });
    if (existingFeatureFlag.length > 0) {
      throw new ConflictException(
        'Feature flag already exists for this class.',
      );
    }

    const featureFlag =
      await this.featureFlagsDatabaseService.createFeatureFlag({
        feature: featureName,
        class: { connect: { id: classId } },
        validUntil,
      });
    return {
      featureName: featureFlag.feature,
      targetId: classId,
      validUntil: featureFlag.validUntil,
    };
  }

  async addUserFeature(
    addFeatureRequest: AddFeatureRequest,
  ): Promise<FeatureResponse> {
    const { featureName, targetId: userId, validUntil } = addFeatureRequest;

    // Check if user exists
    const user = await this.userService.user({ id: userId });

    if (!user) {
      throw new BadRequestException('User does not exist.');
    }

    // Check if already exists
    const existingFeatureFlag =
      await this.featureFlagsDatabaseService.checkFeatureFlagByName({
        feature: featureName,
        userId,
      });
    if (existingFeatureFlag.length > 0) {
      throw new ConflictException('Feature flag already exists for this user.');
    }

    const featureFlag =
      await this.featureFlagsDatabaseService.createFeatureFlag({
        feature: featureName,
        user: { connect: { id: userId } },
        validUntil,
      });
    return {
      featureName: featureFlag.feature,
      targetId: userId,
      validUntil: featureFlag.validUntil,
    };
  }

  async listClassFeatures(classId: string): Promise<FeatureResponse[]> {
    const featureFlags =
      await this.featureFlagsDatabaseService.checkFeatureFlagByOwner({
        classId,
      });
    return featureFlags.map((flag) => ({
      featureName: flag.feature,
      targetId: classId,
      validUntil: flag.validUntil,
    }));
  }

  async listUserFeatures(userId: string): Promise<FeatureResponse[]> {
    const featureFlags =
      await this.featureFlagsDatabaseService.checkFeatureFlagByOwner({
        userId,
      });
    return featureFlags.map((flag) => ({
      featureName: flag.feature,
      targetId: userId,
      validUntil: flag.validUntil,
    }));
  }

  async listCurrentUserFeatures(userId: string): Promise<FeatureResponse[]> {
    // Find enrolled classes for user
    const enrolledClasses = await this.enrollmentService.enrollments({
      where: {
        userId,
      },
    });

    // Find feature flags for user
    const userFeatureFlags =
      await this.featureFlagsDatabaseService.checkFeatureFlagByOwner({
        userId,
      });

    // Find feature flags for classes
    const classFeatureFlagsByClass = await Promise.all(
      enrolledClasses.map((enrolledClass) =>
        this.featureFlagsDatabaseService.checkFeatureFlagByOwner({
          classId: enrolledClass.classId,
        }),
      ),
    );

    const classFeatureFlags = classFeatureFlagsByClass.flat();

    const featureFlags = [...userFeatureFlags, ...classFeatureFlags];

    return featureFlags.map((flag) => ({
      featureName: flag.feature,
      targetId: flag.userId || flag.classId || userId,
      targetType: flag.userId ? 'user' : 'class',
      validUntil: flag.validUntil,
    }));
  }

  async listAllFeatures(): Promise<FeatureResponse[]> {
    const featureFlags = await this.featureFlagsDatabaseService.featureFlags(
      {},
    );
    return featureFlags
      .filter((entry) => entry.userId !== null || entry.classId !== null)
      .map((flag) => ({
        featureName: flag.feature,
        targetId: flag.userId || flag.classId || '',
        targetType: flag.userId ? ('user' as const) : ('class' as const),
        validUntil: flag.validUntil,
      }))
      .filter((flag) => flag.targetId !== '');
  }

  async editClassFeature(
    editFeatureRequest: EditFeatureRequest,
  ): Promise<FeatureResponse> {
    const { featureName, targetId: classId, validUntil } = editFeatureRequest;
    const featureFlags =
      await this.featureFlagsDatabaseService.updateFeatureFlagByClass({
        where: { feature: featureName, classId: classId },
        data: { validUntil },
      });
    const featureFlag = featureFlags[0];
    return {
      featureName: featureFlag.feature,
      targetId: classId,
      targetType: 'class',
      validUntil: featureFlag.validUntil,
    };
  }

  async editUserFeature(
    editFeatureRequest: EditFeatureRequest,
  ): Promise<FeatureResponse> {
    const { featureName, targetId: userId, validUntil } = editFeatureRequest;
    const featureFlags =
      await this.featureFlagsDatabaseService.updateFeatureFlagByUser({
        where: { feature: featureName, userId },
        data: { validUntil },
      });
    const featureFlag = featureFlags[0];
    return {
      featureName: featureFlag.feature,
      targetId: userId,
      targetType: 'user',
      validUntil: featureFlag.validUntil,
    };
  }
}
