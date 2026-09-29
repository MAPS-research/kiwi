import { reportMcpProgress } from '../utils/report-progress';
import { Payload, Ctx } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import {
  Tool,
  McpContext as Context,
  McpController,
  McpRawRequest,
} from '@rekog/mcp-nest';
import { z } from 'zod';
import { Request } from 'express';
import { ChatService } from 'src/common/chat/chat.service';

/**
 * MCP Tools for Chat Operations
 * Allows AI assistants to interact with the chat system
 */
@McpController()
export class ChatTool {
  private readonly logger = new Logger(ChatTool.name);

  constructor(private readonly chatService: ChatService) {}

  /**
   * Send a message to the AI chat system (non-streaming)
   * Returns the complete response
   */
  @Tool({
    name: 'chat',
    description:
      'Send a message to the AI chat system and get a complete response',
    parameters: z.object({
      input: z
        .string()
        .describe('The message to send to the AI')
        .nonempty('Input is required'),
      image: z
        .string()
        .optional()
        .describe('Optional base64-encoded image data URL'),
    }),
    annotations: {
      title: 'Chat (Non-Streaming)',
      destructiveHint: false,
      readOnlyHint: false,
      idempotentHint: false,
    },
  })
  async chat(
    @Payload() { input, image }: { input: string; image?: string },
    @Ctx() context: Context,
    @McpRawRequest() _request: Request,
  ) {
    try {
      this.logger.debug('Chat tool called with input:', input);

      await reportMcpProgress(context, { progress: 30, total: 100 });

      const response = await this.chatService.createChat(input, image);

      await reportMcpProgress(context, { progress: 100, total: 100 });

      const content =
        response.choices[0]?.message?.content || 'No response generated';

      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error in chat tool:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Send a message to the AI chat system with streaming support
   * Returns responses as they are generated
   *
   * Note: Streaming in MCP works by returning a standard response
   * The actual streaming happens via SSE transport which is handled
   * by the @rekog/mcp-nest library automatically
   */
  @Tool({
    name: 'chat_stream',
    description:
      'Send a message to the AI chat system and receive streaming responses',
    parameters: z.object({
      input: z
        .string()
        .describe('The message to send to the AI')
        .nonempty('Input is required'),
      image: z
        .string()
        .optional()
        .describe('Optional base64-encoded image data URL'),
    }),
    annotations: {
      title: 'Chat (Streaming)',
      destructiveHint: false,
      readOnlyHint: false,
      idempotentHint: false,
    },
  })
  async chatStream(
    @Payload() { input, image }: { input: string; image?: string },
    @Ctx() context: Context,
    @McpRawRequest() _request: Request,
  ) {
    try {
      this.logger.debug('Chat stream tool called with input:', input);

      await reportMcpProgress(context, { progress: 10, total: 100 });

      // Get the streaming observable
      const chatObservable = await this.chatService.createChatStream(
        input,
        image,
      );

      let fullContent = '';
      let chunkCount = 0;

      await reportMcpProgress(context, { progress: 30, total: 100 });

      // Subscribe to the observable and collect chunks
      await new Promise<void>((resolve, reject) => {
        chatObservable.subscribe({
          next: (chunk) => {
            chunkCount++;
            const delta = chunk.data.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
            }

            // Report progress periodically
            if (chunkCount % 10 === 0) {
              void reportMcpProgress(context, {
                progress: Math.min(30 + chunkCount / 2, 90),
                total: 100,
              });
            }
          },
          error: (err) => {
            this.logger.error('Error in chat stream:', err);
            reject(err);
          },
          complete: () => {
            this.logger.debug('Chat stream completed');
            resolve();
          },
        });
      });

      await reportMcpProgress(context, { progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: fullContent || 'No response generated',
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error in chat stream tool:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
