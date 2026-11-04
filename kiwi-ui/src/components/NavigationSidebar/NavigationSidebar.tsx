import { useEffect, useState, type ReactNode } from 'react';
import { ExpandMoreOutlined as ExpandMoreIcon } from '@mui/icons-material';
import {
  Box,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { densityAttr } from '../AdminPage/regionDensity.ts';

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
  /** The open rail's width: px, or a CSS length such as "var(--size-sidebar-drawer)". */
  width?: number | string;
  /** The collapsed rail's width: px, or a CSS length. */
  collapsedWidth?: number | string;
  header?: ReactNode;
  footer?: ReactNode;
  sections: NavigationSidebarSection[];
}

/** Child rows are 36 px in both densities (DESIGN.md, Density > the stated exceptions). */
const CHILD_ROW_HEIGHT = 36;

const cssLength = (value: number | string) => (typeof value === 'number' ? `${value}px` : value);

/** Label type for every row: 14/20, 400 at rest and 600 on the current page. */
const labelProps = (current: boolean) => ({
  variant: 'body2' as const,
  noWrap: true,
  sx: {
    fontSize: 'var(--type-label-size)',
    lineHeight: 'var(--type-label-leading)',
    fontWeight: current ? 'var(--weight-semibold)' : 'var(--weight-regular)',
  },
});

const SidebarExpandIcon = ({ expanded, visible }: { expanded: boolean; visible: boolean }) => {
  // Start new arrows in the collapsed direction, then update after the first
  // paint. This makes the initial expansion rotate too instead of mounting in
  // its final position.
  const [animatedExpanded, setAnimatedExpanded] = useState(false);

  useEffect(() => {
    setAnimatedExpanded(expanded);
  }, [expanded]);

  return (
    <Box
      component="span"
      data-testid="sidebar-expand-icon"
      aria-hidden="true"
      sx={{
        width: 'var(--size-icon-sm)',
        height: 'var(--size-icon-sm)',
        ml: 'auto',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--icon-default)',
        opacity: visible ? 1 : 0,
        // Points down while the group is closed and up while it is open.
        transform: animatedExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        // Only transform and opacity move (DESIGN.md, Motion); the global
        // reduced-motion rule stills them.
        transition:
          'transform var(--motion-micro) var(--motion-ease-toggle), opacity var(--motion-micro) var(--motion-ease-toggle)',
      }}
    >
      <ExpandMoreIcon sx={{ fontSize: 'var(--size-icon-sm)' }} />
    </Box>
  );
};

/**
 * The admin rail (SR-3; DESIGN.md, Sidebar items): a --surface column with a
 * --border hairline on its right, rows of the sidebar-item tokens (36 px compact,
 * 8 px side margins, 12 px padding, a 20 px glyph and an 8 px gap, the 6 px
 * small radius). The theme draws each row's states on ListItemButton: hover is
 * the tonal step, the current page the selection tint, the accent label and
 * glyph and a 2 px inset marker. A group's children are 36 px rows whose labels
 * align with the parent's; the current child carries a 6 px marker dot instead
 * of the edge. Collapsed, the rail is icon-only rows the full rail width, each
 * named by its label and a tooltip. Width changes are instant: width is never
 * animated.
 */
const NavigationSidebar = ({
  ariaLabel,
  open = true,
  width = 'var(--size-sidebar)',
  collapsedWidth = 'var(--size-sidebar-collapsed)',
  header,
  footer,
  sections,
}: NavigationSidebarProps) => {
  // The collapsed rail's tooltips render in a portal: give them the rail's density.
  const [tooltipAttr, setTooltipAttr] = useState<Record<string, string>>({});
  // Open rows sit inside the rail with side margins; collapsed rows span it and
  // centre their glyph.
  const rowGeometry = open
    ? {
        mx: 'var(--sidebar-item-margin-x)',
        px: 'var(--sidebar-item-padding-x)',
      }
    : {
        mx: 0,
        px: `calc((${cssLength(collapsedWidth)} - var(--sidebar-item-icon-size)) / 2)`,
      };

  return (
    <Box
      component="aside"
      aria-label={ariaLabel}
      sx={{
        width: cssLength(open ? width : collapsedWidth),
        height: '100%',
        minHeight: 0,
        flexShrink: 0,
        bgcolor: 'background.paper',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'hidden',
      }}
    >
      {header && (
        <>
          {header}
          <Divider />
        </>
      )}

      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          py: 'var(--space-2)',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          scrollbarGutter: 'stable',
        }}
      >
        {sections.map((section, sectionIndex) => (
          <Box key={section.title ?? sectionIndex}>
            {sectionIndex > 0 && <Divider sx={{ my: 'var(--space-2)' }} />}
            {section.title && (
              <Typography
                variant="caption"
                aria-hidden={!open}
                noWrap
                sx={{
                  display: 'block',
                  color: 'text.secondary',
                  fontWeight: 'var(--weight-semibold)',
                  px: 'calc(var(--sidebar-item-margin-x) + var(--sidebar-item-padding-x))',
                  pt: 'var(--space-2)',
                  pb: 'var(--space-1)',
                  opacity: open ? 1 : 0,
                }}
              >
                {section.title}
              </Typography>
            )}
            <List disablePadding>
              {section.items.map((item) => {
                const hasChildren = Boolean(item.children?.length);
                const childrenExpanded = item.expanded ?? hasChildren;
                const submenuOpen = open && childrenExpanded;
                // Collapsed, a group's children are hidden, so the group's row
                // stands for its current child and keeps the current look.
                const current = Boolean(item.selected) || (!open && Boolean(item.active));

                return (
                  <ListItem key={item.key} disablePadding sx={{ display: 'block' }}>
                    <Tooltip
                      title={open ? '' : item.label}
                      placement="right"
                      onOpen={(event) => setTooltipAttr(densityAttr(event.target as Element))}
                      slotProps={{ popper: { ...tooltipAttr } }}
                    >
                      <ListItemButton
                        selected={current}
                        onClick={item.onClick}
                        aria-label={item.label}
                        aria-current={item.selected ? 'page' : undefined}
                        aria-expanded={hasChildren ? submenuOpen : undefined}
                        sx={{
                          ...rowGeometry,
                          gap: 'var(--sidebar-item-gap)',
                          justifyContent: 'flex-start',
                          // Clip the label to the row so it never bleeds past the rail.
                          overflow: 'hidden',
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 0,
                            width: 'var(--sidebar-item-icon-size)',
                            flexShrink: 0,
                            justifyContent: 'center',
                            '& .MuiSvgIcon-root': { fontSize: 'var(--sidebar-item-icon-size)' },
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          aria-hidden={!open}
                          sx={{ my: 0, minWidth: 0, opacity: open ? 1 : 0 }}
                          slotProps={{ primary: labelProps(current) }}
                        />
                        {hasChildren && (
                          <SidebarExpandIcon expanded={submenuOpen} visible={open} />
                        )}
                      </ListItemButton>
                    </Tooltip>

                    {hasChildren && (
                      // Opens and closes at once: height is never animated. The
                      // exit still runs through Collapse, so onExited releases the
                      // retained children after the group has closed.
                      <Collapse
                        in={submenuOpen}
                        timeout={0}
                        unmountOnExit
                        onExited={childrenExpanded ? undefined : item.onChildrenExited}
                        data-testid="sidebar-submenu"
                      >
                        <List disablePadding>
                          {item.children!.map((child) => (
                            <ListItem key={child.key} disablePadding>
                              <ListItemButton
                                selected={child.selected}
                                onClick={child.onClick}
                                aria-label={child.label}
                                aria-current={child.selected ? 'page' : undefined}
                                sx={{
                                  minHeight: CHILD_ROW_HEIGHT,
                                  mx: 'var(--sidebar-item-margin-x)',
                                  px: 'var(--sidebar-item-padding-x)',
                                  gap: 'var(--sidebar-item-gap)',
                                  justifyContent: 'flex-start',
                                  overflow: 'hidden',
                                  // The current child's marker is its dot, not the inset edge.
                                  '&.Mui-selected, &[aria-current="page"]': { boxShadow: 'none' },
                                }}
                              >
                                <Box
                                  component="span"
                                  aria-hidden="true"
                                  sx={{
                                    width: 'var(--sidebar-item-icon-size)',
                                    height: 'var(--sidebar-item-icon-size)',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Box
                                    component="span"
                                    data-testid={`sidebar-child-indicator-${child.key}`}
                                    sx={{
                                      width: 'var(--sidebar-item-child-dot)',
                                      height: 'var(--sidebar-item-child-dot)',
                                      borderRadius: '50%',
                                      bgcolor: child.selected
                                        ? 'var(--sidebar-item-variant-current-marker)'
                                        : 'transparent',
                                    }}
                                  />
                                </Box>
                                <ListItemText
                                  primary={child.label}
                                  sx={{ my: 0, minWidth: 0 }}
                                  slotProps={{ primary: labelProps(Boolean(child.selected)) }}
                                />
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>
                      </Collapse>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {footer && (
        <Box sx={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)' }}>
          {footer}
        </Box>
      )}
    </Box>
  );
};

export default NavigationSidebar;
