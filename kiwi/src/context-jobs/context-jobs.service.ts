import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import {
  CONTEXT_QUEUE,
  ContextJobName,
  ContextJobPayloads,
  CompactConversationJobData,
  ExtractPersonalizationJobData,
} from './context-jobs.types';

/**
 * Retained long enough to act as a de-duplication window: BullMQ refuses a
 * second job with an already-known `jobId`, so keeping completed jobs for an
 * hour means repeated beacons for one session cannot re-run the extraction.
 */
const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 2,
  backoff: { type: 'exponential', delay: 60_000 },
  removeOnComplete: { age: 3600, count: 500 },
  removeOnFail: { age: 24 * 3600, count: 500 },
};

@Injectable()
export class ContextJobsService {
  private readonly logger = new Logger(ContextJobsService.name);

  constructor(@InjectQueue(CONTEXT_QUEUE) private contextQueue: Queue) {}

  /**
   * Queue an LLM extraction of the student's personalization profile for one
   * ended session. Call this from the session-end (`beacon`) path — never from
   * a chat turn, which must not wait on an LLM call it does not need.
   *
   * Returns the job id, or `null` when the enqueue failed. Failure is logged
   * and swallowed on purpose: a profile refresh is best-effort, and Redis being
   * unavailable must not turn session-end into an error for the student.
   */
  async enqueueProfileExtraction(
    data: ExtractPersonalizationJobData,
  ): Promise<string | null> {
    return this.enqueue('extractPersonalization', data, {
      // One extraction per session. Browsers fire `sendBeacon` on every
      // pagehide, so the same session end arrives several times.
      jobId: `extractPersonalization:${data.userSessionId}`,
    });
  }

  /**
   * Queue compaction of a conversation's oldest turns.
   *
   * Fire-and-forget from the chat path: the turn in flight uses whatever summary
   * already exists and replays the rest verbatim, so it never waits on this. The
   * job only changes what the *next* turn is shown.
   */
  async enqueueConversationCompaction(
    data: CompactConversationJobData,
  ): Promise<string | null> {
    return this.enqueue('compactConversation', data, {
      // Collapse the repeats: every turn past the threshold would otherwise
      // enqueue another compaction of the same thread while the first is still
      // waiting. Also delayed, so a burst of turns settles before summarising.
      jobId: `compactConversation:${data.userId}:${data.conversationId}`,
      delay: 10_000,
    });
  }

  private async enqueue<N extends ContextJobName>(
    name: N,
    data: ContextJobPayloads[N],
    options: JobsOptions = {},
  ): Promise<string | null> {
    try {
      const job = await this.contextQueue.add(name, data, {
        ...DEFAULT_JOB_OPTIONS,
        ...options,
      });
      this.logger.log(`Queued context job ${name} (job ${job.id})`);
      return job.id ?? null;
    } catch (error) {
      this.logger.error(`Failed to queue context job ${name}`, error as Error);
      return null;
    }
  }
}
