/**
 * ToolExecutor Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeTool, validateToolParams, createToolExecutor } from '../ToolExecutor';
import type { KiwiToolDefinition, ToolExecutionContext, ToolInvocation } from '../../types';
import { AppRegistry } from '../../registry/AppRegistry';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock context
const createMockContext = (overrides: Partial<ToolExecutionContext> = {}): ToolExecutionContext => ({
  userId: 'test-user',
  appId: 'test-app',
  authToken: 'test-token',
  ...overrides,
});

// Mock tool
const createMockTool = (overrides: Partial<KiwiToolDefinition> = {}): KiwiToolDefinition => ({
  name: 'test_tool',
  description: 'Test tool',
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'string' },
    },
  },
  execution: {
    type: 'local',
    handler: async () => ({ success: true, data: 'test result' }),
  },
  ...overrides,
});

describe('ToolExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    AppRegistry.resetInstance();
  });

  afterEach(() => {
    AppRegistry.resetInstance();
  });

  describe('validateToolParams', () => {
    const toolWithRequiredParams = createMockTool({
      inputSchema: {
        type: 'object',
        properties: {
          required_param: { type: 'string' },
          optional_param: { type: 'number' },
        },
        required: ['required_param'],
      },
    });

    it('should validate correct params', () => {
      const result = validateToolParams(toolWithRequiredParams, { required_param: 'test' });
      expect(result.valid).toBe(true);
    });

    it('should fail on missing required params', () => {
      const result = validateToolParams(toolWithRequiredParams, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: required_param');
    });

    it('should allow optional params', () => {
      const result = validateToolParams(toolWithRequiredParams, {
        required_param: 'test',
        optional_param: 42,
      });
      expect(result.valid).toBe(true);
    });

    it('should handle tools with no required params', () => {
      const toolNoRequired = createMockTool({
        inputSchema: {
          type: 'object',
          properties: {
            optional: { type: 'string' },
          },
        },
      });

      const result = validateToolParams(toolNoRequired, {});
      expect(result.valid).toBe(true);
    });
  });

  describe('executeTool', () => {
    describe('Tool Not Found', () => {
      it('should return error when tool not found', async () => {
        const registry = AppRegistry.getInstance();
        registry.register({
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          tools: [],
          widgets: [],
          permissions: [],
        });

        const invocation: ToolInvocation = {
          toolName: 'nonexistent_tool',
          params: {},
          context: createMockContext(),
        };

        const result = await executeTool(invocation);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });

    describe('Local Execution', () => {
      it('should execute local tool with handler', async () => {
        const handler = vi.fn().mockResolvedValue({ success: true, data: 'result' });
        const tool = createMockTool({
          name: 'local_tool',
          execution: {
            type: 'local',
            handler,
          },
        });

        // Register app with tool
        const registry = AppRegistry.getInstance();
        registry.register({
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          tools: [tool],
          widgets: [],
          permissions: [],
        });

        const invocation: ToolInvocation = {
          toolName: 'local_tool',
          params: { input: 'test' },
          context: createMockContext(),
        };

        const result = await executeTool(invocation);

        expect(handler).toHaveBeenCalledWith({ input: 'test' }, expect.any(Object));
        expect(result.success).toBe(true);
        expect(result.data).toBe('result');
      });

      it('should fail gracefully when no handler provided', async () => {
        const tool = createMockTool({
          name: 'local_tool',
          execution: {
            type: 'local',
            // No handler
          },
        });

        const registry = AppRegistry.getInstance();
        registry.register({
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          tools: [tool],
          widgets: [],
          permissions: [],
        });

        const invocation: ToolInvocation = {
          toolName: 'local_tool',
          params: {},
          context: createMockContext(),
        };

        const result = await executeTool(invocation);

        expect(result.success).toBe(false);
        expect(result.error).toContain('handler');
      });

      it('should handle handler errors', async () => {
        const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
        const tool = createMockTool({
          name: 'local_tool',
          execution: {
            type: 'local',
            handler,
          },
        });

        const registry = AppRegistry.getInstance();
        registry.register({
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          tools: [tool],
          widgets: [],
          permissions: [],
        });

        const invocation: ToolInvocation = {
          toolName: 'local_tool',
          params: {},
          context: createMockContext(),
        };

        const result = await executeTool(invocation);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Handler error');
      });
    });

    describe('Backend Execution', () => {
      it('should call backend endpoint', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: 'backend result' }),
        });

        const tool = createMockTool({
          name: 'backend_tool',
          execution: {
            type: 'backend',
            endpoint: '/api/test',
          },
        });

        const registry = AppRegistry.getInstance();
        registry.register({
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          tools: [tool],
          widgets: [],
          permissions: [],
        });

        const invocation: ToolInvocation = {
          toolName: 'backend_tool',
          params: { param: 'value' },
          context: createMockContext({ authToken: 'test-token' }),
        };

        const result = await executeTool(invocation);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/test'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          })
        );
        expect(result.success).toBe(true);
      });

      it('should fail when no endpoint provided', async () => {
        const tool = createMockTool({
          name: 'backend_tool',
          execution: {
            type: 'backend',
            // No endpoint
          },
        });

        const registry = AppRegistry.getInstance();
        registry.register({
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          tools: [tool],
          widgets: [],
          permissions: [],
        });

        const invocation: ToolInvocation = {
          toolName: 'backend_tool',
          params: {},
          context: createMockContext(),
        };

        const result = await executeTool(invocation);

        expect(result.success).toBe(false);
        expect(result.error).toContain('endpoint');
      });

      it('should handle fetch errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const tool = createMockTool({
          name: 'backend_tool',
          execution: {
            type: 'backend',
            endpoint: '/api/test',
          },
        });

        const registry = AppRegistry.getInstance();
        registry.register({
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          tools: [tool],
          widgets: [],
          permissions: [],
        });

        const invocation: ToolInvocation = {
          toolName: 'backend_tool',
          params: {},
          context: createMockContext(),
        };

        const result = await executeTool(invocation);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
      });

      it('should handle non-OK responses', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve('Invalid params'),
        });

        const tool = createMockTool({
          name: 'backend_tool',
          execution: {
            type: 'backend',
            endpoint: '/api/test',
          },
        });

        const registry = AppRegistry.getInstance();
        registry.register({
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          tools: [tool],
          widgets: [],
          permissions: [],
        });

        const invocation: ToolInvocation = {
          toolName: 'backend_tool',
          params: {},
          context: createMockContext(),
        };

        const result = await executeTool(invocation);

        expect(result.success).toBe(false);
      });
    });

    describe('Streaming Execution', () => {
      it('should fail when no onStream callback provided', async () => {
        const tool = createMockTool({
          name: 'streaming_tool',
          execution: {
            type: 'streaming',
            endpoint: '/api/stream',
          },
        });

        const registry = AppRegistry.getInstance();
        registry.register({
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          tools: [tool],
          widgets: [],
          permissions: [],
        });

        const invocation: ToolInvocation = {
          toolName: 'streaming_tool',
          params: {},
          context: createMockContext(),
          // No onStream callback
        };

        const result = await executeTool(invocation);

        expect(result.success).toBe(false);
        expect(result.error).toContain('onStream');
      });

      it('should fail when no endpoint provided', async () => {
        const tool = createMockTool({
          name: 'streaming_tool',
          execution: {
            type: 'streaming',
            // No endpoint
          },
        });

        const registry = AppRegistry.getInstance();
        registry.register({
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          tools: [tool],
          widgets: [],
          permissions: [],
        });

        const invocation: ToolInvocation = {
          toolName: 'streaming_tool',
          params: {},
          context: createMockContext(),
          onStream: vi.fn(),
        };

        const result = await executeTool(invocation);

        expect(result.success).toBe(false);
        expect(result.error).toContain('endpoint');
      });
    });
  });

  describe('createToolExecutor', () => {
    it('should create an executor object with execute and executeStreaming', () => {
      const context = createMockContext();
      const executor = createToolExecutor(context);

      expect(typeof executor.execute).toBe('function');
      expect(typeof executor.executeStreaming).toBe('function');
    });

    it('should execute tools through the executor', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true, data: 'result' });
      const tool = createMockTool({
        name: 'test_tool',
        execution: {
          type: 'local',
          handler,
        },
      });

      const registry = AppRegistry.getInstance();
      registry.register({
        id: 'test-app',
        name: 'Test App',
        version: '1.0.0',
        tools: [tool],
        widgets: [],
        permissions: [],
      });

      const executor = createToolExecutor(createMockContext());
      const result = await executor.execute('test_tool', { input: 'test' });

      expect(result.success).toBe(true);
      expect(result.data).toBe('result');
    });
  });
});
