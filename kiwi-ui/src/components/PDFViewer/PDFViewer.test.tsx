import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PDFViewer } from "./PDFViewer.tsx";
import { StandalonePDFViewer } from "../ClassAnalytics/StandalonePDFViewer.tsx";

const state = vi.hoisted(() => ({
  document: {} as any,
  error: false,
  probe: vi.fn(),
}));
vi.mock("./setupPdfWorker.ts", () => ({}));
vi.mock("./pdfRangeTransport.ts", () => ({
  buildResilientDocumentOptions: (url: string) => state.probe(url),
}));
vi.mock("react-pdf", () => ({
  Document: (props: any) => {
    state.document = props;
    return (
      <div data-testid="document" data-file={props.file}>
        {state.error ? props.error : props.children}
      </div>
    );
  },
  Page: ({ pageNumber, width }: any) => (
    <canvas data-testid="page" data-page={pageNumber} data-width={width} />
  ),
}));

beforeEach(() => {
  state.error = false;
  state.probe.mockReset().mockResolvedValue(undefined);
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  HTMLElement.prototype.scrollTo = vi.fn();
});
async function load(pages = 3) {
  await screen.findByTestId("document");
  act(() => state.document.onLoadSuccess({ numPages: pages }));
}

it("keeps zero-based callbacks and bounds page navigation", async () => {
  const onChange = vi.fn();
  render(<PDFViewer pdfFile="a.pdf" onPageChangeCallback={onChange} />);
  await load();
  expect(
    screen.getByRole("button", { name: "Previous" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByTestId("page")).toHaveAttribute("data-page", "2");
  expect(onChange).toHaveBeenLastCalledWith({ currentPage: 1 });
  fireEvent.click(screen.getByRole("button", { name: "Last" }));
  expect(
    screen.getByRole("button", { name: "Next" }),
  ).toBeDisabled();
});
it("converts analytics' one-based initial page and clamps it", async () => {
  const { rerender } = render(
    <StandalonePDFViewer pdfFile="a.pdf" initialPage={2} />,
  );
  await load();
  expect(screen.getByTestId("page")).toHaveAttribute("data-page", "2");
  rerender(<StandalonePDFViewer pdfFile="a.pdf" initialPage={20} />);
  expect(screen.getByTestId("page")).toHaveAttribute("data-page", "3");
});
it("resets page and document state when the file changes", async () => {
  const { rerender } = render(<PDFViewer pdfFile="a.pdf" />);
  await load();
  fireEvent.click(screen.getByRole("button", { name: "Last" }));
  rerender(<PDFViewer pdfFile="b.pdf" />);
  await load(1);
  expect(screen.getByTestId("page")).toHaveAttribute("data-page", "1");
  expect(screen.getByTestId("document")).toHaveAttribute("data-file", "b.pdf");
});
it("re-probes and supplies a fresh transport when retrying", async () => {
  state.error = true;
  state.probe
    .mockResolvedValueOnce({ range: "first" })
    .mockResolvedValueOnce({ range: "second" });
  render(<PDFViewer pdfFile="a.pdf" />);
  await screen.findByRole("button", { name: "Retry" });
  expect(state.document.suspense).toBe(false);
  expect(state.document.options.range).toBe("first");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(state.document.options.range).toBe("second"));
});
it("wraps the page and its annotation overlay in the selection surface", async () => {
  render(
    <PDFViewer
      pdfFile="a.pdf"
      renderPage={(page) => <section data-testid="selection">{page}</section>}
      renderHighlights={({ pageIndex }) => (
        <span data-testid="overlay">{pageIndex}</span>
      )}
    />,
  );
  await load();
  expect(screen.getByTestId("selection")).toContainElement(
    screen.getByTestId("page"),
  );
  expect(screen.getByTestId("selection")).toContainElement(
    screen.getByTestId("overlay"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByTestId("overlay")).toHaveTextContent("1");
});
it("zooms the page and restores width fit", async () => {
  render(<PDFViewer pdfFile="a.pdf" />);
  await load();
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByTestId("page")).toHaveAttribute("data-width", "750");
  fireEvent.click(screen.getByRole("button", { name: "Fit width" }));
  expect(screen.getByTestId("page")).toHaveAttribute("data-width", "600");
});
it("renders all consent pages in continuous mode", async () => {
  render(<PDFViewer pdfFile="consent.pdf" continuous />);
  await load();
  expect(screen.getAllByTestId("page")).toHaveLength(3);
});
it("selects a page from thumbnails", async () => {
  render(<PDFViewer pdfFile="a.pdf" />);
  await load();
  fireEvent.click(screen.getByRole("button", { name: "Thumbnails" }));
  fireEvent.click(screen.getByRole("button", { name: "Go to page 3" }));
  expect(screen.getByRole("spinbutton", { name: "Page" })).toHaveValue(3);
});
it("asks for a file when there is none", async () => {
  render(<PDFViewer pdfFile="" />);
  expect(screen.getByText("Choose a file to open.")).toBeInTheDocument();
  // Let the source probe settle inside act().
  await act(async () => {});
});
it("reads an unknown page count as no value until the document loads", async () => {
  render(<PDFViewer pdfFile="a.pdf" />);
  await screen.findByTestId("document");
  expect(screen.getByText("—")).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByText("No value")).toBeInTheDocument();
  await load(4);
  expect(screen.queryByText("No value")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open or print" })).toHaveAttribute("href", "a.pdf");
});
it("says what to check when the PDF fails, with Retry beside it", async () => {
  state.error = true;
  render(<PDFViewer pdfFile="a.pdf" />);
  expect(
    await screen.findByText(
      "Couldn't load this PDF. Your connection may be slow or unstable. Check it, then select Retry.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});
