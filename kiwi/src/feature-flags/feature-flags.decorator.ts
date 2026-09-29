import { SetMetadata } from '@nestjs/common';
import type { Feature } from '@prisma/client';

export const FEATURE_FLAG_KEY = 'featureFlags';
export const FeatureFlags = (...features: Feature[]) =>
  SetMetadata(FEATURE_FLAG_KEY, features);
