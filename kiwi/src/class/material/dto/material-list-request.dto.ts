import { ApiProperty } from '@nestjs/swagger';

export class MaterialListRequest {
  @ApiProperty()
  classId: string;
}

class Material {
  @ApiProperty()
  id: string;

  @ApiProperty()
  materialType: string;

  @ApiProperty()
  availableDate: Date;
}

export class MaterialListResponse {
  @ApiProperty({ type: [Material] })
  materials: Material[];
}

class DocumentForListing {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  updatedDate: Date;

  // For listing, we return a signed URL (string), not a Multer file object
  @ApiProperty({
    type: 'string',
    description: 'Signed URL to download/view the file',
  })
  file: string;

  // using flags instead of enum role
  @ApiProperty({
    description: 'Is this the student-visible document for the material?',
  })
  isStudent: boolean;

  @ApiProperty({
    description: 'Should this document be included in LLM retrieval?',
  })
  isLlm: boolean;
}

export class DocumentListResponse {
  @ApiProperty({ type: [DocumentForListing] })
  documents: DocumentForListing[];
}
