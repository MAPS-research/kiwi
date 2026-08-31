import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';
import { MaterialService } from 'src/class/material/material.service';
import {
  ChunkCursor,
  decodeChunkCursor,
  encodeChunkCursor,
} from './utils/chunk-cursor';

export interface AppChunk {
  chunkId: string;
  index: number;
  pageNumber: number | null;
  type: string;
  text: string;
}

export interface AppDocumentChunks {
  documentId: string;
  fileName: string;
  totalChunks: number;
  chunks: AppChunk[];
}

export interface ClassDocumentChunksResult {
  classId: string;
  documents: AppDocumentChunks[];
  nextCursor: string | null;
  hasMore: boolean;
}

const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;
const MAX_CHUNK_TEXT_CHARS = 8000;

/**
 * Parsers have written page numbers as both numbers and numeric strings; the
 * DTO promises `number | null`, so coerce what is coercible and drop the rest.
 */
function toPageNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Read-only access to the parsed text chunks of class documents, for external
 * Kiwi Apps (issue #218). Chunks live as a JSON array on `Document.chunks`;
 * ordering is documents by id ASC, then chunk array position — deterministic
 * across pages. Pagination is by total chunks per page across documents, with
 * an opaque cursor.
 */
@Injectable()
export class AppChunksService {
  private readonly logger = new Logger(AppChunksService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly materialService: MaterialService,
  ) {}

  async getClassDocumentChunks(params: {
    classId: string;
    documentIds?: string[];
    cursor?: string;
    limit?: number;
  }): Promise<ClassDocumentChunksResult> {
    const { classId, documentIds } = params;
    const limit = Math.min(
      Math.max(params.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const cursor: ChunkCursor | undefined = params.cursor
      ? decodeChunkCursor(params.cursor)
      : undefined;

    // Availability/time-gated materials only — same gate students see.
    const { materials } = await this.materialService.list(classId);
    if (!materials.length) {
      return { classId, documents: [], nextCursor: null, hasMore: false };
    }

    // Id list only; chunk JSON is loaded per document below so one request
    // never materializes every document's chunks at once.
    const docRows = await this.db.document.findMany({
      where: {
        classMaterialId: { in: materials.map((m) => m.id) },
        ...(documentIds?.length ? { id: { in: documentIds } } : {}),
      },
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    // Resume at the first document with id >= cursor.d — stable even if the
    // cursor's document was deleted between pages.
    let docIdx = cursor ? docRows.findIndex((d) => d.id >= cursor.d) : 0;
    if (docIdx === -1) docIdx = docRows.length;

    const documents: AppDocumentChunks[] = [];
    let emitted = 0;
    let nextCursor: string | null = null;

    for (; docIdx < docRows.length; docIdx++) {
      const docId = docRows[docIdx].id;
      const doc = await this.db.document.findUnique({
        where: { id: docId },
        select: { id: true, fileName: true, chunks: true },
      });
      if (!doc) continue; // deleted between the two queries

      const rawChunks = Array.isArray(doc.chunks) ? (doc.chunks as any[]) : [];
      const startIndex = cursor && cursor.d === docId ? cursor.c : 0;

      const chunks: AppChunk[] = [];
      let i = startIndex;
      for (; i < rawChunks.length && emitted < limit; i++, emitted++) {
        chunks.push(this.toAppChunk(rawChunks[i], docId, i));
      }

      if (chunks.length) {
        documents.push({
          documentId: doc.id,
          fileName: doc.fileName,
          totalChunks: rawChunks.length,
          chunks,
        });
      }

      if (i < rawChunks.length) {
        // Page filled mid-document.
        nextCursor = encodeChunkCursor({ d: docId, c: i });
        break;
      }
      if (emitted >= limit && docIdx + 1 < docRows.length) {
        // Page filled exactly at a document boundary.
        nextCursor = encodeChunkCursor({ d: docRows[docIdx + 1].id, c: 0 });
        break;
      }
    }

    return {
      classId,
      documents,
      nextCursor,
      hasMore: nextCursor !== null,
    };
  }

  /**
   * Map fields explicitly — never spread the raw chunk — so large payloads
   * like `metadata.image_base64` can never leak into the response. Described
   * image/table chunks already carry their description in `text`.
   *
   * `Document.chunks` is an untyped JSON column, so every field is also
   * type-checked: a malformed chunk must never throw or break the DTO
   * contract (`pageNumber: number | null`, `type`/`text`: string).
   */
  private toAppChunk(chunk: any, documentId: string, index: number): AppChunk {
    const elementId = chunk?.element_id;
    const type = chunk?.type;
    const text = chunk?.text;

    return {
      chunkId:
        typeof elementId === 'string' && elementId
          ? elementId
          : `${documentId}:${index}`,
      index,
      pageNumber: toPageNumber(chunk?.metadata?.page_number),
      type: typeof type === 'string' && type ? type : 'CompositeElement',
      text: typeof text === 'string' ? text.slice(0, MAX_CHUNK_TEXT_CHARS) : '',
    };
  }
}
