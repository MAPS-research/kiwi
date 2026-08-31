import {
  CONTEXT_BUDGET,
  fitChunksToBudget,
  worstCasePromptChars,
} from './context-budget';

describe('worstCasePromptChars', () => {
  // A ~9k-char stable head, measured against the running backend.
  const STABLE_HEAD = 9000;

  it('stays inside the smallest context window we run', () => {
    // The budgets are individually sane but only collectively bounded by
    // arithmetic — and every one is env-overridable. This pins the ceiling.
    // ~3.6 chars/token, and the smallest window in play is 128k tokens.
    const estTokens = worstCasePromptChars(STABLE_HEAD) / 3.6;

    expect(estTokens).toBeLessThan(128_000);
  });

  it('is dominated by history, which is the budget worth watching', () => {
    const historyShare =
      (CONTEXT_BUDGET.maxHistoryTurns * CONTEXT_BUDGET.maxTurnChars) /
      worstCasePromptChars(STABLE_HEAD);

    expect(historyShare).toBeGreaterThan(0.5);
  });
});

describe('fitChunksToBudget', () => {
  it('keeps everything when it fits', () => {
    const chunks = ['aaa', 'bbb'];
    expect(fitChunksToBudget(chunks, 100)).toEqual({ kept: chunks, dropped: 0 });
  });

  it('drops whole chunks from the end rather than cutting mid-chunk', () => {
    // 'a'.repeat(10) + newline = 11 chars each, so a 25-char budget fits two.
    const chunks = ['a'.repeat(10), 'b'.repeat(10), 'c'.repeat(10)];
    const { kept, dropped } = fitChunksToBudget(chunks, 25);

    expect(kept).toEqual([chunks[0], chunks[1]]);
    expect(dropped).toBe(1);
    // Nothing was sliced: half a retrieved passage reads as complete to the
    // model and gets cited as if it were the whole thing.
    kept.forEach((chunk) => expect(chunk).toHaveLength(10));
  });

  it('reports how many chunks were dropped so the caller can log it', () => {
    const chunks = Array.from({ length: 5 }, () => 'x'.repeat(20));
    expect(fitChunksToBudget(chunks, 21).dropped).toBe(4);
  });

  it('truncates a single oversized chunk rather than retrieving nothing', () => {
    const { kept, dropped } = fitChunksToBudget(['y'.repeat(500)], 100);

    expect(kept).toHaveLength(1);
    expect(kept[0]).toHaveLength(100);
    expect(dropped).toBe(0);
  });

  it('handles an empty result set', () => {
    expect(fitChunksToBudget([], 100)).toEqual({ kept: [], dropped: 0 });
  });

  it('keeps nothing when the budget is already spent, rather than an empty chunk', () => {
    // Callers spend the budget in priority order and pass the remainder on. A
    // truncated-to-empty chunk here makes the caller emit a labelled heading
    // ("[Additional Course Context]") with nothing underneath it.
    expect(fitChunksToBudget(['aaa', 'bbb'], 0)).toEqual({
      kept: [],
      dropped: 2,
    });
  });

  it('never returns more than the budget for the normal path', () => {
    const chunks = Array.from({ length: 20 }, () => 'z'.repeat(50));
    const { kept } = fitChunksToBudget(chunks, 300);

    expect(kept.join('\n').length).toBeLessThanOrEqual(300);
  });
});
