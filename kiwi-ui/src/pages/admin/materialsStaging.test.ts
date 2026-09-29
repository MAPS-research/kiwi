import { describe, expect, it } from "vitest";
import type { StaffMaterial } from "../../services/index.ts";
import {
  attachedRole,
  DETACHED,
  isOrphanAnswerKey,
  looksLikeAnswerKey,
  misfiledAnswerKeyFor,
  pairKeyFor,
  reconcileStagedPairs,
  stageFile,
} from "./materialsStaging.ts";

const pdf = (name: string) =>
  new File([new Uint8Array([1])], name, { type: "application/pdf" });

const material = (over: Partial<StaffMaterial>): StaffMaterial =>
  ({
    id: "mat1",
    materialType: "recitation",
    title: "03 Recitation Variables",
    availableDate: new Date("2026-03-01"),
    lifecycle: "PUBLISHED",
    documents: [],
    ...over,
  }) as StaffMaterial;

const doc = (fileName: string, role = "STUDENT") =>
  ({ fileName, role }) as StaffMaterial["documents"][number];

describe("pairKeyFor", () => {
  it("reduces a worksheet and its answer key to the same key", () => {
    expect(pairKeyFor("03-Recitation-Variables.pdf")).toBe(
      pairKeyFor("03-Recitation-Variables-answers.pdf"),
    );
  });

  it("keeps different worksheets apart", () => {
    expect(pairKeyFor("03-Recitation.pdf")).not.toBe(
      pairKeyFor("04-Recitation.pdf"),
    );
  });
});

describe("looksLikeAnswerKey", () => {
  it.each([
    "worksheet-answers.pdf",
    "Recitation 3 Solutions.pdf",
    "ps2_key.pdf",
    "03 Recitation sol.pdf",
    "习题三-答案.pdf",
  ])("recognises %s", (name) => {
    expect(looksLikeAnswerKey(name)).toBe(true);
  });

  // "Resolution" contains "solution", so a bare-word pattern flags it.
  it.each([
    "03-Recitation-Variables.pdf",
    "01-Introduction.pdf",
    "Resolution.pdf",
  ])("leaves %s alone", (name) => {
    expect(looksLikeAnswerKey(name)).toBe(false);
  });
});

describe("stageFile", () => {
  it("treats a dropped file as a new material's student copy", () => {
    const row = stageFile(pdf("01-Introduction.pdf"));

    expect(row.materialType).toBe("class materials");
    expect(row.title).toBe("01-Introduction");
    expect(row.status).toBe("pending");
    expect(row.file.name).toBe("01-Introduction.pdf");
  });

  it("guesses recitation from the file name", () => {
    expect(stageFile(pdf("03-Recitation-Variables.pdf")).materialType).toBe(
      "recitation",
    );
  });
});

describe("misfiledAnswerKeyFor", () => {
  it("offers the matching recitation for a dropped answer key", () => {
    const existing = material({
      id: "mat-existing",
      documents: [doc("03-Recitation-Variables.pdf")],
    });

    const row = stageFile(pdf("03-Recitation-Variables-answers.pdf"));

    expect(misfiledAnswerKeyFor(row, [existing])?.id).toBe("mat-existing");
  });

  it("matches on the material title too", () => {
    const existing = material({
      id: "mat-titled",
      title: "03 Recitation Variables",
      documents: [doc("worksheet.pdf")],
    });

    const row = stageFile(pdf("03-Recitation-Variables-answers.pdf"));

    expect(misfiledAnswerKeyFor(row, [existing])?.id).toBe("mat-titled");
  });

  it("says nothing about a file that is not an answer key", () => {
    const existing = material({
      documents: [doc("03-Recitation-Variables.pdf")],
    });

    const row = stageFile(pdf("03-Recitation-Variables.pdf"));

    expect(misfiledAnswerKeyFor(row, [existing])).toBeNull();
  });

  it("stays quiet when the material already has its answer key", () => {
    const existing = material({
      documents: [
        doc("03-Recitation-Variables.pdf"),
        doc("03-Recitation-Variables-answers.pdf", "ANSWER"),
      ],
    });

    const row = stageFile(pdf("03-Recitation-Variables-answers.pdf"));

    expect(misfiledAnswerKeyFor(row, [existing])).toBeNull();
  });

  it("never points at a lecture — lectures have no answer key", () => {
    const lecture = material({
      id: "mat-lecture",
      materialType: "class materials",
      title: "01 Introduction",
      documents: [doc("01-Introduction.pdf")],
    });

    const row = stageFile(pdf("01-Introduction-solutions.pdf"));

    expect(misfiledAnswerKeyFor(row, [lecture])).toBeNull();
  });

  it("says nothing when no material matches", () => {
    const row = stageFile(pdf("09-Recitation-answers.pdf"));

    expect(misfiledAnswerKeyFor(row, [])).toBeNull();
  });
});

describe("reconcileStagedPairs", () => {
  const stage = (name: string) => stageFile(pdf(name));

  it("folds an answer key into the worksheet dropped alongside it", () => {
    const rows = reconcileStagedPairs([
      stage("03-Recitation-Variables.pdf"),
      stage("03-Recitation-Variables-answers.pdf"),
    ]);

    const [worksheet, answers] = rows;
    expect(worksheet.attachTo).toBeUndefined();
    expect(answers.attachTo).toBe(worksheet.id);
  });

  it("does not depend on the order files arrive in", () => {
    // A FileList comes in whatever order the OS gives, so the answer key can
    // land first.
    const rows = reconcileStagedPairs([
      stage("03-Recitation-Variables-answers.pdf"),
      stage("03-Recitation-Variables.pdf"),
    ]);

    const answers = rows.find((r) => r.fileName.includes("answers"))!;
    const worksheet = rows.find((r) => !r.fileName.includes("answers"))!;
    expect(answers.attachTo).toBe(worksheet.id);
  });

  it("pairs each worksheet with its own answers across a whole batch", () => {
    const rows = reconcileStagedPairs([
      stage("03-Recitation.pdf"),
      stage("04-Recitation.pdf"),
      stage("04-Recitation-answers.pdf"),
      stage("03-Recitation-answers.pdf"),
    ]);

    const parentOf = (name: string) =>
      rows.find((r) => r.fileName === name)!.attachTo;

    expect(parentOf("03-Recitation-answers.pdf")).toBe(
      rows.find((r) => r.fileName === "03-Recitation.pdf")!.id,
    );
    expect(parentOf("04-Recitation-answers.pdf")).toBe(
      rows.find((r) => r.fileName === "04-Recitation.pdf")!.id,
    );
  });

  it("leaves an answer key alone when its worksheet is not in the batch", () => {
    const rows = reconcileStagedPairs([stage("03-Recitation-answers.pdf")]);

    expect(rows[0].attachTo).toBeUndefined();
  });

  it("respects a pair the instructor pulled apart", () => {
    const worksheet = stage("03-Recitation.pdf");
    const answers = { ...stage("03-Recitation-answers.pdf"), attachTo: DETACHED };

    const rows = reconcileStagedPairs([worksheet, answers]);

    expect(rows[1].attachTo).toBe(DETACHED);
  });
});

describe("attachedRole", () => {
  it("is the answer key on a recitation", () => {
    expect(attachedRole("recitation")).toBe("ANSWER");
  });

  it("is reference material on a lecture — lectures have no answers", () => {
    expect(attachedRole("class materials")).toBe("REFERENCE");
  });
});

describe("isOrphanAnswerKey", () => {
  it("flags an answer key that pairs with nothing anywhere", () => {
    const rows = reconcileStagedPairs([stageFile(pdf("09-Recitation-answers.pdf"))]);

    expect(isOrphanAnswerKey(rows[0], rows, [])).toBe(true);
  });

  it("says nothing once it is folded into a worksheet", () => {
    const rows = reconcileStagedPairs([
      stageFile(pdf("03-Recitation.pdf")),
      stageFile(pdf("03-Recitation-answers.pdf")),
    ]);

    expect(isOrphanAnswerKey(rows[1], rows, [])).toBe(false);
  });

  it("says nothing when an existing material matches it", () => {
    const existing = material({
      documents: [doc("03-Recitation-Variables.pdf")],
    });
    const rows = [stageFile(pdf("03-Recitation-Variables-answers.pdf"))];

    expect(isOrphanAnswerKey(rows[0], rows, [existing])).toBe(false);
  });
});

describe("pairing decides the material type", () => {
  it("treats a paired file as a material with answers, whatever it is called", () => {
    // The real report: a practice exam matched none of the recitation
    // keywords, so its answer key was filed as reference material.
    const rows = reconcileStagedPairs([
      stageFile(pdf("S24-final-practice-exam-ogm.pdf")),
      stageFile(pdf("S24-final-practice-exam-ogm-answers.pdf")),
    ]);

    const parent = rows.find((r) => !r.fileName.includes("answers"))!;
    expect(parent.materialType).toBe("recitation");
    expect(attachedRole(parent.materialType)).toBe("ANSWER");
  });

  it("works for a name with no recognisable keyword at all", () => {
    const rows = reconcileStagedPairs([
      stageFile(pdf("week-07.pdf")),
      stageFile(pdf("week-07-solutions.pdf")),
    ]);

    expect(rows[0].materialType).toBe("recitation");
    expect(rows[1].attachTo).toBe(rows[0].id);
  });

  it("leaves a lecture alone when nothing is paired with it", () => {
    const rows = reconcileStagedPairs([stageFile(pdf("01-Introduction.pdf"))]);

    expect(rows[0].materialType).toBe("class materials");
  });

  it("does not override a type the instructor set by hand", () => {
    const parent = {
      ...stageFile(pdf("week-07.pdf")),
      materialType: "class materials" as const,
      typeTouched: true,
    };
    const answers = stageFile(pdf("week-07-answers.pdf"));

    const rows = reconcileStagedPairs([parent, answers]);

    expect(rows[0].materialType).toBe("class materials");
    // And then the attached file is reference material, which is correct for a
    // lecture — it just is not an answer key.
    expect(attachedRole(rows[0].materialType)).toBe("REFERENCE");
  });
});
