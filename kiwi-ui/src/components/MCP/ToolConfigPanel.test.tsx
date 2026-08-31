import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ToolConfigPanel } from "./ToolConfigPanel";

const theme = createTheme();

const renderWithProviders = (props: any) => {
  const defaultProps = {
    tools: [],
    loading: false,
    onToolToggle: vi.fn(),
    onRefresh: vi.fn(),
    ...props,
  };

  return render(
    <ThemeProvider theme={theme}>
      <ToolConfigPanel {...defaultProps} />
    </ThemeProvider>
  );
};

const mockTools = [
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
  {
    id: "tool-3",
    classId: "test-class-123",
    toolType: "MCP",
    toolIdentifier: "github-server",
    toolName: "GitHub API",
    isEnabled: true,
    chatTypes: [],
    priority: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    mcpServer: {
      id: "server-1",
      name: "GitHub Server",
      requiresOAuth: true,
    },
  },
];

describe("ToolConfigPanel", () => {
  it("renders loading state", () => {
    renderWithProviders({ loading: true });

    // Check for skeleton loaders
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders empty state when no tools", () => {
    renderWithProviders({ tools: [] });

    expect(screen.getByText("No Tools Available")).toBeInTheDocument();
    expect(
      screen.getByText(/Add MCP servers to enable additional tools/i)
    ).toBeInTheDocument();
  });

  it("displays built-in tools section", () => {
    renderWithProviders({ tools: mockTools });

    expect(screen.getByText("Built-in Tools")).toBeInTheDocument();
    expect(screen.getByText("RAG Search")).toBeInTheDocument();
    // "Code Interpreter" appears twice (as tool name and type badge), so use getAllByText
    expect(screen.getAllByText("Code Interpreter").length).toBeGreaterThanOrEqual(1);
  });

  it("displays MCP tools section", () => {
    renderWithProviders({ tools: mockTools });

    expect(screen.getByText("MCP Tools")).toBeInTheDocument();
    expect(screen.getByText("GitHub API")).toBeInTheDocument();
  });

  it("shows tool type badges", () => {
    renderWithProviders({ tools: mockTools });

    // Use getAllByText since there are multiple occurrences
    expect(screen.getAllByText("RAG").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Code Interpreter").length).toBeGreaterThan(0);
    expect(screen.getByText("MCP Tool")).toBeInTheDocument();
  });

  it("displays chat types for tools", () => {
    renderWithProviders({ tools: mockTools });

    expect(screen.getByText("pdf")).toBeInTheDocument();
    expect(screen.getByText("codegen")).toBeInTheDocument();
  });

  it("shows OAuth indicator for MCP tools requiring OAuth", () => {
    renderWithProviders({ tools: mockTools });

    expect(screen.getByText("OAuth")).toBeInTheDocument();
  });

  it("calls onToolToggle when switch is clicked", () => {
    const onToolToggle = vi.fn();
    renderWithProviders({ tools: mockTools, onToolToggle });

    // Find all toggle switches
    const switches = screen.getAllByRole("checkbox");

    // Click the first one
    fireEvent.click(switches[0]);

    expect(onToolToggle).toHaveBeenCalledWith("tool-1", false); // Toggle from true to false
  });

  it("calls onRefresh when Refresh button is clicked", () => {
    const onRefresh = vi.fn();
    renderWithProviders({ tools: mockTools, onRefresh });

    fireEvent.click(screen.getByText("Refresh"));

    expect(onRefresh).toHaveBeenCalled();
  });

  it("displays priority for each tool", () => {
    renderWithProviders({ tools: mockTools });

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows MCP server name for MCP tools", () => {
    renderWithProviders({ tools: mockTools });

    expect(screen.getByText(/from GitHub Server/i)).toBeInTheDocument();
  });

  it("shows All for tools with no specific chat types", () => {
    renderWithProviders({ tools: mockTools });

    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("displays description text about tool configuration", () => {
    renderWithProviders({ tools: mockTools });

    expect(
      screen.getByText(/Enable or disable tools available to students/i)
    ).toBeInTheDocument();
  });
});
