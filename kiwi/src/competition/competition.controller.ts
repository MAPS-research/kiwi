import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Session,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { CompetitionService } from './competition.service';
import { CompetitionService as DatabaseCompetitionService } from '../common/database/competition.service';
import { UserService } from '../common/database/user.service';

import { StorageService } from 'src/common/storage/storage.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiResponse,
} from '@nestjs/swagger';

import {
  CompetitionInfoDto,
  CompetitionGetEntriesDto,
  CompetitionLeaderboardDto,
  CompetitionReplyDto,
  CompetitorEnrollDto,
  GetAllCompetitionsDto,
  CompetitionEntryDto,
  CompetitorInfoDto,
  NumEntriesLeftDto,
} from './dto/competition.dto';
import { AdminGuard } from 'src/auth/auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('competition')
export class CompetitionController {
  private competitionURL: string;

  constructor(
    private readonly competitionService: CompetitionService,
    private readonly databaseCompetitionService: DatabaseCompetitionService,
    private readonly userService: UserService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {
    // Initialize competitionURL from configuration and remove trailing slash if present
    this.competitionURL = this.configService.get<string>(
      'COMPETITION_API_URL',
    )!;
    if (this.competitionURL.endsWith('/')) {
      this.competitionURL = this.competitionURL.slice(0, -1);
    }
  }

  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'model load success',
    type: CompetitionReplyDto,
  })
  @Post('competition/load-model')
  async loadModel(
    @Session() session: Record<string, any>,
    @Query('competitionId') competitionId: string,
  ): Promise<CompetitionReplyDto> {
    if (!session.userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const userId = session.userId;
    const targetUrl = `${this.competitionURL}/initialize_model/`;

    try {
      const result = await this.competitionService.loadModel(
        userId,
        competitionId,
        targetUrl,
      );
      return {
        message: result,
        status: 0,
        metrics: {},
      };
    } catch (error) {
      console.log(error.message);
      throw new HttpException(
        `Failed to load model: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'launched inference',
    type: CompetitionReplyDto,
  })
  @Post('competition/run-inference')
  async runInference(
    @Session() session: Record<string, any>,
    @Query('competitionId') competitionId: string,
  ): Promise<CompetitionReplyDto> {
    if (!session.userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const userId = session.userId;
    const targetUrl = `${this.competitionURL}/run_inference/`;

    // check number of entries left for today
    const competitorId =
      await this.databaseCompetitionService.getCompetitorIdByUserCompetitionId(
        userId,
        competitionId,
      );
    const result = await this.competitionService.getEntriesLeft(competitorId);
    if (result.etnriesLeft <= 0) {
      throw new HttpException(
        'No entries left for today',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // create a new entry in the database
      const entryId =
        await this.databaseCompetitionService.addEntryForCompetitor(
          competitorId,
          {},
          {},
        );

      await this.competitionService.runInference(
        userId,
        entryId,
        competitionId,
        targetUrl,
      );
      return {
        message: 'launched inference',
        status: 0,
        metrics: {},
      };
    } catch (error) {
      throw new HttpException(
        `Failed to run inference: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'Model inference status retrieved successfully',
    type: CompetitionReplyDto,
  })
  @Get('competition/inference_status')
  async getInferenceStatus(
    @Session() session: Record<string, any>,
    @Query('entryId') entryId: string,
  ): Promise<CompetitionReplyDto> {
    if (!session.userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const userId = session.userId;
    const targetUrl = `${this.competitionURL}/inference_status/`;

    try {
      const response = await this.competitionService.getInferenceStatus(
        userId,
        entryId,
        targetUrl,
      );
      return {
        message: 'Model status retrieved successfully',
        status: response.status,
        metrics: {},
      };
    } catch (error) {
      throw new HttpException(
        `Failed to query model status: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // @HttpCode(HttpStatus.OK)
  // @ApiBearerAuth('bearerAuth')
  // @ApiResponse({
  //     status: 200,
  //     description: 'Model inference metrics retrieved successfully',
  //     type: CompetitionReplyDto,
  // })
  // @Get('competition/metrics')
  // async getInferenceMetrics(
  //     @Session() session: Record<string, any>,
  //     @Query('entryId') entryId: string,
  // ): Promise<CompetitionReplyDto> {
  //     if (!session.userId) {
  //     throw new HttpException(
  //         'User not authenticated',
  //         HttpStatus.UNAUTHORIZED,
  //     );
  //     }

  //     const userId = session.userId;
  //     const targetUrl = 'http://localhost:8005/inference_metrics/'; // Replace with your target server URL

  //     try {
  //         const metrics = await this.competitionService.getInferenceMetrics(userId, entryId, targetUrl);
  //         return {
  //             message: 'Model metrics retrieved successfully',
  //             status: 0,
  //             metrics,
  //         };
  //     } catch (error) {
  //         throw new HttpException(
  //             `Failed to retrieve model metrics: ${error.message}`,
  //             HttpStatus.BAD_REQUEST,
  //         );
  //     }
  // }

  /**
   * Create a new competition
   */
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiBody({
    description: 'info of competition',
    type: CompetitionInfoDto,
  })
  @ApiResponse({
    status: 200,
    description: 'competition created',
    type: String,
  })
  @Post('competition/create')
  async createCompetition(
    @Body() competitionInfoDto: CompetitionInfoDto,
    @Session() _session: Record<string, any>,
  ): Promise<string> {
    try {
      const competitionId =
        await this.databaseCompetitionService.createCompetition(
          competitionInfoDto.name,
          competitionInfoDto.dailyLimit,
          competitionInfoDto.description,
          {},
          competitionInfoDto.startDate,
          competitionInfoDto.endDate,
        );
      return competitionId;
    } catch (error) {
      throw new HttpException(
        `Failed to create competition: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Enroll a user into a competition
   */
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiBody({
    description: 'Info of competitor',
    type: CompetitorEnrollDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Competitor enrolled successfully',
    type: String,
  })
  @Post('competition/enroll')
  async enrollCompetitor(
    @Body() competitorEnrollDto: CompetitorEnrollDto,
    @Session() _session: Record<string, any>,
  ): Promise<string> {
    try {
      // get userId for competitorEnrollDto.userEmail
      const user = await this.userService.user({
        email: competitorEnrollDto.userEmail,
      });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // generate a funny name for the competitor
      const name = `Competitor-${Math.floor(Math.random() * 10000)}`;

      const competitor = await this.databaseCompetitionService.enrollCompetitor(
        competitorEnrollDto.competitionId,
        user.id,
        name,
        {},
      );
      return competitor;
    } catch (error) {
      throw new HttpException(
        `Failed to enroll competitor: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the leaderboard of a competition
   */
  @ApiExtraModels(CompetitionEntryDto)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully',
    type: CompetitionLeaderboardDto, // Replace with a DTO if available
  })
  @Get('competition/leaderboard/:competitionId')
  async getLeaderboard(
    @Param('competitionId') competitionId: string,
  ): Promise<CompetitionLeaderboardDto> {
    try {
      const leaderboard =
        await this.databaseCompetitionService.getLeaderboard(competitionId);
      // update the imageSnippetUrl with the signed URL
      for (const entry of leaderboard) {
        if (entry.imageSnippetUrl && entry.imageSnippetUrl.length > 0) {
          entry.imageSnippetUrl = await this.storageService.generateSignedUrl(
            entry.imageSnippetUrl,
          );
        }
        for (let ii = 0; ii < 5; ++ii) {
          if (entry.metaData[`sampled_image${ii}`]) {
            entry.metaData[`sampled_image${ii}`] =
              await this.storageService.generateSignedUrl(
                entry.metaData[`sampled_image${ii}`],
              );
          }
        }
      }
      return {
        competitionId,
        entries: leaderboard.map((entry) => ({
          id: '',
          competitorId: entry.id,
          competitorName: entry.name,
          score: entry.bestScore,
          metrics: { '': null },
          metaData: entry.metaData,
          timestamp: entry.timestamp,
          numEntries: entry.num_entries,
          imageSnippetUrl: entry.imageSnippetUrl,
          status: entry.status,
          progress: 0,
          queueSize: 0,
          message: '',
        })),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve leaderboard: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get entries of a user in a competition
   */
  @ApiExtraModels(CompetitionEntryDto)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'User entries retrieved successfully',
    type: CompetitionGetEntriesDto, // Replace with a DTO if available
  })
  @Get('competition/entries/:competitionId')
  async getUserEntries(
    @Param('competitionId') competitionId: string,
    @Session() session: Record<string, any>,
  ): Promise<CompetitionGetEntriesDto> {
    if (!session.userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const userId = session.userId;
    try {
      const entries = await this.databaseCompetitionService.getUserEntries(
        competitionId,
        userId,
      );

      // for entries that have the "submitted status", query the inference server to get update
      for (const entry of entries) {
        // submitted or waiting or running
        if (
          entry.status === 'submitted' ||
          entry.status === 'waiting' ||
          entry.status === 'running'
        ) {
          const targetUrl = `${this.competitionURL}/inference_status/`;
          const targetUrl_image = `${this.competitionURL}/sampled_image/`;
          const response = await this.competitionService.getInferenceStatus(
            userId,
            entry.id,
            targetUrl,
          );
          console.log('response', response);

          // update entry if status is not "submitted"
          if (response.status !== 'submitted') {
            entry.status = response.status;
            entry.metrics = response.metrics;
            if (response.status === 'error') {
              // add error message to entry's metadata
              entry.metaData = {
                ...entry.metaData,
                errorMessage: response.errorMessage,
              };
            }
            if (entry.status === 'finished') {
              // get 5 sampled images from the server
              for (let ii = 0; ii < 5; ii++) {
                const imageUrl = await this.competitionService.getImageFile(
                  userId,
                  entry.id,
                  ii,
                  targetUrl_image,
                );
                entry.metaData[`sampled_image${ii}`] = imageUrl;
              }
            }
            await this.databaseCompetitionService.updateEntry(
              entry.id,
              entry.metrics,
              entry.metaData,
              entry.status,
            );
          }
          if (response.status === 'running') {
            entry.progress = response.progress;
          }
          entry.queueSize = response.queueSize;
        }
      }

      for (const entry of entries) {
        if (entry.status === 'finished') {
          for (let ii = 0; ii < 5; ++ii) {
            if (entry.metaData[`sampled_image${ii}`]) {
              entry.metaData[`sampled_image${ii}`] =
                await this.storageService.generateSignedUrl(
                  entry.metaData[`sampled_image${ii}`],
                );
            }
          }
        }
      }

      return {
        competitionId,
        entries: entries.map((entry) => ({
          id: entry.id,
          competitorId: entry.competitor.id,
          competitorName: entry.competitor.name,
          score: entry.score,
          metrics: entry.metrics,
          metaData: entry.metaData,
          timestamp: entry.timestamp,
          numEntries: 1,
          imageSnippetUrl: '',
          status: entry.status,
          progress: entry.progress ?? 0,
          queueSize: entry.queueSize,
          message: entry.message ?? '',
        })),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve user entries: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update an existing competition
   */
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiBody({
    description: 'Updated info of competition',
    type: CompetitionInfoDto,
  })
  @ApiResponse({
    status: 200,
    description: 'competition updated',
    type: String,
  })
  @Post('competition/update/:competitionId')
  async updateCompetition(
    @Param('competitionId') competitionId: string,
    @Body() competitionInfoDto: CompetitionInfoDto,
  ): Promise<string> {
    try {
      const updatedCompetitionId =
        await this.databaseCompetitionService.updateCompetition(
          competitionId,
          competitionInfoDto.name,
          competitionInfoDto.dailyLimit,
          competitionInfoDto.description,
          {},
          competitionInfoDto.startDate,
          competitionInfoDto.endDate,
        );
      return updatedCompetitionId;
    } catch (error) {
      throw new HttpException(
        `Failed to update competition: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all competitions
   */
  @ApiExtraModels(CompetitionInfoDto)
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'Competitions retrieved successfully',
    type: GetAllCompetitionsDto,
  })
  @Get('competition/all')
  async getAllCompetitions(): Promise<GetAllCompetitionsDto> {
    try {
      const competitions =
        await this.databaseCompetitionService.getCompetitions(null);
      // map the results into the Dto
      const competitionsDto = competitions.map((competition) => ({
        id: competition.id,
        name: competition.name,
        startDate: competition.startDate,
        endDate: competition.endDate,
        dailyLimit: competition.dailyLimit,
        description: competition.description,
      }));
      return {
        competitions: competitionsDto,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve competitions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get competitions for a user
   */
  @ApiExtraModels(CompetitionInfoDto)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'Competitions retrieved successfully',
    type: GetAllCompetitionsDto,
  })
  @Get('competition/user')
  async getUserCompetitions(
    @Session() session: Record<string, any>,
  ): Promise<GetAllCompetitionsDto> {
    // get userId from session
    if (!session.userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const userId = session.userId;
    try {
      const competitions =
        await this.databaseCompetitionService.getCompetitions(userId);
      // map the results into the Dto
      const competitionsDto = competitions.map((competition) => ({
        id: competition.id,
        name: competition.name,
        startDate: competition.startDate,
        endDate: competition.endDate,
        dailyLimit: competition.dailyLimit,
        description: competition.description,
      }));
      return {
        competitions: competitionsDto,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve competitions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get competitor info for a user in a competition
   */
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'Competitor info retrieved successfully',
    type: CompetitorInfoDto, // Replace with a DTO if available
  })
  @Get('competition/competitor-info')
  async getCompetitorInfo(
    @Session() session: Record<string, any>,
    @Query('competitionId') competitionId: string,
  ): Promise<CompetitorInfoDto> {
    if (!session.userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const userId = session.userId;

    try {
      const competitorInfo =
        await this.databaseCompetitionService.getCompetitorInfo(
          userId,
          competitionId,
        );
      const metaData = competitorInfo.metaData as Record<string, any>;
      let signedUrl = '';
      if (metaData.imageSnippetUrl && metaData.imageSnippetUrl.length > 0) {
        signedUrl = await this.storageService.generateSignedUrl(
          metaData.imageSnippetUrl,
        );
      }
      console.log(competitorInfo);
      console.log('signedUrl', signedUrl);
      return {
        id: competitorInfo.id,
        name: competitorInfo.name,
        score: competitorInfo.bestScore,
        imageSnippetUrl: signedUrl,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve competitor info: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update competitor info
   */
  // @HttpCode(HttpStatus.OK)
  // @ApiBearerAuth('bearerAuth')
  // @ApiBody({
  //   description: 'Updated competitor info',
  //   type: CompetitorInfoWithImageFileDto, // Replace with a DTO if available
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Competitor info updated successfully',
  //   type: String, // Replace with a DTO if available
  // })
  // @UseInterceptors(FileInterceptor('file'))
  // @ApiConsumes('multipart/form-data')
  // @Post('competition/update-competitor-info-with-image')
  // async updateCompetitorInfoWitnImageFile(
  //   @Body() competitorInfoDto: CompetitorInfoWithImageFileDto,
  //   @UploadedFile() file: Express.Multer.File,
  // ): Promise<string> {
  //   try {
  //     await this.documentService.uploadDocumentNoMaterialId(file);
  //     const updatedCompetitor = await this.databaseCompetitionService.updateCompetitorInfo(
  //         competitorInfoDto.id, competitorInfoDto.name, competitorInfoDto.imageSnippetUrl,
  //     );
  //     return updatedCompetitor.id;
  //   } catch (error) {
  //     throw new HttpException(
  //       `Failed to update competitor info: ${error.message}`,
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiBody({
    description: 'Updated competitor info',
    type: CompetitorInfoDto, // Replace with a DTO if available
  })
  @ApiResponse({
    status: 200,
    description: 'Competitor info updated successfully',
    type: String, // Replace with a DTO if available
  })
  @Post('competition/update-competitor-info')
  async updateCompetitorInfo(
    @Body() competitorInfoDto: CompetitorInfoDto,
  ): Promise<string> {
    try {
      const updatedCompetitor =
        await this.databaseCompetitionService.updateCompetitorInfo(
          competitorInfoDto.id,
          competitorInfoDto.name,
          competitorInfoDto.imageSnippetUrl ?? '',
        );
      return updatedCompetitor.id;
    } catch (error) {
      throw new HttpException(
        `Failed to update competitor info: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the number of entries left for today for a competitor
   */
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'Number of entries left for today retrieved successfully',
    type: NumEntriesLeftDto,
  })
  @Get('competition/entries-left')
  async getEntriesLeft(
    @Session() session: Record<string, any>,
    @Query('competitionId') competitionId: string,
  ): Promise<NumEntriesLeftDto> {
    if (!session.userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const userId = session.userId;

    try {
      // Get the competitor ID for the user and competition
      const competitorId =
        await this.databaseCompetitionService.getCompetitorIdByUserCompetitionId(
          userId,
          competitionId,
        );

      // Get the number of entries left for today
      const result = await this.competitionService.getEntriesLeft(competitorId);

      return {
        numEntriesLeft: Math.max(0, result.entriesLeft),
        timeToRefresh: result.timeToRefresh,
        refreshNum: result.refreshNum,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve entries left: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Query the progress of model initialization
   */
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'Model initialization progress retrieved successfully',
    type: CompetitionReplyDto,
  })
  @Get('competition/initialize-model-progress')
  async getInitializeModelProgress(
    @Session() session: Record<string, any>,
  ): Promise<CompetitionReplyDto> {
    if (!session.userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const userId = session.userId;
    const targetUrl = `${this.competitionURL}/initialize_model_status/`;

    try {
      const response = await this.competitionService.getInitializeModelStatus(
        userId,
        targetUrl,
      );
      return {
        message: response.message,
        status: response.progress,
        metrics: {},
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve model initialization progress: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
