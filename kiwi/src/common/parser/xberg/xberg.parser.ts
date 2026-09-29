import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import {
  DocumentChunk,
  DocumentParser,
  ParsedDocument,
  ParserInput,
} from '../parser.types';
import {
  XbergErrorResponse,
  XbergExtractionConfig,
  XbergExtractResponse,
  XbergBoundingBox,
  XbergImage,
  XbergPageFrame,
  XbergResult,
  XbergTable,
} from './xberg.types';

/**
 * Xberg parser.
 *
 * One `POST /extract` returns chunked text, embedded images and structured
 * tables together, so this replaces the three Unstructured round trips
 * (`ocr_only`, `hi_res`, and the `hi_res`-with-chunking fallback) with a
 * single request. The fallback has no counterpart here: it existed to work
 * around an Unstructured OCR quirk, not a general problem.
 */
@Injectable()
export class XbergParser implements DocumentParser {
  readonly name = 'xberg' as const;
  private readonly logger = new Logger(XbergParser.name);

  constructor(private readonly configService: ConfigService) {}

  private get baseUrl(): string {
    const url = this.configService.get<string>('XBERG_API_URL');
    if (!url) {
      throw new Error(
        'XBERG_API_URL is not set, but PARSER=xberg was selected.',
      );
    }
    return url.replace(/\/+$/, '');
  }

  private buildConfig(): XbergExtractionConfig {
    // `|| fallback` would turn an explicit 0 (e.g. no chunk overlap) back into
    // the default, so only an unset or non-numeric value falls back.
    const num = (key: string, fallback: number) => {
      const raw = this.configService.get<string>(key);
      const value = raw === undefined || raw === '' ? NaN : Number(raw);
      return Number.isFinite(value) ? value : fallback;
    };

    return {
      chunking: {
        max_characters: num('XBERG_MAX_CHARACTERS', 1024),
        overlap: num('XBERG_CHUNK_OVERLAP', 128),
        chunker_type: 'markdown',
        trim: true,
        table_chunking: 'repeat_header',
      },
      images: {
        extract_images: true,
        include_data_base64: true,
        max_images_per_page: 50,
      },
      pages: { extract_pages: true, insert_page_markers: true },
      output_format: 'markdown',
      table_anchors: true,
      extraction_timeout_secs: num('XBERG_EXTRACTION_TIMEOUT_SECS', 1200),
      // Kiwi re-parses a document only when its content changed, so a cache
      // hit would mask exactly the case we care about.
      use_cache: false,
    };
  }

  async parse(input: ParserInput): Promise<ParsedDocument> {
    const config = this.buildConfig();
    const timeoutMs =
      Number(this.configService.get<string>('XBERG_REQUEST_TIMEOUT_MS')) ||
      (config.extraction_timeout_secs ?? 1200) * 1000 + 30_000;

    const form = new FormData();
    form.append(
      'files',
      new Blob([input.content as unknown as BlobPart], {
        type: input.mimeType || 'application/pdf',
      }),
      input.fileName,
    );
    form.append('config', JSON.stringify(config));

    this.logger.debug(`Extracting ${input.fileName} via Xberg`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: { accept: 'application/json' },
        body: form,
        signal: controller.signal,
      });
    } catch (error) {
      const reason =
        error instanceof Error && error.name === 'AbortError'
          ? `timed out after ${timeoutMs}ms`
          : String(error);
      throw new Error(`Xberg request failed (${reason})`);
    } finally {
      clearTimeout(timer);
    }

    const body = (await response.json().catch(() => null)) as
      (XbergExtractResponse & XbergErrorResponse) | null;

    if (!response.ok) {
      // Xberg rejects unknown config keys with a 400 naming the offending
      // field. Surfacing that verbatim turns a silent misconfiguration into a
      // readable error.
      const detail = body?.message ?? `HTTP ${response.status}`;
      throw new Error(`Xberg extraction failed: ${detail}`);
    }

    const result = body?.results?.[0];
    if (!result) {
      throw new Error('Xberg returned no result for the document');
    }

    return {
      parser: this.name,
      chunks: this.toChunks(result),
      warnings: (result.processing_warnings ?? []).map((warning) =>
        typeof warning === 'string' ? warning : JSON.stringify(warning),
      ),
    };
  }

  private toChunks(result: XbergResult): DocumentChunk[] {
    const text = (result.chunks ?? []).flatMap((chunk, index) =>
      this.splitByPage(chunk.content ?? '', chunk.metadata?.first_page, index),
    );

    const frames = pageFrames(result);

    const images = distinctImages(result.images ?? []).flatMap((image, index) =>
      this.imageChunk(image, index, frames),
    );

    // An empty table would reach the embedder as "" and fail the document.
    const tables = (result.tables ?? [])
      .filter((table) => table.markdown?.trim())
      .map((table, index) => this.tableChunk(table, index, frames));

    return [...text, ...images, ...tables];
  }

  /**
   * Splits a chunk at page boundaries and strips the page markers.
   *
   * Xberg chunks by character budget, so one chunk can run across a page
   * break. Attributing all of it to `first_page` puts later pages' text on
   * the wrong page, which is what citations and the annotation UI read.
   * `chunk.metadata.last_page` is no help on its own — a chunk needs one page
   * number, not a range — and `page_spans` disagrees with the content in
   * practice, reporting a single page for text that carries a marker for the
   * next one.
   *
   * The `<!-- PAGE n -->` markers that `pages.insert_page_markers` writes into
   * the text are the reliable signal: they sit exactly where each page's
   * content begins. Splitting on them restores what Kiwi always asked
   * Unstructured for with `multipage_sections=False`, and it removes the
   * markers from the text that gets embedded and displayed.
   *
   * A trailing marker with nothing after it is dropped rather than kept as an
   * empty chunk. So is a segment holding nothing but `[TABLE:…]` anchors,
   * which a split leaves behind when a table starts a page: the table itself
   * is already its own chunk.
   */
  private splitByPage(
    content: string,
    firstPage: number | undefined,
    index: number,
  ): DocumentChunk[] {
    const marker = /<!--\s*PAGE\s+(\d+)\s*-->/g;
    const segments: Array<{ page?: number; text: string }> = [];

    let cursor = 0;
    let page = firstPage;
    let match: RegExpExecArray | null;

    while ((match = marker.exec(content)) !== null) {
      segments.push({ page, text: content.slice(cursor, match.index) });
      page = Number(match[1]);
      cursor = match.index + match[0].length;
    }
    segments.push({ page, text: content.slice(cursor) });

    return segments
      .map((segment) => ({ ...segment, text: segment.text.trim() }))
      .filter((segment) => segment.text.replace(TABLE_ANCHORS, '').trim())
      .map((segment, part) =>
        this.chunk('CompositeElement', index * 1000 + part, segment.text, {
          page_number: segment.page,
          chunk_index: index,
        }),
      );
  }

  private imageChunk(
    image: XbergImage,
    index: number,
    frames: Map<number, XbergPageFrame>,
  ): DocumentChunk[] {
    // `data` is the raw bytes as a JSON number array, not base64.
    const base64 =
      image.data_base64 ||
      (Array.isArray(image.data)
        ? Buffer.from(image.data).toString('base64')
        : undefined);
    // Without bytes the describer skips the chunk, and its empty text would
    // then fail the whole document at the embedder.
    if (!base64) return [];

    return [
      this.chunk('Image', index, '', {
        page_number: image.page_number,
        image_base64: base64,
        image_mime_type: mimeTypeFor(image.format),
        image_index: image.image_index ?? index,
        width: image.width,
        height: image.height,
        coordinates: toCoordinates(
          image.bounding_box,
          image.page_number,
          frames,
        ),
      }),
    ];
  }

  /**
   * Tables carry their Markdown as text rather than a cropped screenshot.
   *
   * Unstructured returned Table elements with `image_base64`, so the vision
   * describer turned each one into prose. Xberg returns the structure itself,
   * which is better input for embedding, so these chunks skip the describer
   * (it only runs where `image_base64` is present) and are embedded directly.
   */
  private tableChunk(
    table: XbergTable,
    index: number,
    frames: Map<number, XbergPageFrame>,
  ): DocumentChunk {
    const markdown = table.markdown ?? '';
    const chunk = this.chunk('Table', index, markdown, {
      page_number: table.page_number,
      coordinates: toCoordinates(table.bounding_box, table.page_number, frames),
    });
    if (table.table_id) {
      chunk.element_id = table.table_id;
    }
    return chunk;
  }

  /**
   * Element ids are derived from content rather than random, so re-parsing an
   * unchanged document keeps the ids that annotations are keyed on.
   */
  private chunk(
    type: DocumentChunk['type'],
    index: number,
    text: string,
    metadata: Record<string, unknown>,
  ): DocumentChunk {
    const clean = Object.fromEntries(
      Object.entries(metadata).filter(([, value]) => value !== undefined),
    );
    return {
      element_id: createHash('sha1')
        .update(`${type}:${index}:${text}`)
        .digest('hex')
        .slice(0, 32),
      type,
      text,
      metadata: clean,
    };
  }
}

const TABLE_ANCHORS = /\[TABLE:[^\]]*\]/g;

/**
 * Drops soft masks, which Xberg reports as images in their own right.
 *
 * A PDF image with transparency is stored as an RGB image plus a DeviceGray
 * SMask of the same size, drawn at the same place. Xberg 1.2.3 returns both
 * and marks the mask `is_mask: false`, so every such figure arrived twice —
 * two vision calls, one of which describes a black-and-white silhouette. The
 * mask always follows its image, so the first image at a given page, box and
 * pixel size is the one kept.
 */
function distinctImages(images: XbergImage[]): XbergImage[] {
  const seen = new Set<string>();
  return images.filter((image) => {
    if (image.is_mask) return false;
    const box = image.bounding_box;
    if (!box) return true;
    const key = JSON.stringify([
      image.page_number,
      box.x0 ?? box.left,
      box.y0 ?? box.bottom,
      box.x1 ?? box.right,
      box.y1 ?? box.top,
      image.width,
      image.height,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pageFrames(result: XbergResult): Map<number, XbergPageFrame> {
  const frames = (result.metadata?.additional?.['pdf_page_coordinate_frames'] ??
    []) as XbergPageFrame[];

  return new Map(
    frames
      .filter((frame) => typeof frame.page_number === 'number')
      .map((frame) => [frame.page_number as number, frame]),
  );
}

/**
 * Converts an Xberg bounding box into the coordinate shape the annotation UI
 * draws with.
 *
 * `AnnotateDocument.convertToHighlightArea` destructures `points`,
 * `layout_width` and `layout_height` and turns them into percentages, so
 * handing it Xberg's raw `{x0, y0, x1, y1}` throws on `points.map`. The two
 * also disagree about the vertical axis: PDF boxes grow upward from the
 * bottom-left, while the UI measures downward from the top-left, so `y` has to
 * be mirrored about the page height or every highlight lands as far from its
 * content as it started.
 *
 * Units only have to agree with each other — the UI divides by the layout
 * dimensions — so the points stay in PDF points rather than being rescaled to
 * pixels.
 *
 * Returns undefined when the geometry cannot be trusted: no frame for the page
 * (Xberg older than 1.2.3 does not report them), or a rotated page, where
 * mirroring alone would be wrong. A missing highlight is recoverable; one
 * drawn in the wrong place is misleading.
 */
function toCoordinates(
  box: XbergBoundingBox | undefined,
  pageNumber: number | undefined,
  frames: Map<number, XbergPageFrame>,
): Record<string, unknown> | undefined {
  if (!box || pageNumber === undefined) return undefined;

  const frame = frames.get(pageNumber);
  const width = frame?.width;
  const height = frame?.height;
  if (!width || !height) return undefined;
  if (frame?.clockwise_rotation) return undefined;

  const left = box.x0 ?? box.left;
  const right = box.x1 ?? box.right;
  const lower = box.y0 ?? box.bottom;
  const upper = box.y1 ?? box.top;
  if (![left, right, lower, upper].every((v) => typeof v === 'number')) {
    return undefined;
  }

  const bottomLeftOrigin = (frame?.origin ?? 'bottom_left') === 'bottom_left';
  const top = bottomLeftOrigin ? height - (upper as number) : (upper as number);
  const bottom = bottomLeftOrigin
    ? height - (lower as number)
    : (lower as number);

  return {
    // Same winding Unstructured used: top-left, bottom-left, bottom-right,
    // top-right.
    points: [
      [left, top],
      [left, bottom],
      [right, bottom],
      [right, top],
    ],
    // Never read by the UI, which only needs the numbers to be self
    // consistent. Named accurately rather than copying Unstructured's
    // "PixelSpace", because these are PDF points.
    system: 'PDFPointSpace',
    layout_width: width,
    layout_height: height,
  };
}

function mimeTypeFor(format?: string): string {
  switch ((format ?? '').toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'tiff':
      return 'image/tiff';
    default:
      return 'image/png';
  }
}
