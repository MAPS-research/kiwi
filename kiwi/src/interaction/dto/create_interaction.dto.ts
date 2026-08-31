import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class CreateInteractionRequest {
  @ApiProperty()
  userId: string;
  @ApiProperty()
  sessionId: string;
}
