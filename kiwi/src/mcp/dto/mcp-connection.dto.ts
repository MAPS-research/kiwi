import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional } from 'class-validator';

/**
 * Response DTO for OAuth initiation
 */
export class OAuthInitiateResponseDto {
  @ApiProperty({
    description: 'Authorization URL to redirect the user to',
    example: 'https://github.com/login/oauth/authorize?client_id=...',
  })
  authorizationUrl: string;

  @ApiProperty({
    description: 'State parameter for CSRF protection',
    example: 'abc123xyz789...',
  })
  state: string;
}

/**
 * Query parameters for OAuth callback
 */
export class OAuthCallbackQueryDto {
  @ApiProperty({
    description: 'Authorization code from OAuth provider',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'State parameter for verification',
  })
  @IsString()
  state: string;

  @ApiPropertyOptional({
    description: 'Error code if authorization failed',
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({
    description: 'Error description if authorization failed',
  })
  @IsOptional()
  @IsString()
  error_description?: string;
}

/**
 * Response DTO for user MCP connection
 */
export class McpConnectionResponseDto {
  @ApiProperty({
    description: 'Connection ID',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
  })
  userId: string;

  @ApiProperty({
    description: 'MCP server ID',
  })
  mcpServerId: string;

  @ApiProperty({
    description: 'Token type (usually Bearer)',
  })
  tokenType: string;

  @ApiPropertyOptional({
    description: 'Token expiration date',
  })
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: 'OAuth scopes',
  })
  scope?: string;

  @ApiProperty({
    description: 'Is connection active',
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Created at',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Last used at',
  })
  lastUsedAt?: Date;

  @ApiProperty({
    description: 'MCP server information (servers are now global)',
  })
  mcpServer: {
    id: string;
    name: string;
    description?: string;
  };
}

/**
 * Response DTO for successful OAuth callback
 */
export class OAuthCallbackSuccessDto {
  @ApiProperty({
    description: 'Success message',
  })
  message: string;

  @ApiProperty({
    description: 'Connection information',
    type: McpConnectionResponseDto,
  })
  connection: McpConnectionResponseDto;
}
