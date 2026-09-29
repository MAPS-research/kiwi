import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialType } from './material-enum';

export class MaterialAddRequest {
  @ApiProperty()
  classId: string;
  @ApiProperty({ enum: MaterialType, name: 'materialType' })
  materialType: MaterialType;
  @ApiProperty()
  availableDate: Date;
  @ApiPropertyOptional({
    description:
      "What to call this material. Empty falls back to the student copy's " +
      'file name, which is what the UI used to show for every material.',
  })
  title?: string;
}

export class MaterialAddResponse {
  @ApiProperty()
  classMaterialId: string;
}
