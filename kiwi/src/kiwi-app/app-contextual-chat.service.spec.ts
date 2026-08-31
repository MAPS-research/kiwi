import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AppContextualChatService } from './app-contextual-chat.service';
import { LlmService } from 'src/common/llm/llm.service';
import { KiwiAppService } from './kiwi-app.service';
import { AppContextService } from './app-context.service';

describe('AppContextualChatService', () => {
  let service: AppContextualChatService;

  const llmService = { createChat: jest.fn() };
  const kiwiAppService = {
    getActivePrompt: jest.fn(),
    // The real method is `async`, and the service attaches `.catch()` so a
    // failed audit write can't mask the original error. A bare jest.fn()
    // returns undefined, which would throw inside the `finally` and do exactly
    // the masking the service is guarding against — see beforeEach.
    logAuditEvent: jest.fn(),
  };
  const appContextService = { assembleStudentLearningContext: jest.fn() };

  const baseParams = {
    appSlug: 'adaptive-learning',
    promptId: 'weekly-summary',
    contextRequest: {
      kind: 'student_learning_context' as const,
      scope: 'current_user_current_class' as const,
      timeWindowDays: 7,
      include: ['recent_questions' as const, 'weak_concepts' as const],
    },
    userId: 'student-1',
    classId: 'class-1',
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    // Must be re-applied after resetAllMocks(), which drops implementations.
    kiwiAppService.logAuditEvent.mockResolvedValue(undefined);
    kiwiAppService.getActivePrompt.mockResolvedValue({
      id: 'p1',
      name: 'Weekly Summary',
      systemPrompt: 'Summarize the student learning state.',
      temperature: 0.3,
      maxTokens: 800,
    });
    appContextService.assembleStudentLearningContext.mockResolvedValue({
      contextText: 'SECRET-STUDENT-CONTEXT: asked about recursion',
      included: ['recent_questions', 'weak_concepts'],
      omitted: [],
    });
    llmService.createChat.mockResolvedValue({
      choices: [{ message: { content: '{"summary":"making progress"}' } }],
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        AppContextualChatService,
        { provide: LlmService, useValue: llmService },
        { provide: KiwiAppService, useValue: kiwiAppService },
        { provide: AppContextService, useValue: appContextService },
      ],
    }).compile();
    service = moduleRef.get(AppContextualChatService);
  });

  it('assembles context from the passed userId/classId and returns only the output', async () => {
    const result = await service.run({
      ...baseParams,
      userMessage: "Generate this week's summary.",
    });

    expect(
      appContextService.assembleStudentLearningContext,
    ).toHaveBeenCalledWith({
      userId: 'student-1',
      classId: 'class-1',
      timeWindowDays: 7,
      include: ['recent_questions', 'weak_concepts'],
      retrievalQuery: undefined,
    });
    // context injected as a system message
    const messages = llmService.createChat.mock.calls[0][0];
    expect(messages[1].role).toBe('system');
    expect(messages[1].content).toContain('SECRET-STUDENT-CONTEXT');
    // ...but never returned to the caller
    expect(JSON.stringify(result)).not.toContain('SECRET-STUDENT-CONTEXT');
    expect(result.output).toBe('{"summary":"making progress"}');
    expect(result).toMatchObject({
      promptId: 'weekly-summary',
      promptName: 'Weekly Summary',
      contextIncluded: ['recent_questions', 'weak_concepts'],
      contextOmitted: [],
    });
  });

  it('passes a sanitized outputSchema as response_format, pinned to openai', async () => {
    await service.run({
      ...baseParams,
      outputSchema: { type: 'object', properties: { summary: { type: 'string' } } },
    });

    const [, temperature, maxTokens, tools, responseFormat, engine] =
      llmService.createChat.mock.calls[0];
    expect(temperature).toBe(0.3);
    expect(maxTokens).toBe(800);
    expect(tools).toBeUndefined();
    expect(responseFormat).toMatchObject({
      type: 'json_schema',
      json_schema: { name: 'kiwi_app_output', strict: true },
    });
    expect(engine).toBe('openai');
  });

  it('rejects a malicious outputSchema before assembling context', async () => {
    await expect(
      service.run({
        ...baseParams,
        outputSchema: { type: 'object', properties: { a: { $ref: '#/x' } } },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(
      appContextService.assembleStudentLearningContext,
    ).not.toHaveBeenCalled();
  });

  it('audits sizes and flags, never content', async () => {
    await service.run(baseParams);

    expect(kiwiAppService.logAuditEvent).toHaveBeenCalledWith(
      'context_chat',
      'adaptive-learning',
      'student-1',
      'class-1',
      expect.objectContaining({
        promptId: 'weekly-summary',
        contextChars: expect.any(Number),
        hasOutputSchema: false,
        success: true,
      }),
      undefined,
    );
    const eventData = kiwiAppService.logAuditEvent.mock.calls[0][4];
    expect(JSON.stringify(eventData)).not.toContain('SECRET-STUDENT-CONTEXT');
  });

  it('audits failed attempts (success: false) when LLM throws', async () => {
    llmService.createChat.mockRejectedValue(new Error('LLM rate limit'));

    await expect(service.run(baseParams)).rejects.toThrow('LLM rate limit');

    expect(kiwiAppService.logAuditEvent).toHaveBeenCalledWith(
      'context_chat',
      'adaptive-learning',
      'student-1',
      'class-1',
      expect.objectContaining({ promptId: 'weekly-summary', success: false }),
      undefined,
    );
  });
});
