import { Injectable, Logger } from '@nestjs/common';
import { UnstructuredService } from 'src/common/unstructured/unstructured.service';
import {
  DocumentChunk,
  DocumentParser,
  ParsedDocument,
  ParserInput,
} from '../parser.types';

/**
 * Unstructured parser.
 *
 * The two-pass call sequence and the OCR fallback used to live in
 * `DocumentConsumer`. They are parser-specific workarounds, so they belong
 * here: the consumer should not know that one parser needs three HTTP round
 * trips and another needs one.
 *
 * Unstructured already emits the stored chunk shape, so its elements are
 * passed through untouched. Normalising them would only risk dropping
 * metadata that existing documents and the annotation UI rely on.
 */
@Injectable()
export class UnstructuredParser implements DocumentParser {
  readonly name = 'unstructured' as const;
  private readonly logger = new Logger(UnstructuredParser.name);

  constructor(private readonly unstructuredService: UnstructuredService) {}

  async parse(input: ParserInput): Promise<ParsedDocument> {
    const { content, mimeType, fileName } = input;

    const textChunks = await this.unstructuredService.partitionDocument(
      content,
      mimeType,
      fileName,
      'ocr_only',
    );

    const imageChunksAll = await this.unstructuredService.partitionDocument(
      content,
      mimeType,
      fileName,
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
    const warnings: string[] = [];
    let resolvedTextChunks = textChunks;
    if (resolvedTextChunks.length === 0) {
      const message =
        `ocr_only returned no elements for ${fileName}; ` +
        `retrying with hi_res + chunking`;
      this.logger.warn(message);
      warnings.push(message);

      const hiResChunked = await this.unstructuredService.partitionDocument(
        content,
        mimeType,
        fileName,
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

    return {
      parser: this.name,
      chunks: [...resolvedTextChunks, ...imageChunks] as DocumentChunk[],
      warnings,
    };
  }
}
