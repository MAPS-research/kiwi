import { ApiProperty } from '@nestjs/swagger';
import { ClassMetadata } from '../interfaces/class-metadata.interface';

export class ClassUpdateMetadataRequest {
  @ApiProperty({
    description: 'ID of the class to update',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  classId: string;

  @ApiProperty({
    description:
      'Updated class details including name, description, and system prompts',
    type: 'object',
    example: {
      name: 'Introduction to Computer Science',
      description: 'An introductory course to computer science concepts',
      systemPrompts: {
        defaultSystemMessage: 'Custom default system message for this class',
        classMaterialsPrompt: 'Custom class materials prompt for this class',
        recitationPrompt: 'Custom recitation prompt for this class',
      },
    },
  })
  classDetails: ClassMetadata;
}

export class ClassUpdateMetadataResponse {
  @ApiProperty({
    description: 'The ID of the updated class',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  classId: string;
}
