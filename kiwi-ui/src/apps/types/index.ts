/**
 * Kiwi Apps Framework - Type Definitions
 *
 * Central export point for all type definitions.
 */

// App types
export type {
  AppPermission,
  KiwiAppManifest,
  AppStatus,
  RegisteredApp,
  AppRegistrationOptions,
  AppRegistrationResult,
} from './app.types.ts';

// Tool types
export type {
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
} from './tool.types.ts';

// Widget types
export type {
  WidgetPosition,
  WidgetSize,
  WidgetLayout,
  WidgetState,
  WidgetProps,
  KiwiWidgetDefinition,
  WidgetInstance,
  WidgetRenderContext,
} from './widget.types.ts';

// Bridge types
export type {
  BridgeUser,
  DisplayMode,
  BridgeEventType,
  BridgeEvent,
  BridgeEventCallback,
  KiwiAppBridge,
  BridgeConfig,
} from './bridge.types.ts';
