import { ApiProperty } from '@nestjs/swagger';
import { DocumentRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SetDocumentRoleDto {
  @ApiProperty({
    enum: ['STUDENT', 'ANSWER', 'REFERENCE'],
    description:
      'STUDENT is the copy students see, ANSWER is the same pages with the ' +
      'answers (recitations only), REFERENCE is extra corpus for the tutor.',
  })
  @IsEnum(['STUDENT', 'ANSWER', 'REFERENCE'])
  role: DocumentRole;
}
