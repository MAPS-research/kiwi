import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { EngineChoice } from 'src/common/llm/interfaces/engine-config';

/**
 * Caps on client-supplied history. `conversation`, each turn's `content` and
 * `chatSummary` are spliced into the outgoing messages array, so without a
 * bound they are a prompt-stuffing and context-window vector, not just a cost
 * one.
 */
export const MAX_CONVERSATION_TURNS = 200;
export const MAX_TURN_CONTENT_CHARS = 4000;
export const MAX_CHAT_SUMMARY_CHARS = 4000;

/**
 * Environment context - represents the current UI state
 */
export class EnvironmentContext {
  @ApiProperty({
    description: 'Current active tab in the UI',
    enum: ['materials', 'exercises', 'chat', 'dashboard', 'app'],
    example: 'materials',
  })
  @IsEnum(['materials', 'exercises', 'chat', 'dashboard', 'app'])
  activeTab: 'materials' | 'exercises' | 'chat' | 'dashboard' | 'app';

  @ApiPropertyOptional({
    description: 'Current view within the active tab',
    example: 'pdf-viewer',
  })
  @IsOptional()
  @IsString()
  activeView?: string;

  @ApiPropertyOptional({
    description: 'Currently active app slug (when activeTab is "app")',
    example: 'codegen',
  })
  @IsOptional()
  @IsString()
  activeAppSlug?: string;

  @ApiPropertyOptional({
    description: 'Currently active app name (when activeTab is "app")',
    example: 'Code Practice',
  })
  @IsOptional()
  @IsString()
  activeAppName?: string;

  @ApiPropertyOptional({
    description: 'Current URL path in the frontend',
    example: '/class/123/materials',
  })
  @IsOptional()
  @IsString()
  currentPath?: string;
}

/**
 * Navigation action that can be returned in responses
 */
export class NavigationAction {
  @ApiProperty({
    description: 'Type of navigation action',
    enum: ['navigate', 'focus', 'scroll'],
  })
  type: 'navigate' | 'focus' | 'scroll';

  @ApiProperty({
    description: 'Target tab to navigate to',
    enum: ['materials', 'exercises', 'chat', 'dashboard', 'app'],
  })
  targetTab?: 'materials' | 'exercises' | 'chat' | 'dashboard' | 'app';

  @ApiPropertyOptional({ description: 'PDF document ID for materials tab' })
  pdfId?: string;

  @ApiPropertyOptional({ description: 'Page number for materials tab' })
  pageNumber?: number;

  @ApiPropertyOptional({ description: 'Exercise ID for exercises tab' })
  exerciseId?: string;

  @ApiPropertyOptional({ description: 'Exercise set ID for exercises tab' })
  exerciseSetId?: string;

  @ApiPropertyOptional({ description: 'App slug for app tab' })
  appSlug?: string;

  @ApiPropertyOptional({ description: 'Human-readable reason for navigation' })
  reason?: string;
}

export class StudentContext {
  @ApiProperty()
  classId: string;
  @ApiProperty({
    description:
      'The page number of the material the student is viewing. 1 indexed.',
  })
  pageNumber: number;
  @ApiProperty()
  pdfId: string;
  @ApiProperty()
  materialType: string;
}

export class CodegenContext {
  @ApiProperty()
  problemId: string;
  @ApiProperty({
    required: false,
    description: 'Full code context as a string (may be truncated server-side)',
  })
  codeContext?: string;
  @ApiProperty({
    required: false,
    description: 'Selected code snippet as a string',
  })
  selectedCode?: string;
  @ApiProperty({
    required: false,
    description: 'Error or traceback as a string',
  })
  errorContext?: string;
}

/**
 * App context - used when the user is interacting with a Kiwi App
 */
export class AppContext {
  @ApiProperty({ description: 'App identifier/slug' })
  @IsString()
  appSlug: string;

  @ApiPropertyOptional({
    description: 'App-provided context string (e.g., current state, user data)',
  })
  @IsOptional()
  @IsString()
  appContext?: string;

  @ApiPropertyOptional({
    description:
      "Tutoring style the app requests the AI apply (e.g. 'guidance' for hint-based, never-reveal-solution behavior)",
    enum: ['guidance'],
  })
  @IsOptional()
  @IsEnum(['guidance'])
  tutoringMode?: 'guidance';

  @ApiPropertyOptional({ description: 'Class ID for class-scoped app context' })
  @IsOptional()
  @IsString()
  classId?: string;
}

/**
 * Instructor/admin-only experiment preview override. This does not create or
 * mutate assignment rows; it only applies the selected variant's chat config
 * for the current request.
 */
export class ExperimentOverrideContext {
  @ApiProperty({ description: 'Experiment id to preview' })
  @IsString()
  experimentId: string;

  @ApiProperty({ description: 'Variant key to simulate' })
  @IsString()
  variantKey: string;
}

/**
 * Unified context combining PDF, Codegen, App, and Environment contexts
 */
export class UnifiedChatContext {
  @ApiPropertyOptional({
    type: () => StudentContext,
    description: 'PDF/materials context - used when viewing documents',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StudentContext)
  pdf?: StudentContext;

  @ApiPropertyOptional({
    type: () => CodegenContext,
    description: 'Codegen context - used when working on exercises',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CodegenContext)
  codegen?: CodegenContext;

  @ApiPropertyOptional({
    type: () => AppContext,
    description: 'App context - used when activeTab is "app"',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AppContext)
  app?: AppContext;

  @ApiPropertyOptional({
    type: () => ExperimentOverrideContext,
    description:
      'Instructor/admin-only experiment preview override for simulating a specific variant in student chat',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExperimentOverrideContext)
  experiment?: ExperimentOverrideContext;

  @ApiProperty({
    type: EnvironmentContext,
    description: 'Current UI environment context',
  })
  @ValidateNested()
  @Type(() => EnvironmentContext)
  environment: EnvironmentContext;
}

/**
 * Result of a client-side (browser) tool execution, sent by the frontend to
 * resume a paused agent loop. When present on a chat request, the backend
 * seeds the agent conversation with the prior assistant tool_call and this
 * tool result before running the loop, so the agent continues where it paused.
 */
export class ClientToolResult {
  @ApiProperty({
    description:
      'The OpenAI tool call ID that was paused (from the clientAction event)',
  })
  @IsString()
  toolCallId: string;

  @ApiProperty({
    description:
      'The client tool name that was executed (e.g. "navigate", "observe")',
  })
  @IsString()
  tool: string;

  @ApiProperty({
    description:
      'The result of executing the client tool in the browser. Stringified or structured; threaded back into the agent as the tool message content.',
  })
  result: unknown;

  @ApiPropertyOptional({
    description: 'Whether the client tool execution errored',
    default: false,
  })
  @IsOptional()
  isError?: boolean;

  @ApiPropertyOptional({
    description:
      'Arguments the assistant originally passed to the tool, used to reconstruct the assistant tool_call message when resuming.',
  })
  @IsOptional()
  args?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'The interaction id of the original user turn. On resume, the same interaction is reused/updated so the multi-step agent turn is a single history entry.',
  })
  @IsOptional()
  @IsString()
  interactionId?: string;
}

/** A prior turn in the conversation, replayed so the agent has real history. */
export class ConversationTurn {
  @ApiProperty({
    enum: ['user', 'assistant'],
    description:
      'Who spoke. Only these two roles are accepted — any other value would inject an arbitrary role into the messages array.',
  })
  // IsIn rather than IsEnum: IsEnum over an array literal renders an empty
  // "must be one of the following values:" message.
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({
    description: `Turn text. Truncated turns are the client's responsibility; longer than ${MAX_TURN_CONTENT_CHARS} characters is rejected.`,
    maxLength: MAX_TURN_CONTENT_CHARS,
  })
  @IsString()
  @MaxLength(MAX_TURN_CONTENT_CHARS)
  content: string;
}

/**
 * Unified chat request DTO for /chat/v2 endpoint
 */
export class UnifiedChatRequest {
  @ApiProperty({ description: 'User prompt/message' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: `Chat history summary for context, at most ${MAX_CHAT_SUMMARY_CHARS} characters.`,
    maxLength: MAX_CHAT_SUMMARY_CHARS,
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CHAT_SUMMARY_CHARS)
  chatSummary?: string;

  @ApiPropertyOptional({
    description:
      'Stable conversation/thread id. All messages in one chat session share it so they group into a single history entry (stored as the interaction stringTag).',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    type: [ConversationTurn],
    description: `Prior conversation turns (oldest first), replayed into the agent so it remembers the back-and-forth across turns. At most ${MAX_CONVERSATION_TURNS} turns, each at most ${MAX_TURN_CONTENT_CHARS} characters.`,
    maxItems: MAX_CONVERSATION_TURNS,
  })
  @IsOptional()
  @ArrayMaxSize(MAX_CONVERSATION_TURNS)
  @ValidateNested({ each: true })
  @Type(() => ConversationTurn)
  conversation?: ConversationTurn[];

  @ApiProperty({
    type: UnifiedChatContext,
    description:
      'Unified context containing PDF, codegen, and environment info',
  })
  @ValidateNested()
  @Type(() => UnifiedChatContext)
  context: UnifiedChatContext;

  @ApiPropertyOptional({
    description: 'LLM engine choice',
  })
  @IsOptional()
  engineChoice?: EngineChoice;

  @ApiPropertyOptional({
    type: () => ClientToolResult,
    description:
      'Result of a client-side tool the frontend just executed, used to resume a paused agent loop. Prefer clientToolTrail; kept for older clients that send only the latest step.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientToolResult)
  clientToolResult?: ClientToolResult;

  @ApiPropertyOptional({
    type: () => [ClientToolResult],
    description:
      'EVERY client tool executed so far in this agent turn, oldest first (the last entry is the step that just finished). Seeding the whole trail is what lets the agent remember earlier results: each browser round-trip rebuilds the message list from scratch, so sending only the latest step gave the agent amnesia about the sitemap/class list it had already fetched, and it looped re-fetching them.',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ClientToolResult)
  clientToolTrail?: ClientToolResult[];
}

export class StudentChatRequest {
  @ApiProperty()
  prompt: string;
  @ApiProperty()
  chatSummary: string;
  @ApiProperty({
    enum: ['pdf', 'codegen'],
    description:
      'Type of chat context - pdf for document-based chat, codegen for exercise-based chat',
  })
  type: 'pdf' | 'codegen';
  @ApiProperty({
    type: StudentContext,
    description: 'PDF context - required when type is "pdf"',
  })
  studentContext?: StudentContext;
  @ApiProperty({
    type: CodegenContext,
    description: 'Codegen context - required when type is "codegen"',
  })
  codegenContext?: CodegenContext;
  @ApiProperty()
  engineChoice?: EngineChoice;
}

export class BotResponse {
  @ApiProperty()
  botResponse: string;

  @ApiProperty()
  id: string;

  @ApiProperty()
  citations: any; // Adjust the type according to your actual data structure

  @ApiProperty()
  streaming: boolean;
}

export class OAuthRequiredResponse {
  @ApiProperty({ description: 'The MCP server ID requiring authorization' })
  serverId: string;

  @ApiProperty({ description: 'The display name of the MCP server' })
  serverName: string;

  @ApiProperty({ description: 'The tool that requires OAuth authorization' })
  toolName: string;

  @ApiProperty({
    description: 'URL to redirect the user for OAuth authorization',
  })
  authorizationUrl: string;

  @ApiProperty({
    description: 'User-friendly message explaining the OAuth requirement',
  })
  message: string;
}

export class StudentChatResponseData {
  @ApiProperty({ type: BotResponse, required: false })
  bot?: BotResponse;

  @ApiProperty({ type: OAuthRequiredResponse, required: false })
  oauthRequired?: OAuthRequiredResponse;
}

export class StudentChatResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: StudentChatResponseData })
  data: StudentChatResponseData;
}

/**
 * Unified chat response data with optional navigation action
 */
export class UnifiedChatResponseData extends StudentChatResponseData {
  @ApiPropertyOptional({
    type: NavigationAction,
    description: 'Navigation action if LLM requested navigation',
  })
  navigation?: NavigationAction;
}

/**
 * Unified chat response for /chat/v2 endpoint
 */
export class UnifiedChatResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: UnifiedChatResponseData })
  data: UnifiedChatResponseData;
}
