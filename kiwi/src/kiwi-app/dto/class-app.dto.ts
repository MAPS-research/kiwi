import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EnableClassAppDto {
  @ApiProperty({ description: 'App ID to enable' })
  @IsString()
  appId: string;

  @ApiPropertyOptional({ description: 'Tab order (0 = first)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tabOrder?: number;

  @ApiPropertyOptional({ description: 'Custom tab label (overrides app.name)' })
  @IsOptional()
  @IsString()
  tabLabel?: string;

  @ApiPropertyOptional({
    description: 'Class-specific config (overrides app defaults)',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Scopes to enable for this class (subset of maxScopes). If empty, all maxScopes are allowed.',
    example: ['user:profile:read', 'class:info:read'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledScopes?: string[];
}

export class UpdateClassAppDto {
  @ApiPropertyOptional({ description: 'Tab order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  tabOrder?: number;

  @ApiPropertyOptional({ description: 'Custom tab label' })
  @IsOptional()
  @IsString()
  tabLabel?: string;

  @ApiPropertyOptional({ description: 'Whether enabled for this class' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Class-specific config',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Scopes to enable for this class (subset of maxScopes). If empty, all maxScopes are allowed.',
    example: ['user:profile:read', 'class:info:read'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledScopes?: string[];
}

class TabOrderItem {
  @ApiProperty({ description: 'App ID' })
  @IsString()
  appId: string;

  @ApiProperty({ description: 'New tab order' })
  @IsInt()
  @Min(0)
  tabOrder: number;
}

export class ReorderClassAppsDto {
  @ApiProperty({
    description: 'Array of app IDs with their new order',
    type: [TabOrderItem],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TabOrderItem)
  order: TabOrderItem[];
}

export class ClassAppResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  classId: string;

  @ApiProperty()
  appId: string;

  @ApiProperty()
  tabOrder: number;

  @ApiPropertyOptional()
  tabLabel?: string;

  @ApiProperty()
  isEnabled: boolean;

  @ApiProperty({ type: 'object', additionalProperties: true })
  config: Record<string, any>;

  @ApiProperty({
    type: [String],
    description:
      'Scopes enabled for this class (empty = all maxScopes allowed)',
    example: ['user:profile:read', 'class:info:read'],
  })
  enabledScopes: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Joined app data
  @ApiProperty({ description: 'App slug' })
  slug: string;

  @ApiProperty({
    description: 'App name (use tabLabel if set, otherwise this)',
  })
  name: string;

  @ApiProperty({ description: 'App base URL' })
  baseUrl: string;

  @ApiPropertyOptional({ description: 'App icon URL' })
  iconUrl?: string;

  @ApiProperty({ description: 'App category' })
  category: string;

  @ApiProperty({ type: [String], description: 'App capabilities' })
  capabilities: string[];

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Merged config (app defaults + class overrides)',
  })
  mergedConfig: Record<string, any>;
}
