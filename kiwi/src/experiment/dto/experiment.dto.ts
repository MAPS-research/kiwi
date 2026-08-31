import { ApiProperty } from '@nestjs/swagger';

/**
 * Request/response DTOs exist so @nestjs/swagger documents the request bodies
 * and response shapes — without them the generated OpenAPI client sends no body
 * and types every method as `void`. The experiment `config` is validated by the
 * zod contract (experiment-config.ts); here it is exposed as a free-form object.
 */

export class ExperimentConfigBody {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'The experiment Config JSON (validated server-side against the zod contract)',
  })
  config: Record<string, any>;
}

export class ExperimentResponse {
  @ApiProperty() id: string;
  @ApiProperty() classId: string;
  @ApiProperty() name: string;
  @ApiProperty({ required: false, nullable: true }) description?: string | null;
  @ApiProperty({ description: 'draft | active | completed' }) status: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  config: Record<string, any>;
  @ApiProperty() createdBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class VariantCountResponse {
  @ApiProperty() variantKey: string;
  @ApiProperty() count: number;
}

export class VariantAnalyticsResponse {
  @ApiProperty() variantKey: string;
  @ApiProperty() students: number;
  @ApiProperty() interactions: number;
}

export class SystemPromptsResponse {
  @ApiProperty() defaultSystemMessage: string;
  @ApiProperty() classMaterialsPrompt: string;
  @ApiProperty() recitationPrompt: string;
}

export class StudentRosterEntry {
  @ApiProperty() userId: string;
  @ApiProperty() email: string;
}

export class AssistantMessage {
  @ApiProperty({ description: 'user | assistant' }) role: string;
  @ApiProperty() content: string;
}

export class AssistantChatBody {
  @ApiProperty({ type: [AssistantMessage] })
  messages: AssistantMessage[];
}

export class AssistantChatResponse {
  @ApiProperty({ description: "The assistant's natural-language reply" })
  reply: string;
  @ApiProperty({
    required: false,
    nullable: true,
    type: 'object',
    additionalProperties: true,
    description:
      'A complete, validated experiment Config JSON when the design is ready; otherwise null',
  })
  config?: Record<string, any> | null;
}
