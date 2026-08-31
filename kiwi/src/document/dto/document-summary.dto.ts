import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
