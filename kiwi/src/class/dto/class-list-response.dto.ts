import { ApiProperty } from '@nestjs/swagger';

export class ClassListResponse {
  @ApiProperty()
  classIds: string[];
}
