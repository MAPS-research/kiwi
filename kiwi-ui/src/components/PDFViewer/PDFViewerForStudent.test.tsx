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
import { ChatContext } from "../../pages/ClassLayout.tsx";
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
    expect(screen.getByRole("status")).toHaveTextContent("Loading your materials…");
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
    // The pin is the design system's speech-bubble glyph, never an emoji;
    // clicking it reveals the note text.
    const pin = await screen.findByTestId("comment-pin");
    expect(pin.querySelector("svg")).not.toBeNull();
    expect(screen.queryByText("💬")).not.toBeInTheDocument();
    fireEvent.click(pin);
    expect(await screen.findByText("Pinned note")).toBeInTheDocument();
  });
});

// Renders the viewer inside the class context, with the page the chat has in
// context (0-based), as StudentClassLayout provides it.
const renderInClass = (ui: React.ReactElement, currentPDFPage = 0) =>
  renderWithTheme(
    <ChatContext.Provider value={{ currentPDFPage, setCurrentPDFPage: vi.fn() }}>
      {ui}
    </ChatContext.Provider>
  );

describe("PDFViewerForStudents bar", () => {
  const pdfFile = "https://example.com/lecture.pdf";

  it("states why Previous and Next are unavailable while the document loads", async () => {
    renderInClass(<PDFViewerForStudents pdfFile={pdfFile} studentMode fileName="Lecture 3.pdf" />);
    await screen.findByTestId("pdf-document");

    const reason = "These controls are unavailable while the document loads.";
    const previous = screen.getByRole("button", { name: "Previous page" });
    const next = screen.getByRole("button", { name: "Next page" });
    expect(previous).toHaveAttribute("aria-disabled", "true");
    expect(previous).toHaveAccessibleDescription(reason);
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next).toHaveAccessibleDescription(reason);
    // The page count is unknown: an em dash for each value, read as "No value".
    expect(screen.getByText("— / —")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("No value")).toBeInTheDocument();
    // Nothing is shared with the chat until a page is showing.
    expect(screen.queryByText("Shared with Kiwi")).not.toBeInTheDocument();
    expect(screen.getByText("Lecture 3.pdf")).toBeInTheDocument();
  });

  it("marks Previous unavailable on the first page and says why", async () => {
    renderInClass(<PDFViewerForStudents pdfFile={pdfFile} studentMode />, 0);
    await screen.findByTestId("pdf-document");
    loadDocumentWithPages(3);

    const previous = await screen.findByRole("button", { name: "Previous page" });
    await waitFor(() =>
      expect(previous).toHaveAccessibleDescription("This is the first page.")
    );
    expect(previous).toHaveAttribute("aria-disabled", "true");
    const next = screen.getByRole("button", { name: "Next page" });
    expect(next).not.toHaveAttribute("aria-disabled");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("marks Next unavailable on the last page and says why", async () => {
    renderInClass(<PDFViewerForStudents pdfFile={pdfFile} studentMode />, 2);
    await screen.findByTestId("pdf-document");
    loadDocumentWithPages(3);

    const next = await screen.findByRole("button", { name: "Next page" });
    await waitFor(() => expect(next).toHaveAccessibleDescription("This is the last page."));
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Previous page" })).not.toHaveAttribute(
      "aria-disabled"
    );
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("stops zooming out at the smallest zoom and says so", async () => {
    renderInClass(<PDFViewerForStudents pdfFile={pdfFile} studentMode />);
    await screen.findByTestId("pdf-document");

    const zoomOut = screen.getByRole("button", { name: "Zoom out" });
    fireEvent.click(zoomOut); // 80%
    fireEvent.click(zoomOut); // 60%
    fireEvent.click(zoomOut); // 50%: the floor
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(zoomOut).toHaveAttribute("aria-disabled", "true");
    expect(zoomOut).toHaveAccessibleDescription("This is the smallest zoom.");
    fireEvent.click(zoomOut); // inert: nothing changes
    expect(screen.getByText("50%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(zoomOut).not.toHaveAttribute("aria-disabled");
  });

  it("frames the page in the chat's context and says it is shared with Kiwi", async () => {
    renderInClass(<PDFViewerForStudents pdfFile={pdfFile} studentMode />, 1);
    await screen.findByTestId("pdf-document");
    loadDocumentWithPages(3);

    expect(await screen.findByText("Shared with Kiwi")).toBeInTheDocument();
    const pages = screen.getAllByTestId("pdf-page").map((page) => page.parentElement!);
    expect(pages[1]).toHaveAttribute("aria-current", "true");
    expect(pages[1].getAttribute("style")).toContain(
      "var(--pdf-toolbar-variant-page-current-outline)"
    );
    expect(pages[0]).not.toHaveAttribute("aria-current");
    expect(pages[0].getAttribute("style")).toContain("var(--pdf-toolbar-frame)");
  });

  it("names the error's fix and retries with a secondary button", async () => {
    renderInClass(<PDFViewerForStudents pdfFile={pdfFile} studentMode />);
    await screen.findByTestId("pdf-document");
    failDocument();
    expect(
      await screen.findByText(
        "Couldn't load this PDF. Your connection may be slow or unstable. Check it, then select Retry."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toHaveClass("MuiButton-outlined");
  });
});

describe("PDFViewerForStudents summaries", () => {
  const pdfFile = "https://example.com/lecture.pdf";
  const summary = (id: string, content: string) => ({
    id,
    documentId: "doc-1",
    summaryNumber: 1,
    content,
    isVisibleToStudents: true,
    authorId: "a1",
    author: { id: "a1", name: "Dr. Hartmann" },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const mockSummaries = (list: unknown[]) => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => list,
    } as Response);
  };

  it("announces the instructor's summaries and opens them", async () => {
    mockSummaries([summary("s1", "First idea"), summary("s2", "Second idea")]);
    renderInClass(<PDFViewerForStudents pdfFile={pdfFile} studentMode documentId="doc-1" />);

    const banner = await screen.findByText("Your instructor added 2 summaries");
    expect(banner.closest(".MuiAlert-root")).toHaveAttribute("role", "status");
    fireEvent.click(screen.getByRole("button", { name: "Read summaries" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Document summaries");
    expect(dialog).toHaveTextContent("2 summaries");
    expect(dialog).toHaveTextContent("First idea");
    expect(dialog).toHaveTextContent("Second idea");
  });

  it("uses the singular for one summary and brings the banner back from the bar", async () => {
    mockSummaries([summary("s1", "Only idea")]);
    renderInClass(<PDFViewerForStudents pdfFile={pdfFile} studentMode documentId="doc-1" />);

    expect(await screen.findByText("Your instructor added 1 summary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Read summary" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Your instructor added 1 summary")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Document summaries" }));
    expect(screen.getByText("Your instructor added 1 summary")).toBeInTheDocument();
  });
});
