import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEmail,
  IsDateString,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum EmailStatus {
  SENT = 'sent',
  FAILED = 'failed',
  TEST_MODE = 'test_mode',
}

export enum EmailType {
  DIRECT = 'direct',
  TEMPLATE = 'template',
  CLASS_ANNOUNCEMENT = 'class_announcement',
  ADMIN_NOTIFICATION = 'admin_notification',
  WELCOME = 'welcome',
}

export class EmailAuditLogDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  fromEmail: string;

  @ApiProperty({ type: [String] })
  toEmails: string[];

  @ApiProperty()
  subject: string;

  @ApiProperty({ enum: EmailType })
  emailType: string;

  @ApiPropertyOptional()
  templateName?: string | null;

  @ApiProperty({ enum: EmailStatus })
  status: string;

  @ApiPropertyOptional()
  errorMessage?: string | null;

  @ApiPropertyOptional()
  userId?: string | null;

  @ApiPropertyOptional()
  classId?: string | null;

  @ApiPropertyOptional()
  messageId?: string | null;

  @ApiPropertyOptional()
  metadata?: any;

  @ApiPropertyOptional()
  user?: any;

  @ApiPropertyOptional()
  class?: any;
}

export class ListEmailAuditLogsDto {
  @ApiPropertyOptional({ enum: EmailStatus })
  @IsOptional()
  @IsEnum(EmailStatus)
  status?: EmailStatus;

  @ApiPropertyOptional({ enum: EmailType })
  @IsOptional()
  @IsEnum(EmailType)
  emailType?: EmailType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  skip?: number = 0;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  take?: number = 20;
}

export class EmailAuditLogsResponseDto {
  @ApiProperty({ type: [EmailAuditLogDto] })
  logs: EmailAuditLogDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  skip: number;

  @ApiProperty()
  take: number;
}

export class EmailStatsDto {
  @ApiProperty()
  totalSent: number;

  @ApiProperty()
  totalFailed: number;

  @ApiProperty()
  totalTestMode: number;

  @ApiProperty({ type: [Object] })
  byEmailType: { emailType: string; count: number }[];
}

export class GetEmailStatsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  classId?: string;
}
