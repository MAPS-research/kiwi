// Register DOM matchers and their types with Vitest.
import "@testing-library/jest-dom/vitest";

// Mock matchMedia for tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock window.location to prevent jsdom navigation errors
const mockLocation = {
  href: "http://localhost:3001/",
  origin: "http://localhost:3001",
  protocol: "http:",
  host: "localhost:3001",
  hostname: "localhost",
  port: "3001",
  pathname: "/",
  search: "",
  hash: "",
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

// Mock navigation API to prevent jsdom errors
Object.defineProperty(window, "navigation", {
  value: {
    navigate: vi.fn(),
    reload: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    canGoBack: false,
    canGoForward: false,
    currentEntry: {
      url: "http://localhost:3001/",
      key: "test-key",
      id: "test-id",
      index: 0,
      sameDocument: true,
    },
  },
  writable: true,
});

// Additional navigation mocking for anchor tag clicks
(Element.prototype as any).click = vi.fn();

// Mock alert function
global.alert = vi.fn();

// Mock fetch API
global.fetch = vi.fn(() =>
  Promise.reject(new Error("Fetch not available in test environment"))
);

// Global API client mock - mock both the utils/api and services to avoid module resolution issues
vi.mock("./utils/api.ts", () => {
  const mockApiClient = {
    // Analytics endpoints
    analyticsControllerPresentDateFilteredInteractions: vi
      .fn()
      .mockResolvedValue([]),

    // Class endpoints
    classControllerList: vi.fn().mockResolvedValue({ classIds: [] }),
    classControllerAdd: vi.fn().mockResolvedValue({}),
    classControllerGetDocumentListIds: vi
      .fn()
      .mockResolvedValue({ documentIds: [] }),
    classControllerCreate: vi.fn().mockResolvedValue({}),
    classControllerUpdate: vi.fn().mockResolvedValue({}),
    classControllerDelete: vi.fn().mockResolvedValue({}),
    classControllerGet: vi.fn().mockResolvedValue({}),
    classControllerEnrollUser: vi.fn().mockResolvedValue({}),
    classControllerRemoveUser: vi.fn().mockResolvedValue({}),
    classControllerGetUsers: vi.fn().mockResolvedValue({ users: [] }),

    // User endpoints
    userControllerGetProfile: vi.fn().mockResolvedValue({}),
    userControllerUpdateProfile: vi.fn().mockResolvedValue({}),
    userControllerDelete: vi.fn().mockResolvedValue({}),
    userControllerList: vi.fn().mockResolvedValue({ users: [] }),
    userControllerCreate: vi.fn().mockResolvedValue({}),
    userControllerGetFeatures: vi.fn().mockResolvedValue({ features: [] }),
    userControllerUpdateFeatures: vi.fn().mockResolvedValue({}),

    // Auth endpoints
    authControllerLogin: vi.fn().mockResolvedValue({ token: "mock-token" }),
    authControllerRegister: vi.fn().mockResolvedValue({}),
    authControllerLogout: vi.fn().mockResolvedValue({}),
    authControllerGoogleCallback: vi.fn().mockResolvedValue({}),
    authControllerRefreshToken: vi
      .fn()
      .mockResolvedValue({ token: "new-mock-token" }),
    authControllerGetProfile: vi
      .fn()
      .mockResolvedValue({ email: "test@example.com" }),

    // PDF/Document endpoints
    pdfControllerUpload: vi.fn().mockResolvedValue({}),
    pdfControllerDelete: vi.fn().mockResolvedValue({}),
    pdfControllerList: vi.fn().mockResolvedValue({ documents: [] }),
    pdfControllerGet: vi.fn().mockResolvedValue({}),
    pdfControllerUpdate: vi.fn().mockResolvedValue({}),

    // Chat endpoints
    chatControllerSendMessage: vi.fn().mockResolvedValue({}),
    chatControllerGetHistory: vi.fn().mockResolvedValue({ messages: [] }),
    chatControllerDeleteConversation: vi.fn().mockResolvedValue({}),

    // Interaction endpoints
    interactionControllerCreate: vi.fn().mockResolvedValue({}),
    interactionControllerList: vi.fn().mockResolvedValue({ interactions: [] }),
    interactionControllerGetInteractionsCurrentClass: vi
      .fn()
      .mockResolvedValue({ interactions: [] }),

    // Highlight endpoints
    highlightControllerCreate: vi.fn().mockResolvedValue({}),
    highlightControllerUpdate: vi.fn().mockResolvedValue({}),
    highlightControllerDelete: vi.fn().mockResolvedValue({}),
    highlightControllerList: vi.fn().mockResolvedValue({ highlights: [] }),

    // Code interpreter endpoints
    codeInterpreterControllerExecute: vi
      .fn()
      .mockResolvedValue({ result: "mock result" }),

    // Admin endpoints
    adminControllerGetStats: vi.fn().mockResolvedValue({}),
    adminControllerGetUsers: vi.fn().mockResolvedValue({ users: [] }),
    adminControllerUpdateUser: vi.fn().mockResolvedValue({}),

    // Feature flags endpoints
    featureFlagsControllerListClassFeatures: vi.fn().mockResolvedValue([]),
    featureFlagsControllerAddClassFeature: vi.fn().mockResolvedValue({}),
    featureFlagsControllerUpdateClassFeature: vi.fn().mockResolvedValue({}),
    featureFlagsControllerDeleteClassFeature: vi.fn().mockResolvedValue({}),

    // Additional missing endpoints from failing tests
    classControllerGetById: vi.fn().mockResolvedValue({}),
    consentControllerGetConsentStatus: vi.fn().mockResolvedValue(true),
    competitionControllerGetUserCompetitions: vi
      .fn()
      .mockResolvedValue({ competitions: [] }),

    // Discussion endpoints
    discussionsControllerGetDiscussion: vi.fn().mockResolvedValue({}),
    discussionsControllerGetReplies: vi.fn().mockResolvedValue({ replies: [] }),
    discussionsControllerCreateReply: vi.fn().mockResolvedValue({}),
    discussionsControllerUpvoteDiscussion: vi.fn().mockResolvedValue({}),
    discussionsControllerMarkAsResolved: vi.fn().mockResolvedValue({}),
    discussionsControllerGetDiscussions: vi
      .fn()
      .mockResolvedValue({ discussions: [] }),
    discussionsControllerCreateDiscussion: vi.fn().mockResolvedValue({}),

    // Material endpoints for BatchMaterialsUpload
    materialControllerAdd: vi
      .fn()
      .mockResolvedValue({ classMaterialId: "test-material-123" }),
    materialControllerList: vi.fn().mockResolvedValue({ materials: [] }),
    materialControllerGetListByMaterialId: vi
      .fn()
      .mockResolvedValue({ documents: [] }),

    // Document endpoints for BatchMaterialsUpload
    documentControllerUpload: vi.fn().mockResolvedValue({
      message: "Upload successful",
      document: { id: "test-doc-123", fileName: "test.pdf" },
    }),
    documentControllerChunk: vi.fn().mockResolvedValue({
      jobId: "test-job-123",
      message: "Chunking started",
    }),
    documentControllerChunkStatus: vi
      .fn()
      .mockResolvedValue({ message: "completed successfully" }),
    documentControllerDescribe: vi.fn().mockResolvedValue({}),
    documentControllerEmbed: vi.fn().mockResolvedValue({}),
    classControllerUploadImage: vi.fn().mockResolvedValue({
      key: "test-image-key",
      fileName: "test.png",
    }),

    // Class endpoints with complete data
    classControllerGetByIdComplete: vi.fn().mockResolvedValue({
      classInfo: {
        id: "test-class-123",
        createdDate: new Date(),
        professorId: "prof-123",
        classMetadata: {
          className: "Test Class",
          professorName: "Dr. Test",
          description: "A test class description",
        },
      },
    }),
    classControllerUpdateMetadata: vi.fn().mockResolvedValue({
      classId: "test-class-123"
    }),

    // Auth role endpoint
    authControllerGetUserRole: vi.fn().mockResolvedValue({ role: "admin" }),
  };

  // MCP Admin API mock
  const mockMcpAdminApiClient = {
    // Global server operations
    mcpAdminControllerCreateMcpServer: vi.fn().mockResolvedValue({
      id: "mcp-server-123",
      name: "Test MCP Server",
      description: "A test MCP server",
      transport: "http",
      config: { url: "https://test.example.com" },
      requiresOAuth: false,
      isActive: true,
      assignedClassCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    mcpAdminControllerListMcpServers: vi.fn().mockResolvedValue([]),
    mcpAdminControllerGetMcpServer: vi.fn().mockResolvedValue({
      id: "mcp-server-123",
      name: "Test MCP Server",
      transport: "http",
      config: { url: "https://test.example.com" },
      requiresOAuth: false,
      isActive: true,
      assignedClassCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    mcpAdminControllerUpdateMcpServer: vi.fn().mockResolvedValue({
      id: "mcp-server-123",
      name: "Updated MCP Server",
      transport: "http",
      config: { url: "https://test.example.com" },
      requiresOAuth: false,
      isActive: true,
      assignedClassCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    mcpAdminControllerDeleteMcpServer: vi.fn().mockResolvedValue(undefined),
    mcpAdminControllerTestMcpServer: vi.fn().mockResolvedValue({
      success: true,
      tools: [
        { name: "test_tool", description: "A test tool" },
      ],
    }),
    mcpAdminControllerListMcpServerTools: vi.fn().mockResolvedValue([
      { name: "test_tool", description: "A test tool" },
    ]),
    // Class-server assignment operations
    mcpAdminControllerGetClassServers: vi.fn().mockResolvedValue([]),
    mcpAdminControllerAssignServerToClass: vi.fn().mockResolvedValue({
      id: "assignment-123",
      classId: "test-class-123",
      mcpServerId: "mcp-server-123",
      isEnabled: true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      mcpServer: {
        id: "mcp-server-123",
        name: "Test MCP Server",
        transport: "http",
        requiresOAuth: false,
        isActive: true,
      },
    }),
    mcpAdminControllerRemoveServerFromClass: vi.fn().mockResolvedValue(undefined),
    mcpAdminControllerUpdateClassServerSettings: vi.fn().mockResolvedValue({
      id: "assignment-123",
      classId: "test-class-123",
      mcpServerId: "mcp-server-123",
      isEnabled: true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      mcpServer: {
        id: "mcp-server-123",
        name: "Test MCP Server",
        transport: "http",
        requiresOAuth: false,
        isActive: true,
      },
    }),
  };

  // Tool Configuration API mock
  const mockToolConfigApiClient = {
    toolConfigControllerGetToolsForClass: vi.fn().mockResolvedValue([]),
    toolConfigControllerUpdateToolConfig: vi.fn().mockResolvedValue({
      id: "tool-config-123",
      classId: "test-class-123",
      toolType: "RAG",
      toolIdentifier: "rag",
      toolName: "RAG Search",
      isEnabled: true,
      chatTypes: ["pdf"],
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    toolConfigControllerBulkUpdateToolConfigs: vi.fn().mockResolvedValue([]),
  };

  return {
    default: mockApiClient,
    apiClientWithoutMiddleWare: mockApiClient,
    mcpAdminApiClient: mockMcpAdminApiClient,
    toolConfigApiClient: mockToolConfigApiClient,
    basePath: "http://localhost:3000",
  };
});

// Also mock the entire services directory to prevent import issues
vi.mock("./services/index.ts", () => ({
  DefaultApi: vi.fn().mockImplementation(() => ({})),
  Configuration: vi.fn().mockImplementation(() => ({})),
}));

// Mock all services models using a more comprehensive approach
vi.mock("./services/models/index.ts", () => {
  // Create a Proxy that returns an empty object for any property access
  return new Proxy(
    {},
    {
      get() {
        // Return empty object for any property (model type) requested
        return {};
      },
    }
  );
});

// Also mock the runtime
vi.mock("./services/runtime.ts", () => ({}));
