import { ApiProperty } from '@nestjs/swagger';
import { MaterialType } from './material-enum';

export class MaterialEditRequest {
  @ApiProperty()
  materialId: string;
  @ApiProperty({ enum: MaterialType, name: 'materialType' })
  materialType: MaterialType;
  @ApiProperty()
  availableDate?: Date;
}

export class MaterialEditResponse {
  @ApiProperty()
  materialId: string;
}
