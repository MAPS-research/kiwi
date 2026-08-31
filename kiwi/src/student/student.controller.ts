import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Session,
  Sse,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  InstructorClassGuard,
  InstructorRoleGuard,
  JwtAuthGuard,
} from 'src/auth/auth.guard';
import { TokenLimitGuard } from 'src/common/llm/llm.token-usage.guard';
import { StorageService } from '../common/storage/storage.service';
import {
  StudentChatRequest,
  StudentChatResponse,
  UnifiedChatRequest,
  UnifiedChatResponse,
} from './dto/student-chat-request.dto';
import {
  ClassInfoListResponse,
  StudentEnrollmentsResponse,
} from './dto/student-enrollments-request.dto';
import {
  GetKeywordsRequest,
  GetKeywordsResponse,
  KeywordStatusResponse,
  RefreshKeywordsRequest,
  RefreshKeywordsResponse,
} from './dto/student-keyword-request.dto';
import {
  ChatHistoryQueryDto,
  ChatHistoryResponseDto,
} from './dto/chat-history.dto';
import { ContextPreviewResponse } from './dto/context-preview.dto';
import {
  StudentSummaryRequest,
  StudentSummaryResponse,
} from './dto/student-summary-request.dto';
import { StudentService } from './student.service';

@Controller('student')
export class StudentController {
  private readonly logger = new Logger(StudentController.name);

  constructor(
    private readonly studentService: StudentService,
    private readonly storageService: StorageService,
  ) { }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('enrollments')
  @ApiResponse({
    status: 200,
    description: 'Get list of classes the student is enrolled in',
    type: StudentEnrollmentsResponse,
  })
  async getEnrolledClasses(@Session() session: { userId: string }) {
    this.logger.debug('Fetching enrolled classes for student', session.userId);
    const enrollments = await this.studentService.getEnrollments(
      session.userId,
    );
    return {
      enrollments,
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('classesInfo')
  @ApiResponse({
    status: 200,
    description: 'Get info of the list of classes the student is enrolled in',
    type: ClassInfoListResponse,
  })
  async getEnrolledClassesInfoByStudentId(
    @Session() session: { userId: string },
  ) {
    this.logger.debug(
      'Fetching enrolled classes info for student',
      session.userId,
    );
    const classInfoListRaw = await this.studentService.getEnrolledClassesInfo(
      session.userId,
    );

    // used for type guard
    type ClassMetadata = {
      className?: string;
      professorName?: string;
      professorEmail?: string;
      description?: string;
      imageSnippetUrl?: string;
    };

    const classInfoList = await Promise.all(
      classInfoListRaw.map(async (classInfo) => {
        const classMetadata = classInfo.classMetadata as ClassMetadata; // Cast to custom type

        if (classMetadata.imageSnippetUrl) {
          const signedUrl = await this.storageService.generateSignedUrl(
            classMetadata.imageSnippetUrl,
          );
          classMetadata.imageSnippetUrl = signedUrl;
        } else {
          classMetadata.imageSnippetUrl = undefined;
        }

        return {
          id: classInfo.id,
          className: classMetadata.className,
          professorName: classMetadata.professorName,
          professorEmail: classMetadata.professorEmail,
          description: classMetadata.description,
          imageSnippetUrl: classMetadata.imageSnippetUrl,
        };
      }),
    );
    return {
      classInfoList,
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('chat-history')
  @ApiOperation({
    summary: 'Get paginated chat history for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of chat messages',
    type: ChatHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getChatHistory(
    @Session() session: { userId: string },
    @Query() query: ChatHistoryQueryDto,
  ): Promise<ChatHistoryResponseDto> {
    this.logger.debug('Fetching chat history for user', session.userId);
    return await this.studentService.getChatHistory(session.userId, {
      page: query.page,
      limit: query.limit,
      interactionType: query.interactionType,
      conversationId: query.conversationId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseGuards(TokenLimitGuard)
  // FeatureFlagGuardQwenModel removed: summary is an internal helper called on
  // every message (including app-wide agent/navigation turns without a class
  // context). Gating it by the per-class Qwen flag 403'd those requests. Auth +
  // token limit still apply; the model used is the same engineChoice as chat.
  @ApiBearerAuth('bearerAuth')
  @Post('summary')
  @ApiBody({
    type: StudentSummaryRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: StudentSummaryResponse,
  })
  async summary(
    @Body() studentSummaryRequest: StudentSummaryRequest,
    @Session() session: { userSessionId: string },
  ) {
    const { conversation, engineChoice } = studentSummaryRequest;

    const { userSessionId: sessionId } = session;

    this.logger.debug('Getting summary for student conversation', conversation);

    return await this.studentService.summary(
      conversation,
      sessionId,
      engineChoice,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('beacon')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
  })
  async beacon(
    @Session() session: { userId: string; userSessionId: string },
  ) {
    // this.logger.debug('Beacon session', JSON.stringify(session, null, 2));

    const { userId, userSessionId } = session;

    this.logger.log('Session ended for', userSessionId);

    await this.studentService.beacon(userSessionId, userId);
  }

  /**
   * @deprecated Use /chat/v2 instead. This endpoint will be removed in a future version.
   */
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseGuards(TokenLimitGuard)
  // FeatureFlagGuardQwenModel removed: the Qwen engine is available to everyone,
  // no per-class feature flag required.
  @ApiBearerAuth('bearerAuth')
  @Post('chat')
  @ApiOperation({
    deprecated: true,
    summary: 'Chat with Kiwi (DEPRECATED)',
    description: 'This endpoint is deprecated. Use /chat/v2 instead for improved tool calling, environment awareness, and navigation support.',
  })
  @ApiExtraModels(StudentChatResponse)
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    content: {
      'text/event-stream': {
        schema: {
          $ref: getSchemaPath(StudentChatResponse),
        },
      },
    },
  })
  @Sse()
  async chat(
    @Session()
    session: {
      userId: string;
      userSessionId: string;
      classId?: string;
    },
    @Body() studentChatRequest: StudentChatRequest,
  ) {
    this.logger.debug(
      'Creating chat for student',
      JSON.stringify(studentChatRequest, null, 2),
    );

    const {
      prompt,
      chatSummary,
      type,
      studentContext,
      codegenContext,
      engineChoice,
    } = studentChatRequest;

    return await this.studentService.chat(
      prompt,
      chatSummary,
      type,
      studentContext,
      codegenContext,
      session,
      engineChoice,
    );
  }

  /**
   * Unified chat endpoint (v2)
   *
   * This endpoint replaces the legacy /chat endpoint with:
   * - Environment context awareness (knows which tab user is on)
   * - Improved tool calling with explicit guidance
   * - Navigation capability via navigate tool
   * - Unified handling for both PDF and codegen flows
   */
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseGuards(TokenLimitGuard)
  // FeatureFlagGuardQwenModel removed: it required a class/PDF context on every
  // request and 400'd classless agent/navigation requests. The chat agent must
  // work app-wide (e.g. "take me to admin"), so the Qwen gate is not enforced here.
  @ApiBearerAuth('bearerAuth')
  @Post('chat/v2')
  @ApiExtraModels(UnifiedChatResponse)
  @ApiBody({
    type: UnifiedChatRequest,
    description: 'Unified chat request with environment context',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with optional navigation action',
    content: {
      'text/event-stream': {
        schema: {
          $ref: getSchemaPath(UnifiedChatResponse),
        },
      },
    },
  })
  @Sse()
  async unifiedChat(
    @Session()
    session: {
      userId: string;
      userSessionId: string;
      classId?: string;
    },
    @Body() request: UnifiedChatRequest,
  ) {
    this.logger.debug(
      'Creating unified chat for student',
      JSON.stringify(request, null, 2),
    );

    return await this.studentService.unifiedChat(request, session);
  }

  /**
   * The signed-in student's chat threads, most recently active first.
   *
   * Distinct from `GET /student/chat-history`, which returns *messages* and has
   * to materialise every matching interaction before it can paginate. This reads
   * threads directly, so it stays flat as a student's history grows.
   *
   * Only threads started since the conversation model landed appear here; older
   * ones remain reachable through chat history.
   */
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('conversations')
  @ApiOperation({ summary: "List the student's chat threads" })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Threads, most recent first' })
  async listConversations(
    @Session() session: { userId: string },
    @Query('classId') classId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.studentService.listConversations(session.userId, {
      classId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /**
   * Show what the unified chat would send to the model, without sending it.
   *
   * Takes the same body as `/chat/v2` and runs the identical assembly (same
   * system prompt, same retrieval, same tool list), then returns the block
   * layout instead of a response: per-block sizes and tiers, the tool order,
   * and a fingerprint of the cacheable prefix.
   *
   * Two turns of one conversation should share a `prefixHash`. When they don't,
   * the provider's prompt cache missed, and the per-block hashes say which block
   * moved. Staff-only: the layout reveals class system prompts and retrieval
   * behaviour. Raw block text is admin-only on top of that.
   */
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorRoleGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('chat/context-preview')
  @ApiOperation({
    summary: 'Preview the assembled chat context without calling the model',
  })
  @ApiBody({
    type: UnifiedChatRequest,
    description: 'Same body as POST /student/chat/v2',
  })
  @ApiResponse({
    status: 200,
    description: 'Assembled context blocks, tool order and prefix fingerprint',
    type: ContextPreviewResponse,
  })
  async previewChatContext(
    @Session()
    session: {
      userId: string;
      userSessionId: string;
      classId?: string;
    },
    @Body() request: UnifiedChatRequest,
    @Query('includeContent') includeContent?: string,
  ): Promise<ContextPreviewResponse> {
    return await this.studentService.previewUnifiedContext(
      request,
      session,
      includeContent === 'true',
    );
  }

  // === Keyword API Endpoints ===

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @UseGuards(TokenLimitGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('keywords/refresh')
  @ApiBody({
    type: RefreshKeywordsRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Keywords refresh started successfully',
    type: RefreshKeywordsResponse,
  })
  async refreshKeywords(
    @Body() refreshKeywordsRequest: RefreshKeywordsRequest,
    @Session() session: { userId: string },
  ) {
    this.logger.debug('Refreshing keywords for lecture', refreshKeywordsRequest);

    const { lectureId, classId, force } = refreshKeywordsRequest;

    return await this.studentService.refreshKeywords(
      lectureId,
      classId,
      force || false,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('keywords/get')
  @ApiBody({
    type: GetKeywordsRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Keywords retrieved successfully',
    type: GetKeywordsResponse,
  })
  async getKeywords(
    @Body() getKeywordsRequest: GetKeywordsRequest,
    @Session() session: { userId: string },
  ) {
    this.logger.debug('Getting keywords for lecture', getKeywordsRequest);

    const { lectureId, classId } = getKeywordsRequest;

    return await this.studentService.getKeywords(lectureId, classId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, InstructorClassGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('keywords/status')
  @ApiBody({
    type: GetKeywordsRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Keyword status retrieved successfully',
    type: KeywordStatusResponse,
  })
  async getKeywordStatus(
    @Body() getKeywordsRequest: GetKeywordsRequest,
    @Session() session: { userId: string },
  ) {
    this.logger.debug('Getting keyword status for lecture', getKeywordsRequest);

    const { lectureId, classId } = getKeywordsRequest;

    return await this.studentService.getKeywordStatus(lectureId, classId);
  }
}
