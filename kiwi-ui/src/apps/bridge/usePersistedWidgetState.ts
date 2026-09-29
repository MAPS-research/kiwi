/**
 * Kiwi Apps Framework - Persisted Widget State Hook
 *
 * Provides widget state that automatically syncs with the backend WidgetsApi.
 * Supports optimistic updates, debounced persistence, and error recovery.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { WidgetsApi } from '../../services/apis/WidgetsApi.ts';
import { Configuration } from '../../services/runtime.ts';
import { basePath } from '../../utils/api.ts';
import type {
  SaveWidgetStateDto,
  WidgetStateResponseDto,
} from '../../services/models/index.ts';
import type { WidgetState, DisplayMode } from '../types/index.ts';

/**
 * Options for persisted widget state
 */
export interface PersistedWidgetStateOptions<T extends WidgetState = WidgetState> {
  /** App ID */
  appId: string;
  /** Widget ID (unique instance identifier) */
  widgetId: string;
  /** Class ID for class context */
  classId?: string;
  /** Exercise ID for exercise context */
  exerciseId?: string;
  /** Exercise set ID */
  exerciseSetId?: string;
  /** Conversation ID for chat context */
  conversationId?: string;
  /** Initial/default state before loading from backend */
  defaultState?: T;
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
  /** Enable persistence (default: true) */
  enablePersistence?: boolean;
  /** Callback when state is loaded from backend */
  onLoaded?: (state: T) => void;
  /** Callback when state fails to save */
  onSaveError?: (error: Error) => void;
}

/**
 * Return value for persisted widget state hook
 */
export interface PersistedWidgetStateResult<T extends WidgetState> {
  /** Current widget state */
  state: T;
  /** Update widget state (optimistic, debounced save) */
  setState: (updater: T | ((prev: T) => T)) => void;
  /** Force immediate save to backend */
  saveNow: () => Promise<void>;
  /** Reload state from backend */
  reload: () => Promise<void>;
  /** Whether state is loading from backend */
  isLoading: boolean;
  /** Whether state is being saved */
  isSaving: boolean;
  /** Last error from save operation */
  error: Error | null;
  /** Whether state has been loaded from backend */
  isLoaded: boolean;
  /** Last saved timestamp */
  lastSaved: Date | null;
  /** Display mode from backend */
  displayMode: DisplayMode;
  /** Update display mode */
  setDisplayMode: (mode: DisplayMode) => void;
}

/**
 * Create a configured WidgetsApi instance
 */
function createWidgetsApi(): WidgetsApi {
  const token = localStorage.getItem('authToken') ?? '';
  const config = new Configuration({
    basePath,
    accessToken: token,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return new WidgetsApi(config);
}

/**
 * Hook for widget state that automatically persists to the backend
 *
 * @example
 * ```tsx
 * function MyWidget({ appId, widgetId, classId }) {
 *   const { state, setState, isLoading, isSaving } = usePersistedWidgetState({
 *     appId,
 *     widgetId,
 *     classId,
 *     defaultState: { count: 0, items: [] },
 *   });
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <div>
 *       <span>Count: {state.count}</span>
 *       <button onClick={() => setState(s => ({ ...s, count: s.count + 1 }))}>
 *         Increment
 *       </button>
 *       {isSaving && <span>Saving...</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePersistedWidgetState<T extends WidgetState = WidgetState>(
  options: PersistedWidgetStateOptions<T>
): PersistedWidgetStateResult<T> {
  const {
    appId,
    widgetId,
    classId,
    exerciseId,
    exerciseSetId,
    conversationId,
    defaultState = {} as T,
    debounceMs = 500,
    enablePersistence = true,
    onLoaded,
    onSaveError,
  } = options;

  // State
  const [state, setStateInternal] = useState<T>(defaultState);
  const [displayMode, setDisplayModeInternal] = useState<DisplayMode>('expanded');
  const [isLoading, setIsLoading] = useState(enablePersistence);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isLoaded, setIsLoaded] = useState(!enablePersistence);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Refs for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStateRef = useRef<T | null>(null);
  const apiRef = useRef<WidgetsApi | null>(null);

  // Get or create API instance
  const getApi = useCallback(() => {
    if (!apiRef.current) {
      apiRef.current = createWidgetsApi();
    }
    return apiRef.current;
  }, []);

  // Load state from backend
  const loadState = useCallback(async () => {
    if (!enablePersistence) return;

    setIsLoading(true);
    setError(null);

    try {
      const api = getApi();
      const response = await api.widgetControllerGetWidgetState({ widgetId });

      // Extract widget state from response
      const loadedState = (response.widgetState as T) ?? defaultState;
      const loadedDisplayMode = (response.displayMode as DisplayMode) ?? 'expanded';

      setStateInternal(loadedState);
      setDisplayModeInternal(loadedDisplayMode);
      setIsLoaded(true);
      onLoaded?.(loadedState);
    } catch (err) {
      // 404 is expected for new widgets - use default state
      if (err instanceof Response && err.status === 404) {
        setStateInternal(defaultState);
        setIsLoaded(true);
        onLoaded?.(defaultState);
      } else if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
        setStateInternal(defaultState);
        setIsLoaded(true);
        onLoaded?.(defaultState);
      } else {
        console.error('[usePersistedWidgetState] Failed to load state:', err);
        // Still use default state on error
        setStateInternal(defaultState);
        setIsLoaded(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [widgetId, enablePersistence, defaultState, getApi, onLoaded]);

  // Save state to backend
  const saveState = useCallback(
    async (stateToSave: T, mode?: DisplayMode) => {
      if (!enablePersistence) return;

      setIsSaving(true);
      setError(null);

      try {
        const api = getApi();
        const dto: SaveWidgetStateDto = {
          appId,
          widgetId,
          widgetState: stateToSave as object,
          classId,
          exerciseId,
          exerciseSetId,
          conversationId,
          displayMode: mode ?? displayMode,
        };

        await api.widgetControllerSaveWidgetState({ saveWidgetStateDto: dto });
        setLastSaved(new Date());
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to save widget state');
        setError(error);
        onSaveError?.(error);
        console.error('[usePersistedWidgetState] Failed to save state:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [
      appId,
      widgetId,
      classId,
      exerciseId,
      exerciseSetId,
      conversationId,
      displayMode,
      enablePersistence,
      getApi,
      onSaveError,
    ]
  );

  // Debounced save
  const debouncedSave = useCallback(
    (newState: T) => {
      pendingStateRef.current = newState;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (pendingStateRef.current) {
          saveState(pendingStateRef.current);
          pendingStateRef.current = null;
        }
      }, debounceMs);
    },
    [debounceMs, saveState]
  );

  // Public setState with optimistic updates
  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const newState = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        debouncedSave(newState);
        return newState;
      });
    },
    [debouncedSave]
  );

  // Force immediate save
  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await saveState(state);
  }, [state, saveState]);

  // Set display mode with save
  const setDisplayMode = useCallback(
    (mode: DisplayMode) => {
      setDisplayModeInternal(mode);
      if (enablePersistence) {
        // Save immediately with new display mode
        saveState(state, mode);
      }
    },
    [state, enablePersistence, saveState]
  );

  // Reload from backend
  const reload = useCallback(async () => {
    // Cancel any pending saves
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingStateRef.current = null;
    await loadState();
  }, [loadState]);

  // Load state on mount
  useEffect(() => {
    loadState();
  }, [loadState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Save any pending state on unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        if (pendingStateRef.current && enablePersistence) {
          // Fire and forget final save
          const api = createWidgetsApi();
          const dto: SaveWidgetStateDto = {
            appId,
            widgetId,
            widgetState: pendingStateRef.current as object,
            classId,
            exerciseId,
            exerciseSetId,
            conversationId,
            displayMode,
          };
          api.widgetControllerSaveWidgetState({ saveWidgetStateDto: dto }).catch(() => {
            // Ignore errors on unmount
          });
        }
      }
    };
  }, [appId, widgetId, classId, exerciseId, exerciseSetId, conversationId, displayMode, enablePersistence]);

  // Recreate API when token changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        apiRef.current = null; // Reset to force recreation
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    state,
    setState,
    saveNow,
    reload,
    isLoading,
    isSaving,
    error,
    isLoaded,
    lastSaved,
    displayMode,
    setDisplayMode,
  };
}

/**
 * Hook to update widget state on the backend (patch/merge)
 *
 * Useful when you want to update specific fields without replacing entire state.
 */
export function useUpdateWidgetState(widgetId: string) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateState = useCallback(
    async (partialState: WidgetState, merge = true) => {
      setIsUpdating(true);
      setError(null);

      try {
        const api = createWidgetsApi();
        const response = await api.widgetControllerUpdateWidgetState({
          widgetId,
          updateWidgetStateDto: { widgetState: partialState as object },
          merge,
        });
        return response.widgetState as WidgetState;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update widget state');
        setError(error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [widgetId]
  );

  return { updateState, isUpdating, error };
}

/**
 * Hook to query multiple widget states
 *
 * Useful for dashboards or aggregating widget data.
 */
export function useWidgetStates(filters: {
  appId?: string;
  classId?: string;
  exerciseId?: string;
  exerciseSetId?: string;
  conversationId?: string;
}) {
  const [states, setStates] = useState<WidgetStateResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const api = createWidgetsApi();
      const response = await api.widgetControllerGetWidgetStates(filters);
      setStates(response);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load widget states');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [filters.appId, filters.classId, filters.exerciseId, filters.exerciseSetId, filters.conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  return { states, isLoading, error, reload: load };
}

/**
 * Hook to delete widget state
 */
export function useDeleteWidgetState() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteState = useCallback(async (widgetId: string) => {
    setIsDeleting(true);
    setError(null);

    try {
      const api = createWidgetsApi();
      await api.widgetControllerDeleteWidgetState({ widgetId });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete widget state');
      setError(error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteState, isDeleting, error };
}

export default usePersistedWidgetState;
