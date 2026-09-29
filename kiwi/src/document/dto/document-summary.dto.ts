import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AnnotationAudience } from '@prisma/client';

export class CreateDocumentSummaryDto {
  @ApiProperty({ description: 'Summary content for the document.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Whether the summary is visible to students.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isVisibleToStudents?: boolean;

  @ApiPropertyOptional({
    enum: ['STUDENT', 'TUTOR', 'STAFF'],
    description:
      'Who the note is for. STUDENT is shown to students and read by the ' +
      'tutor, TUTOR is read by the tutor only, STAFF never enters a prompt. ' +
      'Wins over isVisibleToStudents when both are sent.',
  })
  @IsOptional()
  @IsEnum(['STUDENT', 'TUTOR', 'STAFF'])
  audience?: AnnotationAudience;
}

export class UpdateDocumentSummaryDto {
  @ApiPropertyOptional({ description: 'Summary content.' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Whether the summary should be visible to students.' })
  @IsOptional()
  @IsBoolean()
  isVisibleToStudents?: boolean;

  @ApiPropertyOptional({
    enum: ['STUDENT', 'TUTOR', 'STAFF'],
    description:
      'Who the note is for. STUDENT is shown to students and read by the ' +
      'tutor, TUTOR is read by the tutor only, STAFF never enters a prompt. ' +
      'Wins over isVisibleToStudents when both are sent.',
  })
  @IsOptional()
  @IsEnum(['STUDENT', 'TUTOR', 'STAFF'])
  audience?: AnnotationAudience;
}

class DocumentSummaryAuthorDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ description: 'Display name derived from instructor profile.' })
  name?: string;

  @ApiPropertyOptional()
  email?: string;
}

export class DocumentSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty()
  summaryNumber: number;

  @ApiProperty()
  content: string;

  @ApiProperty({ description: 'Whether the summary is visible to students.' })
  isVisibleToStudents: boolean;

  @ApiProperty({
    enum: ['STUDENT', 'TUTOR', 'STAFF'],
    description: 'Who the note is for.',
  })
  audience: AnnotationAudience;

  @ApiProperty()
  authorId: string;

  @ApiProperty({ type: DocumentSummaryAuthorDto })
  author: DocumentSummaryAuthorDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DocumentSummaryResponse {
  @ApiProperty({ type: DocumentSummaryDto })
  summary: DocumentSummaryDto;
}

export class DocumentSummaryListResponse {
  @ApiProperty({ type: [DocumentSummaryDto] })
  summaries: DocumentSummaryDto[];
}

export class DeleteDocumentSummaryResponse {
  @ApiProperty({ description: 'Identifier of the deleted summary.' })
  id: string;
}
