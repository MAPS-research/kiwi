import { ApiProperty } from '@nestjs/swagger';

export class PageChangeRequest {
  @ApiProperty()
  pageNum: number;
  @ApiProperty()
  documentId: string;
}
