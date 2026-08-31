import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MaterialPersonalizationService } from 'src/student/material-personalization/material-personalization.service';
import { ConversationHistoryService } from 'src/common/context/conversation-history.service';
import { LlmService } from 'src/common/llm/llm.service';
import {
  CONTEXT_QUEUE,
  CompactConversationJobData,
  ContextJobName,
  ExtractPersonalizationJobData,
} from './context-jobs.types';

/**
 * Mirrors the wording of the existing `/student/summary` summariser so a
 * compacted thread reads the same way the manual summaries always did.
 */
const COMPACTION_SYSTEM_PROMPT =
  'You are a summarizer assistant. You will be given the earlier part of a ' +
  'conversation between a student and a learning assistant. Summarise it so the ' +
  'assistant can keep helping without re-reading it: preserve what the student ' +
  'is working on, what they have understood, what they got stuck on, and any ' +
  'facts they stated about themselves or their work. Be concise and factual. ' +
  'Do not answer the questions or add new teaching.';

/** Cap on the summary the model may produce, in tokens. */
const COMPACTION_MAX_TOKENS = 1000;

@Processor(CONTEXT_QUEUE)
export class ContextJobsConsumer extends WorkerHost {
  private readonly logger = new Logger(ContextJobsConsumer.name);

  constructor(
    private materialPersonalizationService: MaterialPersonalizationService,
    private conversationHistoryService: ConversationHistoryService,
    private llmService: LlmService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name as ContextJobName) {
      case 'extractPersonalization':
        return await this.extractPersonalization(
          job.data as ExtractPersonalizationJobData,
        );
      case 'compactConversation':
        return await this.compactConversation(
          job.data as CompactConversationJobData,
        );
      default:
        // Warn rather than throw: during a rolling deploy an older worker can
        // pick up a job name only the newer release knows, and failing it would
        // burn its retries for nothing.
        this.logger.warn(`Unknown context job "${job.name}" - ignoring`);
        return undefined;
    }
  }

  private async extractPersonalization({
    userId,
    userSessionId,
  }: ExtractPersonalizationJobData) {
    this.logger.log(`Extracting personalization for session ${userSessionId}`);

    await this.materialPersonalizationService.saveUserPersonalization(
      userSessionId,
      userId,
    );

    return { userSessionId };
  }

  /**
   * Fold a long thread's oldest turns into a summary.
   *
   * The history service decides *what* may be compacted (it always protects the
   * most recent turns and never deletes anything); this only supplies the
   * summariser and the LLM call, which is the reason the work is queued.
   */
  private async compactConversation({
    userId,
    conversationId,
    engineChoice,
  }: CompactConversationJobData) {
    const result = await this.conversationHistoryService.compact({
      userId,
      conversationId,
      summarize: async (transcript, previousSummary) => {
        const transcriptText = transcript
          .map((turn) => `${turn.role}: ${turn.content}`)
          .join('\n');

        const response = await this.llmService.createChat(
          [
            { role: 'system', content: COMPACTION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: previousSummary
                ? `Summary of the conversation so far:\n${previousSummary}\n\n` +
                  `Newer turns to fold in:\n${transcriptText}`
                : transcriptText,
            },
          ],
          undefined,
          COMPACTION_MAX_TOKENS,
          undefined, // tools
          undefined, // response_format
          // The thread's own engine. `engineChoice` is the SIXTH positional
          // parameter of createChat, so omitting it silently routed every
          // summary to the default engine — a Qwen class's memory was being
          // written by an OpenAI model.
          engineChoice,
        );

        const summary = response.choices[0]?.message?.content?.trim();
        if (!summary) {
          // Persisting an empty summary would silently erase the turns it was
          // supposed to stand in for — fail so the job retries instead.
          throw new Error('Summariser returned no content');
        }
        return summary;
      },
    });

    this.logger.log(
      result.compacted
        ? `Compacted ${result.turnsCovered} turn(s) of thread ${conversationId}`
        : `Nothing to compact for thread ${conversationId}`,
    );

    return result;
  }
}
