import { ApiProperty } from '@nestjs/swagger';

export class ChatRequest {
  @ApiProperty()
  input: string;
  @ApiProperty({ type: 'string', format: 'binary' })
  image?: string;
}
