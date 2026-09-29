import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MCPServerDialog } from "./MCPServerDialog.tsx";

const theme = createTheme();

const renderWithProviders = (props: any) => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    classId: "test-class-123",
    saving: false,
    ...props,
  };

  return render(
    <ThemeProvider theme={theme}>
      <MCPServerDialog {...defaultProps} />
    </ThemeProvider>
  );
};

describe("MCPServerDialog", () => {
  it("renders create mode with empty form", () => {
    renderWithProviders({});

    expect(screen.getByText("Add MCP Server")).toBeInTheDocument();
    expect(screen.getByLabelText(/Server Name/i)).toHaveValue("");
    expect(screen.getByLabelText(/Description/i)).toHaveValue("");
  });

  it("renders edit mode with pre-filled values", () => {
    const server = {
      id: "server-123",
      classId: "test-class-123",
      name: "Existing Server",
      description: "An existing server",
      transport: "http" as const,
      config: { url: "https://example.com" },
      requiresOAuth: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    renderWithProviders({ server });

    expect(screen.getByText("Edit MCP Server")).toBeInTheDocument();
    expect(screen.getByLabelText(/Server Name/i)).toHaveValue("Existing Server");
    expect(screen.getByLabelText(/Description/i)).toHaveValue("An existing server");
  });

  it("validates required fields on submit", async () => {
    const onSave = vi.fn();
    renderWithProviders({ onSave });

    // Try to submit without filling required fields
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows transport-specific config for HTTP", () => {
    renderWithProviders({});

    // HTTP is default, so URL field should be visible
    expect(screen.getByLabelText(/Server URL/i)).toBeInTheDocument();
  });

  it("keeps the URL config and saves the SSE transport when selected", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders({ onSave });

    fireEvent.click(screen.getByRole("radio", { name: /SSE/i }));
    expect(screen.getByLabelText(/Server URL/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: "SSE Server" },
    });
    fireEvent.change(screen.getByLabelText(/Server URL/i), {
      target: { value: "https://sse.example.com" },
    });
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "SSE Server",
          transport: "sse",
          config: expect.objectContaining({ url: "https://sse.example.com" }),
        })
      );
    });
  });

  it("shows OAuth fields when requiresOAuth is enabled", async () => {
    renderWithProviders({});

    // Find and click the OAuth switch
    const oauthSwitch = screen.getByRole("switch", {
      name: /Requires OAuth Authentication/i,
    });
    fireEvent.click(oauthSwitch);

    await waitFor(() => {
      expect(screen.getByLabelText(/Authorization URL/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Token URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Client ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Client Secret/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Scopes/i)).toBeInTheDocument();
  });

  it("calls onSave with correct data on submit", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders({ onSave });

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: "My New Server" },
    });

    fireEvent.change(screen.getByLabelText(/Server URL/i), {
      target: { value: "https://my-server.example.com" },
    });

    // Submit the form
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My New Server",
          transport: "http",
          config: expect.objectContaining({
            url: "https://my-server.example.com",
          }),
        })
      );
    });
  });

  it("disables form during save", () => {
    renderWithProviders({ saving: true });

    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeDisabled();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    renderWithProviders({ onClose });

    fireEvent.click(screen.getByText("Cancel"));

    expect(onClose).toHaveBeenCalled();
  });

  it("shows class selector when showClassSelector is true", () => {
    const classes = [
      { classID: "class-1", className: "Class One" },
      { classID: "class-2", className: "Class Two" },
    ];

    renderWithProviders({
      showClassSelector: true,
      classes,
      classId: "class-1", // Use a valid classId from the list
      onClassChange: vi.fn(),
    });

    // MUI Select renders a combobox role for the class selector
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    // Check that Class One is displayed as the selected value
    expect(screen.getByText("Class One")).toBeInTheDocument();
  });

  it("validates URL format for HTTP transport", async () => {
    const onSave = vi.fn();
    renderWithProviders({ onSave });

    // Fill in name
    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: "My Server" },
    });

    // Enter invalid URL
    fireEvent.change(screen.getByLabelText(/Server URL/i), {
      target: { value: "invalid-url" },
    });

    // Submit
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(
        screen.getByText(/URL must start with http:\/\/ or https:\/\//i)
      ).toBeInTheDocument();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("allows adding headers for HTTP transport", async () => {
    renderWithProviders({});

    // Click Add Header button
    fireEvent.click(screen.getByText("Add Header"));

    await waitFor(() => {
      expect(screen.getByLabelText(/Header Name/i)).toBeInTheDocument();
    });
  });
});
