/**
 * Context assembly types.
 *
 * The prompt sent to the model is not one string — it is an ordered set of
 * blocks with very different lifetimes. Both engines cache automatically on an
 * exact prompt *prefix* (OpenAI needs ≥1,024 tokens and also hashes the `tools`
 * array; Qwen's implicit cache kicks in around 256 tokens), so whether a block
 * is stable or changes every turn decides what we pay for.
 *
 * Labelling blocks by tier is what makes that visible — and, later, fixable.
 */

import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * How long a block survives across the turns of one conversation.
 *
 * - `stable`  — identical on every turn of a session (persona, tool guidance,
 *               class instructions). This is the cacheable prefix.
 * - `history` — append-only: previous turns, which grow but never rewrite.
 * - `volatile`— re-derived every turn (current page, retrieved chunks, editor
 *               code). Anything volatile placed *before* history truncates the
 *               cacheable prefix at that point.
 * - `current` — this turn's user prompt and any resume pair.
 */
export type ContextTier = 'stable' | 'history' | 'volatile' | 'current';

/** Stable identifiers for the blocks the unified chat assembles. */
export type ContextBlockLabel =
  | 'stable-head'
  | 'personalization'
  | 'chat-summary'
  | 'environment'
  | 'app-context'
  | 'page-context'
  | 'codegen-context'
  | 'history'
  | 'mode-reminder'
  | 'prompt'
  | 'resume-tool-call'
  | 'resume-tool-result';

/**
 * One assembled message plus the metadata needed to reason about cost and
 * cache behaviour. `content` is only populated when the caller explicitly asks
 * for it — the raw text is student content and does not belong in logs.
 */
export interface ContextBlock {
  /** Position in the final messages array. */
  index: number;

  role: 'system' | 'user' | 'assistant' | 'tool';

  label: ContextBlockLabel;

  tier: ContextTier;

  chars: number;

  /** Heuristic estimate — see `estimateTokens`. Not a tokenizer. */
  estTokens: number;

  /** Full text. Only present when content was explicitly requested. */
  content?: string;

  /** Short fingerprint, for spotting which block changed between two turns. */
  hash?: string;
}

/** The assembled prompt plus everything needed to inspect it. */
export interface AssembledContext {
  /** Exactly what gets sent to the model, in order. */
  messages: ChatCompletionMessageParam[];

  /** One entry per message, aligned with `messages` by index. */
  blocks: ContextBlock[];

  /** Tool names in the order they are sent (part of the cached prefix). */
  toolNames: string[];

  /**
   * Fingerprint of the stable tier plus the tool list. Two turns of the same
   * conversation should produce the same hash; when they don't, the block whose
   * hash changed is the one that cost the cache hit.
   */
  prefixHash: string;

  /** Per-block hashes, so a changed prefix can be attributed to one block. */
  blockHashes: Array<{ label: ContextBlockLabel; hash: string }>;

  /**
   * Blocks that contradict each other — the same label emitted twice, or two
   * blocks sharing a heading with different bodies. Empty is the normal case;
   * anything here means the model was handed a prompt that disagrees with
   * itself, which no amount of prompt wording fixes.
   */
  conflicts: string[];

  totals: {
    blocks: number;
    chars: number;
    estTokens: number;
    stableEstTokens: number;
    historyEstTokens: number;
    volatileEstTokens: number;
  };
}

/**
 * Rough token estimate: ~3.6 characters per token, plus per-message overhead.
 *
 * Deliberately not a tokenizer. The repo has no tokenizer dependency and every
 * existing budget is a character `.slice()`, so this is calibrated to be
 * consistent rather than exact. Phase E feeds real `prompt_tokens` back in to
 * correct the ratio; until then treat these numbers as comparative, not
 * billable.
 */
export const CHARS_PER_TOKEN = 3.6;
export const TOKENS_PER_MESSAGE_OVERHEAD = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN) + TOKENS_PER_MESSAGE_OVERHEAD;
}

/** Message content flattened to a string for measuring and hashing. */
export function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content == null) return '';
  if (Array.isArray(content)) {
    return content
      .map((part: any) =>
        part?.type === 'text' ? (part.text ?? '') : JSON.stringify(part),
      )
      .join('\n');
  }
  return JSON.stringify(content);
}
