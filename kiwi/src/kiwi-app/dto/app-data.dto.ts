import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsIn,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  MaxLength,
} from 'class-validator';

// ===========================================================================
// #218 — get class document chunks (GET query)
// ===========================================================================

export class DocumentChunksQueryDto {
  @ApiPropertyOptional({
    description: 'Comma-separated document IDs to restrict to (default: all)',
    example: 'doc-1,doc-2',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];

  @ApiPropertyOptional({
    description: 'Opaque cursor from a previous response',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Max chunks per page across documents (default 50)',
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class AppChunkDto {
  @ApiProperty() chunkId: string;
  @ApiProperty() index: number;
  @ApiProperty({ nullable: true, type: Number }) pageNumber: number | null;
  @ApiProperty() type: string;
  @ApiProperty() text: string;
}

export class AppDocumentChunksDto {
  @ApiProperty() documentId: string;
  @ApiProperty() fileName: string;
  @ApiProperty() totalChunks: number;
  @ApiProperty({ type: [AppChunkDto] }) chunks: AppChunkDto[];
}

export class ClassDocumentChunksResponseDto {
  @ApiProperty() classId: string;
  @ApiProperty({ type: [AppDocumentChunksDto] })
  documents: AppDocumentChunksDto[];
  @ApiProperty({ nullable: true, type: String }) nextCursor: string | null;
  @ApiProperty() hasMore: boolean;
}

// ===========================================================================
// #217 — contextual chat (POST body)
// ===========================================================================

const INCLUDE_VALUES = [
  'recent_questions',
  'weak_concepts',
  'relevant_materials',
] as const;

export class ContextRequestDto {
  @ApiProperty({ enum: ['student_learning_context'] })
  @IsIn(['student_learning_context'])
  kind: 'student_learning_context';

  @ApiProperty({ enum: ['current_user_current_class'] })
  @IsIn(['current_user_current_class'])
  scope: 'current_user_current_class';

  @ApiPropertyOptional({ minimum: 1, maximum: 90, default: 14 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  timeWindowDays?: number;

  @ApiProperty({ type: [String], enum: INCLUDE_VALUES })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(INCLUDE_VALUES, { each: true })
  include: (typeof INCLUDE_VALUES)[number][];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  retrievalQuery?: string;
}

export class ContextualChatRequestDto {
  @ApiProperty({ description: "ID of the app's admin-approved prompt" })
  @IsString()
  @IsNotEmpty()
  promptId: string;

  @ApiPropertyOptional({ maxLength: 8000 })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  userMessage?: string;

  @ApiProperty({ type: ContextRequestDto })
  @ValidateNested()
  @Type(() => ContextRequestDto)
  contextRequest: ContextRequestDto;

  @ApiPropertyOptional({
    type: Object,
    description: 'Optional JSON Schema (root type "object") for the output',
  })
  @IsOptional()
  @IsObject()
  outputSchema?: Record<string, any>;
}

export class ContextualChatResponseDto {
  @ApiProperty({
    description: 'The LLM output (a JSON string if outputSchema was given)',
  })
  output: string;
  @ApiProperty() promptId: string;
  @ApiProperty() promptName: string;
  @ApiProperty({ type: [String] }) contextIncluded: string[];
  @ApiProperty({ type: [String] }) contextOmitted: string[];
}
