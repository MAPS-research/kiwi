/**
 * The declared order and tier of every block in an assembled prompt.
 *
 * This exists because the invariant that earns the cache lived in comments. The
 * assembler pushes blocks in a fixed sequence and a reviewer had to reconstruct
 * the rule — "volatile after history" — from the shape of an `if`. Reordering
 * two pushes would have cost the measured 0% → 88% silently; the provider bill
 * is the only place it would have shown up.
 *
 * Deliberately a *declaration checked against* the assembler rather than a
 * table the assembler is driven by. Rewriting `assembleUnifiedContext` to emit
 * from here is the tempting version, and it is exactly the kind of change that
 * shifts a newline inside the stable head and quietly costs the hit rate. The
 * golden files would catch that — but the cheap half of the benefit (the rule
 * written down, and enforced) does not require taking the risk at all.
 *
 * Adding a block means adding it here as well; the conformance test fails
 * otherwise, which is the point.
 */

import { ContextBlockLabel, ContextTier } from './context.types';

export interface ContextBlockSpec {
  label: ContextBlockLabel;
  /** Blocks appear in ascending order. Gaps leave room to insert. */
  order: number;
  tier: ContextTier;
  /** Why this block sits where it does — the part comments kept losing. */
  why: string;
  /**
   * Blocks that may legitimately appear more than once, and the group they
   * cycle within.
   *
   * Most blocks are exactly one message, so a second one means two parts of the
   * assembler disagree. Two are not: `history` is many messages by nature, and a
   * resumed client-tool trail is a repeating call/result pair — one per step the
   * browser ran. Without this, a 3-step trail (the `get_sitemap -> list_classes
   * -> navigate` case #229 exists to serve) reports two duplicate-block
   * conflicts and one bogus ordering violation on every resume turn.
   *
   * Members of one group may also cycle among themselves without tripping the
   * ordering rule; the group as a whole still holds its place in the sequence.
   */
  repeatGroup?: string;
}

export const CONTEXT_BLOCKS: readonly ContextBlockSpec[] = [
  {
    label: 'stable-head',
    order: -100,
    tier: 'stable',
    why: 'Persona, tool guidance and mode rules. Byte-identical across a class and mode, which is the whole cached prefix.',
  },
  {
    label: 'personalization',
    order: -50,
    tier: 'stable',
    why: 'A rolling profile, merged rather than appended, so it changes rarely enough to stay in the prefix.',
  },
  {
    label: 'chat-summary',
    order: -10,
    tier: 'history',
    why: 'Client-supplied text about the conversation so far. Sits with history and NOT in the prefix — a client that regenerates it each turn would otherwise move the prefix every turn.',
  },
  {
    label: 'history',
    order: 0,
    tier: 'history',
    repeatGroup: 'history',
    why: 'Append-only. Everything before it must hold still; everything after it may change freely.',
  },
  {
    label: 'environment',
    order: 100,
    tier: 'volatile',
    why: 'Active tab, page number, app slug. Interpolating this into the head was the measured cause of the 0% hit rate.',
  },
  {
    label: 'page-context',
    order: 110,
    tier: 'volatile',
    why: 'Retrieved course chunks, re-retrieved per turn.',
  },
  {
    label: 'codegen-context',
    order: 110,
    tier: 'volatile',
    why: 'Mutually exclusive with page-context, hence the shared order.',
  },
  {
    label: 'app-context',
    order: 120,
    tier: 'volatile',
    why: 'App-provided state. Rendered as labelled untrusted data, never as instructions.',
  },
  {
    label: 'mode-reminder',
    order: 200,
    tier: 'volatile',
    why: 'Guardrails restated last, because recency is what makes them hold in a long conversation (#215/#46). Costs the cache nothing, sitting after history.',
  },
  {
    label: 'prompt',
    order: 300,
    tier: 'current',
    why: "The student's question.",
  },
  {
    label: 'resume-tool-call',
    order: 400,
    tier: 'current',
    repeatGroup: 'resume-trail',
    why: 'Replayed assistant tool call when resuming after a browser-side tool.',
  },
  {
    label: 'resume-tool-result',
    order: 410,
    tier: 'current',
    repeatGroup: 'resume-trail',
    why: 'Its paired result. Must immediately follow the call it answers.',
  },
];

/** Spec lookup by label. */
export const CONTEXT_BLOCK_SPECS: ReadonlyMap<
  ContextBlockLabel,
  ContextBlockSpec
> = new Map(CONTEXT_BLOCKS.map((b) => [b.label, b]));

/**
 * Check an assembled block sequence against the declaration.
 *
 * Two rules, both of which the cache depends on:
 *  - every emitted label is declared (an unknown block has no stated tier, and
 *    `ContextTrace` defaults unmarked blocks to volatile, so an undeclared one
 *    can silently land in the wrong place);
 *  - labels appear in non-decreasing declared order.
 *
 * @returns the violations, empty when the sequence conforms.
 */
export function checkBlockOrder(
  labels: readonly ContextBlockLabel[],
): string[] {
  const problems: string[] = [];
  let lastOrder = -Infinity;
  let lastLabel: string | null = null;
  let lastGroup: string | undefined;

  for (const label of labels) {
    const spec = CONTEXT_BLOCK_SPECS.get(label);
    if (!spec) {
      problems.push(`undeclared block "${label}"`);
      continue;
    }
    // Consecutive messages of the same block are one block, not a violation
    // against itself — and once something IS out of order, repeating the
    // complaint for each of its messages buries the one line that matters.
    //
    // A repeat group may also cycle backwards within itself: a resumed trail is
    // call/result/call/result, so the second call legitimately follows a result
    // declared after it.
    const cyclingWithinGroup =
      spec.repeatGroup !== undefined && spec.repeatGroup === lastGroup;
    if (spec.order < lastOrder && label !== lastLabel && !cyclingWithinGroup) {
      problems.push(`"${label}" appears after "${lastLabel}"`);
    }
    lastOrder = Math.max(lastOrder, spec.order);
    lastLabel = label;
    lastGroup = spec.repeatGroup;
  }

  return problems;
}
