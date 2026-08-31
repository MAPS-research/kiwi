import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService, threadScope } from './conversation.service';
import { DatabaseService } from '../database/database.service';

describe('threadScope', () => {
  it('scopes by user, always', () => {
    // userId is part of the scope rather than a filter applied afterwards, so a
    // thread key can never reach another user's turns (#117).
    expect(
      threadScope({ userId: 'u1', threadKey: 't1' }),
    ).toMatchObject({ userId: 'u1' });
  });

  it('matches historical turns through the legacy key', () => {
    // Nothing was backfilled, so turns written before the Conversation model
    // have no foreign key and are only findable by the old convention.
    const scope = threadScope({ userId: 'u1', threadKey: 't1' });

    expect(scope.OR).toEqual([{ stringTag: 't1' }, { id: 't1' }]);
  });

  it('prefers the foreign key when the thread has one', () => {
    const scope = threadScope({
      userId: 'u1',
      threadKey: 't1',
      conversationId: 'conv-1',
    });

    // The indexed leg goes first; the legacy legs stay so a thread that spans
    // the migration boundary still returns all of its turns.
    expect(scope.OR).toEqual([
      { conversationId: 'conv-1' },
      { stringTag: 't1' },
      { id: 't1' },
    ]);
  });

  it('ignores a null conversation id rather than matching null rows', () => {
    // `{conversationId: null}` would match every un-migrated turn of every
    // thread — the one shape of this bug that leaks across conversations.
    const scope = threadScope({
      userId: 'u1',
      threadKey: 't1',
      conversationId: null,
    });

    expect(scope.OR).not.toContainEqual({ conversationId: null });
  });
});

describe('ConversationService', () => {
  let service: ConversationService;
  let database: any;

  beforeEach(async () => {
    database = {
      conversation: {
        upsert: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: DatabaseService, useValue: database },
      ],
    }).compile();

    service = module.get(ConversationService);
  });

  describe('resolve', () => {
    it('looks up by (userId, threadKey), never by the client value as a key', async () => {
      database.conversation.upsert.mockResolvedValue({ id: 'conv-1' });

      await service.resolve({
        userId: 'u1',
        threadKey: 'client-supplied',
        classId: 'c1',
      });

      const args = database.conversation.upsert.mock.calls[0][0];
      // A client cannot address another user's thread by guessing an id.
      expect(args.where).toEqual({
        userId_threadKey: { userId: 'u1', threadKey: 'client-supplied' },
      });
      expect(args.create).toMatchObject({ userId: 'u1', classId: 'c1' });
    });

    it('marks app turns as their own source', async () => {
      database.conversation.upsert.mockResolvedValue({ id: 'conv-1' });

      await service.resolve({ userId: 'u1', threadKey: 't1', source: 'app' });

      expect(database.conversation.upsert.mock.calls[0][0].create.source).toBe(
        'app',
      );
    });

    it('returns null instead of throwing when the row cannot be written', async () => {
      database.conversation.upsert.mockRejectedValue(new Error('db down'));

      // The thread row is an optimisation; replay still works through the
      // legacy key, so a chat turn must never fail over it.
      await expect(
        service.resolve({ userId: 'u1', threadKey: 't1' }),
      ).resolves.toBeNull();
    });

    it('does nothing without a thread key', async () => {
      await expect(
        service.resolve({ userId: 'u1', threadKey: '' }),
      ).resolves.toBeNull();
      expect(database.conversation.upsert).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    beforeEach(() => {
      database.conversation.findMany.mockResolvedValue([]);
      database.conversation.count.mockResolvedValue(0);
    });

    it('orders by recent activity and paginates in the database', async () => {
      await service.list({ userId: 'u1', limit: 10, offset: 20 });

      expect(database.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { lastTurnAt: 'desc' },
          take: 10,
          skip: 20,
        }),
      );
    });

    it('caps the page size', async () => {
      await service.list({ userId: 'u1', limit: 5000 });

      expect(database.conversation.findMany.mock.calls[0][0].take).toBe(100);
    });

    it('rejects a negative offset rather than passing it through', async () => {
      await service.list({ userId: 'u1', offset: -5 });

      expect(database.conversation.findMany.mock.calls[0][0].skip).toBe(0);
    });
  });
});
