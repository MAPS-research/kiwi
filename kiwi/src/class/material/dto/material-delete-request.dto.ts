import { ApiProperty } from '@nestjs/swagger';

export class MaterialDeleteRequest {
  @ApiProperty()
  materialId: string;
}
