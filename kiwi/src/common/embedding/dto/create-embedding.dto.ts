import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateEmbeddingDto {
  @IsNotEmpty()
  @ApiProperty({ type: [String] })
  input: string | Array<string>;
}
