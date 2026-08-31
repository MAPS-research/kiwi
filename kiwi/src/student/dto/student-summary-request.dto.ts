import { ApiProperty } from '@nestjs/swagger';
import { EngineChoice } from 'src/common/llm/interfaces/engine-config';

export class ChatMessage {
  @ApiProperty()
  role: 'user' | 'assistant';
  @ApiProperty()
  content: string;
}

export class StudentContext {
  @ApiProperty()
  classId: string;
  @ApiProperty({
    description:
      'The page number of the material the student is viewing. 1 indexed.',
  })
  pageNumber: string;
  @ApiProperty()
  pdfId: string;
  @ApiProperty()
  materialType: string;
}

export class StudentSummaryRequest {
  @ApiProperty({ type: [ChatMessage] })
  conversation: ChatMessage[];
  @ApiProperty({ type: StudentContext })
  studentContext: StudentContext;
  @ApiProperty()
  engineChoice?: EngineChoice;
}

export class StudentSummaryResponse {
  @ApiProperty()
  summary: string;
}
