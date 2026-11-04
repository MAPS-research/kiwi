import { useMediaQuery, useTheme } from '@mui/material';
import { useGlobalChat } from '../context/GlobalChatContext.tsx';

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
  const { isOpen, displayMode, panelWidth } = useGlobalChat();
  const theme = useTheme();
  // On mobile the chat renders fullscreen regardless of displayMode
  // (see GlobalChatModal's effectiveMode), so never shrink the content there.
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const shouldResize = isOpen && displayMode === 'snap' && !isMobile;

  // WHY: no transition. Only opacity and transform animate (kiwi-ui/DESIGN.md,
  // Motion); the content snaps to its new width while the panel fades in beside it.
  return {
    width: shouldResize ? `calc(100% - ${panelWidth}px)` : '100%',
  };
}
