/**
 * Kiwi Apps Framework - Widget Container
 *
 * Container component for rendering a single widget.
 * Handles error boundaries, loading states, and layout.
 */

import React, { Suspense, Component, type ReactNode, type ErrorInfo } from 'react';
import { Box, CircularProgress, Typography, Button, Paper } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

import { BridgeProvider } from '../bridge/index.ts';
import type {
  KiwiWidgetDefinition,
  WidgetState,
  WidgetPosition,
  DisplayMode,
} from '../types/index.ts';

/**
 * Error boundary for widgets
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WidgetErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void; widgetName: string },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onReset?: () => void; widgetName: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[WidgetContainer] Error in widget ${this.props.widgetName}:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Paper
          sx={{
            p: 3,
            textAlign: 'center',
            bgcolor: 'error.light',
            color: 'error.contrastText',
          }}
        >
          <ErrorIcon sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Widget Error
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
            {this.state.error?.message || 'An error occurred in the widget'}
          </Typography>
          <Button
            variant="contained"
            color="inherit"
            startIcon={<RefreshIcon />}
            onClick={this.handleReset}
          >
            Retry
          </Button>
        </Paper>
      );
    }

    return this.props.children;
  }
}

/**
 * Loading fallback component
 */
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading widget...' }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 4,
      minHeight: 200,
    }}
  >
    <CircularProgress size={32} />
    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
      {message}
    </Typography>
  </Box>
);

/**
 * Widget Container Props
 */
export interface WidgetContainerProps {
  /** Widget definition */
  widget: KiwiWidgetDefinition;

  /** App ID that owns this widget */
  appId: string;

  /** Unique instance ID for this widget instance */
  instanceId?: string;

  /** User ID for bridge */
  userId: string;

  /** Username for bridge */
  username?: string;

  /** Class ID for context */
  classId?: string;

  /** Initial widget state */
  initialState?: WidgetState;

  /** Tool input for the widget */
  toolInput?: Record<string, unknown>;

  /** Tool output for the widget */
  toolOutput?: unknown;

  /** Callback when widget state changes */
  onStateChange?: (state: WidgetState) => void;

  /** Callback when display mode is requested */
  onDisplayModeChange?: (mode: DisplayMode) => void;

  /** Callback when widget sends a message to AI */
  onMessage?: (message: string) => void;

  /** Callback when widget requests close */
  onClose?: () => void;

  /** Custom styles */
  sx?: Record<string, unknown>;
}

/**
 * Widget Container Component
 *
 * Renders a widget with proper error handling, loading states, and bridge setup.
 */
export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  appId,
  instanceId,
  userId,
  username,
  classId,
  initialState,
  toolInput,
  toolOutput,
  onStateChange,
  onDisplayModeChange,
  onMessage,
  onClose,
  sx,
}) => {
  const widgetId = instanceId || widget.id;
  const WidgetComponent = widget.component;

  // Calculate container styles based on layout
  const containerStyles = {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    ...getLayoutStyles(widget.layout.position),
    ...sx,
  };

  return (
    <Box sx={containerStyles}>
      <WidgetErrorBoundary widgetName={widget.name}>
        <BridgeProvider
          appId={appId}
          widgetId={widgetId}
          userId={userId}
          username={username}
          classId={classId}
          initialState={initialState}
          toolInput={toolInput}
          toolOutput={toolOutput}
          onMessage={onMessage}
          onDisplayModeChange={onDisplayModeChange}
          onClose={onClose}
        >
          <Suspense fallback={<LoadingFallback message={`Loading ${widget.name}...`} />}>
            <WidgetComponent
              appId={appId}
              widgetId={widgetId}
              initialState={initialState}
              toolInput={toolInput}
              toolOutput={toolOutput}
              onStateChange={onStateChange}
              onDisplayModeRequest={onDisplayModeChange}
            />
          </Suspense>
        </BridgeProvider>
      </WidgetErrorBoundary>
    </Box>
  );
};

/**
 * Get container styles based on widget position
 */
function getLayoutStyles(position?: WidgetPosition): Record<string, unknown> {
  switch (position) {
    case 'modal':
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1300,
        maxWidth: '90vw',
        maxHeight: '90vh',
        boxShadow: 24,
        borderRadius: 2,
        bgcolor: 'background.paper',
      };
    case 'fullscreen':
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1200,
        bgcolor: 'background.paper',
      };
    case 'inline':
      return {
        display: 'inline-block',
      };
    case 'panel':
    default:
      return {
        display: 'flex',
        flexDirection: 'column',
      };
  }
}

export default WidgetContainer;
