import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Register } from "./Register.tsx";

vi.mock("../components/AuthLayout/AuthLayout.tsx", () => ({
  default: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="auth-layout" data-variant={variant}>
      {children}
    </div>
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
    <button data-testid="google-register-button" data-mode={mode} data-appearance={appearance}>
      Continue with Google
    </button>
  ),
}));

const theme = createTheme();

const renderRegister = () =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <Register />
      </ThemeProvider>
    </MemoryRouter>,
  );

describe("Register Page", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders inside the split auth layout", () => {
    renderRegister();

    expect(screen.getByTestId("auth-layout")).toHaveAttribute("data-variant", "split");
    expect(screen.getByTestId("form-card")).toHaveAttribute("data-appearance", "plain");
    expect(screen.getByTestId("institution-logo")).toHaveAttribute("data-width", "124");
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
  });

  it("explains that administrators create accounts by default", () => {
    renderRegister();

    expect(screen.getByText(/Accounts are created by your administrator\./)).toBeInTheDocument();
    expect(screen.queryByTestId("google-register-button")).not.toBeInTheDocument();
  });

  it("does not offer a password sign-up form", () => {
    renderRegister();

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it("offers Google sign-up when enabled", () => {
    vi.stubEnv("VITE_ENABLE_GOOGLE_LOGIN", "true");
    renderRegister();

    expect(screen.getByText("Sign up with your Google account.")).toBeInTheDocument();
    expect(screen.getByTestId("google-register-button")).toHaveAttribute("data-mode", "register");
    expect(screen.getByTestId("google-register-button")).toHaveAttribute("data-appearance", "neutral");
  });

  it("links back to login", () => {
    renderRegister();

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });
});
