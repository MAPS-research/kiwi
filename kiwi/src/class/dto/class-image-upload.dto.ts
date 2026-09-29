import { ApiProperty } from '@nestjs/swagger';

export class ClassImageUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

export class ClassImageUploadResponse {
  @ApiProperty({
    description:
      'Storage key to send back as `classDetails.imageSnippetUrl` when the ' +
      'class is created or updated. The read paths swap it for a signed URL.',
  })
  key: string;

  @ApiProperty()
  fileName: string;
}
