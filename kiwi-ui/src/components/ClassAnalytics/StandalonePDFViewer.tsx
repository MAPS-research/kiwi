import { PDFViewer } from "../PDFViewer/PDFViewer.tsx";
import type { PageChangeEvent } from "../PDFViewer/pdfTypes.ts";

interface StandalonePDFViewerProps {
  pdfFile: string;
  initialPage?: number;
  onPageChangeCallback?: (event: PageChangeEvent) => void;
}

export const StandalonePDFViewer = ({
  pdfFile,
  initialPage = 1,
  onPageChangeCallback,
}: StandalonePDFViewerProps) =>
  pdfFile ? (
    <PDFViewer
      pdfFile={pdfFile}
      initialPage={Math.max(0, initialPage - 1)}
      onPageChangeCallback={onPageChangeCallback}
    />
  ) : null;
