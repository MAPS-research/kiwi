import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';
import { DatabaseService } from 'src/common/database/database.service';
import { DocumentService as DatabaseDocumentService } from 'src/common/database/document.service';
import { StorageService } from 'src/common/storage/storage.service';
import { ParserService } from 'src/common/parser/parser.service';
import { DocumentConsumer } from './document.consumer';
import { DocumentService } from './document.service';

describe('DocumentConsumer', () => {
  let consumer: DocumentConsumer;
  let db: any;
  let documentService: any;
  let databaseDocumentService: any;
  let parserService: any;

  beforeEach(async () => {
    db = { document: { updateMany: jest.fn() } };
    documentService = {
      markProcessingStage: jest.fn(),
      markProcessingFailed: jest.fn(),
      describeImageChunks: jest.fn(),
      embedDocument: jest.fn(),
    };
    databaseDocumentService = {
      document: jest.fn().mockResolvedValue({
        id: 'doc1',
        fileName: 'lecture.pdf',
        fileUrl: 'key/doc1',
      }),
      updateDocument: jest.fn(),
    };
    parserService = {
      parse: jest.fn().mockResolvedValue({
        parser: 'unstructured',
        chunks: [
          {
            element_id: 'e1',
            type: 'CompositeElement',
            text: 'hi',
            metadata: {},
          },
        ],
        warnings: [],
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentConsumer,
        { provide: DatabaseService, useValue: db },
        {
          provide: DatabaseDocumentService,
          useValue: databaseDocumentService,
        },
        { provide: ParserService, useValue: parserService },
        {
          provide: StorageService,
          useValue: {
            readFile: jest.fn().mockResolvedValue({
              buffer: Buffer.from(''),
              contentType: 'application/pdf',
            }),
          },
        },
        { provide: DocumentService, useValue: documentService },
      ],
    }).compile();

    consumer = moduleRef.get(DocumentConsumer);
  });

  const job = (name: string, data: any) =>
    ({ name, data }) as Job<any, any, string>;

  it('runs chunk, describe and embed in order once it claims the document', async () => {
    db.document.updateMany.mockResolvedValueOnce({ count: 1 });

    await consumer.process(job('processDocument', { documentId: 'doc1' }));

    expect(db.document.updateMany).toHaveBeenCalledWith({
      where: { id: 'doc1', processingStatus: { not: 'PROCESSING' } },
      data: {
        processingStatus: 'PROCESSING',
        processingStage: 'chunking',
        processingError: null,
      },
    });
    expect(databaseDocumentService.updateDocument).toHaveBeenCalled(); // chunked
    expect(documentService.describeImageChunks).toHaveBeenCalledWith('doc1');
    expect(documentService.embedDocument).toHaveBeenCalledWith('doc1');
  });

  it('steps aside when another worker already claimed the document', async () => {
    // Embedding is a replace, so two concurrent runs can wipe rows the other
    // just wrote. The claim is the only thing preventing that.
    db.document.updateMany.mockResolvedValueOnce({ count: 0 });

    const result = await consumer.process(
      job('processDocument', { documentId: 'doc1' }),
    );

    expect(result).toEqual({
      message: 'Already processing',
      document: { id: 'doc1' },
    });
    expect(databaseDocumentService.document).not.toHaveBeenCalled();
    expect(documentService.embedDocument).not.toHaveBeenCalled();
  });

  it('marks the document FAILED when chunking throws', async () => {
    // Otherwise the document keeps the PROCESSING the claim gave it: the
    // instructor sees a permanent "processing" badge with no error, and the
    // claim makes every later job step aside, so re-running cannot rescue it.
    db.document.updateMany.mockResolvedValueOnce({ count: 1 });
    const failure = new Error('Failed to partition document');
    parserService.parse.mockRejectedValue(failure);

    await expect(
      consumer.process(job('processDocument', { documentId: 'doc1' })),
    ).rejects.toThrow('Failed to partition document');

    expect(documentService.markProcessingFailed).toHaveBeenCalledWith(
      'doc1',
      failure,
    );
    expect(documentService.embedDocument).not.toHaveBeenCalled();
  });

  it('marks FAILED when the legacy chunk-only job throws', async () => {
    const failure = new Error('Failed to partition document');
    parserService.parse.mockRejectedValue(failure);

    await expect(
      consumer.process(job('chunkDocument', { fileId: 'doc1' })),
    ).rejects.toThrow('Failed to partition document');

    expect(documentService.markProcessingFailed).toHaveBeenCalledWith(
      'doc1',
      failure,
    );
  });

  it('still records the chunking stage on the legacy chunk-only job', async () => {
    await consumer.process(job('chunkDocument', { fileId: 'doc1' }));

    expect(documentService.markProcessingStage).toHaveBeenCalledWith(
      'doc1',
      'chunking',
    );
    expect(documentService.embedDocument).not.toHaveBeenCalled();
  });
});
