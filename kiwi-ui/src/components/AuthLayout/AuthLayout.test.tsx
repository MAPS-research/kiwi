import { render, screen, within } from '@testing-library/react';
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

// Token values stay var() strings in jsdom's computed style.
const computed = (element: Element | ChildNode | null) => getComputedStyle(element as Element);

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

  it('paints the canvas, with no photo and no gradient', () => {
    const { container } = renderWithTheme(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const style = computed(container.firstChild);
    expect(style.backgroundImage).not.toContain('url(');
    expect(style.background).not.toContain('bg-campus');
    expect(style.background).not.toContain('gradient');
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

  describe('the split shell', () => {
    it('sets the aside beside the form column, each on its own ruler', () => {
      renderWithTheme(
        <AuthLayout variant="split">
          <div>Login content</div>
        </AuthLayout>
      );

      const aside = screen.getByRole('complementary', { name: 'About Kiwi' });
      const main = screen.getByRole('main');
      expect(within(main).getByText('Login content').parentElement).toHaveClass('kiwi-ruled');
      expect(aside.firstElementChild).toHaveClass('kiwi-ruled');
      expect(computed(aside.parentElement).display).toBe('grid');
    });

    it('draws no photo, no gradient and no glass behind the aside', () => {
      renderWithTheme(
        <AuthLayout variant="split">
          <div>Login content</div>
        </AuthLayout>
      );

      const aside = screen.getByRole('complementary', { name: 'About Kiwi' });
      expect(computed(aside).backgroundImage).not.toContain('url(');
      expect(computed(aside).backgroundImage).not.toContain('gradient');
      expect(computed(aside).backdropFilter ?? '').toBe('');
    });

    it('carries the wordmark in the accent text colour and what Kiwi does', () => {
      renderWithTheme(
        <AuthLayout variant="split">
          <div>Login content</div>
        </AuthLayout>
      );

      const wordmark = screen.getByTestId('login-visual-kiwi-wordmark');
      expect(wordmark).toHaveTextContent('Kiwi');
      expect(computed(wordmark).color).toBe('var(--accent-text)');
      expect(screen.getByText('Ask about your class materials or your code.')).toBeInTheDocument();
      expect(screen.queryByText(/Learn deeply/)).not.toBeInTheDocument();
    });

    it("leads the narrow layout with Kiwi's logo, inside the main landmark", () => {
      renderWithTheme(
        <AuthLayout variant="split">
          <div>Login content</div>
        </AuthLayout>
      );

      const narrowLogo = screen.getByTestId('auth-narrow-logo');
      expect(within(screen.getByRole('main')).getByTestId('auth-narrow-logo')).toBe(narrowLogo);
      expect(within(narrowLogo).getByRole('img', { name: 'Kiwi' })).toBeInTheDocument();
    });
  });

  describe('institution branding in the split shell', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('shows only the Kiwi wordmark when no institution is configured', () => {
      renderWithTheme(
        <AuthLayout variant="split">
          <div>Login content</div>
        </AuthLayout>
      );

      const aside = screen.getByRole('complementary', { name: 'About Kiwi' });
      expect(within(aside).queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('Kiwi is an AI tutor for your classes.')).toBeInTheDocument();
      expect(screen.queryByText('An AI learning companion for your courses.')).not.toBeInTheDocument();
    });

    it('adds the institution logo and names the institution when one is configured', async () => {
      vi.stubEnv('VITE_INSTITUTION_NAME', 'Example University');
      // INSTITUTION_NAME is read when branding.ts loads.
      vi.resetModules();
      const { default: FreshAuthLayout } = await import('./AuthLayout.tsx');
      render(
        <FreshAuthLayout variant="split">
          <div>Login content</div>
        </FreshAuthLayout>
      );

      const aside = screen.getByRole('complementary', { name: 'About Kiwi' });
      expect(within(aside).getByTestId('login-visual-kiwi-wordmark')).toBeInTheDocument();
      expect(within(aside).getByRole('img', { name: 'Example University' })).toBeInTheDocument();
      expect(
        screen.getByText('Kiwi is an AI tutor for classes at Example University.'),
      ).toBeInTheDocument();
      expect(screen.queryByText('Kiwi is an AI tutor for your classes.')).not.toBeInTheDocument();
    });
  });
});
