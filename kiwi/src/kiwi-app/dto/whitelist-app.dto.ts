import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsUrl, MinLength, IsArray } from 'class-validator';

export class CreateWhitelistEntryDto {
  @ApiProperty({ description: 'Unique slug identifier for the app', example: 'codegen' })
  @IsString()
  slug: string;

  @ApiProperty({
    description: 'Secret that the app must provide to register (min 32 chars). Will be hashed before storage.',
    example: 'super-secret-registration-key-for-codegen-app',
  })
  @IsString()
  @MinLength(32, { message: 'Registration secret must be at least 32 characters' })
  registrationSecret: string;

  @ApiPropertyOptional({ description: 'Expected base URL of the app', example: 'http://localhost:8000' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Status of the whitelist entry', enum: ['pending', 'approved', 'rejected'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ description: 'Description of why this app is whitelisted' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Maximum scopes this app can request',
    example: ['user:profile:read', 'class:info:read', 'llm:prompt:*'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  maxScopes?: string[];
}

export class UpdateWhitelistEntryDto {
  @ApiPropertyOptional({
    description: 'New registration secret (min 32 chars). Will be hashed before storage.',
  })
  @IsOptional()
  @IsString()
  @MinLength(32, { message: 'Registration secret must be at least 32 characters' })
  registrationSecret?: string;

  @ApiPropertyOptional({ description: 'Expected base URL of the app', example: 'http://localhost:8000' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Status of the whitelist entry', enum: ['pending', 'approved', 'rejected'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ description: 'Description of why this app is whitelisted' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Maximum scopes this app can request',
    example: ['user:profile:read', 'class:info:read', 'llm:prompt:*'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  maxScopes?: string[];
}

export class WhitelistEntryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  baseUrl?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({
    type: [String],
    description: 'Maximum scopes this app can request',
    example: ['user:profile:read', 'class:info:read', 'llm:prompt:*'],
  })
  maxScopes: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  approvedBy?: string;
}
