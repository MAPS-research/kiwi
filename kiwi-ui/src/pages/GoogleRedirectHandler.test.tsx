import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GoogleRedirectHandler from './GoogleRedirectHandler.tsx';

// Mock dependencies
const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockUseLocation = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation()
  };
});

vi.mock('../auth/AuthContext.tsx', () => ({
  useAuth: () => ({
    login: mockLogin
  })
}));

// API client is globally mocked in setupTests.ts
import apiClient from '../utils/api.ts';
const mockApiClient = vi.mocked(apiClient);

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock window.alert
global.alert = vi.fn();

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

describe('GoogleRedirectHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.setItem.mockClear();

    // Default mock location
    mockUseLocation.mockReturnValue({
      search: '?token=test-auth-token'
    });

    // Default successful API responses
    mockApiClient.authControllerGetProfile.mockResolvedValue({
      email: 'test@example.com'
    });
    mockApiClient.consentControllerGetConsentStatus.mockResolvedValue(true);
  });

  it('renders loading message', () => {
    renderWithProviders(<GoogleRedirectHandler />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('extracts token from URL and stores in localStorage', async () => {
    renderWithProviders(<GoogleRedirectHandler />);

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'test-auth-token');
    });
  });

  it('fetches user profile and calls login on success', async () => {
    renderWithProviders(<GoogleRedirectHandler />);

    await waitFor(() => {
      expect(mockApiClient.authControllerGetProfile).toHaveBeenCalled();
      expect(mockApiClient.consentControllerGetConsentStatus).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(expect.objectContaining({
        username: 'test@example.com',
        consent: true
      }));
    }, { timeout: 2000 });
  });

  it('handles consent status as string "true"', async () => {
    (mockApiClient.consentControllerGetConsentStatus as any).mockResolvedValue('true');

    renderWithProviders(<GoogleRedirectHandler />);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(expect.objectContaining({
        username: 'test@example.com',
        consent: true
      }));
    }, { timeout: 2000 });
  });

  it('handles consent status as string "false"', async () => {
    (mockApiClient.consentControllerGetConsentStatus as any).mockResolvedValue('false');

    renderWithProviders(<GoogleRedirectHandler />);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(expect.objectContaining({
        username: 'test@example.com',
        consent: false
      }));
    }, { timeout: 2000 });
  });

  it('handles consent status as boolean', async () => {
    mockApiClient.consentControllerGetConsentStatus.mockResolvedValue(false);

    renderWithProviders(<GoogleRedirectHandler />);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(expect.objectContaining({
        username: 'test@example.com',
        consent: false
      }));
    }, { timeout: 2000 });
  });

  it('handles missing token in URL', async () => {
    // Mock location without token
    mockUseLocation.mockReturnValue({
      search: ''
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    renderWithProviders(<GoogleRedirectHandler />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('No token found in the URL');
    });

    consoleSpy.mockRestore();
  });

  it('handles missing email in profile response', async () => {
    mockApiClient.authControllerGetProfile.mockResolvedValue({
      email: undefined
    });

    renderWithProviders(<GoogleRedirectHandler />);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        'Cannot get email from Google account.'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('handles profile fetch error', async () => {
    mockApiClient.authControllerGetProfile.mockRejectedValue(new Error('API Error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    renderWithProviders(<GoogleRedirectHandler />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching email:', expect.any(Error));
      expect(global.alert).toHaveBeenCalledWith(
        'Login failed.'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    consoleSpy.mockRestore();
  });

  it('handles consent status fetch error', async () => {
    mockApiClient.consentControllerGetConsentStatus.mockRejectedValue(new Error('Consent API Error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    renderWithProviders(<GoogleRedirectHandler />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching email:', expect.any(Error));
      expect(global.alert).toHaveBeenCalledWith(
        'Login failed.'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    consoleSpy.mockRestore();
  });

  it('logs consent status conversion process', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    (mockApiClient.consentControllerGetConsentStatus as any).mockResolvedValue('true');

    renderWithProviders(<GoogleRedirectHandler />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('consent', 'true');
      expect(consoleSpy).toHaveBeenCalledWith('consent type', 'string');
      expect(consoleSpy).toHaveBeenCalledWith('converted consent', true);
      expect(consoleSpy).toHaveBeenCalledWith('converted consent type', 'boolean');
    });

    consoleSpy.mockRestore();
  });

  it('handles complex URL with additional parameters', async () => {
    mockUseLocation.mockReturnValue({
      search: '?token=complex-token-123&redirect=/dashboard&state=abc'
    });

    renderWithProviders(<GoogleRedirectHandler />);

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'complex-token-123');
    });
  });

  it('runs effect when dependencies change', async () => {
    const { rerender } = renderWithProviders(<GoogleRedirectHandler />);

    // Mock new location
    mockUseLocation.mockReturnValue({
      search: '?token=new-token'
    });

    rerender(<GoogleRedirectHandler />);

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'new-token');
    });
  });
});