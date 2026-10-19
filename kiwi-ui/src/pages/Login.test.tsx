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

/** The generated client's errors, by shape: a ResponseError carries the response, a FetchError has none. */
const responseError = (status: number) =>
  Object.assign(new Error("Response returned an error code"), {
    name: "ResponseError",
    response: { status },
  });
const fetchError = () =>
  Object.assign(new Error("The request failed and the interceptors did not return an alternative response"), {
    name: "FetchError",
  });

const REFUSED =
  "Couldn't sign you in. That email and password don't match. Check both and try again, or ask your administrator to reset your password.";
const NO_RESPONSE =
  "Couldn't sign you in. Kiwi couldn't reach the server. Check your connection, then try again.";
const GENERIC =
  "Couldn't sign you in. The server didn't respond as expected. Try again, or ask your administrator if it keeps happening.";

const submitCredentials = (password = "password123") => {
  fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/Password/), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
};

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

  it("renders the sign-in column: the logo, the display line, the form", () => {
    const { container } = renderLogin();

    expect(screen.getByTestId("auth-layout")).toHaveAttribute("data-variant", "split");
    const logo = container.querySelector('img[src="/assets/images/kiwi-mark.svg"]');
    expect(logo).toHaveAttribute("alt", "");
    const heading = screen.getByRole("heading", { level: 1, name: "Sign in to Kiwi" });
    expect(heading).toHaveClass("MuiTypography-display");
    expect(screen.getByText("Use the email address linked to your Kiwi account.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/Password/)).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
  });

  it("paints the wordmark in the accent text colour", () => {
    renderLogin();

    const wordmark = screen.getByText("Kiwi", { selector: "h1 span" });
    expect(getComputedStyle(wordmark).color).toBe("var(--accent-text)");
  });

  it("labels the fields above the controls without required asterisks", () => {
    const { container } = renderLogin();

    expect(container.querySelector(".MuiFormLabel-asterisk")).toBeNull();
    expect(screen.getByText("Email", { selector: "label" })).toBeInTheDocument();
  });

  it("offers password login only by default", () => {
    renderLogin();

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByTestId("google-login-button")).not.toBeInTheDocument();
    expect(screen.queryByText("or")).not.toBeInTheDocument();
    expect(screen.queryByText("OR")).not.toBeInTheDocument();
  });

  it("points to the administrator instead of self sign-up by default", () => {
    renderLogin();

    expect(screen.getByText("New to Kiwi? Ask your administrator for an account.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument();
  });

  it("renders the Google login option when enabled", () => {
    vi.stubEnv("VITE_ENABLE_GOOGLE_LOGIN", "true");
    renderLogin();

    expect(screen.getByTestId("google-login-button")).toHaveAttribute("data-mode", "login");
    expect(screen.getByTestId("google-login-button")).toHaveAttribute("data-appearance", "neutral");
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByText("or")).toBeInTheDocument();
    expect(screen.queryByText("OR")).not.toBeInTheDocument();
  });

  it("supports deployments that disable password login", () => {
    vi.stubEnv("VITE_DISABLE_PASSWORD_LOGIN", "true");
    vi.stubEnv("VITE_ENABLE_GOOGLE_LOGIN", "true");
    renderLogin();

    expect(screen.queryByRole("textbox", { name: "Email" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Password/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.queryByText("or")).not.toBeInTheDocument();
  });

  it("warns when every sign-in method is disabled", () => {
    vi.stubEnv("VITE_DISABLE_PASSWORD_LOGIN", "true");
    renderLogin();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sign-in isn't available right now. No sign-in method is turned on for this site. Ask an administrator.",
    );
    expect(screen.queryByText(/VITE_/)).not.toBeInTheDocument();
  });

  it("names the support address when every sign-in method is disabled and one is configured", async () => {
    vi.stubEnv("VITE_DISABLE_PASSWORD_LOGIN", "true");
    vi.stubEnv("VITE_SUPPORT_EMAIL", "help@example.edu");
    // SUPPORT_EMAIL is read when branding.ts loads.
    vi.resetModules();
    const { Login: FreshLogin } = await import("./Login.tsx");
    const { MemoryRouter: FreshRouter } = await import("react-router-dom");
    render(
      <FreshRouter initialEntries={["/login"]}>
        <FreshLogin />
      </FreshRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sign-in isn't available right now. No sign-in method is turned on for this site. Contact help@example.edu, or ask an administrator.",
    );
    expect(screen.getByRole("link", { name: "help@example.edu" })).toHaveAttribute(
      "href",
      "mailto:help@example.edu",
    );
  });

  it("links to account creation when Google sign-up is available", () => {
    vi.stubEnv("VITE_ENABLE_GOOGLE_LOGIN", "true");
    renderLogin();

    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
    expect(screen.getByText(/New to Kiwi\?/)).toBeInTheDocument();
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
    submitCredentials();

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
    submitCredentials();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin"));
  });

  it("shows progress and prevents duplicate submissions", async () => {
    mockApiClient.authControllerLogin.mockImplementation(() => new Promise(() => {}));
    renderLogin();
    submitCredentials();

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeDisabled();
    expect(screen.getByLabelText(/Password/)).toBeDisabled();
  });

  describe("sign-in failures", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.mocked(console.error).mockRestore();
    });

    it("renders a failure with no known cause inline and clears it on edit", async () => {
      mockApiClient.authControllerLogin.mockRejectedValue(new Error("Invalid credentials"));
      renderLogin();
      submitCredentials("wrong-password");

      expect(await screen.findByText(GENERIC)).toBeInTheDocument();
      expect(screen.queryByText(/Login failed/)).not.toBeInTheDocument();
      fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
        target: { value: "fixed@example.com" },
      });
      expect(screen.queryByText(GENERIC)).not.toBeInTheDocument();
    });

    it("says the email and password don't match when the sign-in is refused", async () => {
      mockApiClient.authControllerLogin.mockRejectedValue(responseError(401));
      renderLogin();
      submitCredentials("wrong-password");

      expect(await screen.findByText(REFUSED)).toBeInTheDocument();
    });

    it("says the server couldn't be reached when no response arrives", async () => {
      mockApiClient.authControllerLogin.mockRejectedValue(fetchError());
      renderLogin();
      submitCredentials();

      expect(await screen.findByText(NO_RESPONSE)).toBeInTheDocument();
    });

    it("gives the status of a server error", async () => {
      mockApiClient.authControllerLogin.mockRejectedValue(responseError(503));
      renderLogin();
      submitCredentials();

      expect(
        await screen.findByText(
          "Couldn't sign you in. The server returned an error (503). Try again in a moment.",
        ),
      ).toBeInTheDocument();
    });

    it("never blames the password for a refusal after the sign-in was accepted", async () => {
      mockApiClient.authControllerGetProfile.mockRejectedValue(responseError(401));
      renderLogin();
      submitCredentials();

      expect(await screen.findByText(GENERIC)).toBeInTheDocument();
      expect(screen.queryByText(REFUSED)).not.toBeInTheDocument();
    });
  });
});
