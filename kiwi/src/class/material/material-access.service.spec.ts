import { Test } from '@nestjs/testing';
import { DatabaseService } from 'src/common/database/database.service';
import { MaterialAccessService } from './material-access.service';

function mkDb(): any {
  return {
    document: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    documentComment: { findMany: jest.fn() },
    documentSummary: { findMany: jest.fn() },
  };
}

describe('MaterialAccessService', () => {
  let service: MaterialAccessService;
  let db: any;

  beforeEach(async () => {
    db = mkDb();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MaterialAccessService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = moduleRef.get(MaterialAccessService);
  });

  describe('resolveLlmCounterpart', () => {
    it('swaps in the answer key when the material has a usable one', async () => {
      db.document.findUnique.mockResolvedValueOnce({ classMaterialId: 'mat1' });
      db.document.findFirst.mockResolvedValueOnce({ id: 'answer' });

      await expect(service.resolveLlmCounterpart('student')).resolves.toBe(
        'answer',
      );
      expect(db.document.findFirst).toHaveBeenCalledWith({
        where: {
          classMaterialId: 'mat1',
          role: 'ANSWER',
          retrievalEnabled: true,
          processingStatus: 'READY',
        },
        select: { id: true },
      });
    });

    it('keeps the student copy when there is no usable answer key', async () => {
      db.document.findUnique.mockResolvedValueOnce({ classMaterialId: 'mat1' });
      db.document.findFirst.mockResolvedValueOnce(null);

      await expect(service.resolveLlmCounterpart('student')).resolves.toBe(
        'student',
      );
    });

    it('keeps the id when the document belongs to no material', async () => {
      db.document.findUnique.mockResolvedValueOnce({ classMaterialId: null });

      await expect(service.resolveLlmCounterpart('orphan')).resolves.toBe(
        'orphan',
      );
      expect(db.document.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('mapToStudentVisibleIds', () => {
    it('rewrites an answer-key hit to the student copy', async () => {
      db.document.findMany
        .mockResolvedValueOnce([
          { id: 'answer', role: 'ANSWER', classMaterialId: 'mat1' },
        ])
        .mockResolvedValueOnce([{ id: 'student', classMaterialId: 'mat1' }]);

      const map = await service.mapToStudentVisibleIds(['answer']);

      expect(map.get('answer')).toBe('student');
    });

    it('returns null when the material has no student copy, so the citation is dropped', async () => {
      db.document.findMany
        .mockResolvedValueOnce([
          { id: 'reference', role: 'REFERENCE', classMaterialId: 'mat1' },
        ])
        .mockResolvedValueOnce([]);

      const map = await service.mapToStudentVisibleIds(['reference']);

      expect(map.get('reference')).toBeNull();
    });

    it('passes a student copy straight through without a second query', async () => {
      db.document.findMany.mockResolvedValueOnce([
        { id: 'student', role: 'STUDENT', classMaterialId: 'mat1' },
      ]);

      const map = await service.mapToStudentVisibleIds(['student', 'student']);

      expect(map.get('student')).toBe('student');
      expect(db.document.findMany).toHaveBeenCalledTimes(1);
    });

    it('maps an unknown id to null rather than echoing it back', async () => {
      db.document.findMany.mockResolvedValueOnce([]);

      const map = await service.mapToStudentVisibleIds(['ghost']);

      expect(map.get('ghost')).toBeNull();
    });
  });

  describe('getLlmDocumentIds', () => {
    it('prefers the answer key and keeps reference material', async () => {
      db.document.findMany.mockResolvedValueOnce([
        { id: 'student', role: 'STUDENT' },
        { id: 'answer', role: 'ANSWER' },
        { id: 'ref', role: 'REFERENCE' },
      ]);

      await expect(service.getLlmDocumentIds('mat1')).resolves.toEqual([
        'answer',
        'ref',
      ]);
    });

    it('falls back to the student copy when there is no answer key', async () => {
      db.document.findMany.mockResolvedValueOnce([
        { id: 'student', role: 'STUDENT' },
      ]);

      await expect(service.getLlmDocumentIds('mat1')).resolves.toEqual([
        'student',
      ]);
    });

    it('returns nothing when the material has no usable document', async () => {
      db.document.findMany.mockResolvedValueOnce([]);

      await expect(service.getLlmDocumentIds('mat1')).resolves.toEqual([]);
    });
  });

  describe('getAnnotationsForTutor', () => {
    it('reads across every document in the material, excluding STAFF notes', async () => {
      db.document.findUnique.mockResolvedValueOnce({ classMaterialId: 'mat1' });
      db.document.findMany.mockResolvedValueOnce([
        { id: 'student' },
        { id: 'answer' },
      ]);
      db.documentComment.findMany.mockResolvedValueOnce([]);
      db.documentSummary.findMany.mockResolvedValueOnce([]);

      await service.getAnnotationsForTutor('answer');

      expect(db.documentComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            documentId: { in: ['student', 'answer'] },
            audience: { in: ['STUDENT', 'TUTOR'] },
          },
        }),
      );
    });
  });

  describe('renderAnnotationBlock', () => {
    it('groups comments by page and numbers summaries', () => {
      const block = service.renderAnnotationBlock({
        comments: [
          { pageNumber: 2, text: 'Sign convention differs from the textbook' },
          { pageNumber: 2, text: 'Do not give the answer away' },
          { pageNumber: 5, text: 'Common mistake here' },
        ],
        summaries: [{ content: 'Covers free-body diagrams' }],
      });

      expect(block).toContain('Summary 1: Covers free-body diagrams');
      expect(block).toContain(
        'Page 2: Sign convention differs from the textbook; Do not give the answer away',
      );
      expect(block).toContain('Page 5: Common mistake here');
    });

    it('is empty when there is nothing to say', () => {
      expect(
        service.renderAnnotationBlock({ comments: [], summaries: [] }),
      ).toBe('');
    });
  });
});
