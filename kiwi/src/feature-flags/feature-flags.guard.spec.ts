import { FeatureFlagsGuard } from './feature-flags.guard';

describe('FeatureFlagsGuard', () => {
  it('should be defined', () => {
    expect(new FeatureFlagsGuard()).toBeDefined();
  });
});
