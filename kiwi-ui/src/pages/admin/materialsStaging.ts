import type { StaffMaterial } from "../../services/index.ts";

export type MaterialTypeValue = "class materials" | "recitation";
export type DocumentRoleValue = "STUDENT" | "ANSWER" | "REFERENCE";

/**
 * A file waiting to be uploaded as a new material.
 *
 * Bulk upload answers one question — "what is this week's material?" — so a
 * staged row carries no role and no target. A file that belongs *inside* an
 * existing material is added from that material's row instead, where the
 * question ("give Recitation 3 its answer key") has an obvious answer. Role is
 * a property of the relationship between a file and a material, so it is asked
 * from the material, not from a flat list of files.
 */
export interface StagedFile {
  id: string;
  file: File;
  fileName: string;
  materialType: MaterialTypeValue;
  title: string;
  availableDate: string;
  /** Normalised base name, used to pair a worksheet with its answer key. */
  pairKey: string;
  /**
   * Another staged row this file belongs inside, rather than becoming its own
   * material. Set when a batch contains both a worksheet and its answer key —
   * neither exists in the database yet, so the pairing can only be seen within
   * the batch.
   */
  attachTo?: string;
  /** The instructor changed the type by hand; stop guessing at it. */
  typeTouched?: boolean;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

/**
 * Tokens instructors actually use in answer-key file names.
 *
 * Anchored on separators rather than \b: `\bkey\b` never matches `ps2_key`,
 * because an underscore is a word character. Bare-word alternatives would also
 * fire inside longer words — `Resolution.pdf` is not an answer key — so each
 * latin token needs a separator or a string edge on both sides. CJK has no such
 * separators, so those alternatives stay unanchored.
 */
const ANSWER_PATTERN =
  /(?:(?:^|[\s_\-.()])(?:answers?|solutions?|sol|key)(?=$|[\s_\-.()]))|答案|解答/i;

const RECITATION_PATTERN =
  /(recitation|worksheet|problem\s*set|exam|quiz|midterm|final|homework|assignment|practice|习题|练习|作业|测验)/i;

/**
 * The pairing key for a file: its name without extension, answer markers or
 * separators. `03-Recitation-Variables-answers.pdf` and
 * `03-Recitation-Variables.pdf` both reduce to `03recitationvariables`.
 */
export function pairKeyFor(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(ANSWER_PATTERN, "")
    .replace(/[\s_\-.()]+/g, "")
    .toLowerCase();
}

export function looksLikeAnswerKey(fileName: string): boolean {
  return ANSWER_PATTERN.test(fileName.replace(/\.[^.]+$/, ""));
}

/** First guess for a dropped file. Every field is editable. */
export function stageFile(file: File): StagedFile {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    fileName: file.name,
    materialType: RECITATION_PATTERN.test(file.name)
      ? "recitation"
      : "class materials",
    title: file.name.replace(/\.[^.]+$/, ""),
    availableDate: new Date().toISOString().slice(0, 10),
    pairKey: pairKeyFor(file.name),
    status: "pending",
  };
}

/**
 * The material a staged file looks like it belongs to, when its name says it is
 * an answer key for something that already exists.
 *
 * Only ever offered, never applied: uploading it as a new material would be
 * wrong in a way the instructor might not notice for weeks — students would see
 * a material whose only document is the answers.
 */
export function misfiledAnswerKeyFor(
  staged: StagedFile,
  materials: StaffMaterial[],
): StaffMaterial | null {
  if (!looksLikeAnswerKey(staged.fileName)) return null;

  const match = materials.find(
    (material) =>
      material.materialType === "recitation" &&
      (pairKeyFor(material.title) === staged.pairKey ||
        material.documents.some(
          (doc) => pairKeyFor(doc.fileName) === staged.pairKey,
        )),
  );

  if (!match) return null;
  // Nothing to offer if that material already has its answer key.
  return match.documents.some((doc) => doc.role === "ANSWER") ? null : match;
}

export const ROLE_LABELS: Record<DocumentRoleValue, string> = {
  STUDENT: "Student copy",
  ANSWER: "Answer key",
  REFERENCE: "Reference",
};

export const ROLE_HINTS: Record<DocumentRoleValue, string> = {
  STUDENT: "What students see.",
  ANSWER:
    "The same pages with the answers. The tutor reads this; students never see it.",
  REFERENCE: "Extra material for the tutor. Not shown to students.",
};

/**
 * Fold answer keys into the worksheet they belong to, within one batch.
 *
 * Dropping a semester at once means a worksheet and its answer key arrive
 * together and neither exists yet, so neither can be matched against the
 * database. Without this every answer key would become its own material whose
 * student copy is the answers.
 *
 * Order-independent on purpose: a FileList arrives in whatever order the OS
 * hands over, so this runs over the whole list rather than at drop time.
 */
export function reconcileStagedPairs(rows: StagedFile[]): StagedFile[] {
  const parents = rows.filter((row) => !looksLikeAnswerKey(row.fileName));

  const withPairs = rows.map((row) => {
    if (!looksLikeAnswerKey(row.fileName)) {
      return row.attachTo ? { ...row, attachTo: undefined } : row;
    }

    // A row the instructor detached by hand stays detached.
    if (row.attachTo === DETACHED) return row;

    const parent = parents.find((candidate) => candidate.pairKey === row.pairKey);
    const attachTo = parent?.id;
    return attachTo === row.attachTo ? row : { ...row, attachTo };
  });

  // A file that came with answers is a material that has answers, whatever its
  // name happens to contain. Keyword matching cannot be made to cover every way
  // an instructor might name a practice exam or a problem set, and getting it
  // wrong files the answer key as reference material — visible to no student,
  // but never used as the counterpart the tutor reads either.
  const pairedParentIds = new Set(
    withPairs
      .filter((row) => row.attachTo && row.attachTo !== DETACHED)
      .map((row) => row.attachTo as string),
  );

  return withPairs.map((row) =>
    pairedParentIds.has(row.id) &&
    !row.typeTouched &&
    row.materialType !== "recitation"
      ? { ...row, materialType: "recitation" as MaterialTypeValue }
      : row,
  );
}

/** Marker for "the instructor said this one stands alone". */
export const DETACHED = "__detached__";

/** The role an attached file takes inside its parent's material. */
export function attachedRole(
  parentType: MaterialTypeValue,
): DocumentRoleValue {
  // Only a recitation has answers; on a lecture the extra file is reference
  // material, which is the same audience with different semantics.
  return parentType === "recitation" ? "ANSWER" : "REFERENCE";
}

/**
 * An answer key that pairs with nothing — not in this batch, not in the class.
 * Uploading it as its own material would show students the answers, so the UI
 * says so rather than silently doing it.
 */
export function isOrphanAnswerKey(
  row: StagedFile,
  rows: StagedFile[],
  materials: StaffMaterial[],
): boolean {
  if (!looksLikeAnswerKey(row.fileName)) return false;
  if (row.attachTo && row.attachTo !== DETACHED) return false;
  if (misfiledAnswerKeyFor(row, materials)) return false;
  return !rows.some(
    (other) =>
      other.id !== row.id &&
      other.pairKey === row.pairKey &&
      !looksLikeAnswerKey(other.fileName),
  );
}
