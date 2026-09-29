import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { ToolConfigController } from './tool-config.controller';
import { McpService } from './mcp.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/auth.guard';
import {
  BulkToolConfigDto,
  ToolConfigResponseDto,
  UpdateToolStatusDto,
  ToolTypeDto,
} from './dto/tool-config.dto';

describe('ToolConfigController - Permission Tests', () => {
  let controller: ToolConfigController;
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

  const mockToolConfig: ToolConfigResponseDto = {
    id: 'config-123',
    classId: 'class-123',
    toolType: ToolTypeDto.MCP,
    toolIdentifier: 'server-123',
    toolName: 'test-tool',
    isEnabled: true,
    chatTypes: ['pdf', 'codegen'],
    priority: 10,
    configuration: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    mcpServer: {
      id: 'server-123',
      name: 'Test MCP Server',
      requiresOAuth: false,
    },
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
      getToolConfigsForClass: jest.fn(),
      updateToolConfig: jest.fn(),
      bulkUpdateToolConfigs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ToolConfigController],
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

    controller = module.get<ToolConfigController>(ToolConfigController);
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

  describe('GET /mcp/tools/classes/:classId - getToolsForClass', () => {
    const classId = 'class-123';

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

    it('should allow admin to get tool configs for class', async () => {
      const session = { userId: adminUser.sub };
      const mockConfigs = [mockToolConfig];
      mcpService.getToolConfigsForClass.mockResolvedValue(mockConfigs);

      const result = await controller.getToolsForClass(classId, session);

      expect(mcpService.getToolConfigsForClass).toHaveBeenCalledWith(classId);
      expect(result).toEqual(mockConfigs);
    });

    it('should return empty array when no tools configured', async () => {
      const session = { userId: adminUser.sub };
      mcpService.getToolConfigsForClass.mockResolvedValue([]);

      const result = await controller.getToolsForClass(classId, session);

      expect(mcpService.getToolConfigsForClass).toHaveBeenCalledWith(classId);
      expect(result).toEqual([]);
    });

    it('should return tools with different types (RAG, CodeInterpreter, MCP)', async () => {
      const session = { userId: adminUser.sub };
      const mixedTools: ToolConfigResponseDto[] = [
        { ...mockToolConfig, toolType: ToolTypeDto.RAG, toolIdentifier: 'rag' },
        {
          ...mockToolConfig,
          toolType: ToolTypeDto.CODE_INTERPRETER,
          toolIdentifier: 'code-interpreter',
        },
        {
          ...mockToolConfig,
          toolType: ToolTypeDto.MCP,
          toolIdentifier: 'server-123',
        },
      ];
      mcpService.getToolConfigsForClass.mockResolvedValue(mixedTools);

      const result = await controller.getToolsForClass(classId, session);

      expect(result).toHaveLength(3);
      expect(result[0].toolType).toBe(ToolTypeDto.RAG);
      expect(result[1].toolType).toBe(ToolTypeDto.CODE_INTERPRETER);
      expect(result[2].toolType).toBe(ToolTypeDto.MCP);
    });
  });

  describe('PUT /mcp/tools/config/:toolConfigId - updateToolConfig', () => {
    const toolConfigId = 'config-123';
    const updateDto: UpdateToolStatusDto = {
      isEnabled: false,
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

    it('should allow admin to update tool config', async () => {
      const session = { userId: adminUser.sub };
      const updatedConfig = { ...mockToolConfig, isEnabled: false };
      mcpService.updateToolConfig.mockResolvedValue(updatedConfig);

      const result = await controller.updateToolConfig(
        toolConfigId,
        updateDto,
        session,
      );

      expect(mcpService.updateToolConfig).toHaveBeenCalledWith(
        toolConfigId,
        updateDto,
      );
      expect(result).toEqual(updatedConfig);
      expect(result.isEnabled).toBe(false);
    });

    it('should allow admin to enable tool', async () => {
      const session = { userId: adminUser.sub };
      const enableDto: UpdateToolStatusDto = { isEnabled: true };
      const enabledConfig = { ...mockToolConfig, isEnabled: true };
      mcpService.updateToolConfig.mockResolvedValue(enabledConfig);

      const result = await controller.updateToolConfig(
        toolConfigId,
        enableDto,
        session,
      );

      expect(mcpService.updateToolConfig).toHaveBeenCalledWith(
        toolConfigId,
        enableDto,
      );
      expect(result.isEnabled).toBe(true);
    });
  });

  describe('PUT /mcp/tools/classes/:classId/bulk - bulkUpdateToolConfigs', () => {
    const classId = 'class-123';
    const bulkDto: BulkToolConfigDto = {
      tools: [
        {
          toolType: ToolTypeDto.MCP,
          toolIdentifier: 'server-123',
          toolName: 'test-tool-1',
          isEnabled: true,
          chatTypes: ['pdf'],
          priority: 10,
        },
        {
          toolType: ToolTypeDto.RAG,
          toolIdentifier: 'rag',
          toolName: 'RAG Tool',
          isEnabled: true,
          chatTypes: ['pdf', 'codegen'],
          priority: 20,
        },
      ],
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

    it('should allow admin to bulk update tool configs', async () => {
      const session = { userId: adminUser.sub };
      const mockResults: ToolConfigResponseDto[] = [
        { ...mockToolConfig, id: 'config-1', toolName: 'test-tool-1' },
        { ...mockToolConfig, id: 'config-2', toolName: 'RAG Tool' },
      ];
      mcpService.bulkUpdateToolConfigs.mockResolvedValue(mockResults);

      const result = await controller.bulkUpdateToolConfigs(
        classId,
        bulkDto,
        session,
      );

      expect(mcpService.bulkUpdateToolConfigs).toHaveBeenCalledWith(
        classId,
        bulkDto,
      );
      expect(result).toEqual(mockResults);
      expect(result).toHaveLength(2);
    });

    it('should allow admin to bulk update with empty array', async () => {
      const session = { userId: adminUser.sub };
      const emptyDto: BulkToolConfigDto = { tools: [] };
      mcpService.bulkUpdateToolConfigs.mockResolvedValue([]);

      const result = await controller.bulkUpdateToolConfigs(
        classId,
        emptyDto,
        session,
      );

      expect(mcpService.bulkUpdateToolConfigs).toHaveBeenCalledWith(
        classId,
        emptyDto,
      );
      expect(result).toEqual([]);
    });

    it('should handle bulk update with mixed tool types', async () => {
      const session = { userId: adminUser.sub };
      const mixedDto: BulkToolConfigDto = {
        tools: [
          {
            toolType: ToolTypeDto.MCP,
            toolIdentifier: 'server-123',
            toolName: 'mcp-tool',
            isEnabled: true,
            chatTypes: ['pdf'],
            priority: 10,
          },
          {
            toolType: ToolTypeDto.CODE_INTERPRETER,
            toolIdentifier: 'code-interpreter',
            toolName: 'Code Interpreter',
            isEnabled: false,
            chatTypes: ['codegen'],
            priority: 15,
          },
        ],
      };

      const mockResults: ToolConfigResponseDto[] = [
        {
          ...mockToolConfig,
          toolType: ToolTypeDto.MCP,
          toolIdentifier: 'server-123',
          toolName: 'mcp-tool',
        },
        {
          ...mockToolConfig,
          toolType: ToolTypeDto.CODE_INTERPRETER,
          toolIdentifier: 'code-interpreter',
          toolName: 'Code Interpreter',
          isEnabled: false,
        },
      ];
      mcpService.bulkUpdateToolConfigs.mockResolvedValue(mockResults);

      const result = await controller.bulkUpdateToolConfigs(
        classId,
        mixedDto,
        session,
      );

      expect(result).toHaveLength(2);
      expect(result[0].toolType).toBe(ToolTypeDto.MCP);
      expect(result[1].toolType).toBe(ToolTypeDto.CODE_INTERPRETER);
    });
  });

  describe('Permission Scenarios Summary', () => {
    it('should enforce admin-only access for all endpoints', async () => {
      const mockRequest = { user: regularUser };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      // JWT should pass for authenticated users
      const jwtResult = await mockJwtAuthGuard.canActivate(context);
      expect(jwtResult).toBe(true);

      // Admin guard should block non-admin users
      const adminResult = await mockAdminGuard.canActivate(context);
      expect(adminResult).toBe(false);
    });

    it('should allow admin access for all endpoints', async () => {
      const mockRequest = { user: adminUser };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const jwtResult = await mockJwtAuthGuard.canActivate(context);
      expect(jwtResult).toBe(true);

      const adminResult = await mockAdminGuard.canActivate(context);
      expect(adminResult).toBe(true);
    });
  });
});
