import { createHash } from 'crypto';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import {
  AssembledContext,
  ContextBlock,
  ContextBlockLabel,
  ContextTier,
  contentToText,
  estimateTokens,
} from './context.types';
import { CONTEXT_BLOCK_SPECS } from './context-blocks';

/**
 * Records what each message in an assembled prompt *is*, without changing how
 * the prompt is built.
 *
 * The assembly pushes messages into a plain array in several steps. Rather than
 * restructuring that (which would risk changing what the model sees), the
 * caller marks the array after each step and the trace attributes the newly
 * added messages to that label and tier. Behaviour-preserving by construction:
 * if nobody marks anything, nothing changes.
 *
 * Usage:
 *
 *   const trace = new ContextTrace();
 *   messages.push(...);       trace.mark(messages, 'stable-head', 'stable');
 *   messages.push(...);       trace.mark(messages, 'page-context', 'volatile');
 *   const described = trace.describe(messages, toolNames);
 */
export class ContextTrace {
  private readonly marks: Array<{
    label: ContextBlockLabel;
    tier: ContextTier;
    from: number;
    to: number;
  }> = [];

  /** Index up to which messages have already been attributed. */
  private cursor = 0;

  /**
   * Attribute every message added since the last mark to `label`/`tier`.
   * A no-op when the step added nothing (e.g. an absent optional block).
   */
  mark(
    messages: readonly unknown[],
    label: ContextBlockLabel,
    tier: ContextTier,
  ): void {
    if (messages.length <= this.cursor) return;
    this.marks.push({ label, tier, from: this.cursor, to: messages.length });
    this.cursor = messages.length;
  }

  /**
   * Describe the assembled prompt.
   *
   * @param includeContent when true, each block carries its raw text. That text
   *   is student content — only pass true for a deliberate, access-controlled
   *   inspection, never for routine logging.
   */
  describe(
    messages: ChatCompletionMessageParam[],
    toolNames: string[],
    includeContent = false,
  ): AssembledContext {
    const labelFor = (
      index: number,
    ): { label: ContextBlockLabel; tier: ContextTier } => {
      const mark = this.marks.find((m) => index >= m.from && index < m.to);
      // Anything the caller forgot to mark is treated as volatile: that is the
      // pessimistic reading for cache purposes, so an unmarked block shows up
      // as a problem rather than hiding as a stable one.
      return mark
        ? { label: mark.label, tier: mark.tier }
        : { label: 'prompt', tier: 'volatile' };
    };

    /**
     * Blocks that contradict each other by construction.
     *
     * Two things a prompt should never contain: the same labelled block twice
     * (the assembler emitted it from two places), and two blocks carrying the
     * same heading with different bodies — which is how a client `chatSummary`
     * and a server-owned summary both reached one prompt, both headed
     * "Previous conversation context:", with no way for the model to tell which
     * was current.
     *
     * Reported rather than thrown: a conflict makes an answer worse, and
     * failing the turn outright makes it absent.
     */
    const findConflicts = (list: ContextBlock[]): string[] => {
      const problems: string[] = [];

      const byLabel = new Map<ContextBlockLabel, number>();
      for (const b of list) {
        byLabel.set(b.label, (byLabel.get(b.label) ?? 0) + 1);
      }
      for (const [label, count] of byLabel) {
        // Most blocks are exactly one message, so a second one means two parts
        // of the assembler disagree. The exceptions declare themselves in
        // CONTEXT_BLOCKS via `repeatGroup` — history, and the call/result pair
        // of a resumed client-tool trail. Reading it from the declaration
        // rather than hardcoding a label keeps this rule and `checkBlockOrder`
        // from disagreeing about what may legitimately repeat.
        if (count > 1 && !CONTEXT_BLOCK_SPECS.get(label)?.repeatGroup) {
          problems.push(`duplicate block "${label}" x${count}`);
        }
      }

      const byHeading = new Map<string, Set<string>>();
      list.forEach((b, i) => {
        const text = contentToText((messages[i] as any).content);
        const heading = text.split('\n', 1)[0]?.trim();
        if (!heading || heading.length > 120) return;
        const bodies = byHeading.get(heading) ?? new Set<string>();
        bodies.add(hashText(text));
        byHeading.set(heading, bodies);
      });
      for (const [heading, bodies] of byHeading) {
        if (bodies.size > 1) {
          problems.push(`conflicting blocks under "${heading}"`);
        }
      }

      return problems;
    };

    const blocks: ContextBlock[] = messages.map((message, index) => {
      const text = contentToText((message as any).content);
      const { label, tier } = labelFor(index);
      return {
        index,
        role: (message as any).role,
        label,
        tier,
        chars: text.length,
        estTokens: estimateTokens(text),
        ...(includeContent ? { content: text } : {}),
      };
    });

    const blockHashes = blocks.map((block, index) => ({
      label: block.label,
      hash: hashText(contentToText((messages[index] as any).content)),
    }));

    // The prefix is the stable tier plus the tool list — the part a provider can
    // reuse across turns. Tool names are included because OpenAI hashes the
    // `tools` array as part of the cached prefix, so a reordered tool list is a
    // cache miss even when every message is byte-identical.
    const prefixSource = [
      ...blocks
        .filter((b) => b.tier === 'stable')
        .map((b, i) => `${i}:${blockHashes[b.index].hash}`),
      `tools:${toolNames.join(',')}`,
    ].join('|');

    const sumBy = (tier: ContextTier) =>
      blocks.filter((b) => b.tier === tier).reduce((n, b) => n + b.estTokens, 0);

    return {
      messages,
      blocks,
      toolNames,
      prefixHash: hashText(prefixSource),
      blockHashes,
      conflicts: findConflicts(blocks),
      totals: {
        blocks: blocks.length,
        chars: blocks.reduce((n, b) => n + b.chars, 0),
        estTokens: blocks.reduce((n, b) => n + b.estTokens, 0),
        stableEstTokens: sumBy('stable'),
        historyEstTokens: sumBy('history'),
        volatileEstTokens: sumBy('volatile'),
      },
    };
  }
}

/** Short, stable fingerprint. Truncated — this is for comparison, not secrecy. */
export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 12);
}

/**
 * One-line, log-safe summary of an assembled prompt: block layout and totals,
 * no student content.
 */
export function formatContextBlocks(context: AssembledContext): string {
  const blocks = context.blocks
    .map(
      (b) =>
        `[${b.index}] ${b.role}/${b.label}/${b.tier} ${b.chars}c ~${b.estTokens}t`,
    )
    .join(' ');
  const { totals } = context;
  return (
    `blocks=${totals.blocks} ~${totals.estTokens}t ` +
    `(stable=${totals.stableEstTokens} history=${totals.historyEstTokens} ` +
    `volatile=${totals.volatileEstTokens}) tools=${context.toolNames.length} ` +
    `prefix=${context.prefixHash} | ${blocks}`
  );
}
