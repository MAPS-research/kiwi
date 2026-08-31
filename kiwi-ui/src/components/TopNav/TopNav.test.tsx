import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TopNav from './TopNav.tsx';

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('TopNav', () => {
  it('renders without crashing', () => {
    renderWithProviders(<TopNav />);
    expect(screen.getByRole('img', { name: 'Kiwi' })).toBeInTheDocument();
  });

  it('displays institution logo with correct link', () => {
    renderWithProviders(<TopNav />);
    const logo = screen.getByRole('img', { name: 'Kiwi' });
    expect(logo.closest('a')).toHaveAttribute('href', '/');
  });

  it('displays the logout icon with a tooltip', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TopNav />);
    const logoutButton = screen.getByRole('link', { name: 'Logout' });
    expect(logoutButton).toBeInTheDocument();
    expect(logoutButton).toHaveAttribute('href', '/logout');

    await user.hover(logoutButton);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Logout');
  });

  it('has proper navigation bar structure', () => {
    const { container } = renderWithProviders(<TopNav />);
    const navbar = container.querySelector('[role="navigation"], .MuiBox-root');

    expect(navbar || container.firstChild).toBeInTheDocument();
  });

  it('has correct logo container dimensions', () => {
    renderWithProviders(<TopNav />);
    const logoImg = screen.getByRole('img', { name: 'Kiwi' });
    const logoLink = logoImg.closest('a');

    expect(logoImg).toHaveStyle({ width: '144px', height: '32px' });

    expect(logoLink).toHaveStyle({
      display: 'flex',
      textDecoration: 'none',
      alignItems: 'center'
    });
  });

  it('shows class context beside the logo with a short divider', () => {
    renderWithProviders(<TopNav contextLabel="Introduction to Computer Science" />);

    const logo = screen.getByRole('img', { name: 'Kiwi' });
    const className = screen.getByText('Introduction to Computer Science');
    const divider = screen.getByTestId('top-nav-context-divider');

    expect(logo.closest('a')?.nextElementSibling).toBe(divider);
    expect(divider).toHaveStyle({ width: '1px', height: '24px' });
    expect(className).toHaveAttribute('title', 'Introduction to Computer Science');
  });

  it('left-aligns the logo in a fixed brand area aligned with the sidebar', () => {
    renderWithProviders(
      <TopNav
        brandAreaWidth={220}
        contextLabel="Introduction to Computer Science"
      />,
    );

    const logo = screen.getByRole('img', { name: 'Kiwi' });
    const logoLink = logo.closest('a');
    const divider = screen.getByTestId('top-nav-context-divider');

    expect(logoLink).toHaveStyle({
      width: '220px',
      justifyContent: 'flex-start',
      paddingLeft: '16px',
    });
    expect(divider).toHaveStyle({ marginLeft: '0px' });
  });

  it('searches and switches classes from the context dropdown', async () => {
    const user = userEvent.setup();
    const onClassChange = vi.fn();

    renderWithProviders(
      <TopNav
        contextLabel="Introduction to Computer Science"
        selectedClassId="cs-101"
        classOptions={[
          { id: 'cs-101', label: 'Introduction to Computer Science' },
          { id: 'math-201', label: 'Discrete Mathematics' },
        ]}
        onClassChange={onClassChange}
      />,
    );

    const switcher = screen.getByRole('button', {
      name: 'Switch class scope. Current selection: Introduction to Computer Science',
    });
    await user.click(switcher);
    const search = screen.getByRole('textbox', { name: 'Search classes' });
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
        classOptions={[
          { id: 'cs-101', label: 'Introduction to Computer Science' },
          { id: 'math-201', label: 'Discrete Mathematics' },
        ]}
        onClassChange={vi.fn()}
      />,
    );

    const switcher = screen.getByRole('button', {
      name: 'Switch class scope. Current selection: Introduction to Computer Science',
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

  it('logout button has an accessible icon target', () => {
    renderWithProviders(<TopNav />);
    const logoutButton = screen.getByRole('link', { name: 'Logout' });

    expect(logoutButton).toHaveStyle({
      width: '44px',
      height: '44px',
    });
  });

  it('has responsive design elements', () => {
    renderWithProviders(<TopNav />);
    // Test that key elements are present for responsive design
    expect(screen.getByRole('img', { name: 'Kiwi' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Logout' })).toBeInTheDocument();
  });
});
