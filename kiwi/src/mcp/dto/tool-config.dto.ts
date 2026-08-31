import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsArray, IsInt, IsOptional, IsEnum, IsUUID, IsObject } from 'class-validator';

/**
 * Tool Type Enum
 */
export enum ToolTypeDto {
  RAG = 'RAG',
  CODE_INTERPRETER = 'CodeInterpreter',
  MCP = 'MCP',
}

/**
 * DTO for creating/updating a tool configuration
 */
export class UpsertToolConfigDto {
  @ApiProperty({
    enum: ToolTypeDto,
    description: 'Type of tool',
    example: 'MCP',
  })
  @IsEnum(ToolTypeDto)
  toolType: ToolTypeDto;

  @ApiProperty({
    description: 'Tool identifier (MCP server ID for MCP tools, "rag" or "code-interpreter" for built-in)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  toolIdentifier: string;

  @ApiProperty({
    description: 'Human-readable tool name',
    example: 'GitHub Repository Access',
  })
  @IsString()
  toolName: string;

  @ApiProperty({
    description: 'Whether the tool is enabled',
    example: true,
  })
  @IsBoolean()
  isEnabled: boolean;

  @ApiProperty({
    description: 'Chat types where this tool is available (empty array = all types)',
    example: ['pdf', 'codegen'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  chatTypes: string[];

  @ApiProperty({
    description: 'Tool priority (higher = preferred)',
    example: 10,
    default: 0,
  })
  @IsInt()
  priority: number;

  @ApiPropertyOptional({
    description: 'Optional tool-specific configuration',
    example: { maxResults: 5 },
  })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}

/**
 * DTO for bulk updating tool configurations
 */
export class BulkToolConfigDto {
  @ApiProperty({
    description: 'Array of tool configurations to update',
    type: [UpsertToolConfigDto],
  })
  @IsArray()
  tools: UpsertToolConfigDto[];
}

/**
 * Response DTO for tool configuration
 */
export class ToolConfigResponseDto {
  @ApiProperty({
    description: 'Configuration ID',
  })
  id: string;

  @ApiProperty({
    description: 'Class ID',
  })
  classId: string;

  @ApiProperty({
    enum: ToolTypeDto,
    description: 'Tool type',
  })
  toolType: string;

  @ApiProperty({
    description: 'Tool identifier',
  })
  toolIdentifier: string;

  @ApiProperty({
    description: 'Tool name',
  })
  toolName: string;

  @ApiProperty({
    description: 'Is enabled',
  })
  isEnabled: boolean;

  @ApiProperty({
    description: 'Chat types',
    type: [String],
  })
  chatTypes: string[];

  @ApiProperty({
    description: 'Priority',
  })
  priority: number;

  @ApiPropertyOptional({
    description: 'Configuration',
  })
  configuration?: Record<string, any>;

  @ApiProperty({
    description: 'Created at',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'MCP server info (if tool type is MCP)',
  })
  mcpServer?: {
    id: string;
    name: string;
    requiresOAuth: boolean;
  };
}

/**
 * DTO for updating tool enable/disable status
 */
export class UpdateToolStatusDto {
  @ApiProperty({
    description: 'Whether to enable or disable the tool',
    example: true,
  })
  @IsBoolean()
  isEnabled: boolean;

  @ApiPropertyOptional({
    description:
      'Class ID (required for synthetic IDs like builtin:rag that need to create a new config)',
    example: '27974cb7-b9d0-4def-8bcd-56682715597c',
  })
  @IsOptional()
  @IsUUID()
  classId?: string;
}
