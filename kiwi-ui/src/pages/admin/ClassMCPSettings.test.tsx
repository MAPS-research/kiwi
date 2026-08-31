import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ClassMCPSettings } from "./ClassMCPSettings";

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
  DeleteConfirmDialog: ({ open, onClose, onConfirm, deleting, title }: any) =>
    open ? (
      <div data-testid="delete-confirm-dialog">
        <span>{title}</span>
        <button onClick={onClose}>Cancel</button>
        <button onClick={onConfirm}>{deleting ? "Processing..." : "Confirm"}</button>
      </div>
    ) : null,
}));

vi.mock("../../components/MCP/ToolConfigPanel", () => ({
  ToolConfigPanel: ({ tools, loading, onToolToggle, onRefresh }: any) => (
    <div data-testid="tool-config-panel">
      {loading ? (
        <span>Loading tools...</span>
      ) : (
        <>
          <span>Tools: {tools.length}</span>
          <button onClick={onRefresh}>Refresh Tools</button>
          {tools.map((tool: any) => (
            <div key={tool.id}>
              <span>{tool.toolName}</span>
              <button onClick={() => onToolToggle(tool.id, !tool.isEnabled)}>
                Toggle
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  ),
}));

const theme = createTheme();

const renderWithProviders = (classId: string = "test-class-123") => {
  return render(
    <MemoryRouter initialEntries={[`/admin/class/${classId}/mcp-settings`]}>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route
            path="/admin/class/:classID/mcp-settings"
            element={<ClassMCPSettings />}
          />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
};

// Helper to create a ClassMcpServerResponseDto
const createAssignedServer = (
  id: string,
  classId: string,
  mcpServerId: string,
  name: string,
  transport: string = "http",
  isEnabled: boolean = true
) => ({
  id,
  classId,
  mcpServerId,
  isEnabled,
  priority: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  mcpServer: {
    id: mcpServerId,
    name,
    description: `Description for ${name}`,
    transport,
    requiresOAuth: false,
    isActive: true,
  },
});

describe("ClassMCPSettings", () => {
  let mockMcpAdminApiClient: any;
  let mockToolConfigApiClient: any;

  beforeEach(async () => {
    const api = await import("../../utils/api");
    mockMcpAdminApiClient = vi.mocked(api.mcpAdminApiClient);
    mockToolConfigApiClient = vi.mocked(api.toolConfigApiClient);

    vi.clearAllMocks();

    // Default mocks - use new API for assigned servers
    mockMcpAdminApiClient.mcpAdminControllerGetClassServers.mockResolvedValue([]);
    mockMcpAdminApiClient.mcpAdminControllerListMcpServers.mockResolvedValue([]);
    mockToolConfigApiClient.toolConfigControllerGetToolsForClass.mockResolvedValue(
      []
    );
  });

  it("renders without crashing", async () => {
    renderWithProviders();

    expect(screen.getByText("MCP Settings")).toBeInTheDocument();
  });

  it("displays tabs for MCP Servers and Tool Configuration", async () => {
    renderWithProviders();

    expect(screen.getByRole("tab", { name: "MCP Servers" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Tool Configuration" })
    ).toBeInTheDocument();
  });

  it("shows MCP Servers tab by default", async () => {
    renderWithProviders();

    expect(
      screen.getByRole("tab", { name: "MCP Servers", selected: true })
    ).toBeInTheDocument();
  });

  it("shows empty state when no servers are assigned", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("No MCP Servers Assigned")).toBeInTheDocument();
    });

    expect(screen.getByText("Assign Existing Servers")).toBeInTheDocument();
    // Multiple "Create New Server" buttons exist (action bar + empty state)
    const createButtons = screen.getAllByText("Create New Server");
    expect(createButtons.length).toBeGreaterThan(0);
  });

  it("displays assigned servers when available", async () => {
    mockMcpAdminApiClient.mcpAdminControllerGetClassServers.mockResolvedValue([
      createAssignedServer("assign-1", "test-class-123", "server-1", "Test Server"),
    ]);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });

    expect(screen.getByText("HTTP")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("opens create server dialog when Create New Server button is clicked", async () => {
    renderWithProviders();

    await waitFor(() => {
      // There are multiple "Create New Server" buttons (action bar + empty state)
      const buttons = screen.getAllByText("Create New Server");
      expect(buttons.length).toBeGreaterThan(0);
    });

    // Click the first one
    const buttons = screen.getAllByText("Create New Server");
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getByTestId("mcp-server-dialog")).toBeInTheDocument();
    });
  });

  it("switches to Tool Configuration tab when clicked", async () => {
    renderWithProviders();

    fireEvent.click(screen.getByRole("tab", { name: "Tool Configuration" }));

    await waitFor(() => {
      expect(screen.getByTestId("tool-config-panel")).toBeInTheDocument();
    });
  });

  it("displays tools in the Tool Configuration tab", async () => {
    mockToolConfigApiClient.toolConfigControllerGetToolsForClass.mockResolvedValue(
      [
        {
          id: "tool-1",
          classId: "test-class-123",
          toolType: "RAG",
          toolIdentifier: "rag",
          toolName: "RAG Search",
          isEnabled: true,
          chatTypes: ["pdf"],
          priority: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "tool-2",
          classId: "test-class-123",
          toolType: "CodeInterpreter",
          toolIdentifier: "code-interpreter",
          toolName: "Code Interpreter",
          isEnabled: false,
          chatTypes: ["codegen"],
          priority: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
    );

    renderWithProviders();

    fireEvent.click(screen.getByRole("tab", { name: "Tool Configuration" }));

    await waitFor(() => {
      expect(screen.getByText("Tools: 2")).toBeInTheDocument();
    });

    expect(screen.getByText("RAG Search")).toBeInTheDocument();
    expect(screen.getByText("Code Interpreter")).toBeInTheDocument();
  });

  it("handles server unassignment", async () => {
    mockMcpAdminApiClient.mcpAdminControllerGetClassServers.mockResolvedValue([
      createAssignedServer("assign-1", "test-class-123", "server-1", "Server to Unassign"),
    ]);

    mockMcpAdminApiClient.mcpAdminControllerRemoveServerFromClass.mockResolvedValue(
      undefined
    );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Server to Unassign")).toBeInTheDocument();
    });

    // Find and click unassign button (LinkOff icon button)
    const unassignButton = screen.getByLabelText("Unassign from Class");

    if (unassignButton) {
      fireEvent.click(unassignButton);

      await waitFor(() => {
        expect(screen.getByTestId("delete-confirm-dialog")).toBeInTheDocument();
      });

      expect(screen.getByText("Unassign MCP Server")).toBeInTheDocument();
    }
  });

  it("refreshes servers when Refresh button is clicked", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Refresh"));

    await waitFor(() => {
      expect(
        mockMcpAdminApiClient.mcpAdminControllerGetClassServers
      ).toHaveBeenCalledTimes(2);
    });
  });

  it("shows Assign Servers button in the action bar", async () => {
    renderWithProviders();

    await waitFor(() => {
      // Look for the button in the action bar area
      const assignButtons = screen.getAllByText("Assign Servers");
      expect(assignButtons.length).toBeGreaterThan(0);
    });
  });

  it("displays enabled toggle for assigned servers", async () => {
    mockMcpAdminApiClient.mcpAdminControllerGetClassServers.mockResolvedValue([
      createAssignedServer("assign-1", "test-class-123", "server-1", "Test Server", "http", true),
    ]);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });

    // Should have an enabled toggle switch
    const switchElement = screen.getByRole("checkbox");
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).toBeChecked();
  });
});
