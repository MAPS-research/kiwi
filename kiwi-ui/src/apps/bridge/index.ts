/**
 * Kiwi Apps Framework - Bridge Exports
 */

export {
  createKiwiAppBridge,
  installBridge,
  uninstallBridge,
  isBridgeInstalled,
  getBridge,
} from './KiwiAppBridge';

export {
  BridgeProvider,
  BridgeContext,
  useBridge,
} from './BridgeProvider';
export type {
  BridgeContextValue,
  BridgeProviderProps,
} from './BridgeProvider';

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
} from './useKiwiApp';

// Persistence hooks
export {
  usePersistedWidgetState,
  useUpdateWidgetState,
  useWidgetStates,
  useDeleteWidgetState,
} from './usePersistedWidgetState';
export type {
  PersistedWidgetStateOptions,
  PersistedWidgetStateResult,
} from './usePersistedWidgetState';
