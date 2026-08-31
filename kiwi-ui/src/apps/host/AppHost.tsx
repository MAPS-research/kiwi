/**
 * Kiwi Apps Framework - App Host
 *
 * Main host component for rendering app widgets.
 * Manages widget selection, state, and communication.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Tabs, Tab, Typography, CircularProgress } from '@mui/material';

import { useAppRegistry, useApp } from '../registry';
import { WidgetContainer } from './WidgetContainer';
import type {
  WidgetState,
  DisplayMode,
  KiwiWidgetDefinition,
} from '../types';

/**
 * App Host Props
 */
export interface AppHostProps {
  /** App ID to host */
  appId: string;

  /** Initial widget ID to show (defaults to first widget) */
  initialWidgetId?: string;

  /** User ID for bridge */
  userId: string;

  /** Username for bridge */
  username?: string;

  /** Class ID for context */
  classId?: string;

  /** Tool input to pass to widgets */
  toolInput?: Record<string, unknown>;

  /** Tool output to pass to widgets */
  toolOutput?: unknown;

  /** Callback when a message is sent to AI */
  onMessage?: (message: string) => void;

  /** Callback when widget requests close */
  onClose?: () => void;

  /** Whether to show widget tabs (if multiple widgets) */
  showTabs?: boolean;

  /** Custom styles */
  sx?: Record<string, unknown>;
}

/**
 * App Host Component
 *
 * Hosts an app and renders its widgets with proper state management.
 */
export const AppHost: React.FC<AppHostProps> = ({
  appId,
  initialWidgetId,
  userId,
  username,
  classId,
  toolInput,
  toolOutput,
  onMessage,
  onClose,
  showTabs = true,
  sx,
}) => {
  const { isInitialized } = useAppRegistry();
  const app = useApp(appId);

  // Widget selection state
  const widgets = app?.manifest.widgets ?? [];
  const [activeWidgetId, setActiveWidgetId] = useState<string | undefined>(
    initialWidgetId || widgets[0]?.id
  );

  // Widget states (persisted across tab changes)
  const [widgetStates, setWidgetStates] = useState<Record<string, WidgetState>>({});

  // Display mode state
  const [displayMode, setDisplayMode] = useState<DisplayMode>('expanded');

  // Get active widget
  const activeWidget = useMemo(() => {
    return widgets.find((w) => w.id === activeWidgetId);
  }, [widgets, activeWidgetId]);

  // Handle widget state change
  const handleStateChange = useCallback((widgetId: string) => {
    return (state: WidgetState) => {
      setWidgetStates((prev) => ({
        ...prev,
        [widgetId]: state,
      }));
    };
  }, []);

  // Handle display mode change
  const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
    setDisplayMode(mode);
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: string) => {
    setActiveWidgetId(newValue);
  }, []);

  // Loading state
  if (!isInitialized) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          ...sx,
        }}
      >
        <CircularProgress size={32} />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Initializing apps...
        </Typography>
      </Box>
    );
  }

  // App not found
  if (!app) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          ...sx,
        }}
      >
        <Typography color="error">
          App '{appId}' not found
        </Typography>
      </Box>
    );
  }

  // App not active
  if (app.status !== 'active') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          ...sx,
        }}
      >
        <Typography color="text.secondary">
          App '{app.manifest.name}' is not active (status: {app.status})
        </Typography>
      </Box>
    );
  }

  // No widgets
  if (widgets.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          ...sx,
        }}
      >
        <Typography color="text.secondary">
          App '{app.manifest.name}' has no widgets
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        ...sx,
      }}
    >
      {/* Widget tabs (if multiple widgets and showTabs is true) */}
      {showTabs && widgets.length > 1 && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeWidgetId}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {widgets.map((widget) => (
              <Tab
                key={widget.id}
                value={widget.id}
                label={widget.name}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Widget container */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {activeWidget && (
          <WidgetContainer
            key={activeWidget.id}
            widget={activeWidget}
            appId={appId}
            userId={userId}
            username={username}
            classId={classId}
            initialState={widgetStates[activeWidget.id]}
            toolInput={toolInput}
            toolOutput={toolOutput}
            onStateChange={handleStateChange(activeWidget.id)}
            onDisplayModeChange={handleDisplayModeChange}
            onMessage={onMessage}
            onClose={onClose}
          />
        )}
      </Box>
    </Box>
  );
};

/**
 * Simple widget renderer for a single widget without tabs
 */
export interface SingleWidgetHostProps {
  /** App ID */
  appId: string;

  /** Widget ID to render */
  widgetId: string;

  /** User ID for bridge */
  userId: string;

  /** Username for bridge */
  username?: string;

  /** Class ID for context */
  classId?: string;

  /** Tool input */
  toolInput?: Record<string, unknown>;

  /** Tool output */
  toolOutput?: unknown;

  /** Message callback */
  onMessage?: (message: string) => void;

  /** Close callback */
  onClose?: () => void;

  /** Custom styles */
  sx?: Record<string, unknown>;
}

export const SingleWidgetHost: React.FC<SingleWidgetHostProps> = ({
  appId,
  widgetId,
  userId,
  username,
  classId,
  toolInput,
  toolOutput,
  onMessage,
  onClose,
  sx,
}) => {
  const app = useApp(appId);
  const [widgetState, setWidgetState] = useState<WidgetState>({});

  const widget = app?.manifest.widgets.find((w) => w.id === widgetId);

  if (!app || !widget) {
    return (
      <Box sx={{ p: 2, ...sx }}>
        <Typography color="error">
          Widget not found: {appId}/{widgetId}
        </Typography>
      </Box>
    );
  }

  return (
    <WidgetContainer
      widget={widget}
      appId={appId}
      userId={userId}
      username={username}
      classId={classId}
      initialState={widgetState}
      toolInput={toolInput}
      toolOutput={toolOutput}
      onStateChange={setWidgetState}
      onMessage={onMessage}
      onClose={onClose}
      sx={sx}
    />
  );
};

export default AppHost;
