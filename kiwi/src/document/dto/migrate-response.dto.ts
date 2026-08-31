import { ApiProperty } from '@nestjs/swagger';

export class MigrateResponse {
  @ApiProperty()
  message: string;
}
