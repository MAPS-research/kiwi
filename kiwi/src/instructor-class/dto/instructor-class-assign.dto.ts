import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsObject, IsOptional } from 'class-validator';

export class InstructorPermissions {
  @ApiProperty({ default: true })
  canManageMaterials: boolean;

  @ApiProperty({ default: true })  
  canViewAnalytics: boolean;
}

export class AssignInstructorToClassDto {
  @ApiProperty()
  @IsString()
  classId: string;

  @ApiProperty()
  @IsEmail()
  userEmail: string;

  @ApiProperty({ type: InstructorPermissions })
  @IsObject()
  permissions: InstructorPermissions;

  @ApiProperty({ required: false, default: 'instructor' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class AssignInstructorToClassResponse {
  @ApiProperty()
  message: string;

  @ApiProperty()
  instructorClassId: string;
}

export class UpdateInstructorPermissionsDto {
  @ApiProperty()
  @IsString()
  classId: string;

  @ApiProperty()
  @IsEmail()
  userEmail: string;

  @ApiProperty({ type: InstructorPermissions })
  @IsObject()
  permissions: InstructorPermissions;
}

export class UpdateInstructorPermissionsResponse {
  @ApiProperty()
  message: string;

  @ApiProperty()
  instructorClassId: string;
}

export class InstructorClassAssignmentInfo {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  role: string;

  @ApiProperty({ type: InstructorPermissions })
  permissions: InstructorPermissions;

  @ApiProperty()
  assignedAt: Date;
}

export class ListInstructorsForClassResponse {
  @ApiProperty({ type: [InstructorClassAssignmentInfo] })
  instructors: InstructorClassAssignmentInfo[];
}

export class MyInstructorPermissionsResponse {
  @ApiProperty()
  isAssigned: boolean;

  @ApiProperty({ type: InstructorPermissions, required: false })
  permissions?: InstructorPermissions;
}