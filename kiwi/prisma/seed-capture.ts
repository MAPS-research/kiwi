import 'dotenv/config';
import { createPrismaClient } from '../src/common/database/prisma-client.factory';
import * as fs from 'fs';
import * as path from 'path';

const prisma = createPrismaClient();

const OUTPUT_PATH = path.resolve(__dirname, 'seed-data.json');

type Snapshot = {
  capturedAt: string;
  schemaVersion: string | null;
  tables: Record<string, unknown[]>;
};

async function getSchemaVersion(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 1
    `;
    return rows[0]?.migration_name ?? null;
  } catch {
    return null;
  }
}

async function safeCapture<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    const rows = await fn();
    console.log(`[seed-capture]   ${label}: ${rows.length}`);
    return rows;
  } catch (err) {
    console.error(`[seed-capture]   ${label}: FAILED — ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

async function captureEmbeddings(): Promise<unknown[]> {
  // vector(1536) is Unsupported in Prisma client; must use raw SQL with ::text cast
  return prisma.$queryRaw<unknown[]>`
    SELECT
      id,
      "documentId",
      text,
      "documentPageNumber",
      chunk,
      embedding::text AS embedding
    FROM "Embedding"
  `;
}

async function main() {
  console.log(`[seed-capture] Capturing DB state to ${OUTPUT_PATH}`);
  console.log('[seed-capture] Row counts:');

  const snapshot: Snapshot = {
    capturedAt: new Date().toISOString(),
    schemaVersion: await getSchemaVersion(),
    tables: {
      User: await safeCapture('User', () => prisma.user.findMany()),
      UserWhitelist: await safeCapture('UserWhitelist', () => prisma.userWhitelist.findMany()),
      PendingAdmin: await safeCapture('PendingAdmin', () => prisma.pendingAdmin.findMany()),
      Class: await safeCapture('Class', () => prisma.class.findMany()),
      InstructorClass: await safeCapture('InstructorClass', () => prisma.instructorClass.findMany()),
      Enrollment: await safeCapture('Enrollment', () => prisma.enrollment.findMany()),
      PendingEnrollment: await safeCapture('PendingEnrollment', () => prisma.pendingEnrollment.findMany()),
      FeatureFlag: await safeCapture('FeatureFlag', () => prisma.featureFlag.findMany()),
      ClassMaterial: await safeCapture('ClassMaterial', () => prisma.classMaterial.findMany()),
      Document: await safeCapture('Document', () => prisma.document.findMany()),
      DocumentComment: await safeCapture('DocumentComment', () => prisma.documentComment.findMany()),
      DocumentSummary: await safeCapture('DocumentSummary', () => prisma.documentSummary.findMany()),
      Embedding: await safeCapture('Embedding', () => captureEmbeddings() as Promise<unknown[]>),
      LectureKeyword: await safeCapture('LectureKeyword', () => prisma.lectureKeyword.findMany()),
    },
  };

  const json = JSON.stringify(
    snapshot,
    (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
    2,
  );

  fs.writeFileSync(OUTPUT_PATH, json, 'utf8');

  console.log(`[seed-capture] Wrote snapshot to ${OUTPUT_PATH}`);
}

main()
  .catch((err) => {
    console.error('[seed-capture] Fatal error:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
