import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (max 100)',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by interaction type',
    example: 'exercise_chat',
  })
  @IsOptional()
  @IsString()
  interactionType?: string;

  @ApiPropertyOptional({ description: 'Filter by conversation ID' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Filter messages after this date (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter messages before this date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class ChatHistoryMessageDto {
  @ApiProperty({ description: 'Unique message identifier' })
  id: string;

  @ApiProperty({ description: 'Message role', enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @ApiProperty({ description: 'Message content' })
  content: string;

  @ApiProperty({ description: 'Message timestamp (ISO 8601)' })
  timestamp: string;

  @ApiProperty({ description: 'Conversation ID this message belongs to' })
  conversationId: string;

  @ApiProperty({ description: 'Type of interaction' })
  interactionType: string;

  @ApiPropertyOptional({
    description:
      'True for an intermediate step of a multi-step agent turn (narration emitted before a tool ran), as opposed to the final answer. Clients should collapse these rather than rendering them as separate replies.',
  })
  isIntermediate?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

export class ChatHistoryResponseDto {
  @ApiProperty({
    type: [ChatHistoryMessageDto],
    description: 'List of messages',
  })
  messages: ChatHistoryMessageDto[];

  @ApiProperty({ description: 'Total number of messages' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrevious: boolean;
}
