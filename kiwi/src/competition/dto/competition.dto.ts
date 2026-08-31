import { ApiProperty } from '@nestjs/swagger';
import { APIClient } from 'openai/core';

export class CompetitionReplyDto {
  @ApiProperty()
  message: string;
  @ApiProperty()
  status: number;
  @ApiProperty()
  metrics: Record<string, any>;
}

export class CompetitionInfoDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  startDate: Date;
  @ApiProperty({ required: false })
  endDate: Date;
  @ApiProperty()
  dailyLimit: number;
  @ApiProperty()
  description: string;
}

export class CompetitorEnrollDto {
  @ApiProperty()
  competitionId: string;
  @ApiProperty({ required: false })
  userEmail: string;
}

export class CompetitionEntryDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  competitorId: string;
  @ApiProperty()
  competitorName: string;
  @ApiProperty()
  score: number;
  @ApiProperty()
  metrics: Record<string, any>;
  @ApiProperty()
  metaData: Record<string, any>;
  @ApiProperty()
  timestamp: Date;
  @ApiProperty()
  numEntries: number;
  @ApiProperty()
  imageSnippetUrl: string;
  @ApiProperty()
  status: string;
  @ApiProperty()
  progress: number;
  @ApiProperty()
  queueSize: number;
  @ApiProperty()
  message: string;
}

export class CompetitionLeaderboardDto {
  @ApiProperty()
  competitionId: string;
  @ApiProperty({ type: CompetitionEntryDto, isArray: true })
  entries: CompetitionEntryDto[];
}

export class CompetitionGetEntriesDto {
  @ApiProperty()
  competitionId: string;
  @ApiProperty({ type: CompetitionEntryDto, isArray: true })
  entries: CompetitionEntryDto[];
}

export class GetAllCompetitionsDto {
  @ApiProperty({ type: CompetitionInfoDto, isArray: true })
  competitions: CompetitionInfoDto[];
}

export class CompetitorInfoDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  score: number;
  @ApiProperty()
  imageSnippetUrl?: string;
}

export class CompetitorInfoWithImageFileDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  score: number;
  @ApiProperty()
  imageSnippetUrl: string;
  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

export class NumEntriesLeftDto {
  @ApiProperty()
  numEntriesLeft: number;
  @ApiProperty({ description: 'Time to refresh to refreshNum in milliseconds' })
  timeToRefresh: number; // milliseconds
  @ApiProperty()
  refreshNum: number;
}
