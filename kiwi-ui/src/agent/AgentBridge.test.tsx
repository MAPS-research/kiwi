import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateSpy = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock("../auth/AuthContext.tsx", () => ({
  useAuth: () => ({ user: { systemRole: "admin", isAdmin: true } }),
}));

vi.mock("../context/GlobalChatContext.tsx", () => ({
  useGlobalChat: () => ({ activeTab: "materials", appContext: undefined }),
}));

const classControllerList = vi.fn();
const classControllerGetById = vi.fn();
vi.mock("../utils/api.ts", () => ({
  default: {
    classControllerList: (...a: unknown[]) => classControllerList(...a),
    classControllerGetById: (...a: unknown[]) => classControllerGetById(...a),
    studentControllerGetEnrolledClassesInfoByStudentId: vi.fn(),
    instructorClassControllerGetInstructorClasses: vi.fn(),
  },
  basePath: "http://localhost:3000",
}));

const { default: AgentBridge } = await import("./AgentBridge.tsx");
const { toolRegistry } = await import("./toolRegistry.ts");
const { invalidateClassDirectory } = await import("./classDirectory.ts");

/**
 * Exercises the tools through the real registry, the way a streamed
 * clientAction does — the unit tests cover resolution, this covers the wiring.
 */
describe("AgentBridge navigate → class resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateClassDirectory();
    classControllerList.mockResolvedValue({ classIds: ["c-uuid-1"] });
    classControllerGetById.mockResolvedValue({
      id: "c-uuid-1",
      className: "Test Class 01",
    });
    render(
      <MemoryRouter>
        <AgentBridge />
      </MemoryRouter>,
    );
  });

  it("registers list_classes", async () => {
    expect(toolRegistry.has("list_classes")).toBe(true);
    await expect(toolRegistry.execute("list_classes", {})).resolves.toEqual({
      ok: true,
      classes: [{ classID: "c-uuid-1", className: "Test Class 01" }],
    });
  });

  it("navigates to class analytics given the class NAME", async () => {
    const result = await toolRegistry.execute("navigate", {
      destination: "class-analytics",
      params: { classID: "test class 01" },
    });
    expect(result).toMatchObject({ ok: true });
    expect(navigateSpy).toHaveBeenCalledWith(
      "/admin/class/c-uuid-1/professor-analytics",
    );
  });

  it("navigates given the real class id", async () => {
    const result = await toolRegistry.execute("navigate", {
      destination: "class-analytics",
      params: { classID: "c-uuid-1" },
    });
    expect(result).toMatchObject({ ok: true });
    expect(navigateSpy).toHaveBeenCalledWith(
      "/admin/class/c-uuid-1/professor-analytics",
    );
  });

  it("accepts the param under a lowercase classId key", async () => {
    const result = await toolRegistry.execute("navigate", {
      destination: "class-analytics",
      params: { classId: "test class 01" },
    });
    expect(result).toMatchObject({ ok: true });
  });

  it("accepts params sent as a JSON string", async () => {
    const result = await toolRegistry.execute("navigate", {
      destination: "class-analytics",
      params: JSON.stringify({ classID: "test class 01" }),
    });
    expect(result).toMatchObject({ ok: true });
  });
});

/**
 * Every navigate failure hands the sitemap back. Without it the agent's reflex
 * is to call get_sitemap and retry — a round-trip that ends where it started,
 * which is how the get_sitemap → … → navigate → get_sitemap loop sustained
 * itself.
 */
describe("AgentBridge navigate → failures carry the sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateClassDirectory();
    classControllerList.mockResolvedValue({ classIds: ["c-uuid-1"] });
    classControllerGetById.mockResolvedValue({
      id: "c-uuid-1",
      className: "Test Class 01",
    });
    render(
      <MemoryRouter>
        <AgentBridge />
      </MemoryRouter>,
    );
  });

  const destinationKeys = (result: unknown) =>
    ((result as { destinations?: { key: string }[] }).destinations ?? []).map(
      (d) => d.key,
    );

  it("returns the destinations when a required param is missing", async () => {
    const result = await toolRegistry.execute("navigate", {
      destination: "class-analytics",
    });
    expect(result).toMatchObject({ ok: false });
    expect(destinationKeys(result)).toContain("class-analytics");
    expect((result as { message: string }).message).toMatch(/classID/);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("returns the destinations for an unknown destination key", async () => {
    const result = await toolRegistry.execute("navigate", {
      destination: "class-analytics-dashboard",
    });
    expect(result).toMatchObject({ ok: false });
    expect(destinationKeys(result)).toContain("class-analytics");
  });

  it("returns the destinations for an invented path", async () => {
    // Not /admin/... — that pattern is a deliberate wildcard, so it would pass.
    const result = await toolRegistry.execute("navigate", {
      path: "/classes/c-uuid-1/analytics",
    });
    expect(result).toMatchObject({ ok: false });
    expect(destinationKeys(result)).toContain("class-analytics");
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("names open_material when the call used that tool's arguments", async () => {
    const result = await toolRegistry.execute("navigate", {
      targetTab: "materials",
      pdfId: "pdf-1",
    });
    expect(result).toMatchObject({ ok: false });
    expect((result as { message: string }).message).toMatch(/open_material/);
    expect(destinationKeys(result)).toContain("class-analytics");
  });

  it("still tells the agent not to re-read the sitemap", async () => {
    const result = await toolRegistry.execute("navigate", {
      destination: "class-analytics",
    });
    expect((result as { message: string }).message).toMatch(/do NOT call get_sitemap/i);
  });
});
