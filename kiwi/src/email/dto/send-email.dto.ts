import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class SendEmailDto {
  @ApiProperty({
    description: 'Email recipients',
    example: ['user1@example.com', 'user2@example.com'],
    type: [String],
  })
  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];

  @ApiProperty({
    description: 'Email subject',
    example: 'Important Class Announcement',
  })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({
    description: 'Plain text content',
    example: 'This is an important announcement...',
    required: false,
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({
    description: 'HTML content',
    example:
      '<h1>Important Announcement</h1><p>This is an important announcement...</p>',
    required: false,
  })
  @IsOptional()
  @IsString()
  html?: string;
}

export class SendEmailToClassDto {
  @ApiProperty({
    description: 'Class ID to send email to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  classId: string;

  @ApiProperty({
    description: 'Email subject',
    example: 'Class Update',
  })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({
    description: 'Plain text content',
    example: 'Dear students, here is an important update...',
    required: false,
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({
    description: 'HTML content',
    example: '<h1>Class Update</h1><p>Dear students...</p>',
    required: false,
  })
  @IsOptional()
  @IsString()
  html?: string;
}

export class SendEmailResponse {
  @ApiProperty({
    description: 'Success message',
    example: 'Email sent successfully to 25 recipients',
  })
  message: string;

  @ApiProperty({
    description: 'Number of recipients',
    example: 25,
  })
  recipientCount: number;
}
