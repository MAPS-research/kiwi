/**
 * Xberg REST API types.
 *
 * Deliberately modelled on what the service actually returns rather than on
 * Kiwi's stored shape. Field names are `snake_case`: the Node binding exposes
 * `camelCase` because NAPI-RS rewrites it, but the HTTP API does not.
 *
 * Verified against ghcr.io/xberg-io/xberg:1.2.2 and 1.2.3.
 */

export interface XbergBoundingBox {
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export interface XbergChunkMetadata {
  chunk_index?: number;
  total_chunks?: number;
  first_page?: number;
  last_page?: number;
  byte_start?: number;
  byte_end?: number;
  page_spans?: unknown[];
}

export interface XbergChunk {
  content: string;
  chunk_type?: string;
  metadata?: XbergChunkMetadata;
}

export interface XbergImage {
  /** Present when `images.include_data_base64` is set. */
  data_base64?: string;
  /** Raw bytes as a JSON number array. */
  data?: number[];
  /** e.g. "png", "jpeg". */
  format?: string;
  image_index?: number;
  page_number?: number;
  width?: number;
  height?: number;
  colorspace?: string;
  /** Not set on SMasks in 1.2.3; see `distinctImages`. */
  is_mask?: boolean;
  bounding_box?: XbergBoundingBox;
}

export interface XbergTable {
  table_id?: string;
  page_number?: number;
  markdown?: string;
  cells?: unknown[][];
  bounding_box?: XbergBoundingBox;
}

/**
 * Per-page geometry, added in Xberg 1.2.3 as
 * `metadata.additional.pdf_page_coordinate_frames`. Needed to turn a bounding
 * box into the top-left-origin coordinates the annotation UI draws with.
 */
export interface XbergPageFrame {
  page_number?: number;
  width?: number;
  height?: number;
  unit?: string;
  /** "bottom_left" for PDFs — the opposite of what the UI expects. */
  origin?: string;
  clockwise_rotation?: number;
}

export interface XbergResult {
  content?: string;
  mime_type?: string;
  metadata?: {
    pages?: number;
    ocr_used?: boolean;
    extraction_duration_ms?: number;
    additional?: Record<string, unknown>;
  };
  counts?: { pages?: number; tables?: number; images?: number };
  chunks?: XbergChunk[];
  /** Absent, not empty, when the document holds no images. */
  images?: XbergImage[];
  tables?: XbergTable[];
  pages?: unknown[];
  quality_score?: number;
  processing_warnings?: unknown[];
}

export interface XbergExtractResponse {
  results?: XbergResult[];
  errors?: unknown[];
  summary?: { inputs?: number; results?: number; errors?: number };
}

export interface XbergErrorResponse {
  error_type?: string;
  message?: string;
  status_code?: number;
}

/**
 * Extraction config sent as the `config` multipart field.
 *
 * Xberg rejects unknown keys with a 400 that names the offending field, so
 * this interface is a hard contract rather than a hint — in particular the
 * binding's `prependHeadingContext` has no REST equivalent and must not be
 * sent.
 */
export interface XbergChunkingConfig {
  max_characters?: number;
  overlap?: number;
  chunker_type?: 'text' | 'markdown' | 'yaml' | 'semantic';
  trim?: boolean;
  table_chunking?: string;
}

export interface XbergExtractionConfig {
  chunking?: XbergChunkingConfig;
  images?: {
    extract_images?: boolean;
    include_data_base64?: boolean;
    max_images_per_page?: number;
  };
  pages?: { extract_pages?: boolean; insert_page_markers?: boolean };
  output_format?: 'plain' | 'markdown' | 'djot' | 'html' | 'json' | 'doctags';
  table_anchors?: boolean;
  extraction_timeout_secs?: number;
  use_cache?: boolean;
}
