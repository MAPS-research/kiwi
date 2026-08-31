import { SetMetadata } from '@nestjs/common';
import { Feature } from 'src/common/database/database.types';

export const FEATURE_FLAG_KEY = 'featureFlags';
export const FeatureFlags = (...features: Feature[]) =>
  SetMetadata(FEATURE_FLAG_KEY, features);
