import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface NavigationSidebarItem {
  key: string;
  label: string;
  icon: ReactNode;
  selected?: boolean;
  active?: boolean;
  expanded?: boolean;
  children?: NavigationSidebarItem[];
  onChildrenExited?: () => void;
  onClick: () => void;
}

export interface NavigationSidebarSection {
  title?: string;
  items: NavigationSidebarItem[];
}

interface NavigationSidebarProps {
  ariaLabel: string;
  open?: boolean;
  width?: number;
  collapsedWidth?: number;
  header?: ReactNode;
  footer?: ReactNode;
  sections: NavigationSidebarSection[];
}

// The icon must not move while the rail animates between `width` and
// `collapsedWidth`. That rules out `justify-content` switching on `open`:
// centering is resolved against the button's *current* width, so the icon jumps
// to the middle of the still-wide button the instant you collapse and then
// slides left for the rest of the transition. Instead the geometry is fixed —
// items are always left-aligned, and the icon slot is sized and padded so that
// its centre lands exactly on the collapsed rail's centre line. Nothing about
// the icon's x position depends on `open`. Geometry therefore lives in inline
// styles (it is computed from props), while color and interaction states come
// from the shared semantic tokens.
const ICON_SLOT_WIDTH = 24;
const EXPAND_ICON_WIDTH = 20;
const ITEM_MARGIN_X = 8;
const LABEL_GAP = 12;
const MOTION_DURATION_MS = 200;

const usePrefersReducedMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return reduceMotion;
};

const SidebarExpandIcon = ({ expanded, visible, reduceMotion }: {
  expanded: boolean;
  visible: boolean;
  reduceMotion: boolean;
}) => {
  // Start new arrows in the collapsed direction, then update after the first
  // paint. This makes the initial expansion rotate too instead of mounting in
  // its final position.
  const [animatedExpanded, setAnimatedExpanded] = useState(false);

  useEffect(() => {
    setAnimatedExpanded(expanded);
  }, [expanded]);

  return (
    <span
      data-testid="sidebar-expand-icon"
      aria-hidden="true"
      className="ml-auto inline-flex shrink-0 items-center justify-center"
      style={{
        width: EXPAND_ICON_WIDTH,
        height: EXPAND_ICON_WIDTH,
        opacity: visible ? 1 : 0,
        transform: animatedExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
        transition: reduceMotion
          ? 'none'
          : `transform ${MOTION_DURATION_MS}ms ease, opacity ${MOTION_DURATION_MS}ms ease`,
      }}
    >
      <ChevronDown className="size-4.5" />
    </span>
  );
};

/**
 * Collapse-style disclosure for nested navigation: animates open/closed via
 * grid rows, keeps children mounted while exiting, then unmounts and reports
 * the exit so retained submenu state can be released.
 */
const SidebarSubmenu = ({ open, onExited, reduceMotion, children }: {
  open: boolean;
  onExited?: () => void;
  reduceMotion: boolean;
  children: ReactNode;
}) => {
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(false);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  const duration = reduceMotion ? 0 : MOTION_DURATION_MS;

  useEffect(() => {
    if (open) {
      setMounted(true);
      if (reduceMotion) {
        setExpanded(true);
        return;
      }
      // Commit the collapsed frame first so the initial expansion animates.
      const frame = requestAnimationFrame(() => setExpanded(true));
      return () => cancelAnimationFrame(frame);
    }

    setExpanded(false);
    const timer = setTimeout(() => {
      setMounted(false);
      onExitedRef.current?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [open, duration, reduceMotion]);

  if (!mounted) return null;

  return (
    <div
      data-testid="sidebar-submenu"
      className="grid"
      style={{
        gridTemplateRows: expanded ? '1fr' : '0fr',
        transition: reduceMotion
          ? 'none'
          : `grid-template-rows ${MOTION_DURATION_MS}ms ease`,
      }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
};

const NavigationSidebar = ({
  ariaLabel,
  open = true,
  width = 220,
  collapsedWidth = 56,
  header,
  footer,
  sections,
}: NavigationSidebarProps) => {
  const reduceMotion = usePrefersReducedMotion();
  // Padding that centres the icon slot inside the collapsed rail.
  const itemPaddingX = Math.max(
    0,
    (collapsedWidth - ITEM_MARGIN_X * 2 - ICON_SLOT_WIDTH) / 2,
  );
  const textInsetX = ITEM_MARGIN_X + itemPaddingX;
  // Labels keep a fixed width instead of flexing, so they get clipped by the
  // shrinking rail rather than re-wrapping or ellipsising on every frame.
  const labelWidth = Math.max(
    0,
    width - ITEM_MARGIN_X * 2 - itemPaddingX * 2 - ICON_SLOT_WIDTH - LABEL_GAP,
  );
  const titleWidth = Math.max(0, width - textInsetX * 2);

  const labelTransition = reduceMotion
    ? 'none'
    : `opacity ${MOTION_DURATION_MS}ms ease`;

  const itemGeometry: CSSProperties = {
    minHeight: 44,
    marginLeft: ITEM_MARGIN_X,
    marginRight: ITEM_MARGIN_X,
    paddingLeft: itemPaddingX,
    paddingRight: itemPaddingX,
    gap: LABEL_GAP,
    justifyContent: 'flex-start',
  };

  const itemButton = (item: NavigationSidebarItem, extraLabelInset: number) => {
    const isHighlighted = item.selected || item.active;
    const hasChildren = Boolean(item.children?.length);
    const childrenExpanded = item.expanded ?? hasChildren;
    const submenuOpen = open && childrenExpanded;

    return (
      <button
        type="button"
        onClick={item.onClick}
        aria-label={item.label}
        aria-current={item.selected ? 'page' : undefined}
        aria-expanded={hasChildren ? submenuOpen : undefined}
        className={cn(
          'flex cursor-pointer items-center overflow-hidden rounded-lg text-sm outline-none select-none',
          'transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none',
          isHighlighted
            ? 'bg-accent font-semibold text-primary'
            : 'font-medium text-foreground hover:bg-accent/60',
        )}
        style={{ ...itemGeometry, width: `calc(100% - ${ITEM_MARGIN_X * 2}px)` }}
      >
        {/* Icons render a touch heavier than the label so they anchor the row. */}
        <span
          aria-hidden="true"
          className="inline-flex shrink-0 items-center justify-center [&_svg]:size-5 [&_svg]:[stroke-width:2.25]"
          style={{ width: ICON_SLOT_WIDTH }}
        >
          {item.icon}
        </span>
        <span
          aria-hidden={!open}
          className="shrink-0 truncate text-left"
          style={{
            width: Math.max(0, labelWidth - extraLabelInset),
            opacity: open ? 1 : 0,
            transition: labelTransition,
          }}
        >
          {item.label}
        </span>
        {hasChildren && (
          <SidebarExpandIcon
            expanded={submenuOpen}
            visible={open}
            reduceMotion={reduceMotion}
          />
        )}
      </button>
    );
  };

  return (
    <TooltipProvider>
      <aside
        aria-label={ariaLabel}
        className={cn(
          'flex shrink-0 flex-col overflow-hidden border-r border-border bg-card text-foreground',
          'transition-[width] motion-reduce:transition-none',
        )}
        style={{
          width: open ? width : collapsedWidth,
          height: '100%',
          minHeight: 0,
          transitionDuration: `${MOTION_DURATION_MS}ms`,
        }}
      >
        {header && (
          <>
            {header}
            <div className="border-t border-border" />
          </>
        )}

        <div
          className="min-h-0 grow overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]"
          style={{ overflowY: 'auto' }}
        >
          {sections.map((section, sectionIndex) => (
            <div key={section.title ?? sectionIndex}>
              {sectionIndex > 0 && <div className="border-t border-border" />}
              {section.title && (
                <span
                  aria-hidden={!open}
                  className="block overflow-hidden pt-3 pb-1 text-xs font-semibold whitespace-nowrap text-muted-foreground"
                  style={{
                    width: titleWidth,
                    paddingLeft: textInsetX,
                    paddingRight: textInsetX,
                    opacity: open ? 1 : 0,
                    transition: labelTransition,
                  }}
                >
                  {section.title}
                </span>
              )}
              <ul className="flex flex-col py-2">
                {section.items.map((item) => {
                  const hasChildren = Boolean(item.children?.length);
                  const childrenExpanded = item.expanded ?? hasChildren;
                  const submenuOpen = open && childrenExpanded;
                  const extraLabelInset = hasChildren
                    ? EXPAND_ICON_WIDTH + LABEL_GAP
                    : 0;

                  return (
                    <li key={item.key}>
                      {/* Disabled while expanded so no hover state exists at the
                          moment of collapse (it would pop immediately), and
                          delayed so cursor transit over the rail stays quiet. */}
                      <Tooltip disabled={open} delay={500}>
                        <TooltipTrigger
                          render={itemButton(item, extraLabelInset)}
                        />
                        {!open && (
                          <TooltipContent side="right">
                            {item.label}
                          </TooltipContent>
                        )}
                      </Tooltip>

                      {hasChildren && (
                        <SidebarSubmenu
                          open={submenuOpen}
                          reduceMotion={reduceMotion}
                          onExited={
                            childrenExpanded ? undefined : item.onChildrenExited
                          }
                        >
                          <ul className="mb-1 flex flex-col" style={{ marginLeft: 0 }}>
                            {item.children!.map((child) => (
                              <li key={child.key}>
                                <button
                                  type="button"
                                  onClick={child.onClick}
                                  aria-label={child.label}
                                  aria-current={child.selected ? 'page' : undefined}
                                  className={cn(
                                    'flex cursor-pointer items-center overflow-hidden rounded-lg text-sm outline-none select-none',
                                    'transition-colors hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none',
                                    child.selected
                                      ? 'font-semibold text-primary'
                                      : 'font-medium text-foreground/80 hover:text-foreground',
                                  )}
                                  style={{
                                    ...itemGeometry,
                                    minHeight: 40,
                                    width: `calc(100% - ${ITEM_MARGIN_X * 2}px)`,
                                  }}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="inline-flex shrink-0 items-center justify-center"
                                    style={{
                                      width: ICON_SLOT_WIDTH,
                                      height: ICON_SLOT_WIDTH,
                                    }}
                                  >
                                    <span
                                      data-testid={`sidebar-child-indicator-${child.key}`}
                                      className={cn(
                                        'size-1.5 rounded-full',
                                        child.selected
                                          ? 'bg-primary'
                                          : 'bg-transparent',
                                      )}
                                    />
                                  </span>
                                  <span className="min-w-0 truncate text-left">
                                    {child.label}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </SidebarSubmenu>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-border">{footer}</div>
        )}
      </aside>
    </TooltipProvider>
  );
};

export default NavigationSidebar;
