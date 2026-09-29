import { ConfigService } from '@nestjs/config';
import { ParserService } from './parser.service';
import { UnstructuredParser } from './unstructured/unstructured.parser';
import { XbergParser } from './xberg/xberg.parser';

describe('ParserService', () => {
  const parsed = (parser: string) => ({
    parser,
    chunks: [],
    warnings: [],
  });

  const xberg = {
    name: 'xberg',
    parse: jest.fn().mockResolvedValue(parsed('xberg')),
  } as unknown as XbergParser;

  const unstructured = {
    name: 'unstructured',
    parse: jest.fn().mockResolvedValue(parsed('unstructured')),
  } as unknown as UnstructuredParser;

  const build = (env: Record<string, string>) =>
    new ParserService(
      { get: (key: string) => env[key] } as unknown as ConfigService,
      xberg,
      unstructured,
    );

  const input = {
    content: new Uint8Array(),
    mimeType: 'application/pdf',
    fileName: 'lecture.pdf',
  };

  it('defaults to xberg when PARSER is unset', async () => {
    const service = build({ XBERG_API_URL: 'http://x:8000' });

    expect(service.parserName).toBe('xberg');
    expect((await service.parse(input)).parser).toBe('xberg');
  });

  it('routes to xberg when selected', async () => {
    const service = build({
      PARSER: 'xberg',
      XBERG_API_URL: 'http://xberg:8000',
    });

    expect((await service.parse(input)).parser).toBe('xberg');
  });

  it('accepts the parser name case-insensitively', () => {
    const service = build({
      PARSER: 'Xberg',
      XBERG_API_URL: 'http://xberg:8000',
    });

    expect(service.parserName).toBe('xberg');
  });

  it('rejects an unknown parser name', () => {
    expect(() => build({ PARSER: 'docling' }).parserName).toThrow(/docling/);
  });

  // A missing endpoint used to surface minutes into a user's first upload, as
  // a failed document rather than a configuration error.
  it('fails at boot when the selected parser has no endpoint', () => {
    expect(() => build({ PARSER: 'xberg' }).onModuleInit()).toThrow(
      /XBERG_API_URL/,
    );
    expect(() => build({ PARSER: 'unstructured' }).onModuleInit()).toThrow(
      /UNSTRUCTURED_API_URL/,
    );
  });

  it('boots when the selected parser is configured', () => {
    expect(() =>
      build({
        PARSER: 'xberg',
        XBERG_API_URL: 'http://xberg:8000',
      }).onModuleInit(),
    ).not.toThrow();
  });
});
