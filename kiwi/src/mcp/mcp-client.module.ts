import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DatabaseModule } from '../common/database/database.module';
import { RedisModule } from '../common/redis/redis.module';
import { McpClientService } from '../common/mcp/mcp-client.service';
import { McpConnectionManagerService } from '../common/mcp/mcp-connection-manager.service';
import { McpOAuthService } from '../common/mcp/mcp-oauth.service';
import { ToolRegistryService } from '../common/tools/tool-registry.service';
import { McpService } from './mcp.service';
import { McpAdminController } from './mcp-admin.controller';
import { ToolConfigController } from './tool-config.controller';
import { McpUserController } from './mcp-user.controller';

/**
 * MCP Client Module
 *
 * Provides MCP client capabilities for Kiwi to connect to external MCP servers.
 * This is separate from the existing MCP server module (which allows external clients to connect TO Kiwi).
 *
 * Features:
 * - Connect to external MCP servers (stdio, SSE, HTTP transports)
 * - OAuth 2.1 authentication for MCP servers
 * - Unified tool management (built-in + MCP tools)
 * - Per-class MCP server configuration
 * - Per-user OAuth connections
 *
 * Exports:
 * - ToolRegistryService: For StudentService to use in chat
 * - McpClientService: For direct MCP client interactions
 * - McpConnectionManagerService: For OAuth connection management
 */
@Module({
  imports: [DatabaseModule, ConfigModule, RedisModule, AnalyticsModule],
  controllers: [McpAdminController, ToolConfigController, McpUserController],
  providers: [
    McpClientService,
    McpOAuthService,
    McpConnectionManagerService,
    ToolRegistryService,
    McpService,
  ],
  exports: [
    ToolRegistryService,
    McpClientService,
    McpConnectionManagerService,
    McpService,
  ],
})
export class McpClientModule {}
