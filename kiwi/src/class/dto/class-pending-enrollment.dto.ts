import { ApiProperty } from '@nestjs/swagger';

export class ClassPendingEnrollmentRequest {
  @ApiProperty()
  classId: string;
}

export class PendingUser {
  @ApiProperty()
  id: string;
  @ApiProperty()
  userEmail: string;
  @ApiProperty()
  role?: string;
  @ApiProperty()
  status?: string;
}

export class ClassPendingEnrollmentResponse {
  @ApiProperty()
  classId: string;
  @ApiProperty({ type: [PendingUser] })
  pendingUsers: PendingUser[];
}

export class ClassDeletePendingEnrollmentRequest {
  @ApiProperty()
  pendingUserIds: string[];
  @ApiProperty()
  classId: string;
}
