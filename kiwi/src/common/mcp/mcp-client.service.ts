import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { McpServer } from '@prisma/client';
import { RedisService } from '../redis/redis.service';

/**
 * How long a cached tool list counts as fresh. After this, `listTools` re-asks
 * the server.
 */
const TOOL_CACHE_FRESH_SECONDS = 300;

/**
 * How long the entry survives in Redis. Deliberately much longer than the
 * freshness window: past that window the entry is no longer served as-is, but
 * it is the last-good list to fall back on when the server is unreachable.
 * Dropping a server's tools mid-conversation changes the agent's capabilities
 * and invalidates the engine's cached prompt prefix; serving a slightly stale
 * list does neither.
 */
const TOOL_CACHE_STALE_SECONDS = 24 * 60 * 60;

interface CachedToolList {
  tools: any[];
  /** Epoch ms when this list was fetched. */
  cachedAt: number;
}

/**
 * MCP Client Service
 *
 * Manages MCP (Model Context Protocol) client connections to external servers.
 * Supports three transport types:
 * - stdio: For local servers spawned as child processes
 * - sse: For remote servers using Server-Sent Events (legacy)
 * - http: For remote servers using Streamable HTTP (modern)
 *
 * This service handles:
 * - Creating and managing client connections
 * - Discovering available tools from MCP servers
 * - Executing tool calls with proper authentication
 * - Connection lifecycle management
 */
@Injectable()
export class McpClientService {
  private readonly logger = new Logger(McpClientService.name);

  constructor(private readonly redis: RedisService) {}

  // Cache of active client connections by server ID
  private clients: Map<string, Client> = new Map();

  /**
   * L1 tool-list cache, in front of the shared Redis entry. Per-process, so it
   * carries the same freshness stamp as Redis — otherwise a warm process would
   * pin an arbitrarily old list and replicas would disagree again.
   */
  private toolCache: Map<string, CachedToolList> = new Map();

  /**
   * Get or create an MCP client for the specified server configuration
   * @param serverConfig The MCP server configuration from database
   * @param accessToken Optional OAuth access token for authenticated servers
   * @returns Connected MCP client
   */
  async getClient(
    serverConfig: McpServer,
    accessToken?: string,
  ): Promise<Client> {
    const cacheKey = this.getCacheKey(serverConfig.id, accessToken);

    // Return cached client if available and still connected
    const cachedClient = this.clients.get(cacheKey);
    if (cachedClient) {
      try {
        // Check if client is still alive by listing tools
        await cachedClient.listTools();
        return cachedClient;
      } catch (error) {
        this.logger.warn(
          `Cached client for server ${serverConfig.name} is stale, reconnecting...`,
        );
        this.clients.delete(cacheKey);
        this.toolCache.delete(cacheKey);
      }
    }

    // Create new client
    this.logger.log(
      `Creating new MCP client for server: ${serverConfig.name} (${serverConfig.transport})`,
    );

    const client = await this.createClient(serverConfig, accessToken);
    this.clients.set(cacheKey, client);

    return client;
  }

  /**
   * Create a new MCP client based on transport type
   */
  private async createClient(
    serverConfig: McpServer,
    accessToken?: string,
  ): Promise<Client> {
    const client = new Client(
      {
        name: 'kiwi-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          // Support for prompting user for input (future feature)
          sampling: {},
        },
      },
    );

    try {
      const transport = await this.createTransport(serverConfig, accessToken);
      await client.connect(transport);

      this.logger.log(
        `Successfully connected to MCP server: ${serverConfig.name}`,
      );

      return client;
    } catch (error) {
      this.logger.error(
        `Failed to connect to MCP server ${serverConfig.name}:`,
        error,
      );
      throw new Error(
        `Failed to connect to MCP server ${serverConfig.name}: ${error.message}`,
      );
    }
  }

  /**
   * Create appropriate transport based on server configuration
   */
  private async createTransport(
    serverConfig: McpServer,
    accessToken?: string,
  ): Promise<any> {
    const config = serverConfig.config as any;

    switch (serverConfig.transport) {
      case 'stdio':
        return this.createStdioTransport(config);

      case 'sse':
      case 'http':
        return await this.createHttpTransport(config, accessToken);

      default:
        throw new Error(
          `Unsupported transport type: ${serverConfig.transport}`,
        );
    }
  }

  /**
   * Create stdio transport for local MCP servers
   */
  private createStdioTransport(config: any): StdioClientTransport {
    const { command, args = [], env = {} } = config;

    if (!command) {
      throw new Error('stdio transport requires "command" in config');
    }

    return new StdioClientTransport({
      command,
      args,
      env: {
        ...process.env,
        ...env,
      },
    });
  }

  /**
   * Create HTTP transport for remote MCP servers
   * Tries StreamableHTTP first (modern), falls back to SSE (legacy) for compatibility.
   * Supports custom headers from config and OAuth access tokens.
   */
  private async createHttpTransport(
    config: any,
    accessToken?: string,
  ): Promise<StreamableHTTPClientTransport | SSEClientTransport> {
    const { url, headers = {} } = config;

    if (!url) {
      throw new Error('sse/http transport requires "url" in config');
    }

    // Build request headers from config + accessToken
    const requestHeaders: Record<string, string> = { ...headers };
    if (accessToken) {
      requestHeaders['Authorization'] = `Bearer ${accessToken}`;
    }

    const requestInit: RequestInit | undefined =
      Object.keys(requestHeaders).length > 0
        ? { headers: requestHeaders }
        : undefined;

    const serverUrl = new URL(url);

    // Try StreamableHTTP first (modern), fall back to SSE (legacy)
    try {
      const transport = new StreamableHTTPClientTransport(serverUrl, {
        requestInit,
      });
      return transport;
    } catch (error) {
      this.logger.warn(
        `StreamableHTTP transport failed, falling back to SSE: ${error.message}`,
      );
      return new SSEClientTransport(serverUrl, { requestInit });
    }
  }

  /**
   * List all available tools from an MCP server.
   *
   * Cached in-process (L1) and in Redis (L2) so replicas agree on the tool
   * list — the tool array is part of the engine's cached prompt prefix, so a
   * per-process view of it silently costs cache hits. On failure the last-good
   * list is served instead of dropping the server's tools.
   */
  async listTools(
    serverConfig: McpServer,
    accessToken?: string,
  ): Promise<any[]> {
    const cacheKey = this.getCacheKey(serverConfig.id, accessToken);
    const now = Date.now();

    const l1 = this.toolCache.get(cacheKey);
    if (l1 && this.isFresh(l1, now)) {
      return l1.tools;
    }

    const l2 = await this.readCachedTools(cacheKey);
    if (l2 && this.isFresh(l2, now)) {
      this.toolCache.set(cacheKey, l2);
      return l2.tools;
    }

    try {
      const client = await this.getClient(serverConfig, accessToken);
      const response = await client.listTools();

      const tools = response.tools || [];
      const entry: CachedToolList = { tools, cachedAt: Date.now() };
      this.toolCache.set(cacheKey, entry);
      await this.writeCachedTools(cacheKey, entry);

      this.logger.log(
        `Listed ${tools.length} tools from server: ${serverConfig.name}`,
      );

      return tools;
    } catch (error) {
      this.logger.error(
        `Failed to list tools from server ${serverConfig.name}:`,
        error,
      );

      const lastGood = l2 ?? l1;
      if (lastGood) {
        const ageSeconds = Math.round((Date.now() - lastGood.cachedAt) / 1000);
        this.logger.warn(
          `Serving stale tool list for server ${serverConfig.name} ` +
            `(${lastGood.tools.length} tools, ${ageSeconds}s old) after a ` +
            `listTools failure`,
        );
        return lastGood.tools;
      }

      throw error;
    }
  }

  private isFresh(entry: CachedToolList, now: number): boolean {
    return now - entry.cachedAt < TOOL_CACHE_FRESH_SECONDS * 1000;
  }

  private toolCacheRedisKey(cacheKey: string): string {
    // cacheKey is already `${serverId}` or `${serverId}:${tokenHash}`.
    return `mcp:tools:${cacheKey}`;
  }

  private async readCachedTools(
    cacheKey: string,
  ): Promise<CachedToolList | null> {
    try {
      const raw = await this.redis.get(this.toolCacheRedisKey(cacheKey));
      if (!raw) return null;

      const parsed = JSON.parse(raw) as CachedToolList;
      if (!Array.isArray(parsed?.tools)) return null;

      return parsed;
    } catch (error) {
      // A cache read must never break tool loading.
      this.logger.warn(`Failed to read cached tool list: ${error.message}`);
      return null;
    }
  }

  private async writeCachedTools(
    cacheKey: string,
    entry: CachedToolList,
  ): Promise<void> {
    try {
      await this.redis.set(
        this.toolCacheRedisKey(cacheKey),
        JSON.stringify(entry),
        TOOL_CACHE_STALE_SECONDS,
      );
    } catch (error) {
      this.logger.warn(`Failed to cache tool list: ${error.message}`);
    }
  }

  private async deleteCachedTools(cacheKey: string): Promise<void> {
    try {
      await this.redis.del(this.toolCacheRedisKey(cacheKey));
    } catch (error) {
      this.logger.warn(`Failed to evict cached tool list: ${error.message}`);
    }
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(
    serverConfig: McpServer,
    toolName: string,
    args: Record<string, any>,
    accessToken?: string,
  ): Promise<any> {
    try {
      const client = await this.getClient(serverConfig, accessToken);

      this.logger.log(
        `Calling tool "${toolName}" on server: ${serverConfig.name}`,
      );

      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to call tool "${toolName}" on server ${serverConfig.name}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Test connection to an MCP server
   * Used by admin to verify server configuration
   */
  async testConnection(
    serverConfig: McpServer,
    accessToken?: string,
  ): Promise<{ success: boolean; tools?: any[]; error?: string }> {
    try {
      const client = await this.getClient(serverConfig, accessToken);
      const response = await client.listTools();

      return {
        success: true,
        tools: response.tools || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Disconnect a specific client
   */
  async disconnect(serverId: string, accessToken?: string): Promise<void> {
    const cacheKey = this.getCacheKey(serverId, accessToken);
    const client = this.clients.get(cacheKey);

    if (client) {
      try {
        await client.close();
      } catch (error) {
        this.logger.warn(
          `Error closing client for server ${serverId}:`,
          error,
        );
      }

      this.clients.delete(cacheKey);
      this.toolCache.delete(cacheKey);
      await this.deleteCachedTools(cacheKey);
    }
  }

  /**
   * Disconnect all clients (cleanup)
   */
  async disconnectAll(): Promise<void> {
    this.logger.log('Disconnecting all MCP clients...');

    const promises = Array.from(this.clients.entries()).map(
      async ([cacheKey, client]) => {
        try {
          await client.close();
        } catch (error) {
          this.logger.warn(`Error closing client ${cacheKey}:`, error);
        }
      },
    );

    await Promise.all(promises);

    this.clients.clear();
    this.toolCache.clear();
  }

  /**
   * Generate cache key for client storage
   * Includes an access token digest for per-user connections
   */
  private getCacheKey(serverId: string, accessToken?: string): string {
    if (!accessToken) {
      return serverId;
    }

    // A real digest, not a token prefix. The previous form was
    // `base64(token).slice(0, 16)` — the first 12 bytes of the token, reversibly
    // encoded. Two problems, both worse now that this key lives in shared Redis
    // rather than a per-process Map: JWTs share a constant header and Google
    // `ya29.` tokens share a constant prefix, so every user of one OAuth server
    // collided onto a single key and could be served each other's tool list;
    // and live token material sat in the keyspace, visible to KEYS and RDB
    // dumps. sha256 fixes both.
    const tokenHash = createHash('sha256')
      .update(accessToken)
      .digest('hex')
      .slice(0, 32);
    return `${serverId}:${tokenHash}`;
  }

  /**
   * Clear tool cache for a specific server
   * Useful when server configuration changes
   *
   * Evicts this process's L1 entries and their Redis counterparts. Per-user
   * token variants cached only on *other* replicas cannot be enumerated
   * through RedisService's get/set/del surface; those age out on their own
   * within the freshness window.
   */
  clearToolCache(serverId: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.toolCache.keys()) {
      if (key.startsWith(serverId)) {
        keysToDelete.push(key);
      }
    }

    // The un-tokenized key exists whether or not this process cached it.
    if (!keysToDelete.includes(serverId)) {
      keysToDelete.push(serverId);
    }

    keysToDelete.forEach((key) => this.toolCache.delete(key));

    // Synchronous signature is kept for existing callers; the Redis eviction is
    // best-effort and must not make them await.
    void Promise.all(
      keysToDelete.map((key) => this.deleteCachedTools(key)),
    ).catch(() => undefined);

    this.logger.log(`Cleared tool cache for server: ${serverId}`);
  }
}
