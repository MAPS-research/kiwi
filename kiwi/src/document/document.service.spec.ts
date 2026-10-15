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
import { MaterialPermissionService } from 'src/class/material/material-permission.service';
import { DocumentSummaryService } from 'src/common/database/document-summary.service';
import { MaterialAccessService } from 'src/class/material/material-access.service';
import { ConfigService } from '@nestjs/config';

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
  const classMaterial = {
    findUnique: jest.fn(),
  };
  const embeddingModel = {
    findMany: jest.fn(),
    update: jest.fn(),
  };
  const db = {
    document,
    enrollment,
    user,
    classMaterial,
    embeddingModel,
    $transaction: jest.fn(async (cb: any) => cb({ document, classMaterial })),
  };
  return db;
}

const mkQueueMock = () => ({
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  pause: jest.fn(),
  resume: jest.fn(),
});

describe('DocumentService (unit)', () => {
  let service: DocumentService;
  let db: any; // intentionally 'any' so jest.fn helpers type-check
  let documentDbMock: any;
  let documentCommentServiceMock: any;
  let materialPermissionServiceMock: any;
  let documentSummaryServiceMock: any;
  let materialAccessServiceMock: any;
  let queueMock: any;
  let storageServiceMock: any;
  let llmServiceMock: any;

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
    materialPermissionServiceMock = {
      // Staff by default; the tests that care about refusal override it.
      canManageClass: jest.fn().mockResolvedValue(true),
      canReadDocument: jest.fn().mockResolvedValue(true),
      isEnrolled: jest.fn().mockResolvedValue(true),
      classIdForMaterial: jest.fn(),
      classIdForDocument: jest.fn(),
    };
    documentSummaryServiceMock = {
      createDocumentSummary: jest.fn(),
      documentSummaries: jest.fn(),
      findUnique: jest.fn(),
      updateDocumentSummary: jest.fn(),
      deleteDocumentSummary: jest.fn(),
    };
    materialAccessServiceMock = {
      getLlmDocumentIds: jest.fn(),
    };
    queueMock = mkQueueMock();
    llmServiceMock = {
      isEngineEnabled: jest.fn().mockReturnValue(true),
      resolveDimensions: jest.fn(),
    };
    storageServiceMock = {
      uploadFile: jest.fn(),
      getSignedUrl: jest.fn(),
      generateSignedUrl: jest.fn(),
      deleteFile: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: DatabaseService, useValue: db },

        // minimal mocks for other ctor deps
        { provide: DatabaseDocumentService, useValue: documentDbMock },
        { provide: EmbeddingService, useValue: {} },
        { provide: UnstructuredService, useValue: {} },
        { provide: LlmService, useValue: llmServiceMock },
        { provide: ClassMaterialService, useValue: {} },
        { provide: StorageService, useValue: storageServiceMock },

        // These three were mocked below but never registered, so every test in
        // this file failed to construct the service.
        {
          provide: DocumentCommentService,
          useValue: documentCommentServiceMock,
        },
        {
          provide: DocumentSummaryService,
          useValue: documentSummaryServiceMock,
        },
        {
          provide: MaterialPermissionService,
          useValue: materialPermissionServiceMock,
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: MaterialAccessService, useValue: materialAccessServiceMock },

        { provide: getQueueToken('document'), useValue: queueMock },
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
    Object.values(materialPermissionServiceMock).forEach((mockFn: any) =>
      mockFn.mockReset(),
    );
  });

  // ------------------------------
  // Test Feature 1: upload defaults
  // ------------------------------

  it('applyUploadRoleDefaults: first doc -> student copy', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      isStudent: false,
      isLlm: false,
      role: 'REFERENCE',
    });
    db.document.count.mockResolvedValueOnce(1);

    await (service as any).applyUploadRoleDefaults('mat1', 'doc1');

    expect(db.$transaction).toHaveBeenCalled();
    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'doc1' },
      data: { role: 'STUDENT', isStudent: true, isLlm: true },
    });
  });

  it('applyUploadRoleDefaults: second doc on a recitation -> answer key', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      isStudent: false,
      isLlm: false,
      role: 'REFERENCE',
    });
    db.document.count
      .mockResolvedValueOnce(2) // documents in the material
      .mockResolvedValueOnce(0); // no answer key yet
    db.classMaterial.findUnique.mockResolvedValueOnce({
      materialType: 'recitation',
    });

    await (service as any).applyUploadRoleDefaults('mat1', 'doc2');

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'doc2' },
      data: { role: 'ANSWER', isLlm: true },
    });
  });

  it('applyUploadRoleDefaults: second doc on a lecture -> reference, never an answer key', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      isStudent: false,
      isLlm: false,
      role: 'REFERENCE',
    });
    db.document.count.mockResolvedValueOnce(2);
    db.classMaterial.findUnique.mockResolvedValueOnce({
      materialType: 'class materials',
    });

    await (service as any).applyUploadRoleDefaults('mat1', 'doc2');

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'doc2' },
      data: { role: 'REFERENCE', isLlm: true },
    });
  });

  it('applyUploadRoleDefaults: second doc when the answer slot is taken -> reference', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      isStudent: false,
      isLlm: false,
      role: 'REFERENCE',
    });
    db.document.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1); // an answer key already exists
    db.classMaterial.findUnique.mockResolvedValueOnce({
      materialType: 'recitation',
    });

    await (service as any).applyUploadRoleDefaults('mat1', 'doc2');

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'doc2' },
      data: { role: 'REFERENCE', isLlm: true },
    });
  });

  it('applyUploadRoleDefaults: no-op if flags already set on new doc', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      isStudent: true,
      isLlm: false,
      role: 'REFERENCE',
    });

    await (service as any).applyUploadRoleDefaults('mat1', 'docX');

    expect(db.document.count).not.toHaveBeenCalled();
    expect(db.document.update).not.toHaveBeenCalled();
  });

  it('applyUploadRoleDefaults: no-op if the caller already chose a role', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      isStudent: false,
      isLlm: false,
      role: 'ANSWER',
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
  // Test feature 2: setFlags (PATCH) — flags are a projection of `role`
  // ------------------------------

  it('setFlags: isStudent=true demotes the previous student copy', async () => {
    db.document.findUnique
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: false,
        isLlm: false,
        role: 'REFERENCE',
      }) // pre
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: true,
        isLlm: false,
        role: 'STUDENT',
      }); // post
    db.classMaterial.findUnique.mockResolvedValueOnce({
      materialType: 'recitation',
    });

    const res = await service.setFlags('docA', {
      materialId: 'mat1',
      isStudent: true,
    });

    expect(db.document.updateMany).toHaveBeenCalledWith({
      where: { classMaterialId: 'mat1', role: 'STUDENT', id: { not: 'docA' } },
      data: { role: 'REFERENCE', isStudent: false },
    });
    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'docA' },
      data: { role: 'STUDENT', isStudent: true, isLlm: false },
    });
    expect(res?.role).toBe('STUDENT');
  });

  it('setFlags: isStudent=false with no llm flag falls back to reference', async () => {
    db.document.findUnique
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: true,
        isLlm: false,
        role: 'STUDENT',
      })
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: false,
        isLlm: false,
        role: 'REFERENCE',
      });
    db.classMaterial.findUnique.mockResolvedValueOnce({
      materialType: 'recitation',
    });

    const res = await service.setFlags('docA', {
      materialId: 'mat1',
      isStudent: false,
    });

    expect(db.document.updateMany).not.toHaveBeenCalled();
    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'docA' },
      data: { role: 'REFERENCE', isStudent: false, isLlm: false },
    });
    expect(res?.isStudent).toBe(false);
  });

  it('setFlags: isLlm=true on a recitation makes it the answer key', async () => {
    db.document.findUnique
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: false,
        isLlm: false,
        role: 'REFERENCE',
      })
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: false,
        isLlm: true,
        role: 'ANSWER',
      });
    db.classMaterial.findUnique.mockResolvedValueOnce({
      materialType: 'recitation',
    });

    const res = await service.setFlags('docA', {
      materialId: 'mat1',
      isLlm: true,
    });

    expect(db.document.updateMany).toHaveBeenCalledWith({
      where: { classMaterialId: 'mat1', role: 'ANSWER', id: { not: 'docA' } },
      data: { role: 'REFERENCE' },
    });
    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'docA' },
      data: { role: 'ANSWER', isStudent: false, isLlm: true },
    });
    expect(res?.role).toBe('ANSWER');
  });

  it('setFlags: isLlm=true on a lecture stays reference — lectures have no answer key', async () => {
    db.document.findUnique
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: false,
        isLlm: false,
        role: 'REFERENCE',
      })
      .mockResolvedValueOnce({
        id: 'docA',
        classMaterialId: 'mat1',
        isStudent: false,
        isLlm: true,
        role: 'REFERENCE',
      });
    db.classMaterial.findUnique.mockResolvedValueOnce({
      materialType: 'class materials',
    });

    await service.setFlags('docA', { materialId: 'mat1', isLlm: true });

    expect(db.document.updateMany).not.toHaveBeenCalled();
    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'docA' },
      data: { role: 'REFERENCE', isStudent: false, isLlm: true },
    });
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
      role: 'REFERENCE',
    });

    await expect(
      service.setFlags('docA', { materialId: 'otherMat', isStudent: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolveLlmDocIdsForMaterial defers to MaterialAccessService', async () => {
    materialAccessServiceMock.getLlmDocumentIds.mockResolvedValueOnce([
      'answer',
      'reference',
    ]);

    const res = await (service as any).resolveLlmDocIdsForMaterial('mat1');

    expect(materialAccessServiceMock.getLlmDocumentIds).toHaveBeenCalledWith(
      'mat1',
    );
    expect(res).toEqual(['answer', 'reference']);
  });

  // ------------------------------
  // Test feature 3: roles and the queued pipeline
  // ------------------------------

  it('setDocumentRole refuses an answer key on a lecture', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      id: 'docA',
      classMaterialId: 'mat1',
    });
    db.classMaterial.findUnique.mockResolvedValueOnce({
      materialType: 'class materials',
    });

    await expect(
      service.setDocumentRole('docA', 'ANSWER'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.document.update).not.toHaveBeenCalled();
  });

  it('setDocumentRole frees the student slot before claiming it', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      id: 'docA',
      classMaterialId: 'mat1',
    });
    db.classMaterial.findUnique.mockResolvedValueOnce({
      materialType: 'recitation',
    });

    await service.setDocumentRole('docA', 'STUDENT');

    expect(db.document.updateMany).toHaveBeenCalledWith({
      where: { classMaterialId: 'mat1', role: 'STUDENT', id: { not: 'docA' } },
      data: { role: 'REFERENCE', isStudent: false },
    });
    expect(db.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'docA' },
        data: { role: 'STUDENT', isStudent: true, isLlm: true },
      }),
    );
  });

  it('setDocumentRole rejects a document with no material', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      id: 'docA',
      classMaterialId: null,
    });

    await expect(
      service.setDocumentRole('docA', 'REFERENCE'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reprocessDocument clears a stuck PROCESSING state before re-queueing', async () => {
    db.document.findUnique.mockResolvedValueOnce({ id: 'docA' });

    await service.reprocessDocument('docA');

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id: 'docA' },
      data: {
        processingStatus: 'PENDING',
        processingStage: null,
        processingError: null,
      },
    });
    expect(queueMock.add).toHaveBeenCalledWith(
      'processDocument',
      { documentId: 'docA' },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('reprocessDocument throws NotFound for an unknown document', async () => {
    db.document.findUnique.mockResolvedValueOnce(null);

    await expect(service.reprocessDocument('ghost')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('replaceDocumentFile keeps the row so annotations and citations survive', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      id: 'docA',
      fileUrl: 'old/key',
      classMaterialId: 'mat1',
    });
    storageServiceMock.uploadFile.mockResolvedValueOnce({ key: 'new/key' });

    const result = await service.replaceDocumentFile('docA', {
      originalname: 'lecture-v2.pdf',
    } as any);

    expect(db.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'docA' },
        data: expect.objectContaining({
          fileName: 'lecture-v2.pdf',
          fileUrl: 'new/key',
          processingStatus: 'PENDING',
          processedAt: null,
        }),
      }),
    );
    // The old object goes only after the row points at the new one.
    expect(storageServiceMock.deleteFile).toHaveBeenCalledWith('old/key');
    expect(queueMock.add).toHaveBeenCalledWith(
      'processDocument',
      { documentId: 'docA' },
      expect.objectContaining({ attempts: 3 }),
    );
    expect(result.processingStatus).toBe('PENDING');
  });

  it('replaceDocumentFile survives a storage delete that fails', async () => {
    db.document.findUnique.mockResolvedValueOnce({
      id: 'docA',
      fileUrl: 'old/key',
      classMaterialId: 'mat1',
    });
    storageServiceMock.uploadFile.mockResolvedValueOnce({ key: 'new/key' });
    storageServiceMock.deleteFile.mockRejectedValueOnce(new Error('nope'));

    await expect(
      service.replaceDocumentFile('docA', { originalname: 'v2.pdf' } as any),
    ).resolves.toMatchObject({ documentId: 'docA' });
  });

  it('replaceDocumentFile throws NotFound for an unknown document', async () => {
    db.document.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.replaceDocumentFile('ghost', { originalname: 'x.pdf' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('document comments', () => {
    const documentRecord = {
      id: 'doc-1',
      classMaterialId: 'mat-1',
      classMaterial: { id: 'mat-1', classId: 'class-1' },
    };

    beforeEach(() => {
      documentDbMock.documentWithClassMaterial.mockResolvedValue(
        documentRecord,
      );
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
          audience: 'STUDENT',
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
        where: { documentId: 'doc-1', audience: 'STUDENT' },
        orderBy: { createdAt: 'asc' },
        include: { author: true },
      });
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0]).toMatchObject({
        id: 'comment-1',
        documentId: 'doc-1',
        isVisibleToStudents: true,
        audience: 'STUDENT',
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

  describe('secondary embedding models', () => {
    const openai = {
      id: 'emb-openai-3-small',
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 1536,
    };
    const qwen = {
      id: 'emb-qwen-bge-m3',
      provider: 'qwen',
      model: 'bge-m3',
      dimensions: 1024,
    };

    const resolveOthers = (primary: any) =>
      (service as any).resolveOtherActiveModels(primary);

    it('includes an active provider whose engine is configured', async () => {
      db.embeddingModel.findMany.mockResolvedValue([openai, qwen]);

      await expect(resolveOthers(openai)).resolves.toEqual([qwen]);
    });

    it('skips a provider whose engine has no API key', async () => {
      db.embeddingModel.findMany.mockResolvedValue([openai, qwen]);
      llmServiceMock.isEngineEnabled.mockImplementation(
        (provider: string) => provider !== 'qwen',
      );

      await expect(resolveOthers(openai)).resolves.toEqual([]);
      expect(llmServiceMock.resolveDimensions).not.toHaveBeenCalled();
    });
  });
});
