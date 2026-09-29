import type { StaffDocument, StaffMaterial } from "../../services/index.ts";

/**
 * Something about a material an instructor would want to act on.
 *
 * Ordered by how much it matters: a material with no student copy is invisible
 * to the class, which is worse than one whose tutor lacks the answers, which is
 * worse than one still being processed.
 */
export type MaterialIssue =
  | "no-student-copy"
  | "processing-failed"
  | "no-answer-key"
  | "processing";

export const ISSUE_LABELS: Record<MaterialIssue, string> = {
  "no-student-copy": "No student copy",
  "processing-failed": "Processing failed",
  "no-answer-key": "No answer key",
  processing: "Processing",
};

export function documentsWithRole(
  material: StaffMaterial,
  role: string,
): StaffDocument[] {
  return material.documents.filter((doc) => doc.role === role);
}

export function materialIssues(material: StaffMaterial): MaterialIssue[] {
  const issues: MaterialIssue[] = [];

  if (documentsWithRole(material, "STUDENT").length === 0) {
    issues.push("no-student-copy");
  }
  if (material.documents.some((doc) => doc.processingStatus === "FAILED")) {
    issues.push("processing-failed");
  }
  if (
    material.materialType === "recitation" &&
    documentsWithRole(material, "ANSWER").length === 0
  ) {
    issues.push("no-answer-key");
  }
  if (
    material.documents.some(
      (doc) =>
        doc.processingStatus === "PENDING" ||
        doc.processingStatus === "PROCESSING",
    )
  ) {
    issues.push("processing");
  }

  return issues;
}

/** Issues worth a warning marker. "Processing" is a state, not a problem. */
export function needsAttention(material: StaffMaterial): boolean {
  return materialIssues(material).some((issue) => issue !== "processing");
}

export type MaterialFilter =
  | "all"
  | "attention"
  | "no-answer-key"
  | "processing-failed";

export const FILTER_LABELS: Record<MaterialFilter, string> = {
  all: "All materials",
  attention: "Needs attention",
  "no-answer-key": "Missing answer key",
  "processing-failed": "Processing failed",
};

export function matchesFilter(
  material: StaffMaterial,
  filter: MaterialFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "attention") return needsAttention(material);
  return materialIssues(material).includes(filter);
}

/** Search covers file names too — instructors look for what they uploaded. */
export function matchesQuery(material: StaffMaterial, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return (
    material.title.toLowerCase().includes(needle) ||
    material.documents.some((doc) =>
      doc.fileName.toLowerCase().includes(needle),
    )
  );
}

export type MaterialSort = "newest" | "oldest" | "title";

export const SORT_LABELS: Record<MaterialSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "By title",
};

export function sortMaterials(
  materials: StaffMaterial[],
  sort: MaterialSort,
): StaffMaterial[] {
  const copy = [...materials];
  if (sort === "title") {
    return copy.sort((a, b) => a.title.localeCompare(b.title));
  }
  copy.sort(
    (a, b) =>
      new Date(a.availableDate).getTime() - new Date(b.availableDate).getTime(),
  );
  // Recent material is what instructors work on, so newest is the default.
  return sort === "newest" ? copy.reverse() : copy;
}

export function applyListControls(
  materials: StaffMaterial[],
  options: { query: string; filter: MaterialFilter; sort: MaterialSort },
): StaffMaterial[] {
  return sortMaterials(
    materials.filter(
      (material) =>
        matchesQuery(material, options.query) &&
        matchesFilter(material, options.filter),
    ),
    options.sort,
  );
}
