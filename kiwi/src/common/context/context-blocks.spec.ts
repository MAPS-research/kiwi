import {
  CONTEXT_BLOCKS,
  CONTEXT_BLOCK_SPECS,
  checkBlockOrder,
} from './context-blocks';
import { ContextBlockLabel } from './context.types';

describe('CONTEXT_BLOCKS', () => {
  it('declares every label the assembler can emit', () => {
    // The union in context.types.ts is the assembler's vocabulary. A label that
    // exists there but not here would pass through `checkBlockOrder` as
    // "undeclared" at runtime instead of being caught now.
    const declared = new Set(CONTEXT_BLOCKS.map((b) => b.label));
    const all: ContextBlockLabel[] = [
      'stable-head',
      'personalization',
      'chat-summary',
      'environment',
      'app-context',
      'page-context',
      'codegen-context',
      'history',
      'mode-reminder',
      'prompt',
      'resume-tool-call',
      'resume-tool-result',
    ];

    for (const label of all) {
      expect(declared.has(label)).toBe(true);
    }
    expect(declared.size).toBe(all.length);
  });

  it('puts every stable block before every history and volatile one', () => {
    // This is the 88%, stated as data rather than as a comment on an `if`.
    const worstStable = Math.max(
      ...CONTEXT_BLOCKS.filter((b) => b.tier === 'stable').map((b) => b.order),
    );
    const firstNonStable = Math.min(
      ...CONTEXT_BLOCKS.filter(
        (b) => b.tier === 'history' || b.tier === 'volatile',
      ).map((b) => b.order),
    );

    expect(worstStable).toBeLessThan(firstNonStable);
  });

  it('puts history before every volatile block', () => {
    // Volatile content ahead of history is precisely the layout that measured
    // 0%: the prefix ends at the first byte that changes per turn.
    const lastHistory = Math.max(
      ...CONTEXT_BLOCKS.filter((b) => b.tier === 'history').map((b) => b.order),
    );
    const firstVolatile = Math.min(
      ...CONTEXT_BLOCKS.filter((b) => b.tier === 'volatile').map(
        (b) => b.order,
      ),
    );

    expect(lastHistory).toBeLessThan(firstVolatile);
  });

  it('keeps the guardrail reminder after history and before the prompt', () => {
    // Late enough that recency carries it (#215/#46), early enough that the
    // student's question is still the last thing the model reads.
    const reminder = CONTEXT_BLOCK_SPECS.get('mode-reminder')!;
    const history = CONTEXT_BLOCK_SPECS.get('history')!;
    const prompt = CONTEXT_BLOCK_SPECS.get('prompt')!;

    expect(reminder.order).toBeGreaterThan(history.order);
    expect(reminder.order).toBeLessThan(prompt.order);
  });

  it('keeps a resumed tool result immediately after its call', () => {
    const call = CONTEXT_BLOCK_SPECS.get('resume-tool-call')!;
    const result = CONTEXT_BLOCK_SPECS.get('resume-tool-result')!;

    expect(result.order).toBeGreaterThan(call.order);
  });

  it('gives every block a stated reason for its position', () => {
    // The failure mode this file exists to fix is a rule nobody wrote down.
    for (const block of CONTEXT_BLOCKS) {
      expect(block.why.length).toBeGreaterThan(20);
    }
  });
});

describe('checkBlockOrder', () => {
  it('accepts the real tiered sequence', () => {
    expect(
      checkBlockOrder([
        'stable-head',
        'personalization',
        'history',
        'environment',
        'page-context',
        'app-context',
        'mode-reminder',
        'prompt',
      ]),
    ).toEqual([]);
  });

  it('accepts a sequence with optional blocks absent', () => {
    expect(checkBlockOrder(['stable-head', 'prompt'])).toEqual([]);
  });

  it('accepts repeated history messages', () => {
    expect(
      checkBlockOrder(['stable-head', 'history', 'history', 'prompt']),
    ).toEqual([]);
  });

  it('rejects volatile content placed before history', () => {
    // The legacy layout, and the regression this whole module guards.
    const problems = checkBlockOrder([
      'stable-head',
      'environment',
      'page-context',
      'history',
      'prompt',
    ]);

    expect(problems).toContainEqual(expect.stringContaining('"history"'));
  });

  it('rejects a stable block that drifted after history', () => {
    const problems = checkBlockOrder([
      'stable-head',
      'history',
      'personalization',
      'prompt',
    ]);

    expect(problems).toContainEqual(
      expect.stringContaining('"personalization"'),
    );
  });

  it('rejects a label nobody declared', () => {
    const problems = checkBlockOrder(['stable-head', 'surprise' as any]);

    expect(problems).toContainEqual(expect.stringContaining('undeclared'));
  });
});
