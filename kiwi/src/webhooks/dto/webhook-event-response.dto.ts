import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebhookEventResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the webhook event',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'The webhook endpoint that received this event',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  webhookId: string;

  @ApiProperty({
    description: 'Type of event',
    example: 'user.enroll',
  })
  eventType: string;

  @ApiProperty({
    description: 'Event payload data',
    example: { email: 'student@example.com', classId: 'class-123' },
  })
  payload: any;

  @ApiProperty({
    description: 'Current status of the event',
    enum: ['pending', 'approved', 'rejected', 'executed', 'failed'],
    example: 'pending',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'User ID who approved/rejected the event',
    example: 'user-123',
  })
  approvedBy?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the event was approved/rejected',
    example: '2024-01-01T00:00:00Z',
  })
  approvedAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when the event was executed',
    example: '2024-01-01T00:00:00Z',
  })
  executedAt?: Date;

  @ApiPropertyOptional({
    description: 'Error message if execution failed',
    example: 'User not found',
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'Timestamp when the event was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the event was last updated',
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt: Date;
}

export class ApproveWebhookEventResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Event approved and executed successfully',
  })
  message: string;
}

export class PendingWebhookEventsResponseDto {
  @ApiProperty({
    description: 'List of pending webhook events',
    type: [WebhookEventResponseDto],
  })
  events: WebhookEventResponseDto[];

  @ApiProperty({
    description: 'Total number of pending events',
    example: 5,
  })
  total: number;
}
