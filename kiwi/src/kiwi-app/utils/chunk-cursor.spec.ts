import { BadRequestException } from '@nestjs/common';
import { decodeChunkCursor, encodeChunkCursor } from './chunk-cursor';

describe('chunk-cursor', () => {
  it('round-trips a cursor', () => {
    const encoded = encodeChunkCursor({ d: 'doc-uuid-1', c: 42 });
    expect(decodeChunkCursor(encoded)).toEqual({ d: 'doc-uuid-1', c: 42 });
  });

  it('produces an opaque (base64url) string', () => {
    const encoded = encodeChunkCursor({ d: 'doc/1+2', c: 0 });
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('rejects garbage input', () => {
    expect(() => decodeChunkCursor('not base64 json !!!')).toThrow(
      BadRequestException,
    );
  });

  it('rejects a tampered payload with the wrong shape', () => {
    const tampered = Buffer.from(
      JSON.stringify({ v: 1, d: 'doc', c: 'NaN' }),
    ).toString('base64url');
    expect(() => decodeChunkCursor(tampered)).toThrow(BadRequestException);
  });

  it('rejects an unknown version', () => {
    const wrongVersion = Buffer.from(
      JSON.stringify({ v: 2, d: 'doc', c: 0 }),
    ).toString('base64url');
    expect(() => decodeChunkCursor(wrongVersion)).toThrow(BadRequestException);
  });

  it('rejects a negative chunk index', () => {
    const negative = Buffer.from(
      JSON.stringify({ v: 1, d: 'doc', c: -1 }),
    ).toString('base64url');
    expect(() => decodeChunkCursor(negative)).toThrow(BadRequestException);
  });
});
