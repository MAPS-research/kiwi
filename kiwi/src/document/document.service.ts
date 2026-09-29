import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClassMaterialService } from 'src/common/database/class-material.service';
import { DocumentService as DatabaseDocumentService } from 'src/common/database/document.service';
import { EmbeddingService } from 'src/common/database/embedding.service';
import { LlmService } from 'src/common/llm/llm.service';
import { EngineChoice } from 'src/common/llm/interfaces/engine-config';
import { ConfigService } from '@nestjs/config';
import { EmbeddingModel, Prisma } from '@prisma/client';
import { Chunk } from './dto/chunk-request.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { isUUID } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { StorageService } from 'src/common/storage/storage.service';
import { DatabaseService } from 'src/common/database/database.service';
import { SetDocumentFlagsDto } from './dto/set-document-flags.dto';
import { DocumentCommentService } from 'src/common/database/document-comment.service';
import { DocumentSummaryService } from 'src/common/database/document-summary.service';
import {
  CreateDocumentCommentDto,
  UpdateDocumentCommentVisibilityDto,
} from './dto/document-comment.dto';
import {
  CreateDocumentSummaryDto,
  UpdateDocumentSummaryDto,
} from './dto/document-summary.dto';
import {
  AnnotationAudience,
  DocumentComment,
  DocumentRole,
  DocumentSummary,
  User,
} from '@prisma/client';
import { MaterialType } from 'src/class/material/dto/material-enum';
import { MaterialAccessService } from 'src/class/material/material-access.service';
import { MaterialPermissionService } from 'src/class/material/material-permission.service';
import { DocumentWithClassMaterial } from 'src/common/database/document.service';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  constructor(
    private databaseDocumentService: DatabaseDocumentService,
    private embeddingService: EmbeddingService,
    private llmService: LlmService,
    private classMaterialService: ClassMaterialService,
    private documentCommentService: DocumentCommentService,
    private documentSummaryService: DocumentSummaryService,
    private storageService: StorageService,
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
    private readonly materialAccessService: MaterialAccessService,
    private readonly materialPermissionService: MaterialPermissionService,
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
    const documentId = randomUUID();

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

  /**
   * Upload into a material and start processing: one request instead of the
   * six round trips the browser used to make.
   *
   * Returns as soon as the file is stored and the job is queued. Progress lives
   * on the document row from here on, so closing the tab is no longer an event.
   */
  async uploadDocumentToMaterial(
    file: Express.Multer.File,
    classMaterialId: string,
    role?: DocumentRole,
  ) {
    const documentId = randomUUID();
    const { key: documentKey } = await this.storageService.uploadFile(
      file,
      documentId,
    );

    const document = await this.databaseDocumentService.createDocument({
      fileName: file.originalname,
      fileUrl: documentKey,
      classMaterialId,
    });

    if (role) {
      await this.setDocumentRole(document.id, role);
    } else {
      await this.applyUploadRoleDefaults(classMaterialId, document.id);
    }

    const { jobId } = await this.queueDocumentPipeline(document.id);

    return {
      documentId: document.id,
      jobId: jobId ?? null,
      processingStatus: 'PENDING',
    };
  }

  /**
   * Swap the file behind an existing document and re-run the pipeline.
   *
   * The row is kept deliberately. Everything that points at a document points
   * at its id — instructor comments and summaries, citations already sitting in
   * chat transcripts, the pdfId on every recorded interaction, analytics — so
   * replacing by creating a new row and deleting the old one would strand all
   * of it. Keeping the row means there is nothing to migrate.
   *
   * The pipeline overwrites chunks and replaces embeddings, so the old file's
   * traces are gone once processing finishes. Page-anchored comments stay
   * correct; a comment's pin coordinates can drift if the new file paginates
   * differently, which is why the UI warns before doing this.
   */
  async replaceDocumentFile(documentId: string, file: Express.Multer.File) {
    const existing = await this.db.document.findUnique({
      where: { id: documentId },
      select: { id: true, fileUrl: true, classMaterialId: true },
    });
    if (!existing) throw new NotFoundException('Document not found');

    const { key: newKey } = await this.storageService.uploadFile(
      file,
      randomUUID(),
    );

    await this.db.document.update({
      where: { id: documentId },
      data: {
        fileName: file.originalname,
        fileUrl: newKey,
        chunks: Prisma.DbNull,
        processingStatus: 'PENDING',
        processingStage: null,
        processingError: null,
        processedAt: null,
      },
    });

    // Only after the row points at the new object, and never fatally: an
    // orphaned file costs storage, a missing one costs the document.
    if (existing.fileUrl && existing.fileUrl !== newKey) {
      try {
        await this.storageService.deleteFile(existing.fileUrl);
      } catch (error) {
        this.logger.error(
          `Replaced the file for document ${documentId} but could not remove ` +
            `the previous object (${existing.fileUrl}):`,
          error,
        );
      }
    }

    const { jobId } = await this.queueDocumentPipeline(documentId);

    return { documentId, jobId: jobId ?? null, processingStatus: 'PENDING' };
  }

  /**
   * Say what a document is for its material.
   *
   * Both single-copy roles free the slot before claiming it, because the
   * partial unique indexes reject a second student copy or answer key outright.
   * The deprecated flags are written as a projection so the old endpoints keep
   * agreeing with this one until they are removed.
   */
  async setDocumentRole(documentId: string, role: DocumentRole) {
    const document = await this.db.document.findUnique({
      where: { id: documentId },
      select: { id: true, classMaterialId: true },
    });
    if (!document) throw new NotFoundException('Document not found');
    if (!document.classMaterialId) {
      throw new BadRequestException('Document is not attached to a material');
    }

    const materialId = document.classMaterialId;

    return this.db.$transaction(async (tx) => {
      const material = await tx.classMaterial.findUnique({
        where: { id: materialId },
        select: { materialType: true },
      });

      if (
        role === 'ANSWER' &&
        material?.materialType !== MaterialType.ASSIGNMENT
      ) {
        throw new BadRequestException(
          'Only a recitation can have an answer key. Use REFERENCE for ' +
            'supplementary lecture material.',
        );
      }

      if (role === 'STUDENT' || role === 'ANSWER') {
        await tx.document.updateMany({
          where: { classMaterialId: materialId, role, id: { not: documentId } },
          data:
            role === 'STUDENT'
              ? { role: 'REFERENCE', isStudent: false }
              : { role: 'REFERENCE' },
        });
      }

      return tx.document.update({
        where: { id: documentId },
        data: {
          role,
          isStudent: role === 'STUDENT',
          isLlm: role !== 'REFERENCE',
        },
        select: { id: true, classMaterialId: true, role: true },
      });
    });
  }

  /**
   * Processing state lives on the document row, not in a browser tab.
   *
   * The three stage methods record their own transitions rather than leaving it
   * to whoever calls them, so the queued pipeline and the legacy
   * chunk/describe/embed sequence walk the same state machine and a document
   * ends up READY either way.
   */
  async markProcessingStage(
    documentId: string,
    stage: 'chunking' | 'describing' | 'embedding',
  ) {
    await this.db.document.update({
      where: { id: documentId },
      data: {
        processingStatus: 'PROCESSING',
        processingStage: stage,
        processingError: null,
      },
    });
  }

  /** Public so the queue consumer can record a failure in the one stage that
   * runs there rather than in this service (chunking). */
  async markProcessingFailed(documentId: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Truncated: some upstream errors carry a whole response body, and this
    // column is read straight into the instructor's UI.
    await this.db.document.update({
      where: { id: documentId },
      data: {
        processingStatus: 'FAILED',
        processingError: message.slice(0, 1000),
      },
    });
  }

  private async markProcessingReady(documentId: string) {
    await this.db.document.update({
      where: { id: documentId },
      data: {
        processingStatus: 'READY',
        processingStage: null,
        processingError: null,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Queue the whole pipeline for a document. Retries are BullMQ's, so a
   * provider blip does not need an instructor to notice and click anything.
   */
  async queueDocumentPipeline(documentId: string) {
    const job = await this.documentQueue.add(
      'processDocument',
      { documentId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    );

    return { jobId: job.id, documentId };
  }

  /**
   * Re-run the pipeline for an existing document. Every stage is a replace, so
   * this needs no cleanup — the reset exists to release a document stuck in
   * PROCESSING by a worker that died mid-run, which the queue itself cannot
   * distinguish from one still working.
   */
  async reprocessDocument(documentId: string) {
    const document = await this.db.document.findUnique({
      where: { id: documentId },
      select: { id: true },
    });
    if (!document) throw new NotFoundException('Document not found');

    await this.db.document.update({
      where: { id: documentId },
      data: {
        processingStatus: 'PENDING',
        processingStage: null,
        processingError: null,
      },
    });

    return this.queueDocumentPipeline(documentId);
  }

  /** What the instructor's UI polls: the row, not the job. */
  async getProcessingStatus(documentId: string) {
    const document = await this.db.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        fileName: true,
        role: true,
        processingStatus: true,
        processingStage: true,
        processingError: true,
        processedAt: true,
      },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
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

    await this.markProcessingStage(fileId, 'describing');

    try {
      return await this.describeImageChunksInner(fileId, documentChunks);
    } catch (error) {
      await this.markProcessingFailed(fileId, error);
      throw error;
    }
  }

  private async describeImageChunksInner(
    fileId: string,
    documentChunks: unknown,
  ) {
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

    await this.markProcessingStage(fileId, 'embedding');

    try {
      return await this.embedDocumentInner(fileId, chunks);
    } catch (error) {
      // Includes the deliberate "no embeddable chunks" throw below, which is
      // exactly the half-processed state this column exists to surface.
      await this.markProcessingFailed(fileId, error);
      throw error;
    }
  }

  private async embedDocumentInner(fileId: string, chunks: unknown) {
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

    const message = `Embedded document ${fileId} — chunks written per model: ${summary}`;
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

    await this.markProcessingReady(fileId);

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

  async retrieveDocument(fileId: string, userId?: string) {
    const document = await this.databaseDocumentService.document({
      id: fileId,
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Staff read anything in their class; everyone else gets the student copy
    // of a released material and nothing else.
    if (userId) {
      const allowed = await this.materialPermissionService.canReadDocument(
        userId,
        fileId,
      );
      if (!allowed) {
        throw new ForbiddenException('You do not have access to this document');
      }
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
        if (isUUID(fileUrl)) {
          report.push({
            id,
            message: 'Document already migrated',
          });
          return;
        }

        const fileId = randomUUID();

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

    const document = await this.db.document.findUnique({
      where: { id: documentId },
      select: { fileUrl: true },
    });

    await this.databaseDocumentService.deleteDocument(documentId);

    // After the row, never before: a storage failure that ran first would
    // leave a row pointing at an object that no longer exists. This way the
    // worst case is an orphaned file, which costs space and nothing else.
    if (document?.fileUrl) {
      try {
        await this.storageService.deleteFile(document.fileUrl);
      } catch (error) {
        this.logger.error(
          `Deleted document ${documentId} but could not remove its file ` +
            `(${document.fileUrl}); it is now orphaned in the bucket:`,
          error,
        );
      }
    }

    this.logger.debug('Document deleted successfully');
  }
  // Default role for a document uploaded through the legacy endpoint, which
  // carries no role of its own: the first upload is the student copy, a second
  // one is the answer key when the material is a recitation (a lecture never
  // gets one), and anything after that is reference material.
  //
  // The positional convention survives only until the upload API takes an
  // explicit role. What changed is that it now writes `role` alongside the
  // deprecated flags, so the two representations cannot drift while both exist.
  private async applyUploadRoleDefaults(
    materialId: string | null | undefined,
    newDocId: string,
  ) {
    if (!materialId) return;

    await this.db.$transaction(async (tx) => {
      const fresh = await tx.document.findUnique({
        where: { id: newDocId },
        select: { isStudent: true, isLlm: true, role: true },
      });
      if (!fresh) return;

      // Skip if the caller already said what this document is.
      if (fresh.isStudent || fresh.isLlm || fresh.role !== 'REFERENCE') return;

      // Count how many docs now exist in this material (includes the new doc)
      const count = await tx.document.count({
        where: { classMaterialId: materialId },
      });

      if (count === 1) {
        // First upload: what students see, and what the model reads until an
        // answer key shows up.
        await tx.document.update({
          where: { id: newDocId },
          data: { role: 'STUDENT', isStudent: true, isLlm: true },
        });
        return;
      }

      if (count === 2) {
        const material = await tx.classMaterial.findUnique({
          where: { id: materialId },
          select: { materialType: true },
        });
        const takesAnswer =
          material?.materialType === MaterialType.ASSIGNMENT &&
          (await tx.document.count({
            where: { classMaterialId: materialId, role: 'ANSWER' },
          })) === 0;

        await tx.document.update({
          where: { id: newDocId },
          data: { role: takesAnswer ? 'ANSWER' : 'REFERENCE', isLlm: true },
        });
      }
      // Else: reference material, the column default.
    });
  }

  /**
   * Legacy flag endpoint, kept working while the frontend still calls it.
   *
   * The flags are now a projection of `role`, so this translates rather than
   * stores: student copy wins over answer key, and only a recitation can have
   * an answer key at all. The read-then-updateMany dance that used to enforce
   * "one student copy per material" is gone — a partial unique index does it,
   * which also makes it safe under concurrent edits.
   */
  public async setFlags(documentId: string, dto: SetDocumentFlagsDto) {
    const doc = await this.db.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        classMaterialId: true,
        isStudent: true,
        isLlm: true,
        role: true,
      },
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
        role: doc.role,
      };
    }

    const materialId = doc.classMaterialId;
    const isStudent = dto.isStudent ?? doc.isStudent;
    const isLlm = dto.isLlm ?? doc.isLlm;

    return this.db.$transaction(async (tx) => {
      const material = await tx.classMaterial.findUnique({
        where: { id: materialId },
        select: { materialType: true },
      });

      let role: DocumentRole;
      if (isStudent) {
        role = 'STUDENT';
      } else if (isLlm && material?.materialType === MaterialType.ASSIGNMENT) {
        role = 'ANSWER';
      } else {
        role = 'REFERENCE';
      }

      // Free the slot before claiming it, or the unique index rejects the write.
      if (role === 'STUDENT' || role === 'ANSWER') {
        await tx.document.updateMany({
          where: { classMaterialId: materialId, role, id: { not: doc.id } },
          data:
            role === 'STUDENT'
              ? { role: 'REFERENCE', isStudent: false }
              : { role: 'REFERENCE' },
        });
      }

      await tx.document.update({
        where: { id: doc.id },
        data: { role, isStudent, isLlm },
      });

      return tx.document.findUnique({
        where: { id: doc.id },
        select: {
          id: true,
          classMaterialId: true,
          isStudent: true,
          isLlm: true,
          role: true,
        },
      });
    });
  }

  private async resolveLlmDocIdsForMaterial(
    materialId: string,
  ): Promise<string[]> {
    // Was a three-step flag fallback ending in "the latest upload" — which on a
    // material with no flags set is the answer key. One rule, one place now.
    return this.materialAccessService.getLlmDocumentIds(materialId);
  }

  /**
   * The audience a write should land on. An explicit `audience` wins; the old
   * boolean maps to the two tiers it could express, and TUTOR is reachable only
   * by asking for it — a note hidden from students is not silently promoted
   * into the tutor's prompt.
   */
  private resolveAudience(
    dto: { audience?: AnnotationAudience; isVisibleToStudents?: boolean },
    current?: AnnotationAudience,
  ): AnnotationAudience | undefined {
    if (dto.audience) return dto.audience;
    if (dto.isVisibleToStudents === undefined) return undefined;
    if (dto.isVisibleToStudents) return 'STUDENT';
    // Keep STAFF as STAFF; only demote a student-visible note.
    return current === 'TUTOR' ? 'TUTOR' : 'STAFF';
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
      audience: this.resolveAudience(dto) ?? 'STUDENT',
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
    const audience = this.resolveAudience(dto, existing.audience);
    if (audience) {
      updateData.audience = audience;
      // Keep the deprecated flag a faithful projection of the new column.
      updateData.isVisible = audience === 'STUDENT';
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
      // `audience`, not `isVisible`: a note hidden from students may still be
      // written for the tutor, and that tier did not exist before.
      where: { documentId, audience: 'STUDENT' },
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
      audience: comment.audience,
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

    const allowed = await this.materialPermissionService.canManageClass(
      userId,
      document.classMaterial!.classId,
    );

    if (!allowed) {
      throw new UnauthorizedException(
        'User does not have permission to manage this document',
      );
    }

    return document;
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

  /** Throws unless the user may manage materials of the material's class. */
  async assertCanManageMaterial(userId: string, materialId: string) {
    const material = materialId
      ? await this.db.classMaterial.findUnique({
          where: { id: materialId },
          select: { classId: true },
        })
      : null;
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    if (
      !(await this.materialPermissionService.canManageClass(
        userId,
        material.classId,
      ))
    ) {
      throw new ForbiddenException(
        'User does not have permission to manage materials in this class',
      );
    }
  }

  /**
   * Whether a user may read a document: the rule lives in
   * MaterialPermissionService.canReadDocument (staff read anything in their
   * class; students get only the student copy of a released material). A
   * refusal is reported as not found so document ids can't be probed.
   */
  async assertCanReadDocument(documentId: string, userId: string) {
    if (
      !userId ||
      !(await this.materialPermissionService.canReadDocument(userId, documentId))
    ) {
      throw new NotFoundException('Document not found');
    }
  }

  /** Chunking status, only for managers of the document's class. */
  async chunkDocumentStatusFor(jobId: string, userId: string) {
    const job = await this.documentQueue.getJob(jobId);
    const fileId = job?.data?.fileId as string | undefined;
    const classId = fileId
      ? (
          await this.db.document.findUnique({
            where: { id: fileId },
            select: { classMaterial: { select: { classId: true } } },
          })
        )?.classMaterial?.classId
      : undefined;
    if (
      !job ||
      !classId ||
      !(await this.materialPermissionService.canManageClass(userId, classId))
    ) {
      return { message: 'Job not found' };
    }
    return this.chunkDocumentStatus(jobId);
  }

  private async loadDocumentWithClass(
    documentId: string,
  ): Promise<DocumentWithClassMaterial> {
    const document =
      await this.databaseDocumentService.documentWithClassMaterial({
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
      audience: this.resolveAudience(dto) ?? 'STUDENT',
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
    const audience = this.resolveAudience(dto, existing.audience);
    if (audience) {
      updateData.audience = audience;
      updateData.isVisibleToStudents = audience === 'STUDENT';
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
      where: { documentId, audience: 'STUDENT' },
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
      audience: summary.audience,
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
