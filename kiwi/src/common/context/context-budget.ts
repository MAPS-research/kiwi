/**
 * Size limits for the assembled chat context, in one place.
 *
 * Every budget in this codebase is a character count rather than a token count —
 * there is no tokenizer dependency, and `estimateTokens` in `context.types.ts` is
 * a heuristic (measured ~5% low against real `prompt_tokens`). Characters are
 * what the existing `.slice()` calls already use, so keeping the unit consistent
 * matters more than being exact.
 *
 * Every value is env-overridable so a limit can be moved without a deploy.
 */

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const CONTEXT_BUDGET = {
  /**
   * Retrieved course chunks injected before the model runs.
   *
   * This block was the one genuinely uncapped part of the prompt: N chunks were
   * joined and pushed with no length check at all, so a class with large chunks
   * could push an arbitrary amount of text into every single turn.
   */
  get maxRagChars(): number {
    return envNumber('CONTEXT_MAX_RAG_CHARS', 6000);
  },

  /** App-provided context (editor code, app state). Matches the existing cap. */
  get maxAppContextChars(): number {
    return envNumber('CONTEXT_MAX_APP_CONTEXT_CHARS', 8000);
  },

  /**
   * How many replayed messages of history the model sees.
   *
   * Deliberately a turn count rather than a token budget: the estimator is a
   * heuristic (~5% low), and a wrong token budget silently drops the turn that
   * held the thread of the conversation. Compaction handles the long tail.
   */
  get maxHistoryTurns(): number {
    return envNumber('CONTEXT_MAX_HISTORY_TURNS', 40);
  },

  /** Per-turn text cap, matching the DTO's MAX_TURN_CONTENT_CHARS. */
  get maxTurnChars(): number {
    return envNumber('CONTEXT_MAX_TURN_CHARS', 4000);
  },

  /**
   * Turns kept verbatim no matter what. Compaction may only summarise turns
   * older than these — the recent exchange is what the student is actually
   * talking about, and summarising it is how an assistant starts answering a
   * paraphrase of the question instead of the question.
   */
  get minProtectedRecentTurns(): number {
    return envNumber('CONTEXT_MIN_PROTECTED_RECENT_TURNS', 6);
  },

  /**
   * One tool result, as replayed into the prompt.
   *
   * Applies both to the agent loop's own results and to a client tool result
   * resumed on the next request. Previously two separate literals in two files,
   * one of them a `const` inside a method — which is how a cap stops being a
   * budget and becomes a number nobody can find.
   */
  get maxToolResultChars(): number {
    return envNumber('CONTEXT_MAX_TOOL_RESULT_CHARS', 8000);
  },

  /**
   * An *earlier* step of a resumed client-tool trail.
   *
   * The whole trail is replayed so the agent remembers what it already fetched
   * — without that it re-issues the call whose result it dropped, which is the
   * get_sitemap -> list_classes -> navigate -> get_sitemap loop. But a trail is
   * unbounded in length and browser observe snapshots run to tens of KB, so
   * only the step that just finished gets the full budget. The earlier ones are
   * there to be remembered, not re-read.
   */
  get maxEarlierToolResultChars(): number {
    return envNumber('CONTEXT_MAX_EARLIER_TOOL_RESULT_CHARS', 2000);
  },

  /** Codegen selected-code / full-code / error blocks. Match existing caps. */
  get maxSelectedCodeChars(): number {
    return envNumber('CONTEXT_MAX_SELECTED_CODE_CHARS', 4000);
  },
  get maxCodeContextChars(): number {
    return envNumber('CONTEXT_MAX_CODE_CONTEXT_CHARS', 6000);
  },
  get maxErrorContextChars(): number {
    return envNumber('CONTEXT_MAX_ERROR_CONTEXT_CHARS', 2000);
  },
};

/**
 * Worst-case size of one assembled prompt, in characters.
 *
 * Every block has a cap and history has a turn cap, so the total is bounded —
 * but only by arithmetic nobody wrote down, and every cap is env-overridable.
 * This makes the ceiling explicit so it can be checked against the model window
 * rather than discovered as a truncated conversation in production.
 */
export function worstCasePromptChars(stableHeadChars: number): number {
  const b = CONTEXT_BUDGET;
  return (
    stableHeadChars +
    b.maxHistoryTurns * b.maxTurnChars +
    b.maxRagChars +
    b.maxAppContextChars +
    b.maxSelectedCodeChars +
    b.maxCodeContextChars +
    b.maxErrorContextChars
  );
}

/**
 * Trim a list of retrieved chunks to fit a character budget, dropping whole
 * chunks from the end.
 *
 * Never cuts mid-chunk: half a retrieved passage is worse than no passage —
 * it reads as complete to the model, so a truncated definition or a half
 * code sample gets cited as if it were the whole thing.
 *
 * @returns the kept chunks and how many were dropped, so the caller can log it
 *   rather than silently shrinking the context.
 */
export function fitChunksToBudget(
  chunks: string[],
  maxChars: number,
): { kept: string[]; dropped: number } {
  const kept: string[] = [];
  let used = 0;

  for (const chunk of chunks) {
    // +1 for the newline the caller joins with.
    const cost = chunk.length + 1;
    if (used + cost > maxChars) break;
    kept.push(chunk);
    used += cost;
  }

  // Always keep at least one chunk: retrieving nothing because the first chunk
  // is oversized is a worse failure than exceeding the budget once. Truncate
  // that single chunk instead.
  //
  // Unless there is no budget left at all — callers spend the budget in
  // priority order, so a zero remainder means an earlier block already used it.
  // Returning a truncated-to-empty chunk there makes the caller emit a labelled
  // heading with nothing under it.
  if (kept.length === 0 && chunks.length > 0 && maxChars > 0) {
    return { kept: [chunks[0].slice(0, maxChars)], dropped: chunks.length - 1 };
  }

  return { kept, dropped: chunks.length - kept.length };
}
