/**
 * AppRegistry Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppRegistry, getAppRegistry } from '../AppRegistry';
import type { KiwiAppManifest, KiwiToolDefinition } from '../../types';

// Mock tool definition for testing
const createMockTool = (name: string): KiwiToolDefinition => ({
  name,
  description: `Test tool: ${name}`,
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
});

// Mock app manifest for testing
const createMockManifest = (
  id: string,
  overrides: Partial<KiwiAppManifest> = {}
): KiwiAppManifest => ({
  id,
  name: `Test App ${id}`,
  version: '1.0.0',
  description: `Test app description for ${id}`,
  permissions: [],
  tools: [createMockTool(`${id}_tool`)],
  widgets: [],
  ...overrides,
});

describe('AppRegistry', () => {
  beforeEach(() => {
    // Reset singleton between tests
    AppRegistry.resetInstance();
  });

  afterEach(() => {
    AppRegistry.resetInstance();
  });

  describe('Singleton', () => {
    it('should return the same instance from getAppRegistry', () => {
      const instance1 = getAppRegistry();
      const instance2 = getAppRegistry();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance correctly', () => {
      const instance1 = getAppRegistry();
      instance1.register(createMockManifest('test'));
      expect(instance1.hasApp('test')).toBe(true);

      AppRegistry.resetInstance();

      const instance2 = getAppRegistry();
      expect(instance2.hasApp('test')).toBe(false);
    });
  });

  describe('Registration', () => {
    it('should register an app successfully', () => {
      const registry = getAppRegistry();
      const manifest = createMockManifest('test-app');
      const result = registry.register(manifest);

      expect(result.success).toBe(true);
      expect(registry.hasApp('test-app')).toBe(true);
    });

    it('should not register duplicate apps', () => {
      const registry = getAppRegistry();
      const manifest = createMockManifest('test-app');
      registry.register(manifest);
      const result = registry.register(manifest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already registered');
    });

    it('should allow replacing apps with replace option', () => {
      const registry = getAppRegistry();
      const manifest = createMockManifest('test-app');
      registry.register(manifest);

      const manifest2 = createMockManifest('test-app', { version: '2.0.0' });
      const result = registry.register(manifest2, { replace: true });

      expect(result.success).toBe(true);
      expect(registry.getApp('test-app')?.manifest.version).toBe('2.0.0');
    });

    it('should auto-activate when option is set', async () => {
      const registry = getAppRegistry();
      const manifest = createMockManifest('test-app');
      registry.register(manifest, { autoActivate: true });

      // Wait for auto-activation
      await new Promise((resolve) => setTimeout(resolve, 10));

      const app = registry.getApp('test-app');
      expect(app?.status).toBe('active');
    });

    it('should register as inactive by default', () => {
      const registry = getAppRegistry();
      const manifest = createMockManifest('test-app');
      registry.register(manifest);

      const app = registry.getApp('test-app');
      expect(app?.status).toBe('inactive');
    });

    it('should validate manifest - reject missing id', () => {
      const registry = getAppRegistry();
      const manifest = createMockManifest('test-app');
      (manifest as any).id = '';

      const result = registry.register(manifest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('id');
    });
  });

  describe('Unregistration', () => {
    it('should unregister an app successfully', () => {
      const registry = getAppRegistry();
      const manifest = createMockManifest('test-app');
      registry.register(manifest);
      const result = registry.unregister('test-app');

      expect(result).toBe(true);
      expect(registry.hasApp('test-app')).toBe(false);
    });

    it('should fail to unregister non-existent app', () => {
      const registry = getAppRegistry();
      const result = registry.unregister('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('Activation/Deactivation', () => {
    it('should activate an app', async () => {
      const registry = getAppRegistry();
      const onActivate = vi.fn().mockResolvedValue(undefined);
      const manifest = createMockManifest('test-app', { onActivate });
      registry.register(manifest);

      await registry.activate('test-app');

      expect(onActivate).toHaveBeenCalled();
      expect(registry.getApp('test-app')?.status).toBe('active');
    });

    it('should deactivate an app', async () => {
      const registry = getAppRegistry();
      const onDeactivate = vi.fn().mockResolvedValue(undefined);
      const manifest = createMockManifest('test-app', { onDeactivate });
      registry.register(manifest, { autoActivate: true });

      // Wait for auto-activation
      await new Promise((resolve) => setTimeout(resolve, 10));

      await registry.deactivate('test-app');

      expect(onDeactivate).toHaveBeenCalled();
      expect(registry.getApp('test-app')?.status).toBe('inactive');
    });

    it('should fail to activate non-existent app', async () => {
      const registry = getAppRegistry();
      await expect(registry.activate('non-existent')).rejects.toThrow('not found');
    });

    it('should fail to deactivate non-existent app', async () => {
      const registry = getAppRegistry();
      await expect(registry.deactivate('non-existent')).rejects.toThrow('not found');
    });

    it('should handle activation errors gracefully', async () => {
      const registry = getAppRegistry();
      const onActivate = vi.fn().mockRejectedValue(new Error('Activation failed'));
      const manifest = createMockManifest('test-app', { onActivate });
      registry.register(manifest);

      await expect(registry.activate('test-app')).rejects.toThrow('Activation failed');
      expect(registry.getApp('test-app')?.status).toBe('error');
    });
  });

  describe('Queries', () => {
    let registry: ReturnType<typeof getAppRegistry>;

    beforeEach(async () => {
      registry = getAppRegistry();
      const app1 = createMockManifest('app1');
      const app2 = createMockManifest('app2');
      registry.register(app1, { autoActivate: true });
      registry.register(app2);

      // Wait for auto-activation
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('should get all apps', () => {
      const apps = registry.getAllApps();
      expect(apps).toHaveLength(2);
    });

    it('should get active apps only', () => {
      const activeApps = registry.getActiveApps();
      expect(activeApps).toHaveLength(1);
      expect(activeApps[0].manifest.id).toBe('app1');
    });

    it('should get a specific app', () => {
      const app = registry.getApp('app1');
      expect(app).toBeDefined();
      expect(app?.manifest.id).toBe('app1');
    });

    it('should return undefined for non-existent app', () => {
      const app = registry.getApp('non-existent');
      expect(app).toBeUndefined();
    });
  });

  describe('Tool Discovery', () => {
    it('should find tools from apps', async () => {
      const registry = getAppRegistry();
      const manifest = createMockManifest('test-app');
      registry.register(manifest, { autoActivate: true });

      // Wait for auto-activation
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = registry.findTool('test-app_tool');
      expect(result).toBeDefined();
      expect(result?.tool.name).toBe('test-app_tool');
      expect(result?.app.manifest.id).toBe('test-app');
    });

    it('should return undefined for non-existent tools', () => {
      const registry = getAppRegistry();
      const manifest = createMockManifest('test-app');
      registry.register(manifest);

      const result = registry.findTool('nonexistent_tool');
      expect(result).toBeUndefined();
    });

    it('should get all tools from active apps', async () => {
      const registry = getAppRegistry();
      const manifest1 = createMockManifest('app1');
      const manifest2 = createMockManifest('app2');
      registry.register(manifest1, { autoActivate: true });
      registry.register(manifest2, { autoActivate: true });

      // Wait for auto-activation
      await new Promise((resolve) => setTimeout(resolve, 10));

      const tools = registry.getAllActiveTools();
      expect(tools).toHaveLength(2);
    });
  });

  describe('Subscriptions', () => {
    it('should notify subscribers on registration', () => {
      const registry = getAppRegistry();
      const listener = vi.fn();
      registry.subscribe(listener);

      // Clear initial call
      listener.mockClear();

      const manifest = createMockManifest('test-app');
      registry.register(manifest);

      expect(listener).toHaveBeenCalled();
    });

    it('should notify subscribers on activation', async () => {
      const registry = getAppRegistry();
      const manifest = createMockManifest('test-app');
      registry.register(manifest);

      const listener = vi.fn();
      registry.subscribe(listener);

      // Clear initial call
      listener.mockClear();

      await registry.activate('test-app');

      // Called during loading and after activation
      expect(listener.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should unsubscribe correctly', () => {
      const registry = getAppRegistry();
      const listener = vi.fn();
      const unsubscribe = registry.subscribe(listener);

      // Clear initial call
      listener.mockClear();

      unsubscribe();

      const manifest = createMockManifest('test-app');
      registry.register(manifest);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should provide current state on subscribe', () => {
      const registry = getAppRegistry();
      const manifest = createMockManifest('test-app');
      registry.register(manifest);

      const listener = vi.fn();
      registry.subscribe(listener);

      expect(listener).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          manifest: expect.objectContaining({ id: 'test-app' }),
        }),
      ]));
    });
  });
});
