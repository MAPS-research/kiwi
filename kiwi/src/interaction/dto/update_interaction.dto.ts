import { ApiProperty } from '@nestjs/swagger';

// TODO: the pdf field lists should be combined into one list of pdfInfo
export class Action_client {
  @ApiProperty({ description: 'Type of the action', required: true })
  type: string;

  @ApiProperty({
    description: 'Timestamp of the action',
    required: false,
  })
  timestamp: Date;

  @ApiProperty({ description: 'pdfId', required: false })
  pdfId?: string;

  @ApiProperty({ description: 'pdfMaterialType', required: false })
  pdfMaterialType?: string;

  @ApiProperty({ description: 'pdfPage', required: false })
  pdfPage?: number;

  @ApiProperty({ description: 'Context', required: true })
  context: Record<string, unknown>;
  // context: JSON;
}

export class Prompt_Answer_client {
  @ApiProperty({ description: 'interaction id', required: true })
  interactionId: string;

  @ApiProperty({ description: 'Prompt', required: true })
  prompt: string;

  @ApiProperty({ description: 'Answer', required: true })
  answer: string;

  @ApiProperty({
    description: 'Int Tag of this prompt-answer pair',
    required: true,
  })
  intTag: number;

  @ApiProperty({
    description: 'String Tag of this prompt-answer pair',
    required: true,
  })
  stringTag: string;

  @ApiProperty({ description: 'number of upvotes', required: true })
  numUpvotes: number;

  @ApiProperty({
    description: 'the query user has already upvoted this prompt-answer',
    required: true,
  })
  upvoted: boolean;

  @ApiProperty({ description: 'Timestamp', required: true })
  timestamp: Date;

  @ApiProperty({ description: 'pdfId', required: true })
  pdfId: string;

  @ApiProperty({ description: 'pdfPage', required: true })
  pdfPage: number;
}

export class AddInteractionRequest {
  @ApiProperty()
  action: Action_client;
}

export class AddInteractionResponse {
  @ApiProperty()
  message: string;
  @ApiProperty()
  interactionId: string;
}

export class GetInteractionsByPdfPageRequest {
  @ApiProperty()
  pdfId: string;
  @ApiProperty()
  pdfPage: number;
}

export class GetInteractionsByPdfPageResponse {
  @ApiProperty()
  message: string;
  @ApiProperty({ type: Prompt_Answer_client, isArray: true })
  interactions: Prompt_Answer_client[];
}

// export class GetInteractionsCurrentClassRequest {
// }

export class GetInteractionsByClassIdRequest {
  @ApiProperty()
  classId: string;
}

export class GetInteractionsByClassIdResponse {
  @ApiProperty()
  message: string;
  @ApiProperty({ type: Prompt_Answer_client, isArray: true })
  interactions: Prompt_Answer_client[];
}

export class ToggleUpvoteResponse {
  @ApiProperty()
  message: string;
}

export class ToggleUpvoteRequest {
  @ApiProperty()
  id: string;
}

export class AddDiscussionRequest {
  @ApiProperty({ required: false })
  parentDiscussionId: string;
  @ApiProperty()
  writtenPost: Action_client;
  @ApiProperty()
  referencePromptAnswerIds: string[];
  @ApiProperty()
  referencePdfIds: string[];
  @ApiProperty()
  referencePdfPages: number[];
}

export class DiscussionResponse {
  @ApiProperty()
  discussionId: string;
  @ApiProperty()
  writtenPost: Prompt_Answer_client;
  @ApiProperty({ type: Prompt_Answer_client, isArray: true })
  referencePromptAnswers: Prompt_Answer_client[];
  @ApiProperty({ type: Prompt_Answer_client, isArray: true })
  referencePdfs: Prompt_Answer_client[];
  @ApiProperty()
  parentDiscussionId: string;
  @ApiProperty()
  timestamp: Date;
  @ApiProperty()
  numUpvotes: number;
}

export class AddDiscussionResponse {
  @ApiProperty()
  message: string;
  @ApiProperty()
  rootId: string;
  @ApiProperty()
  discussionId: string;
}

export class GetDiscussionByPdfRequest {
  @ApiProperty()
  pdfId: string;
  @ApiProperty()
  pdfPage: number;
}

export class GetDiscussionByPdfResponse {
  @ApiProperty()
  message: string;
  @ApiProperty({ type: DiscussionResponse, isArray: true })
  discussions: DiscussionResponse[];
}
export class GetDiscussionByClassIdRequest {
  @ApiProperty()
  classId: string;
}
export class GetDiscussionByClassIdResponse {
  @ApiProperty()
  message: string;
  @ApiProperty({ type: DiscussionResponse, isArray: true })
  discussions: DiscussionResponse[];
}
