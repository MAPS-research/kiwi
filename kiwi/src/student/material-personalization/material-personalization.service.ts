import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MaterialPersonalizationService as DatabaseMaterialPersonalizationService } from 'src/common/database/material-personalization.service';
import { RedisService } from 'src/common/redis/redis.service';
import { InteractionService } from 'src/interaction/interaction.service';
import { DocumentService } from 'src/document/document.service'; // Step 1: Import DocumentService
import { LlmService } from 'src/common/llm/llm.service';
import { EngineChoice } from 'src/common/llm/interfaces/engine-config';
import {
  MAX_ROLLING_PROFILE_ROWS,
  RollingUserProfile,
  mergeRollingProfile,
  renderRollingProfileBlock,
} from './rolling-profile';

@Injectable()
export class MaterialPersonalizationService {
  // store the timeout ID
  private timeoutId: NodeJS.Timeout | null = null;
  private logger = new Logger(MaterialPersonalizationService.name);
  constructor(
    private databaseMaterialPersonalizationService: DatabaseMaterialPersonalizationService,
    private redisService: RedisService,
    private interactionService: InteractionService,
    private readonly documentService: DocumentService,
    private llmService: LlmService,
  ) {}

  // get the user's personalization data, only take the latest for same session
  async getUserPersonalizations(userId: string) {
    return this.databaseMaterialPersonalizationService.getLatestMaterialPersonalizationsByUser(
      userId,
    );
  }

  /**
   * The bounded, merged, sanitised view of the same rows.
   *
   * Prefer this over `getUserPersonalizations` for anything that reaches a
   * prompt: it caps the rows read, collapses them into one profile instead of
   * one line per session, and strips identifiers and instruction-shaped text
   * out of the LLM-written fields. See `rolling-profile.ts`.
   */
  async getRollingUserProfile(
    userId: string,
    limit: number = MAX_ROLLING_PROFILE_ROWS,
  ): Promise<RollingUserProfile | null> {
    const rows =
      await this.databaseMaterialPersonalizationService.getLatestMaterialPersonalizationsByUser(
        userId,
        limit,
      );
    return mergeRollingProfile(rows);
  }

  /** The rendered system-message block, or `null` when there is nothing to say. */
  async getRollingProfileBlock(userId: string): Promise<string | null> {
    const profile = await this.getRollingUserProfile(userId);
    return profile ? renderRollingProfileBlock(profile) : null;
  }

  // set the dynamic timeout (set / reset) (session id) (session validation)
  // TODO: What if user closes session?

  async setDynamicTimeout(sessionId: string, callback: () => void) {
    this.logger.log('Setting dynamic timeout for session:', sessionId);
    const timeoutKey = `session_timeout:${sessionId}`;
    const timeoutDuration = 5 * 60; // TODO: progressively set it toone hour dynamic timeout

    const resetTimeout = async () => {
      await this.redisService.set(timeoutKey, 'active', timeoutDuration);
    };

    const checkTimeout = async () => {
      const status = await this.redisService.get(timeoutKey);
      if (status !== 'active') {
        callback();
      } else {
        // set a new timeout to check again after the duration
        this.timeoutId = setTimeout(checkTimeout, timeoutDuration * 1000);
      }
    };

    // clear the existing timeout if it exists
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    await resetTimeout();
    // set the initial timeout to check after the duration
    this.timeoutId = setTimeout(checkTimeout, timeoutDuration * 1000);
  }

  // get q/a pairs (from analytics or session)
  // get the interactions corresponding to that sessionId whose actionName is either chat-selector or chat-ragtool
  // in the return object:
  // get the user's query by interaction[0].context.messages[-1].content
  // get the response by interaction[-1].context.botResponse
  // in an ascending order of their timestamp, store the query/ resposne in a list of objects called questionAnswerPiars
  // async getDocumentByMaterialId(materialId: string) {
  //   return await this.documentService.getDocumentInfoById(materialId); // Step 3: Use the method
  // }
  // TODO: needs update
  async getInteractionsForSession(sessionId: string) {
    const interactions =
      await this.interactionService.getInteractionsWithServerActionsBySession(
        sessionId,
      );

    // took me some time to figure out: i did some experiments with the database by running npx prisma studio and seeing how the database is stored
    const filteredInteractions = interactions.filter(
      (interaction) =>
        interaction.type === 'frontend-interaction-chat' && interaction.pdfId,
    );

    filteredInteractions.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const sessionInteractionSummary = await Promise.all(
      filteredInteractions.map(async (interaction) => {
        const startTime = (interaction.serverActions[0] as any)?.timestamp
          ? new Date((interaction.serverActions[0] as any).timestamp)
          : null;
        const lastAction = interaction.serverActions[
          interaction.serverActions.length - 1
        ] as any;
        const endTime = lastAction?.timestamp
          ? new Date(lastAction.timestamp)
          : new Date();
        const timeSpent = startTime
          ? (endTime.getTime() - startTime.getTime()) / (1000 * 60)
          : 0;

        const documentInfo = await this.documentService.getDocumentInfoById(
          interaction.pdfId!,
        );
        const materialName = documentInfo.fileName;
        this.logger.log('the material name is here:', materialName);

        return {
          query:
            (interaction.serverActions[0] as any).context.messages &&
            (interaction.serverActions[0] as any).context.messages[
              (interaction.serverActions[0] as any).context.messages.length - 1
            ].content,
          response:
            (
              interaction.serverActions[
                interaction.serverActions.length - 1
              ] as any
            )?.context?.botResponse ?? null,
          summary:
            (interaction.serverActions[0] as any).context.messages &&
            (interaction.serverActions[0] as any).context.messages.length > 2
              ? (interaction.serverActions[0] as any).context.messages[2]
                  .content
              : 'No summary yet - This is the start of the conversation',
          startTime,
          endTime,
          timeSpent,
          materialName,
        };
      }),
    );

    this.logger.log(
      'my question/ answer pairs from this session are',
      sessionId,
      sessionInteractionSummary,
    );

    return sessionInteractionSummary;
  }

  readonly personalizationSystemPrompt =
    "You are a helpful assistant who can extract the personalization features of student interactions with an LLM for learning an introduction to computer programming class. You should extract this student-specific personalization features given different interaction data points in an educational session. You should infer the student learning style, the level of questions the student wants the LLM to give, what the student is good at, and what the student needs improvement at. If you do not have enough information to infer any of those features, write 'Can't infer feature'. You will output the response in JSON format.";

  readonly personalizationFormatSchema = {
    type: 'json_schema' as const,
    json_schema: {
      strict: true,
      name: 'personalization',
      schema: {
        type: 'object',
        properties: {
          learningStyle: { type: 'string' },
          preferredQuestionLevel: { type: 'string' },
          studentGoodAt: { type: 'string' },
          studentImprovesAt: { type: 'string' },
        },
        required: [
          'learningStyle',
          'preferredQuestionLevel',
          'studentGoodAt',
          'studentImprovesAt',
        ],
        additionalProperties: false,
      },
    },
  };

  // send to llm and make llm extarct personalization (apis)
  async extractPersonalizationFeatures(
    sessionId: string,
    engineChoice?: EngineChoice,
  ) {
    this.logger.debug('engineChoice: ', engineChoice); // Engine choice is not used as qwen sucks at structured output
    const sessionInteractionSummary =
      await this.getInteractionsForSession(sessionId);

    // Now that this runs for every ended session, "the student opened Kiwi and
    // never chatted about a document" is the common case. There is nothing to
    // infer from, and the code below indexes [0] unconditionally — bail out
    // before paying for an LLM call.
    if (sessionInteractionSummary.length === 0) {
      this.logger.log(
        `No interactions to extract personalization from for session ${sessionId}`,
      );
      return null;
    }
    // TODO: check in-context learning (ICL)
    // TODO: check the accuracy of the LLM response

    let interactionDataPoints = '';
    for (let i = 0; i < sessionInteractionSummary.length; i++) {
      interactionDataPoints += `Data point ${i + 1}: \n`;
      interactionDataPoints +=
        "Student's question: " + sessionInteractionSummary[i].query + '\n';
      interactionDataPoints +=
        'LLM Response ' + sessionInteractionSummary[i].response + '\n';
      interactionDataPoints +=
        'Summary of the previous interaction(s) ' +
        sessionInteractionSummary[i].summary +
        '\n';
      interactionDataPoints +=
        'Class Material Name' +
        sessionInteractionSummary[i].materialName +
        '\n\n';
    }

    const startTime = sessionInteractionSummary[0].startTime?.getTime() ?? 0;
    const endTime =
      sessionInteractionSummary[
        sessionInteractionSummary.length - 1
      ].endTime.getTime();
    const timeSpent = (endTime - startTime) / (1000 * 60); // Calculate time spent in minutes
    interactionDataPoints += `Overall session interaction time: ${timeSpent} minutes.`;

    const completion = await this.llmService.createChat(
      [
        { role: 'system', content: this.personalizationSystemPrompt },
        {
          role: 'user',
          content: interactionDataPoints,
        },
      ],
      undefined,
      undefined,
      undefined,
      this.personalizationFormatSchema,
    );

    if (!completion.choices[0].message.content) {
      this.logger.error('Failed to extract personalization features');
      return {
        timeSpent,
        learningStyle: "Can't infer feature",
        preferredQuestionLevel: "Can't infer feature",
        studentGoodAt: "Can't infer feature",
        studentImprovesAt: "Can't infer feature",
        startTime,
        endTime,
        materialName: sessionInteractionSummary[0].materialName, // assuming the student views one material each session, optimize later
      };
    }

    const event = JSON.parse(completion.choices[0].message.content) as {
      learningStyle: string;
      preferredQuestionLevel: string;
      studentGoodAt: string;
      studentImprovesAt: string;
    };
    this.logger.log("This session's personalization features: ", event);

    return {
      timeSpent,
      learningStyle: event.learningStyle || '',
      preferredQuestionLevel: event.preferredQuestionLevel || '',
      studentGoodAt: event.studentGoodAt || '',
      studentImprovesAt: event.studentImprovesAt || '',
      startTime,
      endTime,
      materialName: sessionInteractionSummary[0].materialName, // assuming the student views one material each session, optimize later
      // add user id and session id below
    };
  }
  // populate personalization table
  async saveUserPersonalization(
    sessionId: string,
    userId: string,
    engineChoice?: EngineChoice,
  ) {
    const personalizationData = await this.extractPersonalizationFeatures(
      sessionId,
      engineChoice,
    );
    if (!personalizationData) {
      return;
    }
    await this.databaseMaterialPersonalizationService.createMaterialPersonalization(
      {
        personalizationId: randomUUID(), // Generate a unique ID
        timeSpent: personalizationData.timeSpent.toString(),
        learningStyle: personalizationData.learningStyle || '',
        questionStyle: personalizationData.preferredQuestionLevel || '',
        studentGoodAt: personalizationData.studentGoodAt || '',
        studentsImproveAt: personalizationData.studentImprovesAt || '',
        startTime: new Date(personalizationData.startTime),
        endTime: new Date(personalizationData.endTime),
        userId: userId,
        sessionId: sessionId,
        documentName: personalizationData.materialName || '',
      },
    );
  }
}
