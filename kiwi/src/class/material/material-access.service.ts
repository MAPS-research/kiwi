import { Injectable, Logger } from '@nestjs/common';
import { Document } from '@prisma/client';
import { DatabaseService } from 'src/common/database/database.service';

/** What the tutor may read alongside a page, once audience is applied. */
export interface TutorAnnotations {
  comments: { pageNumber: number; text: string }[];
  summaries: { content: string }[];
}

/**
 * The single answer to "which document is this for".
 *
 * Before this service the question had three different answers depending on
 * who asked: the class page took `find(isStudent) ?? documents[0]` (whose
 * fallback is the newest upload — the answer key); the legacy chat swapped in
 * whichever document was uploaded *first* and called it the answer; the agent
 * did not swap at all. Every read path now goes through here, so a change to
 * the rules is one edit rather than four.
 *
 * It depends on nothing but Prisma, deliberately — DocumentService and
 * MaterialService already depend on each other's modules, and putting these
 * lookups in either one closes that loop.
 */
@Injectable()
export class MaterialAccessService {
  private readonly logger = new Logger(MaterialAccessService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * The one copy students may see, or null when the material has none.
   *
   * Deliberately not gated on processingStatus: a document whose chunking
   * failed is still a perfectly readable PDF, and pulling the slides off the
   * class page because retrieval is degraded punishes students for an
   * ingestion bug. Retrieval gates on READY; display does not.
   */
  async getStudentDocument(materialId: string): Promise<Document | null> {
    return this.db.document.findFirst({
      where: { classMaterialId: materialId, role: 'STUDENT' },
    });
  }

  /**
   * The document the model should read for the pages the student is looking
   * at: the answer key when the material has a usable one, otherwise the very
   * document the student sees.
   *
   * An answer key that is not READY is skipped rather than returned — it has
   * no embeddings, so retrieving against it yields nothing at all, which is
   * strictly worse than grounding on the questions.
   */
  async resolveLlmCounterpart(documentId: string): Promise<string> {
    const document = await this.db.document.findUnique({
      where: { id: documentId },
      select: { classMaterialId: true },
    });

    if (!document?.classMaterialId) return documentId;

    const answer = await this.db.document.findFirst({
      where: {
        classMaterialId: document.classMaterialId,
        role: 'ANSWER',
        retrievalEnabled: true,
        processingStatus: 'READY',
      },
      select: { id: true },
    });

    return answer?.id ?? documentId;
  }

  /**
   * Every document the tutor may retrieve from for one material: the answer
   * key if there is a usable one, otherwise the student copy, plus any
   * reference material.
   *
   * The old version of this walked a three-step fallback ending in "the latest
   * upload", which on a material whose flags were never set is the answer key
   * — the same failure the class page had, reached from the other side.
   */
  async getLlmDocumentIds(materialId: string): Promise<string[]> {
    const documents = await this.db.document.findMany({
      where: {
        classMaterialId: materialId,
        retrievalEnabled: true,
        processingStatus: 'READY',
      },
      select: { id: true, role: true },
    });

    const answer = documents.find((d) => d.role === 'ANSWER');
    const student = documents.find((d) => d.role === 'STUDENT');
    const primary = answer ?? student;

    return [
      ...(primary ? [primary.id] : []),
      ...documents.filter((d) => d.role === 'REFERENCE').map((d) => d.id),
    ];
  }

  /**
   * Map any document id to the one students may open, for citations. Returns
   * null when the material has no student copy — the caller must then drop the
   * citation rather than hand out an id that resolves to an answer key.
   */
  async toStudentVisibleDocumentId(documentId: string): Promise<string | null> {
    const [mapped] = (await this.mapToStudentVisibleIds([documentId])).values();
    return mapped ?? null;
  }

  /** Batch form of {@link toStudentVisibleDocumentId} — citation lists are loops. */
  async mapToStudentVisibleIds(
    documentIds: string[],
  ): Promise<Map<string, string | null>> {
    const unique = [...new Set(documentIds)];
    const result = new Map<string, string | null>();
    if (unique.length === 0) return result;

    const documents = await this.db.document.findMany({
      where: { id: { in: unique } },
      select: { id: true, role: true, classMaterialId: true },
    });

    const materialIds = [
      ...new Set(
        documents
          .filter((d) => d.role !== 'STUDENT' && d.classMaterialId)
          .map((d) => d.classMaterialId as string),
      ),
    ];

    const studentDocuments = materialIds.length
      ? await this.db.document.findMany({
          where: { classMaterialId: { in: materialIds }, role: 'STUDENT' },
          select: { id: true, classMaterialId: true },
        })
      : [];

    const studentByMaterial = new Map(
      studentDocuments.map((d) => [d.classMaterialId as string, d.id]),
    );

    for (const id of unique) {
      const document = documents.find((d) => d.id === id);
      if (!document) {
        result.set(id, null);
      } else if (document.role === 'STUDENT') {
        result.set(id, document.id);
      } else if (!document.classMaterialId) {
        result.set(id, null);
      } else {
        result.set(id, studentByMaterial.get(document.classMaterialId) ?? null);
      }
    }

    return result;
  }

  /**
   * Everything course-wide retrieval may search: published, released, enabled
   * and actually embedded. Archived materials and documents whose pipeline
   * never finished contribute nothing but noise.
   */
  async listRetrievableDocumentIds(classId: string): Promise<string[]> {
    const documents = await this.db.document.findMany({
      where: {
        retrievalEnabled: true,
        processingStatus: 'READY',
        classMaterial: {
          classId,
          lifecycle: { not: 'ARCHIVED' },
          availableDate: { lte: new Date() },
        },
      },
      select: { id: true },
    });

    return documents.map((d) => d.id);
  }

  /**
   * Instructor notes the tutor may use for a document's material.
   *
   * Collected across every document in the material, not just the one passed
   * in. Instructors annotate the copy they are looking at — normally the
   * student one — while the model reads the answer key, so a per-document
   * lookup would return nothing for exactly the materials that have the most
   * teaching notes on them. The answer version is the same pages with answers
   * added, so page numbers line up across the two.
   *
   * STAFF stays out: those notes were written expecting no reader.
   */
  async getAnnotationsForTutor(documentId: string): Promise<TutorAnnotations> {
    const documentIds = await this.siblingDocumentIds(documentId);

    const [comments, summaries] = await Promise.all([
      this.db.documentComment.findMany({
        where: {
          documentId: { in: documentIds },
          audience: { in: ['STUDENT', 'TUTOR'] },
        },
        orderBy: [{ pageNumber: 'asc' }, { createdAt: 'asc' }],
        select: { pageNumber: true, text: true },
      }),
      this.db.documentSummary.findMany({
        where: {
          documentId: { in: documentIds },
          audience: { in: ['STUDENT', 'TUTOR'] },
        },
        orderBy: { summaryNumber: 'asc' },
        select: { content: true },
      }),
    ]);

    return { comments, summaries };
  }

  /**
   * Render annotations as a prompt block. Lives here so the legacy chat and
   * the agent phrase them identically — they used to differ by one path having
   * them and the other not having them at all.
   */
  renderAnnotationBlock(annotations: TutorAnnotations): string {
    const parts: string[] = [];

    if (annotations.summaries.length > 0) {
      const summaries = annotations.summaries
        .map((s, index) => `Summary ${index + 1}: ${s.content}`)
        .join('\n\n');
      parts.push(`\n\nDocument Summaries:\n${summaries}`);
    }

    if (annotations.comments.length > 0) {
      const byPage = new Map<number, string[]>();
      for (const comment of annotations.comments) {
        const page = byPage.get(comment.pageNumber) ?? [];
        page.push(comment.text);
        byPage.set(comment.pageNumber, page);
      }
      const rendered = [...byPage.entries()]
        .map(([page, texts]) => `Page ${page}: ${texts.join('; ')}`)
        .join('\n');
      parts.push(`\n\nInstructor Comments:\n${rendered}`);
    }

    return parts.join('');
  }

  /** Every document in the same material, including the one asked about. */
  private async siblingDocumentIds(documentId: string): Promise<string[]> {
    const document = await this.db.document.findUnique({
      where: { id: documentId },
      select: { classMaterialId: true },
    });

    if (!document?.classMaterialId) return [documentId];

    const siblings = await this.db.document.findMany({
      where: { classMaterialId: document.classMaterialId },
      select: { id: true },
    });

    return siblings.map((d) => d.id);
  }
}
