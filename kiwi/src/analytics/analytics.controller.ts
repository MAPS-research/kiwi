import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Get,
  Req,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { DatabaseService } from 'src/common/database/database.service';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  AnalyticsAdminGuard,
  AnalyticsAccessGuard,
} from 'src/auth/auth.guard';
import {
  PresentResponse,
  PresentSessionRequest,
  PresentUserRequest,
  DateFilterRequest,
} from './dto/present-requests.dto';
import {
  ConversationLlmUsageResponse,
  LlmUsageRequest,
  TopTokenUsersResponse,
  UserLlmUsageResponse,
  UserTokenUsageRequest,
  UserTokenUsageResponse,
} from './dto/analytics-response.dto';
import { createReadStream } from 'fs';

@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly database: DatabaseService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AnalyticsAdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('all')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: StreamableFile,
  })
  async presentAllInteractions() {
    this.logger.log('Presenting all Interactions');
    const { interactionsFileName } =
      await this.analyticsService.presentAllInteractions();
    const file = createReadStream(interactionsFileName);

    return new StreamableFile(file, {
      type: 'application/json',
      disposition: 'attachment; filename="interactions.json"',
    });
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AnalyticsAdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('user')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: PresentResponse,
  })
  presentUserInteractions(@Body() presentUserRequest: PresentUserRequest) {
    this.logger.log('Presenting all Interactions');
    return this.analyticsService.presentUserInteractions(
      presentUserRequest.userId,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AnalyticsAdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('session')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: PresentResponse,
  })
  presentSessionInteractions(
    @Body() presentSessionRequest: PresentSessionRequest,
  ) {
    this.logger.log('Presenting all Interactions');
    return this.analyticsService.presentSessionInteractions(
      presentSessionRequest.sessionId,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AnalyticsAccessGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('DateFiltered')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: StreamableFile,
  })
  async presentDateFilteredInteractions(
    @Body() dateFilterRequest: DateFilterRequest,
    @Req() req: Request & { analyticsClassIds?: string[] | null },
  ) {
    const { startDate, endDate, classId } = dateFilterRequest;
    const allowedClassIds = req.analyticsClassIds ?? null;
    this.logger.log('Presenting filtered Interactions', {
      startDate,
      endDate,
      classId,
      allowedClassIds,
    });
    const { interactionsFileName } =
      await this.analyticsService.presentDateFilteredInteractions(
        startDate,
        endDate,
        classId,
        allowedClassIds,
      );
    const file = createReadStream(interactionsFileName);

    return new StreamableFile(file, {
      type: 'application/json',
      disposition: 'attachment; filename="interactions.json"',
    });
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AnalyticsAdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('top-token-users')
  @ApiResponse({
    status: 200,
    description: 'Top users by tokens used',
    type: TopTokenUsersResponse,
  })
  async getTopTokenUsers(): Promise<TopTokenUsersResponse> {
    const users = await this.analyticsService.topTokenUsers(10);
    return {
      users,
      count: users.length,
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AnalyticsAdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('user-token-usage')
  @ApiResponse({
    status: 200,
    description: 'Token usage details by user',
    type: UserTokenUsageResponse,
  })
  async getUserTokenUsage(
    @Body() body: UserTokenUsageRequest,
  ): Promise<UserTokenUsageResponse> {
    const sessions = await this.analyticsService.userTokenUsageDetails(body.userId);

    // Get user info
    const user = await this.database.user.findUnique({
      where: { id: body.userId },
      select: { id: true, email: true },
    });

    // Calculate total tokens
    const totalTokens = sessions.reduce(
      (sum, s) => sum + (s.tokensUsed || 0),
      0,
    );

    // Transform sessions to match DTO
    const sessionUsages = sessions.map((s: any) => ({
      sessionId: s.id,
      startTime: s.sessionStartTime,
      endTime: s.sessionEndTime,
      tokensUsed: s.tokensUsed || 0,
      interactionCount: Object.values(s.actionSummary || {}).reduce(
        (sum: number, count: any) => sum + (count as number),
        0,
      ) as number,
    }));

    return {
      userId: body.userId,
      email: user?.email || '',
      totalTokens,
      sessions: sessionUsages,
      sessionCount: sessions.length,
    };
  }

  /**
   * Per-user token usage and cost from the agent loop's own records, split into
   * cached vs fresh input. Unlike /top-token-users this is not a single session
   * counter, so it can be priced.
   */
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AnalyticsAdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('llm-usage/by-user')
  @ApiResponse({
    status: 200,
    description: 'Per-user agent-loop token usage, cache hit rate and cost',
    type: UserLlmUsageResponse,
  })
  async getLlmUsageByUser(
    @Body() body: LlmUsageRequest,
  ): Promise<UserLlmUsageResponse> {
    const users = await this.analyticsService.llmUsageByUser(body ?? {});
    return {
      users,
      count: users.length,
      totals: this.analyticsService.totalsFor(users),
    };
  }

  /** Same aggregate, keyed by conversation/thread instead of by user. */
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AnalyticsAdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('llm-usage/by-conversation')
  @ApiResponse({
    status: 200,
    description:
      'Per-conversation agent-loop token usage, cache hit rate and cost',
    type: ConversationLlmUsageResponse,
  })
  async getLlmUsageByConversation(
    @Body() body: LlmUsageRequest,
  ): Promise<ConversationLlmUsageResponse> {
    const conversations = await this.analyticsService.llmUsageByConversation(
      body ?? {},
    );
    return {
      conversations,
      count: conversations.length,
      totals: this.analyticsService.totalsFor(conversations),
    };
  }
}
