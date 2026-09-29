import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsObject,
  IsOptional,
  IsEnum,
  IsUrl,
} from 'class-validator';

/**
 * MCP Server Transport Types
 */
export enum McpTransportType {
  STDIO = 'stdio',
  SSE = 'sse',
  HTTP = 'http',
}

/**
 * DTO for creating a global MCP server configuration
 * Note: Servers are now global and can be assigned to multiple classes via ClassMcpServer
 */
export class CreateMcpServerDto {
  @ApiProperty({
    description: 'Human-readable name for the MCP server',
    example: 'GitHub API Server',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of what this server provides',
    example: 'Provides access to GitHub repositories and issues',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: McpTransportType,
    description: 'Transport protocol for the MCP server',
    example: 'http',
  })
  @IsEnum(McpTransportType)
  transport: McpTransportType;

  @ApiProperty({
    description: 'Transport-specific configuration',
    example: {
      url: 'https://mcp.example.com',
      headers: { 'X-API-Version': '1.0' },
    },
  })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({
    description: 'Whether this server requires OAuth authentication',
    example: false,
    default: false,
  })
  @IsBoolean()
  requiresOAuth: boolean;

  @ApiPropertyOptional({
    description: 'OAuth 2.1 configuration if requiresOAuth is true',
    example: {
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      clientId: 'your-client-id',
      scopes: ['repo', 'user'],
      redirectUri: 'http://localhost:3000/api/mcp/oauth/callback',
    },
  })
  @IsOptional()
  @IsObject()
  oauthMetadata?: Record<string, any>;

  @ApiProperty({
    description: 'Whether the server is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  isActive: boolean;
}

/**
 * DTO for updating an MCP server configuration
 */
export class UpdateMcpServerDto {
  @ApiPropertyOptional({
    description: 'Human-readable name for the MCP server',
    example: 'GitHub API Server v2',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Optional description of what this server provides',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: McpTransportType,
    description: 'Transport protocol for the MCP server',
  })
  @IsOptional()
  @IsEnum(McpTransportType)
  transport?: McpTransportType;

  @ApiPropertyOptional({
    description: 'Transport-specific configuration',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether this server requires OAuth authentication',
  })
  @IsOptional()
  @IsBoolean()
  requiresOAuth?: boolean;

  @ApiPropertyOptional({
    description: 'OAuth 2.1 configuration',
  })
  @IsOptional()
  @IsObject()
  oauthMetadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the server is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Response DTO for MCP server
 * Note: Servers are now global (no classId) and can be assigned to multiple classes
 */
export class McpServerResponseDto {
  @ApiProperty({
    description: 'Server ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Server name',
    example: 'GitHub API Server',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Server description',
    example: 'Provides access to GitHub repositories',
  })
  description?: string;

  @ApiProperty({
    enum: McpTransportType,
    description: 'Transport type',
  })
  transport: string;

  @ApiProperty({
    description: 'Transport configuration',
  })
  config: Record<string, any>;

  @ApiProperty({
    description: 'Requires OAuth',
  })
  requiresOAuth: boolean;

  @ApiPropertyOptional({
    description: 'OAuth metadata (sanitized)',
  })
  oauthMetadata?: Record<string, any>;

  @ApiProperty({
    description: 'Is active globally',
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Created at timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at timestamp',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Creator user ID',
  })
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Number of classes this server is assigned to',
    example: 5,
  })
  assignedClassCount?: number;
}

/**
 * Response DTO for MCP server test
 */
export class McpServerTestResponseDto {
  @ApiProperty({
    description: 'Whether the connection test succeeded',
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'List of available tools if successful',
    type: [Object],
  })
  tools?: any[];

  @ApiPropertyOptional({
    description: 'Error message if failed',
  })
  error?: string;
}

/**
 * Request DTO for OAuth metadata discovery
 */
export class OAuthDiscoverRequestDto {
  @ApiProperty({
    description: 'Base URL of the MCP server to discover OAuth metadata from',
    example: 'https://example-mcp-server.com',
  })
  @IsString()
  @IsUrl({ require_tld: false }) // Allow localhost for development
  url: string;
}

/**
 * Response DTO for OAuth metadata discovery
 */
export class OAuthDiscoverResponseDto {
  @ApiProperty({
    description: 'Whether OAuth metadata was successfully discovered',
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Source of discovered metadata',
    enum: ['rfc8414', 'oidc'],
  })
  source?: 'rfc8414' | 'oidc';

  @ApiPropertyOptional({
    description: 'OAuth authorization endpoint URL',
    example: 'https://example.com/oauth/authorize',
  })
  authorizationEndpoint?: string;

  @ApiPropertyOptional({
    description: 'OAuth token endpoint URL',
    example: 'https://example.com/oauth/token',
  })
  tokenEndpoint?: string;

  @ApiPropertyOptional({
    description: 'List of supported OAuth scopes',
    type: [String],
    example: ['read', 'write', 'admin'],
  })
  scopesSupported?: string[];

  @ApiPropertyOptional({
    description: 'OAuth dynamic client registration endpoint URL',
    example: 'https://example.com/oauth/register',
  })
  registrationEndpoint?: string;

  @ApiPropertyOptional({
    description: 'Error message if discovery failed',
  })
  error?: string;
}
