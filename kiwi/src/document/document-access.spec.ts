import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InstructorClassService } from 'src/instructor-class/instructor-class.service';
import { MaterialManageGuard } from 'src/instructor-class/material-manage.guard';
import { DocumentService } from './document.service';

/**
 * Regression tests for document and material access: management is scoped to
 * one class, and students can read only the document their material list
 * shows them (never answer keys).
 */

const past = new Date('2020-01-01');
const future = new Date('2999-01-01');

type Doc = {
  id: string;
  classMaterialId: string;
  isStudent: boolean;
  uploadedDate: Date;
};

function fixture() {
  const users: Record<string, string> = {
    admin: 'admin',
    profA: 'user',
    instA: 'instructor',
    instNoPerm: 'instructor',
    studentA: 'user',
    studentB: 'user',
  };
  const enrollments = [
    { classId: 'A', userId: 'profA', role: 'professor' },
    { classId: 'A', userId: 'studentA', role: 'student' },
    { classId: 'B', userId: 'studentB', role: 'student' },
  ];
  const assignments = [
    { userId: 'instA', classId: 'A', permissions: { canManageMaterials: true } },
    { userId: 'instNoPerm', classId: 'A', permissions: {} },
  ];
  const materials: Record<string, any> = {
    recA: { id: 'recA', classId: 'A', status: 'processed', availableDate: past },
    lateA: { id: 'lateA', classId: 'A', status: 'processed', availableDate: future },
    plainA: { id: 'plainA', classId: 'A', status: 'processed', availableDate: past },
  };
  const documents: Doc[] = [
    // recitation: worksheet flagged for students, answer key newer and unflagged
    { id: 'worksheet', classMaterialId: 'recA', isStudent: true, uploadedDate: new Date('2024-01-01') },
    { id: 'answers', classMaterialId: 'recA', isStudent: false, uploadedDate: new Date('2024-02-01') },
    // no flag: the newest document is the visible one
    { id: 'old', classMaterialId: 'plainA', isStudent: false, uploadedDate: new Date('2024-01-01') },
    { id: 'new', classMaterialId: 'plainA', isStudent: false, uploadedDate: new Date('2024-03-01') },
    { id: 'notYet', classMaterialId: 'lateA', isStudent: true, uploadedDate: new Date('2024-01-01') },
  ];

  const database: any = {
    user: {
      findUnique: async ({ where }: any) =>
        users[where.id] ? { systemRole: users[where.id] } : null,
    },
    enrollment: {
      findUnique: async ({ where }: any) => {
        const { classId, userId } = where.classId_userId;
        return enrollments.find((e) => e.classId === classId && e.userId === userId) ?? null;
      },
    },
    instructorClass: {
      findUnique: async ({ where }: any) => {
        const { userId, classId } = where.userId_classId;
        return assignments.find((a) => a.userId === userId && a.classId === classId) ?? null;
      },
    },
    classMaterial: {
      findUnique: async ({ where }: any) => materials[where.id] ?? null,
    },
    document: {
      findUnique: async ({ where, include, select }: any) => {
        const doc = documents.find((d) => d.id === where.id);
        if (!doc) return null;
        const material = materials[doc.classMaterialId];
        if (select?.classMaterial) return { classMaterial: { classId: material.classId } };
        return include?.classMaterial ? { ...doc, classMaterial: material } : doc;
      },
      findMany: async ({ where }: any) =>
        documents
          .filter((d) => d.classMaterialId === where.classMaterialId)
          .sort((a, b) => b.uploadedDate.getTime() - a.uploadedDate.getTime()),
    },
  };

  const access = new InstructorClassService(database, {} as any);
  const documentService = Object.create(DocumentService.prototype);
  documentService.db = database;
  documentService.instructorClassService = access;
  return { access, documentService, database };
}

describe('InstructorClassService.canManageMaterials', () => {
  const { access } = fixture();

  it.each([
    ['admin', 'A', true],
    ['admin', 'B', true],
    ['profA', 'A', true],
    ['profA', 'B', false],
    ['instA', 'A', true],
    ['instA', 'B', false],
    ['instNoPerm', 'A', false],
    ['studentA', 'A', false],
  ])('%s on class %s -> %s', async (userId, classId, expected) => {
    await expect(access.canManageMaterials(userId, classId)).resolves.toBe(expected);
  });
});

describe('MaterialManageGuard', () => {
  const { access } = fixture();
  const guard = new MaterialManageGuard(access);
  const run = (userId: string, request: any) =>
    guard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ session: { userId }, params: {}, query: {}, body: {}, ...request }),
      }),
    } as any);

  it('uses the class named in the body', async () => {
    await expect(run('profA', { body: { classId: 'A' } })).resolves.toBe(true);
    await expect(run('profA', { body: { classId: 'B' } })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("uses a material's class", async () => {
    await expect(run('instA', { body: { materialId: 'recA' } })).resolves.toBe(true);
    await expect(run('instA', { query: { materialID: 'recA' } })).resolves.toBe(true);
    await expect(run('instNoPerm', { body: { materialId: 'recA' } })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("uses a document's class", async () => {
    await expect(run('profA', { params: { id: 'answers' } })).resolves.toBe(true);
    await expect(run('profA', { body: { documentId: 'answers' } })).resolves.toBe(true);
    await expect(run('studentA', { body: { documentId: 'answers' } })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses requests that name nothing, and unknown ids', async () => {
    await expect(run('profA', {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(run('profA', { body: { materialId: 'nope' } })).rejects.toBeInstanceOf(NotFoundException);
    await expect(run('profA', { params: { id: 'nope' } })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires a session', async () => {
    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ session: {}, body: { classId: 'A' } }) }),
      } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('DocumentService.assertCanReadDocument', () => {
  const { documentService } = fixture();
  const read = (id: string, userId: string) =>
    documentService.assertCanReadDocument(id, userId);

  it('lets managers read every document in their class', async () => {
    await expect(read('answers', 'profA')).resolves.toBeUndefined();
    await expect(read('notYet', 'instA')).resolves.toBeUndefined();
  });

  it('lets a student read the document shown for a material', async () => {
    await expect(read('worksheet', 'studentA')).resolves.toBeUndefined();
    await expect(read('new', 'studentA')).resolves.toBeUndefined();
  });

  it('hides answer keys and other documents students are not shown', async () => {
    await expect(read('answers', 'studentA')).rejects.toBeInstanceOf(NotFoundException);
    await expect(read('old', 'studentA')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('hides materials that are not released yet', async () => {
    await expect(read('notYet', 'studentA')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('hides documents of classes the user is not in', async () => {
    await expect(read('worksheet', 'studentB')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reports a missing document as not found', async () => {
    await expect(read('nope', 'admin')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('DocumentService.assertCanManageMaterial', () => {
  const { documentService } = fixture();

  it('checks the material\'s class', async () => {
    await expect(documentService.assertCanManageMaterial('profA', 'recA')).resolves.toBeUndefined();
    await expect(documentService.assertCanManageMaterial('studentA', 'recA')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(documentService.assertCanManageMaterial('profA', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('DocumentService.chunkDocumentStatusFor', () => {
  const { documentService } = fixture();
  documentService.documentQueue = {
    getJob: async (id: string) =>
      id === 'job-1' ? { id, data: { fileId: 'answers' }, returnvalue: null } : null,
  };
  documentService.chunkDocumentStatus = async (id: string) => ({ id, status: 'real' });

  it('returns the status to a manager of the document\'s class', async () => {
    await expect(documentService.chunkDocumentStatusFor('job-1', 'profA')).resolves.toEqual({
      id: 'job-1',
      status: 'real',
    });
  });

  it('looks like a missing job to anyone else', async () => {
    await expect(documentService.chunkDocumentStatusFor('job-1', 'studentA')).resolves.toEqual({
      message: 'Job not found',
    });
    await expect(documentService.chunkDocumentStatusFor('job-9', 'profA')).resolves.toEqual({
      message: 'Job not found',
    });
  });
});
