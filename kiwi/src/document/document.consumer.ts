import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DocumentService as DatabaseDocumentService } from 'src/common/database/document.service';
import { StorageService } from 'src/common/storage/storage.service';
import { UnstructuredService } from 'src/common/unstructured/unstructured.service';

@Processor('document')
export class DocumentConsumer extends WorkerHost {
  private readonly logger = new Logger(DocumentConsumer.name);
  constructor(
    private databaseDocumentService: DatabaseDocumentService,
    private unstructuredService: UnstructuredService,
    private storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'chunkDocument':
        return await this.chunkDocument(job.data.fileId);
      default:
        break;
    }
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
