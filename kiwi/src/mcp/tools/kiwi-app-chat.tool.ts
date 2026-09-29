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
import { LlmService } from 'src/common/llm/llm.service';
import { KiwiAppService } from 'src/kiwi-app/kiwi-app.service';
import {
  requireScope,
  isAppTokenRequest,
  getAppContext,
} from '../utils/scope-check';
import OpenAI from 'openai';

/**
 * MCP Tool for Kiwi App LLM Chat
 *
 * This tool allows Kiwi Apps to make LLM requests using their pre-approved
 * system prompts. Apps must:
 * 1. Register prompts during app registration
 * 2. Have prompts approved by an admin
 * 3. Use only their own approved prompts
 *
 * This ensures that apps cannot run arbitrary LLM requests with any system prompt.
 */
@McpController()
export class KiwiAppChatTool {
  private readonly logger = new Logger(KiwiAppChatTool.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly kiwiAppService: KiwiAppService,
  ) {}

  /**
   * Send a message using an app's pre-approved prompt
   * The system prompt is fetched from the approved prompt registry
   */
  @Tool({
    name: 'kiwi_app_chat',
    description:
      "Send a message to the AI using a Kiwi App's pre-approved prompt. " +
      'Apps must register prompts during registration and have them approved by an admin. ' +
      'This tool enforces that only approved system prompts can be used.',
    parameters: z.object({
      appSlug: z
        .string()
        .describe('The slug of the Kiwi App making the request')
        .nonempty('App slug is required'),
      promptId: z
        .string()
        .describe(
          'The ID of the pre-approved prompt to use (e.g., "hint", "explain-error")',
        )
        .nonempty('Prompt ID is required'),
      userMessage: z
        .string()
        .describe('The user message to send to the AI')
        .nonempty('User message is required'),
      image: z
        .string()
        .optional()
        .describe('Optional base64-encoded image data URL'),
    }),
    annotations: {
      title: 'Kiwi App Chat',
      destructiveHint: false,
      readOnlyHint: false,
      idempotentHint: false,
    },
  })
  async kiwiAppChat(
    @Payload()
    {
      appSlug,
      promptId,
      userMessage,
      image,
    }: {
      appSlug: string;
      promptId: string;
      userMessage: string;
      image?: string;
    },
    @Ctx() context: Context,
    @McpRawRequest() request: Request,
  ) {
    try {
      this.logger.debug(
        `Kiwi App Chat: app=${appSlug}, prompt=${promptId}, message=${userMessage.substring(0, 100)}...`,
      );

      // Check scope for this specific prompt if using app token
      if (isAppTokenRequest(request)) {
        requireScope(request, `llm:prompt:${promptId}`);

        // Verify the app token matches the requested appSlug
        const appContext = getAppContext(request);
        if (appContext && appContext.appSlug !== appSlug) {
          throw new Error(
            `App token is for "${appContext.appSlug}" but request is for "${appSlug}"`,
          );
        }
      }

      await reportMcpProgress(context, { progress: 10, total: 100 });

      // Get the approved prompt - this throws if not found or not approved
      const prompt = await this.kiwiAppService.getActivePrompt(
        appSlug,
        promptId,
      );

      this.logger.debug(`Using prompt: ${prompt.name} (${prompt.id})`);

      await reportMcpProgress(context, { progress: 30, total: 100 });

      // Build messages array with system prompt and user message
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: prompt.systemPrompt,
        },
      ];

      // Add user message (with optional image)
      if (image) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: userMessage },
            {
              type: 'image_url',
              image_url: { url: image },
            },
          ],
        });
      } else {
        messages.push({
          role: 'user',
          content: userMessage,
        });
      }

      // Call LLM with the prompt settings
      const response = await this.llmService.createChat(
        messages,
        prompt.temperature ?? undefined,
        prompt.maxTokens ?? undefined,
      );

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
        // Include metadata about which prompt was used
        metadata: {
          appSlug,
          promptId,
          promptName: prompt.name,
        },
      };
    } catch (error) {
      this.logger.error('Error in Kiwi App Chat tool:', error);

      // Provide specific error messages for common cases
      let errorMessage = error.message;
      if (error.status === 404) {
        errorMessage = `App "${appSlug}" or prompt "${promptId}" not found. Ensure the app is registered and the prompt exists.`;
      } else if (error.status === 403) {
        errorMessage = `Prompt "${promptId}" is not active. An admin must approve the prompt before it can be used.`;
      }

      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * List available prompts for a Kiwi App
   * Only returns active (approved) prompts
   */
  @Tool({
    name: 'kiwi_app_list_prompts',
    description:
      'List all available (approved) prompts for a Kiwi App. ' +
      'Use this to discover which prompts an app has registered and approved.',
    parameters: z.object({
      appSlug: z
        .string()
        .describe('The slug of the Kiwi App to list prompts for')
        .nonempty('App slug is required'),
    }),
    annotations: {
      title: 'List App Prompts',
      destructiveHint: false,
      readOnlyHint: true,
      idempotentHint: true,
    },
  })
  async listAppPrompts(
    @Payload() { appSlug }: { appSlug: string },
    @Ctx() _context: Context,
    @McpRawRequest() _request: Request,
  ) {
    try {
      this.logger.debug(`Listing prompts for app: ${appSlug}`);

      // Get only active prompts (approved by admin)
      const prompts = await this.kiwiAppService.getAppPrompts(appSlug, false);

      const promptList = prompts.map((p) => ({
        promptId: p.promptId,
        name: p.name,
        description: p.description,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                appSlug,
                totalPrompts: promptList.length,
                prompts: promptList,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error listing app prompts:', error);
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
