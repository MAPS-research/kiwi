import { Test, TestingModule } from '@nestjs/testing';
import { ChatTool } from './chat.tool';
import { ChatService } from 'src/common/chat/chat.service';
import { of, throwError } from 'rxjs';

describe('ChatTool', () => {
  let tool: ChatTool;
  let chatService: jest.Mocked<ChatService>;

  const mockContext = {
    reportProgress: jest.fn(),
  };

  const mockRequest = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatTool,
        {
          provide: ChatService,
          useValue: {
            createChat: jest.fn(),
            createChatStream: jest.fn(),
          },
        },
      ],
    }).compile();

    tool = module.get<ChatTool>(ChatTool);
    chatService = module.get(ChatService);

    mockContext.reportProgress.mockClear();
  });

  describe('chat', () => {
    it('should return AI response for valid input', async () => {
      const input = 'Hello, AI!';
      const aiResponse = 'Hello! How can I help you today?';

      chatService.createChat.mockResolvedValue({
        choices: [
          {
            message: {
              content: aiResponse,
            },
          },
        ],
      } as any);

      const result = await tool.chat(
        { input },
        mockContext as any,
        mockRequest as any,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(aiResponse);
      expect(chatService.createChat).toHaveBeenCalledWith(input, undefined);
      expect(mockContext.reportProgress).toHaveBeenCalledTimes(2);
    });

    it('should include image in chat request', async () => {
      const input = 'Describe this image';
      const image = 'data:image/png;base64,iVBORw0KGgo...';

      chatService.createChat.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'I see a colorful image',
            },
          },
        ],
      } as any);

      await tool.chat({ input, image }, mockContext as any, mockRequest as any);

      expect(chatService.createChat).toHaveBeenCalledWith(input, image);
    });

    it('should handle empty response from AI', async () => {
      chatService.createChat.mockResolvedValue({
        choices: [{ message: {} }],
      } as any);

      const result = await tool.chat(
        { input: 'test' },
        mockContext as any,
        mockRequest as any,
      );

      expect(result.content[0].text).toBe('No response generated');
    });

    it('should handle missing choices in response', async () => {
      chatService.createChat.mockResolvedValue({
        choices: [],
      } as any);

      const result = await tool.chat(
        { input: 'test' },
        mockContext as any,
        mockRequest as any,
      );

      expect(result.content[0].text).toBe('No response generated');
    });

    it('should handle chat service errors', async () => {
      chatService.createChat.mockRejectedValue(
        new Error('Chat service unavailable'),
      );

      const result = await tool.chat(
        { input: 'test' },
        mockContext as any,
        mockRequest as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Chat service unavailable');
    });

    it('should report progress during chat', async () => {
      chatService.createChat.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
      } as any);

      await tool.chat(
        { input: 'test' },
        mockContext as any,
        mockRequest as any,
      );

      expect(mockContext.reportProgress).toHaveBeenCalledWith({
        progress: 30,
        total: 100,
      });
      expect(mockContext.reportProgress).toHaveBeenCalledWith({
        progress: 100,
        total: 100,
      });
    });
  });

  describe('chatStream', () => {
    it('should return complete response from stream', async () => {
      const input = 'Tell me a story';

      // Create mock observable that emits chunks
      const mockObservable = of(
        { data: { choices: [{ delta: { content: 'Once ' } }] } },
        { data: { choices: [{ delta: { content: 'upon ' } }] } },
        { data: { choices: [{ delta: { content: 'a time' } }] } },
      );

      chatService.createChatStream.mockResolvedValue(mockObservable as any);

      const result = await tool.chatStream(
        { input },
        mockContext as any,
        mockRequest as any,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Once upon a time');
      expect(chatService.createChatStream).toHaveBeenCalledWith(
        input,
        undefined,
      );
    });

    it('should include image in stream request', async () => {
      const input = 'What is in this image?';
      const image = 'base64imagedata';

      const mockObservable = of({
        data: { choices: [{ delta: { content: 'A cat' } }] },
      });

      chatService.createChatStream.mockResolvedValue(mockObservable as any);

      await tool.chatStream(
        { input, image },
        mockContext as any,
        mockRequest as any,
      );

      expect(chatService.createChatStream).toHaveBeenCalledWith(input, image);
    });

    it('should handle empty stream response', async () => {
      const mockObservable = of({
        data: { choices: [{ delta: {} }] },
      });

      chatService.createChatStream.mockResolvedValue(mockObservable as any);

      const result = await tool.chatStream(
        { input: 'test' },
        mockContext as any,
        mockRequest as any,
      );

      expect(result.content[0].text).toBe('No response generated');
    });

    it('should handle stream errors', async () => {
      const mockObservable = throwError(() => new Error('Stream interrupted'));

      chatService.createChatStream.mockResolvedValue(mockObservable as any);

      const result = await tool.chatStream(
        { input: 'test' },
        mockContext as any,
        mockRequest as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Stream interrupted');
    });

    it('should handle service errors before stream starts', async () => {
      chatService.createChatStream.mockRejectedValue(
        new Error('Service initialization failed'),
      );

      const result = await tool.chatStream(
        { input: 'test' },
        mockContext as any,
        mockRequest as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Service initialization failed');
    });

    it('should report progress during streaming', async () => {
      const mockObservable = of({
        data: { choices: [{ delta: { content: 'Hello' } }] },
      });

      chatService.createChatStream.mockResolvedValue(mockObservable as any);

      await tool.chatStream(
        { input: 'test' },
        mockContext as any,
        mockRequest as any,
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

    it('should accumulate multiple chunks correctly', async () => {
      const chunks = Array.from({ length: 5 }, (_, i) => ({
        data: { choices: [{ delta: { content: `chunk${i} ` } }] },
      }));

      const mockObservable = of(...chunks);

      chatService.createChatStream.mockResolvedValue(mockObservable as any);

      const result = await tool.chatStream(
        { input: 'test' },
        mockContext as any,
        mockRequest as any,
      );

      expect(result.content[0].text).toBe(
        'chunk0 chunk1 chunk2 chunk3 chunk4 ',
      );
    });

    it('should handle chunks without delta content', async () => {
      const mockObservable = of(
        { data: { choices: [{ delta: { content: 'Start ' } }] } },
        { data: { choices: [{ delta: {} }] } }, // No content
        { data: { choices: [{ delta: { content: 'End' } }] } },
      );

      chatService.createChatStream.mockResolvedValue(mockObservable as any);

      const result = await tool.chatStream(
        { input: 'test' },
        mockContext as any,
        mockRequest as any,
      );

      expect(result.content[0].text).toBe('Start End');
    });
  });
});
