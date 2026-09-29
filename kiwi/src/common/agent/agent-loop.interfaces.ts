/**
 * Agent Loop Interfaces
 *
 * Type definitions for the ReAct-style agent loop that enables
 * iterative tool execution with reflection.
 */

import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OAuthDetails, ToolExecutionResult } from '../tools/tool.interface';

/**
 * Configuration for the agent loop
 */
export interface AgentLoopConfig {
  /** Maximum number of iterations before stopping (default: 10) */
  maxIterations: number;

  /** Maximum tokens for each LLM iteration (default: 1000) */
  maxTokensPerIteration: number;

  /** Whether to stream intermediate responses to the user (default: true) */
  streamIntermediateResponses: boolean;

  /** Timeout for individual tool executions in ms (default: 30000) */
  toolExecutionTimeout: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_AGENT_LOOP_CONFIG: AgentLoopConfig = {
  maxIterations: 10,
  maxTokensPerIteration: 1000,
  streamIntermediateResponses: true,
  toolExecutionTimeout: 30000,
};

/**
 * Agent loop status
 */
export type AgentLoopStatus =
  'running' | 'completed' | 'paused_oauth' | 'error' | 'max_iterations';

/**
 * State maintained throughout the agent loop
 */
export interface AgentLoopState {
  /** Current iteration count */
  iterationCount: number;

  /** Accumulated messages for the conversation */
  messages: ChatCompletionMessageParam[];

  /** History of tool calls made during this loop */
  toolCallHistory: ToolCallRecord[];

  /** Total tokens used across all iterations */
  totalTokensUsed: number;

  /** Total prompt (input) tokens across all iterations */
  totalPromptTokens: number;

  /** Total completion (output) tokens across all iterations */
  totalCompletionTokens: number;

  /**
   * Prompt tokens served from the provider's prompt cache across all
   * iterations. Both engines cache automatically on an exact prompt prefix, so
   * this is the readout for how much of the prefix stayed stable.
   */
  totalCachedTokens: number;

  /**
   * Reasoning tokens across all iterations (gpt-5.x). These are billed as
   * completion tokens and share the `max_completion_tokens` budget with the
   * visible answer, so a high value here explains a short or empty reply.
   */
  totalReasoningTokens: number;

  /** When the loop started */
  startTime: Date;

  /** Current status of the loop */
  status: AgentLoopStatus;
}

/**
 * Record of a single tool call
 */
export interface ToolCallRecord {
  /** Which iteration this tool call occurred in */
  iteration: number;

  /** OpenAI tool call ID */
  toolCallId: string;

  /** Name of the tool */
  toolName: string;

  /** Arguments passed to the tool */
  arguments: Record<string, unknown>;

  /** Result from the tool execution */
  result: ToolExecutionResult;

  /** When the tool was called */
  timestamp: Date;

  /** How long the tool took to execute */
  durationMs: number;
}

/**
 * Types of events emitted by the agent loop
 */
export type AgentEventType =
  | 'iteration_start' // New loop iteration starting
  | 'content_delta' // Streaming text content from LLM
  | 'tool_call_start' // Tool execution starting
  | 'tool_call_complete' // Tool execution finished
  | 'oauth_required' // OAuth pause needed
  | 'client_action' // Client-side (browser) tool pause needed
  | 'iteration_complete' // Loop iteration finished
  | 'final_response' // Agent has final answer (no more tool calls)
  | 'max_iterations' // Safety limit reached
  | 'error'; // Error occurred

/**
 * Tool call information for events
 */
export interface ToolCallEventData {
  /** OpenAI tool call ID */
  id: string;

  /** Name of the tool */
  name: string;

  /** Arguments (for tool_call_start) */
  arguments?: Record<string, unknown>;

  /** Result (for tool_call_complete) */
  result?: unknown;

  /** Error message if tool failed */
  error?: string;

  /** Metadata from tool execution (for frontend actions like navigation) */
  metadata?: Record<string, unknown>;
}

/**
 * Directive for a client-side (browser) tool that the frontend must execute.
 * Emitted on a 'client_action' event when the agent loop pauses.
 */
export interface ClientActionDirective {
  /** Client tool name (e.g. 'navigate', 'observe', 'click', 'fill', 'get_sitemap') */
  tool: string;

  /** Parsed arguments for the client tool */
  args: Record<string, unknown>;

  /** OpenAI tool call ID, used by the frontend to resume the loop */
  toolCallId?: string;
}

/**
 * Event emitted by the agent loop
 */
export interface AgentStreamEvent {
  /** Type of event */
  type: AgentEventType;

  /** Which iteration this event belongs to */
  iteration: number;

  /** Event-specific data */
  data: {
    /** Text content (for content_delta, final_response) */
    content?: string;

    /** Tool call information (for tool events) */
    toolCall?: ToolCallEventData;

    /** OAuth details (for oauth_required) */
    oauth?: OAuthDetails;

    /** Client-side tool directive (for client_action) */
    clientAction?: ClientActionDirective;

    /** Error message (for error events) */
    error?: string;

    /** Citations for the response */
    citations?: Array<{ pdfID: string; pageNumber: string }>;

    /** Snapshot of loop state */
    state?: Partial<AgentLoopState>;
  };
}

/**
 * Parsed tool call from LLM response
 */
export interface ParsedToolCall {
  /** OpenAI tool call ID */
  id: string;

  /** Name of the tool to call */
  name: string;

  /** Parsed arguments for the tool */
  arguments: Record<string, unknown>;
}

/**
 * Result from executing a tool call
 */
export interface ToolCallExecutionResult {
  /** Tool call ID this result corresponds to */
  toolCallId: string;

  /** The execution result */
  result: ToolExecutionResult;
}

/**
 * Response from a single LLM call within the loop
 */
export interface LlmIterationResponse {
  /** Text content from the LLM */
  content: string;

  /** Tool calls requested by the LLM (null if none) */
  toolCalls: ParsedToolCall[] | null;

  /** Token usage for this iteration */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;

    /** Prompt tokens served from the provider's prompt cache, when reported. */
    cachedTokens?: number;

    /** Reasoning tokens (gpt-5.x), when reported. */
    reasoningTokens?: number;
  };
}

/**
 * Context for executing the agent loop
 */
export interface AgentExecutionContext {
  /** User ID */
  userId: string;

  /** User session ID */
  userSessionId: string;

  /** Class ID for tool context (absent for app-wide agent turns). */
  classId?: string;

  /** Chat type: 'pdf' or 'codegen' */
  chatType: 'pdf' | 'codegen';

  /** Engine choice for LLM */
  engineChoice?: string;

  /** Student context for built-in tools (PDF/materials flow) */
  studentContext?: {
    pdfId?: string;
    pageNumber?: number;
    materialType?: string;
    chatSummary?: string;
  };

  /** Codegen context for exercises flow */
  codegenContext?: {
    problemId: string;
    codeContext?: string;
    selectedCode?: string;
    errorContext?: string;
  };

  /** Environment context for UI awareness */
  environmentContext?: {
    activeTab: string;
    activeView?: string;
    activeAppSlug?: string;
    activeAppName?: string;
    currentPath?: string;
  };

  /** Reference to service that can execute built-in tools */
  toolExecutor: unknown;

  /** Interaction ID for logging */
  interactionId?: string;

  /**
   * `prompt_cache_key` for this turn (see `buildPromptCacheKey`). Routes
   * requests that share a stable head to the same prompt-cache shard on engines
   * that accept it; ignored elsewhere.
   */
  cacheKey?: string;
}
