import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TopNav from './TopNav.tsx';

type TestUser = { systemRole?: string; isAdmin?: boolean } | null;

const auth = vi.hoisted(() => ({ user: null as TestUser }));

vi.mock('../../auth/AuthContext.tsx', () => ({
  useAuth: () => ({ user: auth.user }),
}));

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement, path = '/') => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </MemoryRouter>
  );
};

const classOptions = [
  { id: 'cs-101', label: 'Introduction to Computer Science' },
  { id: 'math-201', label: 'Discrete Mathematics' },
];

describe('TopNav', () => {
  afterEach(() => {
    auth.user = null;
  });

  it('renders the logo as one image named Kiwi', () => {
    renderWithProviders(<TopNav />);
    expect(screen.getByRole('img', { name: 'Kiwi' })).toBeInTheDocument();
  });

  it('links the logo to the course list on student routes', () => {
    renderWithProviders(<TopNav />);
    const logo = screen.getByRole('img', { name: 'Kiwi' });
    expect(logo.closest('a')).toHaveAttribute('href', '/');
  });

  it('links the logo to the admin area on admin routes', () => {
    renderWithProviders(<TopNav />, '/admin/classes');
    const logo = screen.getByRole('img', { name: 'Kiwi' });
    expect(logo.closest('a')).toHaveAttribute('href', '/admin');
  });

  it('shows the 28 px logo with "Kiwi" beside it', () => {
    const { container } = renderWithProviders(<TopNav />);
    const logo = screen.getByRole('img', { name: 'Kiwi' });

    expect(logo).toHaveTextContent('Kiwi');
    expect(container.querySelector('img')).toHaveAttribute('src', '/assets/images/kiwi-mark.svg');
    expect(container.querySelector('img')).toHaveStyle({ width: '28px', height: '28px' });
    expect(logo.closest('a')).toHaveStyle({ display: 'inline-flex', textDecoration: 'none' });
  });

  it('displays the sign-out icon with a tooltip', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopNav />);
    const signOut = screen.getByRole('link', { name: 'Sign out' });
    expect(signOut).toHaveAttribute('href', '/logout');
    expect(screen.queryByRole('link', { name: 'Logout' })).not.toBeInTheDocument();

    await user.hover(signOut);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Sign out');
  });

  it('is comfortable on student routes and compact on admin routes', () => {
    const { container, unmount } = renderWithProviders(<TopNav />);
    expect(container.querySelector('header')).toHaveAttribute('data-density', 'comfortable');
    unmount();

    const admin = renderWithProviders(<TopNav />, '/admin/classes');
    expect(admin.container.querySelector('header')).toHaveAttribute('data-density', 'compact');
  });

  it('shows class context beside the logo with a short divider', () => {
    renderWithProviders(<TopNav contextLabel="Introduction to Computer Science" />);

    const logo = screen.getByRole('img', { name: 'Kiwi' });
    const className = screen.getByText('Introduction to Computer Science');
    const divider = screen.getByTestId('top-nav-context-divider');

    expect(logo.closest('a')?.nextElementSibling).toBe(divider);
    expect(divider).toHaveAttribute('aria-hidden', 'true');
    expect(divider).toHaveStyle({ width: '1px' });
    expect(className).toHaveAttribute('title', 'Introduction to Computer Science');
  });

  it('keeps the class context next to the logo even when a brand area width is passed', () => {
    renderWithProviders(
      <TopNav brandAreaWidth={220} contextLabel="Introduction to Computer Science" />,
    );

    const logoLink = screen.getByRole('img', { name: 'Kiwi' }).closest('a');
    expect(logoLink).not.toHaveStyle({ width: '220px' });
    expect(logoLink?.nextElementSibling).toBe(screen.getByTestId('top-nav-context-divider'));
  });

  it('shows a loading placeholder while the class name loads', () => {
    renderWithProviders(<TopNav contextLoading />);
    expect(screen.getByLabelText('Loading class name')).toBeInTheDocument();
  });

  it('searches and switches classes from the context dropdown', async () => {
    const user = userEvent.setup();
    const onClassChange = vi.fn();

    renderWithProviders(
      <TopNav
        contextLabel="Introduction to Computer Science"
        selectedClassId="cs-101"
        classOptions={classOptions}
        onClassChange={onClassChange}
      />,
    );

    const switcher = screen.getByRole('button', {
      name: 'Switch class. Current: Introduction to Computer Science',
    });
    await user.click(switcher);
    const search = screen.getByRole('textbox', { name: 'Search classes' });
    expect(search).toHaveAttribute('placeholder', 'Search classes');
    expect(
      screen.getByRole('option', { name: /Introduction to Computer Science/ }),
    ).toHaveAttribute('aria-selected', 'true');
    await user.type(search, 'Discrete');
    await user.click(screen.getByRole('option', { name: /Discrete Mathematics/ }));

    expect(onClassChange).toHaveBeenCalledWith('math-201');
    expect(screen.queryByRole('textbox', { name: 'Search classes' })).not.toBeInTheDocument();
  });

  it('supports keyboard navigation in the class switcher', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <TopNav
        contextLabel="Introduction to Computer Science"
        selectedClassId="cs-101"
        classOptions={classOptions}
        onClassChange={vi.fn()}
      />,
    );

    const switcher = screen.getByRole('button', {
      name: 'Switch class. Current: Introduction to Computer Science',
    });
    await user.click(switcher);
    expect(screen.getByRole('textbox', { name: 'Search classes' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('option', { name: /Introduction to Computer Science/ }),
    ).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: 'Search classes' })).not.toBeInTheDocument();
    });
    expect(switcher).toHaveFocus();
  });

  it('offers the create action in the switcher to admins only', async () => {
    const user = userEvent.setup();
    auth.user = { systemRole: 'admin' };
    renderWithProviders(
      <TopNav
        contextLabel="Introduction to Computer Science"
        selectedClassId="cs-101"
        classOptions={classOptions}
        onClassChange={vi.fn()}
      />,
      '/admin/class/cs-101',
    );

    await user.click(screen.getByRole('button', { name: /^Switch class\. Current:/ }));
    expect(screen.getByRole('button', { name: 'Create class' })).toBeInTheDocument();
  });

  it('names the view switch in sentence case for admins on student routes', () => {
    auth.user = { systemRole: 'admin' };
    renderWithProviders(<TopNav />);

    expect(screen.getByRole('button', { name: 'Switch to Admin view' })).toBeInTheDocument();
  });

  it('names the view switch for instructors on student routes', () => {
    auth.user = { systemRole: 'instructor' };
    renderWithProviders(<TopNav />);

    expect(screen.getByRole('button', { name: 'Switch to Instructor view' })).toBeInTheDocument();
  });

  it('offers the student view on admin routes', () => {
    auth.user = { systemRole: 'instructor' };
    renderWithProviders(<TopNav />, '/admin/classes');

    expect(screen.getByRole('button', { name: 'Switch to student view' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Switch to Instructor view/ })).not.toBeInTheDocument();
  });

  it('hides the view switch from students', () => {
    renderWithProviders(<TopNav />);
    expect(screen.queryByRole('button', { name: /^Switch to / })).not.toBeInTheDocument();
  });

  it('opens the navigation drawer from the menu button on admin routes', async () => {
    const user = userEvent.setup();
    const onMenuToggle = vi.fn();
    renderWithProviders(<TopNav onMenuToggle={onMenuToggle} />, '/admin/classes');

    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(onMenuToggle).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Toggle navigation menu' })).not.toBeInTheDocument();
  });

  it('has no navigation menu button on student routes', () => {
    renderWithProviders(<TopNav onMenuToggle={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Open navigation menu' })).not.toBeInTheDocument();
  });
});
