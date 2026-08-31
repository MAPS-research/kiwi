/**
 * Widget System Types
 *
 * Types for widget state persistence and user preferences.
 * Widgets themselves are React components defined in the frontend (kiwi-ui).
 */

// Display mode for widgets (matches frontend KiwiAppBridge)
export type DisplayMode = 'compact' | 'expanded' | 'fullscreen';

// Theme options
export type Theme = 'light' | 'dark' | 'system';

/**
 * Widget state data structure (matches frontend WidgetState)
 */
export interface WidgetStateData {
  appId: string;
  widgetId: string;
  widgetState: Record<string, any>;
  conversationId?: string;
  messageId?: string;
  classId?: string;
  exerciseId?: string;
  exerciseSetId?: string;
  displayMode?: DisplayMode;
}

/**
 * User preferences for widgets
 */
export interface UserPreferences {
  theme: Theme;
  codeEditorTheme: string;
  codeEditorFontSize: number;
  appPreferences: Record<string, any>;
}

/**
 * Per-app preference structure
 * Each app can define its own preference schema
 */
export interface CodegenAppPreferences {
  autoSave?: boolean;
  autoSaveIntervalMs?: number;
  showLineNumbers?: boolean;
  wordWrap?: boolean;
  tabSize?: number;
}
