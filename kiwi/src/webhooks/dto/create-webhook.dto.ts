import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({
    description: 'List of events to subscribe to. Use "*" to subscribe to all events',
    example: ['user.created', 'class.enrollment'],
    isArray: true,
    type: String,
  })
  @IsArray()
  events: string[];

  @ApiPropertyOptional({
    description: 'Optional webhook secret for HMAC signature validation. If not provided, a random secret will be generated',
    example: 'my-webhook-secret-key',
  })
  @IsString()
  @IsOptional()
  secret?: string;
}