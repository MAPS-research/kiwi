import { useEffect, useState } from "react";
import { buildResilientDocumentOptions } from "./pdfRangeTransport.ts";

/** A fresh transport is needed for each file and each retry. */
export function usePdfSource(url: string, retry: number) {
  const [source, setSource] = useState<{
    url: string;
    retry: number;
    options?: Record<string, unknown>;
  }>();
  useEffect(() => {
    let cancelled = false;
    buildResilientDocumentOptions(url).then((options) => {
      if (!cancelled) setSource({ url, retry, options });
    });
    return () => {
      cancelled = true;
    };
  }, [url, retry]);
  return source?.url === url && source.retry === retry ? source : undefined;
}
