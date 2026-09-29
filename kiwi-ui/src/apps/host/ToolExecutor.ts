/**
 * Kiwi Apps Framework - Tool Executor
 *
 * Handles execution of tools based on their execution type:
 * - local: Execute handler function directly
 * - backend: Make HTTP request to backend endpoint
 * - streaming: Use SSE for streaming responses
 *
 * Follows patterns from Exercise.tsx for SSE streaming.
 */

import { fetchEventSource } from '@microsoft/fetch-event-source';
import { basePath } from '../../utils/api.ts';
import apiClient from '../../utils/api.ts';
import type {
  KiwiToolDefinition,
  ToolExecutionContext,
  ToolResult,
  StreamingCallback,
  ToolInvocation,
} from '../types/index.ts';
import { getAppRegistry } from '../registry/index.ts';

/**
 * Execute a tool by name
 */
export async function executeTool(
  invocation: ToolInvocation
): Promise<ToolResult> {
  const { toolName, params, context, onStream } = invocation;
  const registry = getAppRegistry();

  // Find the tool
  const toolInfo = registry.findToolInContext(toolName, context.appId);

  if (!toolInfo) {
    return {
      success: false,
      error: `Tool '${toolName}' not found`,
    };
  }

  const { tool } = toolInfo;

  // Execute based on type
  switch (tool.execution.type) {
    case 'local':
      return executeLocalTool(tool, params, context);

    case 'backend':
      return executeBackendTool(tool, params, context);

    case 'streaming':
      if (!onStream) {
        return {
          success: false,
          error: 'Streaming tool requires onStream callback',
        };
      }
      return executeStreamingTool(tool, params, context, onStream);

    default:
      return {
        success: false,
        error: `Unknown execution type: ${tool.execution.type}`,
      };
  }
}

/**
 * Execute a local tool (runs handler function directly)
 */
async function executeLocalTool(
  tool: KiwiToolDefinition,
  params: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();

  if (!tool.execution.handler) {
    return {
      success: false,
      error: `Local tool '${tool.name}' has no handler`,
    };
  }

  try {
    const result = await tool.execution.handler(params, context);

    // Add duration if not already present
    if (result._meta) {
      result._meta.duration = result._meta.duration ?? Date.now() - startTime;
    } else {
      result._meta = { duration: Date.now() - startTime };
    }

    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Local tool execution failed',
      _meta: { duration: Date.now() - startTime },
    };
  }
}

/**
 * Build enriched params by injecting context fields into request body
 * This allows backend tools to receive widgetId, exerciseId, etc. automatically
 */
function buildEnrichedParams(
  params: Record<string, unknown>,
  context: ToolExecutionContext
): Record<string, unknown> {
  const enriched: Record<string, unknown> = { ...params };

  // Inject context fields if not already provided in params
  if (context.widgetId && !('widgetId' in params)) {
    enriched.widgetId = context.widgetId;
  }
  if (context.exerciseId && !('exerciseId' in params)) {
    enriched.exerciseId = context.exerciseId;
  }
  if (context.classId && !('classId' in params)) {
    enriched.classId = context.classId;
  }
  if (context.exerciseSetId && !('exerciseSetId' in params)) {
    enriched.exerciseSetId = context.exerciseSetId;
  }
  if (context.conversationId && !('conversationId' in params)) {
    enriched.conversationId = context.conversationId;
  }

  return enriched;
}

/**
 * Execute a backend tool (HTTP request)
 */
async function executeBackendTool(
  tool: KiwiToolDefinition,
  params: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const endpoint = tool.execution.endpoint;

  if (!endpoint) {
    return {
      success: false,
      error: `Backend tool '${tool.name}' has no endpoint`,
    };
  }

  const method = tool.execution.method ?? 'POST';

  // Enrich params with context fields for POST/PUT requests
  const enrichedParams = method !== 'GET' ? buildEnrichedParams(params, context) : params;

  try {
    const response = await fetch(`${basePath}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.authToken}`,
      },
      credentials: 'include',
      body: method !== 'GET' ? JSON.stringify(enrichedParams) : undefined,
    });

    if (!response.ok) {
      // Handle 401 - try to refresh token
      if (response.status === 401) {
        try {
          const refreshResponse = await apiClient.authControllerRefreshAccessToken();
          if (refreshResponse.accessToken) {
            localStorage.setItem('authToken', refreshResponse.accessToken);

            // Retry with new token
            const retryResponse = await fetch(`${basePath}${endpoint}`, {
              method,
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${refreshResponse.accessToken}`,
              },
              credentials: 'include',
              body: method !== 'GET' ? JSON.stringify(enrichedParams) : undefined,
            });

            if (retryResponse.ok) {
              const data = await retryResponse.json();
              return {
                success: true,
                data,
                _meta: { duration: Date.now() - startTime },
              };
            }
          }
        } catch {
          // Token refresh failed
        }
      }

      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        _meta: { duration: Date.now() - startTime },
      };
    }

    const data = await response.json();

    return {
      success: true,
      data,
      _meta: { duration: Date.now() - startTime },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Backend tool execution failed',
      _meta: { duration: Date.now() - startTime },
    };
  }
}

/**
 * Execute a streaming tool (SSE)
 *
 * Follows the pattern from Exercise.tsx handleSendAIPanelMessage
 */
async function executeStreamingTool(
  tool: KiwiToolDefinition,
  params: Record<string, unknown>,
  context: ToolExecutionContext,
  onStream: StreamingCallback
): Promise<ToolResult> {
  const startTime = Date.now();
  const endpoint = tool.execution.endpoint;

  if (!endpoint) {
    return {
      success: false,
      error: `Streaming tool '${tool.name}' has no endpoint`,
    };
  }

  // If tool has a custom streaming handler, use it
  if (tool.execution.streamingHandler) {
    return tool.execution.streamingHandler(params, context, onStream);
  }

  // Enrich params with context fields
  const enrichedParams = buildEnrichedParams(params, context);

  // Default SSE implementation
  return new Promise((resolve) => {
    let accumulatedResponse = '';
    const abortController = new AbortController();

    const makeRequest = (token: string) => {
      fetchEventSource(`${basePath}${endpoint}`, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: abortController.signal,
        openWhenHidden: true,
        body: JSON.stringify(enrichedParams),
        credentials: 'include',

        onopen(response) {
          return new Promise<void>((openResolve, openReject) => {
            if (response.ok && response.status === 200) {
              openResolve();
            } else if (response.status === 401) {
              // Try to refresh token
              apiClient
                .authControllerRefreshAccessToken()
                .then((refreshResponse) => {
                  if (refreshResponse.accessToken) {
                    localStorage.setItem('authToken', refreshResponse.accessToken);
                    makeRequest(refreshResponse.accessToken);
                    openResolve();
                  } else {
                    openReject(new Error('Failed to refresh token'));
                  }
                })
                .catch(() => {
                  openReject(new Error('Failed to refresh token'));
                });
            } else if (response.status === 429) {
              openReject(new Error('Rate limited. Please try again later.'));
            } else if (response.status === 403) {
              openReject(new Error('You are not allowed to use this feature.'));
            } else {
              openReject(new Error(`Stream error: ${response.statusText}`));
            }
          });
        },

        onmessage(event) {
          try {
            if (event.data) {
              const parsedData = JSON.parse(event.data);
              const { botResponse, streaming } = parsedData.bot || {};

              if (botResponse) {
                accumulatedResponse += botResponse;
              }

              const isComplete = streaming === 'stop';
              onStream(accumulatedResponse, isComplete);

              if (isComplete) {
                resolve({
                  success: true,
                  data: accumulatedResponse,
                  structuredContent: {
                    response: accumulatedResponse,
                    streaming: false,
                  },
                  _meta: { duration: Date.now() - startTime },
                });
              }
            }
          } catch (err) {
            console.error('[ToolExecutor] Error parsing SSE message:', err);
          }
        },

        onerror(err) {
          console.error('[ToolExecutor] SSE error:', err);
          resolve({
            success: false,
            error: `Stream error: ${err.message || 'Unknown error'}`,
            _meta: { duration: Date.now() - startTime },
          });
        },

        onclose() {
          // Stream closed normally
          if (accumulatedResponse) {
            resolve({
              success: true,
              data: accumulatedResponse,
              _meta: { duration: Date.now() - startTime },
            });
          }
        },
      });
    };

    makeRequest(context.authToken);
  });
}

/**
 * Create a tool executor bound to a specific context
 *
 * Useful for creating a scoped executor for a widget
 */
export function createToolExecutor(context: ToolExecutionContext) {
  return {
    execute: (toolName: string, params: Record<string, unknown>) =>
      executeTool({ toolName, params, context }),

    executeStreaming: (
      toolName: string,
      params: Record<string, unknown>,
      onStream: StreamingCallback
    ) => executeTool({ toolName, params, context, onStream }),
  };
}

/**
 * Validate tool parameters against schema
 *
 * Basic validation - can be enhanced with a proper JSON Schema validator
 */
export function validateToolParams(
  tool: KiwiToolDefinition,
  params: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const schema = tool.inputSchema;

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in params) || params[field] === undefined) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Check field types (basic)
  for (const [key, value] of Object.entries(params)) {
    const propSchema = schema.properties[key];
    if (propSchema) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (propSchema.type !== actualType && value !== null && value !== undefined) {
        // Allow null/undefined for optional fields
        if (!schema.required?.includes(key)) {
          continue;
        }
        errors.push(
          `Field '${key}' should be ${propSchema.type}, got ${actualType}`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export default {
  executeTool,
  createToolExecutor,
  validateToolParams,
};
