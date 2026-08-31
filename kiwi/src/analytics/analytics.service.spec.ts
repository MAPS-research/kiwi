import { AnalyticsService } from './analytics.service';
import { LlmUsageAggregate } from './dto/analytics-response.dto';

const aggregate = (
  overrides: Partial<LlmUsageAggregate> = {},
): LlmUsageAggregate => ({
  turns: 1,
  promptTokens: 1000,
  cachedTokens: 800,
  freshInputTokens: 200,
  completionTokens: 100,
  reasoningTokens: 0,
  totalTokens: 1100,
  cacheHitRate: 0.8,
  models: ['gpt-4o'],
  cost: {
    inputUsd: 0.0005,
    cachedInputUsd: 0.001,
    outputUsd: 0.001,
    totalUsd: 0.0025,
    complete: true,
    unpricedModels: [],
  },
  ...overrides,
});

describe('AnalyticsService.totalsFor', () => {
  const service = new AnalyticsService(
    null as any,
    null as any,
    null as any,
    { get: () => undefined } as any,
  );

  it('sums tokens and cost across rows', () => {
    const totals = service.totalsFor([aggregate(), aggregate()]);

    expect(totals.turns).toBe(2);
    expect(totals.promptTokens).toBe(2000);
    expect(totals.cost.totalUsd).toBeCloseTo(0.005, 9);
    expect(totals.cost.complete).toBe(true);
  });

  it('recomputes the cache hit rate from token sums, not by averaging rates', () => {
    const totals = service.totalsFor([
      aggregate({ promptTokens: 1000, cachedTokens: 1000, cacheHitRate: 1 }),
      aggregate({ promptTokens: 9000, cachedTokens: 0, cacheHitRate: 0 }),
    ]);

    // Averaging the two rates would give 0.5; the token-weighted answer is 0.1.
    expect(totals.cacheHitRate).toBe(0.1);
  });

  it('marks the total incomplete and lists the models it could not price', () => {
    const totals = service.totalsFor([
      aggregate(),
      aggregate({
        models: ['house-model'],
        cost: {
          inputUsd: null,
          cachedInputUsd: null,
          outputUsd: null,
          totalUsd: null,
          complete: false,
          unpricedModels: ['house-model'],
        },
      }),
    ]);

    expect(totals.cost.complete).toBe(false);
    expect(totals.cost.unpricedModels).toEqual(['house-model']);
    // The priced half still contributes, so the number is a floor, not a zero.
    expect(totals.cost.totalUsd).toBeCloseTo(0.0025, 9);
    expect(totals.models).toEqual(['gpt-4o', 'house-model']);
  });

  it('reports null cost when nothing in the set could be priced', () => {
    const totals = service.totalsFor([
      aggregate({
        cost: {
          inputUsd: null,
          cachedInputUsd: null,
          outputUsd: null,
          totalUsd: null,
          complete: false,
          unpricedModels: ['house-model'],
        },
      }),
    ]);

    expect(totals.cost.totalUsd).toBeNull();
  });

  it('returns a zeroed aggregate for an empty page', () => {
    const totals = service.totalsFor([]);

    expect(totals.turns).toBe(0);
    expect(totals.cacheHitRate).toBe(0);
    expect(totals.cost.totalUsd).toBeNull();
  });
});
