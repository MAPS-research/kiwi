import { createHash } from 'crypto';

/**
 * Derivation of the `prompt_cache_key` sent to engines that support it.
 *
 * OpenAI hashes the cached prefix over both the messages array and the `tools`
 * array, and uses `prompt_cache_key` to route requests that share that prefix
 * to the same cache shard. The key therefore has to vary with everything that
 * changes the stable head — class, chat type, mode, toolset — and with nothing
 * else. In particular it deliberately EXCLUDES the user id and the conversation
 * id: the whole point is that every student in a class, in the same mode, hits
 * the same warm prefix.
 */

/** Current key generation. Bump when the stable-head layout changes. */
const CACHE_KEY_VERSION = 'v1';

/** Hex chars of the toolset digest kept in the key. */
const TOOLSET_HASH_LENGTH = 8;

export interface PromptCacheKeyInput {
  /** Class the turn belongs to; `undefined` for app-wide turns. */
  classId?: string | null;

  /** Chat type, e.g. 'pdf' or 'codegen'. */
  chatType: string;

  /** Material / prompt mode, e.g. 'guidance' or 'recitation'. */
  mode: string;

  /**
   * Active experiment variant, when one applies.
   *
   * The variant's authoritative instructions are appended to the stable head, so
   * two students in the same class and mode on different variants have genuinely
   * different prefixes. Sharing a key across them costs hit rate.
   */
  variantKey?: string | null;

  /**
   * Tool names **in the order they are sent to the engine**. Order is part of
   * the cached prefix, so it is part of the hash — two identical sets in a
   * different order are genuinely different prefixes.
   */
  toolNames: string[];
}

/**
 * First 8 hex chars of a sha256 over the ordered tool-name list. Names are
 * joined with `\n`, which cannot occur inside a tool name, so distinct lists
 * cannot collide through concatenation.
 */
export function hashToolset(toolNames: string[]): string {
  return createHash('sha256')
    .update(toolNames.join('\n'))
    .digest('hex')
    .slice(0, TOOLSET_HASH_LENGTH);
}

/**
 * Build the cache key: `kiwi:v1:<classId|noclass>:<chatType>:<mode>:<toolsetHash>`.
 */
export function buildPromptCacheKey(input: PromptCacheKeyInput): string {
  const { classId, chatType, mode, variantKey, toolNames } = input;

  return [
    'kiwi',
    CACHE_KEY_VERSION,
    classId || 'noclass',
    chatType || 'unknown',
    mode || 'default',
    variantKey || 'novariant',
    hashToolset(toolNames),
  ].join(':');
}
