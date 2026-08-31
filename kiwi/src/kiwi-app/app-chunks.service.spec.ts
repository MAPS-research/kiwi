import { Test } from '@nestjs/testing';
import { AppChunksService } from './app-chunks.service';
import { DatabaseService } from 'src/common/database/database.service';
import { MaterialService } from 'src/class/material/material.service';
import { encodeChunkCursor } from './utils/chunk-cursor';

describe('AppChunksService', () => {
  let service: AppChunksService;

  const db = {
    document: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const materialService = {
    list: jest.fn(),
  };

  const chunk = (id: string, text: string, page = 1, extra: object = {}) => ({
    element_id: id,
    fieldName: 'field',
    text,
    type: 'CompositeElement',
    metadata: { page_number: page },
    ...extra,
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AppChunksService,
        { provide: DatabaseService, useValue: db },
        { provide: MaterialService, useValue: materialService },
      ],
    }).compile();
    service = moduleRef.get(AppChunksService);
  });

  it('returns a valid empty result for a class with no available materials', async () => {
    materialService.list.mockResolvedValue({ materials: [] });

    const result = await service.getClassDocumentChunks({ classId: 'class-1' });

    expect(result).toEqual({
      classId: 'class-1',
      documents: [],
      nextCursor: null,
      hasMore: false,
    });
    expect(db.document.findMany).not.toHaveBeenCalled();
  });

  it('maps chunk fields explicitly and never leaks image_base64', async () => {
    materialService.list.mockResolvedValue({ materials: [{ id: 'mat-1' }] });
    db.document.findMany.mockResolvedValue([{ id: 'doc-1' }]);
    db.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      fileName: 'Lecture 5.pdf',
      chunks: [
        chunk('c1', 'hello world'),
        chunk('c2', 'a described image', 2, {
          type: 'Image',
          described: true,
          metadata: {
            page_number: 2,
            image_base64: 'AAAA_SECRET_BYTES',
            image_mime_type: 'image/png',
          },
        }),
        { fieldName: 'no-id-or-text' },
      ],
    });

    const result = await service.getClassDocumentChunks({ classId: 'class-1' });

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({
      documentId: 'doc-1',
      fileName: 'Lecture 5.pdf',
      totalChunks: 3,
    });
    expect(result.documents[0].chunks[0]).toEqual({
      chunkId: 'c1',
      index: 0,
      pageNumber: 1,
      type: 'CompositeElement',
      text: 'hello world',
    });
    expect(result.documents[0].chunks[1]).toMatchObject({
      chunkId: 'c2',
      type: 'Image',
      pageNumber: 2,
      text: 'a described image',
    });
    // Chunk without element_id/text falls back to synthetic id and empty text
    expect(result.documents[0].chunks[2]).toEqual({
      chunkId: 'doc-1:2',
      index: 2,
      pageNumber: null,
      type: 'CompositeElement',
      text: '',
    });
    expect(JSON.stringify(result)).not.toContain('image_base64');
    expect(JSON.stringify(result)).not.toContain('AAAA_SECRET_BYTES');
    expect(result.hasMore).toBe(false);
  });

  it('never throws or breaks the DTO contract on malformed chunk JSON', async () => {
    materialService.list.mockResolvedValue({ materials: [{ id: 'mat-1' }] });
    db.document.findMany.mockResolvedValue([{ id: 'doc-1' }]);
    db.document.findUnique.mockResolvedValue({
      id: 'doc-1',
      fileName: 'weird.pdf',
      chunks: [
        // non-string text/type, string page number
        {
          element_id: 'c0',
          text: { nested: 'object' },
          type: 42,
          metadata: { page_number: '7' },
        },
        // page number that is not a number at all
        { element_id: 'c1', text: 'ok', metadata: { page_number: 'iv' } },
        // chunk is not an object
        null,
      ],
    });

    const result = await service.getClassDocumentChunks({ classId: 'class-1' });
    const chunks = result.documents[0].chunks;

    expect(chunks[0]).toEqual({
      chunkId: 'c0',
      index: 0,
      pageNumber: 7,
      type: 'CompositeElement',
      text: '',
    });
    expect(chunks[1].pageNumber).toBeNull();
    expect(chunks[2]).toEqual({
      chunkId: 'doc-1:2',
      index: 2,
      pageNumber: null,
      type: 'CompositeElement',
      text: '',
    });
    for (const c of chunks) {
      expect(typeof c.text).toBe('string');
      expect(typeof c.type).toBe('string');
      expect(c.pageNumber === null || typeof c.pageNumber === 'number').toBe(
        true,
      );
    }
  });

  it('paginates across a document boundary and resumes via cursor', async () => {
    materialService.list.mockResolvedValue({ materials: [{ id: 'mat-1' }] });
    db.document.findMany.mockResolvedValue([{ id: 'doc-a' }, { id: 'doc-b' }]);
    const docs: Record<string, any> = {
      'doc-a': {
        id: 'doc-a',
        fileName: 'a.pdf',
        chunks: [chunk('a0', 'A0'), chunk('a1', 'A1'), chunk('a2', 'A2')],
      },
      'doc-b': {
        id: 'doc-b',
        fileName: 'b.pdf',
        chunks: [chunk('b0', 'B0'), chunk('b1', 'B1')],
      },
    };
    db.document.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(docs[where.id]),
    );

    // Page 1: limit 4 → all of doc-a (3) + first chunk of doc-b
    const page1 = await service.getClassDocumentChunks({
      classId: 'class-1',
      limit: 4,
    });
    expect(page1.documents.map((d) => d.documentId)).toEqual([
      'doc-a',
      'doc-b',
    ]);
    expect(page1.documents[1].chunks.map((c) => c.chunkId)).toEqual(['b0']);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).not.toBeNull();

    // Page 2: resumes at doc-b chunk index 1
    const page2 = await service.getClassDocumentChunks({
      classId: 'class-1',
      limit: 4,
      cursor: page1.nextCursor!,
    });
    expect(page2.documents).toHaveLength(1);
    expect(page2.documents[0].chunks.map((c) => c.chunkId)).toEqual(['b1']);
    expect(page2.documents[0].chunks[0].index).toBe(1);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeNull();
  });

  it('resumes after the cursor document was deleted', async () => {
    materialService.list.mockResolvedValue({ materials: [{ id: 'mat-1' }] });
    // 'doc-b' (the cursor target) no longer exists; resume at first id >= 'doc-b'
    db.document.findMany.mockResolvedValue([{ id: 'doc-a' }, { id: 'doc-c' }]);
    db.document.findUnique.mockResolvedValue({
      id: 'doc-c',
      fileName: 'c.pdf',
      chunks: [chunk('c0', 'C0')],
    });

    const result = await service.getClassDocumentChunks({
      classId: 'class-1',
      cursor: encodeChunkCursor({ d: 'doc-b', c: 5 }),
    });

    expect(db.document.findUnique).toHaveBeenCalledTimes(1);
    expect(result.documents[0].documentId).toBe('doc-c');
    // chunk index from the stale cursor does not apply to a different document
    expect(result.documents[0].chunks[0].index).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it('filters to the requested documentIds', async () => {
    materialService.list.mockResolvedValue({ materials: [{ id: 'mat-1' }] });
    db.document.findMany.mockResolvedValue([{ id: 'doc-2' }]);
    db.document.findUnique.mockResolvedValue({
      id: 'doc-2',
      fileName: 'two.pdf',
      chunks: [chunk('c0', 'X')],
    });

    await service.getClassDocumentChunks({
      classId: 'class-1',
      documentIds: ['doc-2'],
    });

    expect(db.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['doc-2'] } }),
      }),
    );
  });
});
