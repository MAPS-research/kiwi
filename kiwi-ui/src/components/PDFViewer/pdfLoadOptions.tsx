import React from "react";
import type { PdfJs, RenderError } from "@react-pdf-viewer/core";
import { Alert, Box, Button } from "@mui/material";
import { RefreshOutlined as RefreshIcon } from "@mui/icons-material";

/**
 * Tune pdf.js to load PDFs via small HTTP 206 range requests instead of
 * bulk-downloading the whole file. This is the key resilience win for users on
 * slow / unreliable networks: a series of small, resumable chunk requests is far
 * less likely to stall than one long download, and a dropped chunk costs ~256 KB
 * to re-fetch instead of the whole file.
 *
 * Requires the `fileUrl` to be a byte-serving URL whose server honors range
 * requests (the backend returns an S3/MinIO presigned URL, which does).
 *
 * NOTE: `disableStream`, `disableRange`, `disableAutoFetch`, and `rangeChunkSize`
 * are valid pdf.js runtime options but are NOT declared on @react-pdf-viewer's
 * narrow `PdfJs.GetDocumentParams` type, so the return value must be cast.
 *
 * Known limitation: pdf.js range fetching happens inside its Web Worker and has
 * no per-request timeout, and @react-pdf-viewer@3.12 (the latest/final release)
 * exposes only `transformGetDocumentParams` + `renderError` — it does not support
 * a custom `range` transport. So a persistently-stalling socket can still hang
 * until the user hits Retry (see `renderPdfError`). Fully automatic stall
 * recovery would require replacing the viewer library or driving pdf.js directly.
 */
export const transformGetDocumentParams = (
  options: PdfJs.GetDocumentParams
): PdfJs.GetDocumentParams =>
  ({
    ...options,
    disableStream: false, // allow streaming
    disableRange: false, // allow range requests
    disableAutoFetch: true, // do NOT eagerly prefetch the whole file — key win on slow links
    rangeChunkSize: 256 * 1024, // 256 KB chunks (pdf.js default is 64 KB)
  } as PdfJs.GetDocumentParams);

/**
 * Shared error renderer for PDF viewers. Shows a friendly message plus a Retry
 * button. Pass an `onRetry` callback (typically one that bumps a `reloadKey`
 * used as the Viewer `key`) to force a fresh `getDocument` attempt — this is the
 * recovery path for a load that failed or stalled on a bad connection.
 */
export const renderPdfError =
  (onRetry?: () => void): RenderError =>
  () =>
    (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 2,
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 420 }}>
          Couldn&apos;t load this PDF. This can happen on a slow or unstable
          network connection.
        </Alert>
        {onRetry && (
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
          >
            Retry
          </Button>
        )}
      </Box>
    );
