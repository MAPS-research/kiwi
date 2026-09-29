import {
  FeatureFlagGuardByUserId,
  FeatureFlagGuardQwenModel,
  FeatureFlagGuardTokenLimit,
} from './feature-flags.guard';

describe('Feature flag guards', () => {
  it('should be defined', () => {
    const featureFlagsService = {} as any;

    expect(
      new FeatureFlagGuardByUserId({} as any, featureFlagsService),
    ).toBeDefined();
    expect(new FeatureFlagGuardQwenModel(featureFlagsService)).toBeDefined();
    expect(new FeatureFlagGuardTokenLimit(featureFlagsService)).toBeDefined();
  });
});
