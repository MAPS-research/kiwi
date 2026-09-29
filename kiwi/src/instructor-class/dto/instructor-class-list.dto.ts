import { ApiProperty } from '@nestjs/swagger';

export class InstructorClassListResponse {
  @ApiProperty({ type: Array })
  classes: any[];
}
