import { Test } from '@nestjs/testing';
import { MaterialService } from './material.service';

import { ClassMaterialService } from 'src/common/database/class-material.service';
import { DocumentService as DatabaseDocumentService } from 'src/common/database/document.service';
import { DatabaseService } from 'src/common/database/database.service';
import { StorageService } from 'src/common/storage/storage.service';

// Other ctor deps required by MaterialService (but not used in these tests)
import { ClassService as DatabaseClassService } from 'src/common/database/class.service';
import { UserService } from 'src/common/database/user.service';
import { EnrollmentService } from 'src/common/database/enrollment.service';
import { DocumentService } from 'src/document/document.service';

describe('MaterialService.listDocumentsByMaterialId', () => {
  let service: MaterialService;

  // Mocks for collaborators:
  const classMaterialService = {
    classMaterial: jest.fn(),
  };

  const databaseDocumentService = {
    documents: jest.fn(),
  };

  const storageService = {
    generateSignedUrl: jest.fn(),
  };

  // Unused by this method, but required by constructor:
  const databaseClassService = {};
  const userService = {};
  const enrollmentService = {};
  const documentService = {};
  const db = {}; // DatabaseService not called directly here

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MaterialService,
        { provide: ClassMaterialService, useValue: classMaterialService },
        { provide: DatabaseDocumentService, useValue: databaseDocumentService },
        { provide: StorageService, useValue: storageService },

        // ctor deps not used in these tests
        { provide: DatabaseClassService, useValue: databaseClassService },
        { provide: UserService, useValue: userService },
        { provide: EnrollmentService, useValue: enrollmentService },
        { provide: DocumentService, useValue: documentService },
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();

    service = module.get(MaterialService);

    jest.clearAllMocks();
  });

  it('returns empty list when material does not exist', async () => {
    classMaterialService.classMaterial.mockResolvedValueOnce(null);

    const res = await service.listDocumentsByMaterialId('mat-404');
    expect(res).toEqual({ documents: [] });
    expect(databaseDocumentService.documents).not.toHaveBeenCalled();
  });

  it('returns empty list when material is not yet available (time-gated)', async () => {
    const future = new Date(Date.now() + 24 * 3600 * 1000);
    classMaterialService.classMaterial.mockResolvedValueOnce({
      id: 'mat-1',
      availableDate: future,
    });

    // Spy on isMaterialAvailable to avoid dealing with time:
    const spy = jest
      .spyOn(service, 'isMaterialAvailable')
      .mockResolvedValueOnce(false);

    const res = await service.listDocumentsByMaterialId('mat-1');
    expect(spy).toHaveBeenCalled();
    expect(res).toEqual({ documents: [] });
    expect(databaseDocumentService.documents).not.toHaveBeenCalled();
  });

  it('returns mapped documents with flags and signed URLs when available', async () => {
    const past = new Date(Date.now() - 24 * 3600 * 1000);
    classMaterialService.classMaterial.mockResolvedValueOnce({
      id: 'mat-1',
      availableDate: past,
    });

    // Make availability true explicitly
    jest.spyOn(service, 'isMaterialAvailable').mockResolvedValueOnce(true);

    // Mock DB documents (as Prisma would return)
    const docs = [
      {
        id: 'doc-2',
        fileName: 'B.pdf',
        fileUrl: 's3://bucket/key-2',
        uploadedDate: new Date('2025-01-02T00:00:00Z'),
        isStudent: false,
        isLlm: true,
      },
      {
        id: 'doc-1',
        fileName: 'A.pdf',
        fileUrl: 's3://bucket/key-1',
        uploadedDate: new Date('2025-01-01T00:00:00Z'),
        isStudent: true,
        isLlm: true,
      },
    ];
    databaseDocumentService.documents.mockResolvedValueOnce(docs);

    // Signed URL mapping
    storageService.generateSignedUrl
      .mockResolvedValueOnce('https://signed/key-2')
      .mockResolvedValueOnce('https://signed/key-1');

    const res = await service.listDocumentsByMaterialId('mat-1');

    expect(databaseDocumentService.documents).toHaveBeenCalledWith({
      where: { classMaterialId: 'mat-1' },
      orderBy: { uploadedDate: 'desc' },
    });

    // Verify mapping shape: updatedDate, flags, and signed file URL
    expect(res).toEqual({
      documents: [
        {
          id: 'doc-2',
          fileName: 'B.pdf',
          file: 'https://signed/key-2',
          updatedDate: docs[0].uploadedDate,
          isStudent: false,
          isLlm: true,
        },
        {
          id: 'doc-1',
          fileName: 'A.pdf',
          file: 'https://signed/key-1',
          updatedDate: docs[1].uploadedDate,
          isStudent: true,
          isLlm: true,
        },
      ],
    });
  });
});
