import {
  DEFAULT_MODEL_PRICING,
  MODEL_PRICING_ENV_KEY,
  computeCost,
  loadPricingTable,
  lookupModelPricing,
  resolveEngineModel,
} from './pricing';

const TABLE = {
  'test-model': { inputPer1M: 10, cachedInputPer1M: 1, outputPer1M: 40 },
};

describe('computeCost', () => {
  it('prices cached and fresh input at different rates', () => {
    // The measured 88% cache hit: 2466 prompt tokens, 2176 of them cached.
    const cost = computeCost(
      { promptTokens: 2466, cachedTokens: 2176, completionTokens: 500 },
      'test-model',
      TABLE,
    );

    expect(cost.priced).toBe(true);
    expect(cost.freshInputTokens).toBe(290);
    expect(cost.cachedInputTokens).toBe(2176);
    expect(cost.inputUsd).toBeCloseTo((290 / 1e6) * 10, 9);
    expect(cost.cachedInputUsd).toBeCloseTo((2176 / 1e6) * 1, 9);
    expect(cost.outputUsd).toBeCloseTo((500 / 1e6) * 40, 9);
    expect(cost.totalUsd).toBeCloseTo(0.0029 + 0.002176 + 0.02, 9);
  });

  it('costs strictly less than pricing every prompt token as fresh', () => {
    const usage = { promptTokens: 2466, cachedTokens: 2176, completionTokens: 500 };
    const split = computeCost(usage, 'test-model', TABLE).totalUsd!;
    const flat = computeCost({ ...usage, cachedTokens: 0 }, 'test-model', TABLE)
      .totalUsd!;

    expect(split).toBeLessThan(flat);
  });

  it('prices the whole prompt at the full rate when nothing was cached', () => {
    const cost = computeCost(
      { promptTokens: 1000, cachedTokens: 0, completionTokens: 100 },
      'test-model',
      TABLE,
    );

    expect(cost.freshInputTokens).toBe(1000);
    expect(cost.cachedInputUsd).toBe(0);
    expect(cost.totalUsd).toBeCloseTo(0.01 + 0.004, 9);
  });

  it('treats missing cached/reasoning fields as zero cached tokens', () => {
    const cost = computeCost({ promptTokens: 1000, completionTokens: 0 }, 'test-model', TABLE);

    expect(cost.cachedInputTokens).toBe(0);
    expect(cost.totalUsd).toBeCloseTo(0.01, 9);
  });

  it('does not bill reasoning tokens twice — they are inside completionTokens', () => {
    // Callers pass only completionTokens; there is no reasoning input to the
    // function at all, which is the point of this assertion.
    const cost = computeCost(
      { promptTokens: 0, cachedTokens: 0, completionTokens: 1000 },
      'test-model',
      TABLE,
    );

    expect(cost.totalUsd).toBeCloseTo(0.04, 9);
  });

  it('reports an unknown model as unpriced rather than free', () => {
    const cost = computeCost(
      { promptTokens: 1000, cachedTokens: 500, completionTokens: 100 },
      'some-model-nobody-listed',
      TABLE,
    );

    expect(cost.priced).toBe(false);
    expect(cost.totalUsd).toBeNull();
    expect(cost.inputUsd).toBeNull();
    // Token counts survive so the caller can still report volume.
    expect(cost.freshInputTokens).toBe(500);
    expect(cost.cachedInputTokens).toBe(500);
  });

  it('reports a null model as unpriced', () => {
    expect(computeCost({ promptTokens: 10 }, null, TABLE).priced).toBe(false);
  });

  it('clamps cached tokens above the prompt total', () => {
    const cost = computeCost(
      { promptTokens: 100, cachedTokens: 250, completionTokens: 0 },
      'test-model',
      TABLE,
    );

    expect(cost.freshInputTokens).toBe(0);
    expect(cost.cachedInputTokens).toBe(100);
  });
});

describe('lookupModelPricing', () => {
  it('prices a dated snapshot as its base model', () => {
    expect(lookupModelPricing('gpt-4o-2024-08-06')).toBe(
      DEFAULT_MODEL_PRICING['gpt-4o'],
    );
    expect(lookupModelPricing('qwen-plus-0806')).toBe(
      DEFAULT_MODEL_PRICING['qwen-plus'],
    );
  });

  it('prefers the longest matching prefix over a shorter one', () => {
    expect(lookupModelPricing('gpt-4o-mini-2024-07-18')).toBe(
      DEFAULT_MODEL_PRICING['gpt-4o-mini'],
    );
  });

  it('does not match an unrelated model that merely shares a stem', () => {
    expect(lookupModelPricing('gpt-4omni')).toBeNull();
  });
});

describe('loadPricingTable', () => {
  const get = (values: Record<string, string>) => (key: string) => values[key];

  it('falls back to the defaults when nothing is configured', () => {
    expect(loadPricingTable(get({}))).toEqual(DEFAULT_MODEL_PRICING);
  });

  it('merges env overrides over the defaults', () => {
    const table = loadPricingTable(
      get({
        [MODEL_PRICING_ENV_KEY]: JSON.stringify({
          'gpt-4o': { inputPer1M: 1, cachedInputPer1M: 0.5, outputPer1M: 2 },
          'house-model': { inputPer1M: 3, cachedInputPer1M: 1, outputPer1M: 9 },
        }),
      }),
    );

    expect(table['gpt-4o'].inputPer1M).toBe(1);
    expect(table['house-model'].outputPer1M).toBe(9);
    expect(table['gpt-4o-mini']).toEqual(DEFAULT_MODEL_PRICING['gpt-4o-mini']);
  });

  it('ignores malformed JSON and incomplete entries', () => {
    expect(loadPricingTable(get({ [MODEL_PRICING_ENV_KEY]: 'not json' }))).toEqual(
      DEFAULT_MODEL_PRICING,
    );

    const table = loadPricingTable(
      get({
        [MODEL_PRICING_ENV_KEY]: JSON.stringify({
          'half-model': { inputPer1M: 3 },
        }),
      }),
    );
    expect(table['half-model']).toBeUndefined();
  });
});

describe('resolveEngineModel', () => {
  const get = (key: string) =>
    ({ LLM_CHAT_MODEL: 'gpt-4o', QWEN_CHAT_MODEL: 'qwen-plus' })[key];

  it('maps engine choices onto the configured chat models', () => {
    expect(resolveEngineModel('openai', get)).toBe('gpt-4o');
    expect(resolveEngineModel('qwen', get)).toBe('qwen-plus');
  });

  it('treats an unset engine choice as openai, matching LlmService', () => {
    expect(resolveEngineModel(undefined, get)).toBe('gpt-4o');
    expect(resolveEngineModel(null, get)).toBe('gpt-4o');
  });

  it('returns null for an engine it does not know', () => {
    expect(resolveEngineModel('anthropic', get)).toBeNull();
  });
});
