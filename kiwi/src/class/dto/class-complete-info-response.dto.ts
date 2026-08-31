import { ApiProperty } from '@nestjs/swagger';

export class SystemPromptsDto {
  @ApiProperty({
    description: 'Default system message for the class',
    required: false,
  })
  defaultSystemMessage?: string;

  @ApiProperty({
    description: 'Class materials prompt',
    required: false,
  })
  classMaterialsPrompt?: string;

  @ApiProperty({
    description: 'Recitation prompt',
    required: false,
  })
  recitationPrompt?: string;
}

export class ClassMetadataDto {
  @ApiProperty({
    description: 'The name of the class',
  })
  className: string;

  @ApiProperty({
    description: 'The description of the class',
  })
  description: string;

  @ApiProperty({
    description: 'System prompts configuration',
    type: SystemPromptsDto,
    required: false,
  })
  systemPrompts?: SystemPromptsDto;

  @ApiProperty({
    description: 'The name of the professor',
    required: false,
  })
  professorName?: string;

  @ApiProperty({
    description: 'The email of the professor',
    required: false,
  })
  professorEmail?: string;

  @ApiProperty({
    description: 'The URL of the class image snippet',
    required: false,
  })
  imageSnippetUrl?: string;
}

export class ClassCompleteInfo {
  @ApiProperty({
    description: 'The id of the class',
  })
  id: string;

  @ApiProperty({
    description: 'The date the class was created',
  })
  createdDate: Date;

  @ApiProperty({
    description: 'The id of the professor associated with the class',
  })
  professorId: string;

  @ApiProperty({
    description: 'The structured metadata of the class',
    type: ClassMetadataDto,
  })
  classMetadata: ClassMetadataDto;
}

// Complete class information response that includes full class details
export class ClassCompleteInfoResponse {
  @ApiProperty({
    description: 'Complete class information object with structured metadata',
    type: ClassCompleteInfo,
  })
  classInfo: ClassCompleteInfo;

  @ApiProperty({
    description: 'Signed URL for the class image snippet',
  })
  imageSnippetServerUrl: string;
}
