/**
 * Shared names and payload shapes for the `context` queue.
 *
 * Context work (profile extraction, conversation compaction) makes LLM calls,
 * so none of it may run on a chat or beacon request. It is queued instead, and
 * the request path only ever pays for the `queue.add`.
 */

export const CONTEXT_QUEUE = 'context';

/** Data for `extractPersonalization`. */
export interface ExtractPersonalizationJobData {
  userId: string;
  /** `UserSession.id` — what `UserInteraction.sessionId` is keyed by. */
  userSessionId: string;
}

/** Data for `compactConversation`. */
export interface CompactConversationJobData {
  userId: string;
  /** Thread key: `UserInteraction.stringTag`, or the interaction id. */
  conversationId: string;
  /**
   * The engine the conversation itself runs on.
   *
   * Carried because a thread's memory should be written by the model that is
   * going to read it. Without it the summarizer fell through to the default
   * engine, so a Qwen-routed class had its long-term memory written by OpenAI —
   * a different model, a different voice, and a bill on an account the class
   * was not otherwise using.
   */
  engineChoice?: 'openai' | 'qwen';
}

/**
 * Every job the consumer knows how to run, keyed by its BullMQ job name.
 *
 * Adding a job means adding one entry here plus one `case` in the consumer.
 */
export interface ContextJobPayloads {
  extractPersonalization: ExtractPersonalizationJobData;
  compactConversation: CompactConversationJobData;
}

export type ContextJobName = keyof ContextJobPayloads;
