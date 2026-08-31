import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// react-pdf pulls in pdfjs (ESM/worker heavy). Stub only what the module under
// test needs: a PDFDataRangeTransport base class to extend.
vi.mock("react-pdf", () => {
  class PDFDataRangeTransport {
    length: number;
    constructor(length: number, _initialData: Uint8Array | null) {
      this.length = length;
    }
    onDataRange = vi.fn();
  }
  return { pdfjs: { PDFDataRangeTransport } };
});

import { probeRangeSupport, buildResilientDocumentOptions } from "./pdfRangeTransport.ts";

// Build a minimal Response-like object for fetch mocks.
const makeResponse = (
  status: number,
  headers: Record<string, string> = {},
  body = new ArrayBuffer(8)
) => ({
  status,
  headers: { get: (k: string) => headers[k] ?? headers[k.toLowerCase()] ?? null },
  arrayBuffer: () => Promise.resolve(body),
});

describe("probeRangeSupport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reports range support and total length from a 206 + Content-Range", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        makeResponse(206, { "Content-Range": "bytes 0-0/5155441" })
      ) as unknown as typeof fetch;

    const result = await probeRangeSupport("https://example.com/file.pdf");
    expect(result).toEqual({ length: 5155441, supportsRange: true });
  });

  it("reports no range support when the server ignores Range (200)", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(makeResponse(200, {})) as unknown as typeof fetch;

    const result = await probeRangeSupport("https://example.com/file.pdf");
    expect(result).toEqual({ length: 0, supportsRange: false });
  });

  it("retries on a transient network error, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce(
        makeResponse(206, { "Content-Range": "bytes 0-0/1000" })
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = probeRangeSupport("https://example.com/file.pdf");
    // First attempt fails, then a backoff sleep happens before the retry.
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ length: 1000, supportsRange: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retries", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("offline"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = probeRangeSupport("https://example.com/file.pdf");
    const assertion = expect(promise).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertion;

    // 1 initial attempt + 4 retries = 5 total.
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("sends an inclusive Range header for the probe", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(makeResponse(206, { "Content-Range": "bytes 0-0/10" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await probeRangeSupport("https://example.com/file.pdf");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/file.pdf",
      expect.objectContaining({ headers: { Range: "bytes=0-0" } })
    );
  });
});

describe("buildResilientDocumentOptions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns undefined for non-http URLs (data URIs etc.)", async () => {
    const result = await buildResilientDocumentOptions(
      "data:application/pdf;base64,AAAA"
    );
    expect(result).toBeUndefined();
  });

  it("wires the resilient transport + chunk options when ranges are supported", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        makeResponse(206, { "Content-Range": "bytes 0-0/2048" })
      ) as unknown as typeof fetch;

    const result = await buildResilientDocumentOptions("https://example.com/x.pdf");
    expect(result).toBeDefined();
    expect(result).toMatchObject({
      disableAutoFetch: true,
      rangeChunkSize: 64 * 1024,
    });
    expect(result!.range).toBeDefined();
  });

  it("falls back to undefined when the server does not support ranges", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(makeResponse(200, {})) as unknown as typeof fetch;

    const result = await buildResilientDocumentOptions("https://example.com/x.pdf");
    expect(result).toBeUndefined();
  });

  it("falls back to undefined when probing fails entirely", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError("offline")) as unknown as typeof fetch;

    const promise = buildResilientDocumentOptions("https://example.com/x.pdf");
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBeUndefined();
  });
});
