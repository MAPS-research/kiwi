import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subscriber } from 'rxjs';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { ChatCompletionChunk } from 'openai/resources/chat/completions';

import { LlmService } from '../llm/llm.service';
import { ChatService } from '../chat/chat.service';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { ToolDefinition, ToolExecutionContext } from '../tools/tool.interface';
import { CLIENT_TOOL_NAMES } from '../tools/client-tools';
import { InteractionService } from '../../interaction/interaction.service';
import { UserSessionService } from '../database/user-session.service';
import { EngineChoice } from '../llm/interfaces/engine-config';
import { CONTEXT_BUDGET } from '../context/context-budget';
import { isContextOverflowError } from '../llm/context-window';

import {
  AgentLoopConfig,
  AgentLoopState,
  AgentStreamEvent,
  AgentExecutionContext,
  ParsedToolCall,
  ToolCallExecutionResult,
  LlmIterationResponse,
  DEFAULT_AGENT_LOOP_CONFIG,
} from './agent-loop.interfaces';

/**
 * Agent Loop Service
 *
 * Implements a ReAct-style agent loop for iterative tool execution.
 * The loop:
 * 1. Calls LLM with messages and tools
 * 2. If LLM requests tool calls, executes them
 * 3. Feeds tool results back to LLM
 * 4. Repeats until LLM provides final answer (no tool calls) or max iterations
 */
@Injectable()
export class AgentLoopService {
  private readonly logger = new Logger(AgentLoopService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly chatService: ChatService,
    private readonly toolRegistryService: ToolRegistryService,
    private readonly interactionService: InteractionService,
    private readonly userSessionService: UserSessionService,
  ) {}

  /**
   * Execute the agent loop with streaming support
   *
   * @param initialMessages - Starting messages (system prompt, user query, context)
   * @param tools - Available tools for the LLM
   * @param context - Execution context (user, class, etc.)
   * @param config - Loop configuration
   * @returns Observable that emits AgentStreamEvents
   */
  executeAgentLoop(
    initialMessages: ChatCompletionMessageParam[],
    tools: ToolDefinition[],
    context: AgentExecutionContext,
    config: Partial<AgentLoopConfig> = {},
  ): Observable<AgentStreamEvent> {
    const fullConfig: AgentLoopConfig = {
      ...DEFAULT_AGENT_LOOP_CONFIG,
      ...config,
    };

    return new Observable<AgentStreamEvent>((subscriber) => {
      this.runLoop(initialMessages, tools, context, fullConfig, subscriber)
        .catch((error) => {
          this.logger.error('Agent loop error:', error);
          subscriber.error(error);
        });
    });
  }

  /**
   * Main loop implementation
   */
  private async runLoop(
    initialMessages: ChatCompletionMessageParam[],
    tools: ToolDefinition[],
    context: AgentExecutionContext,
    config: AgentLoopConfig,
    subscriber: Subscriber<AgentStreamEvent>,
  ): Promise<void> {
    const state: AgentLoopState = {
      iterationCount: 0,
      messages: [...initialMessages],
      toolCallHistory: [],
      totalTokensUsed: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalCachedTokens: 0,
      totalReasoningTokens: 0,
      startTime: new Date(),
      status: 'running',
    };

    this.logger.debug(`Starting agent loop with ${state.messages.length} initial messages`);

    /** Overflow recovery fires at most once per turn — see the catch below. */
    let overflowRetried = false;

    try {
      while (state.iterationCount < config.maxIterations) {
        state.iterationCount++;

        this.logger.debug(`Agent loop iteration ${state.iterationCount}`);

        // Emit iteration start event
        subscriber.next({
          type: 'iteration_start',
          iteration: state.iterationCount,
          data: {
            state: { iterationCount: state.iterationCount },
          },
        });

        // Call LLM with current messages.
        //
        // One retry, and only for a provider-confirmed overflow. Every error
        // used to land in the same catch and render as a generic bubble, so a
        // prompt that was merely too long cost the student their turn outright
        // — with nothing shrinking in response, so the next turn failed too.
        let response: LlmIterationResponse;
        try {
          response = await this.executeLlmCall(
            state.messages,
            tools,
            context,
            config,
            subscriber,
            state.iterationCount,
          );
        } catch (error) {
          if (!isContextOverflowError(error) || overflowRetried) throw error;

          const before = state.messages.length;
          state.messages = this.shedHistoryForOverflow(state.messages);
          overflowRetried = true;

          // Only retry if the prompt actually got smaller. A request that
          // overflows on its system prompt and current question alone cannot
          // be repaired by dropping history, and retrying it unchanged would
          // just pay for the same failure twice.
          if (state.messages.length >= before) {
            this.logger.warn(
              '[CTX-OVERFLOW] request exceeds the context window with no ' +
                'history to shed — surfacing the provider error',
            );
            throw error;
          }

          this.logger.warn(
            `[CTX-OVERFLOW] dropped ${before - state.messages.length} ` +
              `replayed message(s) after a context-window rejection; retrying once`,
          );
          response = await this.executeLlmCall(
            state.messages,
            tools,
            context,
            config,
            subscriber,
            state.iterationCount,
          );
        }

        // Track token usage
        if (response.usage) {
          const { promptTokens, completionTokens, totalTokens } = response.usage;
          const cachedTokens = response.usage.cachedTokens ?? 0;
          const reasoningTokens = response.usage.reasoningTokens ?? 0;

          state.totalTokensUsed += totalTokens;
          state.totalPromptTokens += promptTokens;
          state.totalCompletionTokens += completionTokens;
          state.totalCachedTokens += cachedTokens;
          state.totalReasoningTokens += reasoningTokens;

          // Both engines cache automatically on an exact prompt prefix, so a
          // low ratio here means the prefix moved, not that caching is off.
          const hitRate = promptTokens
            ? Math.round((cachedTokens / promptTokens) * 100)
            : 0;
          this.logger.debug(
            `[LLM-USAGE] iter=${state.iterationCount} prompt=${promptTokens} ` +
              `cached=${cachedTokens} (${hitRate}%) completion=${completionTokens} ` +
              `reasoning=${reasoningTokens} engine=${context.engineChoice ?? 'openai'}`,
          );
        }

        // Check if LLM requested tool calls
        if (response.toolCalls && response.toolCalls.length > 0) {
          this.logger.debug(
            `[AGENT-DECISION] iter ${state.iterationCount} -> tool call(s): ` +
              response.toolCalls
                .map((t) => `${t.name}(${JSON.stringify(t.arguments)})`)
                .join(', ') +
              (response.content ? ` | text: "${response.content.slice(0, 120)}"` : ''),
          );

          // Execute all tool calls
          const toolResults = await this.executeToolCalls(
            response.toolCalls,
            context,
            subscriber,
            state,
          );

          // Check for client-side tool interruption (browser executes the tool)
          const clientActionResult = toolResults.find(
            (r) => r.result.clientAction,
          );
          if (clientActionResult) {
            state.status = 'paused_oauth'; // reuse paused status semantics (loop ends, frontend resumes)
            // Persist the intermediate assistant narration (e.g. "I'll fill the
            // User ID...") so the full multi-step play-by-play survives in chat
            // history, not just the final message. Skip empty content.
            if (context.interactionId && response.content?.trim()) {
              await this.logIntermediateResponse(
                context.interactionId,
                response.content,
                context.engineChoice,
              );
            }
            subscriber.next({
              type: 'client_action',
              iteration: state.iterationCount,
              data: {
                clientAction: clientActionResult.result.clientAction,
              },
            });
            // Complete the stream cleanly so the SSE connection closes (otherwise
            // the client sees a dropped connection). The frontend executes the
            // tool and resumes by re-invoking chat with context.clientToolResult.
            subscriber.complete();
            return;
          }

          // Check for OAuth interruption
          const oauthRequired = toolResults.find((r) => r.result.oauthRequired);
          if (oauthRequired) {
            state.status = 'paused_oauth';
            subscriber.next({
              type: 'oauth_required',
              iteration: state.iterationCount,
              data: {
                oauth: oauthRequired.result.oauthDetails,
              },
            });
            // Don't complete - frontend will handle OAuth and retry
            return;
          }

          // Add assistant message with tool calls to conversation
          state.messages.push({
            role: 'assistant',
            content: response.content || null,
            tool_calls: response.toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
          });

          // Add tool result messages to conversation
          for (const toolResult of toolResults) {
            state.messages.push({
              role: 'tool',
              tool_call_id: toolResult.toolCallId,
              content: this.formatToolResult(toolResult.result),
            });
          }

          // Emit iteration complete event
          subscriber.next({
            type: 'iteration_complete',
            iteration: state.iterationCount,
            data: {
              state: { iterationCount: state.iterationCount },
            },
          });

          // Continue loop for model reflection
          continue;
        }

        // No tool calls - this is the final response
        this.logger.debug(
          `[AGENT-DECISION] iter ${state.iterationCount} -> FINAL: "${(response.content || '').slice(0, 200)}"`,
        );
        state.status = 'completed';

        subscriber.next({
          type: 'final_response',
          iteration: state.iterationCount,
          data: {
            content: response.content,
            state: {
              status: 'completed',
              iterationCount: state.iterationCount,
              totalTokensUsed: state.totalTokensUsed,
            },
          },
        });

        // Log completion (persists the final answer so it shows in chat history)
        if (context.interactionId) {
          await this.logAgentCompletion(
            context.interactionId,
            state,
            context.engineChoice,
            response.content || '',
          );
        }

        subscriber.complete();
        return;
      }

      // Max iterations reached
      this.logger.warn(`Agent loop reached max iterations (${config.maxIterations})`);
      state.status = 'max_iterations';

      // Get last content if available
      const lastAssistantMessage = [...state.messages]
        .reverse()
        .find((m) => m.role === 'assistant');
      const lastContent =
        typeof lastAssistantMessage?.content === 'string'
          ? lastAssistantMessage.content
          : 'I apologize, but I reached the maximum number of steps while working on your request. Here is what I found so far.';

      subscriber.next({
        type: 'max_iterations',
        iteration: state.iterationCount,
        data: {
          content: lastContent,
          state: { status: 'max_iterations' },
        },
      });

      subscriber.complete();
    } catch (error) {
      this.logger.error('Agent loop error:', error);
      state.status = 'error';

      subscriber.next({
        type: 'error',
        iteration: state.iterationCount,
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      // Complete (don't error) the stream: the error event above renders as a
      // proper message bubble with streaming 'stop'; erroring the observable
      // tears the SSE connection down before the frontend can show it.
      subscriber.complete();
    } finally {
      // Bill the session no matter how the loop ended. The loop returns early on
      // a client-tool pause, an OAuth pause and on error — and a paused turn is
      // exactly the multi-step kind that burns the most tokens, so accounting
      // only on the final-response path would undercount the expensive turns.
      await this.recordSessionTokens(context, state);
    }
  }

  /**
   * Add this turn's token usage to the user's session counter.
   *
   * Until now only the legacy v1 codegen path and the summarizer incremented
   * `UserSession.tokensUsed`, so every v2 agent chat was invisible to per-user
   * analytics and to `TokenLimitGuard`.
   */
  private async recordSessionTokens(
    context: AgentExecutionContext,
    state: AgentLoopState,
  ): Promise<void> {
    if (!context.userSessionId || state.totalTokensUsed <= 0) {
      return;
    }
    try {
      await this.userSessionService.incrementUserSessionTokensUsed(
        context.userSessionId,
        state.totalTokensUsed,
      );
    } catch (error) {
      // Accounting must never break a chat turn.
      this.logger.error('Failed to record session token usage:', error);
    }
  }

  /**
   * Execute a single LLM call with streaming
   */
  private async executeLlmCall(
    messages: ChatCompletionMessageParam[],
    tools: ToolDefinition[],
    context: AgentExecutionContext,
    config: AgentLoopConfig,
    subscriber: Subscriber<AgentStreamEvent>,
    iteration: number,
  ): Promise<LlmIterationResponse> {
    const stream = await this.llmService.createChatStream({
      messages,
      temperature: 1,
      maxTokens: config.maxTokensPerIteration,
      tools: tools as OpenAI.Chat.Completions.ChatCompletionTool[],
      engineChoice: (context.engineChoice as EngineChoice) || 'openai',
      cacheKey: context.cacheKey,
    });

    let contentAcc = '';
    let toolCallAcc: ChatCompletionChunk.Choice.Delta.ToolCall[] = [];
    let usage: LlmIterationResponse['usage'] | undefined;
    let contentChunkCount = 0;

    return new Promise((resolve, reject) => {
      const observable = this.chatService.streamToObservable(stream);

      observable.subscribe({
        next: (chunk) => {
          const response = chunk.data;

          // Handle usage chunk
          if (response.usage) {
            usage = {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
              // Prompt-cache hits. OpenAI reports this for prefixes over its
              // minimum; Qwen reports it in the same field in OpenAI-compatible
              // mode. Absent on gateways that don't report it at all.
              cachedTokens: response.usage.prompt_tokens_details?.cached_tokens,
              reasoningTokens:
                response.usage.completion_tokens_details?.reasoning_tokens,
            };
            return;
          }

          const delta = response.choices?.[0]?.delta;
          if (!delta) return;

          // Chunk-level trace for diagnosing duplicated replies (a gateway
          // re-emitting content, or a reasoning model's draft leaking into
          // delta.content alongside the final text). Production logs showed
          // whole answers duplicated — sometimes reworded — inside ONE
          // completion's stream; this exposes the raw chunk pattern.
          if (process.env.LOG_LEVEL_DEBUG === 'true' && delta.content) {
            contentChunkCount++;
            const extraKeys = Object.keys(delta).filter(
              (k) => !['content', 'role', 'tool_calls', 'refusal'].includes(k),
            );
            this.logger.debug(
              `[LLM-CHUNK] iter=${iteration} n=${contentChunkCount} ` +
                `len=${delta.content.length} acc=${contentAcc.length}` +
                (extraKeys.length ? ` extraKeys=${extraKeys.join(',')}` : '') +
                ` head="${delta.content.slice(0, 30).replace(/\n/g, '\\n')}"`,
            );
          }

          // Stream content deltas to subscriber. Some OpenAI-compatible
          // gateways re-emit the full accumulated content as a terminal
          // consolidated chunk — appending it would double the reply.
          if (delta.content) {
            const isTerminalRepeat =
              contentAcc.length > 0 && delta.content === contentAcc;
            if (!isTerminalRepeat) {
              contentAcc += delta.content;
              if (config.streamIntermediateResponses) {
                subscriber.next({
                  type: 'content_delta',
                  iteration,
                  data: { content: delta.content },
                });
              }
            }
          }

          // Accumulate tool calls
          if (delta.tool_calls) {
            toolCallAcc = this.toolCallAccumulator(toolCallAcc, delta.tool_calls);
          }
        },
        error: (error) => {
          this.logger.error('LLM stream error:', error);
          reject(error);
        },
        complete: () => {
          // Parse accumulated tool calls
          const parsedToolCalls: ParsedToolCall[] | null =
            toolCallAcc.length > 0
              ? toolCallAcc.map((tc) => ({
                  id: tc.id!,
                  name: tc.function!.name!,
                  arguments: this.safeParseJson(tc.function!.arguments || '{}'),
                }))
              : null;

          resolve({
            content: contentAcc,
            toolCalls: parsedToolCalls,
            usage,
          });
        },
      });
    });
  }

  /**
   * Execute tool calls and return results
   */
  private async executeToolCalls(
    toolCalls: ParsedToolCall[],
    context: AgentExecutionContext,
    subscriber: Subscriber<AgentStreamEvent>,
    state: AgentLoopState,
  ): Promise<ToolCallExecutionResult[]> {
    const results: ToolCallExecutionResult[] = [];

    // A client tool ends the stream: the browser runs it and re-invokes chat with
    // a freshly rebuilt message list, in which only the client tool's own result
    // is echoed back. So every OTHER call in this batch — before or after it —
    // gets executed and then thrown away, and the model, never having seen a
    // result, re-issues it on the next hop. For a read-only tool that is wasted
    // work; for a side-effecting MCP tool it is a double execution.
    //
    // When the batch contains a client tool, dispatch only that one and let the
    // model re-request the rest next hop, where the results can actually reach it.
    const firstClientToolIndex = toolCalls.findIndex((t) =>
      CLIENT_TOOL_NAMES.has(t.name),
    );
    const batch =
      firstClientToolIndex === -1
        ? toolCalls
        : [toolCalls[firstClientToolIndex]];
    if (batch.length < toolCalls.length) {
      this.logger.debug(
        `Deferring ${toolCalls.length - batch.length} tool call(s) alongside client tool ` +
          `${toolCalls[firstClientToolIndex].name}: ` +
          toolCalls
            .filter((_, i) => i !== firstClientToolIndex)
            .map((t) => t.name)
            .join(', '),
      );
    }

    for (const toolCall of batch) {
      // Emit tool call start event
      subscriber.next({
        type: 'tool_call_start',
        iteration: state.iterationCount,
        data: {
          toolCall: {
            id: toolCall.id,
            name: toolCall.name,
            arguments: toolCall.arguments,
          },
        },
      });

      const startTime = Date.now();

      // Client-side tools are executed in the browser, not on the server.
      // Short-circuit: return a clientAction directive so the loop pauses and
      // the frontend can run the tool and resume the chat with the result.
      if (CLIENT_TOOL_NAMES.has(toolCall.name)) {
        const clientResult = {
          success: true,
          output: 'dispatched-to-client',
          clientAction: {
            tool: toolCall.name,
            args: toolCall.arguments,
            toolCallId: toolCall.id,
          },
        };

        state.toolCallHistory.push({
          iteration: state.iterationCount,
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          arguments: toolCall.arguments,
          result: clientResult,
          timestamp: new Date(),
          durationMs: Date.now() - startTime,
        });

        results.push({ toolCallId: toolCall.id, result: clientResult });
        continue;
      }

      // Build execution context for tool registry
      const toolContext: ToolExecutionContext = {
        userId: context.userId,
        userSessionId: context.userSessionId,
        classId: context.classId,
        chatType: context.chatType,
        studentContext: context.studentContext
          ? {
              pdfId: context.studentContext.pdfId,
              pdfPage: context.studentContext.pageNumber,
              materialType: context.studentContext.materialType,
              chatSummary: context.studentContext.chatSummary,
              engineChoice: context.engineChoice,
            }
          : undefined,
      };

      let result;
      try {
        result = await this.toolRegistryService.executeTool(
          toolCall.name,
          toolCall.arguments as Record<string, any>,
          toolContext,
          context.toolExecutor,
        );
      } catch (error) {
        this.logger.error(`Tool ${toolCall.name} execution failed:`, error);
        // Convert errors to tool messages - let model decide how to proceed
        result = {
          success: false,
          output: null,
          error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      const durationMs = Date.now() - startTime;

      // Record in state
      state.toolCallHistory.push({
        iteration: state.iterationCount,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        arguments: toolCall.arguments,
        result,
        timestamp: new Date(),
        durationMs,
      });

      // Emit tool call complete event
      subscriber.next({
        type: 'tool_call_complete',
        iteration: state.iterationCount,
        data: {
          toolCall: {
            id: toolCall.id,
            name: toolCall.name,
            result: result.success ? result.output : undefined,
            error: result.error,
            metadata: result.metadata, // Include metadata for frontend actions (navigation, etc.)
          },
        },
      });

      results.push({ toolCallId: toolCall.id, result });
    }

    return results;
  }

  /**
   * Accumulate streaming tool call chunks
   * (Ported from StudentService)
   */
  private toolCallAccumulator(
    accumulator: ChatCompletionChunk.Choice.Delta.ToolCall[],
    delta: ChatCompletionChunk.Choice.Delta.ToolCall[],
  ): ChatCompletionChunk.Choice.Delta.ToolCall[] {
    const updatedAccumulator = [...accumulator];

    delta.forEach((deltaItem) => {
      const existingItemIndex = updatedAccumulator.findIndex(
        (item) => item.index === deltaItem.index,
      );

      if (existingItemIndex >= 0) {
        // Update the existing item
        const existingItem = updatedAccumulator[existingItemIndex];
        const updatedFunction = {
          ...existingItem.function,
          ...deltaItem.function,
          arguments: existingItem.function?.arguments
            ? existingItem.function.arguments + (deltaItem.function?.arguments || '')
            : deltaItem.function?.arguments,
        };

        updatedAccumulator[existingItemIndex] = {
          ...existingItem,
          ...deltaItem,
          function: updatedFunction,
        };
      } else {
        // Add the new item
        updatedAccumulator.push(deltaItem);
      }
    });

    return updatedAccumulator;
  }

  /**
   * Halve the replayed history after the provider rejected a prompt as too long.
   *
   * Drops from the *oldest* replayed turn forward, which is the only direction
   * that helps: the newest turns are what the student is talking about, and the
   * leading system messages carry the persona and the guardrails. A shorter
   * prompt that has lost its guardrail is not a recovery.
   *
   * Deliberately structural rather than token-counted. The estimator is a
   * heuristic and the provider has already told us the real answer, so the
   * useful move is a decisive cut, not a precise one.
   *
   * @returns a new array; the input is not mutated.
   */
  private shedHistoryForOverflow(
    messages: ChatCompletionMessageParam[],
  ): ChatCompletionMessageParam[] {
    // Everything up to the last leading system message is the prompt's spine:
    // persona, tool guidance, profile, summary. Never shed it.
    let spineEnd = 0;
    while (spineEnd < messages.length && messages[spineEnd].role === 'system') {
      spineEnd++;
    }

    const tail = messages.slice(spineEnd);
    if (tail.length <= 1) return messages;

    // Keep the newest half, and never fewer than the final message — that is
    // the student's actual question (or the tool result being resumed).
    const keep = Math.max(Math.floor(tail.length / 2), 1);
    let kept = tail.slice(-keep);

    // Do not open on an assistant turn or an orphaned tool result: the first
    // reads as the assistant having volunteered something unprompted, and the
    // second refers to a tool call that is no longer in the array.
    while (
      kept.length > 1 &&
      (kept[0].role === 'assistant' || kept[0].role === 'tool')
    ) {
      kept = kept.slice(1);
    }

    return [...messages.slice(0, spineEnd), ...kept];
  }

  /**
   * Format tool result for message content
   */
  private formatToolResult(result: { success: boolean; output: any; error?: string }): string {
    if (result.success) {
      // Cap tool output so a large payload (MCP tools, page snapshots) can't
      // blow the prompt past the model's context window.
      const MAX_TOOL_RESULT_CHARS = CONTEXT_BUDGET.maxToolResultChars;
      const text =
        typeof result.output === 'string'
          ? result.output
          : JSON.stringify(result.output, null, 2);
      return text.length > MAX_TOOL_RESULT_CHARS
        ? text.slice(0, MAX_TOOL_RESULT_CHARS) + '\n...[truncated]'
        : text;
    }
    return `Error: ${result.error || 'Unknown error'}`;
  }

  /**
   * Safely parse JSON with fallback
   */
  private safeParseJson(json: string): Record<string, unknown> {
    try {
      return JSON.parse(json);
    } catch {
      this.logger.warn(`Failed to parse tool arguments JSON: ${json}`);
      return {};
    }
  }

  /**
   * Log agent loop completion
   */
  private async logAgentCompletion(
    interactionId: string,
    state: AgentLoopState,
    engineChoice?: string,
    finalResponse = '',
  ): Promise<void> {
    try {
      await this.interactionService.createServerAction({
        interactionId,
        type: 'agent-loop-complete',
        context: {
          iterations: state.iterationCount,
          totalTokensUsed: state.totalTokensUsed,
          promptTokens: state.totalPromptTokens,
          completionTokens: state.totalCompletionTokens,
          // Prompt-cache readout. Both engines cache on an exact prefix, so a
          // persistently low hit rate is a prompt-ordering problem, not a
          // provider one.
          cachedTokens: state.totalCachedTokens,
          cacheHitRate: state.totalPromptTokens
            ? state.totalCachedTokens / state.totalPromptTokens
            : 0,
          // Reasoning tokens share the completion budget with the visible
          // answer on gpt-5.x — a high value next to empty content explains it.
          reasoningTokens: state.totalReasoningTokens,
          // Default matches LlmService's own default, so a persisted record is
          // never ambiguous about which engine's pricing/cache applies.
          engineChoice: engineChoice ?? 'openai',
          toolCallCount: state.toolCallHistory.length,
          toolsUsed: [...new Set(state.toolCallHistory.map((t) => t.toolName))],
          status: state.status,
          durationMs: Date.now() - state.startTime.getTime(),
        },
        // Persist the agent's actual final answer so chat history shows it.
        botResponse: finalResponse,
        engineChoice,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to log agent completion:', error);
    }
  }

  /**
   * Persist an intermediate assistant message produced before a client-action
   * pause, so a multi-step agent turn's full narration survives in chat history.
   */
  private async logIntermediateResponse(
    interactionId: string,
    content: string,
    engineChoice?: string,
  ): Promise<void> {
    try {
      await this.interactionService.createServerAction({
        interactionId,
        type: 'agent-loop-step',
        context: { step: true },
        botResponse: content,
        engineChoice,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to log intermediate agent response:', error);
    }
  }
}
