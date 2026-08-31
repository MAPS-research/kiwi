import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EmailTemplate {
  CLASS_ANNOUNCEMENT = 'classAnnouncement',
  ADMIN_NOTIFICATION = 'adminNotification',
  WELCOME = 'welcome',
}

// Template-specific data DTOs
export class ClassAnnouncementData {
  @ApiProperty({ description: 'Class name' })
  @IsString()
  @IsNotEmpty()
  className: string;

  @ApiProperty({ description: 'Announcement message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Professor name', required: false })
  @IsOptional()
  @IsString()
  professorName?: string;
}

export class AdminNotificationData {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class WelcomeEmailData {
  @ApiProperty({ description: 'User name' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({ description: 'Class name', required: false })
  @IsOptional()
  @IsString()
  className?: string;
}

export class SendTemplatedEmailDto {
  @ApiProperty({
    description: 'Email recipients',
    example: ['user1@example.com', 'user2@example.com'],
    type: [String],
  })
  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];

  @ApiProperty({
    description: 'Email template to use',
    enum: EmailTemplate,
    example: EmailTemplate.CLASS_ANNOUNCEMENT,
  })
  @IsEnum(EmailTemplate)
  template: EmailTemplate;

  @ApiProperty({
    description: 'Template data based on the selected template',
    example: {
      className: 'Introduction to Computer Science',
      message: 'Class will be held online this week.',
      professorName: 'Dr. Smith',
    },
  })
  @IsObject()
  @IsNotEmpty()
  templateData: any;

  @ApiProperty({
    description: 'Optional override for email subject',
    required: false,
  })
  @IsOptional()
  @IsString()
  subjectOverride?: string;
}

export class SendClassAnnouncementDto {
  @ApiProperty({
    description: 'Class ID to send announcement to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({
    description: 'Announcement data',
    type: () => ClassAnnouncementData,
  })
  @ValidateNested()
  @Type(() => ClassAnnouncementData)
  @IsNotEmpty()
  data: ClassAnnouncementData;

  @ApiProperty({
    description: 'Optional override for email subject',
    required: false,
  })
  @IsOptional()
  @IsString()
  subjectOverride?: string;
}
