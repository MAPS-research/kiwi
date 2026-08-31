import { IsArray, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWebhookDto {
  @ApiPropertyOptional({
    description: 'Updated list of events to subscribe to',
    example: ['user.created', 'user.updated', 'document.uploaded'],
    isArray: true,
    type: String,
  })
  @IsArray()
  @IsOptional()
  events?: string[];

  @ApiPropertyOptional({
    description: 'Enable or disable the webhook',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}