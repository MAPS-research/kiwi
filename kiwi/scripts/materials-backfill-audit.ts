/**
 * Review list for the materials-pipeline backfill (phase 1).
 *
 * The migration 20260903120000_add_material_roles_and_processing derives a
 * `role` for every document from the legacy `isStudent`/`isLlm` flags. Most rows
 * map cleanly. This script prints the ones that did not, so an instructor can
 * confirm them before the fail-closed reads go live — after that change, a
 * material with no STUDENT document disappears from the student list instead of
 * falling back to (and leaking) the answer key.
 *
 * Read-only. It never writes; every finding is something a human decides.
 *
 * Usage:
 *   nvm use && npx prisma generate          # the new columns must exist on the client
 *   npx ts-node scripts/materials-backfill-audit.ts
 *   npx ts-node scripts/materials-backfill-audit.ts --classId <uuid>
 *   npx ts-node scripts/materials-backfill-audit.ts --json > review.json
 */
import 'dotenv/config';
import { createPrismaClient } from '../src/common/database/prisma-client.factory';

const prisma = createPrismaClient();

const RECITATION = 'recitation';

type Finding = {
  kind:
    | 'student-copy-inferred'
    | 'multiple-student-flags'
    | 'multiple-answer-candidates'
    | 'recitation-without-answer'
    | 'material-without-documents'
    | 'processing-incomplete';
  classId: string;
  className: string;
  materialId: string;
  materialTitle: string;
  materialType: string;
  detail: string;
};

const HEADINGS: Record<Finding['kind'], string> = {
  'student-copy-inferred':
    'Student copy was guessed — no document carried isStudent',
  'multiple-student-flags':
    'More than one document claimed to be the student copy',
  'multiple-answer-candidates':
    'More than one answer-key candidate — the rest became REFERENCE',
  'recitation-without-answer':
    'Recitation with no answer key — the tutor has only the questions',
  'material-without-documents': 'Material with no documents at all',
  'processing-incomplete': 'Documents that never finished processing',
};

/** Order matters: the first kinds are the ones that can mis-show a document. */
const ORDER: Finding['kind'][] = [
  'student-copy-inferred',
  'multiple-student-flags',
  'multiple-answer-candidates',
  'recitation-without-answer',
  'processing-incomplete',
  'material-without-documents',
];

function parseArgs(): { classId?: string; json: boolean } {
  const args = process.argv.slice(2);
  let classId: string | undefined;
  let json = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--classId') classId = args[++i];
    else if (args[i] === '--json') json = true;
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(
        'Usage: materials-backfill-audit.ts [--classId <uuid>] [--json]',
      );
      process.exit(0);
    }
  }
  return { classId, json };
}

function classNameOf(metadata: unknown): string {
  if (metadata && typeof metadata === 'object' && 'className' in metadata) {
    const name = (metadata as { className?: unknown }).className;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return '(unnamed class)';
}

async function collect(classId?: string): Promise<Finding[]> {
  const materials = await prisma.classMaterial.findMany({
    where: {
      lifecycle: { not: 'ARCHIVED' },
      ...(classId ? { classId } : {}),
    },
    include: {
      class: { select: { classMetadata: true } },
      documents: {
        orderBy: { uploadedDate: 'asc' },
        select: {
          id: true,
          fileName: true,
          role: true,
          isStudent: true,
          isLlm: true,
          processingStatus: true,
          processingError: true,
        },
      },
    },
    orderBy: [{ classId: 'asc' }, { availableDate: 'asc' }],
  });

  const findings: Finding[] = [];

  for (const material of materials) {
    const base = {
      classId: material.classId,
      className: classNameOf(material.class.classMetadata),
      materialId: material.id,
      materialTitle:
        material.title?.trim() ||
        material.documents.find((d) => d.role === 'STUDENT')?.fileName ||
        material.documents[0]?.fileName ||
        '(untitled)',
      materialType: material.materialType,
    };

    if (material.documents.length === 0) {
      findings.push({
        ...base,
        kind: 'material-without-documents',
        detail: 'Nothing was ever uploaded — students see nothing.',
      });
      continue;
    }

    const flaggedStudent = material.documents.filter((d) => d.isStudent);
    const student = material.documents.find((d) => d.role === 'STUDENT');

    if (flaggedStudent.length === 0) {
      findings.push({
        ...base,
        kind: 'student-copy-inferred',
        detail:
          `Picked the earliest upload "${student?.fileName ?? '?'}". ` +
          `Confirm it is the version without answers — the other ` +
          `${material.documents.length - 1} document(s) stay hidden from students.`,
      });
    } else if (flaggedStudent.length > 1) {
      const demoted = flaggedStudent
        .filter((d) => d.role !== 'STUDENT')
        .map((d) => `"${d.fileName}"`)
        .join(', ');
      findings.push({
        ...base,
        kind: 'multiple-student-flags',
        detail:
          `Kept "${student?.fileName ?? '?'}" as the student copy; ` +
          `demoted ${demoted} to REFERENCE (hidden from students).`,
      });
    }

    if (material.materialType === RECITATION) {
      const llmCandidates = material.documents.filter(
        (d) => d.isLlm && d.role !== 'STUDENT',
      );
      const answer = material.documents.find((d) => d.role === 'ANSWER');

      if (llmCandidates.length > 1) {
        const demoted = llmCandidates
          .filter((d) => d.role !== 'ANSWER')
          .map((d) => `"${d.fileName}"`)
          .join(', ');
        findings.push({
          ...base,
          kind: 'multiple-answer-candidates',
          detail:
            `Kept the latest upload "${answer?.fileName ?? '?'}" as the ` +
            `answer key; ${demoted} became REFERENCE.`,
        });
      }

      if (!answer) {
        findings.push({
          ...base,
          kind: 'recitation-without-answer',
          detail:
            'No document was flagged isLlm, so the tutor will fall back to ' +
            'the student copy. Upload or mark the answer version.',
        });
      }
    }

    const unfinished = material.documents.filter(
      (d) => d.processingStatus !== 'READY',
    );
    if (unfinished.length > 0) {
      const detail = unfinished
        .map(
          (d) =>
            `"${d.fileName}" ${d.processingStatus}` +
            (d.processingError ? ` — ${d.processingError}` : ''),
        )
        .join('; ');
      findings.push({
        ...base,
        kind: 'processing-incomplete',
        detail,
      });
    }
  }

  return findings;
}

async function countStaffAnnotations(classId?: string) {
  const where = classId
    ? { document: { classMaterial: { classId } } }
    : ({} as const);
  const [comments, summaries] = await Promise.all([
    prisma.documentComment.count({
      where: { audience: 'STAFF', ...where },
    }),
    prisma.documentSummary.count({
      where: { audience: 'STAFF', ...where },
    }),
  ]);
  return { comments, summaries };
}

async function main() {
  const { classId, json } = parseArgs();
  const findings = await collect(classId);
  const staffAnnotations = await countStaffAnnotations(classId);

  if (json) {
    console.log(JSON.stringify({ findings, staffAnnotations }, null, 2));
    return;
  }

  if (findings.length === 0) {
    console.log('Nothing to review — every material backfilled cleanly.');
  }

  for (const kind of ORDER) {
    const group = findings.filter((f) => f.kind === kind);
    if (group.length === 0) continue;

    console.log(`\n${HEADINGS[kind]}  (${group.length})`);
    console.log('─'.repeat(72));

    let currentClass = '';
    for (const finding of group) {
      if (finding.className !== currentClass) {
        currentClass = finding.className;
        console.log(`\n  ${currentClass}`);
      }
      console.log(`    • ${finding.materialTitle}  [${finding.materialType}]`);
      console.log(`      ${finding.detail}`);
      console.log(`      material ${finding.materialId}`);
    }
  }

  const { comments, summaries } = staffAnnotations;
  if (comments + summaries > 0) {
    console.log(`\n${'─'.repeat(72)}`);
    console.log(
      `${comments} comment(s) and ${summaries} summary/summaries were hidden ` +
        `from students and are now STAFF — the model does not read them, ` +
        `same as before. Any that were meant as teaching notes for the tutor ` +
        `should be promoted to TUTOR.`,
    );
  }

  console.log(`\n${findings.length} finding(s) total.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
