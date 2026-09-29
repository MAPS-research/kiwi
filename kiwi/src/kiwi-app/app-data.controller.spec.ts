import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AppDataController } from './app-data.controller';
import { KiwiAppService } from './kiwi-app.service';
import { AppChunksService } from './app-chunks.service';
import { AppContextualChatService } from './app-contextual-chat.service';

describe('AppDataController', () => {
  let controller: AppDataController;

  const kiwiAppService = {
    getUserClassRole: jest.fn(),
    logAuditEvent: jest.fn(),
  };
  const appChunksService = { getClassDocumentChunks: jest.fn() };
  const appContextualChatService = { run: jest.fn() };

  const appTokenReq = (overrides: object = {}) =>
    ({
      appContext: {
        appSlug: 'flashcards',
        classId: 'class-1',
        scopes: [
          'class:materials:chunks:read',
          'context:student_learning:read',
        ],
        userId: 'user-1',
        ...overrides,
      },
    }) as any;

  const emptyChunks = {
    classId: 'class-1',
    documents: [],
    nextCursor: null,
    hasMore: false,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AppDataController],
      providers: [
        { provide: KiwiAppService, useValue: kiwiAppService },
        { provide: AppChunksService, useValue: appChunksService },
        {
          provide: AppContextualChatService,
          useValue: appContextualChatService,
        },
      ],
    }).compile();
    controller = moduleRef.get(AppDataController);
  });

  // ---- #218 document-chunks ------------------------------------------------

  it('serves chunks for an app token with the scope and audits', async () => {
    appChunksService.getClassDocumentChunks.mockResolvedValue(emptyChunks);
    const res = await controller.getDocumentChunks(
      'class-1',
      { limit: 5 } as any,
      appTokenReq(),
    );
    expect(res).toBe(emptyChunks);
    expect(appChunksService.getClassDocumentChunks).toHaveBeenCalledWith({
      classId: 'class-1',
      documentIds: undefined,
      cursor: undefined,
      limit: 5,
    });
    expect(kiwiAppService.logAuditEvent).toHaveBeenCalledWith(
      'chunks_read',
      'flashcards',
      'user-1',
      'class-1',
      expect.any(Object),
      expect.anything(),
    );
  });

  it('rejects an app token missing the chunks scope', async () => {
    await expect(
      controller.getDocumentChunks(
        'class-1',
        {} as any,
        appTokenReq({ scopes: ['class:info:read'] }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(appChunksService.getClassDocumentChunks).not.toHaveBeenCalled();
  });

  it('rejects an app token scoped to a different class', async () => {
    await expect(
      controller.getDocumentChunks('class-OTHER', {} as any, appTokenReq()),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(appChunksService.getClassDocumentChunks).not.toHaveBeenCalled();
  });

  it('serves a class member (user JWT) without auditing', async () => {
    kiwiAppService.getUserClassRole.mockResolvedValue({ role: 'student' });
    appChunksService.getClassDocumentChunks.mockResolvedValue(emptyChunks);
    const res = await controller.getDocumentChunks(
      'class-1',
      {} as any,
      { user: { sub: 'user-2' } } as any,
    );
    expect(res).toBe(emptyChunks);
    expect(kiwiAppService.logAuditEvent).not.toHaveBeenCalled();
  });

  it('rejects a user JWT with no role in the class', async () => {
    kiwiAppService.getUserClassRole.mockResolvedValue({ role: null });
    await expect(
      controller.getDocumentChunks(
        'class-1',
        {} as any,
        { user: { sub: 'user-3' } } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // ---- #217 contextual-chat ------------------------------------------------

  const chatDto = {
    promptId: 'weekly-summary',
    contextRequest: {
      kind: 'student_learning_context' as const,
      scope: 'current_user_current_class' as const,
      include: ['recent_questions' as const],
    },
  };

  it('rejects contextual-chat without an app token', async () => {
    await expect(
      controller.contextualChat(
        'flashcards',
        chatDto as any,
        {
          user: { sub: 'user-1' },
        } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(appContextualChatService.run).not.toHaveBeenCalled();
  });

  it('rejects contextual-chat when the slug does not match the token', async () => {
    await expect(
      controller.contextualChat(
        'other-app',
        chatDto as any,
        appTokenReq({
          scopes: [
            'llm:prompt:weekly-summary',
            'context:student_learning:read',
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('delegates contextual-chat with token-derived ids and defaults timeWindow', async () => {
    appContextualChatService.run.mockResolvedValue({
      output: '{"summary":"ok"}',
      promptId: 'weekly-summary',
      promptName: 'Weekly Summary',
      contextIncluded: ['recent_questions'],
      contextOmitted: [],
    });
    const res = await controller.contextualChat(
      'flashcards',
      chatDto as any,
      appTokenReq({
        scopes: ['llm:prompt:weekly-summary', 'context:student_learning:read'],
      }),
    );
    expect(appContextualChatService.run).toHaveBeenCalledWith(
      expect.objectContaining({
        appSlug: 'flashcards',
        promptId: 'weekly-summary',
        userId: 'user-1',
        classId: 'class-1',
        contextRequest: expect.objectContaining({ timeWindowDays: 14 }),
      }),
    );
    expect(res.output).toBe('{"summary":"ok"}');
  });
});
