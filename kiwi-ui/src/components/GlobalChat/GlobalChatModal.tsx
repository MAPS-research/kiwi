import CloseIcon from '@mui/icons-material/Close';
import DockIcon from '@mui/icons-material/Dock';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import WebAssetIcon from '@mui/icons-material/WebAsset';
import {
  Box,
  IconButton,
  Paper,
  Portal,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useId, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChatDisplayMode } from '../../context/GlobalChatContext.tsx';
import { MAX_PANEL_WIDTH, MIN_PANEL_WIDTH, useGlobalChat } from '../../context/GlobalChatContext.tsx';
import type { NavigationAction } from '../../services/models/NavigationAction.ts';
import ChatCore from '../Chat/ChatCore.tsx';
import { TOP_NAV_HEIGHT } from '../TopNav/TopNav.tsx';

// Keep at least this much page content visible when dragging the panel wider
// in snap mode.
const MIN_CONTENT_WIDTH = 320;

/**
 * Global chat modal that can be opened from anywhere in the app.
 * Supports three display modes: modal, fullscreen, and sidepanel.
 * Uses a single container approach to preserve ChatCore state across mode switches.
 */
export const GlobalChatModal: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const {
    isOpen,
    displayMode,
    displayModeSource,
    closeChat,
    setDisplayMode,
    setDisplayModeAsUser,
    panelWidth,
    setPanelWidth,
    isResizingPanel,
    setIsResizingPanel,
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
    clearPendingPrompt,
    setPendingCode,
  } = useGlobalChat();

  // Handle navigation actions from AI tool responses
  const handleNavigate = useCallback((action: NavigationAction) => {
    if (!currentClassId) {
      console.warn('[GlobalChatModal] No class context for navigation');
      return;
    }

    switch (action.targetTab) {
      case 'materials':
        if (action.pdfId) {
          const pageParam = action.pageNumber ? `&page=${action.pageNumber}` : '';
          navigate(`/${currentClassId}?pdfId=${action.pdfId}${pageParam}`);
        } else {
          navigate(`/${currentClassId}`);
        }
        break;
      case 'app':
        if (action.appSlug) {
          navigate(`/${currentClassId}/app/${action.appSlug}`);
        }
        break;
      case 'dashboard':
        navigate(`/${currentClassId}`);
        break;
      case 'chat':
        break;
    }
  }, [currentClassId, navigate]);

  // Handle "Import Code to IDE" from a chat code block. The IDE (Code tab) reads
  // pendingCode into its editor, so we stash the code, navigate to the Code tab,
  // and close the chat so the editor is visible (fixes #177 — this was a no-op
  // from the global chat because the IDE lives on a separate route).
  const handleImportCode = useCallback((code: string) => {
    if (!currentClassId) {
      console.warn('[GlobalChatModal] No class context to import code into the IDE');
      return;
    }
    setPendingCode(code);
    navigate(`/${currentClassId}/code`);
    closeChat();
  }, [currentClassId, setPendingCode, navigate, closeChat]);

  // Mode switching handlers
  const handleSetMode = (mode: ChatDisplayMode) => {
    setDisplayModeAsUser(mode);
  };

  // On mobile, always use fullscreen
  const effectiveMode = isMobile ? 'fullscreen' : displayMode;
  const titleId = useId();

  // Opening the panel takes the student to its composer, as a dialog takes focus on open
  // (DESIGN.md, Dialogs). Only an open that happens now moves focus: a panel that is
  // already open when the page loads, or stays open across a navigation, does not.
  const panelRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(isOpen);
  useEffect(() => {
    const opened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!opened) return undefined;
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  /** Closes the panel and hands focus back to the launcher (it reappears once the panel has gone). */
  const closePanel = useCallback(() => {
    closeChat();
    window.setTimeout(() => {
      document.querySelector<HTMLElement>('[data-kiwi-launcher]')?.focus();
    }, 0);
  }, [closeChat]);

  // Drag-to-resize for snap/sidepanel modes: the handle on the panel's left
  // edge captures the pointer and maps cursor X to panel width. Same pointer-
  // capture pattern as the IDE resize handle in ClassIDE.
  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizingPanel(true);
  }, [setIsResizingPanel]);

  const handleResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const maxWidth = window.innerWidth - MIN_CONTENT_WIDTH;
    setPanelWidth(Math.min(window.innerWidth - e.clientX, maxWidth));
  }, [setPanelWidth]);

  const handleResizePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsResizingPanel(false);
  }, [setIsResizingPanel]);

  // The separator also moves by keyboard: arrows 16 px (64 with Shift), Home
  // and End to the limits. The panel sits on the right, so ArrowLeft widens it;
  // setPanelWidth clamps to the 320-800 px range.
  const handleResizeKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 64 : 16;
    const next =
      e.key === 'ArrowLeft' ? Math.min(panelWidth + step, window.innerWidth - MIN_CONTENT_WIDTH)
        : e.key === 'ArrowRight' ? panelWidth - step
          : e.key === 'Home' ? MIN_PANEL_WIDTH
            : e.key === 'End' ? Math.min(MAX_PANEL_WIDTH, window.innerWidth - MIN_CONTENT_WIDTH)
              : null;
    if (next === null) return;
    e.preventDefault();
    setPanelWidth(next);
  }, [panelWidth, setPanelWidth]);

  const isResizableMode = effectiveMode === 'snap' || effectiveMode === 'sidepanel';

  // Only opacity and transform move: the panel fades and travels 8 px (side and
  // modal) or scales from 0.98 (fullscreen); exits are shorter than entries.
  const motion = isResizingPanel
    ? 'none'
    : isOpen
      ? 'opacity var(--motion-standard) var(--motion-ease-enter), transform var(--motion-standard) var(--motion-ease-enter), visibility 0s'
      : 'opacity var(--motion-exit) var(--motion-ease-exit), transform var(--motion-exit) var(--motion-ease-exit), visibility 0s linear var(--motion-exit)';

  // Compute container styles based on mode
  const getContainerStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      zIndex: theme.zIndex.modal,
      bgcolor: 'var(--surface)',
      color: 'var(--text)',
      backgroundImage: 'none',
      transition: motion,
      opacity: isOpen ? 1 : 0,
      visibility: isOpen ? 'visible' as const : 'hidden' as const,
    };

    if (effectiveMode === 'snap') {
      // Docked: it meets the viewport's square edge and casts no shadow.
      return {
        ...baseStyles,
        top: 0,
        right: 0,
        bottom: 0,
        width: panelWidth,
        maxWidth: '100vw',
        height: '100vh',
        borderRadius: 0,
        borderLeft: '1px solid var(--border)',
        boxShadow: 'none',
        transform: isOpen ? 'translateX(0)' : 'translateX(8px)',
      };
    }

    if (effectiveMode === 'fullscreen') {
      return {
        ...baseStyles,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        borderRadius: 0,
        boxShadow: 'none',
        transform: isOpen ? 'scale(1)' : 'scale(0.98)',
      };
    }

    if (effectiveMode === 'sidepanel') {
      return {
        ...baseStyles,
        top: 0,
        right: 0,
        bottom: 0,
        width: panelWidth,
        maxWidth: '100vw',
        height: '100vh',
        borderRadius: 0,
        borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-2)',
        transform: isOpen ? 'translateX(0)' : 'translateX(8px)',
      };
    }

    // Modal mode (centered)
    return {
      ...baseStyles,
      top: '50%',
      left: '50%',
      width: 'min(900px, calc(100% - 24px))',
      height: '80vh',
      maxHeight: '80vh',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sheet)',
      boxShadow: 'var(--shadow-2)',
      transform: isOpen ? 'translate(-50%, -50%)' : 'translate(-50%, calc(-50% + 8px))',
    };
  };

  const modeButton = (mode: ChatDisplayMode, label: string, icon: React.ReactNode) => (
    <Tooltip title={label}>
      <IconButton aria-label={label} aria-pressed={displayMode === mode} onClick={() => handleSetMode(mode)}>
        {icon}
      </IconButton>
    </Tooltip>
  );

  // Header with mode toggle buttons
  const renderHeader = () => (
    <Box
      data-density="compact"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pl: 2,
        pr: 1,
        // Match TopNav so the divider lines up in snap/sidepanel modes.
        height: TOP_NAV_HEIGHT,
        boxSizing: 'border-box',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}
    >
      <Typography
        id={titleId}
        component="h2"
        sx={{
          m: 0,
          fontFamily: 'var(--type-section-title-family)',
          fontSize: 'var(--type-section-title-size)',
          lineHeight: 'var(--type-section-title-leading)',
          fontWeight: 'var(--type-section-title-weight)',
          color: 'var(--text)',
        }}
      >
        Kiwi chat
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
        {!isMobile && (
          <>
            {modeButton('modal', 'Show as modal', <WebAssetIcon />)}
            {modeButton('sidepanel', 'Show as side panel', <ViewSidebarIcon />)}
            {modeButton('snap', 'Snap to side', <DockIcon />)}
            <Tooltip title={displayMode === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen'}>
              <IconButton
                aria-label={displayMode === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen'}
                onClick={() => handleSetMode(displayMode === 'fullscreen' ? 'modal' : 'fullscreen')}
              >
                {displayMode === 'fullscreen' ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title="Close chat">
          <IconButton aria-label="Close chat" onClick={closePanel}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Portal>
      {/* No backdrop in any mode: students read the PDF while they ask, so the page
          behind keeps its colours and stays usable (the user's decision of
          2026-10-19). Escape and Close chat still close the panel. */}

      {/* Single container that changes shape based on mode */}
      <Paper
        component="aside"
        ref={panelRef}
        aria-labelledby={titleId}
        elevation={0}
        sx={getContainerStyles()}
        onKeyDown={(e: React.KeyboardEvent) => {
          // Escape inside the panel closes it and returns focus to the launcher.
          // The composer stops an answer on Escape first and keeps the key to itself.
          if (e.key === 'Escape' && isOpen && !e.defaultPrevented) closePanel();
        }}
      >
        {/* Drag handle on the left edge to resize the panel (snap/sidepanel) */}
        {isResizableMode && (
          <Box
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat panel"
            aria-valuemin={MIN_PANEL_WIDTH}
            aria-valuemax={MAX_PANEL_WIDTH}
            aria-valuenow={Math.round(panelWidth)}
            tabIndex={0}
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onKeyDown={handleResizeKeyDown}
            sx={{
              // Centred on the panel's left border; the bar is the ::before, and
              // keyboard focus outlines the bar rather than the 14 px hit strip.
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 'calc(-1 * var(--border-width-interactive) / 2)',
              transform: 'translateX(-50%)',
              width: '14px',
              cursor: 'col-resize',
              touchAction: 'none',
              zIndex: 1,
              '@media (pointer: coarse)': { width: 'var(--size-hit-control)' },
              '&::before': {
                content: '""',
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '4px',
                height: '48px',
                transform: 'translate(-50%, -50%)',
                borderRadius: 'var(--radius-control)',
                backgroundColor: 'var(--border-interactive)',
              },
              '&:hover::before, &:active::before': { backgroundColor: 'var(--accent-solid)' },
              '&:focus-visible': { outline: 0 },
              '&:focus-visible::before': {
                outline: 'var(--border-width-focus) solid var(--focus-ring)',
                outlineOffset: 'var(--size-focus-offset)',
              },
            }}
          />
        )}
        {renderHeader()}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ChatCore
            classId={currentClassId}
            pdfId={currentPdfId}
            pdfPage={currentPdfPage}
            pdfMaterialType={currentPdfMaterialType}
            pdfContent={pdfContent}
            activeTab={activeTab}
            activeView={activeView}
            currentPath={currentPath}
            activeAppSlug={activeAppSlug}
            activeAppName={activeAppName}
            appContext={appContext}
            appTutoringMode={appTutoringMode}
            initialPrompt={pendingPrompt}
            onInitialPromptConsumed={clearPendingPrompt}
            onNavigate={handleNavigate}
            onImportCode={handleImportCode}
          />
        </Box>
      </Paper>
    </Portal>
  );
};

export default GlobalChatModal;
