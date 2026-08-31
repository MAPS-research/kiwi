import { beforeEach, describe, expect, it, vi } from "vitest";

const classControllerList = vi.fn();
const classControllerGetById = vi.fn();
const studentControllerGetEnrolledClassesInfoByStudentId = vi.fn();
const instructorClassControllerGetInstructorClasses = vi.fn();

vi.mock("../utils/api.ts", () => ({
  default: {
    classControllerList: (...args: unknown[]) => classControllerList(...args),
    classControllerGetById: (...args: unknown[]) =>
      classControllerGetById(...args),
    studentControllerGetEnrolledClassesInfoByStudentId: (...args: unknown[]) =>
      studentControllerGetEnrolledClassesInfoByStudentId(...args),
    instructorClassControllerGetInstructorClasses: (...args: unknown[]) =>
      instructorClassControllerGetInstructorClasses(...args),
  },
  basePath: "http://localhost:3000",
}));

const {
  invalidateClassDirectory,
  resolveClassId,
  resolveClassInPath,
  listClasses,
} = await import("./classDirectory.ts");

const ADMIN = ["admin", "instructor", "user"] as const;

/**
 * The agent only ever hears a class by name, so navigating to a class-scoped
 * admin page used to build /admin/class/<name>/... and 404 on load.
 */
describe("class name → classID resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateClassDirectory();
    classControllerList.mockResolvedValue({ classIds: ["c-uuid-1", "c-uuid-2"] });
    classControllerGetById.mockImplementation(({ classID }: { classID: string }) =>
      Promise.resolve(
        classID === "c-uuid-1"
          ? { id: "c-uuid-1", className: "Kiwi Demo" }
          : { id: "c-uuid-2", className: "Intro to ML" },
      ),
    );
  });

  it("maps a hyphenated/spaced class name onto the real id", async () => {
    await expect(resolveClassId("kiwi-demo", [...ADMIN])).resolves.toEqual({
      ok: true,
      classID: "c-uuid-1",
    });
    await expect(resolveClassId("Kiwi Demo", [...ADMIN])).resolves.toEqual({
      ok: true,
      classID: "c-uuid-1",
    });
  });

  it("bridges zero-padding between the spoken name and the class name", async () => {
    classControllerList.mockResolvedValue({ classIds: ["c-uuid-3"] });
    classControllerGetById.mockResolvedValue({
      id: "c-uuid-3",
      className: "Test Class 1",
    });
    await expect(resolveClassId("test class 01", [...ADMIN])).resolves.toEqual({
      ok: true,
      classID: "c-uuid-3",
    });
  });

  it("does not conflate distinct numbers", async () => {
    classControllerList.mockResolvedValue({ classIds: ["c-uuid-4"] });
    classControllerGetById.mockResolvedValue({
      id: "c-uuid-4",
      className: "Class 100",
    });
    const result = await resolveClassId("class 10", [...ADMIN]);
    expect(result.ok).toBe(false);
  });

  it("passes a real class id through untouched", async () => {
    await expect(resolveClassId("c-uuid-2", [...ADMIN])).resolves.toEqual({
      ok: true,
      classID: "c-uuid-2",
    });
  });

  it("matches on a unique substring of the name", async () => {
    await expect(resolveClassId("intro", [...ADMIN])).resolves.toMatchObject({
      ok: true,
      classID: "c-uuid-2",
    });
  });

  it("refuses an unknown name with the class list inline and no retry hint", async () => {
    const result = await resolveClassId("nope", [...ADMIN]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // The message must be self-sufficient: an error telling the agent to
      // re-list and retry is what produced the navigate/get_sitemap loop.
      expect(result.error).toContain("c-uuid-1");
      expect(result.error).toContain("Kiwi Demo");
      expect(result.error).toMatch(/do NOT/i);
      expect(result.candidates).toHaveLength(2);
    }
  });

  it("refuses an ambiguous name instead of guessing", async () => {
    classControllerGetById.mockImplementation(({ classID }: { classID: string }) =>
      Promise.resolve({ id: classID, className: `Kiwi Demo ${classID}` }),
    );
    const result = await resolveClassId("kiwi demo", [...ADMIN]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("more than one class");
  });

  it("still navigates when the class list cannot be loaded", async () => {
    classControllerList.mockRejectedValue(new Error("offline"));
    await expect(resolveClassId("c-uuid-1", [...ADMIN])).resolves.toEqual({
      ok: true,
      classID: "c-uuid-1",
    });
  });

  it("caches the directory across lookups", async () => {
    await resolveClassId("kiwi-demo", [...ADMIN]);
    await resolveClassId("intro", [...ADMIN]);
    expect(classControllerList).toHaveBeenCalledTimes(1);
  });

  it("reads students' classes from the enrolled-classes endpoint", async () => {
    studentControllerGetEnrolledClassesInfoByStudentId.mockResolvedValue({
      classInfoList: [{ id: "c-uuid-9", className: "Kiwi Demo" }],
    });
    await expect(listClasses(["user"])).resolves.toEqual([
      { classID: "c-uuid-9", className: "Kiwi Demo" },
    ]);
    expect(classControllerList).not.toHaveBeenCalled();
  });
});

describe("resolveClassInPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateClassDirectory();
    classControllerList.mockResolvedValue({ classIds: ["c-uuid-1"] });
    classControllerGetById.mockResolvedValue({
      id: "c-uuid-1",
      className: "Kiwi Demo",
    });
  });

  it("rewrites the class segment of an admin path (the reported bug)", async () => {
    await expect(
      resolveClassInPath("/admin/class/kiwi-demo/professor-analytics", [...ADMIN]),
    ).resolves.toEqual({
      ok: true,
      path: "/admin/class/c-uuid-1/professor-analytics",
    });
  });

  it("rewrites the single-segment class route and its subroutes", async () => {
    await expect(
      resolveClassInPath("/kiwi-demo/code", [...ADMIN]),
    ).resolves.toEqual({ ok: true, path: "/c-uuid-1/code" });
  });

  it("leaves non-class admin paths alone", async () => {
    await expect(
      resolveClassInPath("/admin/feature-flags", [...ADMIN]),
    ).resolves.toEqual({ ok: true, path: "/admin/feature-flags" });
    expect(classControllerList).not.toHaveBeenCalled();
  });
});
