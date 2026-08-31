import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Home as HomeIcon } from 'lucide-react';
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

describe('NavigationSidebar', () => {
  it('renders the shared navigation structure and selected item', () => {
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
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
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

    // The label stays mounted so collapsing only animates opacity — a
    // conditional unmount would change layout mid-transition.
    expect(screen.getByText('Home')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
  });

  it('keeps item geometry identical between open and collapsed so icons do not shift', () => {
    const geometry = (open: boolean) => {
      const { unmount } = render(
        <NavigationSidebar
          ariaLabel="Test navigation"
          open={open}
          sections={createSections()}
        />,
      );
      const button = screen.getByRole('button', { name: 'Home' });
      const style = window.getComputedStyle(button);
      const values = {
        justifyContent: style.justifyContent,
        marginLeft: style.marginLeft,
        paddingLeft: style.paddingLeft,
        gap: style.gap,
      };
      unmount();
      return values;
    };

    const expanded = geometry(true);
    const collapsed = geometry(false);

    expect(collapsed).toEqual(expanded);
    expect(expanded.justifyContent).toBe('flex-start');
    // 8px margin + 8px padding puts the 24px icon slot centred on the 56px rail.
    expect(expanded.marginLeft).toBe('8px');
    expect(expanded.paddingLeft).toBe('8px');
  });

  it('animates nested navigation closed before unmounting it', async () => {
    const onChildClick = vi.fn();
    const onChildrenExited = vi.fn();
    const createNestedSections = (expanded: boolean) => [
      {
        items: [
          {
            key: 'classes',
            label: 'Classes',
            icon: <HomeIcon />,
            active: true,
            expanded,
            onClick: () => undefined,
            onChildrenExited,
            children: [
              {
                key: 'edit-class',
                label: 'Edit Class',
                icon: <HomeIcon />,
                selected: true,
                onClick: onChildClick,
              },
            ],
          },
        ],
      },
    ];

    const { rerender } = render(
      <NavigationSidebar ariaLabel="Test navigation" sections={createNestedSections(true)} />,
    );

    const parentButton = screen.getByRole('button', { name: 'Classes' });
    expect(parentButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('sidebar-expand-icon')).toHaveStyle({
      transform: 'rotate(0deg)',
    });
    expect(window.getComputedStyle(screen.getByTestId('sidebar-expand-icon')).transition)
      .toContain('transform');
    expect(screen.getByTestId('sidebar-submenu')).toBeInTheDocument();
    const childButton = screen.getByRole('button', { name: 'Edit Class' });
    const parentStyle = window.getComputedStyle(parentButton);
    const childStyle = window.getComputedStyle(childButton);
    const childIndicator = screen.getByTestId('sidebar-child-indicator-edit-class');
    const nestedListStyle = window.getComputedStyle(childButton.closest('ul')!);
    expect(nestedListStyle.marginLeft).toBe('0px');
    expect(nestedListStyle.borderLeftStyle).not.toBe('solid');
    expect(childButton.querySelector('svg')).not.toBeInTheDocument();
    expect(childStyle.paddingLeft).toBe(parentStyle.paddingLeft);
    expect(childStyle.gap).toBe(parentStyle.gap);
    expect(childStyle.minHeight).toBe('40px');
    expect(window.getComputedStyle(childIndicator.parentElement!).width).toBe('24px');
    // The active parent carries the sidebar accent fill; child rows stay flat.
    expect(parentButton.classList.contains('bg-accent')).toBe(true);
    expect(childButton.classList.contains('bg-accent')).toBe(false);
    fireEvent.click(childButton);
    expect(onChildClick).toHaveBeenCalledOnce();

    rerender(
      <NavigationSidebar
        ariaLabel="Test navigation"
        sections={createNestedSections(false)}
      />,
    );
    expect(screen.getByRole('button', { name: 'Classes' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('sidebar-expand-icon')).toHaveStyle({
      transform: 'rotate(-90deg)',
    });
    expect(screen.getByRole('button', { name: 'Edit Class' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Edit Class' })).not.toBeInTheDocument();
    });
    expect(onChildrenExited).toHaveBeenCalledOnce();
  });
});
