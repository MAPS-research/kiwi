import { ApiProperty } from '@nestjs/swagger';
import { MaterialType } from 'src/class/material/dto/material-enum';
import { Chunk } from './chunk-request.dto';

class Document {
  @ApiProperty({ description: 'Document ID' })
  id: string;

  @ApiProperty({ description: 'Original file name' })
  fileName: string;

  @ApiProperty({
    description: 'Parsed document chunks',
    type: [Chunk],
    required: false,
  })
  chunks?: Chunk[];

  @ApiProperty({ description: 'Full document text content' })
  documentContent: string;
}

class DocumentForListing {
  @ApiProperty()
  id: string;
  @ApiProperty()
  fileName: string;
  @ApiProperty()
  updatedDate: Date;
  @ApiProperty({ type: 'string' })
  file: Express.Multer.File;
}

export class GetDocumentResponse {
  @ApiProperty()
  message: string;
  @ApiProperty()
  document: Document;
}

export class DocumentListResponse {
  @ApiProperty({ type: [DocumentForListing] })
  documents: DocumentForListing[];
}

class DocumentForChat {
  @ApiProperty()
  id: string;
  @ApiProperty()
  fileName: string;
  @ApiProperty()
  materialType: MaterialType;
  @ApiProperty({ type: 'string' })
  file: Express.Multer.File;
  @ApiProperty({ description: 'Professor-chosen student-visible doc' })
  isStudent: boolean;
  @ApiProperty({ description: 'Included in LLM retrieval' })
  isLlm: boolean;
}

export class DocumentChatResponse {
  @ApiProperty({ type: [DocumentForChat] })
  documents: DocumentForChat[];
}

class DocumentIdsForChat {
  @ApiProperty()
  id: string;
  @ApiProperty()
  fileName: string;
  @ApiProperty()
  materialType: MaterialType;
  @ApiProperty({ description: 'Professor-chosen student-visible doc' })
  isStudent: boolean;
  @ApiProperty({ description: 'Included in LLM retrieval' })
  isLlm: boolean;
}

export class DocumentIdsChatResponse {
  @ApiProperty({ type: [DocumentIdsForChat] })
  documentIds: DocumentIdsForChat[];
}
