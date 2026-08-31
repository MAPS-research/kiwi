import { IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetDocumentFlagsDto {
  @ApiProperty({
    description:
      'Material that owns this document (must match doc.classMaterialId)',
    example: '8b72ccde-cf4f-4230-91b4-df239a8cd062',
  })
  @IsUUID()
  materialId!: string;

  @ApiPropertyOptional({ description: 'Set/clear student-visible flag' })
  @IsOptional()
  @IsBoolean()
  isStudent?: boolean;

  @ApiPropertyOptional({ description: 'Set/clear inclusion for LLM' })
  @IsOptional()
  @IsBoolean()
  isLlm?: boolean;
}
