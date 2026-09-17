import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const SNAPSHOT_PATH = path.resolve(__dirname, 'seed-data.json');

type Snapshot = {
  capturedAt?: string;
  schemaVersion?: string | null;
  tables: Record<string, any[]>;
};

function loadSnapshot(): Snapshot | null {
  if (!fs.existsSync(SNAPSHOT_PATH)) return null;
  const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  try {
    return JSON.parse(raw) as Snapshot;
  } catch (err) {
    console.error(`[seed] Could not parse ${SNAPSHOT_PATH}:`, err);
    return null;
  }
}

async function safeUpsertAll<T>(
  label: string,
  rows: T[],
  upsertOne: (row: T) => Promise<unknown>,
) {
  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await upsertOne(row);
      ok++;
    } catch (err) {
      failed++;
      const rowId = (row as any).id ?? '(no id)';
      console.error(
        `[seed] ${label} upsert failed for ${rowId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  console.log(`[seed] ${label}: ${ok} ok, ${failed} failed (of ${rows.length})`);
}

async function replayFromSnapshot(snapshot: Snapshot) {
  const t = snapshot.tables;
  console.log(
    `[seed] Replaying snapshot${snapshot.capturedAt ? ` captured at ${snapshot.capturedAt}` : ''}` +
      `${snapshot.schemaVersion ? ` (schema: ${snapshot.schemaVersion})` : ''}`,
  );

  await safeUpsertAll('User', t.User ?? [], (row: any) =>
    prisma.user.upsert({ where: { id: row.id }, update: row, create: row }),
  );

  await safeUpsertAll('UserWhitelist', t.UserWhitelist ?? [], (row: any) =>
    prisma.userWhitelist.upsert({ where: { id: row.id }, update: row, create: row }),
  );

  await safeUpsertAll('PendingAdmin', t.PendingAdmin ?? [], (row: any) =>
    prisma.pendingAdmin.upsert({ where: { id: row.id }, update: row, create: row }),
  );

  await safeUpsertAll('Class', t.Class ?? [], (row: any) =>
    prisma.class.upsert({ where: { id: row.id }, update: row, create: row }),
  );

  await safeUpsertAll('InstructorClass', t.InstructorClass ?? [], (row: any) =>
    prisma.instructorClass.upsert({ where: { id: row.id }, update: row, create: row }),
  );

  await safeUpsertAll('Enrollment', t.Enrollment ?? [], (row: any) =>
    prisma.enrollment.upsert({
      where: { classId_userId: { classId: row.classId, userId: row.userId } },
      update: row,
      create: row,
    }),
  );

  await safeUpsertAll('PendingEnrollment', t.PendingEnrollment ?? [], (row: any) =>
    prisma.pendingEnrollment.upsert({ where: { id: row.id }, update: row, create: row }),
  );

  await safeUpsertAll('FeatureFlag', t.FeatureFlag ?? [], (row: any) =>
    prisma.featureFlag.upsert({ where: { id: row.id }, update: row, create: row }),
  );

  await safeUpsertAll('ClassMaterial', t.ClassMaterial ?? [], (row: any) =>
    prisma.classMaterial.upsert({ where: { id: row.id }, update: row, create: row }),
  );

  await safeUpsertAll('Document', t.Document ?? [], (row: any) =>
    prisma.document.upsert({ where: { id: row.id }, update: row, create: row }),
  );

  await safeUpsertAll('DocumentComment', t.DocumentComment ?? [], (row: any) =>
    prisma.documentComment.upsert({ where: { id: row.id }, update: row, create: row }),
  );

  await safeUpsertAll('DocumentSummary', t.DocumentSummary ?? [], (row: any) =>
    prisma.documentSummary.upsert({ where: { id: row.id }, update: row, create: row }),
  );

  await replayEmbeddings(t.Embedding ?? []);

  await safeUpsertAll('LectureKeyword', t.LectureKeyword ?? [], (row: any) =>
    prisma.lectureKeyword.upsert({ where: { id: row.id }, update: row, create: row }),
  );
}

async function replayEmbeddings(rows: any[]) {
  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      // embedding is a pgvector string like "[0.1,0.2,...]"; chunk is JSONB
      await prisma.$executeRaw`
        INSERT INTO "Embedding" (id, "documentId", text, "documentPageNumber", chunk, embedding)
        VALUES (
          ${row.id},
          ${row.documentId},
          ${row.text},
          ${row.documentPageNumber},
          ${JSON.stringify(row.chunk)}::jsonb,
          ${row.embedding}::vector
        )
        ON CONFLICT (id) DO NOTHING
      `;
      ok++;
    } catch (err) {
      failed++;
      console.error(
        `[seed] Embedding insert failed for ${row.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  console.log(`[seed] Embedding: ${ok} ok, ${failed} failed (of ${rows.length})`);
}

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const INSTRUCTOR_EMAIL = 'instructor@example.com';
const STUDENT_EMAIL = 'student@example.com';
const SEED_CLASS_ID = 'seed-class-001';
const SEED_MATERIAL_ID = 'seed-material-001';

// Printed after the seed finishes so the credentials don't scroll away.
const adminBanner: string[] = [];

/** A readable one-time password, e.g. `tR7k-q2Vx-9xLm`. */
function generatePassword(): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return [0, 4, 8].map((i) => chars.slice(i, i + 4).join('')).join('-');
}

async function hashPassword(password: string) {
  const passwordSalt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, passwordSalt);
  return { passwordHash, passwordSalt };
}

/**
 * Creates the admin account with a password so a fresh install can log in
 * without Google. The password comes from SEED_ADMIN_PASSWORD, or is generated
 * and printed once. An existing admin's password is only changed when
 * SEED_ADMIN_PASSWORD is set, so re-running the seed never locks anyone out.
 */
async function seedAdmin() {
  const fromEnv = process.env.SEED_ADMIN_PASSWORD;
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  let shownPassword: string | null = null;
  let credentials: { passwordHash: string; passwordSalt: string } | undefined;
  if (fromEnv) {
    credentials = await hashPassword(fromEnv);
  } else if (!existing?.passwordHash) {
    shownPassword = generatePassword();
    credentials = await hashPassword(shownPassword);
  }

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { systemRole: 'admin', ...credentials },
    create: {
      email: ADMIN_EMAIL,
      oauthId: `seed-oauth-${ADMIN_EMAIL}`,
      oauth: false,
      systemRole: 'admin',
      ...credentials,
    },
  });

  const line = '-'.repeat(44);
  adminBanner.push(line, 'Admin login', `  email:    ${ADMIN_EMAIL}`);
  if (shownPassword) {
    adminBanner.push(
      `  password: ${shownPassword}   (shown once)`,
      'Set SEED_ADMIN_PASSWORD to choose it instead.',
    );
  } else if (fromEnv) {
    adminBanner.push('  password: from SEED_ADMIN_PASSWORD');
  } else {
    adminBanner.push(
      '  password: unchanged (already set)',
      'Set SEED_ADMIN_PASSWORD to reset it.',
    );
  }
  adminBanner.push(line);

  return admin;
}

async function runMinimalBaseline() {
  console.log('[seed] No prisma/seed-data.json found — applying minimal baseline.');

  const admin = await seedAdmin();

  const instructor = await prisma.user.upsert({
    where: { email: INSTRUCTOR_EMAIL },
    update: { systemRole: 'instructor' },
    create: {
      email: INSTRUCTOR_EMAIL,
      oauthId: `seed-oauth-${INSTRUCTOR_EMAIL}`,
      oauth: true,
      systemRole: 'instructor',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: STUDENT_EMAIL },
    update: { systemRole: 'user' },
    create: {
      email: STUDENT_EMAIL,
      oauthId: `seed-oauth-${STUDENT_EMAIL}`,
      oauth: true,
      systemRole: 'user',
    },
  });

  for (const email of [ADMIN_EMAIL, INSTRUCTOR_EMAIL, STUDENT_EMAIL]) {
    await prisma.userWhitelist.upsert({
      where: { email },
      update: { status: 'enabled' },
      create: { email, status: 'enabled' },
    });
  }

  await prisma.pendingAdmin.upsert({
    where: { email: ADMIN_EMAIL },
    update: { status: 'activated' },
    create: { email: ADMIN_EMAIL, status: 'activated' },
  });

  const seedClass = await prisma.class.upsert({
    where: { id: SEED_CLASS_ID },
    update: {},
    create: {
      id: SEED_CLASS_ID,
      classMetadata: { name: 'Seed Test Class', description: 'Created by prisma/seed.ts minimal baseline' },
      professorId: instructor.id,
    },
  });

  await prisma.instructorClass.upsert({
    where: { userId_classId: { userId: instructor.id, classId: seedClass.id } },
    update: { isActive: true },
    create: {
      userId: instructor.id,
      classId: seedClass.id,
      role: 'instructor',
      isActive: true,
    },
  });

  for (const [userId, role] of [
    [instructor.id, 'instructor'],
    [student.id, 'student'],
  ] as const) {
    await prisma.enrollment.upsert({
      where: { classId_userId: { classId: seedClass.id, userId } },
      update: { role },
      create: { classId: seedClass.id, userId, role },
    });
  }

  await prisma.classMaterial.upsert({
    where: { id: SEED_MATERIAL_ID },
    update: {},
    create: {
      id: SEED_MATERIAL_ID,
      classId: seedClass.id,
      materialType: 'text',
      materialMetadata: { name: 'Seed Material' },
      materialContent: 'Placeholder content created by prisma/seed.ts',
      status: 'processed',
    },
  });

  console.log('[seed] Minimal baseline applied.');
}

async function main() {
  try {
    const snapshot = loadSnapshot();
    if (snapshot) {
      await replayFromSnapshot(snapshot);
    } else {
      await runMinimalBaseline();
    }
    console.log('[seed] Done.');
    adminBanner.forEach((l) => console.log(`[seed] ${l}`));
  } catch (err) {
    console.error('[seed] Fatal error during seed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
