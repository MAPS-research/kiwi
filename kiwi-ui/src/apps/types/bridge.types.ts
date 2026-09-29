/**
 * Kiwi Apps Framework - Bridge API Type Definitions
 *
 * Defines the window.kiwiApp bridge interface for widget-host communication.
 * Follows OpenAI's window.openai pattern for familiarity.
 */

import type { WidgetState } from './widget.types.ts';
import type { ToolResult } from './tool.types.ts';

/**
 * User information available to widgets
 */
export interface BridgeUser {
  id: string;
  username: string;
  email?: string;
  role?: string;
}

/**
 * Display mode options for widgets
 */
export type DisplayMode = 'compact' | 'expanded' | 'fullscreen';

/**
 * Event types emitted by the bridge
 */
export type BridgeEventType =
  | 'state_changed'
  | 'tool_result'
  | 'theme_changed'
  | 'display_mode_changed'
  | 'message_received';

/**
 * Bridge event payload
 */
export interface BridgeEvent {
  type: BridgeEventType;
  payload: unknown;
  timestamp: number;
}

/**
 * Callback for bridge events
 */
export type BridgeEventCallback = (event: BridgeEvent) => void;

/**
 * The main bridge interface exposed as window.kiwiApp
 *
 * This is the primary API for widgets to communicate with the host.
 */
export interface KiwiAppBridge {
  // ============================================
  // Context & Data (Read-only)
  // ============================================

  /** ID of the current app */
  readonly appId: string;

  /** ID of the current widget */
  readonly widgetId: string;

  /** Input parameters passed to the widget (from tool invocation) */
  readonly toolInput?: Record<string, unknown>;

  /** Output from the last tool call that rendered this widget */
  readonly toolOutput?: unknown;

  /** Current theme mode */
  readonly theme: 'light' | 'dark';

  /** Current display mode */
  readonly displayMode: DisplayMode;

  /** Current user information */
  readonly user: BridgeUser | null;

  /** Current class ID if in a class context */
  readonly classId?: string;

  /** Browser locale */
  readonly locale: string;

  // ============================================
  // State Management
  // ============================================

  /** Get current widget state */
  getWidgetState(): WidgetState;

  /**
   * Set widget state (merges with existing state)
   * State is persisted across renders within the same session
   */
  setWidgetState(
    updater: WidgetState | ((prevState: WidgetState) => WidgetState)
  ): void;

  // ============================================
  // Tool Invocation
  // ============================================

  /**
   * Call a tool from within the widget
   * Only tools with allowWidgetAccess: true can be called
   */
  callTool(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<ToolResult>;

  /**
   * Call a tool with streaming response
   */
  callToolStreaming(
    toolName: string,
    params: Record<string, unknown>,
    onStream: (chunk: string, isComplete: boolean) => void
  ): Promise<ToolResult>;

  // ============================================
  // Messaging
  // ============================================

  /**
   * Send a message to the AI chat (if available)
   * Used for follow-up questions or context updates
   */
  sendMessage(message: string): void;

  /**
   * Send a message to another widget (via host)
   */
  postMessage(targetWidgetId: string, message: unknown): void;

  // ============================================
  // Host Controls
  // ============================================

  /**
   * Request a display mode change
   */
  requestDisplayMode(mode: DisplayMode): void;

  /**
   * Notify host of widget's intrinsic height (for auto-sizing)
   */
  notifyHeightChange(height: number): void;

  /**
   * Request to close the widget
   */
  requestClose(): void;

  /**
   * Open an external URL (validated by host)
   */
  openExternal(href: string): void;

  // ============================================
  // App Token Management
  // ============================================

  /**
   * Get JWT token for calling a Kiwi App directly
   * Used for direct frontend-to-app communication
   *
   * @param appSlug - The app's slug (e.g., "codegen")
   * @returns Promise resolving to JWT token string
   */
  getAppToken(appSlug: string): Promise<string>;

  // ============================================
  // Event System
  // ============================================

  /**
   * Subscribe to bridge events
   * Returns unsubscribe function
   */
  subscribe(callback: BridgeEventCallback): () => void;

  /**
   * Subscribe to a specific event type
   */
  on(eventType: BridgeEventType, callback: (payload: unknown) => void): () => void;
}

/**
 * Configuration for creating a bridge instance
 */
export interface BridgeConfig {
  appId: string;
  widgetId: string;
  userId: string;
  username?: string;
  classId?: string;
  theme: 'light' | 'dark';
  locale?: string;
  initialState?: WidgetState;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;

  // Callbacks
  onStateChange: (state: WidgetState) => void;
  onToolCall: (toolName: string, params: Record<string, unknown>) => Promise<ToolResult>;
  onToolCallStreaming: (
    toolName: string,
    params: Record<string, unknown>,
    onStream: (chunk: string, isComplete: boolean) => void
  ) => Promise<ToolResult>;
  onMessage: (message: string) => void;
  onDisplayModeRequest: (mode: DisplayMode) => void;
  onClose: () => void;
  onOpenExternal: (href: string) => void;
  /** Optional callback to get app-specific JWT tokens */
  onGetAppToken?: (appSlug: string) => Promise<string>;
}

/**
 * Extend Window interface to include kiwiApp
 */
declare global {
  interface Window {
    kiwiApp?: KiwiAppBridge;
  }
}

// Export empty object to make this a module
export {};
