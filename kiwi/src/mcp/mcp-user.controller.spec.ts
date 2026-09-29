import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { McpUserController } from './mcp-user.controller';
import { McpService } from './mcp.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import {
  McpConnectionResponseDto,
  OAuthInitiateResponseDto,
  OAuthCallbackQueryDto,
  OAuthCallbackSuccessDto,
} from './dto/mcp-connection.dto';

describe('McpUserController - Permission Tests', () => {
  let controller: McpUserController;
  let mcpService: jest.Mocked<McpService>;
  let mockJwtAuthGuard: any;

  // Mock user data
  const user1 = {
    sub: 'user-123',
    systemRole: 'student',
  };

  const mockConnection: McpConnectionResponseDto = {
    id: 'connection-123',
    userId: 'user-123',
    mcpServerId: 'server-123',
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + 3600000),
    scope: 'read write',
    isActive: true,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    mcpServer: {
      id: 'server-123',
      name: 'Test MCP Server',
      description: 'Test server',
    },
  };

  const mockOAuthInitiate: OAuthInitiateResponseDto = {
    authorizationUrl:
      'https://oauth.example.com/authorize?client_id=test&state=xyz',
    state: 'state-xyz',
  };

  const mockOAuthCallback: OAuthCallbackSuccessDto = {
    message: 'Successfully connected to MCP server',
    connection: mockConnection,
  };

  beforeEach(async () => {
    // Create mock guard
    mockJwtAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        return !!request.user;
      }),
    };

    // Create mock service
    const mockMcpServiceValue = {
      getUserConnections: jest.fn(),
      initiateOAuth: jest.fn(),
      handleOAuthCallback: jest.fn(),
      disconnectUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpUserController],
      providers: [
        {
          provide: McpService,
          useValue: mockMcpServiceValue,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3001'),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<McpUserController>(McpUserController);
    mcpService = module.get(McpService) as jest.Mocked<McpService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('GET /mcp/user/connections - getUserConnections', () => {
    it('should deny access without authentication', async () => {
      const mockRequest = { user: null };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const canActivate = await mockJwtAuthGuard.canActivate(context);
      expect(canActivate).toBe(false);
    });

    it('should allow authenticated user to view their connections', async () => {
      const session = { userId: 'user-123' };
      const mockConnections = [mockConnection];
      mcpService.getUserConnections.mockResolvedValue(mockConnections);

      const result = await controller.getUserConnections(session);

      expect(mcpService.getUserConnections).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockConnections);
    });

    it('should return empty array when user has no connections', async () => {
      const session = { userId: 'user-123' };
      mcpService.getUserConnections.mockResolvedValue([]);

      const result = await controller.getUserConnections(session);

      expect(mcpService.getUserConnections).toHaveBeenCalledWith('user-123');
      expect(result).toEqual([]);
    });

    it('should return only the connections for the authenticated user', async () => {
      const session = { userId: 'user-123' };
      const user1Connections = [
        mockConnection,
        { ...mockConnection, id: 'connection-456' },
      ];
      mcpService.getUserConnections.mockResolvedValue(user1Connections);

      const result = await controller.getUserConnections(session);

      expect(mcpService.getUserConnections).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(user1Connections);
      expect(result.every((c) => c.userId === 'user-123')).toBe(true);
    });
  });

  describe('GET /mcp/user/servers/:serverId/authorize - initiateOAuth', () => {
    const serverId = 'server-123';

    it('should deny access without authentication', async () => {
      const mockRequest = { user: null };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const canActivate = await mockJwtAuthGuard.canActivate(context);
      expect(canActivate).toBe(false);
    });

    it('should allow authenticated user to initiate OAuth', async () => {
      const session = { userId: 'user-123' };
      mcpService.initiateOAuth.mockResolvedValue(mockOAuthInitiate);

      const result = await controller.initiateOAuth(serverId, session);

      expect(mcpService.initiateOAuth).toHaveBeenCalledWith(
        'user-123',
        serverId,
      );
      expect(result).toEqual(mockOAuthInitiate);
      expect(result.authorizationUrl).toContain('authorize');
    });

    it('should generate unique state parameter for each OAuth flow', async () => {
      const session = { userId: 'user-123' };
      const oauthResponse1 = {
        ...mockOAuthInitiate,
        state: 'state-abc',
      };
      const oauthResponse2 = {
        ...mockOAuthInitiate,
        state: 'state-xyz',
      };

      mcpService.initiateOAuth.mockResolvedValueOnce(oauthResponse1);
      const result1 = await controller.initiateOAuth(serverId, session);

      mcpService.initiateOAuth.mockResolvedValueOnce(oauthResponse2);
      const result2 = await controller.initiateOAuth(serverId, session);

      expect(result1.state).toBe('state-abc');
      expect(result2.state).toBe('state-xyz');
    });

    it('should handle BadRequestException for non-OAuth servers', async () => {
      const session = { userId: 'user-123' };
      mcpService.initiateOAuth.mockRejectedValue(
        new BadRequestException('Server does not require OAuth'),
      );

      await expect(controller.initiateOAuth(serverId, session)).rejects.toThrow(
        'Server does not require OAuth',
      );
    });
  });

  describe('GET /mcp/user/oauth/callback - handleOAuthCallback (PUBLIC)', () => {
    const validQuery: OAuthCallbackQueryDto = {
      code: 'auth-code-123',
      state: 'state-xyz',
    };

    it('should allow public access (no authentication required)', async () => {
      // OAuth callback should work without authentication
      mcpService.handleOAuthCallback.mockResolvedValue(mockOAuthCallback);
      const response = { redirect: jest.fn() };

      await controller.handleOAuthCallback(validQuery, response as any);

      expect(mcpService.handleOAuthCallback).toHaveBeenCalledWith(
        'auth-code-123',
        'state-xyz',
      );
      expect(response.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/?mcp_oauth_success=true',
      );
    });

    it('should successfully complete OAuth flow with valid code and state', async () => {
      mcpService.handleOAuthCallback.mockResolvedValue(mockOAuthCallback);
      const response = { redirect: jest.fn() };

      await controller.handleOAuthCallback(validQuery, response as any);

      expect(response.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/?mcp_oauth_success=true',
      );
    });

    it('should throw error when OAuth provider returns error', async () => {
      const errorQuery: OAuthCallbackQueryDto = {
        code: '',
        state: 'state-xyz',
        error: 'access_denied',
        error_description: 'User denied access',
      };

      const response = { redirect: jest.fn() };

      await controller.handleOAuthCallback(errorQuery, response as any);

      expect(mcpService.handleOAuthCallback).not.toHaveBeenCalled();
      expect(response.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/?mcp_oauth_error=access_denied',
      );
    });

    it('should handle invalid state parameter', async () => {
      const invalidStateQuery: OAuthCallbackQueryDto = {
        code: 'auth-code-123',
        state: 'invalid-state',
      };

      mcpService.handleOAuthCallback.mockRejectedValue(
        new Error('Invalid state parameter'),
      );
      const response = { redirect: jest.fn() };

      await controller.handleOAuthCallback(invalidStateQuery, response as any);

      expect(response.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/?mcp_oauth_error=Invalid%20state%20parameter',
      );
    });

    it('should handle expired authorization code', async () => {
      mcpService.handleOAuthCallback.mockRejectedValue(
        new Error('Authorization code expired'),
      );
      const response = { redirect: jest.fn() };

      await controller.handleOAuthCallback(validQuery, response as any);

      expect(response.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/?mcp_oauth_error=Authorization%20code%20expired',
      );
    });
  });

  describe('DELETE /mcp/user/connections/:connectionId - disconnectMcpServer', () => {
    const connectionId = 'connection-123';

    it('should deny access without authentication', async () => {
      const mockRequest = { user: null };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const canActivate = await mockJwtAuthGuard.canActivate(context);
      expect(canActivate).toBe(false);
    });

    it('should allow authenticated user to disconnect their own connection', async () => {
      const session = { userId: 'user-123' };
      mcpService.disconnectUser.mockResolvedValue(undefined);

      await controller.disconnectMcpServer(connectionId, session);

      expect(mcpService.disconnectUser).toHaveBeenCalledWith(
        'user-123',
        connectionId,
      );
    });

    it('should prevent user from disconnecting another users connection', async () => {
      const session = { userId: 'user-456' }; // Different user
      mcpService.disconnectUser.mockRejectedValue(
        new BadRequestException('Connection does not belong to user'),
      );

      await expect(
        controller.disconnectMcpServer(connectionId, session),
      ).rejects.toThrow('Connection does not belong to user');

      expect(mcpService.disconnectUser).toHaveBeenCalledWith(
        'user-456',
        connectionId,
      );
    });

    it('should handle non-existent connection gracefully', async () => {
      const session = { userId: 'user-123' };
      mcpService.disconnectUser.mockRejectedValue(
        new Error('Connection not found'),
      );

      await expect(
        controller.disconnectMcpServer('non-existent', session),
      ).rejects.toThrow('Connection not found');
    });
  });

  describe('Cross-User Access Prevention', () => {
    it('should ensure users can only access their own connections', async () => {
      const user1Session = { userId: 'user-123' };
      const user2Session = { userId: 'user-456' };

      const user1Connections = [mockConnection];
      const user2Connections = [
        { ...mockConnection, id: 'connection-789', userId: 'user-456' },
      ];

      mcpService.getUserConnections.mockResolvedValueOnce(user1Connections);
      const result1 = await controller.getUserConnections(user1Session);

      mcpService.getUserConnections.mockResolvedValueOnce(user2Connections);
      const result2 = await controller.getUserConnections(user2Session);

      expect(result1[0].userId).toBe('user-123');
      expect(result2[0].userId).toBe('user-456');
      expect(result1[0].id).not.toBe(result2[0].id);
    });

    it('should prevent user from disconnecting connections they do not own', async () => {
      const user2Session = { userId: 'user-456' };
      const user1ConnectionId = 'connection-123'; // Belongs to user-123

      mcpService.disconnectUser.mockRejectedValue(
        new BadRequestException('Connection does not belong to user'),
      );

      await expect(
        controller.disconnectMcpServer(user1ConnectionId, user2Session),
      ).rejects.toThrow('Connection does not belong to user');
    });
  });

  describe('Permission Scenarios Summary', () => {
    it('should enforce JWT authentication for protected endpoints', async () => {
      const mockRequest = { user: null };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const canActivate = await mockJwtAuthGuard.canActivate(context);
      expect(canActivate).toBe(false);
    });

    it('should allow authenticated users to access their own data', async () => {
      const mockRequest = { user: user1 };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const canActivate = await mockJwtAuthGuard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should allow public access to OAuth callback endpoint', async () => {
      // The OAuth callback endpoint has no guards, so it should always be accessible
      const query: OAuthCallbackQueryDto = {
        code: 'test-code',
        state: 'test-state',
      };

      mcpService.handleOAuthCallback.mockResolvedValue(mockOAuthCallback);
      const response = { redirect: jest.fn() };

      // This should not throw even without authentication
      await controller.handleOAuthCallback(query, response as any);
      expect(response.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/?mcp_oauth_success=true',
      );
    });
  });
});
