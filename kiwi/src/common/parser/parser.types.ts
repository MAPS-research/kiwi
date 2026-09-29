/**
 * The parser boundary.
 *
 * `DocumentChunk` is not an internal convenience type — it is the shape that
 * lands in `Document.chunks` and is read back by four independent consumers:
 *
 *   - `DocumentService.describeImageChunks` / `embedDocument`
 *   - the admin annotation UI (`AnnotateDocument.tsx`, keyed on `element_id`)
 *   - the Kiwi Apps bridge (`AppChunksService`) and the `class-chunks` MCP tool
 *   - the generated OpenAPI client (`Chunk` in `document/dto/chunk-request.dto.ts`)
 *
 * Two of those are external. A parser may therefore produce this shape from
 * whatever native representation it likes, but it may not change the shape.
 */

export type ParserName = 'xberg' | 'unstructured';

/**
 * Only these three types are embedded (`DocumentService.embedDocument`), and
 * only `Image`/`Table` are sent to the vision describer. The vocabulary is
 * inherited from Unstructured; it is kept because it is baked into the stored
 * documents and the public DTO, not because a parser has to think in it.
 */
export type DocumentChunkType = 'CompositeElement' | 'Image' | 'Table';

export interface DocumentChunkMetadata {
  page_number?: number;
  /** Raw image bytes for Image/Table chunks, consumed by the vision describer. */
  image_base64?: string;
  image_mime_type?: string;
  [key: string]: unknown;
}

export interface DocumentChunk {
  element_id: string;
  type: DocumentChunkType;
  text: string;
  metadata: DocumentChunkMetadata;
  /** Set by the vision describer once an Image/Table has been described. */
  described?: boolean;
  [key: string]: unknown;
}

export interface ParserInput {
  content: Uint8Array;
  mimeType: string;
  fileName: string;
}

export interface ParsedDocument {
  parser: ParserName;
  /** Parser build that produced these chunks, when it can report one. */
  parserVersion?: string;
  chunks: DocumentChunk[];
  warnings: string[];
}

export interface DocumentParser {
  readonly name: ParserName;
  parse(input: ParserInput): Promise<ParsedDocument>;
}
