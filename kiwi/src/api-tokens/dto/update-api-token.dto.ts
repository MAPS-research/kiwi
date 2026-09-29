import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateApiTokenDto {
  @ApiPropertyOptional({
    description: 'Updated name for the API token',
    example: 'Updated Token Name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated permission scopes',
    example: ['webhook:receive', 'webhook:admin'],
    isArray: true,
    type: String,
  })
  @IsArray()
  @IsOptional()
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'Enable or disable the API token',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
