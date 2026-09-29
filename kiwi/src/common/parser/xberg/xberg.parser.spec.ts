import { ConfigService } from '@nestjs/config';
import { XbergParser } from './xberg.parser';

describe('XbergParser', () => {
  let parser: XbergParser;
  let fetchMock: jest.Mock;

  const config = (values: Record<string, string> = {}) =>
    ({
      get: (key: string) =>
        ({ XBERG_API_URL: 'http://xberg:8000', ...values })[key],
    }) as unknown as ConfigService;

  const respond = (body: unknown, ok = true, status = 200) =>
    fetchMock.mockResolvedValue({
      ok,
      status,
      json: async () => body,
    } as Response);

  const input = {
    content: new Uint8Array([1, 2, 3]),
    mimeType: 'application/pdf',
    fileName: 'lecture.pdf',
  };

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    parser = new XbergParser(config());
  });

  it('maps chunks, images and tables into the stored chunk shape', async () => {
    respond({
      results: [
        {
          chunks: [
            { content: 'page one text', metadata: { first_page: 1 } },
            { content: 'page two text', metadata: { first_page: 2 } },
          ],
          images: [
            {
              data_base64: 'AAAA',
              format: 'jpeg',
              page_number: 2,
              image_index: 0,
            },
          ],
          tables: [{ table_id: 't1', page_number: 3, markdown: '| a | b |' }],
        },
      ],
    });

    const { chunks, parser: name } = await parser.parse(input);

    expect(name).toBe('xberg');
    expect(chunks).toHaveLength(4);

    const text = chunks.filter((c) => c.type === 'CompositeElement');
    expect(text.map((c) => c.text)).toEqual(['page one text', 'page two text']);
    expect(text[0].metadata.page_number).toBe(1);

    // Only Image/Table carry image bytes, and the describer keys on exactly
    // these two metadata fields.
    const image = chunks.find((c) => c.type === 'Image')!;
    expect(image.metadata.image_base64).toBe('AAAA');
    expect(image.metadata.image_mime_type).toBe('image/jpeg');
    expect(image.metadata.page_number).toBe(2);

    // Tables arrive as Markdown rather than a screenshot, so they are
    // embeddable as-is and the vision describer skips them.
    const table = chunks.find((c) => c.type === 'Table')!;
    expect(table.text).toBe('| a | b |');
    expect(table.metadata.image_base64).toBeUndefined();
    expect(table.element_id).toBe('t1');
  });

  // Xberg chunks by character budget, so a chunk can cross a page break. Kiwi
  // always asked Unstructured not to (`multipage_sections=False`), and
  // citations read a single page number per chunk.
  describe('page boundaries', () => {
    it('splits a chunk that runs across a page break', async () => {
      respond({
        results: [
          {
            chunks: [
              {
                content: 'end of page one<!-- PAGE 2 -->start of page two',
                metadata: { first_page: 1, last_page: 2 },
              },
            ],
          },
        ],
      });

      const { chunks } = await parser.parse(input);

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toMatchObject({
        text: 'end of page one',
        metadata: { page_number: 1 },
      });
      expect(chunks[1]).toMatchObject({
        text: 'start of page two',
        metadata: { page_number: 2 },
      });
    });

    it('strips the page markers from the stored text', async () => {
      respond({
        results: [
          {
            chunks: [
              {
                content: 'one<!-- PAGE 2 -->two<!-- PAGE 3 -->three',
                metadata: { first_page: 1 },
              },
            ],
          },
        ],
      });

      const { chunks } = await parser.parse(input);

      expect(chunks.map((c) => c.text)).toEqual(['one', 'two', 'three']);
      expect(chunks.map((c) => c.metadata.page_number)).toEqual([1, 2, 3]);
      expect(chunks.every((c) => !c.text.includes('PAGE'))).toBe(true);
    });

    // A chunk often ends right on the boundary, leaving the marker as the last
    // thing in it. That must not become an empty chunk.
    it('drops a trailing marker with no content after it', async () => {
      respond({
        results: [
          {
            chunks: [
              {
                content: 'all of page one<!-- PAGE 2 -->',
                metadata: { first_page: 1 },
              },
            ],
          },
        ],
      });

      const { chunks } = await parser.parse(input);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe('all of page one');
      expect(chunks[0].metadata.page_number).toBe(1);
    });

    it('leaves a single-page chunk alone', async () => {
      respond({
        results: [
          {
            chunks: [
              { content: 'just page four', metadata: { first_page: 4 } },
            ],
          },
        ],
      });

      const { chunks } = await parser.parse(input);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].metadata.page_number).toBe(4);
    });

    it('keeps split parts distinct', async () => {
      respond({
        results: [
          {
            chunks: [
              {
                content: 'same<!-- PAGE 2 -->same',
                metadata: { first_page: 1 },
              },
            ],
          },
        ],
      });

      const { chunks } = await parser.parse(input);

      expect(new Set(chunks.map((c) => c.element_id)).size).toBe(2);
    });
  });

  it('drops an anchor left alone by a page split', async () => {
    respond({
      results: [
        {
          chunks: [
            {
              content: 'end of page nine<!-- PAGE 10 -->[TABLE:table-5]',
              metadata: { first_page: 9 },
            },
          ],
        },
      ],
    });

    const { chunks } = await parser.parse(input);

    expect(chunks.map((c) => c.text)).toEqual(['end of page nine']);
  });

  // The describer only fills in text where there are image bytes, and the
  // embedder fails the whole document on an empty string.
  describe('chunks that could never be embedded', () => {
    it('drops an image without bytes and a table without markdown', async () => {
      respond({
        results: [
          {
            chunks: [],
            images: [{ format: 'png', page_number: 1 }],
            tables: [
              { table_id: 't1', page_number: 1, markdown: '  ' },
              { table_id: 't2', page_number: 1 },
            ],
          },
        ],
      });

      const { chunks } = await parser.parse(input);

      expect(chunks).toEqual([]);
    });

    // Xberg sends `data` as a number array alongside `data_base64`.
    it('encodes raw image bytes when base64 is absent', async () => {
      respond({
        results: [
          {
            chunks: [],
            images: [{ format: 'png', page_number: 1, data: [1, 2, 3] }],
          },
        ],
      });

      const { chunks } = await parser.parse(input);

      expect(chunks[0].metadata.image_base64).toBe('AQID');
    });
  });

  it('keeps an image and drops its soft mask', async () => {
    const box = { x0: 196, y0: 397, x1: 415, y1: 719 };
    const image = (colorspace: string, data_base64: string) => ({
      format: 'png',
      page_number: 3,
      width: 1520,
      height: 2239,
      colorspace,
      is_mask: false,
      data_base64,
      bounding_box: box,
    });
    respond({
      results: [
        {
          chunks: [],
          images: [
            image('DeviceRGB', 'RGB='),
            image('DeviceGray', 'MASK'),
            { ...image('DeviceRGB', 'OTHER='), page_number: 4 },
            {
              ...image('DeviceGray', 'FLAGGED='),
              is_mask: true,
              page_number: 5,
            },
          ],
        },
      ],
    });

    const { chunks } = await parser.parse(input);

    expect(chunks.map((c) => c.metadata.image_base64)).toEqual([
      'RGB=',
      'OTHER=',
    ]);
  });

  it('honours an explicit zero chunk overlap', async () => {
    parser = new XbergParser(config({ XBERG_CHUNK_OVERLAP: '0' }));
    respond({ results: [{ chunks: [] }] });
    await parser.parse(input);

    const form = fetchMock.mock.calls[0][1].body as FormData;
    const sent = JSON.parse(form.get('config') as string);

    expect(sent.chunking.overlap).toBe(0);
    expect(sent.chunking.max_characters).toBe(1024);
  });

  it('gives every chunk a stable id derived from its content', async () => {
    const body = {
      results: [{ chunks: [{ content: 'same', metadata: { first_page: 1 } }] }],
    };
    respond(body);
    const first = await parser.parse(input);
    respond(body);
    const second = await parser.parse(input);

    expect(first.chunks[0].element_id).toBe(second.chunks[0].element_id);
    expect(first.chunks[0].element_id).toHaveLength(32);
  });

  // AnnotateDocument.convertToHighlightArea destructures `points`,
  // `layout_width` and `layout_height`, and measures y downward from the
  // top-left. Xberg reports `{x0,y0,x1,y1}` growing upward from the
  // bottom-left, so an unconverted box throws on `points.map` and a box
  // converted without mirroring lands at the wrong end of the page.
  describe('coordinates', () => {
    const withFrame = (extra: Record<string, unknown> = {}) => ({
      results: [
        {
          chunks: [],
          tables: [
            {
              table_id: 't1',
              page_number: 2,
              markdown: '| a |',
              bounding_box: { x0: 100, y0: 200, x1: 500, y1: 300 },
            },
          ],
          metadata: {
            additional: {
              pdf_page_coordinate_frames: [
                {
                  page_number: 2,
                  width: 595,
                  height: 842,
                  origin: 'bottom_left',
                  clockwise_rotation: 0,
                  ...extra,
                },
              ],
            },
          },
        },
      ],
    });

    it('mirrors the vertical axis onto the page height', async () => {
      respond(withFrame());

      const { chunks } = await parser.parse(input);
      const box = chunks[0].metadata.coordinates as {
        points: number[][];
        layout_width: number;
        layout_height: number;
      };

      // y1 (300) is the top edge going up from the bottom, so it becomes
      // 842 - 300 = 542 measured down from the top; y0 (200) becomes 642.
      expect(box.points).toEqual([
        [100, 542],
        [100, 642],
        [500, 642],
        [500, 542],
      ]);
      expect(box.layout_width).toBe(595);
      expect(box.layout_height).toBe(842);
    });

    it('leaves a top-left frame unmirrored', async () => {
      respond(withFrame({ origin: 'top_left' }));

      const { chunks } = await parser.parse(input);
      const box = chunks[0].metadata.coordinates as { points: number[][] };

      expect(box.points).toEqual([
        [100, 300],
        [100, 200],
        [500, 200],
        [500, 300],
      ]);
    });

    // Better no highlight than one drawn in the wrong place.
    it('omits coordinates on a rotated page', async () => {
      respond(withFrame({ clockwise_rotation: 90 }));

      const { chunks } = await parser.parse(input);

      expect(chunks[0].metadata.coordinates).toBeUndefined();
    });

    it('omits coordinates when the server reports no page frames', async () => {
      respond({
        results: [
          {
            chunks: [],
            tables: [
              {
                table_id: 't1',
                page_number: 2,
                markdown: '| a |',
                bounding_box: { x0: 1, y0: 2, x1: 3, y1: 4 },
              },
            ],
          },
        ],
      });

      const { chunks } = await parser.parse(input);

      expect(chunks[0].metadata.coordinates).toBeUndefined();
    });

    it('converts image boxes the same way', async () => {
      respond({
        results: [
          {
            chunks: [],
            images: [
              {
                data_base64: 'AAAA',
                format: 'png',
                page_number: 1,
                bounding_box: { x0: 10, y0: 20, x1: 30, y1: 40 },
              },
            ],
            metadata: {
              additional: {
                pdf_page_coordinate_frames: [
                  { page_number: 1, width: 612, height: 792 },
                ],
              },
            },
          },
        ],
      });

      const { chunks } = await parser.parse(input);
      const box = chunks[0].metadata.coordinates as { points: number[][] };

      expect(chunks[0].type).toBe('Image');
      expect(box.points[0]).toEqual([10, 752]);
    });
  });

  it('sends a config the REST API accepts', async () => {
    respond({ results: [{ chunks: [] }] });
    await parser.parse(input);

    const form = fetchMock.mock.calls[0][1].body as FormData;
    const sent = JSON.parse(form.get('config') as string);

    expect(sent.chunking.chunker_type).toBe('markdown');
    expect(sent.chunking.max_characters).toBe(1024);
    // The Node binding accepts prependHeadingContext; the REST API rejects it
    // with a 400, so it must never be sent.
    expect(sent.chunking).not.toHaveProperty('prepend_heading_context');
    // A cache hit would mask the re-parse we are asking for.
    expect(sent.use_cache).toBe(false);
  });

  it('surfaces the validation message when the config is rejected', async () => {
    respond(
      {
        error_type: 'ValidationError',
        message: 'unknown field `prepend_heading_context`',
        status_code: 400,
      },
      false,
      400,
    );

    await expect(parser.parse(input)).rejects.toThrow(
      /unknown field `prepend_heading_context`/,
    );
  });

  it('refuses to run without an endpoint', async () => {
    const orphan = new XbergParser({
      get: () => undefined,
    } as unknown as ConfigService);

    await expect(orphan.parse(input)).rejects.toThrow(/XBERG_API_URL/);
  });

  it('treats a missing result as a failure rather than an empty document', async () => {
    respond({ results: [] });
    await expect(parser.parse(input)).rejects.toThrow(/no result/);
  });
});
