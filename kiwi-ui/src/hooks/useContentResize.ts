import { useMediaQuery, useTheme } from '@mui/material';
import { useGlobalChat } from '../context/GlobalChatContext';

/**
 * Hook to shrink the main content when chat is in snap mode, so the page and
 * the chat panel sit side by side instead of the panel covering the page.
 * Returns styles to be spread onto the main content container.
 *
 * Shrinks `width` rather than adding `margin-right`: layouts that also set
 * `width: 100%` over-constrain the box and CSS drops the right margin, which
 * left the panel overlaying the content.
 */
export function useContentResize() {
  const { isOpen, displayMode, panelWidth, isResizingPanel } = useGlobalChat();
  const theme = useTheme();
  // On mobile the chat renders fullscreen regardless of displayMode
  // (see GlobalChatModal's effectiveMode), so never shrink the content there.
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const shouldResize = isOpen && displayMode === 'snap' && !isMobile;

  return {
    width: shouldResize ? `calc(100% - ${panelWidth}px)` : '100%',
    // No transition while the user drags the panel's resize handle, so the
    // content edge tracks the cursor instead of easing toward it.
    transition: isResizingPanel
      ? 'none'
      : theme.transitions.create(['width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
  };
}
