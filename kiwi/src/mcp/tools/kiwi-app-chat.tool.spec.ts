import { Test, TestingModule } from '@nestjs/testing';
import { KiwiAppChatTool } from './kiwi-app-chat.tool';
import { LlmService } from 'src/common/llm/llm.service';
import { KiwiAppService } from 'src/kiwi-app/kiwi-app.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('KiwiAppChatTool', () => {
  let tool: KiwiAppChatTool;
  let llmService: jest.Mocked<LlmService>;
  let kiwiAppService: jest.Mocked<KiwiAppService>;

  const mockContext = {
    reportProgress: jest.fn(),
  };

  const createMockRequest = (appContext?: {
    appSlug: string;
    classId: string;
    scopes: string[];
    userId: string;
  }) => {
    const req: any = {};
    if (appContext) {
      req.appContext = appContext;
    }
    return req;
  };

  const mockPrompt = {
    id: 'prompt-1',
    appId: 'app-1',
    promptId: 'hint',
    name: 'Hint Generator',
    description: 'Generates hints for students',
    systemPrompt: 'You are a helpful assistant that provides hints...',
    maxTokens: 1000,
    temperature: 0.7,
    isActive: true,
    approvedBy: 'admin-1',
    approvedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KiwiAppChatTool,
        {
          provide: LlmService,
          useValue: {
            createChat: jest.fn(),
          },
        },
        {
          provide: KiwiAppService,
          useValue: {
            getActivePrompt: jest.fn(),
            getAppPrompts: jest.fn(),
          },
        },
      ],
    }).compile();

    tool = module.get<KiwiAppChatTool>(KiwiAppChatTool);
    llmService = module.get(LlmService);
    kiwiAppService = module.get(KiwiAppService);

    mockContext.reportProgress.mockClear();
  });

  // ==========================================================================
  // kiwiAppChat Tests
  // ==========================================================================

  describe('kiwiAppChat', () => {
    it('should call LLM with system prompt from approved prompt', async () => {
      const userMessage = 'I need help with this problem';
      const llmResponse = 'Here is a hint for you...';

      kiwiAppService.getActivePrompt.mockResolvedValue(mockPrompt as any);
      llmService.createChat.mockResolvedValue({
        choices: [{ message: { content: llmResponse } }],
      } as any);

      const result = await tool.kiwiAppChat(
        {
          appSlug: 'codegen',
          promptId: 'hint',
          userMessage,
        },
        mockContext as any,
        createMockRequest() as any,
      );

      expect(kiwiAppService.getActivePrompt).toHaveBeenCalledWith('codegen', 'hint');
      expect(llmService.createChat).toHaveBeenCalledWith(
        [
          { role: 'system', content: mockPrompt.systemPrompt },
          { role: 'user', content: userMessage },
        ],
        mockPrompt.temperature,
        mockPrompt.maxTokens,
      );
      expect(result.content[0].text).toBe(llmResponse);
      expect(result.isError).toBeUndefined();
    });

    it('should include image when provided', async () => {
      const userMessage = 'What is this code doing?';
      const imageData = 'data:image/png;base64,iVBORw0KGgo...';

      kiwiAppService.getActivePrompt.mockResolvedValue(mockPrompt as any);
      llmService.createChat.mockResolvedValue({
        choices: [{ message: { content: 'The code shows...' } }],
      } as any);

      await tool.kiwiAppChat(
        {
          appSlug: 'codegen',
          promptId: 'hint',
          userMessage,
          image: imageData,
        },
        mockContext as any,
        createMockRequest() as any,
      );

      expect(llmService.createChat).toHaveBeenCalledWith(
        [
          { role: 'system', content: mockPrompt.systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userMessage },
              { type: 'image_url', image_url: { url: imageData } },
            ],
          },
        ],
        mockPrompt.temperature,
        mockPrompt.maxTokens,
      );
    });

    it('should return LLM response content', async () => {
      const expectedResponse = 'This is the AI response';

      kiwiAppService.getActivePrompt.mockResolvedValue(mockPrompt as any);
      llmService.createChat.mockResolvedValue({
        choices: [{ message: { content: expectedResponse } }],
      } as any);

      const result = await tool.kiwiAppChat(
        {
          appSlug: 'codegen',
          promptId: 'hint',
          userMessage: 'Help me',
        },
        mockContext as any,
        createMockRequest() as any,
      );

      expect(result.content[0].text).toBe(expectedResponse);
      expect(result.metadata).toEqual({
        appSlug: 'codegen',
        promptId: 'hint',
        promptName: 'Hint Generator',
      });
    });

    it('should handle empty response from LLM', async () => {
      kiwiAppService.getActivePrompt.mockResolvedValue(mockPrompt as any);
      llmService.createChat.mockResolvedValue({
        choices: [{ message: {} }],
      } as any);

      const result = await tool.kiwiAppChat(
        {
          appSlug: 'codegen',
          promptId: 'hint',
          userMessage: 'Help me',
        },
        mockContext as any,
        createMockRequest() as any,
      );

      expect(result.content[0].text).toBe('No response generated');
    });

    it('should return error when prompt not found (404)', async () => {
      const error = new NotFoundException('App "unknown" or prompt "missing" not found');
      (error as any).status = 404;
      kiwiAppService.getActivePrompt.mockRejectedValue(error);

      const result = await tool.kiwiAppChat(
        {
          appSlug: 'unknown',
          promptId: 'missing',
          userMessage: 'Help me',
        },
        mockContext as any,
        createMockRequest() as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should return error when prompt not active (403)', async () => {
      const error = new ForbiddenException('Prompt is not active');
      (error as any).status = 403;
      kiwiAppService.getActivePrompt.mockRejectedValue(error);

      const result = await tool.kiwiAppChat(
        {
          appSlug: 'codegen',
          promptId: 'inactive-prompt',
          userMessage: 'Help me',
        },
        mockContext as any,
        createMockRequest() as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not active');
    });

    it('should verify appSlug matches app token', async () => {
      const appContext = {
        appSlug: 'other-app',
        classId: 'class-1',
        scopes: ['llm:prompt:hint'],
        userId: 'user-1',
      };

      kiwiAppService.getActivePrompt.mockResolvedValue(mockPrompt as any);

      const result = await tool.kiwiAppChat(
        {
          appSlug: 'codegen', // Different from token's appSlug
          promptId: 'hint',
          userMessage: 'Help me',
        },
        mockContext as any,
        createMockRequest(appContext) as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('other-app');
      expect(result.content[0].text).toContain('codegen');
    });

    it('should check scope for app token requests', async () => {
      const appContext = {
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['other:scope'], // Missing llm:prompt:hint
        userId: 'user-1',
      };

      // Scope check throws ForbiddenException (status 403)
      // The tool's error handler converts all 403s to the "not active" message
      // This verifies that the request fails when scope is missing

      const result = await tool.kiwiAppChat(
        {
          appSlug: 'codegen',
          promptId: 'hint',
          userMessage: 'Help me',
        },
        mockContext as any,
        createMockRequest(appContext) as any,
      );

      expect(result.isError).toBe(true);
      // The 403 status from ForbiddenException triggers the "not active" error message
      expect(result.content[0].text).toContain('not active');
      // Verify getActivePrompt was never called (scope check failed first)
      expect(kiwiAppService.getActivePrompt).not.toHaveBeenCalled();
    });

    it('should pass scope check with wildcard', async () => {
      const appContext = {
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['llm:prompt:*'], // Wildcard scope
        userId: 'user-1',
      };

      kiwiAppService.getActivePrompt.mockResolvedValue(mockPrompt as any);
      llmService.createChat.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
      } as any);

      const result = await tool.kiwiAppChat(
        {
          appSlug: 'codegen',
          promptId: 'hint',
          userMessage: 'Help me',
        },
        mockContext as any,
        createMockRequest(appContext) as any,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Response');
    });

    it('should report progress during execution', async () => {
      kiwiAppService.getActivePrompt.mockResolvedValue(mockPrompt as any);
      llmService.createChat.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
      } as any);

      await tool.kiwiAppChat(
        {
          appSlug: 'codegen',
          promptId: 'hint',
          userMessage: 'Help me',
        },
        mockContext as any,
        createMockRequest() as any,
      );

      expect(mockContext.reportProgress).toHaveBeenCalledWith({
        progress: 10,
        total: 100,
      });
      expect(mockContext.reportProgress).toHaveBeenCalledWith({
        progress: 30,
        total: 100,
      });
      expect(mockContext.reportProgress).toHaveBeenCalledWith({
        progress: 100,
        total: 100,
      });
    });

    it('should handle LLM service errors', async () => {
      kiwiAppService.getActivePrompt.mockResolvedValue(mockPrompt as any);
      llmService.createChat.mockRejectedValue(new Error('LLM service unavailable'));

      const result = await tool.kiwiAppChat(
        {
          appSlug: 'codegen',
          promptId: 'hint',
          userMessage: 'Help me',
        },
        mockContext as any,
        createMockRequest() as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('LLM service unavailable');
    });
  });

  // ==========================================================================
  // listAppPrompts Tests
  // ==========================================================================

  describe('listAppPrompts', () => {
    const mockPrompts = [
      {
        promptId: 'hint',
        name: 'Hint Generator',
        description: 'Generates hints',
      },
      {
        promptId: 'explain',
        name: 'Error Explainer',
        description: 'Explains errors',
      },
    ];

    it('should return list of active prompts', async () => {
      kiwiAppService.getAppPrompts.mockResolvedValue(mockPrompts as any);

      const result = await tool.listAppPrompts(
        { appSlug: 'codegen' },
        mockContext as any,
        createMockRequest() as any,
      );

      const content = JSON.parse(result.content[0].text);
      expect(content.appSlug).toBe('codegen');
      expect(content.totalPrompts).toBe(2);
      expect(content.prompts).toHaveLength(2);
      expect(content.prompts[0].promptId).toBe('hint');
      expect(content.prompts[0].name).toBe('Hint Generator');
    });

    it('should return empty list when no prompts', async () => {
      kiwiAppService.getAppPrompts.mockResolvedValue([]);

      const result = await tool.listAppPrompts(
        { appSlug: 'codegen' },
        mockContext as any,
        createMockRequest() as any,
      );

      const content = JSON.parse(result.content[0].text);
      expect(content.totalPrompts).toBe(0);
      expect(content.prompts).toEqual([]);
    });

    it('should return error when app not found', async () => {
      kiwiAppService.getAppPrompts.mockRejectedValue(
        new NotFoundException('App "unknown" not found'),
      );

      const result = await tool.listAppPrompts(
        { appSlug: 'unknown' },
        mockContext as any,
        createMockRequest() as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should call getAppPrompts with includeInactive=false', async () => {
      kiwiAppService.getAppPrompts.mockResolvedValue(mockPrompts as any);

      await tool.listAppPrompts(
        { appSlug: 'codegen' },
        mockContext as any,
        createMockRequest() as any,
      );

      expect(kiwiAppService.getAppPrompts).toHaveBeenCalledWith('codegen', false);
    });
  });
});
