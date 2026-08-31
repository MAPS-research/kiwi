import { ApiProperty } from '@nestjs/swagger';

class Embedding {
  @ApiProperty({ type: [Number] })
  embedding: Array<number>;

  @ApiProperty()
  index: number;

  @ApiProperty()
  object: 'embedding';
}

export class EmbeddingResponseDto {
  @ApiProperty({ type: [Embedding] })
  data: Embedding[];
}
