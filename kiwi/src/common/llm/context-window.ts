/**
 * Per-model context-window sizes: the one number the assembler never had.
 *
 * Every budget in `CONTEXT_BUDGET` is a character cap, and `worstCasePromptChars`
 * exists to state the resulting ceiling — but it had no model capacity to state
 * it *against*, and no caller. The only place a window size appeared at all was
 * a hardcoded 128k inside a unit test. So the ceiling was written down, verified
 * against a constant nobody could configure, and compared to nothing at runtime.
 *
 * Keyed by model id rather than by engine on purpose: one `EngineConfig` can
 * hold two models (qwen's `chatModel` and `chatVisionModel`), so "the engine's
 * window" is not a well-defined quantity at the moment you need it.
 *
 * Distinct from `TokenLimitGuard`, which is a cumulative *spend quota* per user
 * session (`LLM_TOKEN_LIMIT`, default 200M). That bounds cost over time; this
 * bounds one request. Neither substitutes for the other.
 */

import { ConfigGetter } from './pricing';

/** Maximum total tokens (prompt + completion) one request may use. */
export type ContextWindowTable = Record<string, number>;

/**
 * Published context windows, in tokens. A convenience default, not a contract:
 * providers change these, and a deployment pinning an older snapshot may differ.
 * Override with `LLM_MODEL_CONTEXT_WINDOWS` rather than editing this table.
 *
 * A model absent here reports `null` — unknown, not unlimited. Callers must not
 * treat a missing entry as permission to send anything. A wrong ceiling is
 * worse than a missing one, because a missing one says so: nothing in this
 * table is inferred from a neighbouring model's number.
 */
export const DEFAULT_MODEL_CONTEXT_WINDOWS: ContextWindowTable = {
  // OpenAI
  // gpt-5.4-mini is this deployment's chat model. Per OpenAI's model docs:
  // 400,000 context / 128,000 max output. Note it is NOT `gpt-5-mini` — the
  // dotted version is a different family and does not prefix-match it.
  'gpt-5.4-mini': 400_000,
  'gpt-5': 400_000,
  'gpt-5-mini': 400_000,
  'gpt-5-nano': 400_000,
  'gpt-4.1': 1_047_576,
  'gpt-4.1-mini': 1_047_576,
  'gpt-4.1-nano': 1_047_576,
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-3.5-turbo': 16_385,

  // Alibaba Model Studio (qwen). The commercial models advertise a large
  // window, but note Model Studio caps *input* below the total for some tiers —
  // confirm per deployment before relying on the headroom.
  'qwen-turbo': 1_000_000,
  'qwen-plus': 131_072,
  'qwen-max': 32_768,

  // This deployment's self-hosted Qwen, 262,144 as configured by the operator.
  // Keyed on the family so the `-fast` variant and any sibling resolve through
  // prefix matching. Self-hosted, so this is a property of OUR serving setup
  // rather than of the weights — another deployment of the same model may serve
  // a different window and should override it.
  'Qwen3.6-35B-A3B': 262_144,
};

/** Env var holding a JSON `ContextWindowTable` merged over the defaults. */
export const MODEL_CONTEXT_WINDOW_ENV_KEY = 'LLM_MODEL_CONTEXT_WINDOWS';

/**
 * Builds the effective window table: defaults, overridden per model by
 * `LLM_MODEL_CONTEXT_WINDOWS`. A malformed entry is ignored rather than allowed
 * to produce a plausible-looking wrong ceiling.
 */
export function loadContextWindowTable(get: ConfigGetter): ContextWindowTable {
  const raw = get(MODEL_CONTEXT_WINDOW_ENV_KEY);
  if (!raw) return { ...DEFAULT_MODEL_CONTEXT_WINDOWS };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_MODEL_CONTEXT_WINDOWS };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ...DEFAULT_MODEL_CONTEXT_WINDOWS };
  }

  const table: ContextWindowTable = { ...DEFAULT_MODEL_CONTEXT_WINDOWS };
  for (const [model, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      table[model] = value;
    }
  }
  return table;
}

/**
 * Exact id first, then the longest table key the model id extends with a `-`,
 * so dated snapshots (`gpt-4o-2024-08-06`) resolve to their base model instead
 * of falling off the table. Same rule as `lookupModelPricing`.
 *
 * @returns the window in tokens, or `null` when the model is unknown — which
 *   means "do not assume", not "unlimited".
 */
export function lookupContextWindow(
  model: string | null | undefined,
  table: ContextWindowTable = DEFAULT_MODEL_CONTEXT_WINDOWS,
): number | null {
  if (!model) return null;
  if (table[model]) return table[model];

  let bestKey: string | null = null;
  for (const key of Object.keys(table)) {
    if (model.startsWith(`${key}-`) && (!bestKey || key.length > bestKey.length)) {
      bestKey = key;
    }
  }
  return bestKey ? table[bestKey] : null;
}

/**
 * Whether a provider error is the model refusing an over-long request.
 *
 * Both engines are reached through the OpenAI SDK, but they word this
 * differently and neither is stable across versions, so match on several
 * signals and accept that this is maintenance. Getting it wrong in the
 * permissive direction costs one wasted retry; getting it wrong in the strict
 * direction just means the student sees the provider's error, which is what
 * happened before this existed.
 */
export function isContextOverflowError(error: unknown): boolean {
  const err = error as
    | { code?: unknown; status?: unknown; message?: unknown; error?: { code?: unknown; message?: unknown } }
    | null
    | undefined;
  if (!err) return false;

  const code = String(err.code ?? err.error?.code ?? '');
  if (code === 'context_length_exceeded' || code === 'string_above_max_length') {
    return true;
  }

  const message = String(err.message ?? err.error?.message ?? '').toLowerCase();
  if (!message) return false;

  return (
    // OpenAI
    message.includes('maximum context length') ||
    message.includes('context_length_exceeded') ||
    message.includes('reduce the length of the messages') ||
    // DashScope / Model Studio
    message.includes('input length') ||
    message.includes('range of input length') ||
    message.includes('prompt is too long') ||
    message.includes('too many tokens')
  );
}
