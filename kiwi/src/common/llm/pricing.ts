/**
 * Per-model LLM prices and the cached/fresh input split used to cost a turn.
 *
 * Cost is deliberately *not* `totalTokens × one rate`. Both engines cache on an
 * exact prompt prefix — a repeated /chat/v2 prompt measured 88% cached
 * (2176/2466) — and cached input bills at a large discount, so the input side
 * must be split before it is priced or the number is meaningless.
 *
 * Reasoning tokens are already counted inside `completion_tokens`, so they are
 * never priced separately here; doing so would double-bill every reasoning turn.
 */

export interface ModelPricing {
  /** USD per 1M fresh (uncached) input tokens. */
  inputPer1M: number;
  /** USD per 1M input tokens served from the provider's prompt cache. */
  cachedInputPer1M: number;
  /** USD per 1M completion tokens (visible + reasoning). */
  outputPer1M: number;
}

export type PricingTable = Record<string, ModelPricing>;

/** The usage fields Phase B persists into `agent-loop-complete` context. */
export interface TokenUsage {
  promptTokens?: number | null;
  cachedTokens?: number | null;
  completionTokens?: number | null;
}

export interface CostBreakdown {
  /** The model id the price was looked up under. */
  model: string;
  /** False when no price entry matched — every USD field is then null. */
  priced: boolean;
  /** Prompt tokens that were *not* served from cache. */
  freshInputTokens: number;
  cachedInputTokens: number;
  completionTokens: number;
  inputUsd: number | null;
  cachedInputUsd: number | null;
  outputUsd: number | null;
  totalUsd: number | null;
}

/**
 * Published list prices, USD per 1M tokens. These are a convenience default,
 * not a billing source of truth: negotiated rates, regions and provider price
 * changes all diverge from them. Override with the `LLM_MODEL_PRICING` env var
 * (a JSON object of the same shape) rather than editing this table.
 *
 * A model that is absent here is reported as unpriced instead of being costed
 * at zero — see `computeCost`.
 */
export const DEFAULT_MODEL_PRICING: PricingTable = {
  // OpenAI
  'gpt-5': { inputPer1M: 1.25, cachedInputPer1M: 0.125, outputPer1M: 10 },
  'gpt-5-mini': { inputPer1M: 0.25, cachedInputPer1M: 0.025, outputPer1M: 2 },
  'gpt-5-nano': { inputPer1M: 0.05, cachedInputPer1M: 0.005, outputPer1M: 0.4 },
  'gpt-4.1': { inputPer1M: 2, cachedInputPer1M: 0.5, outputPer1M: 8 },
  'gpt-4.1-mini': { inputPer1M: 0.4, cachedInputPer1M: 0.1, outputPer1M: 1.6 },
  'gpt-4.1-nano': {
    inputPer1M: 0.1,
    cachedInputPer1M: 0.025,
    outputPer1M: 0.4,
  },
  'gpt-4o': { inputPer1M: 2.5, cachedInputPer1M: 1.25, outputPer1M: 10 },
  'gpt-4o-mini': {
    inputPer1M: 0.15,
    cachedInputPer1M: 0.075,
    outputPer1M: 0.6,
  },
  // gpt-3.5-turbo predates prompt caching, so a "cached" token bills as fresh.
  'gpt-3.5-turbo': { inputPer1M: 0.5, cachedInputPer1M: 0.5, outputPer1M: 1.5 },

  // Alibaba Model Studio (qwen). Model Studio bills implicit cache hits at a
  // discount that varies by model and account tier; the cached rates below are
  // the nominal 40%-of-input figure and should be confirmed per deployment.
  'qwen-turbo': { inputPer1M: 0.05, cachedInputPer1M: 0.02, outputPer1M: 0.2 },
  'qwen-plus': { inputPer1M: 0.4, cachedInputPer1M: 0.16, outputPer1M: 1.2 },
  'qwen-max': { inputPer1M: 1.6, cachedInputPer1M: 0.64, outputPer1M: 6.4 },
};

/** Env var holding a JSON `PricingTable` merged over the defaults. */
export const MODEL_PRICING_ENV_KEY = 'LLM_MODEL_PRICING';

/** Reads config the same way `LlmService` does: a plain key lookup. */
export type ConfigGetter = (key: string) => string | undefined;

/**
 * Which chat model an engine choice resolves to, mirroring `LlmService`'s
 * `engineConfigs`. `agent-loop-complete` records `engineChoice`, not the model
 * id, so costing historical rows has to go back through config.
 */
export function resolveEngineModel(
  engineChoice: string | null | undefined,
  get: ConfigGetter,
): string | null {
  switch (engineChoice) {
    case 'qwen':
      return get('QWEN_CHAT_MODEL') ?? null;
    case 'openai':
    case null:
    case undefined:
      // LlmService defaults to openai, so an unset engineChoice is openai.
      return get('LLM_CHAT_MODEL') ?? null;
    default:
      return null;
  }
}

/**
 * Builds the effective price table: defaults, overridden per model by
 * `LLM_MODEL_PRICING`. A malformed or partial override entry is ignored rather
 * than allowed to produce a plausible-looking wrong number.
 */
export function loadPricingTable(get: ConfigGetter): PricingTable {
  const raw = get(MODEL_PRICING_ENV_KEY);
  if (!raw) return { ...DEFAULT_MODEL_PRICING };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_MODEL_PRICING };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ...DEFAULT_MODEL_PRICING };
  }

  const table: PricingTable = { ...DEFAULT_MODEL_PRICING };
  for (const [model, entry] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    const candidate = entry as Partial<ModelPricing> | null;
    if (
      candidate &&
      isFinitePrice(candidate.inputPer1M) &&
      isFinitePrice(candidate.cachedInputPer1M) &&
      isFinitePrice(candidate.outputPer1M)
    ) {
      table[model] = {
        inputPer1M: candidate.inputPer1M as number,
        cachedInputPer1M: candidate.cachedInputPer1M as number,
        outputPer1M: candidate.outputPer1M as number,
      };
    }
  }
  return table;
}

/**
 * Exact id first, then the longest table key the model id extends with a `-`,
 * so dated snapshots (`gpt-4o-2024-08-06`, `qwen-plus-0806`) price as their
 * base model instead of falling off the table.
 */
export function lookupModelPricing(
  model: string | null | undefined,
  table: PricingTable = DEFAULT_MODEL_PRICING,
): ModelPricing | null {
  if (!model) return null;
  if (table[model]) return table[model];

  let bestKey: string | null = null;
  for (const key of Object.keys(table)) {
    if (
      model.startsWith(`${key}-`) &&
      (!bestKey || key.length > bestKey.length)
    ) {
      bestKey = key;
    }
  }
  return bestKey ? table[bestKey] : null;
}

/**
 * Prices one usage record. `promptTokens - cachedTokens` bills at the full
 * input rate, `cachedTokens` at the cached rate, `completionTokens` at the
 * output rate.
 *
 * An unknown model yields `priced: false` with null costs — callers must show
 * that rather than let an unpriced turn silently read as $0.
 */
export function computeCost(
  usage: TokenUsage,
  model: string | null | undefined,
  table: PricingTable = DEFAULT_MODEL_PRICING,
): CostBreakdown {
  const promptTokens = nonNegative(usage.promptTokens);
  // Providers never report more cached than prompt tokens, but an aggregate
  // stitched from several rows could; clamping keeps fresh input off negatives.
  const cachedInputTokens = Math.min(
    nonNegative(usage.cachedTokens),
    promptTokens,
  );
  const freshInputTokens = promptTokens - cachedInputTokens;
  const completionTokens = nonNegative(usage.completionTokens);

  const pricing = lookupModelPricing(model, table);
  if (!pricing) {
    return {
      model: model ?? 'unknown',
      priced: false,
      freshInputTokens,
      cachedInputTokens,
      completionTokens,
      inputUsd: null,
      cachedInputUsd: null,
      outputUsd: null,
      totalUsd: null,
    };
  }

  const inputUsd = perMillion(freshInputTokens, pricing.inputPer1M);
  const cachedInputUsd = perMillion(
    cachedInputTokens,
    pricing.cachedInputPer1M,
  );
  const outputUsd = perMillion(completionTokens, pricing.outputPer1M);

  return {
    model: model as string,
    priced: true,
    freshInputTokens,
    cachedInputTokens,
    completionTokens,
    inputUsd,
    cachedInputUsd,
    outputUsd,
    totalUsd: roundUsd(inputUsd + cachedInputUsd + outputUsd),
  };
}

/** USD are summed at 6 decimals; a single cheap turn costs ~1e-4. */
export function roundUsd(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function perMillion(tokens: number, ratePer1M: number): number {
  return roundUsd((tokens / 1_000_000) * ratePer1M);
}

function nonNegative(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function isFinitePrice(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
