import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AnalyticsAccessGuard, JwtAuthGuard } from 'src/auth/auth.guard';
import { ClassAnalyticsService } from './class-analytics.service';
import {
  ChatAnswerResponseDto,
  ChatGroupsResponseDto,
  ChatListResponseDto,
  ClassOverviewResponseDto,
  IntentQuestionsResponseDto,
  TopicQuestionsResponseDto,
  TopicsRefreshResponseDto,
  TopicsResponseDto,
  TopicsStatusResponseDto,
} from './dto/class-analytics.dto';

type AnalyticsRequest = Request & { analyticsClassIds?: string[] | null };

@Controller('analytics/class')
@UseGuards(JwtAuthGuard, AnalyticsAccessGuard)
@ApiBearerAuth('bearerAuth')
export class ClassAnalyticsController {
  private readonly logger = new Logger(ClassAnalyticsController.name);

  constructor(private readonly classAnalyticsService: ClassAnalyticsService) {}

  /** AnalyticsAccessGuard resolves accessible class IDs (null = admin). */
  private assertClassAccess(req: AnalyticsRequest, classId: string) {
    const allowed = req.analyticsClassIds ?? null;
    if (Array.isArray(allowed) && !allowed.includes(classId)) {
      throw new ForbiddenException(
        'You do not have access to analytics for this class',
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @Get(':classId/overview')
  @ApiResponse({ status: 200, type: ClassOverviewResponseDto })
  async getOverview(
    @Param('classId') classId: string,
    @Req() req: AnalyticsRequest,
  ) {
    this.assertClassAccess(req, classId);
    return this.classAnalyticsService.getOverview(classId);
  }

  @HttpCode(HttpStatus.OK)
  @Get(':classId/chat-groups')
  @ApiResponse({ status: 200, type: ChatGroupsResponseDto })
  async getChatGroups(
    @Param('classId') classId: string,
    @Query('by') by: string,
    @Query('lectureId') lectureId: string | undefined,
    @Req() req: AnalyticsRequest,
  ) {
    this.assertClassAccess(req, classId);
    const groupBy = by === 'page' ? 'page' : 'student';
    return this.classAnalyticsService.getChatGroups(
      classId,
      groupBy,
      lectureId || undefined,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':classId/chats')
  @ApiResponse({ status: 200, type: ChatListResponseDto })
  async getChats(
    @Param('classId') classId: string,
    @Req() req: AnalyticsRequest,
    @Query('lectureId') lectureId?: string,
    @Query('studentKey') studentKey?: string,
    @Query('pdfPage') pdfPage?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
    @Query('order') order?: string,
  ) {
    this.assertClassAccess(req, classId);
    return this.classAnalyticsService.getChats(classId, {
      lectureId: lectureId || undefined,
      studentKey: studentKey || undefined,
      pdfPage:
        pdfPage !== undefined && pdfPage !== '' ? Number(pdfPage) : undefined,
      offset: offset ? Number(offset) : undefined,
      limit: limit ? Number(limit) : undefined,
      order: order === 'asc' ? 'asc' : 'desc',
    });
  }

  @HttpCode(HttpStatus.OK)
  @Get(':classId/chats/:interactionId/answer')
  @ApiResponse({ status: 200, type: ChatAnswerResponseDto })
  async getChatAnswer(
    @Param('classId') classId: string,
    @Param('interactionId') interactionId: string,
    @Req() req: AnalyticsRequest,
  ) {
    this.assertClassAccess(req, classId);
    return this.classAnalyticsService.getChatAnswer(classId, interactionId);
  }

  @HttpCode(HttpStatus.OK)
  @Get(':classId/topics')
  @ApiResponse({ status: 200, type: TopicsResponseDto })
  async getTopics(
    @Param('classId') classId: string,
    @Req() req: AnalyticsRequest,
    @Query('lectureId') lectureId?: string,
  ) {
    this.assertClassAccess(req, classId);
    return this.classAnalyticsService.getTopics(
      classId,
      lectureId || undefined,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':classId/topics/status')
  @ApiResponse({ status: 200, type: TopicsStatusResponseDto })
  async getTopicsStatus(
    @Param('classId') classId: string,
    @Req() req: AnalyticsRequest,
  ) {
    this.assertClassAccess(req, classId);
    return this.classAnalyticsService.getTopicsStatus(classId);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':classId/topics/refresh')
  @ApiResponse({ status: 200, type: TopicsRefreshResponseDto })
  async refreshTopics(
    @Param('classId') classId: string,
    @Req() req: AnalyticsRequest,
  ) {
    this.assertClassAccess(req, classId);
    this.logger.log(`Manual topics refresh requested for class ${classId}`);
    return this.classAnalyticsService.forceRefreshTopics(classId);
  }

  @HttpCode(HttpStatus.OK)
  @Get(':classId/topics/:topicId/questions')
  @ApiResponse({ status: 200, type: TopicQuestionsResponseDto })
  async getTopicQuestions(
    @Param('classId') classId: string,
    @Param('topicId') topicId: string,
    @Req() req: AnalyticsRequest,
    @Query('lectureId') lectureId?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertClassAccess(req, classId);
    return this.classAnalyticsService.getTopicQuestions(
      classId,
      topicId,
      lectureId || undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':classId/intents/:intentId/questions')
  @ApiResponse({ status: 200, type: IntentQuestionsResponseDto })
  async getIntentQuestions(
    @Param('classId') classId: string,
    @Param('intentId') intentId: string,
    @Req() req: AnalyticsRequest,
    @Query('lectureId') lectureId?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertClassAccess(req, classId);
    return this.classAnalyticsService.getIntentQuestions(
      classId,
      intentId,
      lectureId || undefined,
      limit ? Number(limit) : undefined,
    );
  }
}
