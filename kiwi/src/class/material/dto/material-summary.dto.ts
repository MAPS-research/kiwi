import { ApiProperty } from '@nestjs/swagger';

/** Just enough to name a material in a header or a breadcrumb. */
export class MaterialSummaryResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: "Falls back to the student copy's file name." })
  title: string;

  @ApiProperty()
  materialType: string;

  @ApiProperty()
  classId: string;

  @ApiProperty()
  className: string;
}
