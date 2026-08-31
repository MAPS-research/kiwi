import { Injectable, Logger } from '@nestjs/common';
import { UserInteractionService as DatabaseInteractionService } from 'src/common/database/user-interaction.service';
import { UserService as DatabaseUserService } from 'src/common/database/user.service';
import { UserSessionService as DatabaseSessionService } from 'src/common/database/user-session.service';
import { UserInteraction, Prisma, User } from '@prisma/client';
import { Action_client } from './dto/update_interaction.dto';

@Injectable()
export class InteractionService {
  private readonly logger = new Logger(InteractionService.name);
  constructor(
    private databaseInteractionService: DatabaseInteractionService,
    private databaseUserService: DatabaseUserService,
    private databaseSessionService: DatabaseSessionService,
  ) { }

  async createInteraction(
    sessionId: string,
    userId: string,
    classId: string | null | undefined,
    action: Action_client,
    stringTag?: string,
    /** Thread row this turn belongs to, when one has been resolved. */
    conversationId?: string,
  ) {
    // get userId and classId from by retrieving the session
    const session = await this.databaseSessionService.userSession({
      id: sessionId,
    });

    // Check if the session exists
    if (!session) {
      throw new Error('Session not found');
    }

    // A null/empty classId means this isn't tied to a class — e.g. an app-wide
    // chat/agent turn on an admin/UI page. Persist it with classId=null and skip
    // the enrollment check (which only applies to class-scoped interactions).
    const hasClass = !!classId;
    if (hasClass) {
      const classIds = await this.databaseUserService.classIdsByUserId(userId);
      if (!classIds.includes(classId as string)) {
        throw new Error('User not enrolled in the given classId');
      }
    }

    this.logger.log(
      'Interaction creating for user: ' +
      userId +
      ', class: ' +
      (hasClass ? classId : '(none/UI)') +
      ' and session: ' +
      sessionId,
    );
    // Here I will create the interaction
    const interaction =
      await this.databaseInteractionService.createUserInteraction({
        userId: userId,
        sessionId: sessionId,
        classId: hasClass ? (classId as string) : null,
        timestamp: new Date(),
        type: action.type,
        context: action.context as Prisma.InputJsonValue,
        pdfId: action.pdfId ?? undefined,
        pdfMaterialType: action.pdfMaterialType ?? undefined,
        pdfPage: action.pdfPage ?? undefined,
        // Legacy thread key. Still written alongside the foreign key below so
        // readers that predate the Conversation model keep working.
        ...(stringTag ? { stringTag } : {}),
        ...(conversationId ? { conversationId } : {}),
      });
    // Here we don't have the id, so we will created one, Smart!
    this.logger.debug('created interaction: ' + interaction);

    return interaction;
  }

  async updateInteractionContext(
    interactionId: string,
    context: Record<string, unknown>,
  ) {
    // Here I will update the interaction
    const updatedInteraction =
      await this.databaseInteractionService.updateUserInteraction({
        where: {
          id: interactionId,
        },
        data: {
          context: context as Prisma.InputJsonValue,
        },
      });
    this.logger.debug('updated interaction: ' + updatedInteraction);
    return updatedInteraction;
  }

  async createServerAction({
    interactionId,
    type,
    context,
    botResponse,
    engineChoice = undefined,
    timestamp = new Date(), // Provide a default value for optional fields
  }: {
    interactionId: string;
    type: string;
    context: Record<string, unknown>;
    botResponse: string;
    engineChoice?: string;
    timestamp?: Date;
  }) {
    // Here I will create the action
    const createdAction =
      await this.databaseInteractionService.createServerAction({
        interactionId: interactionId,
        type: type,
        botResponse: botResponse,
        context: context as Prisma.InputJsonValue,
        engineChoice: engineChoice,
        timestamp: timestamp ?? new Date(),
      });
    this.logger.debug('created action: ' + createdAction);
    return createdAction;
  }

  async getAllInteractions() {
    // Here I will get the interactions
    const interactions = await this.databaseInteractionService.userInteractions(
      {},
    );
    return interactions;
  }

  async getLectureInteractions(
    lectureId: string,
    classId: string,
    types: string[],
  ) {
    // Fetch interactions filtered by pdfId (lecture), classId, and types
    return this.databaseInteractionService.userInteractions({
      where: {
        pdfId: lectureId,
        classId: classId,
        type: { in: types },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getInteractionsByIds(interactionIds: string[]) {
    // Check if interactionIds is empty
    if (interactionIds.length === 0) {
      return [];
    }

    const interactions = await this.databaseInteractionService.userInteractions(
      {
        where: {
          id: { in: interactionIds },
        },
      },
    );
    return interactions;
  }

  // async getAllActionsGroupedByInteractionIds(interactionIds: string[]) {
  //   // Check if interactionIds is empty
  //   if (interactionIds.length === 0) {
  //     return [];
  //   }

  //   const actions = await this.databaseInteractionService.actions({
  //     where: {
  //       interactionId: { in: interactionIds },
  //     },
  //   });

  //   // Group actions by interactionId
  //   const groupedActions = actions.reduce((acc, action) => {
  //     if (!acc[action.interactionId]) {
  //       acc[action.interactionId] = [];
  //     }
  //     acc[action.interactionId].push(action);
  //     return acc;
  //   }, {} as Record<string, Action[]>);
  //   // Convert the grouped actions into an array of objects
  //   const groupedActionsArray = Object.entries(groupedActions).map(
  //     ([interactionId, actions]) => ({
  //       interactionId,
  //       actions,
  //     }),
  //   );
  //   // Return the grouped actions
  //   return groupedActionsArray;
  // }

  async getInteractionsByUser(userId: string) {
    // How to get the interactions?
    // Here I will get the interactions
    const interactions = await this.databaseInteractionService.userInteractions(
      {
        where: {
          userId: userId,
        },
      },
    );
    return interactions;
  }

  async getInteractionsBySession(sessionId: string) {
    // How to get the interactions?
    // Here I will get the interactions
    const interactions = await this.databaseInteractionService.userInteractions(
      {
        where: {
          sessionId: sessionId,
        },
      },
    );
    return interactions;
  }

  async getChatInteractionsByPdf(pdfId: string, pdfPage: number) {
    // Here I will get the action
    const actions = await this.databaseInteractionService.userInteractions({
      where: {
        pdfId: pdfId,
        pdfPage: pdfPage,
        type: 'frontend-interaction-chat',
      },
    });
    return actions;
  }

  async getChatInteractionsByPdfWithIntTags(
    pdfId: string,
    pdfPage: number,
    intTags: number[],
  ) {
    // Here I will get the action
    const actions = await this.databaseInteractionService.userInteractions({
      where: {
        pdfId: pdfId,
        pdfPage: pdfPage,
        intTag: { in: intTags },
        type: 'frontend-interaction-chat',
      },
    });
    return actions;
  }

  async getChatInteractionsByClassId(classId: string) {
    // Here I will get the action
    const actions = await this.databaseInteractionService.userInteractions({
      where: {
        classId: classId,
        type: 'frontend-interaction-chat',
      },
    });
    return actions;
  }

  async getChatInteractionsByClassIdWithIntTags(
    classId: string,
    intTags: number[],
  ) {
    // Here I will get the action
    const actions = await this.databaseInteractionService.userInteractions({
      where: {
        classId: classId,
        intTag: { in: intTags },
        type: 'frontend-interaction-chat',
      },
    });
    return actions;
  }

  async getServerActionsBySession(sessionId: string) {
    // here I will get interactions
    const interactions =
      await this.databaseInteractionService.userInteractionsWithServerActions({
        where: {
          sessionId: sessionId,
        },
      });
    // collect server actions from every interactions into a flattened array
    const actions = interactions.flatMap(
      (interaction) => interaction.serverActions,
    );

    return actions;
  }

  async getInteractionsWithServerActionsBySession(sessionId: string) {
    // here I will get interactions
    const interactions =
      await this.databaseInteractionService.userInteractionsWithServerActions({
        where: {
          sessionId: sessionId,
        },
      });

    return interactions;
  }

  async getUpvoteInteraction(userId: string, interactionId: string) {
    const existingUpvote =
      await this.databaseInteractionService.upvoteInteraction({
        userId_interactionId: {
          userId: userId,
          interactionId: interactionId,
        },
      });
    return existingUpvote;
  }

  async toggleUpvoteInteraction(userId: string, interactionId: string) {
    const existingUpvote = await this.getUpvoteInteraction(
      userId,
      interactionId,
    );

    if (existingUpvote) {
      // Remove the upvote
      await this.databaseInteractionService.deleteUpvoteInteraction({
        id: existingUpvote.id,
      });

      // Decrement the upvote count in UserInteraction
      await this.databaseInteractionService.updateUserInteraction({
        where: { id: interactionId },
        data: { numUpvotes: { decrement: 1 } },
      });
    } else {
      // Add the upvote
      await this.databaseInteractionService.createUpvoteInteraction({
        userId: userId,
        interactionId: interactionId,
      });

      // Increment the upvote count in UserInteraction
      await this.databaseInteractionService.updateUserInteraction({
        where: { id: interactionId },
        data: { numUpvotes: { increment: 1 } },
      });
    }
  }

  async createDiscussionInteractionsHelper(
    sessionId: string,
    userId: string,
    classId: string,
    writtenPost: string,
    referencePromptAnswerIds: string[],
    referencePdfIds: string[],
    referencePdfPages: number[],
  ) {
    // then create the userInteraction for writtenPost
    const postInteraction = await this.createInteraction(
      sessionId,
      userId,
      classId,
      {
        type: 'frontend-discussion-post',
        context: {
          writtenPost: writtenPost,
        },
        timestamp: new Date(),
      },
    );
    // create each userInteraction for referencePromptAnswerIds
    const referencePromptAnswerInteractions = await Promise.all(
      referencePromptAnswerIds.map(async (referencePromptAnswerId) => {
        // fetch the interaction for the referencePromptAnswerId
        const prmoptAnswer =
          await this.databaseInteractionService.userInteraction({
            id: referencePromptAnswerId,
          });
        if (!prmoptAnswer) {
          throw new Error('Prompt answer chat Interaction not found');
        }
        if (
          prmoptAnswer.type == 'frontend-interaction-chat' &&
          prmoptAnswer.pdfId &&
          prmoptAnswer.pdfPage
        ) {
          return this.createInteraction(sessionId, userId, classId, {
            type: 'frontend-discussion-reference-prompt-answer',
            context: {
              referencePromptAnswerId: referencePromptAnswerId,
            },
            timestamp: new Date(),
            pdfId: prmoptAnswer.pdfId,
            pdfPage: prmoptAnswer.pdfPage,
          });
        } else {
          throw new Error('Not referenceing a prompt answer chat');
        }
      }),
    );

    // create each userInteraction for referencePdfIds
    const referencePdfInteractions = await Promise.all(
      referencePdfIds.map(async (referencePdfId, index) => {
        // create new interaction for the referencePdfId
        const referencePdfPage = referencePdfPages[index];
        return this.createInteraction(sessionId, userId, classId, {
          type: 'frontend-discussion-reference-pdf',
          context: {
            referencePdfId: referencePdfId,
          },
          timestamp: new Date(),
          pdfId: referencePdfId,
          pdfPage: referencePdfPage,
        });
      }),
    );
    return {
      postInteraction,
      referencePromptAnswerInteractions,
      referencePdfInteractions,
    };
  }

  async createDiscussion(
    sessionId: string,
    userId: string,
    classId: string,
    writtenPost: string,
    referencePromptAnswerIds: string[],
    referencePdfIds: string[],
    referencePdfPages: number[],
  ) {
    // first create the DiscussionRoot
    const discussionRoot =
      await this.databaseInteractionService.createDiscussionRoot({
        classId: classId,
      });
    const rootId = discussionRoot.id;

    const {
      postInteraction,
      referencePromptAnswerInteractions,
      referencePdfInteractions,
    } = await this.createDiscussionInteractionsHelper(
      sessionId,
      userId,
      classId,
      writtenPost,
      referencePromptAnswerIds,
      referencePdfIds,
      referencePdfPages,
    );

    // combine all interactions into a flattened list
    const userInteractionIds = [
      postInteraction.id,
      ...referencePromptAnswerInteractions.map((interaction) => interaction.id),
      ...referencePdfInteractions.map((interaction) => interaction.id),
    ];

    // create the discussion
    const discussion = await this.databaseInteractionService.createDiscussion({
      rootId: rootId,
      userId: userId,
      classId: classId,
      interactionIds: userInteractionIds,
    });

    // return discussion;
    return {
      root: discussionRoot,
      discussion: discussion,
    };
  }

  async replyDiscussion(
    sessionId: string,
    userId: string,
    classId: string,
    parentId: string,
    writtenPost: string,
    referencePromptAnswerIds: string[],
    referencePdfIds: string[],
    referencePdfPages: number[],
  ) {
    // check if parentId is valid
    const parentDiscussion =
      await this.databaseInteractionService.discussionWithDiscussionRoot({
        where: { id: parentId },
      });
    if (!parentDiscussion) {
      throw new Error('Parent discussion not found');
    }
    // get the parent's root
    const discussionRoot = parentDiscussion.root;

    const {
      postInteraction,
      referencePromptAnswerInteractions,
      referencePdfInteractions,
    } = await this.createDiscussionInteractionsHelper(
      sessionId,
      userId,
      classId,
      writtenPost,
      referencePromptAnswerIds,
      referencePdfIds,
      referencePdfPages,
    );

    // combine all interactions into a flattened list
    const userInteractionIds = [
      postInteraction.id,
      ...referencePromptAnswerInteractions.map((interaction) => interaction.id),
      ...referencePdfInteractions.map((interaction) => interaction.id),
    ];

    // create the discussion
    const discussion = await this.databaseInteractionService.createDiscussion({
      rootId: discussionRoot.id,
      userId: userId,
      classId: classId,
      parentId: parentId,
      interactionIds: userInteractionIds,
    });

    // return discussion;
    return {
      root: discussionRoot,
      discussion: discussion,
    };
  }

  // Redundant code, but I will keep it for now
  async getUpvoteDiscussion(userId: string, discussionId: string) {
    const existingUpvote =
      await this.databaseInteractionService.upvoteDiscussion({
        userId_discussionId: {
          userId: userId,
          discussionId: discussionId,
        },
      });
    return existingUpvote;
  }

  async toggleUpvoteDiscussion(userId: string, discussionId: string) {
    const existingUpvote = await this.getUpvoteInteraction(
      userId,
      discussionId,
    );

    if (existingUpvote) {
      // Remove the upvote
      await this.databaseInteractionService.deleteUpvoteDiscussion({
        id: existingUpvote.id,
      });

      // Decrement the upvote count in Discussion
      await this.databaseInteractionService.updateDiscussion({
        where: { id: discussionId },
        data: { numUpvotes: { decrement: 1 } },
      });
    } else {
      // Add the upvote
      await this.databaseInteractionService.createUpvoteDiscussion({
        userId: userId,
        discussionId: discussionId,
      });

      // Increment the upvote count in Discussion
      await this.databaseInteractionService.updateDiscussion({
        where: { id: discussionId },
        data: { numUpvotes: { increment: 1 } },
      });
    }
  }
}
