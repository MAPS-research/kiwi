import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request DTO for OAuth Dynamic Client Registration (RFC 7591)
 */
export class OAuthRegisterRequestDto {
  @ApiProperty({
    description: 'MCP server ID to register client for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  serverId: string;

  @ApiProperty({
    description: 'Registration endpoint URL from OAuth discovery',
    example: 'https://example.com/oauth/register',
  })
  @IsString()
  registrationEndpoint: string;

  @ApiPropertyOptional({
    description: 'Custom client name for registration',
    example: 'Kiwi MCP Client',
  })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({
    description: 'Custom redirect URIs for the client',
    type: [String],
    example: ['https://kiwi.example.com/oauth/callback'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  redirectUris?: string[];
}

/**
 * Response DTO for OAuth Dynamic Client Registration
 */
export class OAuthRegisterResponseDto {
  @ApiProperty({
    description: 'Whether registration was successful',
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Registered client ID',
    example: 'client_abc123',
  })
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Client secret expiration timestamp (Unix epoch)',
    example: 1735689600,
  })
  clientSecretExpiresAt?: number;

  @ApiPropertyOptional({
    description: 'Client ID issued at timestamp (Unix epoch)',
    example: 1704067200,
  })
  clientIdIssuedAt?: number;

  @ApiPropertyOptional({
    description: 'Error message if registration failed',
  })
  error?: string;
}
