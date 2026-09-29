/**
 * Kiwi Apps - Class Apps Context
 *
 * Provides class-level app configuration to the component tree.
 * Fetches from GET /api/classes/:classId/apps using the generated API.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { Configuration as ApiConfiguration } from '../../services/runtime.ts';
import { ClassAppsApi } from '../../services/apis/ClassAppsApi.ts';
import { basePath } from '../../utils/api.ts';
import type {
  ClassKiwiAppConfig,
  ClassAppsContextValue,
  ClassAppsProviderProps,
} from './types.ts';

/**
 * Default context value
 */
const defaultContextValue: ClassAppsContextValue = {
  apps: [],
  isLoading: false,
  error: null,
  classId: null,
  reload: async () => {},
  getApp: () => undefined,
  getAppToken: async () => '',
  isAppEnabled: () => false,
};

/**
 * Class Apps Context
 */
const ClassAppsContext = createContext<ClassAppsContextValue>(defaultContextValue);

/**
 * Class Apps Provider
 *
 * Fetches and caches app configuration for a class.
 *
 * @example
 * ```tsx
 * function ClassPage({ classId }) {
 *   return (
 *     <ClassAppsProvider classId={classId}>
 *       <ClassContent />
 *     </ClassAppsProvider>
 *   );
 * }
 * ```
 */
export const ClassAppsProvider: React.FC<ClassAppsProviderProps> = ({
  children,
  classId,
  getToken,
  userRole,
  placement = 'class-tab',
}) => {
  const [apps, setApps] = useState<ClassKiwiAppConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Default token getter
  const defaultGetToken = useCallback(async () => {
    return localStorage.getItem('authToken') ?? '';
  }, []);

  const tokenGetter = getToken ?? defaultGetToken;

  // Fetch apps for class using generated API
  const fetchApps = useCallback(async () => {
    if (!classId) {
      setApps([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await tokenGetter();

      // Create API configuration with auth token
      const config = new ApiConfiguration({
        basePath,
        accessToken: token,
      });

      const api = new ClassAppsApi(config);

      // Use the generated API method with optional filters
      const data = await api.classKiwiAppControllerGetClassApps({
        classId,
        placement: placement || undefined,
        userRole: userRole || undefined,
      });

      // Filter to enabled apps and sort by tabOrder
      const enabledApps = data
        .filter((app) => app.isEnabled)
        .sort((a, b) => a.tabOrder - b.tabOrder);

      setApps(enabledApps);
    } catch (err) {
      // Handle 404 as empty list (no apps configured)
      if (err instanceof Response && err.status === 404) {
        setApps([]);
        return;
      }
      const error = err instanceof Error ? err : new Error('Failed to fetch class apps');
      setError(error);
      console.error('[ClassAppsContext] Error fetching apps:', err);
    } finally {
      setIsLoading(false);
    }
  }, [classId, tokenGetter, placement, userRole]);

  // Fetch on mount and when classId changes
  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // Get app by slug
  const getApp = useCallback(
    (slug: string) => apps.find((app) => app.slug === slug),
    [apps]
  );

  // Get JWT token for an app
  // For now, returns the same auth token - can be extended for app-specific tokens
  const getAppToken = useCallback(
    async (slug: string): Promise<string> => {
      const app = getApp(slug);
      if (!app) {
        console.warn(`[ClassAppsContext] App not found: ${slug}`);
      }
      // Return the current auth token
      // In the future, this could request app-specific tokens from the backend
      return tokenGetter();
    },
    [getApp, tokenGetter]
  );

  // Check if app is enabled
  const isAppEnabled = useCallback(
    (slug: string) => apps.some((app) => app.slug === slug),
    [apps]
  );

  // Context value
  const contextValue = useMemo<ClassAppsContextValue>(
    () => ({
      apps,
      isLoading,
      error,
      classId,
      reload: fetchApps,
      getApp,
      getAppToken,
      isAppEnabled,
    }),
    [apps, isLoading, error, classId, fetchApps, getApp, getAppToken, isAppEnabled]
  );

  return (
    <ClassAppsContext.Provider value={contextValue}>
      {children}
    </ClassAppsContext.Provider>
  );
};

/**
 * Hook to access class apps context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { apps, isLoading, getAppToken } = useClassApps();
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <div>
 *       {apps.map(app => (
 *         <AppTab key={app.slug} app={app} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useClassApps(): ClassAppsContextValue {
  return useContext(ClassAppsContext);
}

/**
 * Hook to get a specific app's config
 */
export function useClassApp(slug: string): ClassKiwiAppConfig | undefined {
  const { getApp } = useClassApps();
  return getApp(slug);
}

/**
 * Hook to check if an app is available
 */
export function useIsAppEnabled(slug: string): boolean {
  const { isAppEnabled } = useClassApps();
  return isAppEnabled(slug);
}

/**
 * Hook to get app token
 */
export function useAppToken(slug: string) {
  const { getAppToken } = useClassApps();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchToken = useCallback(async () => {
    setIsLoading(true);
    try {
      const t = await getAppToken(slug);
      setToken(t);
    } finally {
      setIsLoading(false);
    }
  }, [getAppToken, slug]);

  return { token, isLoading, fetchToken };
}

export { ClassAppsContext };
