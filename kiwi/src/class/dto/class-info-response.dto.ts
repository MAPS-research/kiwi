import { ApiProperty } from '@nestjs/swagger';

// The following also exists in student-enrollments-request.dto, at some point we need to merge these
export class ClassInfoResponse {
  @ApiProperty({
    description: 'The id of the class',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the class',
  })
  className: string;

  @ApiProperty({
    description: 'The name of the professor',
  })
  professorName: string;

  @ApiProperty({
    description: 'The email of the professor',
  })
  professorEmail: string;

  @ApiProperty({
    description: 'The date the class was created',
  })
  createdDate: Date;

  @ApiProperty({
    description: 'The id of the professor associated with the class',
  })
  professorId: string;

  @ApiProperty({
    description: 'The id of the professor associated with the class',
  })
  description: string;

  @ApiProperty({
    description: 'The id of the professor associated with the class',
  })
  imageSnippetUrl?: string;
}

export class ClassInfoListResponse {
  @ApiProperty({
    description: 'List of classes',
    type: [ClassInfoResponse],
  })
  classes: ClassInfoResponse[];
}
