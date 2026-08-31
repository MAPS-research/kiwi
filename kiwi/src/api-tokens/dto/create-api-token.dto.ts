import { IsString, IsArray, IsOptional, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateApiTokenDto {
  @ApiProperty({
    description: 'Human-readable name for the API token',
    example: 'Production Webhook Token',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'ID of the webhook endpoint this token will authenticate',
    example: 'webhook-uuid-123',
  })
  @IsString()
  webhookId: string;

  @ApiPropertyOptional({
    description: 'Permission scopes for this API token',
    example: ['webhook:receive'],
    isArray: true,
    type: String,
    default: ['webhook:receive'],
  })
  @IsArray()
  @IsOptional()
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'Optional expiration date for the token',
    example: '2025-12-31T23:59:59Z',
    type: Date,
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  expiresAt?: Date;
}