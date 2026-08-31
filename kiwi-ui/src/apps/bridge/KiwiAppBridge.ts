/**
 * Kiwi Apps Framework - Bridge Implementation
 *
 * Creates the window.kiwiApp bridge interface for widget-host communication.
 * Follows OpenAI's window.openai pattern.
 */

import type {
  KiwiAppBridge,
  BridgeConfig,
  BridgeEvent,
  BridgeEventCallback,
  BridgeEventType,
  DisplayMode,
  WidgetState,
  ToolResult,
} from '../types';

/**
 * Create a KiwiAppBridge instance
 *
 * This function creates the bridge object that will be exposed as window.kiwiApp.
 * It handles all widget-host communication.
 */
export function createKiwiAppBridge(config: BridgeConfig): KiwiAppBridge {
  // Internal state
  let widgetState: WidgetState = config.initialState ?? {};
  let currentDisplayMode: DisplayMode = 'expanded';
  let toolOutput: unknown = config.toolOutput;
  const listeners = new Map<BridgeEventType | '*', Set<BridgeEventCallback>>();

  /**
   * Emit an event to all subscribers
   */
  const emitEvent = (type: BridgeEventType, payload: unknown): void => {
    const event: BridgeEvent = {
      type,
      payload,
      timestamp: Date.now(),
    };

    // Notify type-specific listeners
    listeners.get(type)?.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error(`[KiwiAppBridge] Event listener error for ${type}:`, err);
      }
    });

    // Notify wildcard listeners
    listeners.get('*')?.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error('[KiwiAppBridge] Wildcard listener error:', err);
      }
    });
  };

  /**
   * The bridge object
   */
  const bridge: KiwiAppBridge = {
    // ============================================
    // Context & Data (Read-only via getters)
    // ============================================

    get appId() {
      return config.appId;
    },

    get widgetId() {
      return config.widgetId;
    },

    get toolInput() {
      return config.toolInput;
    },

    get toolOutput() {
      return toolOutput;
    },

    get theme() {
      return config.theme;
    },

    get displayMode() {
      return currentDisplayMode;
    },

    get user() {
      return config.userId
        ? {
            id: config.userId,
            username: config.username ?? config.userId,
          }
        : null;
    },

    get classId() {
      return config.classId;
    },

    get locale() {
      return config.locale ?? navigator.language ?? 'en-US';
    },

    // ============================================
    // State Management
    // ============================================

    getWidgetState(): WidgetState {
      return { ...widgetState };
    },

    setWidgetState(
      updater: WidgetState | ((prevState: WidgetState) => WidgetState)
    ): void {
      const newState =
        typeof updater === 'function' ? updater(widgetState) : updater;

      widgetState = { ...widgetState, ...newState };

      // Notify host of state change
      config.onStateChange(widgetState);

      // Emit event
      emitEvent('state_changed', widgetState);
    },

    // ============================================
    // Tool Invocation
    // ============================================

    async callTool(
      toolName: string,
      params: Record<string, unknown>
    ): Promise<ToolResult> {
      try {
        const result = await config.onToolCall(toolName, params);

        // Store tool output
        if (result.success && result.data !== undefined) {
          toolOutput = result.data;
        }

        // Emit event
        emitEvent('tool_result', { toolName, params, result });

        return result;
      } catch (err) {
        const errorResult: ToolResult = {
          success: false,
          error: err instanceof Error ? err.message : 'Tool call failed',
        };

        emitEvent('tool_result', { toolName, params, result: errorResult });

        return errorResult;
      }
    },

    async callToolStreaming(
      toolName: string,
      params: Record<string, unknown>,
      onStream: (chunk: string, isComplete: boolean) => void
    ): Promise<ToolResult> {
      try {
        const result = await config.onToolCallStreaming(
          toolName,
          params,
          onStream
        );

        // Store tool output
        if (result.success && result.data !== undefined) {
          toolOutput = result.data;
        }

        // Emit event
        emitEvent('tool_result', { toolName, params, result, streaming: true });

        return result;
      } catch (err) {
        const errorResult: ToolResult = {
          success: false,
          error: err instanceof Error ? err.message : 'Streaming tool call failed',
        };

        emitEvent('tool_result', { toolName, params, result: errorResult });

        return errorResult;
      }
    },

    // ============================================
    // Messaging
    // ============================================

    sendMessage(message: string): void {
      config.onMessage(message);
    },

    postMessage(targetWidgetId: string, message: unknown): void {
      // TODO: Implement cross-widget messaging via host
      console.log(
        `[KiwiAppBridge] postMessage to ${targetWidgetId}:`,
        message
      );
    },

    // ============================================
    // Host Controls
    // ============================================

    requestDisplayMode(mode: DisplayMode): void {
      currentDisplayMode = mode;
      config.onDisplayModeRequest(mode);
      emitEvent('display_mode_changed', mode);
    },

    notifyHeightChange(height: number): void {
      // Host can use this for auto-sizing
      console.log(`[KiwiAppBridge] Height changed: ${height}px`);
    },

    requestClose(): void {
      config.onClose();
    },

    openExternal(href: string): void {
      config.onOpenExternal(href);
    },

    // ============================================
    // App Token Management
    // ============================================

    async getAppToken(appSlug: string): Promise<string> {
      // Use custom handler if provided
      if (config.onGetAppToken) {
        return config.onGetAppToken(appSlug);
      }

      // Default: return current auth token from localStorage
      // This works for apps that share the same JWT auth
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('[KiwiAppBridge] No auth token found for app:', appSlug);
        return '';
      }
      return token;
    },

    // ============================================
    // Event System
    // ============================================

    subscribe(callback: BridgeEventCallback): () => void {
      if (!listeners.has('*')) {
        listeners.set('*', new Set());
      }
      listeners.get('*')!.add(callback);

      return () => {
        listeners.get('*')?.delete(callback);
      };
    },

    on(
      eventType: BridgeEventType,
      callback: (payload: unknown) => void
    ): () => void {
      if (!listeners.has(eventType)) {
        listeners.set(eventType, new Set());
      }

      const wrappedCallback: BridgeEventCallback = (event) => {
        callback(event.payload);
      };

      listeners.get(eventType)!.add(wrappedCallback);

      return () => {
        listeners.get(eventType)?.delete(wrappedCallback);
      };
    },
  };

  return bridge;
}

/**
 * Install bridge into window object
 */
export function installBridge(bridge: KiwiAppBridge): void {
  window.kiwiApp = bridge;
  console.log('[KiwiAppBridge] Installed as window.kiwiApp');
}

/**
 * Uninstall bridge from window object
 */
export function uninstallBridge(): void {
  delete window.kiwiApp;
  console.log('[KiwiAppBridge] Uninstalled from window.kiwiApp');
}

/**
 * Check if bridge is installed
 */
export function isBridgeInstalled(): boolean {
  return typeof window !== 'undefined' && window.kiwiApp !== undefined;
}

/**
 * Get current bridge instance
 */
export function getBridge(): KiwiAppBridge | undefined {
  return window.kiwiApp;
}
