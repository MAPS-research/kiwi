import { Injectable, Logger } from '@nestjs/common';
import { Conversation, Prisma } from '@prisma/client';

import { DatabaseService } from '../database/database.service';

/** Where a thread originated. Apps and MCP clients get their own threads. */
export type ConversationSource = 'chat' | 'app' | 'mcp';

/**
 * Threads.
 *
 * A conversation used to be a convention rather than a row: the thread id lived
 * in `UserInteraction.stringTag`, and when a client sent none, code fell back to
 * the interaction's own id. Every query that wanted a thread's turns therefore
 * asked for "rows tagged X, or the row that IS X" — a lookup that cannot tell a
 * thread from a single message, repeated at four call sites, with
 * `ConversationSummary` keyed on that convention and no foreign key to point at.
 *
 * This gives the thread an identity. It is deliberately **forward-only**:
 * existing interactions are not backfilled, so reads still fall back to the old
 * convention for historical threads. `threadScope()` is the single place that
 * knows both shapes — which is the part worth keeping even before any backfill.
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * The thread for this turn, created if this is its first turn.
   *
   * Lookup is always by `(userId, threadKey)`. The client's key is never used as
   * a primary key, so a client cannot address — or collide with — another user's
   * thread by guessing an id.
   */
  async resolve(params: {
    userId: string;
    threadKey: string;
    classId?: string;
    source?: ConversationSource;
  }): Promise<Conversation | null> {
    const { userId, threadKey, classId, source = 'chat' } = params;
    if (!threadKey) return null;

    try {
      return await this.database.conversation.upsert({
        where: { userId_threadKey: { userId, threadKey } },
        create: { userId, threadKey, classId: classId ?? null, source },
        update: {},
      });
    } catch (error) {
      // A thread row is an optimisation, not a prerequisite: replay still works
      // through the legacy key. Never fail a chat turn over it.
      this.logger.warn(
        `Could not resolve conversation ${threadKey}: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  /** Record that a turn happened, for ordering and display in a thread list. */
  async noteTurn(conversationId: string): Promise<void> {
    try {
      await this.database.conversation.update({
        where: { id: conversationId },
        data: { lastTurnAt: new Date(), turnCount: { increment: 1 } },
      });
    } catch (error) {
      this.logger.warn(
        `Could not update conversation ${conversationId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * A user's threads, most recently active first.
   *
   * This is the read the old design could not do. Listing chats previously meant
   * loading every matching interaction and grouping them in memory — see
   * `StudentService.getChatHistory`, which still paginates a fully-materialised
   * array. Here the database does the work and the index covers it.
   *
   * Only threads created since this model landed appear; older ones are
   * reachable through chat history as before.
   */
  async list(params: {
    userId: string;
    classId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ conversations: Conversation[]; total: number }> {
    const { userId, classId, limit = 20, offset = 0 } = params;
    const where: Prisma.ConversationWhereInput = {
      userId,
      ...(classId ? { classId } : {}),
    };

    const [conversations, total] = await Promise.all([
      this.database.conversation.findMany({
        where,
        orderBy: { lastTurnAt: 'desc' },
        take: Math.min(Math.max(limit, 1), 100),
        skip: Math.max(offset, 0),
      }),
      this.database.conversation.count({ where }),
    ]);

    return { conversations, total };
  }
}

/**
 * The one place that knows how to find a thread's turns.
 *
 * Matches three ways, because the model was introduced forward-only:
 *
 *   1. `conversationId` — turns written since the thread entity landed
 *   2. `stringTag` — the legacy thread key, still written for compatibility
 *   3. `id` — the oldest shape, where a client sent no key and the interaction's
 *      own id became the thread key by default
 *
 * Legs 2 and 3 exist only to serve history written before this change. When
 * every live thread has a `conversationId` — after a backfill, or simply once
 * old threads stop being resumed — this collapses to a single equality and the
 * `@@index([conversationId, timestamp])` covers it outright.
 *
 * `userId` is part of the scope rather than a filter applied afterwards, so a
 * thread key can never reach another user's turns.
 */
export function threadScope(params: {
  userId: string;
  threadKey: string;
  conversationId?: string | null;
}): Prisma.UserInteractionWhereInput {
  const { userId, threadKey, conversationId } = params;

  const legs: Prisma.UserInteractionWhereInput[] = [
    { stringTag: threadKey },
    { id: threadKey },
  ];
  if (conversationId) legs.unshift({ conversationId });

  return { userId, OR: legs };
}
