import { describe, expect, it } from "vitest";
import type { StaffMaterial } from "../../services/index.ts";
import {
  applyListControls,
  matchesFilter,
  matchesQuery,
  materialIssues,
  needsAttention,
  sortMaterials,
} from "./materialsListing.ts";

const doc = (over: Partial<StaffMaterial["documents"][number]>) =>
  ({
    id: Math.random().toString(36).slice(2),
    fileName: "file.pdf",
    role: "STUDENT",
    processingStatus: "READY",
    processingStage: null,
    processingError: null,
    uploadedDate: new Date("2026-03-01"),
    file: "https://example.test/file.pdf",
    ...over,
  }) as StaffMaterial["documents"][number];

const material = (over: Partial<StaffMaterial> = {}): StaffMaterial =>
  ({
    id: "mat1",
    materialType: "recitation",
    title: "03 Recitation Variables",
    availableDate: new Date("2026-03-01"),
    lifecycle: "PUBLISHED",
    documents: [doc({}), doc({ role: "ANSWER" })],
    ...over,
  }) as StaffMaterial;

describe("materialIssues", () => {
  it("is quiet for a complete recitation", () => {
    expect(materialIssues(material())).toEqual([]);
  });

  it("reports a missing student copy — the material is invisible to the class", () => {
    const m = material({ documents: [doc({ role: "ANSWER" })] });
    expect(materialIssues(m)).toContain("no-student-copy");
  });

  it("reports a recitation with no answer key", () => {
    const m = material({ documents: [doc({})] });
    expect(materialIssues(m)).toContain("no-answer-key");
  });

  it("never asks a lecture for an answer key", () => {
    const m = material({
      materialType: "class materials",
      documents: [doc({})],
    });
    expect(materialIssues(m)).not.toContain("no-answer-key");
  });

  it("reports a failed document", () => {
    const m = material({
      documents: [doc({ processingStatus: "FAILED" }), doc({ role: "ANSWER" })],
    });
    expect(materialIssues(m)).toContain("processing-failed");
  });

  it("orders issues by how much they matter", () => {
    const m = material({
      documents: [doc({ role: "REFERENCE", processingStatus: "FAILED" })],
    });
    expect(materialIssues(m)).toEqual([
      "no-student-copy",
      "processing-failed",
      "no-answer-key",
    ]);
  });
});

describe("needsAttention", () => {
  it("treats processing as a state, not a problem", () => {
    const m = material({
      documents: [
        doc({ processingStatus: "PROCESSING" }),
        doc({ role: "ANSWER" }),
      ],
    });
    expect(materialIssues(m)).toContain("processing");
    expect(needsAttention(m)).toBe(false);
  });

  it("flags a material students cannot see", () => {
    expect(needsAttention(material({ documents: [] }))).toBe(true);
  });
});

describe("matchesQuery", () => {
  it("matches the title", () => {
    expect(matchesQuery(material(), "recitation")).toBe(true);
  });

  it("matches a file name, which is what instructors remember", () => {
    const m = material({
      title: "Week 3",
      documents: [doc({ fileName: "03-Recitation-Variables.pdf" })],
    });
    expect(matchesQuery(m, "variables")).toBe(true);
  });

  it("matches everything on an empty query", () => {
    expect(matchesQuery(material(), "   ")).toBe(true);
  });
});

describe("matchesFilter", () => {
  it("passes everything on 'all'", () => {
    expect(matchesFilter(material({ documents: [] }), "all")).toBe(true);
  });

  it("selects only materials needing attention", () => {
    expect(matchesFilter(material(), "attention")).toBe(false);
    expect(matchesFilter(material({ documents: [] }), "attention")).toBe(true);
  });

  it("selects a specific issue", () => {
    const noAnswers = material({ documents: [doc({})] });
    expect(matchesFilter(noAnswers, "no-answer-key")).toBe(true);
    expect(matchesFilter(noAnswers, "processing-failed")).toBe(false);
  });
});

describe("sortMaterials", () => {
  const older = material({ id: "a", title: "B", availableDate: new Date("2026-01-01") });
  const newer = material({ id: "b", title: "A", availableDate: new Date("2026-06-01") });

  it("puts recent material first by default", () => {
    expect(sortMaterials([older, newer], "newest").map((m) => m.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("can go the other way", () => {
    expect(sortMaterials([newer, older], "oldest").map((m) => m.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("sorts by title when asked", () => {
    expect(sortMaterials([older, newer], "title").map((m) => m.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("does not mutate the input", () => {
    const input = [older, newer];
    sortMaterials(input, "newest");
    expect(input.map((m) => m.id)).toEqual(["a", "b"]);
  });
});

describe("applyListControls", () => {
  it("filters and sorts together", () => {
    const complete = material({ id: "ok", availableDate: new Date("2026-01-01") });
    const missing = material({
      id: "missing",
      availableDate: new Date("2026-06-01"),
      documents: [doc({})],
    });

    const result = applyListControls([complete, missing], {
      query: "recitation",
      filter: "attention",
      sort: "newest",
    });

    expect(result.map((m) => m.id)).toEqual(["missing"]);
  });
});
