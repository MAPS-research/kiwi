import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Login } from "./Login.tsx";

const mockNavigate = vi.fn();
const mockLogin = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../auth/AuthContext.tsx", () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
  }),
}));

vi.mock("../components/AuthLayout/AuthLayout.tsx", () => ({
  default: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="auth-layout" data-variant={variant}>{children}</div>
  ),
}));

vi.mock("../components/FormCard/FormCard.tsx", () => ({
  default: ({ children, appearance }: { children: React.ReactNode; appearance?: string }) => (
    <main data-testid="form-card" data-appearance={appearance}>
      {children}
    </main>
  ),
}));

vi.mock("../components/Brand/InstitutionLogo.tsx", () => ({
  default: ({ width, height }: { width?: number; height?: number }) => (
    <div data-testid="institution-logo" data-width={width} data-height={height}>
      Kiwi
    </div>
  ),
}));

vi.mock("../components/GoogleLoginButton/GoogleLoginButton.tsx", () => ({
  GoogleLoginButton: ({ mode, appearance }: { mode: string; appearance?: string }) => (
    <button data-testid="google-login-button" data-mode={mode} data-appearance={appearance}>
      Continue with Google
    </button>
  ),
}));

const theme = createTheme();

const renderLogin = (initialEntry = "/login") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ThemeProvider theme={theme}>
        <Login />
      </ThemeProvider>
    </MemoryRouter>,
  );

describe("Login Page", () => {
  let mockApiClient: any;

  beforeEach(async () => {
    vi.stubEnv("VITE_DISABLE_PASSWORD_LOGIN", "false");
    const api = await import("../utils/api.ts");
    mockApiClient = vi.mocked(api.default);

    vi.clearAllMocks();
    mockApiClient.authControllerLogin.mockResolvedValue({ accessToken: "test-token" });
    mockApiClient.authControllerGetProfile.mockResolvedValue({
      sub: "user-1",
      email: "test@example.com",
    });
    mockApiClient.consentControllerGetConsentStatus.mockResolvedValue(true);
    mockApiClient.authControllerGetUserRole.mockResolvedValue({ role: "user" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the branded sign-in card and accessible form", () => {
    renderLogin();

    expect(screen.getByTestId("auth-layout")).toHaveAttribute("data-variant", "split");
    expect(screen.getByTestId("form-card")).toHaveAttribute("data-appearance", "plain");
    expect(screen.getByTestId("institution-logo")).toHaveAttribute("data-width", "124");
    expect(screen.getByTestId("institution-logo")).toHaveAttribute("data-height", "28");
    expect(screen.getByRole("heading", { name: "Welcome back to Kiwi" })).toBeInTheDocument();
    expect(screen.getByText("Continue learning with AI-powered support.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/Password/)).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Login" })).toBeEnabled();
  });

  it("offers password login only by default", () => {
    renderLogin();

    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByTestId("google-login-button")).not.toBeInTheDocument();
    expect(screen.queryByText("OR")).not.toBeInTheDocument();
  });

  it("points to the administrator instead of self sign-up by default", () => {
    renderLogin();

    expect(screen.getByText("Need an account? Ask your administrator.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create one" })).not.toBeInTheDocument();
  });

  it("renders the Google login option when enabled", () => {
    vi.stubEnv("VITE_ENABLE_GOOGLE_LOGIN", "true");
    renderLogin();

    expect(screen.getByTestId("google-login-button")).toHaveAttribute("data-mode", "login");
    expect(screen.getByTestId("google-login-button")).toHaveAttribute("data-appearance", "neutral");
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByText("OR")).toBeInTheDocument();
  });

  it("supports deployments that disable password login", () => {
    vi.stubEnv("VITE_DISABLE_PASSWORD_LOGIN", "true");
    vi.stubEnv("VITE_ENABLE_GOOGLE_LOGIN", "true");
    renderLogin();

    expect(screen.queryByRole("textbox", { name: "Email" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Password/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("warns when every sign-in method is disabled", () => {
    vi.stubEnv("VITE_DISABLE_PASSWORD_LOGIN", "true");
    renderLogin();

    expect(screen.getByText(/No sign-in method is enabled/)).toBeInTheDocument();
  });

  it("links to account creation when Google sign-up is available", () => {
    vi.stubEnv("VITE_ENABLE_GOOGLE_LOGIN", "true");
    renderLogin();

    expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/register");
  });

  it("toggles password visibility", () => {
    renderLogin();
    const passwordInput = screen.getByLabelText(/Password/);

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("shows an expired-session message from the query string", () => {
    renderLogin("/login?timeout=true");

    expect(screen.getByText("Your session has expired. Please log in again.")).toBeInTheDocument();
  });

  it("updates both credential fields", () => {
    renderLogin();
    const emailInput = screen.getByRole("textbox", { name: "Email" });
    const passwordInput = screen.getByLabelText(/Password/);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  it("marks credential fields as required", () => {
    renderLogin();

    expect(screen.getByRole("textbox", { name: "Email" })).toBeRequired();
    expect(screen.getByLabelText(/Password/)).toBeRequired();
  });

  it("submits credentials and navigates students home", async () => {
    renderLogin();
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(mockApiClient.authControllerLogin).toHaveBeenCalledWith({
        loginDto: { email: "test@example.com", password: "password123" },
      });
      expect(mockLogin).toHaveBeenCalledWith(expect.objectContaining({
        id: "user-1",
        username: "test@example.com",
        systemRole: "user",
      }));
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("navigates instructors to the admin interface", async () => {
    mockApiClient.authControllerGetUserRole.mockResolvedValue({ role: "instructor" });
    renderLogin();
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
      target: { value: "teacher@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin"));
  });

  it("shows progress and prevents duplicate submissions", async () => {
    mockApiClient.authControllerLogin.mockImplementation(() => new Promise(() => {}));
    renderLogin();
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeDisabled();
    expect(screen.getByLabelText(/Password/)).toBeDisabled();
  });

  it("renders login failures inline and clears the message on edit", async () => {
    mockApiClient.authControllerLogin.mockRejectedValue(new Error("Invalid credentials"));
    renderLogin();
    const emailInput = screen.getByRole("textbox", { name: "Email" });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Login failed. Please check your credentials and try again.")).toBeInTheDocument();
    fireEvent.change(emailInput, { target: { value: "fixed@example.com" } });
    expect(screen.queryByText("Login failed. Please check your credentials and try again.")).not.toBeInTheDocument();
  });
});
