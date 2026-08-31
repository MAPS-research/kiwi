import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  ForbiddenException,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { KiwiAppService } from './kiwi-app.service';
import { AppChunksService } from './app-chunks.service';
import { AppContextualChatService } from './app-contextual-chat.service';
import { BridgeOp } from './utils/bridge-op.decorator';
import {
  DocumentChunksQueryDto,
  ClassDocumentChunksResponseDto,
  ContextualChatRequestDto,
  ContextualChatResponseDto,
} from './dto';
import {
  requireScope,
  isAppTokenRequest,
  getAppContext,
} from 'src/mcp/utils/scope-check';

/**
 * App API — the REST surface external Kiwi Apps use to read class content and
 * run host-mediated LLM requests (issues #218, #217). Apps authenticate with a
 * Bearer app token (the global guard attaches `request.appContext`); scopes are
 * enforced with the same `requireScope` util the MCP tools use. No MCP client,
 * session, or handshake required — one HTTP call each.
 */
@ApiTags('kiwi-apps')
@Controller('api/kiwi-apps')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    transformOptions: { enableImplicitConversion: false },
  }),
)
export class AppDataController {
  constructor(
    private readonly kiwiAppService: KiwiAppService,
    private readonly appChunksService: AppChunksService,
    private readonly appContextualChatService: AppContextualChatService,
  ) {}

  // =========================================================================
  // #218 — parsed document chunks for a class
  // =========================================================================
  @Get('classes/:classId/document-chunks')
  @ApiBearerAuth('bearerAuth')
  @BridgeOp({
    op: 'documentChunks',
    requiredScopes: ['class:materials:chunks:read'],
    injectedParams: { classId: 'classId' },
    timeoutMs: 30_000,
  })
  @ApiOperation({
    summary: 'Get parsed document text chunks for a class',
    description:
      'App token requires the "class:materials:chunks:read" scope and can only ' +
      'read the class the token was issued for. Class members (user JWT with a ' +
      'session) may also call it for their own classes. Image/table chunks return ' +
      'only their text description. Deterministic order; page with nextCursor.',
  })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 200, type: ClassDocumentChunksResponseDto })
  async getDocumentChunks(
    @Param('classId') classId: string,
    @Query() query: DocumentChunksQueryDto,
    @Req() req: Request,
  ): Promise<ClassDocumentChunksResponseDto> {
    let userId: string | undefined;

    if (isAppTokenRequest(req)) {
      requireScope(req, 'class:materials:chunks:read');
      const appContext = getAppContext(req)!;
      if (appContext.classId !== classId) {
        throw new ForbiddenException(
          appContext.classId
            ? `App token is scoped to class "${appContext.classId}" but request is for class "${classId}"`
            : 'This app token has no class scope (classless admin token) and cannot be used for class-scoped requests.',
        );
      }
      userId = appContext.userId;
    } else {
      userId = (req as any).user?.sub;
      if (!userId) {
        throw new UnauthorizedException();
      }
      const { role } = await this.kiwiAppService.getUserClassRole(
        userId,
        classId,
      );
      if (!role) {
        throw new ForbiddenException('You do not have access to this class');
      }
    }

    const result = await this.appChunksService.getClassDocumentChunks({
      classId,
      documentIds: query.documentIds,
      cursor: query.cursor,
      limit: query.limit,
    });

    const appContext = getAppContext(req);
    if (appContext) {
      await this.kiwiAppService.logAuditEvent(
        'chunks_read',
        appContext.appSlug,
        userId,
        classId,
        {
          requestedDocumentIds: query.documentIds?.length ?? 0,
          returnedDocuments: result.documents.length,
          returnedChunks: result.documents.reduce(
            (n, d) => n + d.chunks.length,
            0,
          ),
          hasMore: result.hasMore,
        },
        req,
      );
    }

    return result;
  }

  // =========================================================================
  // #217 — host-mediated contextual LLM
  // =========================================================================
  @Post(':slug/contextual-chat')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @BridgeOp({
    op: 'contextualChat',
    requiredScopes: ['context:student_learning:read'],
    dynamicScopes: ['llm:prompt:{promptId}'],
    injectedParams: { slug: 'appSlug' },
    appTokenOnly: true,
    timeoutMs: 120_000,
  })
  @ApiOperation({
    summary: 'Run an approved prompt over the student\'s private learning context',
    description:
      'App-token only — the target student and class come from the token. Requires ' +
      'both the "llm:prompt:<promptId>" and "context:student_learning:read" scopes. ' +
      'Kiwi assembles the private context server-side and returns only the model ' +
      'output; personal recent_questions are dropped for non-consented students ' +
      '(reported in contextOmitted).',
  })
  @ApiParam({ name: 'slug', description: 'App slug (must match the app token)' })
  @ApiResponse({ status: 200, type: ContextualChatResponseDto })
  async contextualChat(
    @Param('slug') slug: string,
    @Body() dto: ContextualChatRequestDto,
    @Req() req: Request,
  ): Promise<ContextualChatResponseDto> {
    // Host-mediated by design: only app tokens are accepted, and the target
    // student/class come exclusively from the token.
    if (!isAppTokenRequest(req)) {
      throw new ForbiddenException(
        'This endpoint requires an app-scoped token (POST /api/kiwi-apps/:slug/token)',
      );
    }
    requireScope(req, `llm:prompt:${dto.promptId}`);
    requireScope(req, 'context:student_learning:read');

    const appContext = getAppContext(req)!;
    if (appContext.appSlug !== slug) {
      throw new ForbiddenException(
        `App token is for "${appContext.appSlug}" but request is for "${slug}"`,
      );
    }
    // Contextual chat is inherently class-scoped (it retrieves that class's
    // materials and learning context), so a classless admin token cannot use it.
    if (!appContext.classId) {
      throw new ForbiddenException(
        'This app token has no class scope (classless admin token) and cannot be used for contextual chat.',
      );
    }

    return this.appContextualChatService.run({
      appSlug: slug,
      promptId: dto.promptId,
      userMessage: dto.userMessage,
      contextRequest: {
        kind: dto.contextRequest.kind,
        scope: dto.contextRequest.scope,
        timeWindowDays: dto.contextRequest.timeWindowDays ?? 14,
        include: dto.contextRequest.include,
        retrievalQuery: dto.contextRequest.retrievalQuery,
      },
      outputSchema: dto.outputSchema,
      userId: appContext.userId,
      classId: appContext.classId,
      request: req,
    });
  }
}
