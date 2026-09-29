import { pdfjs } from "react-pdf";

/**
 * Resilient HTTP range loading for pdf.js (react-pdf / pdfjs-dist).
 *
 * pdf.js's built-in range transport fetches inside its Web Worker and has no
 * per-request timeout: a stalled chunk on a spotty connection hangs forever. We
 * replace it with a main-thread `PDFDataRangeTransport` that fetches every range
 * via `fetch` + `AbortController`, so we control:
 *   - a per-request timeout (a stalled chunk is aborted, not left hanging)
 *   - automatic retry with exponential backoff on timeout / network error
 *
 * Keeps the partial-content win (small 206 chunks, fast first paint, ~256 KB
 * retry unit) and recovers automatically from stalled requests.
 *
 * IMPORTANT: we import `PDFDataRangeTransport` from `react-pdf`'s own pdfjs so it
 * is the SAME pdfjs instance react-pdf uses internally — otherwise pdf.js would
 * not recognise the transport.
 */

// Tuned for very slow links (Slow 3G ~400 Kbps / ~2s latency). A 64 KB chunk
// transfers in ~1.5-2s on 3G, comfortably under the 30s timeout, so genuinely
// slow-but-working chunks aren't aborted prematurely. The 30s timeout still
// surfaces the Retry UI reasonably fast on a truly stalled connection.
const REQUEST_TIMEOUT_MS = 30_000; // cancel a single stalled range after 30s
const MAX_RETRIES = 4; // attempts per range before giving up
const BASE_BACKOFF_MS = 500; // 0.5s, 1s, 2s, 4s

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch one inclusive byte range with timeout + retry-with-backoff. */
async function fetchRangeWithRetry(
  url: string,
  begin: number,
  end: number // inclusive
): Promise<Uint8Array> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { Range: `bytes=${begin}-${end}` },
        signal: controller.signal,
      });
      if (res.status !== 206 && res.status !== 200) {
        throw new Error(`Range request failed with status ${res.status}`);
      }
      return new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) await sleep(BASE_BACKOFF_MS * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Range request failed");
}

/** Probe the URL to learn total size + confirm range support, with retry so a
 *  transient drop during probing doesn't disable the resilient path entirely. */
export async function probeRangeSupport(
  url: string
): Promise<{ length: number; supportsRange: boolean }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { Range: "bytes=0-0" },
        signal: controller.signal,
      });
      const contentRange = res.headers.get("Content-Range"); // "bytes 0-0/123456"
      if (res.status === 206 && contentRange) {
        const total = Number(contentRange.split("/")[1]);
        if (Number.isFinite(total) && total > 0) {
          return { length: total, supportsRange: true };
        }
      }
      // Server responded but without range support — no point retrying.
      return { length: 0, supportsRange: false };
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) await sleep(BASE_BACKOFF_MS * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Probe failed");
}

class ResilientRangeTransport extends pdfjs.PDFDataRangeTransport {
  private url: string;

  constructor(url: string, length: number) {
    super(length, /* initialData */ null);
    this.url = url;
  }

  // pdf.js asks for a [begin, end) half-open range; HTTP Range is inclusive.
  requestDataRange(begin: number, end: number): void {
    fetchRangeWithRetry(this.url, begin, end - 1)
      .then((chunk) => this.onDataRange(begin, chunk))
      .catch(() => {
        // Final failure after retries: feed null so pdf.js rejects the loading
        // task, which surfaces the viewer's error UI (Retry).
        this.onDataRange(begin, null as unknown as Uint8Array);
      });
  }
}

/**
 * Build the `options` object for react-pdf's <Document>. If the URL supports
 * ranges, returns options wired to the resilient transport; otherwise returns
 * undefined so <Document file={url}> loads normally.
 */
export async function buildResilientDocumentOptions(
  url: string
): Promise<Record<string, unknown> | undefined> {
  if (!/^https?:/i.test(url)) return undefined; // data URI etc.: let pdf.js handle it
  let info: { length: number; supportsRange: boolean };
  try {
    info = await probeRangeSupport(url);
  } catch {
    return undefined; // probe failed: fall back to default loading
  }
  if (!info.supportsRange) return undefined;
  return {
    range: new ResilientRangeTransport(url, info.length),
    disableAutoFetch: true, // only fetch bytes for the current view
    // 64 KB chunks: small enough to transfer in ~1.5-2s even on Slow 3G, so they
    // complete within REQUEST_TIMEOUT_MS instead of being aborted mid-flight.
    // (pdf.js default is 64 KB; we set it explicitly to document the intent.)
    rangeChunkSize: 64 * 1024,
  };
}
