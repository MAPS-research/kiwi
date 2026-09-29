import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock react-pdf: render a Page stub per page and expose load callbacks. ---
vi.mock("react-pdf", () => {
  const Document = ({ file, options, onLoadSuccess, onLoadError, error, children }: any) => {
    // Expose handlers so tests can drive load success/failure.
    (globalThis as any).__lastDocument = { file, options, onLoadSuccess, onLoadError };
    if ((globalThis as any).__forceDocError) {
      return <div data-testid="doc-error">{error}</div>;
    }
    return (
      <div data-testid="pdf-document" data-file={file} data-has-options={String(!!options)}>
        {children}
      </div>
    );
  };
  const Page = ({ pageNumber }: any) => (
    <canvas data-testid="pdf-page" data-page={pageNumber} />
  );
  return { Document, Page, pdfjs: { GlobalWorkerOptions: {} } };
});

// Side-effect worker setup imports real pdfjs — stub it out.
vi.mock("./setupPdfWorker.ts", () => ({}));

// Control the resilient-options probe deterministically.
const mockBuildOptions = vi.fn();
vi.mock("./pdfRangeTransport.ts", () => ({
  buildResilientDocumentOptions: (url: string) => mockBuildOptions(url),
}));

// CSS imports
vi.mock("react-pdf/dist/Page/AnnotationLayer.css", () => ({}));
vi.mock("react-pdf/dist/Page/TextLayer.css", () => ({}));

import { PDFViewerForStudents } from "./PDFViewerForStudent.tsx";
import type { DocumentCommentPin } from "../../types/documentComments.ts";

// jsdom lacks these — the viewer uses them.
beforeEach(() => {
  (globalThis as any).__forceDocError = false;
  (globalThis as any).__lastDocument = undefined;
  mockBuildOptions.mockReset();
  mockBuildOptions.mockResolvedValue({ range: {}, disableAutoFetch: true });
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  // summaries fetch rejects (matches global setup) → no summaries
});

const theme = createTheme();
const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// Helper: simulate react-pdf finishing the document load with N pages.
const loadDocumentWithPages = (numPages: number) => {
  const doc = (globalThis as any).__lastDocument;
  act(() => doc?.onLoadSuccess?.({ numPages }));
};

// Helper: simulate react-pdf failing to load the document. The viewer logs the
// error via console.error on purpose; silence it to keep test output clean.
const failDocument = (message = "boom") => {
  const doc = (globalThis as any).__lastDocument;
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  act(() => doc?.onLoadError?.(new Error(message)));
  spy.mockRestore();
};

describe("PDFViewerForStudents", () => {
  const pdfFile = "https://example.com/recitation.pdf";

  it("renders nothing when studentMode is false", async () => {
    const { container } = renderWithTheme(
      <PDFViewerForStudents pdfFile={pdfFile} studentMode={false} />
    );
    expect(container).toBeEmptyDOMElement();
    // Let the probe effect's async state update settle inside act().
    await act(async () => {});
  });

  it("shows a placeholder when no pdfFile is provided", async () => {
    renderWithTheme(<PDFViewerForStudents pdfFile="" studentMode />);
    expect(screen.getByText(/Loading your class lectures/i)).toBeInTheDocument();
    await act(async () => {});
  });

  it("probes the URL for resilient range loading", async () => {
    renderWithTheme(<PDFViewerForStudents pdfFile={pdfFile} studentMode />);
    await waitFor(() => expect(mockBuildOptions).toHaveBeenCalledWith(pdfFile));
  });

  it("renders the Document with the resolved range options", async () => {
    renderWithTheme(<PDFViewerForStudents pdfFile={pdfFile} studentMode />);
    const doc = await screen.findByTestId("pdf-document");
    expect(doc).toHaveAttribute("data-file", pdfFile);
    expect(doc).toHaveAttribute("data-has-options", "true");
  });

  it("renders one Page per page once the document loads", async () => {
    renderWithTheme(<PDFViewerForStudents pdfFile={pdfFile} studentMode />);
    await screen.findByTestId("pdf-document");
    loadDocumentWithPages(3);
    await waitFor(() =>
      expect(screen.getAllByTestId("pdf-page")).toHaveLength(3)
    );
  });

  it("falls back to plain loading (no options) when ranges are unsupported", async () => {
    mockBuildOptions.mockResolvedValue(undefined);
    renderWithTheme(<PDFViewerForStudents pdfFile={pdfFile} studentMode />);
    const doc = await screen.findByTestId("pdf-document");
    expect(doc).toHaveAttribute("data-has-options", "false");
  });

  it("shows an error + Retry button when the document fails to load", async () => {
    renderWithTheme(<PDFViewerForStudents pdfFile={pdfFile} studentMode />);
    await screen.findByTestId("pdf-document");
    // Drive the load error callback.
    failDocument();
    expect(await screen.findByText(/Couldn't load this PDF/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("re-probes the URL when Retry is clicked", async () => {
    renderWithTheme(<PDFViewerForStudents pdfFile={pdfFile} studentMode />);
    await screen.findByTestId("pdf-document");
    failDocument();
    const retry = await screen.findByRole("button", { name: /retry/i });

    mockBuildOptions.mockClear();
    fireEvent.click(retry);
    await waitFor(() => expect(mockBuildOptions).toHaveBeenCalledWith(pdfFile));
  });

  it("renders comment pins for the matching page", async () => {
    const comments: DocumentCommentPin[] = [
      {
        id: "c1",
        text: "Pinned note",
        isVisibleToStudents: true,
        selectionRegion: { left: 10, top: 20, width: 5, height: 5, pageIndex: 0 },
        pinPosition: { left: 12, top: 20 },
      },
    ];
    renderWithTheme(
      <PDFViewerForStudents pdfFile={pdfFile} studentMode comments={comments} />
    );
    await screen.findByTestId("pdf-document");
    loadDocumentWithPages(1);
    // The pin renders the 💬 marker; clicking it reveals the note text.
    const pin = await screen.findByText("💬");
    fireEvent.click(pin);
    expect(await screen.findByText("Pinned note")).toBeInTheDocument();
  });
});
