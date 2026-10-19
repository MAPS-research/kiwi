import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { ChatContext } from "../../pages/ClassLayout.tsx";
import apiClient from "../../utils/api.ts";
import PDFComponent from "./PDFComponent.tsx";

/**
 * Tests for the Materials-tab persistence added to PDFComponent: on mount it
 * restores the last-viewed PDF (per class, key `materialsPdf_${classId}`) and
 * seeds the target page, instead of always re-auto-selecting the default
 * lecture at page 0. Falls back to auto-select when the persisted PDF is no
 * longer in the class document list.
 */

// The real viewer pulls in react-pdf + a PDF worker; stub it out but capture the
// props we assert against (onPageChangeCallback for the save path, initialPage
// for the restore target).
const viewerProps: { onPageChangeCallback?: (e: { currentPage: number }) => void; initialPage?: number } = {};
vi.mock("../PDFViewer/PDFViewerForStudent.tsx", () => ({
  PDFViewerForStudents: (props: any) => {
    viewerProps.onPageChangeCallback = props.onPageChangeCallback;
    viewerProps.initialPage = props.initialPage;
    return <div data-testid="pdf-viewer" />;
  },
}));
vi.mock("../../utils/useSaveInteraction.ts", () => ({
  useSaveInteraction: () => ({ saveInteraction: vi.fn() }),
}));

// documentControllerRetrieveDocument isn't in the global apiClient mock — add it.
(apiClient as any).documentControllerRetrieveDocument = vi.fn();
const mockGetDocList = apiClient.classControllerGetDocumentListIds as unknown as ReturnType<typeof vi.fn>;
const mockRetrieveDoc = (apiClient as any).documentControllerRetrieveDocument as ReturnType<typeof vi.fn>;

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
    configurable: true,
  });
  return store;
}

const DOCS = [
  { id: "doc-recitation", fileName: "recitation.pdf", materialType: "recitation" },
  { id: "doc-saved", fileName: "lecture-5.pdf", materialType: "class materials" },
];

const renderWithContext = (setters: Record<string, any>) =>
  render(
    <ChatContext.Provider
      value={{
        class: { classID: "class-1" } as any,
        currentPDFID: "",
        setCurrentPDFID: setters.setCurrentPDFID,
        currentPdfName: "",
        setCurrentPdfName: setters.setCurrentPdfName,
        currentPDFMaterialType: "",
        setCurrentPDFMaterialType: setters.setCurrentPDFMaterialType,
        setCurrentPDFPage: setters.setCurrentPDFPage,
        pdfContent: "",
        setPdfContent: setters.setPdfContent,
      }}
    >
      <PDFComponent />
    </ChatContext.Provider>
  );

const makeSetters = () => ({
  setCurrentPDFID: vi.fn(),
  setCurrentPdfName: vi.fn(),
  setCurrentPDFMaterialType: vi.fn(),
  setCurrentPDFPage: vi.fn(),
  setPdfContent: vi.fn(),
});

describe("PDFComponent Materials persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocList.mockResolvedValue({ documentIds: DOCS });
    mockRetrieveDoc.mockResolvedValue({ document: { documentContent: "content" } });
  });

  it("restores the persisted PDF and seeds its page when it still exists", async () => {
    const store = installMemoryLocalStorage();
    store.set(
      "materialsPdf_class-1",
      JSON.stringify({ id: "doc-saved", fileName: "lecture-5.pdf", materialType: "class materials", page: 4 })
    );
    const setters = makeSetters();

    renderWithContext(setters);

    await waitFor(() => {
      expect(setters.setCurrentPDFID).toHaveBeenCalledWith("doc-saved");
    });
    expect(setters.setCurrentPdfName).toHaveBeenCalledWith("lecture-5.pdf");
    expect(setters.setCurrentPDFPage).toHaveBeenCalledWith(4);
  });

  it("falls back to auto-select (last lecture) when the persisted PDF is gone", async () => {
    const store = installMemoryLocalStorage();
    store.set(
      "materialsPdf_class-1",
      JSON.stringify({ id: "doc-deleted", fileName: "old.pdf", materialType: "recitation", page: 2 })
    );
    const setters = makeSetters();

    renderWithContext(setters);

    await waitFor(() => {
      expect(setters.setCurrentPDFID).toHaveBeenCalledWith("doc-saved");
    });
    // The deleted doc's page must NOT be seeded.
    expect(setters.setCurrentPDFPage).not.toHaveBeenCalledWith(2);
  });

  it("auto-selects the last lecture when nothing is persisted", async () => {
    installMemoryLocalStorage();
    const setters = makeSetters();

    renderWithContext(setters);

    await waitFor(() => {
      expect(setters.setCurrentPDFID).toHaveBeenCalledWith("doc-saved");
    });
  });

  it("passes the restored page to the viewer as initialPage", async () => {
    const store = installMemoryLocalStorage();
    store.set(
      "materialsPdf_class-1",
      JSON.stringify({ id: "doc-saved", fileName: "lecture-5.pdf", materialType: "class materials", page: 7 })
    );
    renderWithContext(makeSetters());

    await waitFor(() => {
      expect(viewerProps.initialPage).toBe(7);
    });
  });

  it("persists a page change immediately (no debounce wait)", async () => {
    const store = installMemoryLocalStorage();
    store.set(
      "materialsPdf_class-1",
      JSON.stringify({ id: "doc-saved", fileName: "lecture-5.pdf", materialType: "class materials", page: 0 })
    );

    // Stateful wrapper so the component's selectedPDFID (read from context) is
    // actually populated by the restore before we invoke onPageChangeCallback —
    // mirroring the real ClassLayout that owns this state.
    const StatefulWrapper = () => {
      const [pdfId, setPdfId] = useState("");
      const [pdfName, setPdfName] = useState("");
      const [materialType, setMaterialType] = useState("");
      return (
        <ChatContext.Provider
          value={{
            class: { classID: "class-1" } as any,
            currentPDFID: pdfId,
            setCurrentPDFID: setPdfId,
            currentPdfName: pdfName,
            setCurrentPdfName: setPdfName,
            currentPDFMaterialType: materialType,
            setCurrentPDFMaterialType: setMaterialType,
            setCurrentPDFPage: vi.fn(),
            pdfContent: "",
            setPdfContent: vi.fn(),
          }}
        >
          <PDFComponent />
        </ChatContext.Provider>
      );
    };
    render(<StatefulWrapper />);

    await waitFor(() => {
      expect(viewerProps.onPageChangeCallback).toBeDefined();
    });
    // Wait until the restore has populated the selected PDF id.
    await waitFor(() => {
      const saved = JSON.parse(store.get("materialsPdf_class-1")!);
      expect(saved.id).toBe("doc-saved");
    });

    // Simulate the viewer reporting a scroll to page 9. The write must happen
    // synchronously — no timers advanced — so a fast refresh doesn't lose it.
    viewerProps.onPageChangeCallback!({ currentPage: 9 });

    const saved = JSON.parse(store.get("materialsPdf_class-1")!);
    expect(saved.page).toBe(9);
  });
});

/**
 * The drawer (Materials page, S-02): the rail toggles it, the Lecture /
 * Recitation filter chips pick the group, and the open file is marked.
 */
describe("PDFComponent drawer", () => {
  // Owns the selection like StudentClassLayout, so auto-select marks a file.
  const StatefulMaterials = () => {
    const [pdfId, setPdfId] = useState("");
    const [pdfName, setPdfName] = useState("");
    const [materialType, setMaterialType] = useState("");
    return (
      <ChatContext.Provider
        value={{
          class: { classID: "class-1" } as any,
          currentPDFID: pdfId,
          setCurrentPDFID: setPdfId,
          currentPdfName: pdfName,
          setCurrentPdfName: setPdfName,
          currentPDFMaterialType: materialType,
          setCurrentPDFMaterialType: setMaterialType,
          setCurrentPDFPage: vi.fn(),
          pdfContent: "",
          setPdfContent: vi.fn(),
        }}
      >
        <PDFComponent />
      </ChatContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    installMemoryLocalStorage();
    mockRetrieveDoc.mockResolvedValue({ document: { documentContent: "content" } });
  });

  it("marks the open file with the selection and a check", async () => {
    mockGetDocList.mockResolvedValue({
      documentIds: [
        { id: "doc-1", fileName: "Lecture 1.pdf", materialType: "class materials" },
        { id: "doc-2", fileName: "Lecture 2.pdf", materialType: "class materials" },
      ],
    });
    render(<StatefulMaterials />);

    // Auto-select opens the last lecture.
    const current = await screen.findByRole("button", { name: "Lecture 2.pdf" });
    await waitFor(() => expect(current).toHaveAttribute("aria-current", "true"));
    expect(within(current).getByTestId("CheckIcon")).toBeInTheDocument();

    const other = screen.getByRole("button", { name: "Lecture 1.pdf" });
    expect(other).not.toHaveAttribute("aria-current");
    expect(within(other).queryByTestId("CheckIcon")).not.toBeInTheDocument();
  });

  it("switches groups with the filter chips and names an empty group", async () => {
    mockGetDocList.mockResolvedValue({
      documentIds: [{ id: "doc-1", fileName: "Lecture 1.pdf", materialType: "class materials" }],
    });
    render(<StatefulMaterials />);

    const lecture = screen.getByRole("button", { name: "Lecture" });
    const recitation = screen.getByRole("button", { name: "Recitation" });
    expect(lecture).toHaveAttribute("aria-pressed", "true");
    expect(lecture).toHaveClass("MuiChip-outlined", "MuiChip-colorPrimary");
    expect(recitation).toHaveAttribute("aria-pressed", "false");
    expect(recitation).not.toHaveClass("MuiChip-colorPrimary");
    expect(await screen.findByRole("button", { name: "Lecture 1.pdf" })).toBeInTheDocument();

    fireEvent.click(recitation);
    expect(recitation).toHaveAttribute("aria-pressed", "true");
    expect(lecture).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("No recitations yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lecture 1.pdf" })).not.toBeInTheDocument();
  });

  it("names an empty lecture group", async () => {
    mockGetDocList.mockResolvedValue({
      documentIds: [{ id: "doc-r", fileName: "Recitation 1.pdf", materialType: "recitation" }],
    });
    renderWithContext(makeSetters());
    expect(await screen.findByText("No lectures yet")).toBeInTheDocument();
  });

  it("shows and hides the drawer from the rail", async () => {
    mockGetDocList.mockResolvedValue({ documentIds: DOCS });
    render(<StatefulMaterials />);
    // Let the list load and auto-select settle first.
    const opened = await screen.findByRole("button", { name: "lecture-5.pdf" });
    await waitFor(() => expect(opened).toHaveAttribute("aria-current", "true"));

    const rail = screen.getByRole("button", { name: "Show class materials" });
    expect(rail).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Class materials" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("region", { name: "Class materials" })).not.toBeInTheDocument();
    expect(rail).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(rail);
    expect(screen.getByRole("heading", { name: "Class materials" })).toBeInTheDocument();
    expect(rail).toHaveAttribute("aria-pressed", "true");
  });

  it("says the class has no materials instead of loading forever", async () => {
    mockGetDocList.mockResolvedValue({ documentIds: [] });
    renderWithContext(makeSetters());

    expect(await screen.findByText("No materials yet")).toBeInTheDocument();
    expect(screen.getByText("Your instructor hasn't added any to this class.")).toBeInTheDocument();
    expect(screen.queryByTestId("pdf-viewer")).not.toBeInTheDocument();
  });
});
