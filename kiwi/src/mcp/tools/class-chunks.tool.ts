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
import { AppChunksService } from 'src/kiwi-app/app-chunks.service';
import { KiwiAppService } from 'src/kiwi-app/kiwi-app.service';
import {
  requireScope,
  isAppTokenRequest,
  getAppContext,
} from '../utils/scope-check';

/**
 * MCP Tool for reading parsed document text chunks (issue #218).
 *
 * Lets an authorized external Kiwi App (or a class member with a user JWT)
 * retrieve the text chunks Kiwi already stores for class documents, so apps
 * like podcast/flashcard generators can build class-tailored content without
 * re-parsing the source files.
 *
 * App tokens require the explicit `class:materials:chunks:read` scope and can
 * only read the class their token was minted for.
 */
@McpController()
export class ClassChunksTool {
  private readonly logger = new Logger(ClassChunksTool.name);

  constructor(
    private readonly appChunksService: AppChunksService,
    private readonly kiwiAppService: KiwiAppService,
  ) {}

  @Tool({
    name: 'get_class_document_chunks',
    description:
      'Retrieve the parsed text chunks of class documents (lecture slides, readings). ' +
      'Returns chunk text with page numbers in deterministic order (documents by id, ' +
      'chunks by position), paginated via an opaque cursor. Image/table chunks return ' +
      'their text description, never raw image data. ' +
      'App tokens require the "class:materials:chunks:read" scope and can only read ' +
      'the class the token was issued for.',
    parameters: z.object({
      classId: z
        .string()
        .nonempty('Class ID is required')
        .describe('The class whose document chunks to read'),
      documentIds: z
        .array(z.string())
        .max(50)
        .optional()
        .describe(
          'Restrict to these document IDs (default: all available class documents)',
        ),
      cursor: z
        .string()
        .max(500)
        .optional()
        .describe('Opaque cursor from a previous response (nextCursor)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum chunks per page across documents (default 50)'),
    }),
    annotations: {
      title: 'Get Class Document Chunks',
      destructiveHint: false,
      readOnlyHint: true,
      idempotentHint: true,
    },
  })
  async getClassDocumentChunks(
    @Payload()
    {
      classId,
      documentIds,
      cursor,
      limit,
    }: {
      classId: string;
      documentIds?: string[];
      cursor?: string;
      limit?: number;
    },
    @Ctx() context: Context,
    @McpRawRequest() request: Request,
  ) {
    try {
      let userId: string | undefined;

      if (isAppTokenRequest(request)) {
        requireScope(request, 'class:materials:chunks:read');

        const appContext = getAppContext(request);
        if (appContext && appContext.classId !== classId) {
          throw new Error(
            `App token is scoped to class "${appContext.classId}" but request is for class "${classId}"`,
          );
        }
        userId = appContext?.userId;
      } else {
        userId = (request as any).user?.sub;
        if (!userId) {
          throw new Error('Not authenticated');
        }
        const { role } = await this.kiwiAppService.getUserClassRole(
          userId,
          classId,
        );
        if (!role) {
          throw new Error('You do not have access to this class');
        }
      }

      const result = await this.appChunksService.getClassDocumentChunks({
        classId,
        documentIds,
        cursor,
        limit,
      });

      const appContext = getAppContext(request);
      if (appContext) {
        await this.kiwiAppService.logAuditEvent(
          'mcp_call',
          appContext.appSlug,
          userId,
          classId,
          {
            tool: 'get_class_document_chunks',
            requestedDocumentIds: documentIds?.length ?? 0,
            returnedDocuments: result.documents.length,
            returnedChunks: result.documents.reduce(
              (n, d) => n + d.chunks.length,
              0,
            ),
            hasMore: result.hasMore,
          },
          request,
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error in get_class_document_chunks:', error);
      // A non-Error throw must not make this handler throw and mask the
      // original failure.
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
