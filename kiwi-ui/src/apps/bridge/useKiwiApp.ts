/**
 * Kiwi Apps Framework - useKiwiApp Hook
 *
 * Primary hook for widgets to access the Kiwi App bridge.
 * Provides reactive access to bridge state and methods.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useBridge, type BridgeContextValue } from './BridgeProvider';
import { getBridge } from './KiwiAppBridge';
import type {
  KiwiAppBridge,
  WidgetState,
  ToolResult,
  DisplayMode,
  BridgeEventType,
} from '../types';

/**
 * Primary hook for widgets to interact with the Kiwi App framework
 *
 * This hook provides the main interface for widgets:
 * - Access to widget state
 * - Tool invocation
 * - Messaging
 * - Display mode control
 *
 * @example
 * ```tsx
 * function MyWidget() {
 *   const { widgetState, setWidgetState, callTool } = useKiwiApp();
 *
 *   const handleClick = async () => {
 *     const result = await callTool('my_tool', { param: 'value' });
 *     if (result.success) {
 *       setWidgetState({ lastResult: result.data });
 *     }
 *   };
 *
 *   return <button onClick={handleClick}>Run Tool</button>;
 * }
 * ```
 */
export function useKiwiApp(): BridgeContextValue {
  return useBridge();
}

/**
 * Hook to access the raw bridge instance
 *
 * Use this when you need direct access to the bridge object,
 * for example to access read-only properties like appId, user, etc.
 */
export function useKiwiAppBridge(): KiwiAppBridge | null {
  const { bridge } = useBridge();
  return bridge;
}

/**
 * Hook to access widget state reactively
 *
 * @example
 * ```tsx
 * function MyWidget() {
 *   const [state, setState] = useWidgetState({ count: 0 });
 *
 *   return (
 *     <button onClick={() => setState({ count: state.count + 1 })}>
 *       Count: {state.count}
 *     </button>
 *   );
 * }
 * ```
 */
export function useWidgetState<T extends WidgetState>(
  defaultState?: T
): [T, (updater: T | ((prev: T) => T)) => void] {
  const { widgetState, setWidgetState } = useBridge();

  // Merge with default state
  const state = { ...defaultState, ...widgetState } as T;

  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setWidgetState(updater as WidgetState | ((prev: WidgetState) => WidgetState));
    },
    [setWidgetState]
  );

  return [state, setState];
}

/**
 * Hook to call a tool
 *
 * @example
 * ```tsx
 * function MyWidget() {
 *   const callTool = useToolCall();
 *
 *   const handleSubmit = async () => {
 *     const result = await callTool('submit_code', { code: 'print("hello")' });
 *   };
 * }
 * ```
 */
export function useToolCall(): (
  toolName: string,
  params: Record<string, unknown>
) => Promise<ToolResult> {
  const { callTool } = useBridge();
  return callTool;
}

/**
 * Hook to call a streaming tool
 *
 * @example
 * ```tsx
 * function MyWidget() {
 *   const [output, setOutput] = useState('');
 *   const callStreaming = useStreamingToolCall();
 *
 *   const handleAsk = async () => {
 *     await callStreaming('get_hints', { question: 'help' }, (chunk, done) => {
 *       setOutput(prev => prev + chunk);
 *     });
 *   };
 * }
 * ```
 */
export function useStreamingToolCall(): (
  toolName: string,
  params: Record<string, unknown>,
  onStream: (chunk: string, isComplete: boolean) => void
) => Promise<ToolResult> {
  const { callToolStreaming } = useBridge();
  return callToolStreaming;
}

/**
 * Hook to send messages to the AI chat
 */
export function useSendMessage(): (message: string) => void {
  const { sendMessage } = useBridge();
  return sendMessage;
}

/**
 * Hook to manage display mode
 */
export function useDisplayMode(): [DisplayMode, (mode: DisplayMode) => void] {
  const { displayMode, requestDisplayMode } = useBridge();
  return [displayMode, requestDisplayMode];
}

/**
 * Hook to subscribe to bridge events
 *
 * @example
 * ```tsx
 * function MyWidget() {
 *   useBridgeEvent('tool_result', (payload) => {
 *     console.log('Tool result:', payload);
 *   });
 * }
 * ```
 */
export function useBridgeEvent(
  eventType: BridgeEventType,
  callback: (payload: unknown) => void
): void {
  const { bridge } = useBridge();

  useEffect(() => {
    if (!bridge) return;

    const unsubscribe = bridge.on(eventType, callback);
    return unsubscribe;
  }, [bridge, eventType, callback]);
}

/**
 * Hook to access app context info
 *
 * @example
 * ```tsx
 * function MyWidget() {
 *   const { appId, user, theme, classId } = useAppContext();
 *   return <div>Welcome, {user?.username}</div>;
 * }
 * ```
 */
export function useAppContext(): {
  appId: string | undefined;
  widgetId: string | undefined;
  user: { id: string; username: string } | null;
  theme: 'light' | 'dark';
  classId: string | undefined;
  locale: string;
} {
  const { bridge } = useBridge();

  return {
    appId: bridge?.appId,
    widgetId: bridge?.widgetId,
    user: bridge?.user ?? null,
    theme: bridge?.theme ?? 'light',
    classId: bridge?.classId,
    locale: bridge?.locale ?? 'en-US',
  };
}

/**
 * Hook to access tool input passed to the widget
 */
export function useToolInput<T = Record<string, unknown>>(): T | undefined {
  const { bridge } = useBridge();
  return bridge?.toolInput as T | undefined;
}

/**
 * Hook to access tool output from the last tool call
 */
export function useToolOutput<T = unknown>(): T | undefined {
  const { bridge } = useBridge();
  return bridge?.toolOutput as T | undefined;
}

/**
 * Fallback hook that works without BridgeProvider
 * Uses window.kiwiApp directly with useSyncExternalStore
 *
 * Useful for components that might be rendered outside the provider
 */
export function useKiwiAppGlobal<K extends keyof KiwiAppBridge>(
  key: K
): KiwiAppBridge[K] | undefined {
  return useSyncExternalStore(
    (onChange) => {
      // Check for bridge changes periodically
      const interval = setInterval(() => {
        onChange();
      }, 100);

      return () => clearInterval(interval);
    },
    () => {
      const bridge = getBridge();
      return bridge?.[key];
    },
    () => undefined
  );
}
