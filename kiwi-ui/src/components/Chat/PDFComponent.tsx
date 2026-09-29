import {
  Box,
  ButtonBase,
  IconButton,
  Skeleton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import theme from "../../Theme.ts";

// PDF page-change event (0-based current page). Kept local so this file does not
// depend on the (removed) @react-pdf-viewer types.
interface PageChangeEvent {
  currentPage: number;
}
import apiClient, { basePath } from "../../utils/api.ts";
import { ChatContext } from "../../pages/ClassLayout.tsx";
import { DocumentIdsForChat } from "../../services/index.ts";
import { PDFViewerForStudents } from "../PDFViewer/PDFViewerForStudent.tsx";
import { useSaveInteraction } from "../../utils/useSaveInteraction.ts";
import type { DocumentCommentPin } from "../../types/documentComments.ts";
import { mapServerCommentToPin } from "../../utils/documentComments.ts";

/**
 * Last-viewed PDF (document + page) persisted per class to localStorage, so a
 * full refresh restores what the student was reading instead of re-auto-selecting
 * the default recitation at page 0. Mirrors the commentPinPositions_{docId}
 * pattern already used in this file. `page` is 0-based to match the viewer's
 * page-change contract.
 */
interface PersistedPdf {
  id: string;
  fileName: string;
  materialType: string;
  page: number;
}

const materialsPdfKey = (classId: string) => `materialsPdf_${classId}`;

function loadPersistedPdf(classId: string | undefined): PersistedPdf | null {
  if (!classId) return null;
  try {
    const stored = localStorage.getItem(materialsPdfKey(classId));
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.warn("[PDFComponent] Failed to load persisted PDF:", error);
  }
  return null;
}

function savePersistedPdf(classId: string | undefined, pdf: PersistedPdf): void {
  if (!classId) return;
  try {
    localStorage.setItem(materialsPdfKey(classId), JSON.stringify(pdf));
  } catch (error) {
    console.warn("[PDFComponent] Failed to save persisted PDF:", error);
  }
}

// Material types behind the Lecture/Recitation switch. "class materials" is
// the backend's type for lecture PDFs.
type MaterialFilter = "class materials" | "recitation";

const PDFComponent: React.FC = () => {
  const [pdfList, setPdfList] = useState<DocumentIdsForChat[]>();
  // Which document type the sidebar drawer lists. Auto-select prefers the last
  // lecture, so that's the default until a selection (restore/user) says otherwise.
  const [materialFilter, setMaterialFilter] = useState<MaterialFilter>("class materials");
  // Document drawer (Materials Page Redesign): overlays the viewer, toggled from
  // the icon rail. Open by default so the file list is discoverable.
  const [drawerOpen, setDrawerOpen] = useState(true);
  const { saveInteraction } = useSaveInteraction();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pdfCache = useRef(new Map<string, any>());
  // Page to restore for the current document (0-based). Passed explicitly to the
  // viewer instead of relying on the shared currentPDFPage, which handleScroll
  // overwrites during initial layout. Reset to 0 when the user picks a new PDF.
  const [initialPage, setInitialPage] = useState<number>(0);
  const [pdfComments, setPdfComments] = useState<DocumentCommentPin[]>([]);

  const getPdfById = useCallback(async (pdfId: string) => {
    if (pdfCache.current.has(pdfId)) {
      return pdfCache.current.get(pdfId);
    }

    const res = await apiClient.documentControllerRetrieveDocument({
      chunkRequest: {
        id: pdfId,
      },
    });

    pdfCache.current.set(pdfId, res.document);
    return res.document;
  }, []);

  const fetchStudentComments = useCallback(
    async (documentId: string | undefined) => {
      if (!documentId) {
        setPdfComments([]);
        return;
      }

      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `${basePath}/document/${documentId}/comments/student`,
          {
            method: "GET",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        const commentList = Array.isArray(data)
          ? data
          : Array.isArray(data?.comments)
          ? data.comments
          : [];

        // Load stored pinPositions from localStorage (same storage as admin)
        const getStoredPinPositions = (docId: string): Map<string, { left: number; top: number }> => {
          try {
            const key = `commentPinPositions_${docId}`;
            const stored = localStorage.getItem(key);
            if (stored) {
              const data = JSON.parse(stored);
              return new Map(Object.entries(data));
            }
          } catch (error) {
            console.error("Failed to load pinPositions from localStorage:", error);
          }
          return new Map();
        };

        const storedPinPositions = getStoredPinPositions(documentId);

        const mappedComments = commentList.map((comment: any) => {
          const mapped = mapServerCommentToPin(comment);
          
          // Use stored pinPosition if server doesn't provide a valid one
          const storedPinPosition = storedPinPositions.get(mapped.id);
          if (storedPinPosition && (!mapped.pinPosition || (mapped.pinPosition.left === 0 && mapped.pinPosition.top === 0))) {
            console.log('Using stored pinPosition for student comment:', storedPinPosition);
            mapped.pinPosition = storedPinPosition;
          }
          
          return mapped;
        });

        setPdfComments(mappedComments);
      } catch (error) {
        console.error("Failed to load student comments:", error);
        setPdfComments([]);
      }
    },
    []
  );

  const {
    class: selectedClass,
    currentPDFID: selectedPDFID,
    setCurrentPDFID: setSelectedPDFID,
    currentPdfName: selectedPdfName,
    setCurrentPdfName: setSelectedPdfName,
    currentPDFMaterialType: selectedPDFMaterialType,
    setCurrentPDFMaterialType: setSelectedPDFMaterialType,
    setCurrentPDFPage,
    pdfContent,
    setPdfContent,
    // multipleCourses,
  } = useContext(ChatContext);
  // get the student class ID from the API
  // use admin endpoint for now

  useEffect(() => {
    // Cleanup timeout when the component unmounts
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchClassPDFs = async () => {
      if (selectedClass === undefined) return;
      if (!selectedClass.classID) return;
      const res = await apiClient.classControllerGetDocumentListIds({
        classID: selectedClass.classID,
      });
      if (res) {
        console.log("documents:", res);
        setPdfList(res.documentIds);
      }
      const documents = res.documentIds;
      if (!documents || documents.length === 0) return;
      if (!documents[0]) return;
      if (
        setSelectedPdfName &&
        setSelectedPDFID &&
        setSelectedPDFMaterialType &&
        setPdfContent
      ) {
        // Restore the last-viewed PDF + page for this class if it still exists
        // in the current document list; otherwise fall through to auto-select.
        const persisted = loadPersistedPdf(selectedClass.classID);
        const persistedDoc = persisted
          ? documents.find((pdf) => pdf.id === persisted.id)
          : undefined;
        if (persisted && persistedDoc) {
          setSelectedPdfName(persistedDoc.fileName || "");
          setSelectedPDFID(persistedDoc.id || "");
          setSelectedPDFMaterialType(persistedDoc.materialType || "");
          // Set the restore target BEFORE the content so the viewer has it when
          // it mounts/loads. This is the explicit channel handleScroll can't stomp.
          setInitialPage(persisted.page ?? 0);
          const restoredContent = await getPdfById(persistedDoc.id);
          setPdfContent(restoredContent.documentContent);
          await fetchStudentComments(persistedDoc.id);
          if (setCurrentPDFPage) setCurrentPDFPage(persisted.page ?? 0);
          return;
        }

        // First open defaults to the LAST lecture (Materials Page Redesign).
        const reversedClassPDFs = [...documents].reverse();
        const lastLecturePDF = reversedClassPDFs.find(
          (pdf) => pdf.materialType === "class materials"
        );
        if (lastLecturePDF) {
          setSelectedPdfName(lastLecturePDF.fileName || "");
          setSelectedPDFID(lastLecturePDF.id || "");
          setSelectedPDFMaterialType(lastLecturePDF.materialType || "");
          const pdfContent = await getPdfById(lastLecturePDF.id);
          setPdfContent(pdfContent.documentContent);
          await fetchStudentComments(lastLecturePDF.id);
        } else {
          setSelectedPdfName(documents[0].fileName || "");
          setSelectedPDFID(documents[0].id || "");
          setSelectedPDFMaterialType(documents[0].materialType || "");
          const pdfContent = await getPdfById(documents[0].id);
          setPdfContent(pdfContent.documentContent);
          await fetchStudentComments(documents[0].id);
        }
      }
    };

    fetchClassPDFs();
  }, [
    selectedClass,
    setSelectedPdfName,
    setSelectedPDFID,
    setSelectedPDFMaterialType,
    setPdfContent,
    setCurrentPDFPage,
    getPdfById,
    fetchStudentComments,
  ]);

  useEffect(() => {
    if (selectedPDFID) {
      fetchStudentComments(selectedPDFID);
    } else {
      setPdfComments([]);
    }
  }, [selectedPDFID, fetchStudentComments]);

  // Keep the switch in sync with whatever ends up selected (restore from
  // localStorage, auto-select, chat navigation) without fighting a manual flip
  // — this only runs when the selected PDF's type actually changes.
  useEffect(() => {
    if (
      selectedPDFMaterialType === "class materials" ||
      selectedPDFMaterialType === "recitation"
    ) {
      setMaterialFilter(selectedPDFMaterialType);
    }
  }, [selectedPDFMaterialType]);

  // Select a document from the drawer file list.
  const handlePickPdf = async (selectedPDF: DocumentIdsForChat) => {
    if (!selectedPDF?.id) return;
    if (setSelectedPdfName) {
      setSelectedPdfName(selectedPDF.fileName || "");
    }
    if (setSelectedPDFID) {
      setSelectedPDFID(selectedPDF.id);
    }
    if (setSelectedPDFMaterialType) {
      setSelectedPDFMaterialType(selectedPDF.materialType || "");
    }
    if (setPdfContent) {
      setPdfContent("");
      const pdfContent = await getPdfById(selectedPDF.id);
      setPdfContent(pdfContent.documentContent);
    }
    await fetchStudentComments(selectedPDF.id);
    // A freshly picked PDF starts at the top; drop any restore target.
    setInitialPage(0);
    // Remember this selection (page resets to 0 for a freshly picked PDF).
    savePersistedPdf(selectedClass?.classID, {
      id: selectedPDF.id,
      fileName: selectedPDF.fileName || "",
      materialType: selectedPDF.materialType || "",
      page: 0,
    });
  };

  const onPageChangeCallback = useCallback(
    (e: PageChangeEvent) => {
      console.log("page changed", e);

      // Clear any existing timeout before setting a new one
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Persist the page immediately (localStorage is synchronous and cheap) so a
      // quick refresh or tab-switch right after scrolling doesn't lose it. The
      // previous 2s-debounced write dropped the page whenever the user left within
      // the window — the "doesn't always remember" bug.
      if (selectedPDFID) {
        savePersistedPdf(selectedClass?.classID, {
          id: selectedPDFID,
          fileName: selectedPdfName || "",
          materialType: selectedPDFMaterialType || "",
          page: e.currentPage,
        });
      }

      // Keep the server-side interaction log debounced (only log when the user
      // settles on a page for >2s), since that's a network call, not local state.
      timeoutRef.current = setTimeout(() => {
        saveInteraction({
          type: "frontend-interaction-pdf-change",
          context: {},
          pdfId: selectedPDFID,
          pdfPage: e.currentPage,
          pdfMaterialType: selectedPDFMaterialType,
        });
        console.log("save interaction page", e.currentPage);
      }, 2000); // 2 second delay

      console.log("current page", e.currentPage);
      if (setCurrentPDFPage) setCurrentPDFPage(e.currentPage);
    },
    [
      setCurrentPDFPage,
      selectedPDFID,
      selectedPdfName,
      selectedPDFMaterialType,
      selectedClass?.classID,
      saveInteraction,
    ]
  );

  const drawerFiles = (pdfList ?? []).filter(
    (pdf) => pdf.materialType === materialFilter
  );

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
      }}
    >
      {/* Icon rail */}
      <Box
        sx={{
          width: 48,
          flex: "none",
          bgcolor: "#FAF9FC",
          borderRight: "1px solid #E5E1EB",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 1,
          gap: 0.5,
          zIndex: 40,
        }}
      >
        <IconButton
          onClick={() => setDrawerOpen((open) => !open)}
          title="Class materials"
          sx={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            bgcolor: drawerOpen ? "#EFE8F6" : "transparent",
            "&:hover": { bgcolor: "#EFE8F6" },
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M3 4.5C3 3.7 3.7 3 4.5 3H7L8.5 5H13.5C14.3 5 15 5.7 15 6.5V13.5C15 14.3 14.3 15 13.5 15H4.5C3.7 15 3 14.3 3 13.5V4.5Z"
              stroke={drawerOpen ? theme.palette.primary.main : "#77777F"}
              strokeWidth="1.5"
            />
          </svg>
        </IconButton>
      </Box>

      {/* Viewer column (drawer overlays it) */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          bgcolor: "#EDEBF1",
        }}
      >
        {/* Document drawer (overlay) */}
        {drawerOpen && (
          <Box
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 248,
              bgcolor: "#ffffff",
              borderRight: "1px solid #E5E1EB",
              boxShadow: "8px 0 24px rgba(28,12,48,0.10)",
              zIndex: 35,
              display: "flex",
              flexDirection: "column",
              p: 1.5,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: "2px",
                pb: 1.25,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.6px",
                  color: "#55555E",
                }}
              >
                Class Materials
              </Typography>
              <IconButton
                onClick={() => setDrawerOpen(false)}
                size="small"
                sx={{
                  color: "#77777F",
                  borderRadius: "4px",
                  "&:hover": { bgcolor: "#F3F1F7" },
                }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>

            {/* Lecture / Recitation segmented switch */}
            <Box
              sx={{
                display: "flex",
                bgcolor: "#F3F1F7",
                borderRadius: "8px",
                p: "3px",
                mb: 1.25,
              }}
            >
              {(
                [
                  { label: "Lecture", value: "class materials" },
                  { label: "Recitation", value: "recitation" },
                ] as { label: string; value: MaterialFilter }[]
              ).map(({ label, value }) => (
                <ButtonBase
                  key={value}
                  onClick={() => setMaterialFilter(value)}
                  sx={{
                    flex: 1,
                    borderRadius: "6px",
                    py: "6px",
                    fontSize: 12,
                    fontWeight: 600,
                    bgcolor: materialFilter === value ? "#ffffff" : "transparent",
                    color: materialFilter === value ? "primary.main" : "#55555E",
                  }}
                >
                  {label}
                </ButtonBase>
              ))}
            </Box>

            {/* File list */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                overflow: "auto",
                flex: 1,
              }}
            >
              {!pdfList ? (
                <>
                  <Skeleton />
                  <Skeleton />
                  <Skeleton />
                </>
              ) : drawerFiles.length === 0 ? (
                <Typography
                  sx={{ fontSize: 12, color: "#77777F", p: 1, textAlign: "center" }}
                >
                  No documents
                </Typography>
              ) : (
                drawerFiles.map((pdf) => {
                  const selected = pdf.id === selectedPDFID;
                  return (
                    <ButtonBase
                      key={pdf.id}
                      onClick={() => handlePickPdf(pdf)}
                      sx={{
                        justifyContent: "space-between",
                        gap: 1,
                        px: 1.25,
                        py: 1,
                        fontSize: 12,
                        borderRadius: "6px",
                        textAlign: "left",
                        bgcolor: selected ? "#EFE8F6" : "transparent",
                        color: selected ? "primary.main" : "#2A2A30",
                        "&:hover": { bgcolor: selected ? "#EFE8F6" : "#F3F1F7" },
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {pdf.fileName}
                      </Box>
                      {selected && (
                        <Box component="span" sx={{ color: "primary.main", flex: "none" }}>
                          ✓
                        </Box>
                      )}
                    </ButtonBase>
                  );
                })
              )}
            </Box>
          </Box>
        )}

        {/* PDF viewer */}
        <Box sx={{ flex: 1, minHeight: 0, position: "relative" }}>
          <Box sx={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <PDFViewerForStudents
              pdfFile={pdfContent ?? ""}
              fileName={selectedPdfName}
              studentMode
              onPageChangeCallback={onPageChangeCallback}
              comments={pdfComments}
              documentId={selectedPDFID}
              initialPage={initialPage}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PDFComponent;
