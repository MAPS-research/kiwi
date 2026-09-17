import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MCPAuthorize } from './MCPAuthorize.tsx';

// Mock dependencies
const mockLogin = vi.fn();
const mockNavigate = vi.fn();
let mockUser: any = null;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

vi.mock('../auth/AuthContext.tsx', () => ({
  useAuth: () => ({
    user: mockUser,
    login: mockLogin,
    isAuthenticated: !!mockUser
  })
}));

// Mock child components
vi.mock('../components/AuthLayout/AuthLayout.tsx', () => ({
  default: ({ children }: any) => (
    <div data-testid="auth-layout">{children}</div>
  )
}));

vi.mock('../components/FormCard/FormCard.tsx', () => ({
  default: ({ children }: any) => (
    <div data-testid="form-card">{children}</div>
  )
}));

vi.mock('../components/LogoBox/LogoBox.tsx', () => ({
  default: () => <div data-testid="logo-box">Logo</div>
}));

vi.mock('../components/GoogleLoginButton/GoogleLoginButton.tsx', () => ({
  GoogleLoginButton: ({ mode }: any) => (
    <div data-testid="google-login-button" data-mode={mode}>
      Google {mode} Button
    </div>
  )
}));

// Mock API basePath
vi.mock('../utils/api.ts', () => ({
  basePath: 'http://localhost:3000',
}));

const theme = createTheme();

const renderWithRoute = (component: React.ReactElement, route: string) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </MemoryRouter>
  );
};

describe('MCPAuthorize Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockNavigate.mockClear();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue('test-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Invalid Request', () => {
    it('shows error when oauth_pending is not present', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize');

      expect(screen.getByText('Invalid Authorization Request')).toBeInTheDocument();
      expect(screen.getByText('This page is only accessible during an OAuth authorization flow.')).toBeInTheDocument();
    });

    it('shows error when oauth_pending is not true', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=false');

      expect(screen.getByText('Invalid Authorization Request')).toBeInTheDocument();
    });
  });

  describe('Logged-in User View', () => {
    beforeEach(() => {
      mockUser = {
        username: 'test@example.com',
        consent: true,
        systemRole: 'user'
      };
    });

    it('shows authorization confirmation for logged-in user', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      expect(screen.getByText('Authorize Application')).toBeInTheDocument();
      expect(screen.getByText('An application is requesting access to your account.')).toBeInTheDocument();
      expect(screen.getByText('Signed in as: test@example.com')).toBeInTheDocument();
    });

    it('shows Authorize button for logged-in user', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      expect(screen.getByRole('button', { name: 'Authorize' })).toBeInTheDocument();
    });

    it('shows Cancel button for logged-in user', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('does not show login form for logged-in user', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      expect(screen.queryByLabelText('Your Email')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    });

    it('does not show Google login button for logged-in user', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      expect(screen.queryByTestId('google-login-button')).not.toBeInTheDocument();
    });

    it('calls fetch with Authorization header when Authorize is clicked', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ redirectUrl: 'http://example.com/callback' }),
      });
      global.fetch = mockFetch;

      // Mock window.location.href
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' } as any;

      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      const authorizeButton = screen.getByRole('button', { name: 'Authorize' });
      fireEvent.click(authorizeButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/auth/oauth-authorize',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Authorization': 'Bearer test-token',
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          })
        );
      });

      await waitFor(() => {
        expect(window.location.href).toBe('http://example.com/callback');
      });

      // Restore window.location
      window.location = originalLocation;
    });

    it('navigates to home when fetch encounters CORS error (authorization succeeded)', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
      global.fetch = mockFetch;

      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      const authorizeButton = screen.getByRole('button', { name: 'Authorize' });
      fireEvent.click(authorizeButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('navigates to home when Cancel is clicked', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Logged-out User View', () => {
    beforeEach(() => {
      mockUser = null;
    });

    it('shows info banner for logged-out user', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      expect(screen.getByText('Sign in to authorize the application to access your account.')).toBeInTheDocument();
    });

    it('shows login form for logged-out user', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      expect(screen.getByLabelText('Your Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('shows Login & Authorize button for logged-out user', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      expect(screen.getByRole('button', { name: 'Login & Authorize' })).toBeInTheDocument();
    });

    it('hides Google login by default', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      expect(screen.queryByTestId('google-login-button')).not.toBeInTheDocument();
    });

    it('shows Google login button when enabled', () => {
      vi.stubEnv('VITE_ENABLE_GOOGLE_LOGIN', 'true');
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
      vi.unstubAllEnvs();
    });

    it('does not show Authorize confirmation for logged-out user', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      expect(screen.queryByText('Authorize Application')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Authorize' })).not.toBeInTheDocument();
    });

    it('handles email input changes', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      const emailInput = screen.getByLabelText('Your Email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('handles password input changes', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      const passwordInput = screen.getByLabelText('Password');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(passwordInput).toHaveValue('password123');
    });

    it('submits form to oauth-login endpoint when form is submitted', async () => {
      // Mock form submit
      const mockSubmit = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'form') {
          element.submit = mockSubmit;
        }
        return element;
      });

      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');

      const emailInput = screen.getByLabelText('Your Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login & Authorize' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalled();
      });

      // Check that form was created with correct action
      const forms = document.querySelectorAll('form[action*="oauth-login"]');
      expect(forms.length).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });
  });

  describe('Component Structure', () => {
    it('uses AuthLayout for consistent styling', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');
      expect(screen.getByTestId('auth-layout')).toBeInTheDocument();
    });

    it('uses FormCard for form container', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');
      expect(screen.getByTestId('form-card')).toBeInTheDocument();
    });

    it('uses LogoBox for branding', () => {
      renderWithRoute(<MCPAuthorize />, '/authorize?oauth_pending=true');
      expect(screen.getByTestId('logo-box')).toBeInTheDocument();
    });
  });
});
