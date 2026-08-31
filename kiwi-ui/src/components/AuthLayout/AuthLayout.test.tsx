import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AuthLayout from './AuthLayout.tsx';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('AuthLayout', () => {
  it('renders without crashing', () => {
    renderWithTheme(
      <AuthLayout>
        <div>Auth content</div>
      </AuthLayout>
    );
    expect(screen.getByText('Auth content')).toBeInTheDocument();
  });

  it('renders children correctly', () => {
    renderWithTheme(
      <AuthLayout>
        <div data-testid="auth-form">Login Form</div>
        <button>Submit</button>
      </AuthLayout>
    );

    expect(screen.getByTestId('auth-form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('has at least full viewport height', () => {
    const { container } = renderWithTheme(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const layoutBox = container.firstChild;
    expect(layoutBox).toHaveStyle({ minHeight: '100vh' });
  });

  it('uses campus background image', () => {
    const { container } = renderWithTheme(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const layoutBox = container.firstChild;
    expect(layoutBox).toHaveStyle({
      background: expect.stringContaining('/assets/images/bg-campus.jpg')
    });
  });

  it('centers content', () => {
    const { container } = renderWithTheme(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const layoutBox = container.firstChild;
    expect(layoutBox).toHaveStyle({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    });
  });

  it('uses extra small container max width', () => {
    const { container } = renderWithTheme(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const containerElement = container.querySelector('.MuiContainer-root');
    expect(containerElement).toHaveClass('MuiContainer-maxWidthXs');
  });

  it('has proper structure with Box and Container', () => {
    const { container } = renderWithTheme(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    expect(container.firstChild).toHaveClass('MuiBox-root');
    expect(container.querySelector('.MuiContainer-root')).toBeInTheDocument();
  });

  it('applies background cover positioning', () => {
    const { container } = renderWithTheme(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const layoutBox = container.firstChild;
    expect(layoutBox).toHaveStyle({
      background: expect.stringContaining('no-repeat center/cover')
    });
  });

  it('handles empty children', () => {
    const { container } = renderWithTheme(<AuthLayout>{null}</AuthLayout>);

    expect(container.firstChild).toBeInTheDocument();
    expect(container.querySelector('.MuiContainer-root')).toBeInTheDocument();
  });

  it('handles multiple child elements', () => {
    renderWithTheme(
      <AuthLayout>
        <h1>Title</h1>
        <form>
          <input type="text" placeholder="Username" />
          <input type="password" placeholder="Password" />
          <button type="submit">Login</button>
        </form>
        <p>Footer text</p>
      </AuthLayout>
    );

    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Footer text')).toBeInTheDocument();
  });

  it('renders the split authentication shell', () => {
    renderWithTheme(
      <AuthLayout variant="split">
        <div>Login content</div>
      </AuthLayout>
    );

    expect(screen.getByRole('complementary', { name: 'About Kiwi' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Kiwi' })).toBeInTheDocument();
    expect(screen.getByTestId('login-visual-kiwi-wordmark')).toHaveTextContent('Kiwi');
    expect(screen.getByText('Login content')).toBeInTheDocument();
  });
});
