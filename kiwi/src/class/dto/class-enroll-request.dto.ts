import { ApiProperty } from '@nestjs/swagger';

export class ClassEnrollRequest {
  @ApiProperty()
  classId: string;
  @ApiProperty()
  studentEmails: string[];
}

export class ClassEnrollResponse {
  @ApiProperty()
  classId: string;
}
