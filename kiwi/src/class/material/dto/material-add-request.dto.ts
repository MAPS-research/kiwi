import { ApiProperty } from '@nestjs/swagger';
import { MaterialType } from './material-enum';

export class MaterialAddRequest {
  @ApiProperty()
  classId: string;
  @ApiProperty({ enum: MaterialType, name: 'materialType' })
  materialType: MaterialType;
  @ApiProperty()
  availableDate: Date;
}

export class MaterialAddResponse {
  @ApiProperty()
  classMaterialId: string;
}
