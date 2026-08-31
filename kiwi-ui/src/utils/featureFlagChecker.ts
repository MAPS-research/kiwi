import { AvailableFeature } from "../auth/AuthContext.tsx";
import { FeatureResponseFeatureNameEnum } from "../services/index.ts";

interface FeatureFlagOptions {
  featureFlag: FeatureResponseFeatureNameEnum;
  availableFeatures: AvailableFeature[];
  classId?: string;
}

export const featureFlagChecker = (options: FeatureFlagOptions) => {
  const { featureFlag, availableFeatures, classId } = options;

  const currentTime = new Date();

  const feature = availableFeatures.find(
    (feature) =>
      feature.featureName === featureFlag &&
      (feature.validUntil
        ? new Date(feature.validUntil) > currentTime
        : true) &&
      (feature.validFor === "user" ||
        (feature.validFor === "class" && feature.validForID === classId))
  );

  return !!feature;
};
