import { useState } from "react";
import { Document, Page } from "react-pdf";
import { usePdfSource } from "../PDFViewer/usePdfSource.ts";
import "../PDFViewer/setupPdfWorker.ts";

export const ThumbnailViewer = ({ pdfFile }: { pdfFile: string }) => {
  const [retry, setRetry] = useState(0);
  const source = usePdfSource(pdfFile, retry);
  const error = (
    <p>
      Error displaying thumbnail.{" "}
      <button onClick={(event) => { event.preventDefault(); event.stopPropagation(); setRetry((value) => value + 1); }}>Retry</button>
    </p>
  );
  if (!pdfFile) return error;
  return source ? (
    <Document
      key={`${pdfFile}:${retry}`}
      file={pdfFile}
      options={source.options}
      suspense={false}
      error={error}
      loading={<p>Loading thumbnail…</p>}
    >
      <Page
        pageNumber={1}
        width={200}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        error={error}
      />
    </Document>
  ) : (
    <p>Loading thumbnail…</p>
  );
};
