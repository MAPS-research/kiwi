import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

/**
 * Request DTO for app-scoped token generation
 */
export class RequestAppTokenDto {
  @ApiPropertyOptional({
    description:
      'Class ID for token scope. Omit only for a global admin panel with no ' +
      'class context — a classless token is issued to system admins only, and ' +
      'cannot be used for class-scoped App API (bridge) operations.',
    example: 'class-uuid-here',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  classId?: string;
}

/**
 * Response DTO for app token
 */
export class AppTokenResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Token expiry in seconds', example: 3600 })
  expiresIn: number;

  @ApiProperty({ type: [String], description: 'Scopes granted to this token' })
  scopes: string[];

  @ApiProperty({ description: 'App slug for this token' })
  appSlug: string;
}

/**
 * Response DTO for app scope information
 */
export class AppScopesResponseDto {
  @ApiProperty({ description: 'App slug' })
  appSlug: string;

  @ApiProperty({
    type: [String],
    description: 'Maximum scopes this app can request (from whitelist)',
    example: ['user:profile:read', 'class:info:read', 'llm:prompt:*'],
  })
  maxScopes: string[];

  @ApiProperty({
    type: [String],
    description: 'Prompt scopes from active/approved prompts',
    example: ['llm:prompt:hint', 'llm:prompt:explain-error'],
  })
  promptScopes: string[];
}

/**
 * Response DTO for class-specific app scopes
 */
export class ClassAppScopesResponseDto extends AppScopesResponseDto {
  @ApiProperty({ description: 'Class ID' })
  classId: string;

  @ApiProperty({
    type: [String],
    description: 'Scopes enabled for this specific class',
  })
  enabledScopes: string[];

  @ApiProperty({
    type: [String],
    description:
      'Effective scopes (intersection of maxScopes and enabledScopes)',
  })
  effectiveScopes: string[];
}

/**
 * DTO for reporting context updates from apps (audit logging)
 */
export class ReportContextUpdateDto {
  @ApiProperty({
    description: 'Type of action performed',
    example: 'code_submission',
  })
  @IsString()
  @IsNotEmpty()
  actionType: string;

  @ApiProperty({
    description: 'Action-specific data',
    example: { submissionId: 'sub-123', status: 'passed', grade: 95 },
  })
  @IsObject()
  actionData: Record<string, any>;

  @ApiPropertyOptional({ description: 'Class context (optional if in token)' })
  @IsString()
  @IsOptional()
  classId?: string;
}

/**
 * Response DTO for context update acknowledgment
 */
export class ContextUpdateResponseDto {
  @ApiProperty({ description: 'Whether the update was logged successfully' })
  success: boolean;

  @ApiProperty({ description: 'Audit log entry ID' })
  auditLogId: string;
}
