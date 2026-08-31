import { fireEvent, render, screen } from "@testing-library/react";
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

Object.defineProperty(window, "location", {
  value: { href: "" },
  writable: true,
});

const theme = createTheme();

const renderRegister = () =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <Register />
      </ThemeProvider>
    </MemoryRouter>,
  );

const advanceToCodeStep = () => {
  fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
    target: { value: "test@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send verification code" }));
};

const advanceToPasswordStep = () => {
  advanceToCodeStep();
  fireEvent.change(screen.getByRole("textbox", { name: "Verification code" }), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Verify code" }));
};

describe("Register Page", () => {
  beforeEach(() => {
    window.location.href = "";
  });

  it("uses the shared split authentication layout", () => {
    renderRegister();

    expect(screen.getByTestId("auth-layout")).toHaveAttribute("data-variant", "split");
    expect(screen.getByTestId("form-card")).toHaveAttribute("data-appearance", "plain");
    expect(screen.getByTestId("institution-logo")).toHaveAttribute("data-width", "124");
    expect(screen.getByTestId("institution-logo")).toHaveAttribute("data-height", "28");
  });

  it("renders the initial email step and progress", () => {
    renderRegister();

    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByText("Start with your institutional email.")).toBeInTheDocument();
    expect(screen.getByLabelText("Registration progress: step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeRequired();
    expect(screen.getByRole("button", { name: "Send verification code" })).toBeEnabled();
  });

  it("renders the matching Google registration option and login link", () => {
    renderRegister();

    expect(screen.getByTestId("google-register-button")).toHaveAttribute("data-mode", "register");
    expect(screen.getByTestId("google-register-button")).toHaveAttribute("data-appearance", "neutral");
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
  });

  it("validates the email address inline", () => {
    renderRegister();

    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
      target: { value: "invalid-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send verification code" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a valid email address.");
  });

  it("clears the email error while editing", () => {
    renderRegister();
    const emailInput = screen.getByRole("textbox", { name: "Email" });

    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Send verification code" }));
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("advances to the verification code step", () => {
    renderRegister();
    advanceToCodeStep();

    expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Registration progress: step 2 of 3")).toBeInTheDocument();
    const codeInput = screen.getByRole("textbox", { name: "Verification code" });
    expect(codeInput).toHaveAttribute("inputmode", "numeric");
    expect(codeInput).toHaveAttribute("maxlength", "6");
    expect(screen.getByText("Sent to test@example.com")).toBeInTheDocument();
  });

  it("keeps the verification code numeric and six characters long", () => {
    renderRegister();
    advanceToCodeStep();
    const codeInput = screen.getByRole("textbox", { name: "Verification code" });

    fireEvent.change(codeInput, { target: { value: "a12b345678" } });

    expect(codeInput).toHaveValue("123456");
  });

  it("validates the verification code inline", () => {
    renderRegister();
    advanceToCodeStep();

    fireEvent.change(screen.getByRole("textbox", { name: "Verification code" }), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify code" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a 6-digit verification code.");
  });

  it("can return to the email step", () => {
    renderRegister();
    advanceToCodeStep();

    fireEvent.click(screen.getByRole("button", { name: "Use a different email" }));

    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("test@example.com");
  });

  it("advances to the password step with accessible fields", () => {
    renderRegister();
    advanceToPasswordStep();

    expect(screen.getByRole("heading", { name: "Set your password" })).toBeInTheDocument();
    expect(screen.getByLabelText("Registration progress: step 3 of 3")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(/^Confirm password/)).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled();
  });

  it("shows password rules with filled completion states", () => {
    renderRegister();
    advanceToPasswordStep();

    expect(screen.getByLabelText("Minimum 8 characters: not met")).toHaveAttribute("data-met", "false");
    expect(screen.getByLabelText("At least one letter: not met")).toHaveAttribute("data-met", "false");
    expect(screen.getByLabelText("At least one number: not met")).toHaveAttribute("data-met", "false");
    expect(screen.getByLabelText("No spaces: not met")).toHaveAttribute("data-met", "false");

    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "password123" } });

    expect(screen.getByLabelText("Minimum 8 characters: met")).toHaveAttribute("data-met", "true");
    expect(screen.getByLabelText("At least one letter: met")).toHaveAttribute("data-met", "true");
    expect(screen.getByLabelText("At least one number: met")).toHaveAttribute("data-met", "true");
    expect(screen.getByLabelText("No spaces: met")).toHaveAttribute("data-met", "true");
  });

  it("toggles password visibility independently", () => {
    renderRegister();
    advanceToPasswordStep();
    const passwordInput = screen.getByLabelText(/^Password/);
    const confirmPasswordInput = screen.getByLabelText(/^Confirm password/);

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show confirm password" }));
    expect(confirmPasswordInput).toHaveAttribute("type", "text");
  });

  it("validates password requirements", () => {
    renderRegister();
    advanceToPasswordStep();

    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText(/^Confirm password/), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Your password does not meet the requirements.");
  });

  it("validates password confirmation", () => {
    renderRegister();
    advanceToPasswordStep();

    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/^Confirm password/), { target: { value: "different123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match.");
  });

  it("completes the registration flow", () => {
    renderRegister();
    advanceToPasswordStep();

    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/^Confirm password/), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(window.location.href).toBe("/login");
  });
});
