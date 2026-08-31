/**
 * Kiwi Apps Framework - Tool Type Definitions
 *
 * Defines tools that apps expose, following MCP (Model Context Protocol) patterns.
 * Tools can be executed locally, via backend API, or with SSE streaming.
 */

/**
 * JSON Schema property definition for tool parameters
 */
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: unknown;
  additionalProperties?: boolean | JSONSchemaProperty;
}

/**
 * JSON Schema for tool input/output
 */
export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Context provided during tool execution
 */
export interface ToolExecutionContext {
  /** ID of the app that owns the tool */
  appId: string;

  /** Current user's ID */
  userId: string;

  /** Current user's username */
  username?: string;

  /** Current class ID if applicable */
  classId?: string;

  /** Current exercise ID if applicable */
  exerciseId?: string;

  /** Current exercise set ID if applicable */
  exerciseSetId?: string;

  /** Current conversation ID if applicable */
  conversationId?: string;

  /** Current widget ID if applicable */
  widgetId?: string;

  /** JWT auth token for backend calls */
  authToken: string;

  /** Additional context data from the widget */
  widgetContext?: Record<string, unknown>;
}

/**
 * Handler function for local tool execution
 */
export type ToolHandler = (
  params: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<ToolResult>;

/**
 * Callback for streaming tool updates
 */
export type StreamingCallback = (
  chunk: string,
  isComplete: boolean,
  metadata?: Record<string, unknown>
) => void;

/**
 * Handler function for streaming tool execution
 */
export type StreamingToolHandler = (
  params: Record<string, unknown>,
  context: ToolExecutionContext,
  onStream: StreamingCallback
) => Promise<ToolResult>;

/**
 * Tool execution type
 */
export type ToolExecutionType = 'local' | 'backend' | 'streaming';

/**
 * Tool execution configuration
 */
export interface ToolExecutionConfig {
  /** How the tool is executed */
  type: ToolExecutionType;

  /** Backend endpoint for 'backend' or 'streaming' types */
  endpoint?: string;

  /** HTTP method for backend calls (default: POST) */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';

  /** Local handler function for 'local' type */
  handler?: ToolHandler;

  /** Streaming handler for 'streaming' type with local processing */
  streamingHandler?: StreamingToolHandler;

  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Tool definition following MCP patterns
 */
export interface KiwiToolDefinition {
  /** Unique tool identifier (e.g., 'run_code', 'submit_code') */
  name: string;

  /** Human-readable description */
  description: string;

  /** JSON Schema for input parameters */
  inputSchema: JSONSchema;

  /** Optional JSON Schema for output */
  outputSchema?: JSONSchema;

  /** Execution configuration */
  execution: ToolExecutionConfig;

  /** Whether widgets can directly invoke this tool */
  allowWidgetAccess?: boolean;

  /** Required permissions to use this tool */
  requiredPermissions?: string[];

  /** Tool metadata for AI/model consumption */
  metadata?: {
    /** Display title for the tool */
    title?: string;

    /** Category for grouping */
    category?: string;

    /** Whether tool should be hidden from AI */
    private?: boolean;
  };
}

/**
 * Result of a tool execution
 */
export interface ToolResult {
  /** Whether execution succeeded */
  success: boolean;

  /** Result data (for success) */
  data?: unknown;

  /** Error message (for failure) */
  error?: string;

  /** Structured content for AI reasoning (MCP pattern) */
  structuredContent?: Record<string, unknown>;

  /** Metadata for the host (not sent to AI) */
  _meta?: {
    /** Should widget be updated */
    widgetUpdate?: boolean;

    /** Suggested display mode */
    displayMode?: 'inline' | 'modal' | 'fullscreen';

    /** Duration of execution in ms */
    duration?: number;

    /** Additional widget-only data */
    [key: string]: unknown;
  };
}

/**
 * Tool invocation request
 */
export interface ToolInvocation {
  /** Tool name to invoke */
  toolName: string;

  /** Tool parameters */
  params: Record<string, unknown>;

  /** Invocation context */
  context: ToolExecutionContext;

  /** Streaming callback if applicable */
  onStream?: StreamingCallback;
}
