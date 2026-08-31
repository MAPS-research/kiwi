import { ApiProperty } from '@nestjs/swagger';
import { Feature } from '@prisma/client';

export class AddFeatureRequest {
  @ApiProperty({ enum: Feature })
  featureName: Feature;

  @ApiProperty()
  targetId: string; // classId or userId

  @ApiProperty({ required: false, nullable: true })
  validUntil?: Date;
}

export class EditFeatureRequest {
  @ApiProperty({ enum: Feature })
  featureName: Feature;

  @ApiProperty()
  targetId: string; // classId or userId

  @ApiProperty({ required: false, nullable: true })
  validUntil?: Date;
}

export class FeatureResponse {
  @ApiProperty({ enum: Feature })
  featureName: Feature;

  @ApiProperty()
  targetId: string; // classId or userId

  @ApiProperty()
  targetType?: 'class' | 'user';

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  validUntil: Date | null;
}
