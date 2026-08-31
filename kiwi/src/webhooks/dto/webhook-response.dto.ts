import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebhookResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the webhook',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Webhook endpoint URL path',
    example: '/webhooks/webhook/550e8400-e29b-41d4-a716-446655440000',
  })
  url: string;

  @ApiProperty({
    description: 'List of events this webhook is subscribed to',
    example: ['user.created', 'class.enrollment'],
    isArray: true,
    type: String,
  })
  events: string[];

  @ApiProperty({
    description: 'Whether the webhook is currently active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Timestamp when the webhook was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the webhook was last updated',
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt?: string;

  @ApiPropertyOptional({
    description: 'Webhook secret (only returned on creation)',
    example: 'whsec_1234567890abcdef',
  })
  secret?: string;
}

export class ApiTokenInfoDto {
  @ApiProperty({
    description: 'API token ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'API token name',
    example: 'Production Webhook Token',
  })
  name: string;

  @ApiProperty({
    description: 'Whether the API token is active',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Last time the API token was used',
    example: '2024-01-01T00:00:00Z',
  })
  lastUsedAt?: string;
}

export class WebhookStatsDto {
  @ApiProperty({
    description: 'Total number of webhook deliveries',
    example: 42,
  })
  deliveries: number;
}

export class WebhookWithTokenDto extends WebhookResponseDto {
  @ApiPropertyOptional({
    description: 'Associated API token information',
    type: () => ApiTokenInfoDto,
  })
  apiToken?: ApiTokenInfoDto;

  @ApiPropertyOptional({
    description: 'Statistics about webhook deliveries',
    type: () => WebhookStatsDto,
  })
  _count?: WebhookStatsDto;
}

export class WebhookEventResponseDto {
  @ApiProperty({
    description: 'Status message',
    example: 'Webhook event received and queued for processing',
  })
  message: string;

  @ApiProperty({
    description: 'Delivery ID for tracking',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  deliveryId: string;
}

export class WebhookDeliveryDto {
  @ApiProperty({
    description: 'Delivery ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Event type',
    example: 'user.created',
  })
  eventType: string;

  @ApiProperty({
    description: 'Event payload',
    example: { user: { id: '123', email: 'user@example.com' } },
  })
  payload: any;

  @ApiProperty({
    description: 'Delivery status',
    example: 'success',
    enum: ['pending', 'success', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: 'Number of delivery attempts',
    example: 1,
  })
  attempts: number;

  @ApiProperty({
    description: 'Timestamp when the delivery was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Response from the webhook endpoint',
    example: { message: 'Webhook processed successfully' },
  })
  response?: any;
}

export class DeleteWebhookResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Webhook deleted successfully',
  })
  message: string;
}

export class TriggerTestEventResponseDto {
  @ApiProperty({
    description: 'Event type that was triggered',
    example: 'test.event',
  })
  event: string;

  @ApiProperty({
    description: 'Number of webhooks that were triggered',
    example: 3,
  })
  webhooksTriggered: number;
}
