import {
  IsString,
  IsOptional,
  IsObject,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserPreferenceDto {
  @ApiPropertyOptional({
    description: 'Theme preference',
    enum: ['light', 'dark', 'system'],
    default: 'system',
  })
  @IsOptional()
  @IsString()
  theme?: 'light' | 'dark' | 'system';

  @ApiPropertyOptional({
    description: 'Code editor theme',
    example: 'vs-dark',
    default: 'vs-dark',
  })
  @IsOptional()
  @IsString()
  codeEditorTheme?: string;

  @ApiPropertyOptional({
    description: 'Code editor font size',
    minimum: 8,
    maximum: 32,
    default: 14,
  })
  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(32)
  codeEditorFontSize?: number;

  @ApiPropertyOptional({
    description: 'Per-app preferences',
    type: 'object',
    additionalProperties: true,
    example: {
      codegen: { autoSave: true, showLineNumbers: true },
    },
  })
  @IsOptional()
  @IsObject()
  appPreferences?: Record<string, any>;
}

export class UserPreferenceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: ['light', 'dark', 'system'] })
  theme: string;

  @ApiProperty()
  codeEditorTheme: string;

  @ApiProperty()
  codeEditorFontSize: number;

  @ApiProperty({ type: 'object', additionalProperties: true })
  appPreferences: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
