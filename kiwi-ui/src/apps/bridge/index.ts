/**
 * Kiwi Apps Framework - Bridge Exports
 */

export {
  createKiwiAppBridge,
  installBridge,
  uninstallBridge,
  isBridgeInstalled,
  getBridge,
} from './KiwiAppBridge.ts';

export {
  BridgeProvider,
  BridgeContext,
  useBridge,
} from './BridgeProvider.tsx';
export type {
  BridgeContextValue,
  BridgeProviderProps,
} from './BridgeProvider.tsx';

export {
  useKiwiApp,
  useKiwiAppBridge,
  useWidgetState,
  useToolCall,
  useStreamingToolCall,
  useSendMessage,
  useDisplayMode,
  useBridgeEvent,
  useAppContext,
  useToolInput,
  useToolOutput,
  useKiwiAppGlobal,
} from './useKiwiApp.ts';

// Persistence hooks
export {
  usePersistedWidgetState,
  useUpdateWidgetState,
  useWidgetStates,
  useDeleteWidgetState,
} from './usePersistedWidgetState.ts';
export type {
  PersistedWidgetStateOptions,
  PersistedWidgetStateResult,
} from './usePersistedWidgetState.ts';
