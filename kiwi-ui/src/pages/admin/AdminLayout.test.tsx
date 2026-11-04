import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "./AdminLayout.tsx";
import apiClient, { kiwiAppsApiClient } from "../../utils/api.ts";
import theme from "../../Theme.ts";

vi.mock("../../utils/api.ts", () => ({
  default: {
    authControllerGetUserRole: vi.fn(),
    classControllerList: vi.fn(),
    classControllerGetById: vi.fn(),
    instructorClassControllerGetInstructorClasses: vi.fn(),
  },
  kiwiAppsApiClient: {
    kiwiAppControllerListApps: vi.fn(),
    kiwiAppControllerGetAppUIs: vi.fn(),
  },
}));

// The top bar is another region's; the shell only places it and feeds it the class list.
const topNavProps = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock("../../components/TopNav/TopNav.tsx", () => ({
  default: (props: Record<string, unknown>) => {
    topNavProps.current = props;
    return <header data-testid="top-nav" />;
  },
  TOP_NAV_HEIGHT: 52,
  TOP_NAV_BRAND_AREA_WIDTH: 220,
}));

vi.mock("../../hooks/useContentResize.ts", () => ({
  useContentResize: () => ({ width: "100%" }),
}));

const mockApiClient = apiClient as any;
const mockKiwiApps = kiwiAppsApiClient as any;

const renderShell = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/admin/classes"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="classes" element={<p>Classes page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.classControllerList.mockResolvedValue({ classIds: [] });
    mockApiClient.instructorClassControllerGetInstructorClasses.mockResolvedValue({ classes: [] });
    mockKiwiApps.kiwiAppControllerListApps.mockResolvedValue([]);
  });

  it("makes the whole admin area compact and lays the pages on the canvas", async () => {
    mockApiClient.authControllerGetUserRole.mockResolvedValue({ role: "admin" });

    const { container } = renderShell();

    expect(container.firstElementChild).toHaveAttribute("data-density", "compact");
    expect(await screen.findByText("Classes page")).toBeInTheDocument();
    expect(window.getComputedStyle(screen.getByRole("main")).backgroundColor).toBe(
      "var(--mui-palette-background-default)",
    );
  });

  it("names the admin entries in sentence case, as their pages", async () => {
    mockApiClient.authControllerGetUserRole.mockResolvedValue({ role: "admin" });

    renderShell();

    const nav = await screen.findByRole("complementary", { name: "Admin navigation" });
    const labels = [
      "Classes",
      "Users",
      "System analytics",
      "System email",
      "Email audit",
      "System flags",
      "MCP servers",
      "App registry",
      "Webhooks",
      "Webhook approvals",
    ];
    for (const label of labels) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    // The current page carries the current look and aria-current.
    expect(screen.getByRole("button", { name: "Classes" })).toHaveAttribute("aria-current", "page");
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse admin navigation" })).toBeInTheDocument();
  });

  it("calls an instructor's classes \"Your classes\" and hides the admin-only entries", async () => {
    mockApiClient.authControllerGetUserRole.mockResolvedValue({ role: "instructor" });

    renderShell();

    expect(await screen.findByRole("button", { name: "Your classes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Users" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "System analytics" })).not.toBeInTheDocument();
  });

  it("holds the rail with a skeleton while the role loads", () => {
    mockApiClient.authControllerGetUserRole.mockImplementation(() => new Promise(() => {}));

    renderShell();

    const skeleton = screen.getByRole("complementary", { name: "Loading admin navigation" });
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(window.getComputedStyle(skeleton).width).toBe("var(--size-sidebar)");
  });

  it("gives the class switcher the fallback words for an unnamed class and an empty list", async () => {
    mockApiClient.authControllerGetUserRole.mockResolvedValue({ role: "admin" });
    mockApiClient.classControllerList.mockResolvedValue({ classIds: ["c1"] });
    mockApiClient.classControllerGetById.mockResolvedValue({ id: "c1", className: "" });

    renderShell();

    await waitFor(() => {
      expect(topNavProps.current.classOptions).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: "c1", label: "Untitled class" })]),
      );
    });
    expect(topNavProps.current.classEmptyLabel).toBe("No classes yet");
  });

  it("tells an instructor with no classes who assigns them", async () => {
    mockApiClient.authControllerGetUserRole.mockResolvedValue({ role: "instructor" });

    renderShell();

    await screen.findByRole("button", { name: "Your classes" });
    expect(topNavProps.current.classEmptyLabel).toBe(
      "No classes assigned to you yet. An administrator assigns them.",
    );
  });
});
