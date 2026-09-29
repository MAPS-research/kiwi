import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsObject,
  IsOptional,
  IsUUID,
  IsInt,
} from 'class-validator';

/**
 * DTO for assigning an MCP server to a class
 */
export class AssignMcpServerDto {
  @ApiProperty({
    description: 'Class ID to assign the server to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  classId: string;

  @ApiPropertyOptional({
    description: 'Whether the server is enabled for this class',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Priority for tool selection in this class (higher = preferred)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({
    description: 'Optional class-specific display name override',
    example: 'Class GitHub Server',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Optional class-specific configuration overrides',
    example: { maxConcurrentCalls: 5 },
  })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}

/**
 * DTO for updating a class-server assignment
 */
export class UpdateClassMcpServerDto {
  @ApiPropertyOptional({
    description: 'Whether the server is enabled for this class',
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Priority for tool selection in this class',
  })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({
    description: 'Optional class-specific display name override',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Optional class-specific configuration overrides',
  })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}

/**
 * Nested server info for ClassMcpServerResponseDto
 */
export class McpServerInfoDto {
  @ApiProperty({ description: 'Server ID' })
  id: string;

  @ApiProperty({ description: 'Server name' })
  name: string;

  @ApiPropertyOptional({ description: 'Server description' })
  description?: string;

  @ApiProperty({ description: 'Transport type' })
  transport: string;

  @ApiProperty({ description: 'Whether server requires OAuth' })
  requiresOAuth: boolean;

  @ApiProperty({ description: 'Whether server is globally active' })
  isActive: boolean;
}

/**
 * Response DTO for class-server assignment
 */
export class ClassMcpServerResponseDto {
  @ApiProperty({
    description: 'Assignment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Class ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  classId: string;

  @ApiProperty({
    description: 'MCP Server ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  mcpServerId: string;

  @ApiProperty({
    description: 'Whether the server is enabled for this class',
  })
  isEnabled: boolean;

  @ApiProperty({
    description: 'Priority for tool selection',
  })
  priority: number;

  @ApiPropertyOptional({
    description: 'Class-specific display name override',
  })
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Class-specific configuration overrides',
  })
  configuration?: Record<string, any>;

  @ApiProperty({
    description: 'Created at timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at timestamp',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'User ID who assigned this server',
  })
  assignedBy?: string;

  @ApiProperty({
    description: 'The MCP server details',
    type: McpServerInfoDto,
  })
  mcpServer: McpServerInfoDto;
}

/**
 * Summary DTO for listing classes that use a server
 */
export class ClassSummaryDto {
  @ApiProperty({ description: 'Class ID' })
  classId: string;

  @ApiProperty({ description: 'Class name' })
  className: string;

  @ApiProperty({ description: 'Whether server is enabled for this class' })
  isEnabled: boolean;
}
