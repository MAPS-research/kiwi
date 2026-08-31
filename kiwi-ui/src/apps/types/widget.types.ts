/**
 * Kiwi Apps Framework - Widget Type Definitions
 *
 * Defines UI widgets that apps provide.
 * Widgets are React components that communicate with the host via the bridge API.
 */

import type { ComponentType } from 'react';

/**
 * Widget layout position
 */
export type WidgetPosition = 'panel' | 'modal' | 'inline' | 'fullscreen';

/**
 * Widget size constraints
 */
export interface WidgetSize {
  width?: number | string;
  height?: number | string;
}

/**
 * Widget layout configuration
 */
export interface WidgetLayout {
  /** Default size */
  defaultSize?: WidgetSize;

  /** Minimum size */
  minSize?: WidgetSize;

  /** Maximum size */
  maxSize?: WidgetSize;

  /** Whether the widget can be resized */
  resizable?: boolean;

  /** Default position */
  position?: WidgetPosition;

  /** Flex grow factor for panel layouts */
  flexGrow?: number;
}

/**
 * Widget state that can be persisted
 */
export interface WidgetState {
  [key: string]: unknown;
}

/**
 * Props passed to widget components
 */
export interface WidgetProps {
  /** App ID that owns this widget */
  appId: string;

  /** Widget ID */
  widgetId: string;

  /** Initial state from host */
  initialState?: WidgetState;

  /** Output from the tool that rendered this widget */
  toolOutput?: unknown;

  /** Input params from tool invocation */
  toolInput?: Record<string, unknown>;

  /** Callback when widget state changes */
  onStateChange?: (state: WidgetState) => void;

  /** Callback to request display mode change */
  onDisplayModeRequest?: (mode: WidgetPosition) => void;

  /** Callback to notify height change for auto-sizing */
  onHeightChange?: (height: number) => void;
}

/**
 * Widget definition
 */
export interface KiwiWidgetDefinition {
  /** Unique widget identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of the widget */
  description?: string;

  /** The React component to render */
  component: ComponentType<WidgetProps>;

  /** Layout configuration */
  layout: WidgetLayout;

  /** Tools this widget is allowed to call */
  allowedTools?: string[];

  /** Feature flags required to show this widget */
  requiredFeatures?: string[];

  /** Default tool input for this widget */
  defaultToolInput?: Record<string, unknown>;
}

/**
 * Widget instance state tracked by the host
 */
export interface WidgetInstance {
  /** Widget definition */
  definition: KiwiWidgetDefinition;

  /** Instance ID (for multiple instances of same widget) */
  instanceId: string;

  /** Current state */
  state: WidgetState;

  /** Current display mode */
  displayMode: WidgetPosition;

  /** Whether the widget is visible */
  visible: boolean;

  /** Last tool output received */
  lastToolOutput?: unknown;
}

/**
 * Widget render context
 */
export interface WidgetRenderContext {
  /** Theme mode */
  theme: 'light' | 'dark';

  /** Container width */
  containerWidth?: number;

  /** Container height */
  containerHeight?: number;

  /** Is widget in focus */
  isFocused?: boolean;

  /** Is widget loading */
  isLoading?: boolean;
}
