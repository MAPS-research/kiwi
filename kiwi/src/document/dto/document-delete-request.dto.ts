import { ApiProperty } from '@nestjs/swagger';

export class DocumentDeleteRequestDto {
  @ApiProperty()
  documentId: string;
}
