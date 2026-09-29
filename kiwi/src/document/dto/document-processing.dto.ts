import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentRole } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class MaterialDocumentUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiPropertyOptional({
    enum: ['STUDENT', 'ANSWER', 'REFERENCE'],
    description:
      'What this file is for the material. Omitted falls back to the ' +
      'positional default: first upload is the student copy, a second one is ' +
      "the recitation's answer key, the rest are reference material.",
  })
  @IsOptional()
  @IsEnum(['STUDENT', 'ANSWER', 'REFERENCE'])
  role?: DocumentRole;
}

export class DocumentProcessingStatusResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty({ enum: ['STUDENT', 'ANSWER', 'REFERENCE'] })
  role: DocumentRole;

  @ApiProperty({ enum: ['PENDING', 'PROCESSING', 'READY', 'FAILED'] })
  processingStatus: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'chunking | describing | embedding while PROCESSING.',
  })
  processingStage: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  processingError: string | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  processedAt: Date | null;
}

export class QueuedDocumentResponse {
  @ApiProperty()
  documentId: string;

  @ApiProperty({ type: String, nullable: true })
  jobId: string | null;

  @ApiProperty({ enum: ['PENDING', 'PROCESSING', 'READY', 'FAILED'] })
  processingStatus: string;
}

export class DocumentReplaceDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}
