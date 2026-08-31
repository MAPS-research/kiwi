import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { McpOAuthService } from './mcp-oauth.service';
import { RedisService } from '../redis/redis.service';
import { encrypt, decrypt } from './encryption.util';
import type { McpServer, McpUserConnection } from '@prisma/client';

/**
 * MCP Connection Manager Service
 *
 * Manages user-specific MCP server connections with OAuth token management.
 * Responsibilities:
 * - Store and retrieve encrypted OAuth tokens
 * - Auto-refresh expired tokens
 * - Manage connection lifecycle
 * - Handle connection errors and retries
 *
 * Usage:
 * - When a user wants to use an MCP server that requires OAuth,
 *   they first must authorize via getOrCreateConnection()
 * - The connection manager handles token refresh automatically
 * - Tokens are encrypted at rest in the database
 */
@Injectable()
export class McpConnectionManagerService {
  private readonly logger = new Logger(McpConnectionManagerService.name);

  constructor(
    private prisma: DatabaseService,
    private oauthService: McpOAuthService,
    private redisService: RedisService,
  ) {}

  /**
   * Get an active connection for a user and MCP server
   * Automatically refreshes tokens if expired
   *
   * @returns Active connection with decrypted access token, or null if not connected
   */
  async getConnection(
    userId: string,
    mcpServerId: string,
  ): Promise<{ connection: McpUserConnection; accessToken: string } | null> {
    const connection = await this.prisma.mcpUserConnection.findUnique({
      where: {
        userId_mcpServerId: {
          userId,
          mcpServerId,
        },
      },
      include: {
        mcpServer: true,
      },
    });

    if (!connection || !connection.isActive) {
      return null;
    }

    // Decrypt access token
    const accessToken = await decrypt(connection.accessToken);

    // Check if token is expired and needs refresh
    if (this.oauthService.isTokenExpired(connection.expiresAt)) {
      this.logger.log(
        `Access token expired for user ${userId}, server ${mcpServerId}, refreshing...`,
      );

      try {
        const refreshed = await this.refreshConnection(connection);
        return refreshed;
      } catch (error) {
        this.logger.error('Failed to refresh token:', error);
        // Mark connection as inactive
        await this.prisma.mcpUserConnection.update({
          where: { id: connection.id },
          data: { isActive: false },
        });
        return null;
      }
    }

    // Update last used timestamp
    await this.prisma.mcpUserConnection.update({
      where: { id: connection.id },
      data: { lastUsedAt: new Date() },
    });

    return { connection, accessToken };
  }

  /**
   * Create a new connection with OAuth tokens
   * Called after successful OAuth flow
   */
  async createConnection(
    userId: string,
    mcpServerId: string,
    tokenData: {
      accessToken: string;
      refreshToken?: string;
      tokenType: string;
      expiresIn?: number;
      scope?: string;
    },
  ): Promise<McpUserConnection> {
    // Encrypt tokens before storage
    const encryptedAccessToken = await encrypt(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken
      ? await encrypt(tokenData.refreshToken)
      : null;

    const expiresAt = this.oauthService.calculateExpirationDate(
      tokenData.expiresIn,
    );

    // Check if connection already exists
    const existing = await this.prisma.mcpUserConnection.findUnique({
      where: {
        userId_mcpServerId: {
          userId,
          mcpServerId,
        },
      },
    });

    if (existing) {
      // Update existing connection
      return this.prisma.mcpUserConnection.update({
        where: { id: existing.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenType: tokenData.tokenType,
          expiresAt,
          scope: tokenData.scope,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });
    }

    // Create new connection
    return this.prisma.mcpUserConnection.create({
      data: {
        userId,
        mcpServerId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenType: tokenData.tokenType,
        expiresAt,
        scope: tokenData.scope,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Refresh an expired access token
   * @private - Called automatically by getConnection
   */
  private async refreshConnection(
    connection: McpUserConnection & { mcpServer: McpServer },
  ): Promise<{ connection: McpUserConnection; accessToken: string }> {
    if (!connection.refreshToken) {
      throw new Error('No refresh token available');
    }

    const decryptedRefreshToken = await decrypt(connection.refreshToken);
    const oauthMetadata = connection.mcpServer.oauthMetadata as any;

    // Refresh the token
    const tokenData = await this.oauthService.refreshAccessToken(
      decryptedRefreshToken,
      {
        tokenUrl: oauthMetadata.tokenUrl,
        clientId: oauthMetadata.clientId,
        clientSecret: oauthMetadata.clientSecret,
      },
    );

    // Encrypt new tokens
    const encryptedAccessToken = await encrypt(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken
      ? await encrypt(tokenData.refreshToken)
      : connection.refreshToken; // Keep old refresh token if new one not provided

    const expiresAt = this.oauthService.calculateExpirationDate(
      tokenData.expiresIn,
    );

    // Update connection with new tokens
    const updated = await this.prisma.mcpUserConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenType: tokenData.tokenType,
        expiresAt,
        scope: tokenData.scope,
        lastUsedAt: new Date(),
      },
    });

    this.logger.log(
      `Successfully refreshed token for user ${connection.userId}, server ${connection.mcpServerId}`,
    );

    return {
      connection: updated,
      accessToken: tokenData.accessToken,
    };
  }

  /**
   * Disconnect a user from an MCP server
   * Revokes tokens and deletes connection
   */
  async disconnectUser(
    userId: string,
    mcpServerId: string,
  ): Promise<void> {
    const connection = await this.prisma.mcpUserConnection.findUnique({
      where: {
        userId_mcpServerId: {
          userId,
          mcpServerId,
        },
      },
      include: {
        mcpServer: true,
      },
    });

    if (!connection) {
      return;
    }

    // Try to revoke the access token (best effort)
    try {
      const accessToken = await decrypt(connection.accessToken);
      const oauthMetadata = connection.mcpServer.oauthMetadata as any;

      await this.oauthService.revokeToken(accessToken, 'access_token', {
        revocationUrl: oauthMetadata.revocationUrl,
        clientId: oauthMetadata.clientId,
        clientSecret: oauthMetadata.clientSecret,
      });
    } catch (error) {
      this.logger.warn('Failed to revoke token during disconnect:', error);
    }

    // Revoke MCP refresh token from Redis (for internal OAuth)
    try {
      await this.redisService.del(`mcp_refresh_token:${userId}:${mcpServerId}`);
      this.logger.debug(
        `Revoked MCP refresh token from Redis for user ${userId}, server ${mcpServerId}`,
      );
    } catch (error) {
      this.logger.warn('Failed to revoke MCP refresh token from Redis:', error);
    }

    // Delete connection
    await this.prisma.mcpUserConnection.delete({
      where: { id: connection.id },
    });

    this.logger.log(
      `User ${userId} disconnected from MCP server ${mcpServerId}`,
    );
  }

  /**
   * Get all connections for a user
   * Note: MCP servers are now global, so no class relation is included
   */
  async getUserConnections(userId: string): Promise<
    Array<
      McpUserConnection & {
        mcpServer: McpServer;
      }
    >
  > {
    return this.prisma.mcpUserConnection.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        mcpServer: true,
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    });
  }

  /**
   * Check if a user has an active connection to an MCP server
   */
  async hasConnection(userId: string, mcpServerId: string): Promise<boolean> {
    const count = await this.prisma.mcpUserConnection.count({
      where: {
        userId,
        mcpServerId,
        isActive: true,
      },
    });

    return count > 0;
  }

  /**
   * Deactivate all connections for an MCP server
   * Called when server is deleted or deactivated
   */
  async deactivateServerConnections(mcpServerId: string): Promise<void> {
    await this.prisma.mcpUserConnection.updateMany({
      where: { mcpServerId },
      data: { isActive: false },
    });

    this.logger.log(
      `Deactivated all connections for MCP server ${mcpServerId}`,
    );
  }
}
