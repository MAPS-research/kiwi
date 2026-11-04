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

  it("renders inside the split auth layout, in the sign-in frame", () => {
    const { container } = renderRegister();

    expect(screen.getByTestId("auth-layout")).toHaveAttribute("data-variant", "split");
    expect(container.querySelector('img[src="/assets/images/kiwi-mark.svg"]')).toHaveAttribute("alt", "");
    const heading = screen.getByRole("heading", { level: 1, name: "Create an account" });
    expect(heading).toHaveClass("MuiTypography-display");
    expect(screen.queryByRole("heading", { name: "Create your account" })).not.toBeInTheDocument();
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

  it("links back to sign-in", () => {
    renderRegister();

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
    expect(screen.getByText(/Already have an account\?/)).toBeInTheDocument();
  });
});
