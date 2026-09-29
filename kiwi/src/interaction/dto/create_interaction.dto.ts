import { ApiProperty } from '@nestjs/swagger';

export class CreateInteractionRequest {
  @ApiProperty()
  userId: string;
  @ApiProperty()
  sessionId: string;
}
