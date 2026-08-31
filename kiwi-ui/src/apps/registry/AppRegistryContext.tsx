/**
 * Kiwi Apps Framework - App Registry Context
 *
 * React context provider for the App Registry.
 * Provides reactive access to registered apps throughout the component tree.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';

import AppRegistry, { getAppRegistry } from './AppRegistry';
import type {
  RegisteredApp,
  KiwiAppManifest,
  AppRegistrationOptions,
  KiwiToolDefinition,
  KiwiWidgetDefinition,
} from '../types';

/**
 * Context value interface
 */
export interface AppRegistryContextValue {
  /** The registry instance */
  registry: AppRegistry;

  /** All registered apps */
  apps: RegisteredApp[];

  /** Active apps only */
  activeApps: RegisteredApp[];

  /** Whether the registry is initialized */
  isInitialized: boolean;

  /** Register a new app */
  registerApp: (
    manifest: KiwiAppManifest,
    options?: AppRegistrationOptions
  ) => { success: boolean; error?: string };

  /** Unregister an app */
  unregisterApp: (appId: string) => boolean;

  /** Activate an app */
  activateApp: (appId: string) => Promise<void>;

  /** Deactivate an app */
  deactivateApp: (appId: string) => Promise<void>;

  /** Get an app by ID */
  getApp: (appId: string) => RegisteredApp | undefined;

  /** Get tools for an app */
  getToolsForApp: (appId: string) => KiwiToolDefinition[];

  /** Get widgets for an app */
  getWidgetsForApp: (appId: string) => KiwiWidgetDefinition[];

  /** Find a tool by name */
  findTool: (
    toolName: string,
    appContext?: string
  ) => { app: RegisteredApp; tool: KiwiToolDefinition } | undefined;
}

/**
 * Create context with null default
 */
const AppRegistryContext = createContext<AppRegistryContextValue | null>(null);

/**
 * Provider props
 */
export interface AppRegistryProviderProps {
  children: ReactNode;

  /** Optional callback when registry is ready */
  onReady?: () => void;

  /** Optional list of apps to register on mount */
  initialApps?: KiwiAppManifest[];
}

/**
 * App Registry Provider component
 *
 * Wraps the application to provide access to the app registry.
 * Should be placed near the root of the app, after AuthProvider.
 */
export const AppRegistryProvider: React.FC<AppRegistryProviderProps> = ({
  children,
  onReady,
  initialApps = [],
}) => {
  // Get singleton registry instance
  const registry = useMemo(() => getAppRegistry(), []);

  // Track registered apps reactively
  const [apps, setApps] = useState<RegisteredApp[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize registry and subscribe to changes
  useEffect(() => {
    // Initialize if not already done
    if (!registry.isInitialized()) {
      registry.initialize();
    }

    // Subscribe to changes
    const unsubscribe = registry.subscribe((updatedApps) => {
      setApps(updatedApps);
    });

    // Register initial apps
    initialApps.forEach((manifest) => {
      if (!registry.hasApp(manifest.id)) {
        registry.register(manifest, { autoActivate: true });
      }
    });

    // Expose for debugging in dev mode
    if (process.env.NODE_ENV === 'development') {
      (window as any).__KIWI_APP_REGISTRY__ = registry;
    }

    setIsInitialized(true);
    onReady?.();

    return () => {
      unsubscribe();
    };
  }, [registry, onReady, initialApps]);

  // Compute active apps
  const activeApps = useMemo(
    () => apps.filter((app) => app.status === 'active'),
    [apps]
  );

  // Memoized methods
  const registerApp = useCallback(
    (manifest: KiwiAppManifest, options?: AppRegistrationOptions) => {
      const result = registry.register(manifest, options);
      return { success: result.success, error: result.error };
    },
    [registry]
  );

  const unregisterApp = useCallback(
    (appId: string) => registry.unregister(appId),
    [registry]
  );

  const activateApp = useCallback(
    (appId: string) => registry.activate(appId),
    [registry]
  );

  const deactivateApp = useCallback(
    (appId: string) => registry.deactivate(appId),
    [registry]
  );

  const getApp = useCallback(
    (appId: string) => registry.getApp(appId),
    [registry]
  );

  const getToolsForApp = useCallback(
    (appId: string) => registry.getToolsForApp(appId),
    [registry]
  );

  const getWidgetsForApp = useCallback(
    (appId: string) => registry.getWidgetsForApp(appId),
    [registry]
  );

  const findTool = useCallback(
    (toolName: string, appContext?: string) => {
      if (appContext) {
        return registry.findToolInContext(toolName, appContext);
      }
      return registry.findTool(toolName);
    },
    [registry]
  );

  // Context value
  const contextValue = useMemo<AppRegistryContextValue>(
    () => ({
      registry,
      apps,
      activeApps,
      isInitialized,
      registerApp,
      unregisterApp,
      activateApp,
      deactivateApp,
      getApp,
      getToolsForApp,
      getWidgetsForApp,
      findTool,
    }),
    [
      registry,
      apps,
      activeApps,
      isInitialized,
      registerApp,
      unregisterApp,
      activateApp,
      deactivateApp,
      getApp,
      getToolsForApp,
      getWidgetsForApp,
      findTool,
    ]
  );

  return (
    <AppRegistryContext.Provider value={contextValue}>
      {children}
    </AppRegistryContext.Provider>
  );
};

/**
 * Hook to access the app registry context
 *
 * @throws Error if used outside of AppRegistryProvider
 */
export function useAppRegistry(): AppRegistryContextValue {
  const context = useContext(AppRegistryContext);

  if (!context) {
    throw new Error(
      'useAppRegistry must be used within an AppRegistryProvider. ' +
        'Make sure your component is wrapped in <AppRegistryProvider>.'
    );
  }

  return context;
}

/**
 * Hook to get a specific app
 */
export function useApp(appId: string): RegisteredApp | undefined {
  const { getApp } = useAppRegistry();
  return getApp(appId);
}

/**
 * Hook to get tools for an app
 */
export function useAppTools(appId: string): KiwiToolDefinition[] {
  const { getToolsForApp } = useAppRegistry();
  return getToolsForApp(appId);
}

/**
 * Hook to get widgets for an app
 */
export function useAppWidgets(appId: string): KiwiWidgetDefinition[] {
  const { getWidgetsForApp } = useAppRegistry();
  return getWidgetsForApp(appId);
}

/**
 * Hook to get all active apps
 */
export function useActiveApps(): RegisteredApp[] {
  const { activeApps } = useAppRegistry();
  return activeApps;
}

// Export context for advanced use cases
export { AppRegistryContext };
