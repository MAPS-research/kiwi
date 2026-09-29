import CloseIcon from '@mui/icons-material/Close';
import DockIcon from '@mui/icons-material/Dock';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import WebAssetIcon from '@mui/icons-material/WebAsset';
import {
  Backdrop,
  Box,
  IconButton,
  Paper,
  Portal,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChatDisplayMode } from '../../context/GlobalChatContext.tsx';
import { useGlobalChat } from '../../context/GlobalChatContext.tsx';
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

  const isResizableMode = effectiveMode === 'snap' || effectiveMode === 'sidepanel';

  // Compute container styles based on mode
  const getContainerStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      zIndex: theme.zIndex.modal,
      bgcolor: 'background.paper',
      // No transition while dragging the resize handle, so the panel tracks
      // the cursor instead of easing toward it.
      transition: isResizingPanel
        ? 'none'
        : theme.transitions.create(['transform', 'width', 'height', 'top', 'left', 'right', 'bottom', 'border-radius'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
    };

    if (effectiveMode === 'snap') {
      return {
        ...baseStyles,
        top: 0,
        right: 0,
        bottom: 0,
        width: panelWidth,
        maxWidth: '100vw',
        height: '100vh',
        borderRadius: 0,
        borderLeft: `1px solid ${theme.palette.divider}`,
        boxShadow: 'none',
        transform: isOpen ? 'translateX(0)' : `translateX(${panelWidth}px)`,
        visibility: isOpen ? 'visible' as const : 'hidden' as const,
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
        transform: isOpen ? 'scale(1)' : 'scale(0.95)',
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' as const : 'hidden' as const,
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
        boxShadow: theme.shadows[8],
        transform: isOpen ? 'translateX(0)' : `translateX(${panelWidth}px)`,
        visibility: isOpen ? 'visible' as const : 'hidden' as const,
      };
    }

    // Modal mode (centered)
    return {
      ...baseStyles,
      top: '50%',
      left: '50%',
      width: '100%',
      maxWidth: 900,
      height: '80vh',
      maxHeight: '80vh',
      borderRadius: 2,
      boxShadow: theme.shadows[24],
      transform: isOpen ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.95)',
      opacity: isOpen ? 1 : 0,
      visibility: isOpen ? 'visible' as const : 'hidden' as const,
    };
  };

  // Header with mode toggle buttons
  const renderHeader = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        // Match TopNav so the divider lines up in snap/sidepanel modes.
        height: TOP_NAV_HEIGHT,
        borderBottom: 1,
        borderColor: 'divider',
        flexShrink: 0,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="h6" component="span" sx={{ ml: 0.7 }}>
        Kiwi Chat
      </Typography>
      <Box>
        <Tooltip title="Modal view">
          <IconButton
            aria-label="modal view"
            onClick={() => handleSetMode('modal')}
            color={displayMode === 'modal' ? 'primary' : 'default'}
            size="small"
            sx={{ mr: 0.5 }}
          >
            <WebAssetIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Side panel">
          <IconButton
            aria-label="side panel view"
            onClick={() => handleSetMode('sidepanel')}
            color={displayMode === 'sidepanel' ? 'primary' : 'default'}
            size="small"
            sx={{ mr: 0.5 }}
          >
            <ViewSidebarIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Snap to side">
          <IconButton
            aria-label="snap to side"
            onClick={() => handleSetMode('snap')}
            color={displayMode === 'snap' ? 'primary' : 'default'}
            size="small"
            sx={{ mr: 0.5 }}
          >
            <DockIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={displayMode === 'fullscreen' ? "Exit fullscreen" : "Fullscreen"}>
          <IconButton
            aria-label={displayMode === 'fullscreen' ? "exit fullscreen" : "fullscreen view"}
            onClick={() => handleSetMode(displayMode === 'fullscreen' ? 'modal' : 'fullscreen')}
            color={displayMode === 'fullscreen' ? 'primary' : 'default'}
            size="small"
            sx={{ mr: 1 }}
          >
            {displayMode === 'fullscreen' ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
        <IconButton aria-label="close" onClick={closeChat}>
          <CloseIcon />
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <Portal>
      {/* Backdrop - shown for modal and sidepanel modes */}
      <Backdrop
        open={isOpen && effectiveMode !== 'fullscreen' && effectiveMode !== 'snap'}
        onClick={closeChat}
        sx={{
          zIndex: theme.zIndex.modal - 1,
          backgroundColor: effectiveMode === 'sidepanel'
            ? 'rgba(0, 0, 0, 0.3)'
            : 'rgba(0, 0, 0, 0.5)',
        }}
      />

      {/* Single container that changes shape based on mode */}
      <Paper
        elevation={effectiveMode === 'modal' ? 24 : 8}
        sx={getContainerStyles()}
      >
        {/* Drag handle on the left edge to resize the panel (snap/sidepanel) */}
        {isResizableMode && (
          <Box
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            aria-label="resize chat panel"
            sx={{
              position: 'absolute',
              top: 0,
              left: -7,
              width: 14,
              height: '100%',
              cursor: 'col-resize',
              touchAction: 'none',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover .resize-grip, &:active .resize-grip': {
                bgcolor: 'primary.main',
              },
            }}
          >
            <Box
              className="resize-grip"
              sx={{
                width: 4,
                height: 48,
                borderRadius: 2,
                bgcolor: 'divider',
                transition: 'background-color 0.15s',
              }}
            />
          </Box>
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
