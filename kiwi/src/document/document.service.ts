import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClassMaterialService } from 'src/common/database/class-material.service';
import { DocumentService as DatabaseDocumentService } from 'src/common/database/document.service';
import { EmbeddingService } from 'src/common/database/embedding.service';
import { LlmService } from 'src/common/llm/llm.service';
import { EngineChoice } from 'src/common/llm/interfaces/engine-config';
import { ConfigService } from '@nestjs/config';
import { EmbeddingModel } from '@prisma/client';
import { UnstructuredService } from 'src/common/unstructured/unstructured.service';
import { Chunk } from './dto/chunk-request.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuid, validate as validateUuid } from 'uuid';
import { StorageService } from 'src/common/storage/storage.service';
import { DatabaseService } from 'src/common/database/database.service';
import { SetDocumentFlagsDto } from './dto/set-document-flags.dto';
import { DocumentCommentService } from 'src/common/database/document-comment.service';
import { DocumentSummaryService } from 'src/common/database/document-summary.service';
import { InstructorClassService } from 'src/instructor-class/instructor-class.service';
import { CreateDocumentCommentDto, UpdateDocumentCommentVisibilityDto } from './dto/document-comment.dto';
import { CreateDocumentSummaryDto, UpdateDocumentSummaryDto } from './dto/document-summary.dto';
import { DocumentComment, DocumentSummary, User } from '@prisma/client';
import { DocumentWithClassMaterial } from 'src/common/database/document.service';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  constructor(
    private databaseDocumentService: DatabaseDocumentService,
    private embeddingService: EmbeddingService,
    private unstructuredService: UnstructuredService,
    private llmService: LlmService,
    private classMaterialService: ClassMaterialService,
    private documentCommentService: DocumentCommentService,
    private documentSummaryService: DocumentSummaryService,
    private instructorClassService: InstructorClassService,
    private storageService: StorageService,
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
    @InjectQueue('document') private documentQueue: Queue,
  ) {}

  /**
   * Resolve the active EmbeddingModel for the given provider/engine, lazily
   * probing and caching its dimensions if unknown. Both ingest and query call
   * this so they always use the same model (the cross-model-consistency
   * invariant). Defaults to the EMBEDDING_PROVIDER env var, then 'openai'.
   */
  private async resolveEmbeddingModel(
    engineChoice?: EngineChoice,
  ): Promise<EmbeddingModel> {
    const provider =
      engineChoice ??
      (this.configService.get<string>('EMBEDDING_PROVIDER') as EngineChoice) ??
      'openai';

    const model = await this.db.embeddingModel.findFirst({
      where: { provider, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!model) {
      throw new Error(
        `No active EmbeddingModel registered for provider '${provider}'.`,
      );
    }
    if (model.dimensions == null) {
      const dimensions = await this.llmService.resolveDimensions(provider);
      return this.db.embeddingModel.update({
        where: { id: model.id },
        data: { dimensions },
      });
    }
    return model;
  }

  /**
   * Every other active model that ingestion should also write a vector for —
   * one per provider, matching `resolveEmbeddingModel`'s oldest-first pick so
   * ingestion and retrieval agree on which model represents a provider.
   */
  private async resolveOtherActiveModels(
    primary: EmbeddingModel,
  ): Promise<EmbeddingModel[]> {
    const active = await this.db.embeddingModel.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const perProvider = new Map<string, EmbeddingModel>();
    for (const model of active) {
      if (!perProvider.has(model.provider)) {
        perProvider.set(model.provider, model);
      }
    }
    perProvider.delete(primary.provider);

    const models: EmbeddingModel[] = [];
    for (const model of perProvider.values()) {
      if (model.dimensions != null) {
        models.push(model);
        continue;
      }
      // Same lazy dimension probe as the primary path — a provider registered
      // without dimensions must not be skipped, or it silently never gets
      // vectors, which is the exact failure this method exists to prevent.
      try {
        const dimensions = await this.llmService.resolveDimensions(
          model.provider as EngineChoice,
        );
        models.push(
          await this.db.embeddingModel.update({
            where: { id: model.id },
            data: { dimensions },
          }),
        );
      } catch (error) {
        this.logger.error(
          `Could not resolve dimensions for ${model.provider}/${model.model}; ` +
            `skipping it for this document:`,
          error,
        );
      }
    }
    return models;
  }

  convertDocumentToBase64Url(file: Express.Multer.File) {
    this.logger.log(
      'Converting document to base64 with name',
      file.originalname,
    );

    const fileBase64 = file.buffer.toString('base64');

    const fileBase64Url = `data:${file.mimetype};base64,${fileBase64}`;

    return fileBase64Url;
  }

  convertBase64UrlToDocument(base64Url: string, fileName: string) {
    // this.logger.debug(base64Url);
    // this.logger.log('Converting base64 to multer file');

    const fileData = base64Url.split(',')[1];

    const fileBuffer = Buffer.from(fileData, 'base64');

    const multerFile: Express.Multer.File = {
      buffer: fileBuffer,
      mimetype: base64Url.split(';')[0].split(':')[1],
      originalname: fileName,
      fieldname: 'file',
      encoding: '7bit',
      size: fileBuffer.length,
      stream: undefined as any,
      destination: '',
      filename: fileName,
      path: '',
    };
    return multerFile;
  }

  async uploadDocument(file: Express.Multer.File, classMaterialId: string) {
    // this.logger.debug(file);
    this.logger.debug(
      'Uploaded document with name',
      file.originalname,
      'to class material',
      classMaterialId,
    );

    // Create a uuid for the document
    const documentId = uuid();

    const { key: documentKey } = await this.storageService.uploadFile(
      file,
      documentId,
    );

    // const fileBase64 = this.convertDocumentToBase64Url(file);

    // this.logger.debug(fileBase64.slice(0, 50));

    // Save document to database
    const document = await this.databaseDocumentService.createDocument({
      fileName: file.originalname,
      fileUrl: documentKey,
      classMaterialId,
    });
    // apply default flags: 1st doc isStudent=true, 2nd doc isLlm=true
    await this.applyUploadRoleDefaults(classMaterialId, document.id);

    return {
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        fileName: document.fileName,
      },
    };
  }

  async uploadDocumentNoMaterialId(file: Express.Multer.File) {
    // this.logger.debug(file);
    this.logger.debug(
      'Uploaded document with name (no material id)',
      file.originalname,
    );

    // Create a uuid for the document
    const documentId = uuid();

    const { key: documentKey } = await this.storageService.uploadFile(
      file,
      documentId,
    );

    return {
      message: 'Document uploaded successfully',
      document: {
        id: documentKey,
        fileName: file.originalname,
      },
    };
  }

  async chunkDocumentQueue(fileId: string) {
    const job = await this.documentQueue.add('chunkDocument', { fileId });
    return {
      message: 'Document chunking in progress',
      jobId: job.id,
    };
  }

  async chunkDocumentStatus(jobId: string) {
    const job = await this.documentQueue.getJob(jobId);
    if (!job) {
      return { message: 'Job not found' };
    }
    if (job.failedReason) {
      this.logger.error('Document chunking failed', job.failedReason);
      return {
        message: 'Document chunking failed',
        id: job.id,
        result: null,
      };
    }
    return {
      message: job.returnvalue
        ? 'Document chunking completed'
        : 'Document chunking still in progress',
      id: job.id,
      result: job.finishedOn ? job.returnvalue : 'in progress',
    };
  }

  async describeImageChunks(fileId: string) {
    const document = await this.databaseDocumentService.document({
      id: fileId,
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const { chunks: documentChunks } = document;

    if (!documentChunks) {
      throw new Error('Document not chunked yet');
    }

    const chunks = await Promise.all(
      (documentChunks as any[]).map(async (chunk) => {
        if (
          (chunk.type === 'Image' || chunk.type === 'Table') &&
          !chunk.described &&
          chunk.metadata.image_base64
        ) {
          // this.logger.debug(chunk);

          const description = await this.llmService.describeImage(
            `data:${chunk.metadata.image_mime_type};base64,${chunk.metadata.image_base64}`,
          );

          chunk.text = description;

          chunk.described = true;
        }
        return chunk;
      }),
    );

    // Update document with described image chunks

    await this.databaseDocumentService.updateDocument({
      where: { id: fileId },
      data: { chunks },
    });

    return {
      message: 'Image chunks described successfully',
    };
  }

  async embedDocument(fileId: string) {
    const document = await this.databaseDocumentService.document({
      id: fileId,
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const { chunks } = document;

    if (!chunks) {
      throw new Error('Document not chunked yet');
    }

    // this.logger.debug(chunks);

    // Run embedding only on types CompositeElement, Image and Table
    const embeddableChunks = (chunks as any[]).filter(
      (chunk) =>
        chunk.type === 'CompositeElement' ||
        chunk.type === 'Image' ||
        chunk.type === 'Table',
    );

    // A document can hold plenty of chunks and still have none of the three
    // embeddable types (an unchunked partition yields raw Title/NarrativeText/
    // ListItem). That used to return "embedded successfully" after writing
    // nothing, leaving the document searchable-looking but invisible to RAG.
    // Fail loudly instead — the caller can re-chunk.
    if (embeddableChunks.length === 0) {
      const seenTypes = [
        ...new Set((chunks as any[]).map((chunk) => chunk.type)),
      ].join(', ');
      throw new Error(
        `Document ${fileId} has ${(chunks as any[]).length} chunk(s) but none ` +
          `are embeddable (CompositeElement/Image/Table); found: ` +
          `${seenTypes || 'none'}. Re-chunk the document.`,
      );
    }

    // Embed under EVERY active model, not just the configured default.
    // Retrieval filters on an exact `EmbeddingVector.modelId` that follows the
    // *chat's* engineChoice, so a document embedded under one provider is
    // invisible to a chat on the other — silently, with no error anywhere.
    // Embedding only the default provider left every upload since the
    // multi-provider migration reachable from one engine and not the other,
    // and `reembed-missing.ts` had to be re-run by hand to catch up.
    const primaryModel = await this.resolveEmbeddingModel();
    const secondaryModels = await this.resolveOtherActiveModels(primaryModel);

    const embeddings = await Promise.all(
      embeddableChunks.map(async (chunk) => {
        const input = chunk.text;

        const primaryVector = await this.llmService.createEmbedding(
          input,
          primaryModel.provider as EngineChoice,
        );

        // A secondary provider being down must not block ingestion under the
        // primary one, but it must not pass unnoticed either — `error` level
        // survives production log filtering, and the gap is recoverable with
        // `scripts/reembed-missing.ts --provider <name>`.
        const extraVectors: Array<{ modelId: string; embedding: number[] }> =
          [];
        for (const model of secondaryModels) {
          try {
            const vector = await this.llmService.createEmbedding(
              input,
              model.provider as EngineChoice,
            );
            extraVectors.push({
              modelId: model.id,
              embedding: vector.data[0].embedding,
            });
          } catch (error) {
            this.logger.error(
              `Failed to embed a chunk of document ${fileId} under ` +
                `${model.provider}/${model.model}; that provider's chats will ` +
                `not retrieve this document until ` +
                `\`reembed-missing.ts --provider ${model.provider}\` is run:`,
              error,
            );
          }
        }

        return {
          embedding: primaryVector.data[0].embedding,
          documentId: fileId,
          text: input,
          documentPageNumber: String(chunk.metadata.page_number),
          chunk,
          modelId: primaryModel.id,
          extraVectors,
        };
      }),
    );

    // this.logger.debug(embeddings);

    // Embedding a document is a REPLACE, not an append. Re-embedding (the
    // Reprocess action, or any repeat of the pipeline) used to leave the old
    // rows in place and add a full second set, so the same chunk competed with
    // itself for the top-N slots — retrieval has no DISTINCT — and the
    // duplication compounded on every run. Clear first, then write.
    const replaced =
      await this.embeddingService.removeEmbeddingsForDocument(fileId);
    if (replaced > 0) {
      this.logger.log(
        `Replacing ${replaced} existing embedding(s) for document ${fileId}`,
      );
    }

    await Promise.all(
      embeddings.map(async (embedding) => {
        await this.embeddingService.createEmbedding(embedding);
      }),
    );

    // Report what actually landed per model, not what was attempted — a
    // secondary provider can fail per chunk, and a summary that names it
    // regardless is the same false "success" that hid the empty-embed bug.
    const writtenPerModel = new Map<string, number>([
      [primaryModel.id, embeddings.length],
    ]);
    for (const embedding of embeddings) {
      for (const vector of embedding.extraVectors) {
        writtenPerModel.set(
          vector.modelId,
          (writtenPerModel.get(vector.modelId) ?? 0) + 1,
        );
      }
    }

    const total = embeddableChunks.length;
    const summary = [primaryModel, ...secondaryModels]
      .map(
        (model) =>
          `${model.provider}/${model.model} ` +
          `${writtenPerModel.get(model.id) ?? 0}/${total}`,
      )
      .join(', ');
    const incomplete = [primaryModel, ...secondaryModels].filter(
      (model) => (writtenPerModel.get(model.id) ?? 0) < total,
    );

    const message =
      `Embedded document ${fileId} — chunks written per model: ${summary}`;
    if (incomplete.length > 0) {
      this.logger.error(
        `${message}. Incomplete for ${incomplete
          .map((model) => model.provider)
          .join(', ')} — chats on ` +
          `${incomplete.length > 1 ? 'those engines' : 'that engine'} will not ` +
          `fully retrieve this document.`,
      );
    } else {
      this.logger.log(message);
    }

    return {
      message: 'Document chunks embedded successfully',
    };
  }

  async removeEmbeddings(fileId: string) {
    const document = await this.databaseDocumentService.document({
      id: fileId,
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // `forEach` with an async callback does not await: this used to report
    // "removed successfully" while the deletes were still in flight, and
    // swallowed any that failed. One statement, awaited.
    const removed =
      await this.embeddingService.removeEmbeddingsForDocument(fileId);

    return {
      message: 'Document embeddings removed successfully',
      removed,
    };
  }

  async queryDocument(
    query: string,
    fileIds?: string[],
    pageNumber?: number,
    n: number = 5,
    oMode?: boolean,
    materialId?: string,
    engineChoice?: EngineChoice,
  ) {
    let embeddingFilter;

    // NEW: resolve effective IDs
    let targetIds: string[] | undefined = fileIds;

    if ((!targetIds || targetIds.length === 0) && materialId) {
      targetIds = await this.resolveLlmDocIdsForMaterial(materialId);
    }

    if (targetIds && Array.isArray(targetIds) && targetIds.length > 0) {
      if (pageNumber) {
        embeddingFilter = {
          documentId: { in: targetIds },
          documentPageNumber: String(pageNumber),
        };
      } else {
        embeddingFilter = {
          documentId: { in: targetIds },
        };
      }
    } else {
      // Optional: you could also throw 400 here if you require at least one doc
      embeddingFilter = {};
    }

    const embeddings = await this.embeddingService.embeddings({
      where: embeddingFilter,
    });

    if (!embeddings || embeddings.length === 0) {
      // throw new Error('Document not found or not embedded yet');
      return {
        message: 'No documents found for this query.',
        results: [],
      };
    }

    // Embed the query with the SAME model the chunks were embedded with, and
    // restrict the similarity search to that model's vectors. The embedding
    // provider follows the chat engineChoice when given (falling back to the
    // EMBEDDING_PROVIDER env / openai default).
    const embeddingModel = await this.resolveEmbeddingModel(engineChoice);
    const queryEmbeddingRequest = await this.llmService.createEmbedding(
      query,
      embeddingModel.provider as EngineChoice,
    );

    const queryEmbedding = queryEmbeddingRequest.data[0].embedding;

    const nearestEmbeddings = await this.embeddingService.nearestNNeighbors({
      embedding: queryEmbedding,
      n: n,
      fileIds: fileIds,
      pageNumber: String(pageNumber),
      oMode,
      modelId: embeddingModel.id,
      dimensions: embeddingModel.dimensions ?? undefined,
    });

    return {
      message: 'Document queried successfully',
      results: nearestEmbeddings,
    };
  }

  async retrieveDocument(fileId: string) {
    const document = await this.databaseDocumentService.document({
      id: fileId,
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Retrieve document from storage
    const signedUrl = await this.storageService.generateSignedUrl(
      document.fileUrl,
    );

    if (!signedUrl) {
      this.logger.debug('old format');
      return {
        message: 'Document retrieved successfully',
        document: {
          id: fileId,
          fileName: document.fileName,
          documentContent: document.fileUrl,
          chunks: document.chunks,
        },
      };
    }

    return {
      message: 'Document retrieved successfully',
      document: {
        id: fileId,
        fileName: document.fileName,
        documentContent: signedUrl,
        chunks: document.chunks,
      },
    };
  }

  async getDocumentInfoById(documentId: string) {
    const document = await this.databaseDocumentService.document({
      id: documentId,
    });
    if (!document) {
      throw new Error('Document not found');
    }
    return {
      id: document.id,
      materialId: document.classMaterialId,
      fileName: document.fileName,
      uploadedDate: document.uploadedDate,
    };
  }

  async getDocumentsByMaterialId(classMaterialId: string) {
    const documents = await this.databaseDocumentService.documents({
      where: { classMaterialId },
      orderBy: {
        uploadedDate: 'desc',
      },
    });

    if (!documents || documents.length === 0) {
      this.logger.warn(
        `No documents found for classMaterialId: ${classMaterialId}`,
      );
      return {
        documents: [],
      };
    }

    return {
      documents: documents.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        uploadedDate: d.uploadedDate,
        file: d.fileUrl,
      })),
    };
  }

  async getAnsweredRecitationForRecitationById(
    reciationPDFId: string,
  ): Promise<string> {
    const recitationDoc = await this.getDocumentInfoById(reciationPDFId);
    const materialId = recitationDoc.materialId;
    if (!materialId) {
      return reciationPDFId;
    }
    const { documents } = await this.getDocumentsByMaterialId(materialId);
    if (documents.length < 2) {
      return reciationPDFId;
    }
    // get the earlist pdfId in material, which is the answered reciation file
    return documents[documents.length - 1].id;
  }

  async retrieveAllDocuments() {
    const documents = await this.databaseDocumentService.documents({});

    return documents;
  }

  async addChunk(
    documentId: string,
    chunkId: string,
    fieldName: string,
    newValue: Chunk,
  ) {
    const document = await this.databaseDocumentService.document({
      id: documentId,
    });
    if (!document) {
      throw new Error('Document not found');
    }
    const chunks = document.chunks as unknown as Chunk[];
    if (!chunks) {
      throw new Error('Document not chunked yet');
    }
    const updatedChunks = [...chunks, newValue];

    await this.databaseDocumentService.updateDocument({
      where: { id: documentId },
      data: { chunks: updatedChunks as any[] },
    });
    return {
      message: 'Chunk added successfully',
    };
  }

  async editChunk(
    documentId: string,
    chunkId: string,
    fieldName: string,
    newValue: Chunk,
  ) {
    const document = await this.databaseDocumentService.document({
      id: documentId,
    });
    if (!document) {
      throw new Error('Document not found');
    }
    const chunks = document.chunks as unknown as Chunk[];
    if (!chunks) {
      throw new Error('Document not chunked yet');
    }
    const updatedChunks = chunks.map((chunk) => {
      if (chunk.element_id === chunkId) {
        this.logger.log('element_id found');
        return newValue;
      }
      return chunk;
    });
    await this.databaseDocumentService.updateDocument({
      where: { id: documentId },
      data: { chunks: updatedChunks as any[] },
    });
    return {
      message: 'Chunk updated successfully',
    };
  }

  async deleteChunk(documentId: string, chunkId: string) {
    this.logger.log('the document id is', documentId);
    const document = await this.databaseDocumentService.document({
      id: documentId,
    });
    if (!document) {
      throw new Error('Document not found');
    }
    const { chunks } = document;
    if (!chunks) {
      throw new Error('Document has no chunks');
    }

    const updatedChunks = (chunks as any[]).filter(
      (chunk) => chunk.element_id !== chunkId,
    );
    await this.databaseDocumentService.updateDocument({
      where: { id: documentId },
      data: { chunks: updatedChunks },
    });
    return {
      message: 'Chunk deleted successfully',
    };
  }

  async migrateDocumentsToObjectStorage() {
    // This should be called once. It will migrate all documents from the database to object storage.

    const documents = await this.retrieveAllDocuments();

    if (!documents || documents.length === 0) {
      return {
        message: 'No documents found',
      };
    }

    const report = [];

    await Promise.all(
      documents.map(async (document) => {
        const { id, fileUrl, fileName } = document;

        // Check if is a valid uuid
        if (validateUuid(fileUrl)) {
          report.push({
            id,
            message: 'Document already migrated',
          });
          return;
        }

        const fileId = uuid();

        const multerFile = this.convertBase64UrlToDocument(fileUrl, fileName);

        const { key: documentKey } = await this.storageService.uploadFile(
          multerFile,
          fileId,
        );

        await this.databaseDocumentService.updateDocument({
          where: { id },
          data: { fileUrl: documentKey },
        });

        report.push({
          id,
          message: 'Document migrated successfully',
        });
        return;
      }),
    );
  }
  // method to delete a document by ID
  async deleteDocument(documentId: string): Promise<void> {
    this.logger.debug('Deleting document with ID:', documentId);

    await this.databaseDocumentService.deleteDocument(documentId);

    this.logger.debug('Document deleted successfully');
  }
  // Apply default role after a new document is created in a material.
  // Rule: first doc => STUDENT, second doc => LLM, others => NONE
  private async applyUploadRoleDefaults(
    materialId: string | null | undefined,
    newDocId: string,
  ) {
    if (!materialId) return;

    await this.db.$transaction(async (tx) => {
      const fresh = await tx.document.findUnique({
        where: { id: newDocId },
        select: { isStudent: true, isLlm: true },
      });
      if (!fresh) return;

      // Skip if caller already set flags explicitly
      if (fresh.isStudent || fresh.isLlm) return;

      // Count how many docs now exist in this material (includes the new doc)
      const count = await tx.document.count({
        where: { classMaterialId: materialId },
      });

      if (count === 1) {
        // First doc → both flags true
        await tx.document.update({
          where: { id: newDocId },
          data: { isStudent: true, isLlm: true },
        });
      } else if (count === 2) {
        // Second doc → set only isLlm
        await tx.document.update({
          where: { id: newDocId },
          data: { isLlm: true },
        });
      }
      // Else: leave both flags false
    });
  }

  public async setFlags(documentId: string, dto: SetDocumentFlagsDto) {
    // Load target doc
    const doc = await this.db.document.findUnique({
      where: { id: documentId },
      select: { id: true, classMaterialId: true, isStudent: true, isLlm: true },
    });
    if (!doc) throw new NotFoundException('Document not found');

    // Ensure caller-provided material matches
    if (!doc.classMaterialId || doc.classMaterialId !== dto.materialId) {
      throw new BadRequestException(
        'Document does not belong to the given material',
      );
    }

    // If neither flag is provided, no-op (optional: throw 400)
    if (dto.isStudent === undefined && dto.isLlm === undefined) {
      return {
        id: doc.id,
        classMaterialId: doc.classMaterialId,
        isStudent: doc.isStudent,
        isLlm: doc.isLlm,
      };
    }

    // Apply updates atomically
    return this.db.$transaction(async (tx) => {
      // (1) Handle isStudent if provided
      if (dto.isStudent !== undefined) {
        if (dto.isStudent === true) {
          // Clear any existing student selection in this material
          await tx.document.updateMany({
            where: { classMaterialId: doc.classMaterialId, isStudent: true },
            data: { isStudent: false },
          });
          // Set this doc as student
          await tx.document.update({
            where: { id: doc.id },
            data: { isStudent: true },
          });
        } else {
          // Explicitly clear student flag on this doc
          await tx.document.update({
            where: { id: doc.id },
            data: { isStudent: false },
          });
        }
      }

      // (2) Handle isLlm if provided
      if (dto.isLlm !== undefined) {
        await tx.document.update({
          where: { id: doc.id },
          data: { isLlm: dto.isLlm },
        });
      }

      // (3) Return updated state
      return tx.document.findUnique({
        where: { id: doc.id },
        select: {
          id: true,
          classMaterialId: true,
          isStudent: true,
          isLlm: true,
        },
      });
    });
  }
  private async resolveLlmDocIdsForMaterial(
    materialId: string,
  ): Promise<string[]> {
    // 1) All isLlm docs
    const llmDocs = await this.db.document.findMany({
      where: { classMaterialId: materialId, isLlm: true },
      select: { id: true },
      orderBy: { uploadedDate: 'asc' }, // order doesn't matter much; deterministic
    });
    if (llmDocs.length > 0) return llmDocs.map((d) => d.id);

    // 2) Fallback: the student-visible doc (unique by your service logic)
    const studentDoc = await this.db.document.findFirst({
      where: { classMaterialId: materialId, isStudent: true },
      select: { id: true },
    });
    if (studentDoc) return [studentDoc.id];

    // 3) Fallback: the latest uploaded document
    const latest = await this.db.document.findFirst({
      where: { classMaterialId: materialId },
      select: { id: true },
      orderBy: { uploadedDate: 'desc' },
    });
    return latest ? [latest.id] : [];
  }

  async createDocumentComment(
    documentId: string,
    authorId: string,
    dto: CreateDocumentCommentDto,
  ) {
    if (!authorId) {
      throw new UnauthorizedException('User session is required');
    }

    const document = await this.ensureInstructorDocumentAccess(
      documentId,
      authorId,
    );

    const trimmedText = dto.text?.trim();
    if (!trimmedText) {
      throw new BadRequestException('Comment text cannot be empty');
    }

    const created = await this.documentCommentService.createDocumentComment({
      documentId: document.id,
      authorId,
      pageNumber: dto.pageNumber,
      text: trimmedText,
      isVisible: dto.isVisibleToStudents ?? true,
      selectionRegion: dto.selectionRegion ?? null,
      pinPosition: dto.pinPosition ?? null,
    });

    const withAuthor = await this.documentCommentService.findUnique({
      where: { id: created.id },
      include: { author: true },
    });

    return {
      comment: this.toDocumentCommentDto(withAuthor!),
    };
  }

  async listDocumentComments(documentId: string, userId: string) {
    if (!userId) {
      throw new UnauthorizedException('User session is required');
    }

    await this.ensureInstructorDocumentAccess(documentId, userId);

    const comments = await this.documentCommentService.documentComments({
      where: { documentId },
      orderBy: { createdAt: 'asc' },
      include: { author: true },
    });

    return {
      comments: comments.map((comment) => this.toDocumentCommentDto(comment)),
    };
  }

  async updateDocumentCommentVisibility(
    documentId: string,
    commentId: string,
    userId: string,
    dto: UpdateDocumentCommentVisibilityDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User session is required');
    }

    await this.ensureInstructorDocumentAccess(documentId, userId);

    const existing = await this.documentCommentService.findUnique({
      where: { id: commentId },
    });

    if (!existing || existing.documentId !== documentId) {
      throw new NotFoundException('Comment not found');
    }

    const updateData: any = {};
    if (dto.isVisibleToStudents !== undefined) {
      updateData.isVisible = dto.isVisibleToStudents;
    }
    if (dto.text !== undefined) {
      const trimmedText = dto.text.trim();
      if (!trimmedText) {
        throw new BadRequestException('Comment text cannot be empty');
      }
      updateData.text = trimmedText;
    }
    if (dto.pinPosition !== undefined) {
      updateData.pinPosition = dto.pinPosition;
    }

    await this.documentCommentService.updateDocumentComment({
      where: { id: commentId },
      data: updateData,
    });

    const updated = await this.documentCommentService.findUnique({
      where: { id: commentId },
      include: { author: true },
    });

    return {
      comment: this.toDocumentCommentDto(updated!),
    };
  }

  async deleteDocumentComment(
    documentId: string,
    commentId: string,
    userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User session is required');
    }

    await this.ensureInstructorDocumentAccess(documentId, userId);

    const existing = await this.documentCommentService.findUnique({
      where: { id: commentId },
    });

    if (!existing || existing.documentId !== documentId) {
      throw new NotFoundException('Comment not found');
    }

    await this.documentCommentService.deleteDocumentComment({ id: commentId });

    return { id: commentId };
  }

  async listVisibleDocumentCommentsForStudent(
    documentId: string,
    userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User session is required');
    }

    await this.ensureStudentDocumentAccess(documentId, userId);

    const comments = await this.documentCommentService.documentComments({
      where: { documentId, isVisible: true },
      orderBy: { createdAt: 'asc' },
      include: { author: true },
    });

    return {
      comments: comments.map((comment) => this.toDocumentCommentDto(comment)),
    };
  }

  private toDocumentCommentDto(
    comment: DocumentComment & { author?: User | null },
  ) {
    const authorName = comment.author?.stringTag
      ? String(comment.author.stringTag).trim() || undefined
      : undefined;

    return {
      id: comment.id,
      documentId: comment.documentId,
      pageNumber: comment.pageNumber,
      text: comment.text,
      isVisibleToStudents: comment.isVisible,
      selectionRegion: comment.selectionRegion || undefined,
      pinPosition: comment.pinPosition || undefined,
      authorId: comment.authorId,
      author: {
        id: comment.authorId,
        name: authorName || comment.author?.email,
        email: comment.author?.email,
      },
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  private async ensureInstructorDocumentAccess(
    documentId: string,
    userId: string,
  ): Promise<DocumentWithClassMaterial> {
    const document = await this.loadDocumentWithClass(documentId);

    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { systemRole: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.systemRole === 'admin') {
      return document;
    }

    const classId = document.classMaterial!.classId;

    if (user.systemRole === 'professor') {
      const enrollment = await this.db.enrollment.findFirst({
        where: { classId, userId, role: 'professor' },
      });
      if (enrollment) {
        return document;
      }
    }

    if (user.systemRole === 'instructor') {
      const hasPermission = await this.instructorClassService.checkInstructorPermission(
        userId,
        classId,
        'canManageMaterials',
      );
      if (hasPermission) {
        return document;
      }
    }

    throw new UnauthorizedException(
      'User does not have permission to manage this document',
    );
  }

  private async ensureStudentDocumentAccess(
    documentId: string,
    userId: string,
  ): Promise<DocumentWithClassMaterial> {
    const document = await this.loadDocumentWithClass(documentId);

    const enrollment = await this.db.enrollment.findFirst({
      where: { classId: document.classMaterial!.classId, userId },
    });

    if (!enrollment) {
      throw new UnauthorizedException(
        'User is not enrolled in the class for this document',
      );
    }

    return document;
  }

  private async loadDocumentWithClass(
    documentId: string,
  ): Promise<DocumentWithClassMaterial> {
    const document = await this.databaseDocumentService.documentWithClassMaterial({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!document.classMaterial || !document.classMaterialId) {
      throw new BadRequestException('Document is not associated with a class');
    }

    return document;
  }

  async createDocumentSummary(
    documentId: string,
    authorId: string,
    dto: CreateDocumentSummaryDto,
  ) {
    if (!authorId) {
      throw new UnauthorizedException('User session is required');
    }

    const document = await this.ensureInstructorDocumentAccess(
      documentId,
      authorId,
    );

    const trimmedContent = dto.content?.trim();
    if (!trimmedContent) {
      throw new BadRequestException('Summary content cannot be empty');
    }

    const created = await this.documentSummaryService.createDocumentSummary({
      documentId: document.id,
      authorId,
      content: trimmedContent,
      isVisibleToStudents: dto.isVisibleToStudents ?? true,
    });

    const withAuthor = await this.documentSummaryService.findUnique({
      where: { id: created.id },
      include: { author: true },
    });

    return {
      summary: this.toDocumentSummaryDto(withAuthor!),
    };
  }

  async listDocumentSummaries(documentId: string, userId: string) {
    if (!userId) {
      throw new UnauthorizedException('User session is required');
    }

    await this.ensureInstructorDocumentAccess(documentId, userId);

    const summaries = await this.documentSummaryService.documentSummaries({
      where: { documentId },
      orderBy: { summaryNumber: 'asc' },
      include: { author: true },
    });

    return {
      summaries: summaries.map((summary) => this.toDocumentSummaryDto(summary)),
    };
  }

  async updateDocumentSummary(
    documentId: string,
    summaryId: string,
    userId: string,
    dto: UpdateDocumentSummaryDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User session is required');
    }

    await this.ensureInstructorDocumentAccess(documentId, userId);

    const existing = await this.documentSummaryService.findUnique({
      where: { id: summaryId },
    });

    if (!existing || existing.documentId !== documentId) {
      throw new NotFoundException('Summary not found');
    }

    const updateData: any = {};
    if (dto.isVisibleToStudents !== undefined) {
      updateData.isVisibleToStudents = dto.isVisibleToStudents;
    }
    if (dto.content !== undefined) {
      const trimmedContent = dto.content.trim();
      if (!trimmedContent) {
        throw new BadRequestException('Summary content cannot be empty');
      }
      updateData.content = trimmedContent;
    }

    await this.documentSummaryService.updateDocumentSummary({
      where: { id: summaryId },
      data: updateData,
    });

    const updated = await this.documentSummaryService.findUnique({
      where: { id: summaryId },
      include: { author: true },
    });

    return {
      summary: this.toDocumentSummaryDto(updated!),
    };
  }

  async deleteDocumentSummary(
    documentId: string,
    summaryId: string,
    userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User session is required');
    }

    await this.ensureInstructorDocumentAccess(documentId, userId);

    const existing = await this.documentSummaryService.findUnique({
      where: { id: summaryId },
    });

    if (!existing || existing.documentId !== documentId) {
      throw new NotFoundException('Summary not found');
    }

    await this.documentSummaryService.deleteDocumentSummary({ id: summaryId });

    return { id: summaryId };
  }

  async listVisibleDocumentSummariesForStudent(
    documentId: string,
    userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User session is required');
    }

    await this.ensureStudentDocumentAccess(documentId, userId);

    const summaries = await this.documentSummaryService.documentSummaries({
      where: { documentId, isVisibleToStudents: true },
      orderBy: { summaryNumber: 'asc' },
      include: { author: true },
    });

    return {
      summaries: summaries.map((summary) => this.toDocumentSummaryDto(summary)),
    };
  }

  private toDocumentSummaryDto(
    summary: DocumentSummary & { author?: User | null },
  ) {
    const authorName = summary.author?.stringTag
      ? String(summary.author.stringTag).trim() || undefined
      : undefined;

    return {
      id: summary.id,
      documentId: summary.documentId,
      summaryNumber: summary.summaryNumber,
      content: summary.content,
      isVisibleToStudents: summary.isVisibleToStudents,
      authorId: summary.authorId,
      author: {
        id: summary.authorId,
        name: authorName || summary.author?.email,
        email: summary.author?.email,
      },
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    };
  }
}
