import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { ChatModule } from '../chat/chat.module';
import { DatabaseModule } from '../database/database.module';
import { McpClientModule } from '../../mcp/mcp-client.module';
import { InteractionModule } from '../../interaction/interaction.module';
import { AgentLoopService } from './agent-loop.service';

/**
 * Agent Loop Module
 *
 * Provides the ReAct-style agent loop for iterative tool execution.
 * The agent loop enables the LLM to:
 * - Call tools and receive results
 * - Reflect on tool results
 * - Decide whether to call more tools or provide final answer
 * - Iterate until task completion or max iterations
 *
 * Exports:
 * - AgentLoopService: Core service for executing agent loops
 */
@Module({
  imports: [
    LlmModule,
    ChatModule,
    DatabaseModule,
    McpClientModule,
    InteractionModule,
  ],
  providers: [AgentLoopService],
  exports: [AgentLoopService],
})
export class AgentLoopModule {}
