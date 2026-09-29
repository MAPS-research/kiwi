import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { McpClientService } from '../common/mcp/mcp-client.service';
import { McpConnectionManagerService } from '../common/mcp/mcp-connection-manager.service';
import { McpOAuthService } from '../common/mcp/mcp-oauth.service';
import { encrypt } from '../common/mcp/encryption.util';
import {
  CreateMcpServerDto,
  UpdateMcpServerDto,
  McpServerResponseDto,
  McpServerTestResponseDto,
  OAuthDiscoverResponseDto,
} from './dto/mcp-server.dto';
import {
  AssignMcpServerDto,
  UpdateClassMcpServerDto,
  ClassMcpServerResponseDto,
  ClassSummaryDto,
} from './dto/class-mcp-server.dto';
import {
  BulkToolConfigDto,
  ToolConfigResponseDto,
  UpdateToolStatusDto,
} from './dto/tool-config.dto';
import {
  McpConnectionResponseDto,
  OAuthInitiateResponseDto,
  OAuthCallbackSuccessDto,
} from './dto/mcp-connection.dto';
import {
  OAuthRegisterRequestDto,
  OAuthRegisterResponseDto,
} from './dto/oauth-register.dto';

/**
 * MCP Service
 *
 * Main service for MCP functionality. Orchestrates:
 * - MCP server management (CRUD operations)
 * - Tool configuration management
 * - User OAuth connections
 * - MCP client interactions
 */
@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    private prisma: DatabaseService,
    private mcpClient: McpClientService,
    private mcpConnectionManager: McpConnectionManagerService,
    private mcpOAuth: McpOAuthService,
  ) {}

  // ============================================
  // MCP Server Management
  // ============================================

  /**
   * Create a new global MCP server configuration
   * Note: Servers are now global and can be assigned to multiple classes via ClassMcpServer
   */
  async createMcpServer(
    createDto: CreateMcpServerDto,
    createdBy: string,
  ): Promise<McpServerResponseDto> {
    const server = await this.prisma.mcpServer.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        transport: createDto.transport,
        config: createDto.config,
        requiresOAuth: createDto.requiresOAuth,
        oauthMetadata: createDto.oauthMetadata,
        isActive: createDto.isActive,
        createdBy,
      },
    });

    this.logger.log(`Created global MCP server: ${server.name} (${server.id})`);

    return this.sanitizeMcpServerResponse(server);
  }

  /**
   * List all global MCP servers
   * Optionally includes the count of classes each server is assigned to
   */
  async listAllMcpServers(): Promise<McpServerResponseDto[]> {
    const servers = await this.prisma.mcpServer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { classAssignments: true },
        },
      },
    });

    return servers.map((s) => ({
      ...this.sanitizeMcpServerResponse(s),
      assignedClassCount: s._count.classAssignments,
    }));
  }

  /**
   * Get a specific MCP server
   */
  async getMcpServer(id: string): Promise<McpServerResponseDto> {
    const server = await this.prisma.mcpServer.findUnique({
      where: { id },
    });

    if (!server) {
      throw new NotFoundException(`MCP server ${id} not found`);
    }

    return this.sanitizeMcpServerResponse(server);
  }

  /**
   * Update an MCP server configuration
   */
  async updateMcpServer(
    id: string,
    updateDto: UpdateMcpServerDto,
  ): Promise<McpServerResponseDto> {
    const server = await this.prisma.mcpServer.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.description !== undefined && {
          description: updateDto.description,
        }),
        ...(updateDto.transport && { transport: updateDto.transport }),
        ...(updateDto.config && { config: updateDto.config }),
        ...(updateDto.requiresOAuth !== undefined && {
          requiresOAuth: updateDto.requiresOAuth,
        }),
        ...(updateDto.oauthMetadata && {
          oauthMetadata: updateDto.oauthMetadata,
        }),
        ...(updateDto.isActive !== undefined && {
          isActive: updateDto.isActive,
        }),
      },
    });

    this.logger.log(`Updated MCP server: ${server.name} (${server.id})`);

    // Clear tool cache when server config changes
    this.mcpClient.clearToolCache(id);

    return this.sanitizeMcpServerResponse(server);
  }

  /**
   * Delete a global MCP server configuration
   * This will also remove all class assignments and associated tool configs
   */
  async deleteMcpServer(id: string): Promise<void> {
    // Deactivate all user connections first
    await this.mcpConnectionManager.deactivateServerConnections(id);

    // Get all class assignments for this server
    const assignments = await this.prisma.classMcpServer.findMany({
      where: { mcpServerId: id },
      select: { id: true },
    });

    // Delete all tool configs that reference these assignments
    for (const assignment of assignments) {
      await this.prisma.classToolConfig.deleteMany({
        where: {
          toolType: 'MCP',
          toolIdentifier: assignment.id,
        },
      });
    }

    // Delete all class assignments
    await this.prisma.classMcpServer.deleteMany({
      where: { mcpServerId: id },
    });

    // Delete the server
    await this.prisma.mcpServer.delete({
      where: { id },
    });

    // Disconnect client
    await this.mcpClient.disconnect(id);

    this.logger.log(`Deleted global MCP server: ${id}`);
  }

  /**
   * Test connection to an MCP server
   * @param id MCP server ID
   * @param userId Optional user ID for OAuth-protected servers
   */
  async testMcpServer(
    id: string,
    userId?: string,
  ): Promise<McpServerTestResponseDto> {
    const server = await this.prisma.mcpServer.findUnique({
      where: { id },
    });

    if (!server) {
      throw new NotFoundException(`MCP server ${id} not found`);
    }

    // Get access token if server requires OAuth and userId provided
    let accessToken: string | undefined;
    if (server.requiresOAuth && userId) {
      const connection = await this.mcpConnectionManager.getConnection(
        userId,
        id,
      );
      if (connection) {
        accessToken = connection.accessToken;
      }
    }

    return await this.mcpClient.testConnection(server, accessToken);
  }

  /**
   * List tools from an MCP server
   */
  async listMcpServerTools(id: string): Promise<any[]> {
    const server = await this.prisma.mcpServer.findUnique({
      where: { id },
    });

    if (!server) {
      throw new NotFoundException(`MCP server ${id} not found`);
    }

    // For non-OAuth servers, list tools directly
    if (!server.requiresOAuth) {
      return await this.mcpClient.listTools(server);
    }

    // For OAuth servers, return empty (user needs to connect first)
    return [];
  }

  /**
   * Constructs a well-known URL per RFC 8414 Section 3.1
   * Inserts the well-known path between the host and the original path
   *
   * @param baseUrl - The authorization server or resource URL
   * @param wellKnownSuffix - The well-known suffix (e.g., 'oauth-authorization-server')
   * @returns The properly constructed well-known URL
   */
  private buildWellKnownUrl(baseUrl: string, wellKnownSuffix: string): string {
    const url = new URL(baseUrl);

    // Remove trailing slash from path per RFC 8414
    const originalPath = url.pathname.replace(/\/+$/, '');

    // Insert .well-known between origin and path
    // e.g., https://example.com/issuer -> https://example.com/.well-known/oauth-authorization-server/issuer
    url.pathname = `/.well-known/${wellKnownSuffix}${originalPath}`;

    return url.toString();
  }

  /**
   * Discover OAuth metadata from well-known endpoints
   * Tries RFC 8414 first, then falls back to OIDC
   * Constructs URLs per RFC 8414 Section 3.1 (inserts .well-known between host and path)
   */
  async discoverOAuthMetadata(url: string): Promise<OAuthDiscoverResponseDto> {
    // Normalize URL - remove trailing slashes
    const normalizedUrl = url.replace(/\/+$/, '');

    // Try RFC 8414 first with proper URL construction per Section 3.1
    const rfc8414Url = this.buildWellKnownUrl(
      normalizedUrl,
      'oauth-authorization-server',
    );
    const rfc8414Result = await this.tryFetchOAuthMetadata(
      rfc8414Url,
      normalizedUrl,
    );

    if (rfc8414Result.success) {
      this.logger.log(
        `OAuth metadata discovered via RFC 8414 from ${normalizedUrl}`,
      );
      return {
        success: true,
        source: 'rfc8414',
        authorizationEndpoint: rfc8414Result.authorizationEndpoint,
        tokenEndpoint: rfc8414Result.tokenEndpoint,
        scopesSupported: rfc8414Result.scopesSupported,
        registrationEndpoint: rfc8414Result.registrationEndpoint,
      };
    }

    // Fallback to OIDC with proper URL construction
    const oidcUrl = this.buildWellKnownUrl(
      normalizedUrl,
      'openid-configuration',
    );
    const oidcResult = await this.tryFetchOAuthMetadata(oidcUrl, normalizedUrl);

    if (oidcResult.success) {
      this.logger.log(
        `OAuth metadata discovered via OIDC from ${normalizedUrl}`,
      );
      return {
        success: true,
        source: 'oidc',
        authorizationEndpoint: oidcResult.authorizationEndpoint,
        tokenEndpoint: oidcResult.tokenEndpoint,
        scopesSupported: oidcResult.scopesSupported,
        registrationEndpoint: oidcResult.registrationEndpoint,
      };
    }

    this.logger.warn(`Failed to discover OAuth metadata from ${normalizedUrl}`);
    return {
      success: false,
      error: 'Could not discover OAuth metadata from the provided URL',
    };
  }

  /**
   * Helper method to fetch and parse OAuth metadata from a URL
   * Validates issuer per RFC 8414 Section 3.3
   *
   * @param metadataUrl - The well-known URL to fetch metadata from
   * @param expectedIssuer - The expected issuer value for validation (optional)
   */
  private async tryFetchOAuthMetadata(
    metadataUrl: string,
    expectedIssuer?: string,
  ): Promise<{
    success: boolean;
    authorizationEndpoint?: string;
    tokenEndpoint?: string;
    scopesSupported?: string[];
    registrationEndpoint?: string;
  }> {
    try {
      const response = await fetch(metadataUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        // No credentials for public discovery endpoints
      });

      if (!response.ok) {
        return { success: false };
      }

      const metadata = await response.json();

      // RFC 8414 Section 3.3: Validate issuer matches expected value
      if (
        expectedIssuer &&
        metadata.issuer &&
        metadata.issuer !== expectedIssuer
      ) {
        this.logger.warn(
          `Issuer mismatch: expected ${expectedIssuer}, got ${metadata.issuer}`,
        );
        return { success: false };
      }

      // Check if at least one endpoint was found
      const authorizationEndpoint = metadata.authorization_endpoint;
      const tokenEndpoint = metadata.token_endpoint;

      if (!authorizationEndpoint && !tokenEndpoint) {
        return { success: false };
      }

      // Extract scopes if available (handle empty array as no scopes)
      const scopesSupported =
        Array.isArray(metadata.scopes_supported) &&
        metadata.scopes_supported.length > 0
          ? metadata.scopes_supported
          : undefined;

      // Extract registration endpoint for Dynamic Client Registration (RFC 7591)
      const registrationEndpoint = metadata.registration_endpoint;

      return {
        success: true,
        authorizationEndpoint,
        tokenEndpoint,
        scopesSupported,
        registrationEndpoint,
      };
    } catch (error) {
      // Network error, invalid JSON, etc.
      return { success: false };
    }
  }

  /**
   * Register OAuth client with an MCP server via Dynamic Client Registration (RFC 7591)
   *
   * @param dto - Registration request data including server ID and registration endpoint
   * @returns Registration result with client_id (client_secret stored encrypted)
   */
  async registerOAuthClient(
    dto: OAuthRegisterRequestDto,
  ): Promise<OAuthRegisterResponseDto> {
    // Verify server exists
    const server = await this.prisma.mcpServer.findUnique({
      where: { id: dto.serverId },
    });

    if (!server) {
      throw new NotFoundException(`MCP server ${dto.serverId} not found`);
    }

    try {
      // Build RFC 7591 registration request
      const registrationRequest = {
        client_name: dto.clientName || 'Kiwi MCP Client',
        redirect_uris: dto.redirectUris || [this.mcpOAuth.getRedirectUri()],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_post',
      };

      this.logger.log(
        `Registering OAuth client with ${dto.registrationEndpoint} for server ${dto.serverId}`,
      );

      // POST to registration endpoint
      const response = await fetch(dto.registrationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(registrationRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error_description ||
          errorData.error ||
          `Registration failed with status ${response.status}`;
        this.logger.warn(`OAuth client registration failed: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }

      const registrationResponse = await response.json();

      const {
        client_id,
        client_secret,
        client_secret_expires_at,
        client_id_issued_at,
      } = registrationResponse;

      if (!client_id) {
        return {
          success: false,
          error: 'Registration response missing client_id',
        };
      }

      // For confidential clients, encrypt and store the client_secret
      if (client_secret) {
        const encryptedSecret = await encrypt(client_secret);

        // Update the server's oauthMetadata with the new client credentials
        const existingMetadata =
          (server.oauthMetadata as Record<string, any>) || {};
        const updatedMetadata = {
          ...existingMetadata,
          clientId: client_id,
          clientSecret: encryptedSecret,
          dcrClientSecretExpiresAt: client_secret_expires_at,
          dcrClientIdIssuedAt: client_id_issued_at,
          dcrRegisteredAt: new Date().toISOString(),
        };

        await this.prisma.mcpServer.update({
          where: { id: dto.serverId },
          data: {
            oauthMetadata: updatedMetadata,
          },
        });

        this.logger.log(
          `OAuth client registered successfully for server ${dto.serverId}, client_id: ${client_id}`,
        );
      }

      return {
        success: true,
        clientId: client_id,
        clientSecretExpiresAt: client_secret_expires_at,
        clientIdIssuedAt: client_id_issued_at,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Registration failed';
      this.logger.error(`OAuth client registration error: ${message}`, error);
      return { success: false, error: message };
    }
  }

  // ============================================
  // Class-Server Assignment Management
  // ============================================

  /**
   * Assign an MCP server to a class
   */
  async assignServerToClass(
    serverId: string,
    dto: AssignMcpServerDto,
    assignedBy: string,
  ): Promise<ClassMcpServerResponseDto> {
    // Verify server exists
    const server = await this.prisma.mcpServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException(`MCP server ${serverId} not found`);
    }

    // Verify class exists
    const classExists = await this.prisma.class.findUnique({
      where: { id: dto.classId },
    });

    if (!classExists) {
      throw new NotFoundException(`Class ${dto.classId} not found`);
    }

    // Create assignment
    const assignment = await this.prisma.classMcpServer.create({
      data: {
        classId: dto.classId,
        mcpServerId: serverId,
        isEnabled: dto.isEnabled ?? true,
        priority: dto.priority ?? 0,
        displayName: dto.displayName,
        configuration: dto.configuration,
        assignedBy,
      },
      include: {
        mcpServer: {
          select: {
            id: true,
            name: true,
            description: true,
            transport: true,
            requiresOAuth: true,
            isActive: true,
          },
        },
      },
    });

    this.logger.log(`Assigned MCP server ${serverId} to class ${dto.classId}`);

    return this.mapClassMcpServerToResponse(assignment);
  }

  /**
   * Remove an MCP server assignment from a class
   */
  async removeServerFromClass(
    classId: string,
    mcpServerId: string,
  ): Promise<void> {
    // Find the assignment
    const assignment = await this.prisma.classMcpServer.findUnique({
      where: {
        classId_mcpServerId: { classId, mcpServerId },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Server ${mcpServerId} is not assigned to class ${classId}`,
      );
    }

    // Delete tool configs that reference this assignment
    await this.prisma.classToolConfig.deleteMany({
      where: {
        toolType: 'MCP',
        toolIdentifier: assignment.id,
      },
    });

    // Delete the assignment
    await this.prisma.classMcpServer.delete({
      where: { id: assignment.id },
    });

    this.logger.log(`Removed MCP server ${mcpServerId} from class ${classId}`);
  }

  /**
   * Update class-specific settings for an MCP server assignment
   */
  async updateClassServerSettings(
    classId: string,
    mcpServerId: string,
    dto: UpdateClassMcpServerDto,
  ): Promise<ClassMcpServerResponseDto> {
    const assignment = await this.prisma.classMcpServer.update({
      where: {
        classId_mcpServerId: { classId, mcpServerId },
      },
      data: {
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.configuration !== undefined && {
          configuration: dto.configuration,
        }),
      },
      include: {
        mcpServer: {
          select: {
            id: true,
            name: true,
            description: true,
            transport: true,
            requiresOAuth: true,
            isActive: true,
          },
        },
      },
    });

    this.logger.log(
      `Updated assignment settings for server ${mcpServerId} in class ${classId}`,
    );

    return this.mapClassMcpServerToResponse(assignment);
  }

  /**
   * Get all MCP servers assigned to a class
   */
  async getClassServers(classId: string): Promise<ClassMcpServerResponseDto[]> {
    const assignments = await this.prisma.classMcpServer.findMany({
      where: { classId },
      include: {
        mcpServer: {
          select: {
            id: true,
            name: true,
            description: true,
            transport: true,
            requiresOAuth: true,
            isActive: true,
          },
        },
      },
      orderBy: { priority: 'desc' },
    });

    return assignments.map((a) => this.mapClassMcpServerToResponse(a));
  }

  /**
   * Get all classes that have a specific MCP server assigned
   */
  async getServerClasses(mcpServerId: string): Promise<ClassSummaryDto[]> {
    const assignments = await this.prisma.classMcpServer.findMany({
      where: { mcpServerId },
      include: {
        class: {
          select: {
            id: true,
            classMetadata: true,
          },
        },
      },
    });

    return assignments.map((a) => ({
      classId: a.classId,
      className: (a.class.classMetadata as any)?.className || 'Unknown',
      isEnabled: a.isEnabled,
    }));
  }

  // ============================================
  // Tool Configuration Management
  // ============================================

  /**
   * Get all tool configurations for a class
   * Returns built-in tools by default and MCP tools from ClassMcpServer assignments
   */
  async getToolConfigsForClass(
    classId: string,
  ): Promise<ToolConfigResponseDto[]> {
    // Load existing configs for overrides (disable, chatType filtering, etc.)
    const toolConfigs = await this.prisma.classToolConfig.findMany({
      where: { classId },
    });
    const configMap = new Map(
      toolConfigs.map((c) => [`${c.toolType}:${c.toolIdentifier}`, c]),
    );

    const results: ToolConfigResponseDto[] = [];

    // 1. Built-in tools (enabled by default)
    const builtInTools = [
      { identifier: 'rag', type: 'RAG', name: 'Document Search (RAG)' },
      {
        identifier: 'code-interpreter',
        type: 'CodeInterpreter',
        name: 'Code Interpreter',
      },
    ];

    for (const tool of builtInTools) {
      const config = configMap.get(`${tool.type}:${tool.identifier}`);
      results.push({
        id: config?.id ?? `builtin:${tool.identifier}`,
        classId,
        toolType: tool.type,
        toolIdentifier: tool.identifier,
        toolName: config?.toolName ?? tool.name,
        isEnabled: config?.isEnabled ?? true,
        chatTypes: (config?.chatTypes as string[]) ?? [],
        priority: config?.priority ?? 0,
        configuration: config?.configuration as any,
        createdAt: config?.createdAt ?? new Date(),
        updatedAt: config?.updatedAt ?? new Date(),
      });
    }

    // 2. MCP tools from ClassMcpServer assignments directly
    const mcpAssignments = await this.prisma.classMcpServer.findMany({
      where: { classId, isEnabled: true },
      include: {
        mcpServer: {
          select: { id: true, name: true, requiresOAuth: true, isActive: true },
        },
      },
      orderBy: { priority: 'desc' },
    });

    for (const assignment of mcpAssignments) {
      // Skip if global server is not active
      if (!assignment.mcpServer.isActive) {
        continue;
      }

      const config = configMap.get(`MCP:${assignment.id}`);
      results.push({
        id: config?.id ?? assignment.id,
        classId,
        toolType: 'MCP',
        toolIdentifier: assignment.id,
        toolName:
          config?.toolName ??
          assignment.displayName ??
          assignment.mcpServer.name,
        isEnabled: config?.isEnabled ?? true,
        chatTypes: (config?.chatTypes as string[]) ?? [],
        priority: config?.priority ?? assignment.priority,
        configuration: config?.configuration as any,
        createdAt: config?.createdAt ?? assignment.createdAt,
        updatedAt: config?.updatedAt ?? assignment.updatedAt,
        mcpServer: {
          id: assignment.mcpServer.id,
          name: assignment.mcpServer.name,
          requiresOAuth: assignment.mcpServer.requiresOAuth,
        },
      });
    }

    return results;
  }

  /**
   * Update a tool configuration
   * Handles synthetic IDs (builtin:* and ClassMcpServer IDs) by upserting
   */
  async updateToolConfig(
    toolConfigId: string,
    updateDto: UpdateToolStatusDto,
  ): Promise<ToolConfigResponseDto> {
    // Handle built-in tool synthetic IDs (e.g., "builtin:rag")
    if (toolConfigId.startsWith('builtin:')) {
      if (!updateDto.classId) {
        throw new Error(
          'classId is required when updating a built-in tool config',
        );
      }

      const identifier = toolConfigId.replace('builtin:', '');
      const toolType = identifier === 'rag' ? 'RAG' : 'CodeInterpreter';
      const toolName =
        identifier === 'rag' ? 'Document Search (RAG)' : 'Code Interpreter';

      // Upsert - create if doesn't exist, update if it does
      const config = await this.prisma.classToolConfig.upsert({
        where: {
          classId_toolType_toolIdentifier: {
            classId: updateDto.classId,
            toolType: toolType as any,
            toolIdentifier: identifier,
          },
        },
        update: { isEnabled: updateDto.isEnabled },
        create: {
          classId: updateDto.classId,
          toolType: toolType as any,
          toolIdentifier: identifier,
          toolName,
          isEnabled: updateDto.isEnabled,
          chatTypes: [],
          priority: 0,
        },
      });

      this.logger.log(
        `Upserted built-in tool config for ${identifier}: isEnabled=${updateDto.isEnabled}`,
      );

      return this.mapToolConfigToResponse(config);
    }

    // Check if this is a ClassMcpServer ID (for MCP tools without ClassToolConfig)
    const mcpAssignment = await this.prisma.classMcpServer.findUnique({
      where: { id: toolConfigId },
      include: { mcpServer: true },
    });

    if (mcpAssignment) {
      // Upsert ClassToolConfig for this MCP assignment
      const config = await this.prisma.classToolConfig.upsert({
        where: {
          classId_toolType_toolIdentifier: {
            classId: mcpAssignment.classId,
            toolType: 'MCP',
            toolIdentifier: toolConfigId,
          },
        },
        update: { isEnabled: updateDto.isEnabled },
        create: {
          classId: mcpAssignment.classId,
          toolType: 'MCP',
          toolIdentifier: toolConfigId,
          toolName: mcpAssignment.displayName ?? mcpAssignment.mcpServer.name,
          isEnabled: updateDto.isEnabled,
          chatTypes: [],
          priority: mcpAssignment.priority,
        },
        include: {
          classMcpServer: {
            include: {
              mcpServer: {
                select: { id: true, name: true, requiresOAuth: true },
              },
            },
          },
        },
      });

      this.logger.log(
        `Upserted MCP tool config for ${mcpAssignment.mcpServer.name}: isEnabled=${updateDto.isEnabled}`,
      );

      return this.mapToolConfigToResponse(config);
    }

    // Regular update for existing ClassToolConfig records
    const config = await this.prisma.classToolConfig.update({
      where: { id: toolConfigId },
      data: {
        isEnabled: updateDto.isEnabled,
      },
      include: {
        classMcpServer: {
          include: {
            mcpServer: {
              select: {
                id: true,
                name: true,
                requiresOAuth: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Updated tool config ${toolConfigId}: isEnabled=${updateDto.isEnabled}`,
    );

    return this.mapToolConfigToResponse(config);
  }

  /**
   * Bulk update tool configurations
   */
  async bulkUpdateToolConfigs(
    classId: string,
    bulkDto: BulkToolConfigDto,
  ): Promise<ToolConfigResponseDto[]> {
    const results: ToolConfigResponseDto[] = [];

    for (const toolDto of bulkDto.tools) {
      // Check if config exists
      const existing = await this.prisma.classToolConfig.findUnique({
        where: {
          classId_toolType_toolIdentifier: {
            classId,
            toolType: toolDto.toolType as any,
            toolIdentifier: toolDto.toolIdentifier,
          },
        },
      });

      if (existing) {
        // Update existing
        const updated = await this.prisma.classToolConfig.update({
          where: { id: existing.id },
          data: {
            toolName: toolDto.toolName,
            isEnabled: toolDto.isEnabled,
            chatTypes: toolDto.chatTypes,
            priority: toolDto.priority,
            configuration: toolDto.configuration,
          },
          include: {
            classMcpServer: {
              include: {
                mcpServer: {
                  select: {
                    id: true,
                    name: true,
                    requiresOAuth: true,
                  },
                },
              },
            },
          },
        });
        results.push(this.mapToolConfigToResponse(updated));
      } else {
        // Create new
        const created = await this.prisma.classToolConfig.create({
          data: {
            classId,
            toolType: toolDto.toolType as any,
            toolIdentifier: toolDto.toolIdentifier,
            toolName: toolDto.toolName,
            isEnabled: toolDto.isEnabled,
            chatTypes: toolDto.chatTypes,
            priority: toolDto.priority,
            configuration: toolDto.configuration,
          },
          include: {
            classMcpServer: {
              include: {
                mcpServer: {
                  select: {
                    id: true,
                    name: true,
                    requiresOAuth: true,
                  },
                },
              },
            },
          },
        });
        results.push(this.mapToolConfigToResponse(created));
      }
    }

    this.logger.log(
      `Bulk updated ${results.length} tool configs for class ${classId}`,
    );

    return results;
  }

  // ============================================
  // User OAuth Connections
  // ============================================

  /**
   * Get user's MCP connections
   * Note: Servers are now global, so classId is no longer included
   */
  async getUserConnections(
    userId: string,
  ): Promise<McpConnectionResponseDto[]> {
    const connections =
      await this.mcpConnectionManager.getUserConnections(userId);

    return connections.map((c) => ({
      id: c.id,
      userId: c.userId,
      mcpServerId: c.mcpServerId,
      tokenType: c.tokenType,
      expiresAt: c.expiresAt ?? undefined,
      scope: c.scope ?? undefined,
      isActive: c.isActive,
      createdAt: c.createdAt,
      lastUsedAt: c.lastUsedAt ?? undefined,
      mcpServer: {
        id: c.mcpServer.id,
        name: c.mcpServer.name,
        description: c.mcpServer.description ?? undefined,
      },
    }));
  }

  /**
   * Initiate OAuth flow
   */
  async initiateOAuth(
    userId: string,
    serverId: string,
  ): Promise<OAuthInitiateResponseDto> {
    const server = await this.prisma.mcpServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException(`MCP server ${serverId} not found`);
    }

    if (!server.requiresOAuth) {
      throw new BadRequestException(
        `MCP server ${server.name} does not require OAuth`,
      );
    }

    const oauthMetadata = server.oauthMetadata as any;
    if (!oauthMetadata?.authorizationUrl || !oauthMetadata?.clientId) {
      throw new BadRequestException(
        `MCP server ${server.name} has incomplete OAuth configuration`,
      );
    }

    // Add redirect URI if not present
    if (!oauthMetadata.redirectUri) {
      oauthMetadata.redirectUri = this.mcpOAuth.getRedirectUri();
    }

    const result = this.mcpOAuth.initiateAuthorization(
      oauthMetadata,
      userId,
      serverId,
    );

    this.logger.log(`Initiated OAuth for user ${userId}, server ${serverId}`);

    return result;
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<OAuthCallbackSuccessDto> {
    // Get pending authorization to retrieve serverId
    const pending = this.mcpOAuth.getPendingAuthorization(state);
    if (!pending) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    // Get server info to retrieve OAuth metadata
    const server = await this.prisma.mcpServer.findUnique({
      where: { id: pending.serverId },
    });

    if (!server) {
      throw new NotFoundException('MCP server not found');
    }

    const oauthMetadata = server.oauthMetadata as any;

    // Exchange code for tokens (single call with complete metadata)
    const tokenData = await this.mcpOAuth.exchangeCodeForToken(code, state, {
      tokenUrl: oauthMetadata.tokenUrl,
      clientId: oauthMetadata.clientId,
      clientSecret: oauthMetadata.clientSecret,
      redirectUri: oauthMetadata.redirectUri || this.mcpOAuth.getRedirectUri(),
    });

    // Create connection
    const connection = await this.mcpConnectionManager.createConnection(
      tokenData.userId,
      tokenData.serverId,
      {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenType: tokenData.tokenType,
        expiresIn: tokenData.expiresIn,
        scope: tokenData.scope,
      },
    );

    this.logger.log(
      `OAuth callback successful for user ${tokenData.userId}, server ${tokenData.serverId}`,
    );

    return {
      message: 'Successfully connected to MCP server',
      connection: {
        id: connection.id,
        userId: connection.userId,
        mcpServerId: connection.mcpServerId,
        tokenType: connection.tokenType,
        expiresAt: connection.expiresAt ?? undefined,
        scope: connection.scope ?? undefined,
        isActive: connection.isActive,
        createdAt: connection.createdAt,
        lastUsedAt: connection.lastUsedAt ?? undefined,
        mcpServer: {
          id: server.id,
          name: server.name,
          description: server.description ?? undefined,
        },
      },
    };
  }

  /**
   * Disconnect user from MCP server
   */
  async disconnectUser(userId: string, connectionId: string): Promise<void> {
    const connection = await this.prisma.mcpUserConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (connection.userId !== userId) {
      throw new BadRequestException('Connection does not belong to user');
    }

    await this.mcpConnectionManager.disconnectUser(
      userId,
      connection.mcpServerId,
    );

    this.logger.log(
      `User ${userId} disconnected from MCP server ${connection.mcpServerId}`,
    );
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Sanitize MCP server response (remove sensitive data)
   */
  private sanitizeMcpServerResponse(server: any): McpServerResponseDto {
    const sanitized = { ...server };

    // Sanitize OAuth metadata (remove client secret)
    if (sanitized.oauthMetadata) {
      const oauth = { ...sanitized.oauthMetadata };
      delete oauth.clientSecret;
      sanitized.oauthMetadata = oauth;
    }

    // Sanitize config (remove sensitive environment variables)
    if (sanitized.config?.env) {
      const config = { ...sanitized.config };
      config.env = Object.keys(config.env).reduce(
        (acc: Record<string, string>, key) => {
          acc[key] = '***';
          return acc;
        },
        {},
      );
      sanitized.config = config;
    }

    return sanitized;
  }

  /**
   * Map tool config to response DTO
   * Note: Now uses classMcpServer.mcpServer for MCP tool info
   */
  private mapToolConfigToResponse(config: any): ToolConfigResponseDto {
    // For MCP tools, the mcpServer info comes through classMcpServer
    const mcpServer = config.classMcpServer?.mcpServer;

    return {
      id: config.id,
      classId: config.classId,
      toolType: config.toolType,
      toolIdentifier: config.toolIdentifier,
      toolName: config.toolName,
      isEnabled: config.isEnabled,
      chatTypes: config.chatTypes as string[],
      priority: config.priority,
      configuration: config.configuration as any,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      mcpServer: mcpServer
        ? {
            id: mcpServer.id,
            name: mcpServer.name,
            requiresOAuth: mcpServer.requiresOAuth,
          }
        : undefined,
    };
  }

  /**
   * Map ClassMcpServer to response DTO
   */
  private mapClassMcpServerToResponse(
    assignment: any,
  ): ClassMcpServerResponseDto {
    return {
      id: assignment.id,
      classId: assignment.classId,
      mcpServerId: assignment.mcpServerId,
      isEnabled: assignment.isEnabled,
      priority: assignment.priority,
      displayName: assignment.displayName ?? undefined,
      configuration: assignment.configuration ?? undefined,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      assignedBy: assignment.assignedBy ?? undefined,
      mcpServer: {
        id: assignment.mcpServer.id,
        name: assignment.mcpServer.name,
        description: assignment.mcpServer.description ?? undefined,
        transport: assignment.mcpServer.transport,
        requiresOAuth: assignment.mcpServer.requiresOAuth,
        isActive: assignment.mcpServer.isActive,
      },
    };
  }
}
