import { IsString, IsOptional, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveWidgetStateDto {
  @ApiProperty({
    description: 'App identifier (e.g., "codegen")',
    example: 'codegen',
  })
  @IsString()
  appId: string;

  @ApiProperty({
    description: 'Unique widget instance ID',
    example: 'exercise-widget-abc123',
  })
  @IsString()
  widgetId: string;

  @ApiProperty({
    description: 'Widget state object to persist',
    type: 'object',
    additionalProperties: true,
    example: { code: 'print("hello")', currentTab: 'editor' },
  })
  @IsObject()
  widgetState: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Conversation ID for chat context',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Message ID for specific message context',
  })
  @IsOptional()
  @IsString()
  messageId?: string;

  @ApiPropertyOptional({
    description: 'Class ID for class context',
  })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({
    description: 'Exercise ID for exercise context',
  })
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @ApiPropertyOptional({
    description: 'Exercise set ID for set context',
  })
  @IsOptional()
  @IsString()
  exerciseSetId?: string;

  @ApiPropertyOptional({
    description: 'Display mode',
    enum: ['compact', 'expanded', 'fullscreen'],
    default: 'expanded',
  })
  @IsOptional()
  @IsString()
  displayMode?: 'compact' | 'expanded' | 'fullscreen';
}

export class UpdateWidgetStateDto {
  @ApiProperty({
    description: 'Widget state to merge with existing state',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  widgetState: Record<string, any>;
}

export class WidgetStateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  appId: string;

  @ApiProperty()
  widgetId: string;

  @ApiPropertyOptional()
  conversationId?: string;

  @ApiPropertyOptional()
  messageId?: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  classId?: string;

  @ApiPropertyOptional()
  exerciseId?: string;

  @ApiPropertyOptional()
  exerciseSetId?: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  widgetState: Record<string, any>;

  @ApiProperty({ enum: ['compact', 'expanded', 'fullscreen'] })
  displayMode: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
