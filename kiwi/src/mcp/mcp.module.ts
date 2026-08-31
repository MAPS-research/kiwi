import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  McpModule as ReKogMcpModule,
  McpTransportType,
} from '@rekog/mcp-nest';
import { randomUUID } from 'crypto';

// Import existing modules
import { AuthModule } from 'src/auth/auth.module';
import { ClassModule } from 'src/class/class.module';
import { ChatModule } from 'src/common/chat/chat.module';
import { DatabaseModule } from 'src/common/database/database.module';
import { StorageModule } from 'src/common/storage/storage.module';
import { AnalyticsModule } from 'src/analytics/analytics.module';
import { LlmModule } from 'src/common/llm/llm.module';
import { KiwiAppModule } from 'src/kiwi-app/kiwi-app.module';
import { InstructorClassModule } from 'src/instructor-class/instructor-class.module';
import { ExperimentModule } from 'src/experiment/experiment.module';

// Import MCP providers
import { McpService } from './mcp-server-impl.service';
import { ClassManagementTool } from './tools/class-management.tool';
import { StorageTool } from './tools/storage.tool';
import { ChatTool } from './tools/chat.tool';
import { ExperimentTool } from './tools/experiment.tool';
import { KiwiAppChatTool } from './tools/kiwi-app-chat.tool';
import { ClassChunksTool } from './tools/class-chunks.tool';
import { KiwiAppContextChatTool } from './tools/kiwi-app-context-chat.tool';
import { ClassResource } from './resources/class.resource';
import { StorageResource } from './resources/storage.resource';
import { AnalyticsResource } from './resources/analytics.resource';
import { UserResource } from './resources/user.resource';
import { SystemPromptsProvider } from './prompts/system-prompts.provider';

/**
 * MCP Module - Model Context Protocol Server
 *
 * Provides MCP-compatible endpoints for AI assistants to:
 * - Execute tools (class management, storage, chat)
 * - Access resources (classes, documents, analytics)
 * - Get prompts (system prompts, class prompts)
 *
 * Configured with:
 * - SSE (Server-Sent Events) for streaming
 * - Streamable HTTP for standard requests
 * - OAuth 2.1 authentication via existing auth system
 */
@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule, // Provides OAuth 2.1 authorization code flow
    ClassModule,
    ChatModule,
    DatabaseModule,
    StorageModule,
    AnalyticsModule,
    LlmModule,
    KiwiAppModule,
    InstructorClassModule,
    ExperimentModule,

    // MCP Protocol Server
    ReKogMcpModule.forRoot({
      name: 'kiwi-mcp-server',
      version: '1.0.0',

      // Enable both SSE (for streaming) and Streamable HTTP transports
      transport: [McpTransportType.SSE, McpTransportType.STREAMABLE_HTTP],

      // SSE-specific configuration
      sse: {
        pingEnabled: true,
        pingIntervalMs: 30000, // 30 seconds
      },

      // Streamable HTTP configuration
      streamableHttp: {
        enableJsonResponse: false, // MCP protocol format
        sessionIdGenerator: () => randomUUID(),
        statelessMode: false, // Use sessions for better UX
      },

      // Authentication handled by global SmartJwtAuthGuard
      // (automatically uses session-optional mode for /mcp paths)

      // Instructions for AI assistants
      instructions:
        'MCP server for Kiwi learning platform - provides access to classes, materials, chat, and analytics',
    }),
  ],
  providers: [
    // MCP Server Implementation Service
    McpService,

    // Tools
    ClassManagementTool,
    StorageTool,
    ChatTool,
    ExperimentTool,
    KiwiAppChatTool,
    ClassChunksTool,
    KiwiAppContextChatTool,

    // Resources
    ClassResource,
    StorageResource,
    AnalyticsResource,
    UserResource,

    // Prompts
    SystemPromptsProvider,
  ],
  exports: [],
})
export class McpModule {}
