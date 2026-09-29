import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response for top token users endpoint
 */
export class TopTokenUser {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiProperty({ description: 'Total tokens used' })
  tokensUsed: number;

  @ApiProperty({ description: 'Number of sessions' })
  sessionCount: number;
}

export class TopTokenUsersResponse {
  @ApiProperty({
    type: [TopTokenUser],
    description: 'List of top users by token usage',
  })
  users: TopTokenUser[];

  @ApiProperty({ description: 'Total number of users returned' })
  count: number;
}

/**
 * Request DTO for user token usage endpoint
 */
export class UserTokenUsageRequest {
  @ApiProperty({ description: 'User ID to get token usage for' })
  userId: string;
}

/**
 * Token usage detail by session
 */
export class SessionTokenUsage {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Session start timestamp' })
  startTime: Date;

  @ApiProperty({ description: 'Session end timestamp', required: false })
  endTime?: Date;

  @ApiProperty({ description: 'Tokens used in this session' })
  tokensUsed: number;

  @ApiProperty({ description: 'Number of interactions in session' })
  interactionCount: number;
}

/**
 * Response for user token usage details endpoint
 */
export class UserTokenUsageResponse {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'Total tokens used across all sessions' })
  totalTokens: number;

  @ApiProperty({
    type: [SessionTokenUsage],
    description: 'Token usage broken down by session',
  })
  sessions: SessionTokenUsage[];

  @ApiProperty({ description: 'Number of sessions' })
  sessionCount: number;
}

/**
 * Request DTO for the agent-loop usage/cost endpoints. Every field is an
 * optional filter; with none supplied the aggregate covers all recorded turns.
 */
export class LlmUsageRequest {
  @ApiPropertyOptional({
    description: 'Only count turns at or after this ISO timestamp',
    example: '2026-01-01T00:00:00.000Z',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Only count turns at or before this ISO timestamp',
    example: '2026-02-01T00:00:00.000Z',
  })
  endDate?: string;

  @ApiPropertyOptional({ description: 'Restrict to one class' })
  classId?: string;

  @ApiPropertyOptional({ description: 'Restrict to one user' })
  userId?: string;

  @ApiPropertyOptional({
    description:
      'Maximum rows to return, ranked by total tokens (default 20, max 200)',
    default: 20,
  })
  limit?: number;
}

/**
 * Money side of an aggregate. USD fields are null when nothing in the group
 * could be priced — an unpriced model must never read as a free one.
 */
export class LlmCost {
  @ApiProperty({
    description: 'Cost of fresh (uncached) input tokens, USD',
    nullable: true,
  })
  inputUsd: number | null;

  @ApiProperty({
    description: 'Cost of cache-hit input tokens, USD',
    nullable: true,
  })
  cachedInputUsd: number | null;

  @ApiProperty({
    description: 'Cost of completion tokens (visible + reasoning), USD',
    nullable: true,
  })
  outputUsd: number | null;

  @ApiProperty({ description: 'Total cost, USD', nullable: true })
  totalUsd: number | null;

  @ApiProperty({
    description:
      'False when at least one turn used a model with no price entry, so the total understates the real cost',
  })
  complete: boolean;

  @ApiProperty({
    type: [String],
    description:
      'Models in this group that have no price entry (add them via LLM_MODEL_PRICING)',
  })
  unpricedModels: string[];
}

/**
 * Token totals for a group of `agent-loop-complete` turns.
 */
export class LlmUsageAggregate {
  @ApiProperty({ description: 'Number of completed agent turns' })
  turns: number;

  @ApiProperty({ description: 'Total prompt (input) tokens' })
  promptTokens: number;

  @ApiProperty({
    description: 'Prompt tokens served from the provider prompt cache',
  })
  cachedTokens: number;

  @ApiProperty({
    description:
      'Prompt tokens that were not cached and billed at the full rate',
  })
  freshInputTokens: number;

  @ApiProperty({
    description: 'Completion (output) tokens, reasoning tokens included',
  })
  completionTokens: number;

  @ApiProperty({
    description: 'Reasoning tokens, a subset of completionTokens',
  })
  reasoningTokens: number;

  @ApiProperty({
    description: 'Prompt + completion tokens as reported by the engine',
  })
  totalTokens: number;

  @ApiProperty({
    description:
      'cachedTokens / promptTokens, token-weighted across the group (0-1)',
  })
  cacheHitRate: number;

  @ApiProperty({
    type: [String],
    description: 'Models the group was billed against',
  })
  models: string[];

  @ApiProperty({ type: LlmCost, description: 'Split-rate cost for this group' })
  cost: LlmCost;
}

export class UserLlmUsage extends LlmUsageAggregate {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User email address' })
  email: string;
}

export class UserLlmUsageResponse {
  @ApiProperty({
    type: [UserLlmUsage],
    description: 'Per-user usage and cost, highest tokens first',
  })
  users: UserLlmUsage[];

  @ApiProperty({ description: 'Number of users returned' })
  count: number;

  @ApiProperty({
    type: LlmUsageAggregate,
    description: 'Totals across the returned rows',
  })
  totals: LlmUsageAggregate;
}

export class ConversationLlmUsage extends LlmUsageAggregate {
  @ApiProperty({
    description:
      'Conversation/thread id — the interaction stringTag, falling back to the interaction id when it is empty',
  })
  conversationId: string;

  @ApiProperty({ description: 'User the conversation belongs to' })
  userId: string;

  @ApiProperty({ description: 'Timestamp of the first counted turn' })
  firstTurnAt: Date;

  @ApiProperty({ description: 'Timestamp of the last counted turn' })
  lastTurnAt: Date;
}

export class ConversationLlmUsageResponse {
  @ApiProperty({
    type: [ConversationLlmUsage],
    description: 'Per-conversation usage and cost, highest tokens first',
  })
  conversations: ConversationLlmUsage[];

  @ApiProperty({ description: 'Number of conversations returned' })
  count: number;

  @ApiProperty({
    type: LlmUsageAggregate,
    description: 'Totals across the returned rows',
  })
  totals: LlmUsageAggregate;
}
