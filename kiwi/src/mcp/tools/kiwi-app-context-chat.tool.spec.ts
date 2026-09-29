import { Test } from '@nestjs/testing';
import { KiwiAppContextChatTool } from './kiwi-app-context-chat.tool';
import { AppContextualChatService } from 'src/kiwi-app/app-contextual-chat.service';

describe('KiwiAppContextChatTool', () => {
  let tool: KiwiAppContextChatTool;

  const appContextualChatService = { run: jest.fn() };
  const mcpContext = { reportProgress: jest.fn() } as any;

  const appTokenRequest = (overrides: object = {}) =>
    ({
      appContext: {
        appSlug: 'adaptive-learning',
        classId: 'class-1',
        scopes: ['llm:prompt:weekly-summary', 'context:student_learning:read'],
        userId: 'student-1',
        ...overrides,
      },
    }) as any;

  const baseArgs = {
    appSlug: 'adaptive-learning',
    promptId: 'weekly-summary',
    contextRequest: {
      kind: 'student_learning_context' as const,
      scope: 'current_user_current_class' as const,
      timeWindowDays: 7,
      include: ['recent_questions' as const, 'weak_concepts' as const],
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    appContextualChatService.run.mockResolvedValue({
      output: '{"summary":"making progress"}',
      promptId: 'weekly-summary',
      promptName: 'Weekly Summary',
      contextIncluded: ['recent_questions', 'weak_concepts'],
      contextOmitted: [],
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        KiwiAppContextChatTool,
        {
          provide: AppContextualChatService,
          useValue: appContextualChatService,
        },
      ],
    }).compile();
    tool = moduleRef.get(KiwiAppContextChatTool);
  });

  it('rejects requests without an app token', async () => {
    const result = await tool.kiwiAppContextualChat(baseArgs, mcpContext, {
      user: { sub: 'user-1' },
    } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('app-scoped token');
    expect(appContextualChatService.run).not.toHaveBeenCalled();
  });

  it('rejects an app token missing the context scope', async () => {
    const result = await tool.kiwiAppContextualChat(
      baseArgs,
      mcpContext,
      appTokenRequest({ scopes: ['llm:prompt:weekly-summary'] }),
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('context:student_learning:read');
    expect(appContextualChatService.run).not.toHaveBeenCalled();
  });

  it('rejects an app token missing the prompt scope', async () => {
    const result = await tool.kiwiAppContextualChat(
      baseArgs,
      mcpContext,
      appTokenRequest({ scopes: ['context:student_learning:read'] }),
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('llm:prompt:weekly-summary');
  });

  it('rejects a token issued for a different app', async () => {
    const result = await tool.kiwiAppContextualChat(
      baseArgs,
      mcpContext,
      appTokenRequest({ appSlug: 'other-app' }),
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('other-app');
    expect(appContextualChatService.run).not.toHaveBeenCalled();
  });

  it('delegates to the shared service with token-derived ids and wraps the result', async () => {
    const result = await tool.kiwiAppContextualChat(
      { ...baseArgs, userMessage: 'go' },
      mcpContext,
      appTokenRequest(),
    );

    expect(appContextualChatService.run).toHaveBeenCalledWith(
      expect.objectContaining({
        appSlug: 'adaptive-learning',
        promptId: 'weekly-summary',
        userMessage: 'go',
        userId: 'student-1',
        classId: 'class-1',
      }),
    );
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe('{"summary":"making progress"}');
    expect(result.metadata).toMatchObject({
      promptName: 'Weekly Summary',
      contextIncluded: ['recent_questions', 'weak_concepts'],
      contextOmitted: [],
    });
  });

  it('reports a non-Error throw instead of throwing itself', async () => {
    appContextualChatService.run.mockRejectedValue(null);

    const result = await tool.kiwiAppContextualChat(
      baseArgs,
      mcpContext,
      appTokenRequest(),
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('null');
  });

  it('maps a 403 (unapproved prompt) error from the service', async () => {
    appContextualChatService.run.mockRejectedValue(
      Object.assign(new Error('Prompt "weekly-summary" is not active'), {
        status: 403,
      }),
    );
    const result = await tool.kiwiAppContextualChat(
      baseArgs,
      mcpContext,
      appTokenRequest(),
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text.toLowerCase()).toContain('not active');
  });
});
