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
  useMediaQuery,
} from '@mui/material';

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
// the icon's x position depends on `open`.
const ICON_SLOT_WIDTH = 24;
const EXPAND_ICON_WIDTH = 20;
const ITEM_MARGIN_X = 8;
const LABEL_GAP = 12;

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
        width: EXPAND_ICON_WIDTH,
        height: EXPAND_ICON_WIDTH,
        ml: 'auto',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transform: animatedExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
        transition: (theme) =>
          theme.transitions.create(['transform', 'opacity'], {
            duration: theme.transitions.duration.shorter,
          }),
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
        },
      }}
    >
      <ExpandMoreIcon sx={{ fontSize: 18 }} />
    </Box>
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
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
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

  return (
    <Box
      component="aside"
      aria-label={ariaLabel}
      sx={{
        width: open ? width : collapsedWidth,
        height: '100%',
        minHeight: 0,
        flexShrink: 0,
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'hidden',
        transition: (theme) =>
          theme.transitions.create('width', {
            duration: theme.transitions.duration.shorter,
          }),
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
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          scrollbarGutter: 'stable',
        }}
      >
        {sections.map((section, sectionIndex) => (
          <Box key={section.title ?? sectionIndex}>
            {sectionIndex > 0 && <Divider />}
            {section.title && (
              <Typography
                variant="caption"
                aria-hidden={!open}
                sx={{
                  color: "text.secondary",
                  display: 'block',
                  width: titleWidth,
                  px: `${textInsetX}px`,
                  pt: 1.5,
                  pb: 0.5,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  opacity: open ? 1 : 0,

                  transition: (theme) =>
                    theme.transitions.create('opacity', {
                      duration: theme.transitions.duration.shorter,
                    })
                }}>
                {section.title}
              </Typography>
            )}
            <List sx={{ py: 1 }}>
              {section.items.map((item) => {
                const hasChildren = Boolean(item.children?.length);
                const childrenExpanded = item.expanded ?? hasChildren;
                const submenuOpen = open && childrenExpanded;
                const itemLabelWidth = Math.max(
                  0,
                  labelWidth - (hasChildren ? EXPAND_ICON_WIDTH + LABEL_GAP : 0),
                );

                return (
                  <Box key={item.key}>
                    <ListItem disablePadding>
                      <Tooltip title={open ? '' : item.label} placement="right">
                        <ListItemButton
                          selected={item.selected}
                          onClick={item.onClick}
                          aria-label={item.label}
                          aria-current={item.selected ? 'page' : undefined}
                          aria-expanded={hasChildren ? submenuOpen : undefined}
                          sx={{
                            minHeight: 44,
                            mx: `${ITEM_MARGIN_X}px`,
                            px: `${itemPaddingX}px`,
                            gap: `${LABEL_GAP}px`,
                            justifyContent: 'flex-start',
                            borderRadius: 1.5,
                            color: item.selected || item.active ? 'primary.main' : undefined,
                            bgcolor: item.active ? 'action.selected' : undefined,
                            // Clip the label to the button so it disappears with the
                            // rail instead of bleeding past the rounded edge.
                            overflow: 'hidden',
                            '&.Mui-selected': {
                              color: 'primary.main',
                              bgcolor: 'action.selected',
                              '&:hover': {
                                bgcolor: 'action.selected',
                              },
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 0,
                              width: ICON_SLOT_WIDTH,
                              flexShrink: 0,
                              color: 'inherit',
                              justifyContent: 'center',
                              '& .MuiSvgIcon-root': { fontSize: 20 },
                            }}
                          >
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.label}
                            aria-hidden={!open}
                            sx={{
                              my: 0,
                              width: itemLabelWidth,
                              flexShrink: 0,
                              opacity: open ? 1 : 0,
                              transition: (theme) =>
                                theme.transitions.create('opacity', {
                                  duration: theme.transitions.duration.shorter,
                                }),
                            }}
                            slotProps={{
                              primary: {
                                variant: 'body2',
                                sx: { fontWeight: item.selected || item.active ? 600 : 500 },
                                noWrap: true,
                              },
                            }}
                          />
                          {hasChildren && (
                            <SidebarExpandIcon expanded={submenuOpen} visible={open} />
                          )}
                        </ListItemButton>
                      </Tooltip>
                    </ListItem>

                    {hasChildren && (
                      <Collapse
                        in={submenuOpen}
                        timeout={reduceMotion ? 0 : 'auto'}
                        appear={!reduceMotion}
                        unmountOnExit
                        onExited={childrenExpanded ? undefined : item.onChildrenExited}
                        data-testid="sidebar-submenu"
                      >
                        <List
                          disablePadding
                          sx={{
                            ml: 0,
                            mb: 0.5,
                          }}
                        >
                          {item.children!.map((child) => (
                            <ListItem key={child.key} disablePadding>
                              <ListItemButton
                                selected={child.selected}
                                onClick={child.onClick}
                                aria-label={child.label}
                                aria-current={child.selected ? 'page' : undefined}
                                sx={{
                                  minHeight: 40,
                                  mx: 1,
                                  px: 1,
                                  gap: `${LABEL_GAP}px`,
                                  justifyContent: 'flex-start',
                                  borderRadius: 1.5,
                                  overflow: 'hidden',
                                  '&.Mui-selected': {
                                    color: 'primary.main',
                                    bgcolor: 'transparent',
                                    '&:hover': {
                                      bgcolor: 'action.hover',
                                    },
                                  },
                                }}
                              >
                                <Box
                                  component="span"
                                  aria-hidden="true"
                                  sx={{
                                    width: ICON_SLOT_WIDTH,
                                    height: ICON_SLOT_WIDTH,
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
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      bgcolor: child.selected ? 'primary.main' : 'transparent',
                                    }}
                                  />
                                </Box>
                                <ListItemText
                                  primary={child.label}
                                  sx={{ my: 0, minWidth: 0 }}
                                  slotProps={{
                                    primary: {
                                      variant: 'body2',
                                      sx: { fontSize: 13, fontWeight: child.selected ? 600 : 500 },
                                      noWrap: true,
                                    },
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>
                      </Collapse>
                    )}
                  </Box>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {footer && (
        <Box sx={{ flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' }}>
          {footer}
        </Box>
      )}
    </Box>
  );
};

export default NavigationSidebar;
