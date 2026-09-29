-- Materials pipeline redesign, phase 1: additive only.
--
-- Every column here is added with a default and backfilled in place, so this
-- migration can be deployed BEFORE the code that reads the new columns, and the
-- currently running code keeps working off `isStudent`/`isLlm`/`isVisible`
-- (kept, dual-written for one release, dropped in the cleanup phase).
--
-- History note: a `DocumentRole` enum existed briefly in 2025-08
-- (20250810083239) as NONE/STUDENT/LLM and was dropped four days later
-- (20250814161306) because those values are audiences and could not express
-- "student-facing AND used by the model" — the default for a first upload.
-- The roles below are *versions* instead; audience is derived from them.

-- CreateEnum
CREATE TYPE "DocumentRole" AS ENUM ('STUDENT', 'ANSWER', 'REFERENCE');

-- CreateEnum
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "MaterialLifecycle" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AnnotationAudience" AS ENUM ('STUDENT', 'TUTOR', 'STAFF');

-- AlterTable
ALTER TABLE "ClassMaterial"
    ADD COLUMN "title" TEXT,
    ADD COLUMN "lifecycle" "MaterialLifecycle" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "Document"
    ADD COLUMN "role" "DocumentRole" NOT NULL DEFAULT 'REFERENCE',
    ADD COLUMN "retrievalEnabled" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "processingStatus" "DocumentProcessingStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "processingStage" TEXT,
    ADD COLUMN "processingError" TEXT,
    ADD COLUMN "processedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DocumentComment"
    ADD COLUMN "audience" "AnnotationAudience" NOT NULL DEFAULT 'STUDENT';

-- AlterTable
ALTER TABLE "DocumentSummary"
    ADD COLUMN "audience" "AnnotationAudience" NOT NULL DEFAULT 'STUDENT';

-- Backfill: material lifecycle. `delete` was a soft delete to status
-- 'unavailable'; everything else was live.
UPDATE "ClassMaterial" SET "lifecycle" = 'ARCHIVED' WHERE "status" = 'unavailable';

-- Backfill (1/3): the student copy is the flagged one. A material can hold more
-- than one isStudent=true row (the flag predates the mutual-exclusion logic in
-- setFlags), so keep the earliest and leave the rest as REFERENCE.
WITH ranked AS (
    SELECT "id",
           ROW_NUMBER() OVER (
               PARTITION BY "classMaterialId"
               ORDER BY "uploadedDate" ASC, "id" ASC
           ) AS rn
    FROM "Document"
    WHERE "classMaterialId" IS NOT NULL AND "isStudent" = true
)
UPDATE "Document" d
SET "role" = 'STUDENT'
FROM ranked r
WHERE d."id" = r."id" AND r.rn = 1;

-- Backfill (2/3): a material with no flagged copy at all falls back to its
-- earliest upload, which matches the real ordering of the batch page (step 1
-- questions, step 2 answers). Every material hit by this rule is listed by
-- scripts/materials-backfill-audit.ts for an instructor to confirm.
WITH candidates AS (
    SELECT d."id",
           ROW_NUMBER() OVER (
               PARTITION BY d."classMaterialId"
               ORDER BY d."uploadedDate" ASC, d."id" ASC
           ) AS rn
    FROM "Document" d
    WHERE d."classMaterialId" IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM "Document" s
          WHERE s."classMaterialId" = d."classMaterialId" AND s."role" = 'STUDENT'
      )
)
UPDATE "Document" d
SET "role" = 'STUDENT'
FROM candidates c
WHERE d."id" = c."id" AND c.rn = 1;

-- Backfill (3/3): the answer key is the latest remaining isLlm document in a
-- recitation material. Lectures never get an ANSWER — their extra documents
-- stay REFERENCE.
WITH answers AS (
    SELECT d."id",
           ROW_NUMBER() OVER (
               PARTITION BY d."classMaterialId"
               ORDER BY d."uploadedDate" DESC, d."id" DESC
           ) AS rn
    FROM "Document" d
    JOIN "ClassMaterial" m ON m."id" = d."classMaterialId"
    WHERE d."role" = 'REFERENCE'
      AND d."isLlm" = true
      AND m."materialType" = 'recitation'
)
UPDATE "Document" d
SET "role" = 'ANSWER'
FROM answers a
WHERE d."id" = a."id" AND a.rn = 1;

-- Backfill: processing state. Embedded means the pipeline finished; chunked but
-- never embedded is the half-processed case the old browser-driven pipeline left
-- behind, and it should show up in the UI as something to re-run rather than
-- pass for a healthy document.
UPDATE "Document" d
SET "processingStatus" = 'READY'
WHERE EXISTS (SELECT 1 FROM "Embedding" e WHERE e."documentId" = d."id");

UPDATE "Document" d
SET "processingStatus" = 'FAILED',
    "processingError" = 'Pre-migration: chunked but never embedded. Re-run processing.'
WHERE d."chunks" IS NOT NULL
  AND d."chunks"::text NOT IN ('null', '[]')
  AND NOT EXISTS (SELECT 1 FROM "Embedding" e WHERE e."documentId" = d."id");

-- Backfill: annotations. "Hidden from students" hid the note from the model too,
-- so it maps to STAFF, not TUTOR — those notes were written expecting no reader
-- and must not start reaching students through the tutor's answers. Instructors
-- promote the ones they want to TUTOR from the review list.
UPDATE "DocumentComment" SET "audience" = 'STAFF' WHERE "isVisible" = false;
UPDATE "DocumentSummary" SET "audience" = 'STAFF' WHERE "isVisibleToStudents" = false;

-- CreateIndex
CREATE INDEX "Document_classMaterialId_role_idx" ON "Document"("classMaterialId", "role");

-- CreateIndex: "at most one student copy / answer key per material" is a partial
-- unique index, which Prisma's schema language cannot express — it lives here
-- only, like the per-model HNSW indexes in the embedding migration. It replaces
-- the read-then-updateMany mutual exclusion in DocumentService.setFlags.
CREATE UNIQUE INDEX "Document_one_student_per_material"
    ON "Document" ("classMaterialId")
    WHERE "role" = 'STUDENT' AND "classMaterialId" IS NOT NULL;

CREATE UNIQUE INDEX "Document_one_answer_per_material"
    ON "Document" ("classMaterialId")
    WHERE "role" = 'ANSWER' AND "classMaterialId" IS NOT NULL;
