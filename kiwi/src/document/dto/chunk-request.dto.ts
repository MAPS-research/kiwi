import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentResponse } from './file-upload.dto';

export class ChunkRequest {
  @ApiProperty()
  id: string;
}

export class ChunkQueueRequest {
  @ApiProperty()
  jobId: string;
}

export class ChunkResponse {
  @ApiProperty()
  message: string;
  @ApiProperty({ type: DocumentResponse })
  document: DocumentResponse;
}

export class ChunkQueueResponse {
  @ApiProperty()
  message: string;
  @ApiProperty()
  jobId: string;
}

export class ChunkStatusResponse {
  @ApiProperty()
  message: string;
  @ApiProperty()
  id: string;
  @ApiProperty()
  result: ChunkResponse;
}

export class ChunkDeleteRequest {
  @ApiProperty()
  documentId: string;

  @ApiProperty()
  chunkId: string;
}

export class Chunk {
  @ApiProperty({ description: 'Unique element ID for the chunk' })
  element_id: string;

  @ApiProperty({ description: 'Field name identifier' })
  fieldName: string;

  @ApiProperty({ description: 'Text content of the chunk', required: false })
  text?: string;

  @ApiProperty({
    description: 'Chunk type (e.g., "text", "image", "table")',
    required: false,
  })
  type?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the chunk',
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, any>;
}

export class ChunkEditRequest {
  @ApiProperty()
  documentId: string;
  @ApiProperty()
  chunkId: string;
  @ApiProperty()
  fieldName: string;
  @ApiProperty({ type: Chunk })
  newValue: Chunk;
}

export class ChunkEditResponse {
  @ApiProperty()
  message: string;
}
