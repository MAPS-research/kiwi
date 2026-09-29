/**
 * Kiwi Apps Framework - Bridge Provider
 *
 * React context provider that creates and manages the KiwiAppBridge.
 * Injects the bridge into window.kiwiApp and provides React context access.
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
import { useTheme } from '@mui/material/styles';

import {
  createKiwiAppBridge,
  installBridge,
  uninstallBridge,
} from './KiwiAppBridge.ts';
import { useAppRegistry } from '../registry/index.ts';
import { executeTool } from '../host/ToolExecutor.ts';
import type {
  KiwiAppBridge,
  WidgetState,
  ToolResult,
  DisplayMode,
  ToolExecutionContext,
} from '../types/index.ts';

/**
 * Bridge context value
 */
export interface BridgeContextValue {
  /** The bridge instance */
  bridge: KiwiAppBridge | null;

  /** Current widget state */
  widgetState: WidgetState;

  /** Update widget state */
  setWidgetState: (
    updater: WidgetState | ((prev: WidgetState) => WidgetState)
  ) => void;

  /** Call a tool */
  callTool: (
    toolName: string,
    params: Record<string, unknown>
  ) => Promise<ToolResult>;

  /** Call a tool with streaming */
  callToolStreaming: (
    toolName: string,
    params: Record<string, unknown>,
    onStream: (chunk: string, isComplete: boolean) => void
  ) => Promise<ToolResult>;

  /** Send a message to AI chat */
  sendMessage: (message: string) => void;

  /** Current display mode */
  displayMode: DisplayMode;

  /** Request display mode change */
  requestDisplayMode: (mode: DisplayMode) => void;
}

/**
 * Create context with null default
 */
const BridgeContext = createContext<BridgeContextValue | null>(null);

/**
 * Provider props
 */
export interface BridgeProviderProps {
  children: ReactNode;

  /** App ID for this bridge */
  appId: string;

  /** Widget ID for this bridge */
  widgetId: string;

  /** User ID */
  userId: string;

  /** Username */
  username?: string;

  /** Class ID if in class context */
  classId?: string;

  /** Exercise ID if in exercise context */
  exerciseId?: string;

  /** Exercise set ID if in exercise set context */
  exerciseSetId?: string;

  /** Conversation ID for chat context */
  conversationId?: string;

  /** Initial widget state */
  initialState?: WidgetState;

  /** Tool input for the widget */
  toolInput?: Record<string, unknown>;

  /** Tool output for the widget */
  toolOutput?: unknown;

  /** Callback when a message is sent to AI */
  onMessage?: (message: string) => void;

  /** Callback when display mode changes */
  onDisplayModeChange?: (mode: DisplayMode) => void;

  /** Callback when widget requests close */
  onClose?: () => void;

  /** Callback when external URL is opened */
  onOpenExternal?: (href: string) => void;

  /** Custom tool call handler (overrides default) */
  onToolCall?: (
    toolName: string,
    params: Record<string, unknown>
  ) => Promise<ToolResult>;

  /** Custom streaming tool call handler */
  onToolCallStreaming?: (
    toolName: string,
    params: Record<string, unknown>,
    onStream: (chunk: string, isComplete: boolean) => void
  ) => Promise<ToolResult>;
}

/**
 * Bridge Provider component
 *
 * Creates and manages the KiwiAppBridge for a widget.
 * Should wrap each widget instance.
 */
export const BridgeProvider: React.FC<BridgeProviderProps> = ({
  children,
  appId,
  widgetId,
  userId,
  username,
  classId,
  exerciseId,
  exerciseSetId,
  conversationId,
  initialState = {},
  toolInput,
  toolOutput,
  onMessage,
  onDisplayModeChange,
  onClose,
  onOpenExternal,
  onToolCall: customToolCall,
  onToolCallStreaming: customToolCallStreaming,
}) => {
  const theme = useTheme();
  const { findTool } = useAppRegistry();

  // Build execution context for ToolExecutor
  const getExecutionContext = useCallback((): ToolExecutionContext => {
    const token = localStorage.getItem('authToken') ?? '';
    return {
      appId,
      userId,
      username,
      classId,
      exerciseId,
      exerciseSetId,
      conversationId,
      widgetId,
      authToken: token,
    };
  }, [appId, userId, username, classId, exerciseId, exerciseSetId, conversationId, widgetId]);

  // Widget state
  const [widgetState, setWidgetStateInternal] = useState<WidgetState>(initialState);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('expanded');
  const [bridge, setBridge] = useState<KiwiAppBridge | null>(null);

  // Default tool call handler using ToolExecutor
  const defaultToolCall = useCallback(
    async (
      toolName: string,
      params: Record<string, unknown>
    ): Promise<ToolResult> => {
      const toolInfo = findTool(toolName, appId);

      if (!toolInfo) {
        return {
          success: false,
          error: `Tool '${toolName}' not found`,
        };
      }

      const { tool } = toolInfo;

      // Check if widget can access this tool
      if (!tool.allowWidgetAccess) {
        return {
          success: false,
          error: `Tool '${toolName}' is not accessible from widgets`,
        };
      }

      // Use ToolExecutor for all execution types
      const context = getExecutionContext();
      return executeTool({
        toolName,
        params,
        context,
      });
    },
    [appId, findTool, getExecutionContext]
  );

  // Default streaming tool call handler using ToolExecutor
  const defaultToolCallStreaming = useCallback(
    async (
      toolName: string,
      params: Record<string, unknown>,
      onStream: (chunk: string, isComplete: boolean) => void
    ): Promise<ToolResult> => {
      const toolInfo = findTool(toolName, appId);

      if (!toolInfo) {
        return {
          success: false,
          error: `Tool '${toolName}' not found`,
        };
      }

      const { tool } = toolInfo;

      if (!tool.allowWidgetAccess) {
        return {
          success: false,
          error: `Tool '${toolName}' is not accessible from widgets`,
        };
      }

      // Use ToolExecutor for streaming
      const context = getExecutionContext();
      return executeTool({
        toolName,
        params,
        context,
        onStream,
      });
    },
    [appId, findTool, getExecutionContext]
  );

  // Use custom handlers if provided, otherwise defaults
  const toolCallHandler = customToolCall ?? defaultToolCall;
  const toolCallStreamingHandler = customToolCallStreaming ?? defaultToolCallStreaming;

  // State change handler
  const handleStateChange = useCallback((newState: WidgetState) => {
    setWidgetStateInternal(newState);
  }, []);

  // Display mode handler
  const handleDisplayModeRequest = useCallback(
    (mode: DisplayMode) => {
      setDisplayMode(mode);
      onDisplayModeChange?.(mode);
    },
    [onDisplayModeChange]
  );

  // External URL handler with validation
  const handleOpenExternal = useCallback(
    (href: string) => {
      // Validate URL
      try {
        const url = new URL(href);
        // Only allow http/https protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
          console.warn('[BridgeProvider] Invalid protocol for external URL:', url.protocol);
          return;
        }
        onOpenExternal?.(href);
        // Default behavior: open in new tab
        if (!onOpenExternal) {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      } catch {
        console.warn('[BridgeProvider] Invalid external URL:', href);
      }
    },
    [onOpenExternal]
  );

  // Create bridge on mount
  useEffect(() => {
    const newBridge = createKiwiAppBridge({
      appId,
      widgetId,
      userId,
      username,
      classId,
      theme: theme.palette.mode,
      initialState,
      toolInput,
      toolOutput,
      onStateChange: handleStateChange,
      onToolCall: toolCallHandler,
      onToolCallStreaming: toolCallStreamingHandler,
      onMessage: onMessage ?? (() => {}),
      onDisplayModeRequest: handleDisplayModeRequest,
      onClose: onClose ?? (() => {}),
      onOpenExternal: handleOpenExternal,
    });

    // Install into window
    installBridge(newBridge);
    setBridge(newBridge);

    return () => {
      uninstallBridge();
      setBridge(null);
    };
  }, [
    appId,
    widgetId,
    userId,
    username,
    classId,
    theme.palette.mode,
    toolInput,
    toolOutput,
    handleStateChange,
    toolCallHandler,
    toolCallStreamingHandler,
    onMessage,
    handleDisplayModeRequest,
    onClose,
    handleOpenExternal,
  ]);

  // Public state setter
  const setWidgetState = useCallback(
    (updater: WidgetState | ((prev: WidgetState) => WidgetState)) => {
      if (bridge) {
        bridge.setWidgetState(updater);
      } else {
        // Fallback if bridge not ready
        setWidgetStateInternal((prev) =>
          typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
        );
      }
    },
    [bridge]
  );

  // Public tool call
  const callTool = useCallback(
    async (toolName: string, params: Record<string, unknown>) => {
      if (bridge) {
        return bridge.callTool(toolName, params);
      }
      return { success: false, error: 'Bridge not initialized' };
    },
    [bridge]
  );

  // Public streaming tool call
  const callToolStreaming = useCallback(
    async (
      toolName: string,
      params: Record<string, unknown>,
      onStream: (chunk: string, isComplete: boolean) => void
    ) => {
      if (bridge) {
        return bridge.callToolStreaming(toolName, params, onStream);
      }
      return { success: false, error: 'Bridge not initialized' };
    },
    [bridge]
  );

  // Public message sender
  const sendMessage = useCallback(
    (message: string) => {
      if (bridge) {
        bridge.sendMessage(message);
      } else {
        onMessage?.(message);
      }
    },
    [bridge, onMessage]
  );

  // Public display mode requester
  const requestDisplayMode = useCallback(
    (mode: DisplayMode) => {
      if (bridge) {
        bridge.requestDisplayMode(mode);
      } else {
        handleDisplayModeRequest(mode);
      }
    },
    [bridge, handleDisplayModeRequest]
  );

  // Context value
  const contextValue = useMemo<BridgeContextValue>(
    () => ({
      bridge,
      widgetState,
      setWidgetState,
      callTool,
      callToolStreaming,
      sendMessage,
      displayMode,
      requestDisplayMode,
    }),
    [
      bridge,
      widgetState,
      setWidgetState,
      callTool,
      callToolStreaming,
      sendMessage,
      displayMode,
      requestDisplayMode,
    ]
  );

  return (
    <BridgeContext.Provider value={contextValue}>
      {children}
    </BridgeContext.Provider>
  );
};

/**
 * Hook to access the bridge context
 *
 * @throws Error if used outside of BridgeProvider
 */
export function useBridge(): BridgeContextValue {
  const context = useContext(BridgeContext);

  if (!context) {
    throw new Error(
      'useBridge must be used within a BridgeProvider. ' +
        'Make sure your widget is wrapped in <BridgeProvider>.'
    );
  }

  return context;
}

// Export context for advanced use cases
export { BridgeContext };
