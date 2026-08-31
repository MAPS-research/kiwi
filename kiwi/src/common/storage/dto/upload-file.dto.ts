import { ApiProperty } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
  @ApiProperty()
  key: string;
}

export class uploadResponseDto {
  @ApiProperty()
  message: string;
  @ApiProperty()
  status: number;
}

export class streamStatusResponse {
  @ApiProperty()
  status: string;
  @ApiProperty()
  message: string;
  @ApiProperty()
  progress: number;
  @ApiProperty()
  totalSize: number;
  @ApiProperty()
  uploadedSize: number;
}
