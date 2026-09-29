/**
 * KiwiAppBridge Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createKiwiAppBridge,
  installBridge,
  uninstallBridge,
  isBridgeInstalled,
  getBridge,
} from '../KiwiAppBridge.ts';
import type { KiwiAppBridge, BridgeConfig } from '../../types/index.ts';

describe('KiwiAppBridge', () => {
  // Create default config with all required callbacks
  const createDefaultConfig = (overrides: Partial<BridgeConfig> = {}): BridgeConfig => ({
    appId: 'test-app',
    widgetId: 'test-widget',
    userId: 'test-user',
    username: 'testuser',
    onStateChange: vi.fn(),
    onToolCall: vi.fn().mockResolvedValue({ success: true, data: 'test result' }),
    onToolCallStreaming: vi.fn().mockResolvedValue({ success: true, data: 'streamed result' }),
    onMessage: vi.fn(),
    onDisplayModeRequest: vi.fn(),
    onClose: vi.fn(),
    onOpenExternal: vi.fn(),
    ...overrides,
    theme: overrides.theme ?? 'light',
  });

  beforeEach(() => {
    // Clean up before each test
    uninstallBridge();
  });

  afterEach(() => {
    // Clean up after each test
    uninstallBridge();
  });

  describe('createKiwiAppBridge', () => {
    it('should create a bridge with default values', () => {
      const config = createDefaultConfig();
      const bridge = createKiwiAppBridge(config);

      expect(bridge.appId).toBe('test-app');
      expect(bridge.widgetId).toBe('test-widget');
      expect(bridge.user).toEqual({ id: 'test-user', username: 'testuser' });
      expect(bridge.displayMode).toBe('expanded');
    });

    it('should accept initial state', () => {
      const config = createDefaultConfig({ initialState: { count: 5 } });
      const bridge = createKiwiAppBridge(config);

      expect(bridge.getWidgetState()).toEqual({ count: 5 });
    });

    it('should accept tool input/output', () => {
      const config = createDefaultConfig({
        toolInput: { param: 'value' },
        toolOutput: { result: 'data' },
      });
      const bridge = createKiwiAppBridge(config);

      expect(bridge.toolInput).toEqual({ param: 'value' });
      expect(bridge.toolOutput).toEqual({ result: 'data' });
    });

    it('should return null user when no userId provided', () => {
      const config = createDefaultConfig({ userId: undefined });
      const bridge = createKiwiAppBridge(config);

      expect(bridge.user).toBeNull();
    });
  });

  describe('Widget State Management', () => {
    it('should set widget state with object', () => {
      const config = createDefaultConfig();
      const bridge = createKiwiAppBridge(config);

      bridge.setWidgetState({ count: 10, name: 'test' });

      expect(bridge.getWidgetState()).toEqual({ count: 10, name: 'test' });
    });

    it('should set widget state with function', () => {
      const config = createDefaultConfig({ initialState: { count: 5 } });
      const bridge = createKiwiAppBridge(config);

      bridge.setWidgetState((prev) => ({ ...prev, count: (prev.count as number) + 1 }));

      expect(bridge.getWidgetState().count).toBe(6);
    });

    it('should merge widget state', () => {
      const config = createDefaultConfig({ initialState: { existing: 'value' } });
      const bridge = createKiwiAppBridge(config);

      bridge.setWidgetState({ new: 'state' });

      expect(bridge.getWidgetState()).toEqual({ existing: 'value', new: 'state' });
    });

    it('should call onStateChange callback', () => {
      const onStateChange = vi.fn();
      const config = createDefaultConfig({ onStateChange });
      const bridge = createKiwiAppBridge(config);

      bridge.setWidgetState({ test: 'value' });

      expect(onStateChange).toHaveBeenCalled();
    });
  });

  describe('Display Mode', () => {
    it('should request display mode change', () => {
      const onDisplayModeRequest = vi.fn();
      const config = createDefaultConfig({ onDisplayModeRequest });
      const bridge = createKiwiAppBridge(config);

      bridge.requestDisplayMode('compact');

      expect(onDisplayModeRequest).toHaveBeenCalledWith('compact');
    });

    it('should update display mode', () => {
      const config = createDefaultConfig();
      const bridge = createKiwiAppBridge(config);

      bridge.requestDisplayMode('compact');

      expect(bridge.displayMode).toBe('compact');
    });
  });

  describe('Messaging', () => {
    it('should send messages', () => {
      const onMessage = vi.fn();
      const config = createDefaultConfig({ onMessage });
      const bridge = createKiwiAppBridge(config);

      bridge.sendMessage('Hello AI');

      expect(onMessage).toHaveBeenCalledWith('Hello AI');
    });
  });

  describe('Close', () => {
    it('should call close callback', () => {
      const onClose = vi.fn();
      const config = createDefaultConfig({ onClose });
      const bridge = createKiwiAppBridge(config);

      bridge.requestClose();

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Event System', () => {
    it('should emit and listen to events via subscribe', () => {
      const config = createDefaultConfig();
      const bridge = createKiwiAppBridge(config);
      const handler = vi.fn();

      bridge.subscribe(handler);
      bridge.setWidgetState({ state: 'new' });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'state_changed',
          payload: expect.any(Object),
        })
      );
    });

    it('should listen to specific events via on', () => {
      const config = createDefaultConfig();
      const bridge = createKiwiAppBridge(config);
      const handler = vi.fn();

      bridge.on('state_changed', handler);
      bridge.setWidgetState({ state: 'new' });

      expect(handler).toHaveBeenCalled();
    });

    it('should unsubscribe correctly', () => {
      const config = createDefaultConfig();
      const bridge = createKiwiAppBridge(config);
      const handler = vi.fn();

      const unsubscribe = bridge.subscribe(handler);
      unsubscribe();

      // Reset mock to clear initial subscribe calls
      handler.mockClear();

      bridge.setWidgetState({ state: 'new' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove event listeners via on return value', () => {
      const config = createDefaultConfig();
      const bridge = createKiwiAppBridge(config);
      const handler = vi.fn();

      const off = bridge.on('state_changed', handler);
      off();

      bridge.setWidgetState({ state: 'new' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Bridge Installation', () => {
    it('should install bridge on window', () => {
      const config = createDefaultConfig();
      const bridge = createKiwiAppBridge(config);
      installBridge(bridge);

      expect(isBridgeInstalled()).toBe(true);
      expect((window as any).kiwiApp).toBe(bridge);
    });

    it('should get installed bridge', () => {
      const config = createDefaultConfig();
      const bridge = createKiwiAppBridge(config);
      installBridge(bridge);

      const retrieved = getBridge();

      expect(retrieved).toBe(bridge);
    });

    it('should uninstall bridge', () => {
      const config = createDefaultConfig();
      const bridge = createKiwiAppBridge(config);
      installBridge(bridge);
      uninstallBridge();

      expect(isBridgeInstalled()).toBe(false);
      expect((window as any).kiwiApp).toBeUndefined();
    });

    it('should return undefined when no bridge installed', () => {
      const bridge = getBridge();

      expect(bridge).toBeUndefined();
    });
  });

  describe('Tool Calls', () => {
    it('should call tools via bridge', async () => {
      const onToolCall = vi.fn().mockResolvedValue({ success: true, data: 'test result' });
      const config = createDefaultConfig({ onToolCall });
      const bridge = createKiwiAppBridge(config);

      const result = await bridge.callTool('test_tool', { input: 'test' });

      expect(onToolCall).toHaveBeenCalledWith('test_tool', { input: 'test' });
      expect(result.success).toBe(true);
      expect(result.data).toBe('test result');
    });

    it('should handle tool call errors', async () => {
      const onToolCall = vi.fn().mockRejectedValue(new Error('Tool failed'));
      const config = createDefaultConfig({ onToolCall });
      const bridge = createKiwiAppBridge(config);

      const result = await bridge.callTool('failing_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool failed');
    });

    it('should call streaming tools', async () => {
      const onStream = vi.fn();
      const onToolCallStreaming = vi.fn().mockResolvedValue({ success: true, data: 'streamed' });
      const config = createDefaultConfig({ onToolCallStreaming });
      const bridge = createKiwiAppBridge(config);

      const result = await bridge.callToolStreaming('streaming_tool', { prompt: 'test' }, onStream);

      expect(onToolCallStreaming).toHaveBeenCalledWith('streaming_tool', { prompt: 'test' }, onStream);
      expect(result.success).toBe(true);
    });

    it('should update toolOutput after successful call', async () => {
      const onToolCall = vi.fn().mockResolvedValue({ success: true, data: 'new output' });
      const config = createDefaultConfig({ onToolCall });
      const bridge = createKiwiAppBridge(config);

      await bridge.callTool('test_tool', {});

      expect(bridge.toolOutput).toBe('new output');
    });
  });

  describe('Context', () => {
    it('should include class ID in context', () => {
      const config = createDefaultConfig({ classId: 'class-123' });
      const bridge = createKiwiAppBridge(config);

      expect(bridge.classId).toBe('class-123');
    });

    it('should have undefined class ID when not provided', () => {
      const config = createDefaultConfig();
      const bridge = createKiwiAppBridge(config);

      expect(bridge.classId).toBeUndefined();
    });

    it('should get locale', () => {
      const config = createDefaultConfig({ locale: 'fr-FR' });
      const bridge = createKiwiAppBridge(config);

      expect(bridge.locale).toBe('fr-FR');
    });
  });

  describe('External Links', () => {
    it('should call onOpenExternal callback', () => {
      const onOpenExternal = vi.fn();
      const config = createDefaultConfig({ onOpenExternal });
      const bridge = createKiwiAppBridge(config);

      bridge.openExternal('https://example.com');

      expect(onOpenExternal).toHaveBeenCalledWith('https://example.com');
    });
  });
});
