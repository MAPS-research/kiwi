import { render, waitFor } from "@testing-library/react";
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
