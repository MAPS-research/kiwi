import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, ButtonBase, Fade, Tooltip } from '@mui/material';
import LauncherLogo from './LauncherLogo.tsx';
import DraggableExport from 'react-draggable';
import type { DraggableData, DraggableEvent, DraggableProps } from 'react-draggable';
import { useGlobalChat } from '../../context/GlobalChatContext.tsx';

// react-draggable ships CJS typings, so under `moduleResolution: nodenext` its
// default export types as the module namespace rather than the class (the same
// snag this repo already hits with react-ace). Re-type it to what it actually
// is at runtime so the JSX below stays checked.
const Draggable = DraggableExport as unknown as React.ComponentClass<Partial<DraggableProps>>;

interface GlobalChatButtonProps {
  /** Whether the button should be visible */
  visible?: boolean;
}

/**
 * Position of the FAB once the user has dragged it, persisted to localStorage
 * so it stays where they put it across pages and refreshes.
 */
interface FabPosition {
  left: number;
  top: number;
}

interface Viewport {
  width: number;
  height: number;
}

const FAB_POSITION_KEY = 'globalChatButtonPosition';
const FAB_SIZE = 56; // --launcher-size
const EDGE_MARGIN = 8;
// Raised from the old 24 so the button doesn't sit on top of content that
// commonly lives in the very bottom corner (footers, in-app action bars).
const DEFAULT_BOTTOM = 96;
// Horizontal inset of the default (never-dragged) resting spot.
const DEFAULT_SIDE = 24;
// Movement below this many px is treated as a click, not a drag.
const DRAG_THRESHOLD = 5;
// How long the FAB takes to glide to the edge it was released nearest to.
const SNAP_DURATION_MS = 300;
const DRAGGING_DOCUMENT_CLASS = 'global-chat-dragging';

function getViewport(): Viewport {
  return { width: window.innerWidth, height: window.innerHeight };
}

function clampPosition(pos: FabPosition, viewport: Viewport = getViewport()): FabPosition {
  return {
    left: Math.min(Math.max(pos.left, EDGE_MARGIN), Math.max(EDGE_MARGIN, viewport.width - FAB_SIZE - EDGE_MARGIN)),
    top: Math.min(Math.max(pos.top, EDGE_MARGIN), Math.max(EDGE_MARGIN, viewport.height - FAB_SIZE - EDGE_MARGIN)),
  };
}

function loadFabPosition(): FabPosition | null {
  try {
    const stored = localStorage.getItem(FAB_POSITION_KEY);
    if (stored) return clampPosition(JSON.parse(stored));
  } catch (error) {
    console.warn('[GlobalChatButton] Failed to load position:', error);
  }
  return null;
}

function saveFabPosition(pos: FabPosition): void {
  try {
    localStorage.setItem(FAB_POSITION_KEY, JSON.stringify(pos));
  } catch (error) {
    console.warn('[GlobalChatButton] Failed to save position:', error);
  }
}

/**
 * Floating action button that opens the global chat modal.
 * Defaults to the bottom-right corner (bottom-left on app tabs) and can be
 * dragged anywhere via react-draggable; on release it snaps to whichever
 * vertical edge it is closest to. A dragged position is persisted and
 * overrides the defaults.
 */
export const GlobalChatButton: React.FC<GlobalChatButtonProps> = ({ visible = true }) => {
  const { toggleChat, isOpen, messages, activeTab } = useGlobalChat();

  // Count unread messages (simple: messages from assistant that came after last open)
  // For now, just show message count if any
  const messageCount = messages.length;

  // Embedded Kiwi Apps render edge-to-edge in an iframe and place their own
  // primary actions (e.g. a Submit button) in the bottom-right. Move the FAB to
  // the bottom-LEFT on app tabs so it no longer overlaps them (issue #178),
  // instead of hiding it — the student still needs it to ask for hints (#213).
  // Once the user has dragged the FAB, their position wins on every tab.
  const isAppTab = activeTab === 'app';

  const [position, setPosition] = useState<FabPosition | null>(() => loadFabPosition());
  const [viewport, setViewport] = useState<Viewport>(() => getViewport());
  const [isDragging, setIsDragging] = useState(false);

  // react-draggable needs a real node reference (React 19 dropped findDOMNode).
  const nodeRef = useRef<HTMLDivElement>(null);
  // Where this gesture started, so we can tell a click from a real drag.
  const dragStartRef = useRef<FabPosition | null>(null);
  const didDragRef = useRef(false);
  // A drag that just ended still fires a click — swallow that one click.
  const suppressClickRef = useRef(false);

  // Keep the FAB on screen when the window changes size: the default resting
  // spot is derived from the viewport, and a dragged position gets re-clamped.
  useEffect(() => {
    const handleResize = () => {
      const next = getViewport();
      setViewport(next);
      setPosition((prev) => (prev ? clampPosition(prev, next) : prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // The FAB lives in the Kiwi host, while an app such as Codegen lives in an
  // iframe. Pointer events do not cross an iframe boundary: without this
  // guard, react-draggable loses its document-level move/up events as soon as
  // the cursor enters the app and the drag freezes. Always clear the class if
  // this component disappears during a gesture.
  useEffect(
    () => () => document.documentElement.classList.remove(DRAGGING_DOCUMENT_CLASS),
    []
  );

  // Never-dragged resting spot: bottom-right, or bottom-left on app tabs.
  const defaultPosition = useMemo<FabPosition>(
    () => ({
      left: isAppTab ? DEFAULT_SIDE : Math.max(EDGE_MARGIN, viewport.width - FAB_SIZE - DEFAULT_SIDE),
      top: Math.max(EDGE_MARGIN, viewport.height - FAB_SIZE - DEFAULT_BOTTOM),
    }),
    [isAppTab, viewport]
  );

  const currentPosition = position ?? defaultPosition;

  // The FAB is `position: fixed` at the origin, so drag coordinates are
  // viewport coordinates and bounds keep it inside the visible area.
  const bounds = useMemo(
    () => ({
      left: EDGE_MARGIN,
      top: EDGE_MARGIN,
      right: Math.max(EDGE_MARGIN, viewport.width - FAB_SIZE - EDGE_MARGIN),
      bottom: Math.max(EDGE_MARGIN, viewport.height - FAB_SIZE - EDGE_MARGIN),
    }),
    [viewport]
  );

  const handleDragStart = useCallback((_event: DraggableEvent, data: DraggableData) => {
    // This must happen synchronously in onStart, before the cursor can move
    // into an iframe. index.css temporarily makes host-owned iframes ignore
    // pointer events so the parent document keeps receiving the gesture.
    document.documentElement.classList.add(DRAGGING_DOCUMENT_CLASS);
    dragStartRef.current = { left: data.x, top: data.y };
    didDragRef.current = false;
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback((_event: DraggableEvent, data: DraggableData) => {
    const start = dragStartRef.current;
    if (!start) return;
    if (
      !didDragRef.current &&
      Math.abs(data.x - start.left) < DRAG_THRESHOLD &&
      Math.abs(data.y - start.top) < DRAG_THRESHOLD
    ) {
      // Still within the slop radius — treat it as a click for now.
      return;
    }
    didDragRef.current = true;
    setPosition({ left: data.x, top: data.y });
  }, []);

  const handleDragStop = useCallback(
    (_event: DraggableEvent, data: DraggableData) => {
      document.documentElement.classList.remove(DRAGGING_DOCUMENT_CLASS);
      dragStartRef.current = null;
      setIsDragging(false);
      if (!didDragRef.current) {
        // Sub-threshold wobble: react-draggable restores the controlled
        // position on stop, so the FAB stays exactly where it was.
        return;
      }
      didDragRef.current = false;
      suppressClickRef.current = true;
      // The click that follows this mouseup arrives synchronously; clear the
      // guard right after so a later, genuine click still opens the chat.
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);

      // Snap to whichever vertical edge the button's centre is nearest.
      const snappedLeft =
        data.x + FAB_SIZE / 2 < viewport.width / 2
          ? EDGE_MARGIN
          : Math.max(EDGE_MARGIN, viewport.width - FAB_SIZE - EDGE_MARGIN);
      const snapped = clampPosition({ left: snappedLeft, top: data.y }, viewport);
      setPosition(snapped);
      saveFabPosition(snapped);
    },
    [viewport]
  );

  const handleClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    toggleChat();
  }, [toggleChat]);

  if (!visible) {
    return null;
  }

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement | null>}
      position={{ x: currentPosition.left, y: currentPosition.top }}
      bounds={bounds}
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
    >
      <div
        ref={nodeRef}
        data-testid="global-chat-button-draggable"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: FAB_SIZE,
          height: FAB_SIZE,
          zIndex: 1200,
          // Let the drag handlers own touch gestures instead of scrolling.
          touchAction: 'none',
          // The wrapper itself must not swallow clicks meant for the page
          // behind it (it still receives events bubbling up from the FAB).
          pointerEvents: 'none',
          transition: isDragging ? 'none' : `transform ${SNAP_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        {/* Hidden while the panel is open: a fade, no scale (the launcher never bounces). */}
        <Fade in={!isOpen} timeout={{ enter: 220, exit: 176 }}>
          <Tooltip title="Open Kiwi chat" placement={isAppTab ? 'right' : 'left'}>
            <ButtonBase
              aria-label="Open Kiwi chat"
              data-kiwi-launcher=""
              onClick={handleClick}
              sx={{
                position: 'relative',
                width: 'var(--launcher-size)',
                height: 'var(--launcher-size)',
                borderRadius: '50%',
                boxShadow: 'var(--launcher-shadow)',
                touchAction: 'none',
                pointerEvents: 'auto',
                '--kiwi-launcher-shade': 0,
                transition: 'transform var(--motion-micro) var(--motion-ease-toggle)',
                // Hover and press shade the ground under the bird, instantly; the bird never repaints.
                '&:hover': { '--kiwi-launcher-shade': 0.1 },
                '&:active': { '--kiwi-launcher-shade': 0.18, transform: 'scale(var(--launcher-press-scale))' },
                // One frame: the disc's 1 px edge becomes 2 px of --focus-ring, drawn inward.
                '&:focus-visible': { outline: 'none', '--kiwi-launcher-edge': 'var(--focus-ring)' },
                '&:focus-visible .kiwi-launcher-edge': { strokeWidth: 5.714, r: 77.143 },
                '@media (forced-colors: active)': {
                  '&:focus-visible': { outline: '2px solid Highlight', outlineOffset: '-2px' },
                },
              }}
            >
              <LauncherLogo />
              {messageCount > 0 ? (
                <Badge
                  badgeContent={messageCount}
                  color="primary"
                  max={9}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    '& .MuiBadge-badge': {
                      minWidth: 'var(--launcher-badge-size)',
                      height: 'var(--launcher-badge-size)',
                      borderRadius: 'var(--launcher-badge-radius)',
                    },
                  }}
                />
              ) : null}
            </ButtonBase>
          </Tooltip>
        </Fade>
      </div>
    </Draggable>
  );
};

export default GlobalChatButton;
