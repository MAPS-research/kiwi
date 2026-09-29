import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PresentUserRequest {
  @ApiProperty()
  userId: string;
}

export class PresentSessionRequest {
  @ApiProperty()
  sessionId: string;
}
export class DateFilterRequest {
  @ApiProperty()
  startDate: string;
  @ApiProperty()
  endDate: string;
  @ApiProperty({ required: false })
  classId?: string; // 添加可选的classId参数
}

export class Action {
  @ApiProperty({ description: 'Action name/type' })
  name: string;

  @ApiProperty({ description: 'Timestamp when action occurred' })
  timestamp: string;

  @ApiProperty({
    description: 'Action context data',
    type: 'object',
    additionalProperties: true,
  })
  context: Record<string, any>;
}

export class Interaction {
  @ApiProperty({ description: 'Interaction ID' })
  id: string;

  @ApiProperty({ description: 'User ID who created the interaction' })
  userId: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({
    description:
      'Interaction type (e.g., "frontend-interaction-chat", "backend-action")',
  })
  type: string;

  @ApiProperty({ description: 'Timestamp when interaction was created' })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Interaction context data',
    type: 'object',
    additionalProperties: true,
  })
  context?: Record<string, any>;

  @ApiProperty({
    type: [Action],
    description: 'List of actions in this interaction',
  })
  actions: Action[];
}

export class PresentResponse {
  @ApiProperty({ type: [Interaction] })
  interactions: Interaction[];
  @ApiProperty()
  count: number;
}
