import { ApiProperty } from '@nestjs/swagger';

export class ClassEnrollDeleteRequest {
  @ApiProperty()
  studentIds: string[];
  @ApiProperty()
  classId: string;
}
