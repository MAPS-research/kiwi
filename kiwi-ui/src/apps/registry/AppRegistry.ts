/**
 * Kiwi Apps Framework - App Registry
 *
 * Singleton registry for managing app registration, activation, and discovery.
 * Central hub for all app-related operations.
 */

import type {
  KiwiAppManifest,
  RegisteredApp,
  AppRegistrationOptions,
  AppRegistrationResult,
  AppStatus,
  KiwiToolDefinition,
  KiwiWidgetDefinition,
} from '../types/index.ts';

/**
 * Listener callback type for registry changes
 */
export type RegistryListener = (apps: RegisteredApp[]) => void;

/**
 * App Registry - Singleton pattern
 *
 * Manages the lifecycle of all registered apps:
 * - Registration and validation
 * - Activation and deactivation
 * - Tool and widget discovery
 * - Event notifications
 */
class AppRegistry {
  private static instance: AppRegistry | null = null;

  private apps: Map<string, RegisteredApp> = new Map();
  private listeners: Set<RegistryListener> = new Set();
  private initialized = false;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AppRegistry {
    if (!AppRegistry.instance) {
      AppRegistry.instance = new AppRegistry();
    }
    return AppRegistry.instance;
  }

  /**
   * Reset the singleton (useful for testing)
   */
  static resetInstance(): void {
    if (AppRegistry.instance) {
      AppRegistry.instance.apps.clear();
      AppRegistry.instance.listeners.clear();
      AppRegistry.instance.initialized = false;
    }
    AppRegistry.instance = null;
  }

  /**
   * Initialize the registry (call once at app startup)
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('AppRegistry already initialized');
      return;
    }
    this.initialized = true;
    console.log('[AppRegistry] Initialized');
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ============================================
  // Registration
  // ============================================

  /**
   * Register an app with its manifest
   */
  register(
    manifest: KiwiAppManifest,
    options: AppRegistrationOptions = {}
  ): AppRegistrationResult {
    const { autoActivate = false, replace = false } = options;

    // Validate manifest
    const validationError = this.validateManifest(manifest);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Check for existing app
    if (this.apps.has(manifest.id) && !replace) {
      return {
        success: false,
        error: `App with ID '${manifest.id}' already registered. Use replace: true to override.`,
      };
    }

    // Create registered app
    const registeredApp: RegisteredApp = {
      manifest,
      status: 'inactive',
      registeredAt: new Date(),
    };

    this.apps.set(manifest.id, registeredApp);
    console.log(`[AppRegistry] Registered app: ${manifest.id} v${manifest.version}`);

    // Auto-activate if requested
    if (autoActivate) {
      this.activate(manifest.id).catch((err) => {
        console.error(`[AppRegistry] Auto-activation failed for ${manifest.id}:`, err);
      });
    }

    this.notifyListeners();

    return { success: true, app: registeredApp };
  }

  /**
   * Unregister an app
   */
  unregister(appId: string): boolean {
    const app = this.apps.get(appId);
    if (!app) {
      console.warn(`[AppRegistry] Cannot unregister: App '${appId}' not found`);
      return false;
    }

    // Deactivate first if active
    if (app.status === 'active') {
      this.deactivate(appId);
    }

    this.apps.delete(appId);
    console.log(`[AppRegistry] Unregistered app: ${appId}`);
    this.notifyListeners();

    return true;
  }

  /**
   * Validate an app manifest
   */
  private validateManifest(manifest: KiwiAppManifest): string | null {
    if (!manifest.id || typeof manifest.id !== 'string') {
      return 'Manifest must have a valid id';
    }

    if (!manifest.name || typeof manifest.name !== 'string') {
      return 'Manifest must have a valid name';
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      return 'Manifest must have a valid version';
    }

    if (!Array.isArray(manifest.tools)) {
      return 'Manifest must have a tools array';
    }

    if (!Array.isArray(manifest.widgets)) {
      return 'Manifest must have a widgets array';
    }

    // Validate tool names are unique within the app
    const toolNames = new Set<string>();
    for (const tool of manifest.tools) {
      if (toolNames.has(tool.name)) {
        return `Duplicate tool name: ${tool.name}`;
      }
      toolNames.add(tool.name);
    }

    // Validate widget IDs are unique within the app
    const widgetIds = new Set<string>();
    for (const widget of manifest.widgets) {
      if (widgetIds.has(widget.id)) {
        return `Duplicate widget ID: ${widget.id}`;
      }
      widgetIds.add(widget.id);
    }

    return null;
  }

  // ============================================
  // Activation / Deactivation
  // ============================================

  /**
   * Activate an app
   */
  async activate(appId: string): Promise<void> {
    const app = this.apps.get(appId);
    if (!app) {
      throw new Error(`App '${appId}' not found`);
    }

    if (app.status === 'active') {
      console.log(`[AppRegistry] App '${appId}' is already active`);
      return;
    }

    try {
      app.status = 'loading';
      this.notifyListeners();

      // Run activation hook if provided
      if (app.manifest.onActivate) {
        await app.manifest.onActivate();
      }

      app.status = 'active';
      app.activatedAt = new Date();
      app.error = undefined;

      console.log(`[AppRegistry] Activated app: ${appId}`);
      this.notifyListeners();
    } catch (err) {
      app.status = 'error';
      app.error = err instanceof Error ? err.message : 'Activation failed';
      this.notifyListeners();
      throw err;
    }
  }

  /**
   * Deactivate an app
   */
  async deactivate(appId: string): Promise<void> {
    const app = this.apps.get(appId);
    if (!app) {
      throw new Error(`App '${appId}' not found`);
    }

    if (app.status !== 'active') {
      console.log(`[AppRegistry] App '${appId}' is not active`);
      return;
    }

    try {
      // Run deactivation hook if provided
      if (app.manifest.onDeactivate) {
        await app.manifest.onDeactivate();
      }

      app.status = 'inactive';
      app.error = undefined;

      console.log(`[AppRegistry] Deactivated app: ${appId}`);
      this.notifyListeners();
    } catch (err) {
      app.status = 'error';
      app.error = err instanceof Error ? err.message : 'Deactivation failed';
      this.notifyListeners();
      throw err;
    }
  }

  /**
   * Update app status
   */
  setAppStatus(appId: string, status: AppStatus, error?: string): void {
    const app = this.apps.get(appId);
    if (!app) {
      console.warn(`[AppRegistry] Cannot set status: App '${appId}' not found`);
      return;
    }

    app.status = status;
    app.error = error;
    this.notifyListeners();
  }

  // ============================================
  // Queries
  // ============================================

  /**
   * Get a registered app by ID
   */
  getApp(appId: string): RegisteredApp | undefined {
    return this.apps.get(appId);
  }

  /**
   * Get all registered apps
   */
  getAllApps(): RegisteredApp[] {
    return Array.from(this.apps.values());
  }

  /**
   * Get all active apps
   */
  getActiveApps(): RegisteredApp[] {
    return this.getAllApps().filter((app) => app.status === 'active');
  }

  /**
   * Check if an app is registered
   */
  hasApp(appId: string): boolean {
    return this.apps.has(appId);
  }

  /**
   * Get tools for a specific app
   */
  getToolsForApp(appId: string): KiwiToolDefinition[] {
    const app = this.apps.get(appId);
    return app?.manifest.tools ?? [];
  }

  /**
   * Get widgets for a specific app
   */
  getWidgetsForApp(appId: string): KiwiWidgetDefinition[] {
    const app = this.apps.get(appId);
    return app?.manifest.widgets ?? [];
  }

  /**
   * Find a tool by name across all apps
   * Returns the app and tool if found
   */
  findTool(
    toolName: string
  ): { app: RegisteredApp; tool: KiwiToolDefinition } | undefined {
    for (const app of this.apps.values()) {
      const tool = app.manifest.tools.find((t) => t.name === toolName);
      if (tool) {
        return { app, tool };
      }
    }
    return undefined;
  }

  /**
   * Find a tool by name within an app's context
   * First checks the specific app, then falls back to global search
   */
  findToolInContext(
    toolName: string,
    appId: string
  ): { app: RegisteredApp; tool: KiwiToolDefinition } | undefined {
    // First, check the specific app
    const app = this.apps.get(appId);
    if (app) {
      const tool = app.manifest.tools.find((t) => t.name === toolName);
      if (tool) {
        return { app, tool };
      }
    }

    // Fall back to global search
    return this.findTool(toolName);
  }

  /**
   * Get all tools from all active apps
   */
  getAllActiveTools(): Array<{ appId: string; tool: KiwiToolDefinition }> {
    const tools: Array<{ appId: string; tool: KiwiToolDefinition }> = [];

    for (const app of this.getActiveApps()) {
      for (const tool of app.manifest.tools) {
        tools.push({ appId: app.manifest.id, tool });
      }
    }

    return tools;
  }

  // ============================================
  // Subscriptions
  // ============================================

  /**
   * Subscribe to registry changes
   * Returns unsubscribe function
   */
  subscribe(listener: RegistryListener): () => void {
    this.listeners.add(listener);

    // Immediately notify with current state
    listener(this.getAllApps());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    const apps = this.getAllApps();
    this.listeners.forEach((listener) => {
      try {
        listener(apps);
      } catch (err) {
        console.error('[AppRegistry] Listener error:', err);
      }
    });
  }
}

// Export singleton getter
export const getAppRegistry = AppRegistry.getInstance.bind(AppRegistry);

// Export for testing
export { AppRegistry };

// Default export
export default AppRegistry;
