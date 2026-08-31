import { ApiProperty } from '@nestjs/swagger';

export class ClassRosterRequest {
  @ApiProperty()
  classId: string;
}

export class Student {
  @ApiProperty()
  userId: string;
  @ApiProperty()
  role: string;
  @ApiProperty()
  researchNotes: string;
  @ApiProperty()
  email: string;
}

export class ClassRosterResponse {
  @ApiProperty()
  classId: string;
  @ApiProperty({ type: [Student] })
  users: Student[];
}

export class SetSelectedClassRequest {
  @ApiProperty()
  classId: string;
}

export class SetSelectedClassResponse {
  @ApiProperty()
  message: string;
}
