import { ApiProperty } from '@nestjs/swagger';

export class DescribeResponse {
  @ApiProperty()
  message: string;
}
