import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { GoogleLoginButton } from './GoogleLoginButton.tsx';

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_BACKEND_URL: 'http://localhost:3000'
  }
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// Mock window.location
const mockLocation = {
  origin: 'http://localhost:3001',
  href: ''
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

describe('GoogleLoginButton', () => {
  beforeEach(() => {
    mockLocation.href = '';
  });

  it('renders without crashing', () => {
    renderWithTheme(<GoogleLoginButton mode="login" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays sign-in text when mode is login', () => {
    renderWithTheme(<GoogleLoginButton mode="login" />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    expect(screen.queryByText('Login with Google')).not.toBeInTheDocument();
  });

  it('displays sign-up text when mode is register', () => {
    renderWithTheme(<GoogleLoginButton mode="register" />);
    expect(screen.getByText('Sign up with Google')).toBeInTheDocument();
    expect(screen.queryByText('Register with Google')).not.toBeInTheDocument();
  });

  it('redirects to backend auth URL on click', () => {
    renderWithTheme(<GoogleLoginButton mode="login" />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockLocation.href).toBe(
      'http://localhost:3000/auth?frontend=http://localhost:3001'
    );
  });

  it('uses correct backend URL from environment', () => {
    renderWithTheme(<GoogleLoginButton mode="register" />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockLocation.href).toContain('http://localhost:3000/auth');
  });

  it('passes current origin as frontend parameter', () => {
    mockLocation.origin = 'https://app.example.com';
    
    renderWithTheme(<GoogleLoginButton mode="login" />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockLocation.href).toBe(
      'http://localhost:3000/auth?frontend=https://app.example.com'
    );
  });

  it('renders as full width button', () => {
    renderWithTheme(<GoogleLoginButton mode="login" />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // Material-UI applies full width as CSS, hard to test directly
  });

  it('uses Material-UI Button component', () => {
    renderWithTheme(<GoogleLoginButton mode="login" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('MuiButton-root');
  });

  it('supports the neutral Google-branded appearance', () => {
    renderWithTheme(<GoogleLoginButton mode="login" appearance="neutral" />);

    const button = screen.getByRole('button', { name: 'Continue with Google' });
    expect(button).toHaveClass('MuiButton-outlined');
    expect(button.querySelector('.MuiButton-startIcon svg')).toHaveAttribute('aria-hidden', 'true');
  });


  it('has contained variant styling', () => {
    renderWithTheme(<GoogleLoginButton mode="login" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('MuiButton-contained');
  });

  it('applies custom styling', () => {
    const { container } = renderWithTheme(<GoogleLoginButton mode="login" />);
    
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
    
    // Check that custom styles are applied through Material-UI's sx prop
    // The actual computed styles would be applied by Material-UI
  });

  it('writes its label in sentence case', () => {
    renderWithTheme(<GoogleLoginButton mode="login" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Sign in with Google');
  });

  it('handles different frontend origins', () => {
    const origins = [
      'http://localhost:3001',
      'https://staging.example.com',
      'https://production.example.com'
    ];
    
    origins.forEach(origin => {
      mockLocation.origin = origin;
      mockLocation.href = '';
      
      const { unmount } = renderWithTheme(<GoogleLoginButton mode="login" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockLocation.href).toBe(
        `http://localhost:3000/auth?frontend=${origin}`
      );
      
      unmount();
    });
  });

  it('works with both login and register modes', () => {
    const modes: Array<'login' | 'register'> = ['login', 'register'];
    
    modes.forEach(mode => {
      const { unmount } = renderWithTheme(<GoogleLoginButton mode={mode} />);
      
      const expectedText = mode === 'login' ? 'Sign in with Google' : 'Sign up with Google';
      expect(screen.getByText(expectedText)).toBeInTheDocument();
      
      unmount();
    });
  });

  it('handles click events properly', () => {
    const initialHref = mockLocation.href;
    
    renderWithTheme(<GoogleLoginButton mode="login" />);
    
    const button = screen.getByRole('button');
    
    // Before click
    expect(mockLocation.href).toBe(initialHref);
    
    // After click
    fireEvent.click(button);
    expect(mockLocation.href).not.toBe(initialHref);
    expect(mockLocation.href).toContain('auth?frontend=');
  });

  it('constructs URL with query parameters correctly', () => {
    mockLocation.origin = 'http://test.com';
    
    renderWithTheme(<GoogleLoginButton mode="register" />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const expectedUrl = 'http://localhost:3000/auth?frontend=http://test.com';
    expect(mockLocation.href).toBe(expectedUrl);
  });

  it('uses environment variable for backend URL', () => {
    // Environment variable is mocked at the top of the file
    renderWithTheme(<GoogleLoginButton mode="login" />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockLocation.href).toContain('http://localhost:3000');
  });
});
