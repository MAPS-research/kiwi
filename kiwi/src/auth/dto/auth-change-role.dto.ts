import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';

export class ChangeRoleDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The role to assign to the user',
    enum: ['user', 'admin', 'instructor'],
  })
  @IsIn(['user', 'admin', 'instructor'])
  role: 'user' | 'admin' | 'instructor';
}
