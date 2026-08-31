import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiTokenResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the API token',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Human-readable name for the API token',
    example: 'Production Webhook Token',
  })
  name: string;

  @ApiProperty({
    description: 'ID of the associated webhook',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  webhookId: string;

  @ApiProperty({
    description: 'Permission scopes granted to this token',
    example: ['webhook:receive'],
    isArray: true,
    type: String,
  })
  scopes: string[];

  @ApiProperty({
    description: 'Whether the token is currently active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Timestamp when the token was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the token expires',
    example: '2025-01-01T00:00:00Z',
  })
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Last time the token was used',
    example: '2024-01-01T12:00:00Z',
  })
  lastUsedAt?: string;

  @ApiPropertyOptional({
    description:
      'The raw token value (only returned when creating a new token)',
    example: 'tok_1234567890abcdef1234567890abcdef',
  })
  token?: string;
}

export class WebhookInfoDto {
  @ApiProperty({
    description: 'Webhook ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Webhook URL path',
    example: '/webhooks/webhook/550e8400-e29b-41d4-a716-446655440000',
  })
  url: string;

  @ApiProperty({
    description: 'Events the webhook is subscribed to',
    example: ['user.created', 'class.enrollment'],
    isArray: true,
    type: String,
  })
  events: string[];
}

export class ApiTokenWithWebhookDto extends ApiTokenResponseDto {
  @ApiPropertyOptional({
    description: 'Associated webhook information',
    type: () => WebhookInfoDto,
  })
  webhook?: WebhookInfoDto;
}

export class DeleteApiTokenResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'API token deleted successfully',
  })
  message: string;
}
