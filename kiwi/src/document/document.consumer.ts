import { Processor, WorkerHost } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DatabaseService } from 'src/common/database/database.service';
import { DocumentService as DatabaseDocumentService } from 'src/common/database/document.service';
import { StorageService } from 'src/common/storage/storage.service';
import { UnstructuredService } from 'src/common/unstructured/unstructured.service';
import { DocumentService } from './document.service';

@Processor('document')
export class DocumentConsumer extends WorkerHost {
  private readonly logger = new Logger(DocumentConsumer.name);
  constructor(
    private databaseDocumentService: DatabaseDocumentService,
    private unstructuredService: UnstructuredService,
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

    const textChunks = await this.unstructuredService.partitionDocument(
      fileContent,
      fileType,
      document.fileName,
      'ocr_only',
    );

    const imageChunksAll = await this.unstructuredService.partitionDocument(
      fileContent,
      fileType,
      document.fileName,
      'hi_res',
    );

    const imageChunks = imageChunksAll.filter(
      (chunk) => chunk.type === 'Image' || chunk.type === 'Table',
    );

    // `ocr_only` can silently return zero elements for some PDFs (a Tesseract
    // auto-zoom quirk in the unstructured library: when the first OCR pass
    // finds no text, the median text-height is NaN, and `NaN < min || NaN >
    // max` is always false, so the retry-with-zoom fallback never fires).
    // Fall back to hi_res, which reads those PDFs fine.
    //
    // This must be its own request with chunking on, *not* a filter over
    // `imageChunksAll`: that call is deliberately unchunked so Image/Table
    // survive as discrete elements, and its text comes back as raw
    // Title/NarrativeText/ListItem. `embedDocument` only embeds
    // CompositeElement/Image/Table, so reusing those raw elements leaves the
    // document with chunks that can never be embedded — visible in the UI,
    // invisible to RAG.
    let resolvedTextChunks = textChunks;
    if (resolvedTextChunks.length === 0) {
      this.logger.warn(
        `ocr_only returned no elements for ${document.fileName} ` +
          `(${fileId}); retrying with hi_res + chunking`,
      );
      const hiResChunked = await this.unstructuredService.partitionDocument(
        fileContent,
        fileType,
        document.fileName,
        'hi_res',
        true,
      );
      // `by_title` keeps Table elements discrete rather than folding them into
      // a CompositeElement, so drop them here — they are already covered by
      // `imageChunks` from the unchunked pass.
      resolvedTextChunks = hiResChunked.filter(
        (chunk) => chunk.type !== 'Image' && chunk.type !== 'Table',
      );
    }

    // // Combine text and image chunks
    const chunks = [...resolvedTextChunks, ...imageChunks];

    await this.databaseDocumentService.updateDocument({
      where: { id: fileId },
      data: { chunks },
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
