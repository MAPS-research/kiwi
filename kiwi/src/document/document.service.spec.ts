import { Test } from '@nestjs/testing';
import { DocumentService } from './document.service';

// deps used by DocumentService's constructor — mocked
import { DatabaseService } from 'src/common/database/database.service';
import { DocumentService as DatabaseDocumentService } from 'src/common/database/document.service';
import { EmbeddingService } from 'src/common/database/embedding.service';
import { UnstructuredService } from 'src/common/unstructured/unstructured.service';
import { LlmService } from 'src/common/llm/llm.service';
import { ClassMaterialService } from 'src/common/database/class-material.service';
import { StorageService } from 'src/common/storage/storage.service';
import { DocumentCommentService } from 'src/common/database/document-comment.service';
import { InstructorClassService } from 'src/instructor-class/instructor-class.service';

import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';

// ---- Plain Jest-mock DB (no Prisma types on purpose) ----
function mkDbMock(): any {
  const document = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  };
  const enrollment = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  };
  const user = {
    findUnique: jest.fn(),
  };
  const db = {
    document,
    enrollment,
    user,
    $transaction: jest.fn(async (cb: any) => cb({ document })),
  };
  return db;
}

const mkQueueMock = () => ({
  add: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
});

describe('DocumentService (unit)', () => {
  let service: DocumentService;
  let db: any; // intentionally 'any' so jest.fn helpers type-check
  let documentDbMock: any;
  let documentCommentServiceMock: any;
  let instructorClassServiceMock: any;

  beforeEach(async () => {
    db = mkDbMock();
    documentDbMock = {
      createDocument: jest.fn(),
      documentWithClassMaterial: jest.fn(),
      document: jest.fn(),
    };
    documentCommentServiceMock = {
      createDocumentComment: jest.fn(),
      documentComments: jest.fn(),
      findUnique: jest.fn(),
      updateDocumentComment: jest.fn(),
      deleteDocumentComment: jest.fn(),
    };
    instructorClassServiceMock = {
      checkInstructorPermission: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: DatabaseService, useValue: db },

        // minimal mocks for other ctor deps
        {
          provide: DatabaseDocumentService,
          useValue: { createDocument: jest.fn() },
        },
        { provide: EmbeddingService, useValue: {} },
        { provide: UnstructuredService, useValue: {} },
        { provide: LlmService, useValue: {} },
        { provide: ClassMaterialService, useValue: {} },
        {
          provide: StorageService,
          useValue: { uploadFile: jest.fn(), getSignedUrl: jest.fn() },
        },

        { provide: getQueueToken('document'), useValue: mkQueueMock() },
      ],
    }).compile();

    service = moduleRef.get(DocumentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.values(documentDbMock).forEach((mockFn: any) => mockFn.mockReset());
    Object.values(documentCommentServiceMock).forEach((mockFn: any) =>
      mockFn.mockReset(),
    );
    Object.values(instructorClassServiceMock).forEach((mockFn: any) =>
      mockFn.mockReset(),
    );
  });

  // ------------------------------
  // Test Feature 1: upload defaults
  // ------------------------------

  it('applyUploadRoleDefaults: first doc -> sets isStudent=true and isLlm=true', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      isStudent: false,
      isLlm: false,
    });
    db.document.count.mockResolvedValueOnce(1);

    await (service as any).applyUploadRoleDefaults('mat1', 'doc1');

    expect(db.$transaction).toHaveBeenCalled();
    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'doc1' },
      data: { isStudent: true, isLlm: true },
    });
  });

  it('applyUploadRoleDefaults: second doc -> sets isLlm=true only', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      isStudent: false,
      isLlm: false,
    });
    db.document.count.mockResolvedValueOnce(2);

    await (service as any).applyUploadRoleDefaults('mat1', 'doc2');

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'doc2' },
      data: { isLlm: true },
    });
  });

  it('applyUploadRoleDefaults: no-op if flags already set on new doc', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      isStudent: true,
      isLlm: false,
    });

    await (service as any).applyUploadRoleDefaults('mat1', 'docX');

    expect(db.document.count).not.toHaveBeenCalled();
    expect(db.document.update).not.toHaveBeenCalled();
  });

  it('applyUploadRoleDefaults: early return when materialId missing', async () => {
    await (service as any).applyUploadRoleDefaults(null, 'docX');
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  // ------------------------------
  // Test feature 2: setFlags (PATCH)
  // ------------------------------

  it('setFlags: isStudent=true clears previous and sets this doc', async () => {
    db.document.findUnique
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: false,
        isLlm: false,
      }) // pre
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: true,
        isLlm: false,
      }); // post

    const res = await service.setFlags('docA', {
      materialId: 'mat1',
      isStudent: true,
    });

    expect(db.document.updateMany).toHaveBeenCalledWith({
      where: { classMaterialId: 'mat1', isStudent: true },
      data: { isStudent: false },
    });
    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'docA' },
      data: { isStudent: true },
    });
    expect(res).toEqual({
      id: 'docA',
      classMaterialId: 'mat1',
      isStudent: true,
      isLlm: false,
    });
  });

  it('setFlags: isStudent=false clears only this doc', async () => {
    db.document.findUnique
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: true,
        isLlm: false,
      })
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: false,
        isLlm: false,
      });

    const res = await service.setFlags('docA', {
      materialId: 'mat1',
      isStudent: false,
    });

    expect(db.document.updateMany).not.toHaveBeenCalled();
    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'docA' },
      data: { isStudent: false },
    });
    expect(res?.isStudent).toBe(false);
  });

  it('setFlags: isLlm=true sets flag', async () => {
    db.document.findUnique
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: false,
        isLlm: false,
      })
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: false,
        isLlm: true,
      });

    const res = await service.setFlags('docA', {
      materialId: 'mat1',
      isLlm: true,
    });

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'docA' },
      data: { isLlm: true },
    });
    expect(res?.isLlm).toBe(true);
  });

  it('setFlags: isLlm=false clears flag', async () => {
    db.document.findUnique
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: true,
        isLlm: true,
      })
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: true,
        isLlm: false,
      });

    const res = await service.setFlags('docA', {
      materialId: 'mat1',
      isLlm: false,
    });

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'docA' },
      data: { isLlm: false },
    });
    expect(res?.isLlm).toBe(false);
  });

  it('setFlags: throws NotFound when doc missing', async () => {
    db.document.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.setFlags('missing', { materialId: 'mat1', isLlm: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('setFlags: throws BadRequest when materialId mismatches', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      id: 'docA',
      classMaterialId: 'mat1',
      isStudent: false,
      isLlm: false,
    });

    await expect(
      service.setFlags('docA', { materialId: 'otherMat', isStudent: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolveLlmDocIdsForMaterial returns all LLM doc ids', async () => {
    db.document.findMany.mockResolvedValueOnce([{ id: 'A' }, { id: 'B' }]);
    const res = await (service as any).resolveLlmDocIdsForMaterial('mat1');
    expect(res).toEqual(['A', 'B']);
  });

  it('resolveLlmDocIdsForMaterial falls back to student doc', async () => {
    db.document.findMany.mockResolvedValueOnce([]); // no LLM
    db.document.findFirst.mockResolvedValueOnce({ id: 'S' }); // student
    const res = await (service as any).resolveLlmDocIdsForMaterial('mat1');
    expect(res).toEqual(['S']);
  });

  it('resolveLlmDocIdsForMaterial falls back to latest doc', async () => {
    db.document.findMany.mockResolvedValueOnce([]); // no LLM
    db.document.findFirst
      .mockResolvedValueOnce(null) // no student
      .mockResolvedValueOnce({ id: 'L' }); // latest
    const res = await (service as any).resolveLlmDocIdsForMaterial('mat1');
    expect(res).toEqual(['L']);
  });

  describe('document comments', () => {
    const documentRecord = {
      id: 'doc-1',
      classMaterialId: 'mat-1',
      classMaterial: { id: 'mat-1', classId: 'class-1' },
    };

    beforeEach(() => {
      documentDbMock.documentWithClassMaterial.mockResolvedValue(documentRecord);
    });

    it('listVisibleDocumentCommentsForStudent returns only visible comments', async () => {
      db.enrollment.findFirst.mockResolvedValue({ id: 'enroll-1' });

      const now = new Date();
      documentCommentServiceMock.documentComments.mockResolvedValue([
        {
          id: 'comment-1',
          documentId: 'doc-1',
          pageNumber: 1,
          text: 'Visible note',
          isVisible: true,
          authorId: 'teacher-1',
          createdAt: now,
          updatedAt: now,
          author: {
            id: 'teacher-1',
            email: 'ada@example.com',
            stringTag: 'Ada Lovelace',
          },
        },
      ]);

      const result = await service.listVisibleDocumentCommentsForStudent(
        'doc-1',
        'student-1',
      );

      expect(documentCommentServiceMock.documentComments).toHaveBeenCalledWith({
        where: { documentId: 'doc-1', isVisible: true },
        orderBy: { createdAt: 'asc' },
        include: { author: true },
      });
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0]).toMatchObject({
        id: 'comment-1',
        documentId: 'doc-1',
        isVisibleToStudents: true,
        authorId: 'teacher-1',
        author: { name: 'Ada Lovelace', email: 'ada@example.com' },
      });
    });

    it('listVisibleDocumentCommentsForStudent throws when student not enrolled', async () => {
      db.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.listVisibleDocumentCommentsForStudent('doc-1', 'student-1'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
