import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * One assembled message, described.
 *
 * `content` is omitted unless the caller is an admin and explicitly asked for
 * it — the blocks contain course material and student conversation text.
 */
export class ContextBlockDto {
  @ApiProperty({ description: 'Position in the messages array sent to the model' })
  index: number;

  @ApiProperty({ enum: ['system', 'user', 'assistant', 'tool'] })
  role: string;

  @ApiProperty({
    description: 'Which part of the prompt this message is',
    example: 'page-context',
  })
  label: string;

  @ApiProperty({
    enum: ['stable', 'history', 'volatile', 'current'],
    description:
      'How long this block survives across turns. Anything volatile placed before the history truncates the provider-cacheable prefix at that point.',
  })
  tier: string;

  @ApiProperty({ description: 'Character count' })
  chars: number;

  @ApiProperty({
    description:
      'Heuristic token estimate (~3.6 chars/token + per-message overhead). Comparative, not billable.',
  })
  estTokens: number;

  @ApiPropertyOptional({
    description: 'Short fingerprint, for spotting which block changed between turns',
  })
  hash?: string;

  @ApiPropertyOptional({
    description: 'Raw block text. Admin-only, and only when includeContent=true.',
  })
  content?: string;
}

export class ContextTotalsDto {
  @ApiProperty() blocks: number;
  @ApiProperty() chars: number;
  @ApiProperty() estTokens: number;

  @ApiProperty({
    description:
      'Estimated tokens in the stable tier — the part a provider prompt cache can reuse. Must clear the engine minimum (~1,024 tokens on OpenAI, ~256 on most Qwen models) to cache at all.',
  })
  stableEstTokens: number;

  @ApiProperty({ description: 'Estimated tokens in replayed history' })
  historyEstTokens: number;

  @ApiProperty({ description: 'Estimated tokens re-derived every turn' })
  volatileEstTokens: number;
}

export class ContextPreviewResponse {
  @ApiProperty({ type: [ContextBlockDto] })
  blocks: ContextBlockDto[];

  @ApiProperty({
    type: [String],
    description:
      'Tool names in the order they are sent. Part of the cached prefix on OpenAI, so a reordered list is a cache miss even when every message is byte-identical.',
  })
  toolNames: string[];

  @ApiProperty({
    description:
      'Fingerprint of the stable tier plus the tool list. Compare across turns of one conversation: when it changes, the prompt cache missed.',
  })
  prefixHash: string;

  @ApiProperty({ type: ContextTotalsDto })
  totals: ContextTotalsDto;
}
