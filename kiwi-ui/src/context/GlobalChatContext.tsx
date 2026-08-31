import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EnvironmentContextActiveTabEnum } from '../services/models/EnvironmentContext';

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * Display mode for the chat interface
 */
export type ChatDisplayMode = 'modal' | 'fullscreen' | 'sidepanel' | 'snap';

/**
 * Chat preferences stored in localStorage
 */
interface ChatPreferences {
  lastDisplayMode: ChatDisplayMode;
  modeSource: 'user' | 'default';
  timestamp: number;
}

/**
 * Global chat state
 */
interface GlobalChatState {
  isOpen: boolean;
  displayMode: ChatDisplayMode;
  displayModeSource: 'user' | 'app' | 'default';
  appPreferredMode?: ChatDisplayMode;
  // Width of the chat panel in snap/sidepanel modes, user-resizable by
  // dragging the panel's left edge. Persisted to localStorage.
  panelWidth: number;
  // True while the user is dragging the resize handle — consumers disable
  // width transitions so the drag tracks the cursor instead of lagging.
  isResizingPanel: boolean;
  messages: ChatMessage[];
  // Location context (updated by routes)
  currentClassId?: string;
  currentPdfId?: string;
  currentPdfPage?: number;
  currentPdfMaterialType?: string;
  pdfContent?: string;
  // Environment context for AI
  activeTab: EnvironmentContextActiveTabEnum;
  // Sub-view within the active tab (e.g. 'code' for the IDE) — a free-form label
  // the backend can use for finer environment awareness than activeTab alone.
  activeView?: string;
  currentPath?: string;
  activeAppSlug?: string;
  activeAppName?: string;
  // App context (from kiwi:updateContext when on app page)
  appContext?: string;
  // Tutoring mode requested by the app (e.g. 'guidance' → Socratic hints instead
  // of direct answers), from kiwi:updateContext.
  appTutoringMode?: string;
  // Pending prompt from IDE or other sources
  pendingPrompt?: string;
  // Pending code to import into the IDE (from a chat "Import Code to IDE" click)
  pendingCode?: string;
}

/**
 * Context value type
 */
interface GlobalChatContextValue extends GlobalChatState {
  // Modal controls
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setDisplayMode: (mode: ChatDisplayMode) => void;
  setDisplayModeAsUser: (mode: ChatDisplayMode) => void;
  setAppPreferredMode: (mode: ChatDisplayMode | undefined) => void;
  cycleDisplayMode: () => void;
  setPanelWidth: (width: number) => void;
  setIsResizingPanel: (resizing: boolean) => void;

  // Message management
  addMessage: (message: Omit<ChatMessage, 'timestamp'>) => void;
  clearMessages: () => void;

  // Location context setters (called by routes)
  setCurrentClassId: (classId: string | undefined) => void;
  setCurrentPdfId: (pdfId: string | undefined) => void;
  setCurrentPdfPage: (page: number | undefined) => void;
  setCurrentPdfMaterialType: (materialType: string | undefined) => void;
  setPdfContent: (content: string | undefined) => void;

  // Environment context setters (called by routes)
  setActiveTab: (tab: EnvironmentContextActiveTabEnum) => void;
  setActiveView: (view: string | undefined) => void;
  setCurrentPath: (path: string | undefined) => void;
  setActiveAppSlug: (slug: string | undefined) => void;
  setActiveAppName: (name: string | undefined) => void;

  // App context (from kiwi:updateContext)
  setAppContext: (context: string | undefined) => void;

  // App tutoring mode (from kiwi:updateContext)
  setAppTutoringMode: (mode: string | undefined) => void;

  // Pending prompt (from IDE export code, etc.)
  setPendingPrompt: (prompt: string | undefined) => void;
  clearPendingPrompt: () => void;

  // Pending code (from a chat "Import Code to IDE" click)
  setPendingCode: (code: string | undefined) => void;
  clearPendingCode: () => void;
}

const GlobalChatContext = createContext<GlobalChatContextValue | undefined>(undefined);

const SESSION_STORAGE_KEY = 'globalChatMessages';
const PREFERENCES_STORAGE_KEY = 'globalChatPreferences';
const PANEL_WIDTH_STORAGE_KEY = 'globalChatPanelWidth';

export const DEFAULT_PANEL_WIDTH = 420;
export const MIN_PANEL_WIDTH = 320;
export const MAX_PANEL_WIDTH = 800;

/**
 * Load the persisted snap/sidepanel width from localStorage
 */
function loadPanelWidth(): number {
  try {
    const stored = Number(localStorage.getItem(PANEL_WIDTH_STORAGE_KEY));
    if (Number.isFinite(stored) && stored >= MIN_PANEL_WIDTH) {
      return Math.min(stored, MAX_PANEL_WIDTH);
    }
  } catch (error) {
    console.warn('[GlobalChatContext] Failed to load panel width:', error);
  }
  return DEFAULT_PANEL_WIDTH;
}

/**
 * Load messages from sessionStorage
 */
function loadMessagesFromStorage(): ChatMessage[] {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('[GlobalChatContext] Failed to load messages from storage:', error);
  }
  return [];
}

/**
 * Save messages to sessionStorage
 */
function saveMessagesToStorage(messages: ChatMessage[]): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.warn('[GlobalChatContext] Failed to save messages to storage:', error);
  }
}

/**
 * Load preferences from localStorage
 */
function loadPreferencesFromStorage(): ChatPreferences | null {
  try {
    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('[GlobalChatContext] Failed to load preferences:', error);
  }
  return null;
}

/**
 * Save preferences to localStorage
 */
function savePreferencesToStorage(preferences: ChatPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('[GlobalChatContext] Failed to save preferences:', error);
  }
}

interface GlobalChatProviderProps {
  children: ReactNode;
}

export const GlobalChatProvider: React.FC<GlobalChatProviderProps> = ({ children }) => {
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<ChatDisplayMode>('modal');
  const [displayModeSource, setDisplayModeSource] = useState<'user' | 'app' | 'default'>('default');
  const [appPreferredMode, setAppPreferredMode] = useState<ChatDisplayMode | undefined>();

  // Snap/sidepanel width (user-resizable, persisted)
  const [panelWidth, setPanelWidthState] = useState<number>(() => loadPanelWidth());
  const [isResizingPanel, setIsResizingPanel] = useState(false);

  const setPanelWidth = useCallback((width: number) => {
    setPanelWidthState(
      Math.max(MIN_PANEL_WIDTH, Math.min(Math.round(width), MAX_PANEL_WIDTH))
    );
  }, []);

  // Persist panel width, debounced so drags don't write on every pointer move.
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(panelWidth));
      } catch (error) {
        console.warn('[GlobalChatContext] Failed to save panel width:', error);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [panelWidth]);

  // Messages (persisted to sessionStorage)
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessagesFromStorage());

  // Location context (set by routes)
  const [currentClassId, setCurrentClassId] = useState<string | undefined>();
  const [currentPdfId, setCurrentPdfId] = useState<string | undefined>();
  const [currentPdfPage, setCurrentPdfPage] = useState<number | undefined>();
  const [currentPdfMaterialType, setCurrentPdfMaterialType] = useState<string | undefined>();
  const [pdfContent, setPdfContent] = useState<string | undefined>();

  // Environment context (set by routes)
  const [activeTab, setActiveTab] = useState<EnvironmentContextActiveTabEnum>('materials');
  const [activeView, setActiveView] = useState<string | undefined>();
  const [currentPath, setCurrentPath] = useState<string | undefined>();
  const [activeAppSlug, setActiveAppSlug] = useState<string | undefined>();
  const [activeAppName, setActiveAppName] = useState<string | undefined>();

  // App context (from kiwi:updateContext when on app page)
  const [appContext, setAppContext] = useState<string | undefined>();

  // App tutoring mode (from kiwi:updateContext when on app page)
  const [appTutoringMode, setAppTutoringMode] = useState<string | undefined>();

  // Pending prompt (from IDE export code, etc.)
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>();
  const clearPendingPrompt = useCallback(() => setPendingPrompt(undefined), []);

  // Pending code to import into the IDE (from a chat "Import Code to IDE" click)
  const [pendingCode, setPendingCode] = useState<string | undefined>();
  const clearPendingCode = useCallback(() => setPendingCode(undefined), []);

  // Persist messages to sessionStorage when they change
  useEffect(() => {
    saveMessagesToStorage(messages);
  }, [messages]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const prefs = loadPreferencesFromStorage();
    if (prefs && prefs.modeSource === 'user') {
      setDisplayMode(prefs.lastDisplayMode);
      setDisplayModeSource('user');
    }
  }, []);

  // Modal controls
  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  const cycleDisplayMode = useCallback(() => {
    setDisplayMode((prev) => {
      const modes: ChatDisplayMode[] = ['modal', 'sidepanel', 'snap', 'fullscreen'];
      const currentIndex = modes.indexOf(prev);
      return modes[(currentIndex + 1) % modes.length];
    });
  }, []);

  const setDisplayModeAsUser = useCallback((mode: ChatDisplayMode) => {
    setDisplayMode(mode);
    setDisplayModeSource('user');
    savePreferencesToStorage({
      lastDisplayMode: mode,
      modeSource: 'user',
      timestamp: Date.now(),
    });
  }, []);

  const setAppPreferredModeCallback = useCallback((mode: ChatDisplayMode | undefined) => {
    setAppPreferredMode(mode);
    // Only apply if user hasn't set a preference
    if (mode && displayModeSource !== 'user') {
      setDisplayMode(mode);
      setDisplayModeSource('app');
    }
  }, [displayModeSource]);

  // Message management
  const addMessage = useCallback((message: Omit<ChatMessage, 'timestamp'>) => {
    setMessages((prev) => [...prev, { ...message, timestamp: Date.now() }]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const value: GlobalChatContextValue = {
    // State
    isOpen,
    displayMode,
    displayModeSource,
    appPreferredMode,
    panelWidth,
    isResizingPanel,
    messages,
    currentClassId,
    currentPdfId,
    currentPdfPage,
    currentPdfMaterialType,
    pdfContent,
    activeTab,
    activeView,
    currentPath,
    activeAppSlug,
    activeAppName,
    appContext,
    appTutoringMode,
    pendingPrompt,
    pendingCode,

    // Modal controls
    openChat,
    closeChat,
    toggleChat,
    setDisplayMode,
    setDisplayModeAsUser,
    setAppPreferredMode: setAppPreferredModeCallback,
    cycleDisplayMode,
    setPanelWidth,
    setIsResizingPanel,

    // Message management
    addMessage,
    clearMessages,

    // Location context setters
    setCurrentClassId,
    setCurrentPdfId,
    setCurrentPdfPage,
    setCurrentPdfMaterialType,
    setPdfContent,

    // Environment context setters
    setActiveTab,
    setActiveView,
    setCurrentPath,
    setActiveAppSlug,
    setActiveAppName,

    // App context
    setAppContext,
    setAppTutoringMode,

    // Pending prompt
    setPendingPrompt,
    clearPendingPrompt,

    // Pending code
    setPendingCode,
    clearPendingCode,
  };

  return (
    <GlobalChatContext.Provider value={value}>
      {children}
    </GlobalChatContext.Provider>
  );
};

/**
 * Hook to access global chat context
 */
export function useGlobalChat(): GlobalChatContextValue {
  const context = useContext(GlobalChatContext);
  if (!context) {
    throw new Error('useGlobalChat must be used within a GlobalChatProvider');
  }
  return context;
}

/**
 * Hook to get navigation function for chat (use inside Router)
 */
export function useGlobalChatNavigation() {
  const navigate = useNavigate();
  const { currentClassId } = useGlobalChat();

  const navigateTo = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const navigateToPdf = useCallback((pdfId: string, page?: number) => {
    if (currentClassId) {
      const url = page
        ? `/${currentClassId}?pdfId=${pdfId}&page=${page}`
        : `/${currentClassId}?pdfId=${pdfId}`;
      navigate(url);
    }
  }, [navigate, currentClassId]);

  return {
    navigateTo,
    navigateToPdf,
  };
}

export default GlobalChatContext;
