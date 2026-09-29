import { Injectable, Logger } from '@nestjs/common';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import {
  UserInteractionService,
  UserInteractionWithAction,
} from '../database/user-interaction.service';
import { DatabaseService } from '../database/database.service';
import { CONTEXT_BUDGET } from './context-budget';
import { threadScope } from './conversation.service';

/**
 * Server-owned conversation history for prompt replay.
 *
 * Until now the only history the model saw was an array the browser sent up with
 * each request (`UnifiedChatRequest.conversation`): unbounded, unvalidated, and
 * impossible to scope — a client could replay anything it liked, including turns
 * that were never theirs. The server already persisted every turn; it simply
 * never read them back.
 *
 * Two rules this class exists to enforce:
 *
 *  1. **Every read is scoped to one user.** `userId` is part of the where clause,
 *     not a filter applied afterwards, so one student's thread id can never
 *     surface another student's turns (#117).
 *  2. **What is replayed is the answer, not the narration.** A multi-step agent
 *     turn writes an `agent-loop-step` row per intermediate "I'll navigate
 *     there..." plus one `agent-loop-complete` with the real reply. Replaying
 *     every row is what put "calling tool" into history (#139) and duplicated
 *     turns (#108).
 */
@Injectable()
export class ConversationHistoryService {
  private readonly logger = new Logger(ConversationHistoryService.name);

  /** Interaction types that represent a chat turn. */
  private static readonly CHAT_TYPES = [
    'frontend-interaction-chat',
    'frontend-interaction-chat-exercise',
    'exercise_chat',
    'chat-query',
  ];

  constructor(
    private readonly userInteractionService: UserInteractionService,
    private readonly database: DatabaseService,
  ) {}

  /**
   * The replayable turns of one conversation, oldest first, already bounded.
   *
   * Returns `[]` for an unknown thread rather than throwing: a first turn has no
   * history, and that is not an error.
   */
  async getWindow(params: {
    userId: string;
    conversationId: string;
    maxTurns?: number;
    maxTurnChars?: number;
    /**
     * The turn currently being assembled. Its `UserInteraction` row is written
     * before the prompt is built, so without this it comes back as "history" and
     * the student's question is replayed immediately before being asked again.
     */
    excludeInteractionId?: string;
    /** Resolved thread row, when there is one. Absent for legacy threads. */
    conversationRowId?: string | null;
  }): Promise<{
    messages: ChatCompletionMessageParam[];
    summary?: string;
    turnsAvailable: number;
  }> {
    const {
      userId,
      conversationId,
      maxTurns = CONTEXT_BUDGET.maxHistoryTurns,
      maxTurnChars = CONTEXT_BUDGET.maxTurnChars,
      excludeInteractionId,
      conversationRowId,
    } = params;

    if (!conversationId) {
      return { messages: [], turnsAvailable: 0 };
    }

    const summary = await this.getSummary(userId, conversationId);

    const interactions =
      await this.userInteractionService.userInteractionsWithServerActions({
        where: {
          // Scoping, not filtering — userId is part of threadScope. This is the
          // #117 fix, and threadScope is the single place that knows how a
          // thread is addressed.
          ...threadScope({
            userId,
            threadKey: conversationId,
            conversationId: conversationRowId,
          }),
          type: { in: ConversationHistoryService.CHAT_TYPES },
          ...(excludeInteractionId
            ? { id: { not: excludeInteractionId } }
            : {}),
          // Everything folded into the summary replays as the summary instead.
          ...(summary
            ? { timestamp: { gt: summary.coversUpToTimestamp } }
            : {}),
        },
        // Tie-broken by id: two interactions can share a millisecond, and an
        // unstable order there makes the compaction boundary arbitrary.
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        // Bound in the database. One interaction yields up to TWO messages (the
        // question and the answer), so fetch half as many interactions as the
        // message budget — asking for `maxTurns` interactions would return
        // roughly twice the messages we intend to replay. `needsCompaction`
        // reads the same function, so the fold can never lag the window.
        take: ConversationHistoryService.replayWindowInteractions(maxTurns),
      });

    // Oldest first for replay.
    const ordered = [...interactions].reverse();
    const messages: ChatCompletionMessageParam[] = [];

    for (const interaction of ordered) {
      for (const turn of this.toTurns(interaction, maxTurnChars)) {
        messages.push(turn);
      }
    }

    // Trim to whole exchanges. Slicing to an odd offset can leave a leading
    // assistant message with no question in front of it, which reads to the
    // model as the assistant having volunteered something unprompted.
    let windowed = messages.slice(-maxTurns);
    if (windowed.length && windowed[0].role === 'assistant') {
      windowed = windowed.slice(1);
    }

    return {
      messages: windowed,
      summary: summary?.summary,
      turnsAvailable: messages.length,
    };
  }

  /** The stored compaction summary for a thread, if one exists. */
  async getSummary(
    userId: string,
    conversationId: string,
  ): Promise<{ summary: string; coversUpToTimestamp: Date } | null> {
    try {
      const row = await this.database.conversationSummary.findUnique({
        where: { userId_conversationId: { userId, conversationId } },
      });
      return row
        ? {
            summary: row.summary,
            coversUpToTimestamp: row.coversUpToTimestamp,
          }
        : null;
    } catch (error) {
      // A missing summary must never cost the student their history — fall back
      // to replaying verbatim.
      this.logger.warn(
        `Failed to read conversation summary: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  /**
   * How many interactions the replay window can actually hold.
   *
   * `maxHistoryTurns` is a *message* budget, and one interaction yields up to
   * two messages (the question and the answer), so the window reaches back half
   * as far in interactions as that number reads.
   *
   * Both the replay `take` and the compaction trigger derive from here, because
   * they used to each interpret `maxHistoryTurns` in their own unit: `getWindow`
   * halved it into interactions while `needsCompaction` compared an interaction
   * count against it raw. Compaction therefore waited for twice as many turns as
   * replay could ever show, and everything in between was in neither place —
   * not replayed, and not covered by a summary either. The model simply lost
   * that stretch of the conversation until the next fold caught up.
   */
  static replayWindowInteractions(
    maxTurns: number = CONTEXT_BUDGET.maxHistoryTurns,
  ): number {
    return Math.max(Math.ceil(maxTurns / 2), 1);
  }

  /**
   * Whether a thread has outgrown its replay window and should be summarised.
   *
   * Counted in interactions rather than tokens deliberately: this decides only
   * *whether* to enqueue a background job, and a cheap count that is
   * occasionally early is better than an estimate that is occasionally wrong.
   *
   * The threshold is the replay window itself, not a separate number. One turn
   * past what `getWindow` can show is exactly the moment a turn would otherwise
   * fall out of the prompt with nothing standing in for it, so that is when the
   * summary has to start covering it.
   */
  async needsCompaction(
    userId: string,
    conversationId: string,
  ): Promise<boolean> {
    if (!conversationId) return false;

    const summary = await this.getSummary(userId, conversationId);
    const uncompacted = await this.database.userInteraction.count({
      where: {
        ...threadScope({ userId, threadKey: conversationId }),
        type: { in: ConversationHistoryService.CHAT_TYPES },
        ...(summary ? { timestamp: { gt: summary.coversUpToTimestamp } } : {}),
      },
    });

    return uncompacted > ConversationHistoryService.replayWindowInteractions();
  }

  /**
   * Fold the oldest turns of a thread into a summary.
   *
   * Two invariants:
   *  - The most recent `minProtectedRecentTurns` are never summarised. They are
   *    what the student is actually talking about, and summarising them is how
   *    an assistant starts answering a paraphrase instead of the question.
   *  - Nothing is deleted. The turns stay in `UserInteraction`; compaction only
   *    changes what the model is shown next turn, so it is always recoverable.
   *
   * @param summarize produces the summary text; injected so this class stays
   *   free of LLM wiring and is trivially testable.
   */
  async compact(params: {
    userId: string;
    conversationId: string;
    summarize: (
      transcript: Array<{ role: string; content: string }>,
      previousSummary?: string,
    ) => Promise<string>;
  }): Promise<{ compacted: boolean; turnsCovered?: number }> {
    const { userId, conversationId, summarize } = params;
    const previous = await this.getSummary(userId, conversationId);

    const interactions =
      await this.userInteractionService.userInteractionsWithServerActions({
        where: {
          ...threadScope({ userId, threadKey: conversationId }),
          type: { in: ConversationHistoryService.CHAT_TYPES },
          ...(previous
            ? { timestamp: { gt: previous.coversUpToTimestamp } }
            : {}),
        },
        // Tie-broken by id so the protected-window boundary is deterministic.
        // Without it two interactions in the same millisecond can straddle the
        // slice, and the one left outside `toCompact` is then excluded by the
        // `gt` filter from every future replay AND from the summary — silently
        // lost rather than compacted.
        orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
      });

    const protectedCount = CONTEXT_BUDGET.minProtectedRecentTurns;
    let toCompact = interactions.slice(
      0,
      Math.max(interactions.length - protectedCount, 0),
    );

    // Never split a group of interactions sharing the boundary millisecond.
    // `coversUpToTimestamp` is applied downstream as a strict `>` filter, so a
    // sibling left just outside this slice would be excluded from the summary
    // AND from every future replay — lost rather than compacted. Pull the
    // boundary back instead of forward, so the protected window stays a floor.
    if (toCompact.length > 0 && toCompact.length < interactions.length) {
      const boundary = toCompact[toCompact.length - 1].timestamp.getTime();
      if (interactions[toCompact.length].timestamp.getTime() === boundary) {
        toCompact = toCompact.filter((i) => i.timestamp.getTime() !== boundary);
      }
    }

    if (toCompact.length === 0) {
      // A protected window at least as large as the replay window would leave
      // nothing ever compactable while `needsCompaction` kept saying yes —
      // a job per turn that can never make progress. Both are env-overridable,
      // so say so out loud rather than churning silently.
      const window = ConversationHistoryService.replayWindowInteractions();
      if (protectedCount >= window) {
        this.logger.warn(
          `[CTX-COMPACT] nothing compactable: minProtectedRecentTurns ` +
            `(${protectedCount}) is not below the replay window (${window}), ` +
            `so this thread can never be folded`,
        );
      }
      return { compacted: false };
    }

    const transcript = toCompact.flatMap((interaction) =>
      this.toTurns(interaction, CONTEXT_BUDGET.maxTurnChars).map((m) => ({
        role: m.role as string,
        content: String(m.content ?? ''),
      })),
    );

    const summary = await summarize(transcript, previous?.summary);
    const coversUpToTimestamp = toCompact[toCompact.length - 1].timestamp;

    await this.database.conversationSummary.upsert({
      where: { userId_conversationId: { userId, conversationId } },
      create: {
        userId,
        conversationId,
        summary,
        coversUpToTimestamp,
        turnsCovered: toCompact.length,
      },
      update: {
        summary,
        coversUpToTimestamp,
        turnsCovered: { increment: toCompact.length },
      },
    });

    this.logger.log(
      `[CTX-COMPACT] folded ${toCompact.length} turn(s) of thread ` +
        `${conversationId} into a summary; ${protectedCount} most recent kept verbatim`,
    );

    return { compacted: true, turnsCovered: toCompact.length };
  }

  /**
   * One interaction → the user message and the assistant's real reply.
   *
   * Intermediate `agent-loop-step` narration is deliberately dropped here: it is
   * useful for *displaying* what the agent did, but replaying it into the next
   * prompt teaches the model to narrate instead of answer.
   */
  private toTurns(
    interaction: UserInteractionWithAction,
    maxTurnChars: number,
  ): ChatCompletionMessageParam[] {
    const turns: ChatCompletionMessageParam[] = [];
    const context = interaction.context as any;

    const prompt = context?.content?.prompt;
    if (typeof prompt === 'string' && prompt.trim()) {
      turns.push({
        role: 'user',
        content: prompt.trim().slice(0, maxTurnChars),
      });
    }

    const finalAnswer = [...(interaction.serverActions || [])]
      .filter(
        (action) => action.type !== 'agent-loop-step' && action.botResponse,
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .pop();

    const answer = finalAnswer?.botResponse?.trim();
    if (answer) {
      turns.push({
        role: 'assistant',
        content: answer.slice(0, maxTurnChars),
      });
    }

    return turns;
  }
}
