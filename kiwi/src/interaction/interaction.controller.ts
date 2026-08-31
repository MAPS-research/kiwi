import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Session,
  UseGuards,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { InteractionService } from './interaction.service';
import { UserSessionService } from '../common/database/user-session.service';
import { UserService } from '../common/database/user.service';
import { DocumentService } from '../common/database/document.service';
import { ApiBearerAuth, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import {
  AddInteractionRequest,
  AddInteractionResponse,
  GetInteractionsByPdfPageRequest,
  GetInteractionsByPdfPageResponse,
  GetInteractionsByClassIdRequest,
  GetInteractionsByClassIdResponse,
  Prompt_Answer_client,
  ToggleUpvoteResponse,
  ToggleUpvoteRequest,
  AddDiscussionResponse,
  AddDiscussionRequest,
  GetDiscussionByClassIdRequest,
  GetDiscussionByClassIdResponse,
  GetDiscussionByPdfRequest,
  GetDiscussionByPdfResponse,
} from './dto/update_interaction.dto';

@Controller('interaction')
export class InteractionController {
  private readonly logger = new Logger(InteractionController.name);

  constructor(
    private readonly interactionService: InteractionService,
    private readonly userSessoinService: UserSessionService,
    private readonly documentService: DocumentService,
    private readonly userService: UserService,
  ) { }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('add')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: AddInteractionResponse,
  })
  async addInteraction(
    @Session() session: Record<string, any>,
    @Body() addInteractionRequest: AddInteractionRequest,
  ) {
    const sessionId = session.userSessionId as string;
    const classId = session.classId as string;

    if (!sessionId || !classId) {
      this.logger.error('Session ID or Class ID not found in session');
      return {
        message: 'Interaction added failed',
        interactionId: null,
      };
    }

    const { action } = addInteractionRequest;
    this.logger.debug(
      'New interaction action:',
      JSON.stringify(action, null, 2),
    );

    const createdInteraction = await this.interactionService.createInteraction(
      sessionId,
      session.userId,
      classId,
      action,
    );

    if (!createdInteraction) {
      return {
        message: 'Interaction added failed',
        interactionId: null,
      };
    }
    return {
      message: 'Interaction added successfully',
      interactionId: createdInteraction.id,
    };
  }

  @ApiExtraModels(Prompt_Answer_client)
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('interactions/pdf-page')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: GetInteractionsByPdfPageResponse,
  })
  async getInteractionsByPdfPage(
    @Session() session: Record<string, any>,
    @Body() getInteractionsByPdfPageRequest: GetInteractionsByPdfPageRequest,
  ) {
    const sessionId = session.userSessionId as string;

    if (!sessionId) {
      throw new BadRequestException('Session ID not found in session');
    }

    const { pdfId, pdfPage } = getInteractionsByPdfPageRequest;
    this.logger.log('get interaction by pdf page:', sessionId, pdfId, pdfPage);

    // check userSessionId is valid
    const userSession = await this.userSessoinService.userSession({
      id: sessionId,
    });

    if (!userSession) {
      throw new BadRequestException('User session ID not found');
    }

    // get all classIds the user is enrolled in
    const classIds = await this.userService.classIdsByUserId(
      userSession.userId,
    );

    // check userSessionId contains the class that has the pdfId
    const pdf = await this.documentService.documentWithClassMaterial({
      where: { id: pdfId },
    });
    if (!pdf) {
      throw new BadRequestException('Pdf ID not found');
    }
    if (
      pdf.classMaterial?.classId &&
      !classIds.includes(pdf.classMaterial.classId)
    ) {
      throw new BadRequestException('User does not have access to this pdf');
    }

    // get all interactions with pdfid and pdfpage
    const interactions =
      await this.interactionService.getChatInteractionsByPdfWithIntTags(
        pdfId,
        pdfPage,
        [0, 1, 2], // 1 2 are both good prompt-answer pairs
      );

    // construct the response with interactions
    // map every interaction to a Prompt_Answer_client
    const responseInteractions = await Promise.all(
      interactions.map(async (interaction) => {
        const context = interaction.context;

        // get upvoteInteraction with userId and interactionId
        const upvoteInteraction =
          await this.interactionService.getUpvoteInteraction(
            userSession.userId,
            interaction.id,
          );
        // check if the user has upvoted this interaction
        console.log(upvoteInteraction);
        const upvoted = upvoteInteraction !== null;

        // Type guard to ensure context is a JsonObject and has a 'content' property
        if (
          typeof context === 'object' &&
          context !== null &&
          'content' in context &&
          typeof context.content === 'object' &&
          context.content !== null &&
          'prompt' in context.content &&
          'answer' in context.content
        ) {
          return {
            interactionId: interaction.id,
            prompt: context.content.prompt,
            answer: context.content.answer,
            intTag: interaction.intTag,
            stringTag: interaction.stringTag ?? '',
            numUpvotes: interaction.numUpvotes ?? 0,
            upvoted: upvoted,
            timestamp: interaction.timestamp,
            pdfId: interaction.pdfId,
            pdfPage: interaction.pdfPage,
          };
        }
        // Handle cases where context is invalid
        // throw new Error('Invalid context structure');
      }),
    );
    return {
      message: 'Interactions retrieved successfully',
      interactions: responseInteractions,
    };
  }

  async getInteractionsByClassIdHelper(classId: string, userId: string) {
    // get all classIds the user is enrolled in
    const classIds = await this.userService.classIdsByUserId(userId);
    this.logger.log('classids', classIds);
    if (!classIds.includes(classId)) {
      throw new BadRequestException('User does not have access to this class');
    }

    // get all interactions with pdfid and pdfpage
    const interactions =
      await this.interactionService.getChatInteractionsByClassIdWithIntTags(
        classId,
        [0, 1, 2], // 1 2 are both good prompt-answer pairs
      );

    // construct the response with interactions
    // map every interaction to a Prompt_Answer_client
    const responseInteractions = interactions
      .map((interaction) => {
        const context = interaction.context;

        // Type guard to ensure context is a JsonObject and has a 'content' property
        if (
          typeof context === 'object' &&
          context !== null &&
          'content' in context &&
          typeof context.content === 'object' &&
          context.content !== null &&
          'prompt' in context.content &&
          'answer' in context.content
        ) {
          return {
            interactionId: interaction.id,
            prompt: context.content.prompt,
            answer: context.content.answer,
            intTag: interaction.intTag,
            timestamp: interaction.timestamp,
            pdfId: interaction.pdfId,
            pdfPage: interaction.pdfPage,
          };
        }
        // Handle cases where context is invalid
        return null; // Return null for invalid contexts
      })
      .filter(interaction => interaction !== null); // Filter out null values

    return responseInteractions;
  }

  @ApiExtraModels(Prompt_Answer_client)
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('interactions/currentClass')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: GetInteractionsByClassIdResponse,
  })
  async getInteractionsCurrentClass(@Session() session: Record<string, any>) {
    const sessionId = session.userSessionId as string;
    const classId = session.classId as string;
    if (!sessionId || !classId) {
      this.logger.error(
        'Session ID or Class ID not found in session',
        sessionId,
        classId,
      );
    }

    const responseInteractions = await this.getInteractionsByClassIdHelper(
      classId,
      session.userId,
    );
    return {
      message: 'Interactions retrieved successfully',
      interactions: responseInteractions,
    };
  }

  @ApiExtraModels(Prompt_Answer_client)
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('interactions/classId')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: GetInteractionsByClassIdResponse,
  })
  async getInteractionsByClassId(
    @Session() session: Record<string, any>,
    @Body() getInteractionsByClassIdRequest: GetInteractionsByClassIdRequest,
  ) {
    const sessionId = session.userSessionId as string;
    if (!sessionId) {
      this.logger.error('Session ID not found in session');
    }

    const { classId } = getInteractionsByClassIdRequest;
    this.logger.debug('get interaction by classId:', sessionId, classId);

    const responseInteractions = await this.getInteractionsByClassIdHelper(
      classId,
      session.userId,
    );
    return {
      message: 'Interactions retrieved successfully',
      interactions: responseInteractions,
    };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('interactions/toggleUpvote')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: ToggleUpvoteResponse,
  })
  async toggleUpvote(
    @Session() session: Record<string, any>,
    @Body() toggleUpvoteRequest: ToggleUpvoteRequest,
  ) {
    const sessionId = session.userSessionId as string;

    if (!sessionId) {
      throw new BadRequestException('Session ID not found in session');
    }

    const interactionId = toggleUpvoteRequest['id'];
    this.logger.log('get interaction by pdf page:', sessionId, interactionId);

    try {
      await this.interactionService.toggleUpvoteInteraction(
        session.userId,
        interactionId,
      );
    } catch (error) {
      this.logger.error('Error toggling upvote:', error);
      return {
        message: 'toggle upvote failed',
      };
    }

    return {
      message: 'toggle upvote success',
    };
  }

  /**
   * Create a new discussion
   */
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('discussions/add')
  @ApiResponse({
    status: 201,
    description: 'Discussion created successfully',
    type: AddDiscussionResponse,
  })
  async addDiscussion(
    @Session() session: Record<string, any>,
    @Body() addDiscussionRequest: AddDiscussionRequest,
  ): Promise<AddDiscussionResponse> {
    const {
      parentDiscussionId,
      writtenPost,
      referencePromptAnswerIds,
      referencePdfIds,
      referencePdfPages,
    } = addDiscussionRequest;

    try {
      // Validate the request data
      if (!writtenPost) {
        throw new BadRequestException('Written post is required');
      }
      if (referencePdfIds.length !== referencePdfPages.length) {
        throw new BadRequestException(
          'Reference PDF IDs and pages must have the same length',
        );
      }

      // get post from writtenPost
      const postString = writtenPost.context.post as string;

      // if parentDiscussionId it null, create a discussion, otherwise reply to a discussion
      if (!parentDiscussionId) {
        const addResult = await this.interactionService.createDiscussion(
          session.userSessionId,
          session.userId,
          session.classId,
          postString,
          referencePromptAnswerIds,
          referencePdfIds,
          referencePdfPages,
        );
        return {
          message: 'Discussion created successfully',
          rootId: addResult.root.id,
          discussionId: addResult.discussion.id,
        };
      } else {
        const addResult = await this.interactionService.replyDiscussion(
          session.userSessionId,
          session.userId,
          session.classId,
          parentDiscussionId,
          postString,
          referencePromptAnswerIds,
          referencePdfIds,
          referencePdfPages,
        );
        return {
          message: 'Discussion created successfully',
          rootId: addResult.root.id,
          discussionId: addResult.discussion.id,
        };
      }
    } catch (error) {
      this.logger.error('Error creating discussion:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to create discussion',
          error: 'Internal Server Error',
          errorCode: 'DISCUSSION_CREATION_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // /**
  //  * Get discussions by class ID
  //  */
  // @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth('bearerAuth')
  // @Post('by-class-id')
  // @ApiResponse({
  //   status: 200,
  //   description: 'Discussions retrieved successfully',
  //   type: GetDiscussionByClassIdResponse,
  // })
  // async getDiscussionsByClassId(
  //   @Body() getDiscussionByClassIdRequest: GetDiscussionByClassIdRequest,
  // ): Promise<GetDiscussionByClassIdResponse> {
  //   const { classId } = getDiscussionByClassIdRequest;

  //   // Call the service to retrieve discussions by class ID
  //   const discussions = await this.interactionService.getDiscussionsByClassId(classId);

  //   return {
  //     message: 'Discussions retrieved successfully',
  //     discussions,
  //   };
  // }

  // /**
  //  * Get discussions by PDF ID and page
  //  */
  // @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth('bearerAuth')
  // @Post('by-pdf')
  // @ApiResponse({
  //   status: 200,
  //   description: 'Discussions retrieved successfully',
  //   type: GetDiscussionByPdfResponse,
  // })
  // async getDiscussionsByPdf(
  //   @Body() getDiscussionByPdfRequest: GetDiscussionByPdfRequest,
  // ): Promise<GetDiscussionByPdfResponse> {
  //   const { pdfId, pdfPage } = getDiscussionByPdfRequest;

  //   // Call the service to retrieve discussions by PDF ID and page
  //   const discussions = await this.interactionService.getDiscussionsByPdf(pdfId, pdfPage);

  //   return {
  //     message: 'Discussions retrieved successfully',
  //     discussions,
  //   };
  // }
}
