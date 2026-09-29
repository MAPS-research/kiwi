import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialType } from './material-enum';

export class MaterialEditRequest {
  @ApiProperty()
  materialId: string;
  @ApiProperty({ enum: MaterialType, name: 'materialType' })
  materialType: MaterialType;
  @ApiPropertyOptional({ type: Date })
  availableDate?: Date;
  @ApiPropertyOptional()
  title?: string;
}

export class MaterialEditResponse {
  @ApiProperty()
  materialId: string;
}
