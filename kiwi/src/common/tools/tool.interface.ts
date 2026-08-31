/**
 * Tool Interface for Unified Tool Management
 *
 * Defines a common interface for all tools available to the LLM:
 * - Built-in tools (RAG, Code Interpreter)
 * - MCP tools (from external MCP servers)
 *
 * This abstraction allows the LLM service to work with any tool
 * without knowing its source.
 */

/**
 * Tool type enum
 */
export enum ToolSource {
  RAG = 'RAG',
  CODE_INTERPRETER = 'CodeInterpreter',
  MCP = 'MCP',
}

/**
 * Tool definition compatible with OpenAI function calling format
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

/**
 * Extended tool information for internal use
 */
export interface Tool {
  /** Unique identifier for the tool */
  id: string;

  /** Source of the tool (built-in or MCP) */
  source: ToolSource;

  /** OpenAI-compatible tool definition */
  definition: ToolDefinition;

  /** For MCP tools: server ID */
  mcpServerId?: string;

  /** Whether this tool is enabled for the current context */
  isEnabled: boolean;

  /** Priority for tool selection (higher = preferred) */
  priority: number;

  /** Configuration overrides */
  configuration?: Record<string, any>;
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  /** User making the request */
  userId: string;

  /** User session ID */
  userSessionId: string;

  /** Class context (optional) */
  classId?: string;

  /** Chat type: 'pdf' or 'codegen' */
  chatType: 'pdf' | 'codegen';

  /** Additional student context for tools */
  studentContext?: {
    pdfId?: string;
    pdfPage?: number;
    materialType?: string;
    chatSummary?: string;
    engineChoice?: string;
  };
}

/**
 * OAuth details when authorization is required for MCP tool
 */
export interface OAuthDetails {
  /** MCP server ID */
  serverId: string;

  /** Display name of the MCP server */
  serverName: string;

  /** Name of the tool that requires OAuth */
  toolName: string;

  /** URL to redirect user for OAuth authorization */
  authorizationUrl: string;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  /** Whether the tool executed successfully */
  success: boolean;

  /** Tool output (string or structured data) */
  output: any;

  /** Error message if failed */
  error?: string;

  /** Additional metadata about execution */
  metadata?: Record<string, any>;

  /** Whether OAuth authorization is required to execute this tool */
  oauthRequired?: boolean;

  /** OAuth details when authorization is needed */
  oauthDetails?: OAuthDetails;

  /**
   * Set when the tool must be executed in the browser (client-side tool).
   * The server does NOT run any logic; instead the agent loop pauses and
   * emits a clientAction directive so the frontend can run the tool and
   * resume the chat with the result.
   */
  clientAction?: {
    /** Client tool name (e.g. 'navigate', 'observe', 'click', 'fill', 'get_sitemap') */
    tool: string;

    /** Parsed arguments for the client tool */
    args: Record<string, unknown>;

    /** OpenAI tool call ID, used by the frontend to resume the loop */
    toolCallId?: string;
  };
}
