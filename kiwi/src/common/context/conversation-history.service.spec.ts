import { Test, TestingModule } from '@nestjs/testing';
import { ConversationHistoryService } from './conversation-history.service';
import { UserInteractionService } from '../database/user-interaction.service';
import { DatabaseService } from '../database/database.service';

describe('ConversationHistoryService', () => {
  let service: ConversationHistoryService;
  let userInteractionService: jest.Mocked<UserInteractionService>;
  let database: any;

  const interaction = (over: any = {}) => ({
    id: 'i1',
    userId: 'user-1',
    stringTag: 'thread-1',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    context: { content: { prompt: 'what is a loop?' } },
    serverActions: [
      {
        id: 'a1',
        type: 'agent-loop-complete',
        botResponse: 'A loop repeats work.',
        timestamp: new Date('2024-01-01T00:00:05Z'),
      },
    ],
    ...over,
  });

  beforeEach(async () => {
    database = {
      conversationSummary: { findUnique: jest.fn(), upsert: jest.fn() },
      userInteraction: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationHistoryService,
        {
          provide: UserInteractionService,
          useValue: { userInteractionsWithServerActions: jest.fn() },
        },
        { provide: DatabaseService, useValue: database },
      ],
    }).compile();

    service = module.get(ConversationHistoryService);
    userInteractionService = module.get(UserInteractionService);
    database.conversationSummary.findUnique.mockResolvedValue(null);
  });

  it('scopes the query to the requesting user (#117)', async () => {
    userInteractionService.userInteractionsWithServerActions.mockResolvedValue([]);

    await service.getWindow({ userId: 'user-1', conversationId: 'thread-1' });

    const call =
      userInteractionService.userInteractionsWithServerActions.mock.calls[0][0];
    // userId must be part of the WHERE clause, not applied afterwards — that is
    // the difference between "cannot see" and "usually does not see".
    expect(call.where).toMatchObject({ userId: 'user-1' });
    expect(call.where!.OR).toEqual([
      { stringTag: 'thread-1' },
      { id: 'thread-1' },
    ]);
  });

  it('bounds the read in the database rather than in memory', async () => {
    userInteractionService.userInteractionsWithServerActions.mockResolvedValue([]);

    await service.getWindow({
      userId: 'user-1',
      conversationId: 'thread-1',
      maxTurns: 12,
    });

    // maxTurns is a budget of MESSAGES, and one interaction yields up to two
    // (the question and the answer) — so fetching `maxTurns` interactions would
    // return roughly twice what we intend to replay.
    expect(
      userInteractionService.userInteractionsWithServerActions.mock.calls[0][0].take,
    ).toBe(6);
  });

  it('never starts the replay on an assistant message', async () => {
    // Trimming to an odd offset can leave a leading answer with no question in
    // front of it, which reads as the assistant volunteering something.
    userInteractionService.userInteractionsWithServerActions.mockResolvedValue([
      interaction(),
      interaction({ id: 'i2', timestamp: new Date('2024-01-02T00:00:00Z') }),
    ] as any);

    const { messages } = await service.getWindow({
      userId: 'user-1',
      conversationId: 'thread-1',
      maxTurns: 3,
    });

    expect(messages[0].role).toBe('user');
  });

  it('replays oldest-first as user/assistant pairs', async () => {
    // The query orders newest-first; replay must come back chronological.
    userInteractionService.userInteractionsWithServerActions.mockResolvedValue([
      interaction({
        id: 'i2',
        timestamp: new Date('2024-01-02T00:00:00Z'),
        context: { content: { prompt: 'second question' } },
        serverActions: [
          {
            id: 'a2',
            type: 'agent-loop-complete',
            botResponse: 'second answer',
            timestamp: new Date('2024-01-02T00:00:05Z'),
          },
        ],
      }),
      interaction(),
    ] as any);

    const { messages } = await service.getWindow({
      userId: 'user-1',
      conversationId: 'thread-1',
    });

    expect(messages).toEqual([
      { role: 'user', content: 'what is a loop?' },
      { role: 'assistant', content: 'A loop repeats work.' },
      { role: 'user', content: 'second question' },
      { role: 'assistant', content: 'second answer' },
    ]);
  });

  it('replays the final answer, never the intermediate narration (#139)', async () => {
    userInteractionService.userInteractionsWithServerActions.mockResolvedValue([
      interaction({
        serverActions: [
          {
            id: 'step',
            type: 'agent-loop-step',
            botResponse: "I'll look that up...",
            timestamp: new Date('2024-01-01T00:00:01Z'),
          },
          {
            id: 'final',
            type: 'agent-loop-complete',
            botResponse: 'A loop repeats work.',
            timestamp: new Date('2024-01-01T00:00:05Z'),
          },
        ],
      }),
    ] as any);

    const { messages } = await service.getWindow({
      userId: 'user-1',
      conversationId: 'thread-1',
    });

    const assistant = messages.filter((m) => m.role === 'assistant');
    expect(assistant).toHaveLength(1);
    expect(assistant[0].content).toBe('A loop repeats work.');
  });

  it('returns nothing for a first turn instead of throwing', async () => {
    expect(
      await service.getWindow({ userId: 'user-1', conversationId: '' }),
    ).toEqual({ messages: [], turnsAvailable: 0 });
    expect(
      userInteractionService.userInteractionsWithServerActions,
    ).not.toHaveBeenCalled();
  });

  describe('with a stored compaction summary', () => {
    beforeEach(() => {
      database.conversationSummary.findUnique.mockResolvedValue({
        summary: 'They asked about loops and lists.',
        coversUpToTimestamp: new Date('2024-01-01T12:00:00Z'),
      });
    });

    it('returns the summary and only replays turns after it', async () => {
      userInteractionService.userInteractionsWithServerActions.mockResolvedValue([
        interaction(),
      ] as any);

      const result = await service.getWindow({
        userId: 'user-1',
        conversationId: 'thread-1',
      });

      expect(result.summary).toBe('They asked about loops and lists.');
      const where =
        userInteractionService.userInteractionsWithServerActions.mock.calls[0][0]
          .where!;
      // Turns already folded into the summary must not also replay verbatim.
      expect(where.timestamp).toEqual({
        gt: new Date('2024-01-01T12:00:00Z'),
      });
    });

    it('falls back to verbatim replay when the summary read fails', async () => {
      database.conversationSummary.findUnique.mockRejectedValue(
        new Error('db down'),
      );
      userInteractionService.userInteractionsWithServerActions.mockResolvedValue([
        interaction(),
      ] as any);

      const result = await service.getWindow({
        userId: 'user-1',
        conversationId: 'thread-1',
      });

      // Losing the summary must never cost the student their history.
      expect(result.summary).toBeUndefined();
      expect(result.messages).toHaveLength(2);
    });
  });

  describe('needsCompaction', () => {
    // The invariant: every turn is either inside the replay window or covered
    // by the summary. It used to hold for neither in a wide band — `getWindow`
    // halved `maxHistoryTurns` into interactions while this compared an
    // interaction count against it raw, so the fold waited for twice as many
    // turns as replay could show and the middle of a long thread vanished.
    const WINDOW = ConversationHistoryService.replayWindowInteractions();

    it('derives the window in interactions, not messages', () => {
      // One interaction is up to two messages, so a 40-message budget reaches
      // back 20 interactions. Getting this backwards is the whole bug.
      expect(ConversationHistoryService.replayWindowInteractions(40)).toBe(20);
      expect(ConversationHistoryService.replayWindowInteractions(1)).toBe(1);
    });

    it('stays quiet while every turn still fits in the replay window', async () => {
      database.userInteraction.count.mockResolvedValue(WINDOW);

      await expect(
        service.needsCompaction('user-1', 'thread-1'),
      ).resolves.toBe(false);
    });

    it('fires the moment one turn would fall outside the window', async () => {
      // At WINDOW + 1 the oldest interaction stops being replayed. If the fold
      // has not started covering it by now, nothing represents it at all.
      database.userInteraction.count.mockResolvedValue(WINDOW + 1);

      await expect(
        service.needsCompaction('user-1', 'thread-1'),
      ).resolves.toBe(true);
    });

    it('never lets the trigger drift past what replay can show', async () => {
      // The regression guard proper: whatever the budget, the threshold must
      // not exceed the window. A future edit that changes one and not the
      // other reopens the gap silently, which is how it happened the first time.
      for (const maxTurns of [1, 2, 7, 40, 200]) {
        const window = ConversationHistoryService.replayWindowInteractions(maxTurns);
        expect(window).toBeLessThanOrEqual(Math.max(maxTurns, 1));
      }
    });

    it('only counts turns the summary does not already cover', async () => {
      database.conversationSummary.findUnique.mockResolvedValue({
        summary: 'earlier turns',
        coversUpToTimestamp: new Date('2024-01-01T00:00:00Z'),
        turnsCovered: 30,
      });
      database.userInteraction.count.mockResolvedValue(2);

      await service.needsCompaction('user-1', 'thread-1');

      const where = database.userInteraction.count.mock.calls[0][0].where;
      expect(where.timestamp).toEqual({
        gt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('does nothing without a thread id', async () => {
      await expect(service.needsCompaction('user-1', '')).resolves.toBe(false);
      expect(database.userInteraction.count).not.toHaveBeenCalled();
    });
  });

  describe('compact', () => {
    const manyInteractions = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        interaction({
          id: `i${i}`,
          timestamp: new Date(Date.UTC(2024, 0, 1, 0, i)),
          context: { content: { prompt: `q${i}` } },
          serverActions: [
            {
              id: `a${i}`,
              type: 'agent-loop-complete',
              botResponse: `a${i}`,
              timestamp: new Date(Date.UTC(2024, 0, 1, 0, i, 5)),
            },
          ],
        }),
      );

    beforeEach(() => {
      database.conversationSummary.upsert = jest.fn().mockResolvedValue({});
      database.userInteraction = { count: jest.fn() };
    });

    it('never summarises the most recent turns', async () => {
      userInteractionService.userInteractionsWithServerActions.mockResolvedValue(
        manyInteractions(10) as any,
      );
      const summarize = jest.fn().mockResolvedValue('a summary');

      const result = await service.compact({
        userId: 'user-1',
        conversationId: 'thread-1',
        summarize,
      });

      // 10 interactions, 6 protected → 4 compacted, and the transcript must stop
      // before the protected window.
      expect(result).toEqual({ compacted: true, turnsCovered: 4 });
      const transcript = summarize.mock.calls[0][0];
      expect(transcript.map((t: any) => t.content)).toEqual([
        'q0', 'a0', 'q1', 'a1', 'q2', 'a2', 'q3', 'a3',
      ]);
    });

    it('does nothing when there is only the protected window', async () => {
      userInteractionService.userInteractionsWithServerActions.mockResolvedValue(
        manyInteractions(4) as any,
      );
      const summarize = jest.fn();

      expect(
        await service.compact({
          userId: 'user-1',
          conversationId: 'thread-1',
          summarize,
        }),
      ).toEqual({ compacted: false });
      expect(summarize).not.toHaveBeenCalled();
      expect(database.conversationSummary.upsert).not.toHaveBeenCalled();
    });

    it('records how far the summary reaches so replay does not double-count', async () => {
      userInteractionService.userInteractionsWithServerActions.mockResolvedValue(
        manyInteractions(10) as any,
      );

      await service.compact({
        userId: 'user-1',
        conversationId: 'thread-1',
        summarize: async () => 'a summary',
      });

      const args = database.conversationSummary.upsert.mock.calls[0][0];
      // The 4th interaction (index 3) is the newest one folded in.
      expect(args.create.coversUpToTimestamp).toEqual(
        new Date(Date.UTC(2024, 0, 1, 0, 3)),
      );
    });

    it('passes the previous summary so compaction is cumulative', async () => {
      database.conversationSummary.findUnique.mockResolvedValue({
        summary: 'earlier summary',
        coversUpToTimestamp: new Date('2023-12-31T00:00:00Z'),
      });
      userInteractionService.userInteractionsWithServerActions.mockResolvedValue(
        manyInteractions(10) as any,
      );
      const summarize = jest.fn().mockResolvedValue('merged summary');

      await service.compact({
        userId: 'user-1',
        conversationId: 'thread-1',
        summarize,
      });

      expect(summarize.mock.calls[0][1]).toBe('earlier summary');
    });
  });

  it('caps per-turn text', async () => {
    userInteractionService.userInteractionsWithServerActions.mockResolvedValue([
      interaction({
        context: { content: { prompt: 'q'.repeat(9000) } },
        serverActions: [
          {
            id: 'a1',
            type: 'agent-loop-complete',
            botResponse: 'a'.repeat(9000),
            timestamp: new Date('2024-01-01T00:00:05Z'),
          },
        ],
      }),
    ] as any);

    const { messages } = await service.getWindow({
      userId: 'user-1',
      conversationId: 'thread-1',
      maxTurnChars: 100,
    });

    messages.forEach((m) => expect((m.content as string).length).toBe(100));
  });
});
