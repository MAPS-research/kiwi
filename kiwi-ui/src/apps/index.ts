/**
 * Kiwi Apps Framework
 *
 * A pluggable apps framework for Kiwi UI, inspired by OpenAI's Apps SDK.
 *
 * Key Components:
 * - App Registry: Manages app registration and lifecycle
 * - Bridge: Communication layer between widgets and host
 * - Tool Executor: Handles tool execution (local, backend, streaming)
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { AppRegistryProvider } from './apps';
 *
 * function App() {
 *   return (
 *     <AppRegistryProvider>
 *       <YourApp />
 *     </AppRegistryProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // In a widget
 * import { useKiwiApp } from './apps';
 *
 * function MyWidget() {
 *   const { callTool, widgetState, setWidgetState } = useKiwiApp();
 *
 *   const handleClick = async () => {
 *     const result = await callTool('my_tool', { param: 'value' });
 *   };
 * }
 * ```
 */

// ============================================
// Types
// ============================================
export type {
  // App types
  AppPermission,
  KiwiAppManifest,
  AppStatus,
  RegisteredApp,
  AppRegistrationOptions,
  AppRegistrationResult,

  // Tool types
  JSONSchemaProperty,
  JSONSchema,
  ToolExecutionContext,
  ToolHandler,
  StreamingCallback,
  StreamingToolHandler,
  ToolExecutionType,
  ToolExecutionConfig,
  KiwiToolDefinition,
  ToolResult,
  ToolInvocation,

  // Widget types
  WidgetPosition,
  WidgetSize,
  WidgetLayout,
  WidgetState,
  WidgetProps,
  KiwiWidgetDefinition,
  WidgetInstance,
  WidgetRenderContext,

  // Bridge types
  BridgeUser,
  DisplayMode,
  BridgeEventType,
  BridgeEvent,
  BridgeEventCallback,
  KiwiAppBridge,
  BridgeConfig,
} from './types/index.ts';

// ============================================
// Registry
// ============================================
export {
  AppRegistry,
  getAppRegistry,
  AppRegistryProvider,
  AppRegistryContext,
  useAppRegistry,
  useApp,
  useAppTools,
  useAppWidgets,
  useActiveApps,
} from './registry/index.ts';

export type {
  RegistryListener,
  AppRegistryContextValue,
  AppRegistryProviderProps,
} from './registry/index.ts';

// ============================================
// Bridge
// ============================================
export {
  createKiwiAppBridge,
  installBridge,
  uninstallBridge,
  isBridgeInstalled,
  getBridge,
  BridgeProvider,
  BridgeContext,
  useBridge,
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
  // Persistence hooks
  usePersistedWidgetState,
  useUpdateWidgetState,
  useWidgetStates,
  useDeleteWidgetState,
} from './bridge/index.ts';

export type {
  BridgeContextValue,
  BridgeProviderProps,
  PersistedWidgetStateOptions,
  PersistedWidgetStateResult,
} from './bridge/index.ts';

// ============================================
// Host / Tool Execution
// ============================================
export {
  executeTool,
  createToolExecutor,
  validateToolParams,
  AppHost,
  SingleWidgetHost,
  WidgetContainer,
} from './host/index.ts';

export type {
  AppHostProps,
  SingleWidgetHostProps,
  WidgetContainerProps,
} from './host/index.ts';

// ============================================
// Built-in Apps
// ============================================
export {
  builtinApps,
} from './builtins/index.ts';

// ============================================
// Class Apps Configuration
// ============================================
export {
  ClassAppsProvider,
  ClassAppsContext,
  useClassApps,
  useClassApp,
  useIsAppEnabled,
  useAppToken,
} from './classApps/index.ts';

export type {
  ClassKiwiAppConfig,
  ClassAppsResponse,
  ClassAppsContextValue,
  ClassAppsProviderProps,
} from './classApps/index.ts';
