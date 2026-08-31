import { BadRequestException } from '@nestjs/common';

/**
 * Opaque pagination cursor for get_class_document_chunks.
 *
 * Encodes a resume position as base64url JSON `{v, d, c}`:
 * - `d` — document id to resume at (documents are ordered by id ASC, so the
 *   position survives documents being added or deleted between pages: resume
 *   at the first document with id >= d)
 * - `c` — chunk array index to resume at within that document
 */
export interface ChunkCursor {
  /** Document id to resume at (inclusive). */
  d: string;
  /** Chunk array index to resume at within that document. */
  c: number;
}

const CURSOR_VERSION = 1;

export function encodeChunkCursor(cursor: ChunkCursor): string {
  return Buffer.from(
    JSON.stringify({ v: CURSOR_VERSION, d: cursor.d, c: cursor.c }),
  ).toString('base64url');
}

export function decodeChunkCursor(raw: string): ChunkCursor {
  let parsed: any;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
  if (
    parsed?.v !== CURSOR_VERSION ||
    typeof parsed.d !== 'string' ||
    parsed.d.length === 0 ||
    !Number.isInteger(parsed.c) ||
    parsed.c < 0
  ) {
    throw new BadRequestException('Invalid cursor');
  }
  return { d: parsed.d, c: parsed.c };
}
