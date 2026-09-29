import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AnnotationAudience } from '@prisma/client';

export class CreateDocumentCommentDto {
  @ApiProperty({
    description: 'Page number (0-indexed) where the annotation should appear.',
  })
  @IsInt()
  @Min(0)
  pageNumber: number;

  @ApiProperty({ description: 'Text content for the comment.' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({
    description: 'Whether the comment is visible to students.',
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

  @ApiPropertyOptional({
    description: 'Selection region for the comment highlight.',
  })
  @IsOptional()
  @IsObject()
  selectionRegion?: any;

  @ApiPropertyOptional({ description: 'Pin position for the comment marker.' })
  @IsOptional()
  @IsObject()
  pinPosition?: any;
}

export class UpdateDocumentCommentVisibilityDto {
  @ApiPropertyOptional({
    description: 'Whether the comment should be visible to students.',
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

  @ApiPropertyOptional({ description: 'Comment text.' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'Pin position for the comment marker.' })
  @IsOptional()
  @IsObject()
  pinPosition?: any;
}

class DocumentCommentAuthorDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({
    description: 'Display name derived from instructor profile.',
  })
  name?: string;

  @ApiPropertyOptional()
  email?: string;
}

export class DocumentCommentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty()
  pageNumber: number;

  @ApiProperty()
  text: string;

  @ApiProperty({ description: 'Whether the comment is visible to students.' })
  isVisibleToStudents: boolean;

  @ApiProperty({
    enum: ['STUDENT', 'TUTOR', 'STAFF'],
    description: 'Who the note is for.',
  })
  audience: AnnotationAudience;

  @ApiPropertyOptional({
    description: 'Selection region for the comment highlight.',
  })
  selectionRegion?: any;

  @ApiPropertyOptional({ description: 'Pin position for the comment marker.' })
  pinPosition?: any;

  @ApiProperty()
  authorId: string;

  @ApiProperty({ type: DocumentCommentAuthorDto })
  author: DocumentCommentAuthorDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DocumentCommentResponse {
  @ApiProperty({ type: DocumentCommentDto })
  comment: DocumentCommentDto;
}

export class DocumentCommentListResponse {
  @ApiProperty({ type: [DocumentCommentDto] })
  comments: DocumentCommentDto[];
}

export class DeleteDocumentCommentResponse {
  @ApiProperty({ description: 'Identifier of the deleted comment.' })
  id: string;
}
