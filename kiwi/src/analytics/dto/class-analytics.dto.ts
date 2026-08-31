import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LectureStatsDto {
  @ApiProperty()
  pdfId: string;

  @ApiProperty()
  fileName: string;

  @ApiPropertyOptional({ nullable: true })
  materialType: string | null;

  @ApiProperty()
  sortIndex: number;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  studentCount: number;

  @ApiPropertyOptional({ nullable: true })
  lastActivity: string | null;
}

export class WeeklyActivityDto {
  @ApiProperty()
  weekStart: string;

  @ApiProperty()
  questionCount: number;
}

export class ClassOverviewResponseDto {
  @ApiProperty()
  classId: string;

  @ApiProperty()
  totalQuestions: number;

  @ApiProperty()
  activeStudents: number;

  @ApiProperty()
  lectureCount: number;

  @ApiProperty({ type: [LectureStatsDto] })
  lectures: LectureStatsDto[];

  @ApiProperty({ type: [WeeklyActivityDto] })
  weeklyActivity: WeeklyActivityDto[];
}

export class ChatGroupDto {
  @ApiProperty()
  key: string;

  @ApiPropertyOptional()
  label?: string;

  @ApiPropertyOptional()
  pdfId?: string;

  @ApiPropertyOptional()
  fileName?: string;

  @ApiPropertyOptional({ nullable: true })
  pdfPage?: number | null;

  @ApiProperty()
  questionCount: number;

  @ApiPropertyOptional({ nullable: true })
  lastActivity: string | null;
}

export class ChatGroupsResponseDto {
  @ApiProperty()
  by: string;

  @ApiProperty({ type: [ChatGroupDto] })
  groups: ChatGroupDto[];
}

export class ChatEntryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  student: string;

  @ApiProperty()
  studentKey: string;

  @ApiProperty()
  question: string;

  @ApiPropertyOptional({ nullable: true })
  pdfId: string | null;

  @ApiPropertyOptional({ nullable: true })
  pdfPage: number | null;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  hasAnswer: boolean;
}

export class ChatListResponseDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  offset: number;

  @ApiProperty()
  limit: number;

  @ApiProperty({ type: [ChatEntryDto] })
  chats: ChatEntryDto[];
}

export class ChatAnswerDto {
  @ApiProperty()
  content: string;

  @ApiPropertyOptional({ nullable: true })
  engine: string | null;

  @ApiProperty()
  timestamp: string;
}

export class ChatAnswerResponseDto {
  @ApiProperty({ type: [ChatAnswerDto] })
  answers: ChatAnswerDto[];
}

export class TopicPageRefDto {
  @ApiProperty()
  pdfId: string;

  @ApiProperty()
  pdfPage: number;

  @ApiProperty()
  count: number;
}

export class TopicSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  studentCount: number;

  @ApiProperty({ type: [TopicPageRefDto] })
  topPages: TopicPageRefDto[];
}

export class IntentTopTopicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  count: number;
}

export class IntentSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  studentCount: number;

  @ApiProperty({ type: [IntentTopTopicDto] })
  topTopics: IntentTopTopicDto[];
}

export class TopicsResponseDto {
  @ApiProperty()
  status: string;

  @ApiProperty()
  generating: boolean;

  @ApiPropertyOptional({ nullable: true })
  updatedAt: string | null;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  pendingNewQuestions: number;

  @ApiPropertyOptional({ nullable: true })
  error: string | null;

  @ApiProperty({ type: [TopicSummaryDto] })
  topics: TopicSummaryDto[];

  @ApiProperty({ type: [IntentSummaryDto] })
  intents: IntentSummaryDto[];
}

export class TopicQuestionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  student: string;

  @ApiProperty()
  studentKey: string;

  @ApiProperty()
  question: string;

  @ApiPropertyOptional({ nullable: true })
  pdfId: string | null;

  @ApiPropertyOptional({ nullable: true })
  pdfPage: number | null;

  @ApiProperty()
  timestamp: string;
}

export class TopicQuestionsResponseDto {
  @ApiProperty()
  topicId: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ type: [TopicQuestionDto] })
  questions: TopicQuestionDto[];
}

export class IntentQuestionsResponseDto {
  @ApiProperty()
  intentId: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ type: [TopicQuestionDto] })
  questions: TopicQuestionDto[];
}

export class TopicsStatusResponseDto {
  @ApiProperty()
  status: string;

  @ApiProperty()
  questionCount: number;

  @ApiPropertyOptional({ nullable: true })
  updatedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  error: string | null;
}

export class TopicsRefreshResponseDto {
  @ApiProperty()
  status: string;

  @ApiProperty()
  message: string;
}
