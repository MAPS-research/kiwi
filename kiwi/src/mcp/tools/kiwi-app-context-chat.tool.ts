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
import { ContextInclude } from 'src/kiwi-app/app-context.service';
import { AppContextualChatService } from 'src/kiwi-app/app-contextual-chat.service';
import {
  requireScope,
  isAppTokenRequest,
  getAppContext,
} from '../utils/scope-check';

/**
 * MCP Tool for host-mediated contextual LLM requests (issue #217).
 *
 * Generalizes kiwi_app_chat: the app supplies an admin-approved promptId and a
 * high-level contextRequest; Kiwi assembles the private student context
 * server-side (chat history, weak concepts, materials), runs the LLM, and
 * returns ONLY the model output. Raw platform data never reaches the app:
 * - requires an app token — the target userId/classId come from the token,
 *   never from arguments
 * - requires both the prompt scope (llm:prompt:<id>) and the context scope
 *   (context:student_learning:read)
 * - the assembled context is injected as a system message and never echoed
 */
@McpController()
export class KiwiAppContextChatTool {
  private readonly logger = new Logger(KiwiAppContextChatTool.name);

  constructor(
    private readonly appContextualChatService: AppContextualChatService,
  ) {}

  @Tool({
    name: 'kiwi_app_contextual_chat',
    description:
      'Run an approved Kiwi App prompt with platform-held student learning context. ' +
      'Kiwi assembles the context (recent questions, weak concepts, relevant materials) ' +
      'server-side and returns only the LLM output — raw student data is never exposed. ' +
      'Requires an app token with both the "llm:prompt:<promptId>" and ' +
      '"context:student_learning:read" scopes. The target student and class are taken ' +
      'from the app token. Note: weak_concepts is a class-wide aggregate, not ' +
      'per-student data.',
    parameters: z.object({
      appSlug: z
        .string()
        .nonempty('App slug is required')
        .describe('The slug of the Kiwi App making the request'),
      promptId: z
        .string()
        .nonempty('Prompt ID is required')
        .describe('The ID of the pre-approved prompt to use'),
      userMessage: z
        .string()
        .max(8000)
        .optional()
        .describe(
          'Optional task message; defaults to instructing the model to complete the approved prompt using the context',
        ),
      contextRequest: z.object({
        kind: z
          .enum(['student_learning_context'])
          .describe('The kind of platform context to assemble'),
        scope: z
          .enum(['current_user_current_class'])
          .describe(
            'Context scope; the user and class always come from the app token',
          ),
        timeWindowDays: z
          .number()
          .int()
          .min(1)
          .max(90)
          .default(14)
          .describe('How far back to look for interaction data (default 14)'),
        include: z
          .array(
            z.enum(['recent_questions', 'weak_concepts', 'relevant_materials']),
          )
          .nonempty()
          .describe('Which context sections to assemble'),
        retrievalQuery: z
          .string()
          .max(500)
          .optional()
          .describe(
            'Optional query for the relevant_materials retrieval (default: derived from recent questions)',
          ),
      }),
      outputSchema: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Optional JSON Schema (root type "object") the LLM output must conform to',
        ),
    }),
    annotations: {
      title: 'Kiwi App Contextual Chat',
      destructiveHint: false,
      readOnlyHint: false,
      idempotentHint: false,
    },
  })
  async kiwiAppContextualChat(
    @Payload()
    {
      appSlug,
      promptId,
      userMessage,
      contextRequest,
      outputSchema,
    }: {
      appSlug: string;
      promptId: string;
      userMessage?: string;
      contextRequest: {
        kind: 'student_learning_context';
        scope: 'current_user_current_class';
        timeWindowDays: number;
        include: ContextInclude[];
        retrievalQuery?: string;
      };
      outputSchema?: Record<string, any>;
    },
    @Ctx() context: Context,
    @McpRawRequest() request: Request,
  ) {
    try {
      // Host-mediated by design: only app tokens are accepted, and the target
      // student/class come exclusively from the token.
      if (!isAppTokenRequest(request)) {
        throw new Error(
          'This tool requires an app-scoped token (POST /api/kiwi-apps/:slug/token)',
        );
      }
      requireScope(request, `llm:prompt:${promptId}`);
      requireScope(request, 'context:student_learning:read');

      const appContext = getAppContext(request)!;
      if (appContext.appSlug !== appSlug) {
        throw new Error(
          `App token is for "${appContext.appSlug}" but request is for "${appSlug}"`,
        );
      }
      // Contextual chat is class-scoped; a classless admin token has no class
      // whose materials and learning context could be retrieved.
      if (!appContext.classId) {
        throw new Error(
          'This app token has no class scope (classless admin token) and cannot be used for contextual chat.',
        );
      }

      await reportMcpProgress(context, { progress: 20, total: 100 });

      // Shared with the App API REST endpoint. The target userId/classId come
      // from the token; the orchestration + privacy contract live in the service.
      const result = await this.appContextualChatService.run({
        appSlug,
        promptId,
        userMessage,
        contextRequest,
        outputSchema,
        userId: appContext.userId,
        classId: appContext.classId,
        request,
      });

      await reportMcpProgress(context, { progress: 100, total: 100 });

      // Only the LLM output leaves the platform — never the assembled context.
      return {
        content: [
          {
            type: 'text',
            text: result.output,
          },
        ],
        metadata: {
          appSlug,
          promptId,
          promptName: result.promptName,
          contextIncluded: result.contextIncluded,
          contextOmitted: result.contextOmitted,
        },
      };
    } catch (error) {
      this.logger.error('Error in Kiwi App Contextual Chat tool:', error);

      // A non-Error throw (string, null, …) must not make this handler throw
      // and mask the original failure.
      const message = error instanceof Error ? error.message : String(error);
      const status = (error as any)?.status;

      let errorMessage = message;
      if (status === 404) {
        errorMessage = `App "${appSlug}" or prompt "${promptId}" not found. Ensure the app is registered and the prompt exists.`;
      } else if (status === 403) {
        errorMessage = message.includes('scope')
          ? message
          : `Prompt "${promptId}" is not active. An admin must approve the prompt before it can be used.`;
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
}
