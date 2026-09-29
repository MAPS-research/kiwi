import { Processor, WorkerHost } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { DatabaseService } from 'src/common/database/database.service';
import { DocumentService as DatabaseDocumentService } from 'src/common/database/document.service';
import { StorageService } from 'src/common/storage/storage.service';
import { ParserService } from 'src/common/parser/parser.service';
import { DocumentService } from './document.service';

@Processor('document')
export class DocumentConsumer extends WorkerHost {
  private readonly logger = new Logger(DocumentConsumer.name);
  constructor(
    private databaseDocumentService: DatabaseDocumentService,
    private parserService: ParserService,
    private storageService: StorageService,
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => DocumentService))
    private readonly documentService: DocumentService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'chunkDocument':
        // Same reason as in processDocument: the legacy chunk-only job has to
        // record its own failure or the document stays stuck in PROCESSING.
        try {
          return await this.chunkDocument(job.data.fileId);
        } catch (error) {
          await this.documentService.markProcessingFailed(
            job.data.fileId,
            error,
          );
          throw error;
        }
      case 'processDocument':
        return await this.processDocument(job.data.documentId);
      default:
        break;
    }
  }

  /**
   * Chunk, describe and embed in one job.
   *
   * The browser used to drive these three as separate calls, two of them
   * synchronous requests lasting minutes, so closing the tab left a document
   * that looked identical to a finished one. Each stage still records its own
   * status (see DocumentService), which keeps the legacy three-call sequence
   * walking the same state machine as this job.
   */
  private async processDocument(documentId: string) {
    // Claim the document. Two jobs for the same document would otherwise
    // interleave — embedding is a replace, so one run can wipe rows the other
    // just wrote. `updateMany` with the status in the predicate makes the
    // claim atomic; a second worker finds nothing to update and steps aside.
    const claim = await this.db.document.updateMany({
      where: { id: documentId, processingStatus: { not: 'PROCESSING' } },
      data: {
        processingStatus: 'PROCESSING',
        processingStage: 'chunking',
        processingError: null,
      },
    });

    if (claim.count === 0) {
      this.logger.warn(
        `Document ${documentId} is already being processed; skipping this job`,
      );
      return { message: 'Already processing', document: { id: documentId } };
    }

    // Chunking runs here rather than in DocumentService, so its failures are
    // ours to record. Without this the document keeps the PROCESSING it was
    // claimed with: the instructor sees a permanent "processing" badge with no
    // error, and the next job steps aside at the claim above, so re-running the
    // pipeline cannot rescue it either. Describe and embed mark themselves.
    try {
      await this.chunkDocument(documentId);
    } catch (error) {
      await this.documentService.markProcessingFailed(documentId, error);
      throw error;
    }

    await this.documentService.describeImageChunks(documentId);
    await this.documentService.embedDocument(documentId);

    return {
      message: 'Document processed successfully',
      document: { id: documentId },
    };
  }

  base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async chunkDocument(fileId: string) {
    const document = await this.databaseDocumentService.document({
      id: fileId,
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Recorded here rather than in the caller so the legacy chunk-only job
    // leaves the same trail as the full pipeline.
    await this.documentService.markProcessingStage(fileId, 'chunking');

    const { fileUrl } = document;

    const { buffer: fileContent, contentType: fileType } =
      await this.storageService.readFile(fileUrl);

    // const fileType = fileUrl.split(';')[0].split(':')[1];

    // const fileData = fileUrl.split(',')[1];

    // const fileContent = this.base64ToUint8Array(fileData);

    // console.log(fileContent);

    // Parser choice lives in ParserService (PARSER env). Whichever one runs,
    // it returns the same chunk shape, so nothing below here changes.
    const { chunks } = await this.parserService.parse({
      content: fileContent,
      mimeType: fileType,
      fileName: document.fileName,
    });

    await this.databaseDocumentService.updateDocument({
      where: { id: fileId },
      // `chunks` is a Json column; Prisma's input type does not accept an
      // interface with optional fields directly.
      data: { chunks: chunks as unknown as Prisma.InputJsonValue },
    });

    return {
      message: 'Document chunked successfully',
      document: {
        id: fileId,
        fileName: document.fileName,
      },
    };
  }
}
