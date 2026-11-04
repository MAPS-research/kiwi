import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HomeOutlined as HomeIcon } from '@mui/icons-material';
import NavigationSidebar from './NavigationSidebar.tsx';

const createSections = (onClick = () => undefined) => [
  {
    items: [
      {
        key: 'home',
        label: 'Home',
        icon: <HomeIcon />,
        selected: true,
        onClick,
      },
    ],
  },
];

const createNestedSections = (
  expanded: boolean,
  handlers: { onChildClick?: () => void; onChildrenExited?: () => void } = {},
) => [
  {
    items: [
      {
        key: 'classes',
        label: 'Classes',
        icon: <HomeIcon />,
        active: true,
        expanded,
        onClick: () => undefined,
        onChildrenExited: handlers.onChildrenExited,
        children: [
          {
            key: 'edit-class',
            label: 'Edit class',
            icon: <HomeIcon />,
            selected: true,
            onClick: handlers.onChildClick ?? (() => undefined),
          },
          {
            key: 'materials',
            label: 'Materials',
            icon: <HomeIcon />,
            onClick: () => undefined,
          },
        ],
      },
    ],
  },
];

describe('NavigationSidebar', () => {
  it('renders the shared navigation structure and marks the current page', () => {
    render(
      <NavigationSidebar
        ariaLabel="Test navigation"
        sections={createSections()}
      />,
    );

    const sidebar = screen.getByRole('complementary', { name: 'Test navigation' });
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveStyle({ height: '100%', minHeight: 0 });
    expect(sidebar.firstElementChild).toHaveStyle({ overflowY: 'auto' });
    const home = screen.getByRole('button', { name: 'Home' });
    expect(home).toHaveClass('Mui-selected');
    expect(home).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('draws the rail on the sidebar tokens: a --surface column with a --border edge, no width animation', () => {
    render(
      <NavigationSidebar
        ariaLabel="Test navigation"
        sections={createSections()}
      />,
    );

    const sidebar = screen.getByRole('complementary', { name: 'Test navigation' });
    const style = window.getComputedStyle(sidebar);
    expect(style.width).toBe('var(--size-sidebar)');
    expect(style.borderRight).toContain('var(--border)');
    expect(style.transitionProperty).not.toContain('width');
  });

  it('uses the same item callback for navigation consumers', () => {
    const onClick = vi.fn();
    render(
      <NavigationSidebar
        ariaLabel="Test navigation"
        sections={createSections(onClick)}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('keeps an accessible label while hiding text in collapsed mode', () => {
    render(
      <NavigationSidebar
        ariaLabel="Test navigation"
        open={false}
        sections={createSections()}
      />,
    );

    // The label stays mounted and is only hidden, so the row keeps its name.
    expect(screen.getByText('Home').closest('.MuiListItemText-root')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
  });

  it('sets open rows inside the rail and collapsed rows across it, on the sidebar-item tokens', () => {
    const geometry = (open: boolean) => {
      const { unmount } = render(
        <NavigationSidebar
          ariaLabel="Test navigation"
          open={open}
          sections={createSections()}
        />,
      );
      const sidebar = screen.getByRole('complementary', { name: 'Test navigation' });
      const style = window.getComputedStyle(screen.getByRole('button', { name: 'Home' }));
      const values = {
        railWidth: window.getComputedStyle(sidebar).width,
        justifyContent: style.justifyContent,
        marginLeft: style.marginLeft,
        paddingLeft: style.paddingLeft,
        gap: style.gap,
      };
      unmount();
      return values;
    };

    expect(geometry(true)).toEqual({
      railWidth: 'var(--size-sidebar)',
      justifyContent: 'flex-start',
      marginLeft: 'var(--sidebar-item-margin-x)',
      paddingLeft: 'var(--sidebar-item-padding-x)',
      gap: 'var(--sidebar-item-gap)',
    });
    // Collapsed: icon-only rows the full rail width, the glyph centred on the rail.
    expect(geometry(false)).toEqual({
      railWidth: 'var(--size-sidebar-collapsed)',
      justifyContent: 'flex-start',
      marginLeft: '0px',
      paddingLeft: 'calc((var(--size-sidebar-collapsed) - var(--sidebar-item-icon-size)) / 2)',
      gap: 'var(--sidebar-item-gap)',
    });
  });

  it('marks the current child with its dot and aligns child labels with the parent label', () => {
    render(
      <NavigationSidebar ariaLabel="Test navigation" sections={createNestedSections(true)} />,
    );

    const parentButton = screen.getByRole('button', { name: 'Classes' });
    const childButton = screen.getByRole('button', { name: 'Edit class' });
    const otherChild = screen.getByRole('button', { name: 'Materials' });

    // The group is open, but the current page is its child.
    expect(parentButton).not.toHaveClass('Mui-selected');
    expect(parentButton).not.toHaveAttribute('aria-current');
    expect(childButton).toHaveClass('Mui-selected');
    expect(childButton).toHaveAttribute('aria-current', 'page');
    expect(otherChild).not.toHaveAttribute('aria-current');

    const parentStyle = window.getComputedStyle(parentButton);
    const childStyle = window.getComputedStyle(childButton);
    expect(childButton.querySelector('.MuiSvgIcon-root')).not.toBeInTheDocument();
    expect(childStyle.paddingLeft).toBe(parentStyle.paddingLeft);
    expect(childStyle.gap).toBe(parentStyle.gap);
    expect(childStyle.minHeight).toBe('36px');
    // The current child's marker is its dot, so it draws no inset edge.
    expect(childStyle.boxShadow).toBe('none');

    const dot = screen.getByTestId('sidebar-child-indicator-edit-class');
    expect(window.getComputedStyle(dot.parentElement!).width).toBe('var(--sidebar-item-icon-size)');
    expect(window.getComputedStyle(dot).width).toBe('var(--sidebar-item-child-dot)');
    expect(window.getComputedStyle(dot).backgroundColor).toBe('var(--sidebar-item-variant-current-marker)');
    expect(
      window.getComputedStyle(screen.getByTestId('sidebar-child-indicator-materials')).backgroundColor,
    ).toBe('rgba(0, 0, 0, 0)');
    expect(window.getComputedStyle(childButton.closest('ul')!).borderLeftStyle).not.toBe('solid');
  });

  it('keeps the current look on a group whose child is current while the rail is collapsed', () => {
    render(
      <NavigationSidebar
        ariaLabel="Test navigation"
        open={false}
        sections={createNestedSections(true)}
      />,
    );

    const parentButton = screen.getByRole('button', { name: 'Classes' });
    expect(parentButton).toHaveClass('Mui-selected');
    // It is not the current page itself.
    expect(parentButton).not.toHaveAttribute('aria-current');
    expect(parentButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Edit class' })).not.toBeInTheDocument();
  });

  it('closes nested navigation at once, then unmounts it and releases it', async () => {
    const onChildClick = vi.fn();
    const onChildrenExited = vi.fn();

    const { rerender } = render(
      <NavigationSidebar
        ariaLabel="Test navigation"
        sections={createNestedSections(true, { onChildClick, onChildrenExited })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Classes' })).toHaveAttribute('aria-expanded', 'true');
    // Open, the chevron points up; only its transform and opacity move.
    expect(screen.getByTestId('sidebar-expand-icon')).toHaveStyle({ transform: 'rotate(180deg)' });
    expect(window.getComputedStyle(screen.getByTestId('sidebar-expand-icon')).transition)
      .toContain('transform');
    expect(screen.getByTestId('sidebar-submenu')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit class' }));
    expect(onChildClick).toHaveBeenCalledOnce();

    rerender(
      <NavigationSidebar
        ariaLabel="Test navigation"
        sections={createNestedSections(false, { onChildClick, onChildrenExited })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Classes' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('sidebar-expand-icon')).toHaveStyle({ transform: 'rotate(0deg)' });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Edit class' })).not.toBeInTheDocument();
    });
    expect(onChildrenExited).toHaveBeenCalledOnce();
  });
});
