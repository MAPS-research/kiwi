import { Test, TestingModule } from '@nestjs/testing';
import { McpController } from './mcp.controller';
import { McpService } from './mcp-server-impl.service';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('McpController', () => {
  let controller: McpController;
  let mcpService: jest.Mocked<McpService>;

  const mockJwtAuthGuard = {
    canActivate: jest.fn((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      // Simulate guard behavior - check for authorization header
      return !!request.user;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpController],
      providers: [
        {
          provide: McpService,
          useValue: {
            listResources: jest.fn(),
            getResource: jest.fn(),
            listTools: jest.fn(),
            callTool: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<McpController>(McpController);
    mcpService = module.get(McpService);
  });

  describe('getCapabilities', () => {
    it('should return server capabilities without authentication', () => {
      const result = controller.getCapabilities();

      expect(result.protocol).toBe('mcp');
      expect(result.version).toBe('0.1.0');
      expect(result.serverInfo.name).toBe('kiwi-mcp-server');
      expect(result.serverInfo.version).toBe('1.0.0');
      expect(result.capabilities.resources).toBeDefined();
      expect(result.capabilities.tools).toBeDefined();
      expect(result.capabilities.prompts).toBeDefined();
    });
  });

  describe('handleRpcRequest', () => {
    describe('authentication', () => {
      it('should return error when user is not authenticated', async () => {
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'resources/list',
        };

        const result = await controller.handleRpcRequest(request as any, {});

        expect(result).toEqual({
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32600,
            message: 'Invalid request - user not authenticated',
          },
        });
      });

      it('should process request when user is authenticated', async () => {
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'resources/list',
        };

        mcpService.listResources.mockResolvedValue({
          resources: [],
        });

        const result = await controller.handleRpcRequest(request as any, {
          user: { sub: 'user-123' },
        });

        expect(result).toEqual({
          jsonrpc: '2.0',
          id: 1,
          result: { resources: [] },
        });
      });
    });

    describe('initialize method', () => {
      it('should return initialization response', async () => {
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            clientInfo: {
              name: 'test-client',
              version: '1.0.0',
            },
          },
        };

        const result = await controller.handleRpcRequest(request as any, {
          user: { sub: 'user-123' },
        });

        expect(result).toEqual({
          jsonrpc: '2.0',
          id: 1,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              resources: {
                subscribe: false,
                listChanged: false,
              },
              tools: {},
              prompts: {},
            },
            serverInfo: {
              name: 'kiwi-mcp-server',
              version: '1.0.0',
            },
          },
        });
      });
    });

    describe('resources/list method', () => {
      it('should call mcpService.listResources with userId', async () => {
        const userId = 'user-123';
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'resources/list',
        };

        mcpService.listResources.mockResolvedValue({
          resources: [{ uri: 'kiwi://classes', name: 'Classes' }],
        });

        const result = await controller.handleRpcRequest(request as any, {
          user: { sub: userId },
        });

        expect(mcpService.listResources).toHaveBeenCalledWith(userId);
        expect(result).toEqual({
          jsonrpc: '2.0',
          id: 1,
          result: {
            resources: [{ uri: 'kiwi://classes', name: 'Classes' }],
          },
        });
      });
    });

    describe('resources/read method', () => {
      it('should call mcpService.getResource with uri and userId', async () => {
        const userId = 'user-123';
        const uri = 'kiwi://analytics/user/user-123';
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'resources/read',
          params: { uri },
        };

        mcpService.getResource.mockResolvedValue({
          contents: [{ uri, text: '{}', mimeType: 'application/json' }],
        });

        const result = await controller.handleRpcRequest(request as any, {
          user: { sub: userId },
        });

        expect(mcpService.getResource).toHaveBeenCalledWith(uri, userId);
        expect(result).toEqual({
          jsonrpc: '2.0',
          id: 1,
          result: {
            contents: [{ uri, text: '{}', mimeType: 'application/json' }],
          },
        });
      });
    });

    describe('tools/list method', () => {
      it('should call mcpService.listTools', async () => {
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        };

        mcpService.listTools.mockResolvedValue({
          tools: [
            {
              name: 'add_users_to_class',
              description: 'Enroll users into a class',
              inputSchema: {
                type: 'object',
                properties: {},
                required: [],
              },
            },
          ],
        });

        const result = await controller.handleRpcRequest(request as any, {
          user: { sub: 'user-123' },
        });

        expect(mcpService.listTools).toHaveBeenCalled();
        expect(result).toEqual({
          jsonrpc: '2.0',
          id: 1,
          result: {
            tools: [
              {
                name: 'add_users_to_class',
                description: 'Enroll users into a class',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  required: [],
                },
              },
            ],
          },
        });
      });
    });

    describe('tools/call method', () => {
      it('should call mcpService.callTool with name, arguments, and userId', async () => {
        const userId = 'user-123';
        const toolName = 'get_authenticated_user';
        const toolArgs = {};
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: toolArgs,
          },
        };

        mcpService.callTool.mockResolvedValue({
          content: [{ type: 'text', text: '{"id": "user-123"}' }],
        });

        const result = await controller.handleRpcRequest(request as any, {
          user: { sub: userId },
        });

        expect(mcpService.callTool).toHaveBeenCalledWith(
          toolName,
          toolArgs,
          userId,
        );
        expect(result).toEqual({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{ type: 'text', text: '{"id": "user-123"}' }],
          },
        });
      });

      it('should use empty object for arguments when not provided', async () => {
        const userId = 'user-123';
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'get_authenticated_user',
          },
        };

        mcpService.callTool.mockResolvedValue({
          content: [{ type: 'text', text: '{}' }],
        });

        await controller.handleRpcRequest(request as any, {
          user: { sub: userId },
        });

        expect(mcpService.callTool).toHaveBeenCalledWith(
          'get_authenticated_user',
          {},
          userId,
        );
      });
    });

    describe('error handling', () => {
      it('should return error for unknown method', async () => {
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'unknown/method',
        };

        const result = await controller.handleRpcRequest(request as any, {
          user: { sub: 'user-123' },
        });

        expect(result).toEqual({
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32603,
            message: 'Unknown method: unknown/method',
          },
        });
      });

      it('should return error when service throws', async () => {
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'resources/list',
        };

        mcpService.listResources.mockRejectedValue(
          new Error('Database connection failed'),
        );

        const result = await controller.handleRpcRequest(request as any, {
          user: { sub: 'user-123' },
        });

        expect(result).toEqual({
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32603,
            message: 'Database connection failed',
          },
        });
      });

      it('should return generic error message when error has no message', async () => {
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        };

        mcpService.listTools.mockRejectedValue({});

        const result = await controller.handleRpcRequest(request as any, {
          user: { sub: 'user-123' },
        });

        expect(result).toEqual({
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32603,
            message: 'Internal error',
          },
        });
      });
    });
  });

  describe('handleNotification', () => {
    it('should handle initialized notification', async () => {
      const notification = {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      };

      const result = await controller.handleNotification(notification);

      expect(result).toEqual({ status: 'ok' });
    });

    it('should handle unknown notifications gracefully', async () => {
      const notification = {
        jsonrpc: '2.0',
        method: 'notifications/unknown',
      };

      const result = await controller.handleNotification(notification);

      expect(result).toEqual({ status: 'ok' });
    });
  });
});
