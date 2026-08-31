import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUrl,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// UI Placement types
export enum UIPlacement {
  CLASS_TAB = 'class-tab',
  ADMIN_PANEL = 'admin-panel',
  // An admin surface scoped to one class, reached from that class's menu and
  // handed a classId. Distinct from ADMIN_PANEL, which is system-wide and gets
  // a classless token. Without this an app could only declare the global panel,
  // and any class-scoped door had to be hardcoded per app slug in the host.
  CLASS_ADMIN_PANEL = 'class-admin-panel',
  MODAL = 'modal',
  DASHBOARD_WIDGET = 'dashboard-widget',
}

// App types
export enum AppType {
  FRONTEND_ONLY = 'frontend_only',
  FULL = 'full',
}

// User roles for UI access
export enum UserRole {
  STUDENT = 'student',
  TA = 'ta',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

// DTO for registering a UI
export class RegisterAppUIDto {
  @ApiProperty({ description: 'UI slug identifier', example: 'student' })
  @IsString()
  uiSlug: string;

  @ApiProperty({ description: 'Display name for this UI', example: 'Exercise Runner' })
  @IsString()
  uiName: string;

  @ApiProperty({ description: 'URL path for this UI', example: '/app/student' })
  @IsString()
  uiUrl: string;

  @ApiPropertyOptional({
    description: 'Where this UI appears',
    enum: UIPlacement,
    default: UIPlacement.CLASS_TAB,
  })
  @IsOptional()
  @IsEnum(UIPlacement)
  placement?: UIPlacement;

  @ApiPropertyOptional({
    description: 'Roles that can access this UI',
    enum: UserRole,
    isArray: true,
    default: [UserRole.STUDENT, UserRole.TA, UserRole.INSTRUCTOR, UserRole.ADMIN],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  allowedRoles?: UserRole[];

  @ApiPropertyOptional({ description: 'Tab order within placement', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tabOrder?: number;

  @ApiPropertyOptional({ description: 'UI-specific configuration', type: 'object' })
  @IsOptional()
  config?: Record<string, any>;
}

// DTO for registering an LLM prompt
export class RegisterAppPromptDto {
  @ApiProperty({ description: 'Prompt identifier', example: 'hint' })
  @IsString()
  promptId: string;

  @ApiProperty({ description: 'Human-readable name', example: 'Coding Hint' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'What this prompt does' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The system prompt (will be reviewed by admin)',
    example: 'You are a coding tutor. Give hints without revealing the answer...',
  })
  @IsString()
  systemPrompt: string;

  @ApiPropertyOptional({ description: 'Max tokens for response', example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4096)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Temperature (0-2)', example: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}

export class RegisterAppDto {
  @ApiProperty({ description: 'Unique slug identifier (must be in whitelist)', example: 'codegen' })
  @IsString()
  slug: string;

  @ApiProperty({
    description: 'Registration secret (must match the whitelist entry)',
    example: 'super-secret-registration-key-for-codegen-app',
  })
  @IsString()
  registrationSecret: string;

  @ApiProperty({ description: 'Display name of the app', example: 'Code Exercises' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the app' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Base URL of the app', example: 'http://localhost:8000' })
  @IsUrl({ require_tld: false })
  baseUrl: string;

  @ApiPropertyOptional({ description: 'URL to app icon' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Category', enum: ['plugin', 'analytics', 'tool'], default: 'plugin' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Version string', example: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({
    description: 'App capabilities',
    example: ['auth', 'frontend-actions', 'mcp'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @ApiPropertyOptional({ description: 'Default configuration', type: 'object' })
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'App type',
    enum: AppType,
    default: AppType.FRONTEND_ONLY,
  })
  @IsOptional()
  @IsEnum(AppType)
  appType?: AppType;

  @ApiPropertyOptional({
    description: 'MCP server URL for full apps',
    example: 'http://localhost:8000/mcp',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  mcpServerUrl?: string;

  @ApiPropertyOptional({
    description: 'UI registrations for this app',
    type: [RegisterAppUIDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterAppUIDto)
  uis?: RegisterAppUIDto[];

  @ApiPropertyOptional({
    description: 'LLM prompts for this app (requires admin approval)',
    type: [RegisterAppPromptDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterAppPromptDto)
  prompts?: RegisterAppPromptDto[];
}

export class UpdateAppDto {
  @ApiPropertyOptional({ description: 'Display name of the app' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the app' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Base URL of the app' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'URL to app icon' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Version string' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Whether the app is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'App capabilities' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @ApiPropertyOptional({ description: 'Default configuration' })
  @IsOptional()
  config?: Record<string, any>;
}

// Response DTO for UI
export class AppUIResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  uiSlug: string;

  @ApiProperty()
  uiName: string;

  @ApiProperty()
  uiUrl: string;

  @ApiProperty({ enum: UIPlacement })
  placement: string;

  @ApiProperty({ type: [String], enum: UserRole })
  allowedRoles: string[];

  @ApiProperty()
  tabOrder: number;

  @ApiProperty()
  isEnabled: boolean;

  @ApiProperty({ type: 'object' })
  config: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Response DTO for Prompt
export class AppPromptResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  promptId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ description: 'System prompt (only visible to admins)' })
  systemPrompt: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  maxTokens?: number;

  @ApiPropertyOptional()
  temperature?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;
}

export class AppResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  baseUrl: string;

  @ApiPropertyOptional()
  iconUrl?: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  version: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: 'object' })
  config: Record<string, any>;

  @ApiProperty({ type: [String] })
  capabilities: string[];

  @ApiProperty({ enum: AppType })
  appType: string;

  @ApiPropertyOptional()
  mcpServerUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  lastSeenAt?: Date;

  @ApiPropertyOptional({ type: [AppUIResponseDto] })
  uis?: AppUIResponseDto[];

  @ApiPropertyOptional({ type: [AppPromptResponseDto] })
  prompts?: AppPromptResponseDto[];
}
