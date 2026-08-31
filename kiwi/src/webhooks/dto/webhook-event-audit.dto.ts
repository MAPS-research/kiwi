import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebhookEventAuditDto {
  @ApiProperty({
    description: 'Unique identifier for the audit record',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the webhook event this audit record belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  webhookEventId: string;

  @ApiProperty({
    description: 'Action performed on the event',
    enum: ['approved', 'rejected'],
    example: 'approved',
  })
  action: string;

  @ApiProperty({
    description: 'User ID who performed the action',
    example: 'user-123',
  })
  performedBy: string;

  @ApiPropertyOptional({
    description: 'Optional reason for the action (typically for rejections)',
    example: 'Invalid class ID provided',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata about the action',
    example: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' },
  })
  metadata?: any;

  @ApiProperty({
    description: 'Timestamp when the action was performed',
    example: '2024-01-01T00:00:00Z',
  })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'User details who performed the action',
    type: 'object',
    example: { id: 'user-123', email: 'admin@example.com' },
  })
  performer?: any;
}

export class WebhookEventAuditHistoryDto {
  @ApiProperty({
    description: 'List of audit records',
    type: [WebhookEventAuditDto],
  })
  audits: WebhookEventAuditDto[];

  @ApiProperty({
    description: 'Total number of audit records',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevious: boolean;
}

export class CreateAuditLogDto {
  @ApiPropertyOptional({
    description: 'Optional reason for the action',
    example: 'User not authorized for this class',
  })
  reason?: string;
}