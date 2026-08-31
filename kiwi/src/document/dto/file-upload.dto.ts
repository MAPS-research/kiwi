import { ApiProperty } from '@nestjs/swagger';

export class DocumentUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
  @ApiProperty()
  classMaterialId: string;
}

export class DocumentResponse {
  @ApiProperty()
  id: string;
  @ApiProperty()
  fileName: string;
}

export class DocumentUploadResponse {
  @ApiProperty()
  message: string;
  @ApiProperty({ type: DocumentResponse })
  document: DocumentResponse;
}
