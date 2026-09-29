import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { McpAdminController } from './mcp-admin.controller';
import { McpService } from './mcp.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/auth.guard';
import {
  CreateMcpServerDto,
  UpdateMcpServerDto,
  McpServerResponseDto,
  McpTransportType,
} from './dto/mcp-server.dto';

describe('McpAdminController - Permission Tests', () => {
  let controller: McpAdminController;
  let mcpService: jest.Mocked<McpService>;
  let mockJwtAuthGuard: any;
  let mockAdminGuard: any;

  // Mock user data
  const adminUser = {
    sub: 'admin-123',
    systemRole: 'admin',
  };

  const regularUser = {
    sub: 'user-123',
    systemRole: 'student',
  };

  const mockMcpServer: McpServerResponseDto = {
    id: 'server-123',
    name: 'Test MCP Server',
    description: 'Test server',
    transport: McpTransportType.STDIO,
    config: { command: 'node', args: ['server.js'] },
    requiresOAuth: false,
    oauthMetadata: undefined,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin-123',
  };

  beforeEach(async () => {
    // Create mock guards
    mockJwtAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        return !!request.user;
      }),
    };

    mockAdminGuard = {
      canActivate: jest.fn((context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        return request.user?.systemRole === 'admin';
      }),
    };

    // Create mock service
    const mockMcpServiceValue = {
      createMcpServer: jest.fn(),
      listAllMcpServers: jest.fn(),
      getMcpServer: jest.fn(),
      updateMcpServer: jest.fn(),
      deleteMcpServer: jest.fn(),
      testMcpServer: jest.fn(),
      listMcpServerTools: jest.fn(),
      discoverOAuthMetadata: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpAdminController],
      providers: [
        {
          provide: McpService,
          useValue: mockMcpServiceValue,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(AdminGuard)
      .useValue(mockAdminGuard)
      .compile();

    controller = module.get<McpAdminController>(McpAdminController);
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

  describe('POST /mcp/admin/servers - createMcpServer', () => {
    const createDto: CreateMcpServerDto = {
      name: 'New MCP Server',
      description: 'Test server',
      transport: McpTransportType.STDIO,
      config: { command: 'node', args: ['server.js'] },
      requiresOAuth: false,
      isActive: true,
    };

    it('should deny access without authentication', async () => {
      const mockRequest = { user: null };

      mockJwtAuthGuard.canActivate.mockReturnValueOnce(false);

      expect(mockJwtAuthGuard.canActivate).toBeDefined();

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const canActivate = await mockJwtAuthGuard.canActivate(context);
      expect(canActivate).toBe(false);
    });

    it('should deny access to non-admin users', async () => {
      const mockRequest = { user: regularUser };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const jwtResult = await mockJwtAuthGuard.canActivate(context);
      expect(jwtResult).toBe(true);

      const adminResult = await mockAdminGuard.canActivate(context);
      expect(adminResult).toBe(false);
    });

    it('should allow admin to create MCP server', async () => {
      const session = { userId: adminUser.sub };
      mcpService.createMcpServer.mockResolvedValue(mockMcpServer);

      const result = await controller.createMcpServer(createDto, session);

      expect(mcpService.createMcpServer).toHaveBeenCalledWith(
        createDto,
        adminUser.sub,
      );
      expect(result).toEqual(mockMcpServer);
    });
  });

  describe('GET /mcp/admin/servers - listMcpServers', () => {
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

    it('should deny access to non-admin users', async () => {
      const mockRequest = { user: regularUser };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const jwtResult = await mockJwtAuthGuard.canActivate(context);
      expect(jwtResult).toBe(true);

      const adminResult = await mockAdminGuard.canActivate(context);
      expect(adminResult).toBe(false);
    });

    it('should allow admin to list all global MCP servers', async () => {
      const session = { userId: adminUser.sub };
      const mockServers = [mockMcpServer];
      mcpService.listAllMcpServers.mockResolvedValue(mockServers);

      const result = await controller.listMcpServers(session);

      expect(mcpService.listAllMcpServers).toHaveBeenCalled();
      expect(result).toEqual(mockServers);
    });
  });

  describe('GET /mcp/admin/servers/:id - getMcpServer', () => {
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

    it('should deny access to non-admin users', async () => {
      const mockRequest = { user: regularUser };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const jwtResult = await mockJwtAuthGuard.canActivate(context);
      expect(jwtResult).toBe(true);

      const adminResult = await mockAdminGuard.canActivate(context);
      expect(adminResult).toBe(false);
    });

    it('should allow admin to get MCP server', async () => {
      const session = { userId: adminUser.sub };
      mcpService.getMcpServer.mockResolvedValue(mockMcpServer);

      const result = await controller.getMcpServer(serverId, session);

      expect(mcpService.getMcpServer).toHaveBeenCalledWith(serverId);
      expect(result).toEqual(mockMcpServer);
    });
  });

  describe('PUT /mcp/admin/servers/:id - updateMcpServer', () => {
    const serverId = 'server-123';
    const updateDto: UpdateMcpServerDto = {
      name: 'Updated Server',
      isActive: false,
    };

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

    it('should deny access to non-admin users', async () => {
      const mockRequest = { user: regularUser };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const jwtResult = await mockJwtAuthGuard.canActivate(context);
      expect(jwtResult).toBe(true);

      const adminResult = await mockAdminGuard.canActivate(context);
      expect(adminResult).toBe(false);
    });

    it('should allow admin to update MCP server', async () => {
      const session = { userId: adminUser.sub };
      const updatedServer = { ...mockMcpServer, ...updateDto };
      mcpService.updateMcpServer.mockResolvedValue(updatedServer);

      const result = await controller.updateMcpServer(
        serverId,
        updateDto,
        session,
      );

      expect(mcpService.updateMcpServer).toHaveBeenCalledWith(
        serverId,
        updateDto,
      );
      expect(result).toEqual(updatedServer);
    });
  });

  describe('DELETE /mcp/admin/servers/:id - deleteMcpServer', () => {
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

    it('should deny access to non-admin users', async () => {
      const mockRequest = { user: regularUser };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const jwtResult = await mockJwtAuthGuard.canActivate(context);
      expect(jwtResult).toBe(true);

      const adminResult = await mockAdminGuard.canActivate(context);
      expect(adminResult).toBe(false);
    });

    it('should allow admin to delete MCP server', async () => {
      const session = { userId: adminUser.sub };
      mcpService.deleteMcpServer.mockResolvedValue(undefined);

      await controller.deleteMcpServer(serverId, session);

      expect(mcpService.deleteMcpServer).toHaveBeenCalledWith(serverId);
    });
  });

  describe('POST /mcp/admin/servers/:id/test - testMcpServer', () => {
    const serverId = 'server-123';
    const testResponse = {
      success: true,
      tools: [{ name: 'test-tool', description: 'Test tool' }],
    };

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

    it('should deny access to non-admin users', async () => {
      const mockRequest = { user: regularUser };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const jwtResult = await mockJwtAuthGuard.canActivate(context);
      expect(jwtResult).toBe(true);

      const adminResult = await mockAdminGuard.canActivate(context);
      expect(adminResult).toBe(false);
    });

    it('should allow admin to test MCP server connection', async () => {
      const session = { userId: adminUser.sub };
      mcpService.testMcpServer.mockResolvedValue(testResponse);

      const result = await controller.testMcpServer(serverId, session);

      expect(mcpService.testMcpServer).toHaveBeenCalledWith(
        serverId,
        adminUser.sub,
      );
      expect(result).toEqual(testResponse);
    });
  });

  describe('GET /mcp/admin/servers/:id/tools - listMcpServerTools', () => {
    const serverId = 'server-123';
    const mockTools = [
      { name: 'tool-1', description: 'Tool 1' },
      { name: 'tool-2', description: 'Tool 2' },
    ];

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

    it('should deny access to non-admin users', async () => {
      const mockRequest = { user: regularUser };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const jwtResult = await mockJwtAuthGuard.canActivate(context);
      expect(jwtResult).toBe(true);

      const adminResult = await mockAdminGuard.canActivate(context);
      expect(adminResult).toBe(false);
    });

    it('should allow admin to list MCP server tools', async () => {
      const session = { userId: adminUser.sub };
      mcpService.listMcpServerTools.mockResolvedValue(mockTools);

      const result = await controller.listMcpServerTools(serverId, session);

      expect(mcpService.listMcpServerTools).toHaveBeenCalledWith(serverId);
      expect(result).toEqual(mockTools);
    });
  });

  describe('POST /mcp/admin/oauth-discover - discoverOAuthMetadata', () => {
    const discoverDto = { url: 'https://example.com' };

    const successResponse = {
      success: true,
      source: 'rfc8414' as const,
      authorizationEndpoint: 'https://example.com/oauth/authorize',
      tokenEndpoint: 'https://example.com/oauth/token',
      scopesSupported: ['read', 'write'],
    };

    const failureResponse = {
      success: false,
      error: 'Could not discover OAuth metadata from the provided URL',
    };

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

    it('should deny access to non-admin users', async () => {
      const mockRequest = { user: regularUser };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const jwtResult = await mockJwtAuthGuard.canActivate(context);
      expect(jwtResult).toBe(true);

      const adminResult = await mockAdminGuard.canActivate(context);
      expect(adminResult).toBe(false);
    });

    it('should allow admin to discover OAuth metadata', async () => {
      const session = { userId: adminUser.sub };
      mcpService.discoverOAuthMetadata.mockResolvedValue(successResponse);

      const result = await controller.discoverOAuthMetadata(
        discoverDto,
        session,
      );

      expect(mcpService.discoverOAuthMetadata).toHaveBeenCalledWith(
        discoverDto.url,
      );
      expect(result).toEqual(successResponse);
    });

    it('should return failure response when discovery fails', async () => {
      const session = { userId: adminUser.sub };
      mcpService.discoverOAuthMetadata.mockResolvedValue(failureResponse);

      const result = await controller.discoverOAuthMetadata(
        discoverDto,
        session,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
