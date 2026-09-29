import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StaffDocument {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty({ enum: ['STUDENT', 'ANSWER', 'REFERENCE'] })
  role: string;

  @ApiProperty({ enum: ['PENDING', 'PROCESSING', 'READY', 'FAILED'] })
  processingStatus: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  processingStage: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  processingError: string | null;

  @ApiProperty()
  uploadedDate: Date;

  @ApiProperty({ description: 'Signed URL to view the file.' })
  file: string;
}

export class StaffMaterial {
  @ApiProperty()
  id: string;

  @ApiProperty()
  materialType: string;

  @ApiProperty({ description: "Falls back to the student copy's file name." })
  title: string;

  @ApiProperty()
  availableDate: Date;

  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  lifecycle: string;

  @ApiProperty({ type: [StaffDocument] })
  documents: StaffDocument[];
}

export class MaterialStaffListResponse {
  @ApiProperty({ type: [StaffMaterial] })
  materials: StaffMaterial[];
}
