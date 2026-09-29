import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MCPServerManagement } from "./MCPServerManagement.tsx";

// Mock MCP components
vi.mock("../../components/MCP/MCPServerDialog", () => ({
  MCPServerDialog: ({ open, onClose, onSave }: any) =>
    open ? (
      <div data-testid="mcp-server-dialog">
        <button onClick={onClose}>Close Dialog</button>
        <button onClick={() => onSave({ name: "New Server" })}>Save</button>
      </div>
    ) : null,
}));

vi.mock("../../components/MCP/MCPTestResultDialog", () => ({
  MCPTestResultDialog: ({ open, onClose, testResult, loading }: any) =>
    open ? (
      <div data-testid="mcp-test-dialog">
        {loading ? "Testing..." : testResult?.success ? "Success" : "Failed"}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("../../components/MCP/DeleteConfirmDialog", () => ({
  DeleteConfirmDialog: ({ open, onClose, onConfirm, deleting }: any) =>
    open ? (
      <div data-testid="delete-confirm-dialog">
        <button onClick={onClose}>Cancel</button>
        <button onClick={onConfirm}>{deleting ? "Deleting..." : "Delete"}</button>
      </div>
    ) : null,
}));

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>{component}</ThemeProvider>
    </BrowserRouter>
  );
};

describe("MCPServerManagement", () => {
  let mockMcpAdminApiClient: any;

  beforeEach(async () => {
    const api = await import("../../utils/api.ts");
    mockMcpAdminApiClient = vi.mocked(api.mcpAdminApiClient);

    vi.clearAllMocks();

    // Mock global MCP servers (no classId param now)
    mockMcpAdminApiClient.mcpAdminControllerListMcpServers.mockResolvedValue([]);
  });

  it("renders without crashing", async () => {
    renderWithProviders(<MCPServerManagement />);

    expect(screen.getByText("MCP Server Management")).toBeInTheDocument();
  });

  it("displays page title and description", async () => {
    renderWithProviders(<MCPServerManagement />);

    expect(screen.getByText("MCP Server Management")).toBeInTheDocument();
    expect(
      screen.getByText(/Manage global MCP.*servers/i)
    ).toBeInTheDocument();
  });

  it("shows empty state when no servers are configured", async () => {
    renderWithProviders(<MCPServerManagement />);

    await waitFor(() => {
      expect(screen.getByText("No MCP Servers Configured")).toBeInTheDocument();
    });

    expect(screen.getByText("Create Your First Server")).toBeInTheDocument();
  });

  it("displays servers in table when available", async () => {
    mockMcpAdminApiClient.mcpAdminControllerListMcpServers.mockResolvedValue([
      {
        id: "server-1",
        name: "GitHub MCP",
        description: "GitHub integration",
        transport: "http",
        config: { url: "https://github.example.com" },
        requiresOAuth: true,
        isActive: true,
        assignedClassCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    renderWithProviders(<MCPServerManagement />);

    await waitFor(() => {
      expect(screen.getByText("GitHub MCP")).toBeInTheDocument();
    });

    expect(screen.getByText("HTTP")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByText("2 classes")).toBeInTheDocument();
  });

  it("opens add server dialog when Create Server is clicked", async () => {
    renderWithProviders(<MCPServerManagement />);

    await waitFor(() => {
      expect(screen.getByText("Create Server")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Create Server"));

    await waitFor(() => {
      expect(screen.getByTestId("mcp-server-dialog")).toBeInTheDocument();
    });
  });

  it("displays multiple global servers", async () => {
    mockMcpAdminApiClient.mcpAdminControllerListMcpServers.mockResolvedValue([
      {
        id: "server-1",
        name: "Server A",
        transport: "http",
        config: {},
        requiresOAuth: false,
        isActive: true,
        assignedClassCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "server-2",
        name: "Server B",
        transport: "sse",
        config: {},
        requiresOAuth: false,
        isActive: true,
        assignedClassCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    renderWithProviders(<MCPServerManagement />);

    await waitFor(() => {
      expect(screen.getByText("Server A")).toBeInTheDocument();
      expect(screen.getByText("Server B")).toBeInTheDocument();
    });

    expect(screen.getByText("1 classes")).toBeInTheDocument();
    expect(screen.getByText("3 classes")).toBeInTheDocument();
  });

  it("handles API errors gracefully", async () => {
    mockMcpAdminApiClient.mcpAdminControllerListMcpServers.mockRejectedValue(
      new Error("API Error")
    );

    renderWithProviders(<MCPServerManagement />);

    // Should not crash and should show empty state or error
    await waitFor(() => {
      expect(screen.getByText("MCP Server Management")).toBeInTheDocument();
    });
  });

  it("refreshes data when Refresh button is clicked", async () => {
    renderWithProviders(<MCPServerManagement />);

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Refresh"));

    await waitFor(() => {
      // Verify API was called again (once on mount + once on refresh)
      expect(mockMcpAdminApiClient.mcpAdminControllerListMcpServers).toHaveBeenCalledTimes(2);
    });
  });

  it("shows assigned class count for each server", async () => {
    mockMcpAdminApiClient.mcpAdminControllerListMcpServers.mockResolvedValue([
      {
        id: "server-1",
        name: "Unassigned Server",
        transport: "http",
        config: {},
        requiresOAuth: false,
        isActive: true,
        assignedClassCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    renderWithProviders(<MCPServerManagement />);

    await waitFor(() => {
      expect(screen.getByText("Unassigned Server")).toBeInTheDocument();
    });

    expect(screen.getByText("0 classes")).toBeInTheDocument();
  });
});
