import { ApiProperty } from '@nestjs/swagger';

export class EmailRecipient {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'User email',
    example: 'student@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    example: 'student',
  })
  role?: string;
}

export class ClassEmailRecipients {
  @ApiProperty({
    description: 'Class ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  classId: string;

  @ApiProperty({
    description: 'Class name',
    example: 'Introduction to Computer Science',
  })
  className: string;

  @ApiProperty({
    description: 'List of recipients in the class',
    type: [EmailRecipient],
  })
  recipients: EmailRecipient[];

  @ApiProperty({
    description: 'Total number of recipients',
    example: 30,
  })
  totalRecipients: number;
}

export class AllUsersEmailResponse {
  @ApiProperty({
    description: 'List of all user emails',
    type: [EmailRecipient],
  })
  users: EmailRecipient[];

  @ApiProperty({
    description: 'Total number of users',
    example: 150,
  })
  totalUsers: number;
}

export class ProfessorClassesResponse {
  @ApiProperty({
    description: 'List of classes the professor teaches',
    type: [ClassEmailRecipients],
  })
  classes: ClassEmailRecipients[];

  @ApiProperty({
    description: 'Total number of classes',
    example: 3,
  })
  totalClasses: number;
}
