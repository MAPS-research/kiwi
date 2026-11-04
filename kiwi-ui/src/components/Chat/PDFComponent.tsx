import {
  Box,
  ButtonBase,
  Chip,
  IconButton,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import React, { useCallback, useContext, useEffect, useId, useRef, useState } from "react";

// PDF page-change event (0-based current page). Kept local so this file does not
// depend on the (removed) @react-pdf-viewer types.
interface PageChangeEvent {
  currentPage: number;
}
import apiClient, { basePath } from "../../utils/api.ts";
import { ChatContext } from "../../pages/ClassLayout.tsx";
import { DocumentIdsForChat } from "../../services/index.ts";
import { PDFViewerForStudents } from "../PDFViewer/PDFViewerForStudent.tsx";
import EmptyState from "../EmptyState/EmptyState.tsx";
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

// The drawer's two exclusive filter chips and the line each shows when its
// group has no files.
const MATERIAL_FILTERS: { label: string; value: MaterialFilter; empty: string }[] = [
  { label: "Lecture", value: "class materials", empty: "No lectures yet" },
  { label: "Recitation", value: "recitation", empty: "No recitations yet" },
];

// The rail and the drawer are a panel on the sheet (DESIGN.md, The PDF viewer:
// variant rail).
const railPanelSx = {
  bgcolor: "var(--pdf-toolbar-variant-rail-fill)",
  borderRight: "1px solid var(--pdf-toolbar-variant-rail-border)",
} as const;

// A file row in the drawer: 36 px drawn, a 44 px hit area on coarse pointers;
// the open file is the selection tint, its text at 600 and a check glyph.
const fileRowSx = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "var(--space-2)",
  width: "calc(100% - 2 * var(--space-2))",
  height: 36,
  mx: "var(--space-2)",
  px: "var(--space-3)",
  borderRadius: "var(--radius-small)",
  color: "var(--pdf-toolbar-variant-rail-text)",
  typography: "body2",
  textAlign: "left",
  "& .MuiSvgIcon-root": { flex: "none", fontSize: "var(--size-icon-sm)" },
  "&::before": {
    content: '""',
    position: "absolute",
    left: 0,
    top: "50%",
    width: "100%",
    height: "max(100%, var(--pdf-toolbar-drawer-row-hit))",
    transform: "translateY(-50%)",
  },
  "&:hover": { bgcolor: "var(--surface-hover)" },
  "&[aria-current='true'], &[aria-current='true']:hover": {
    bgcolor: "var(--selection-bg)",
    color: "var(--selection-text)",
    fontWeight: "var(--weight-semibold)",
  },
} as const;

const PDFComponent: React.FC = () => {
  const [pdfList, setPdfList] = useState<DocumentIdsForChat[]>();
  // Which document type the sidebar drawer lists. Auto-select prefers the last
  // lecture, so that's the default until a selection (restore/user) says otherwise.
  const [materialFilter, setMaterialFilter] = useState<MaterialFilter>("class materials");
  // Document drawer, toggled from the icon rail. Open by default so the file
  // list is discoverable.
  const [drawerOpen, setDrawerOpen] = useState(true);
  const drawerTitleId = useId();
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
  const activeFilter =
    MATERIAL_FILTERS.find(({ value }) => value === materialFilter) ??
    MATERIAL_FILTERS[0];
  // The class has no documents at all: the viewer would otherwise wait forever.
  const noMaterials = pdfList !== undefined && pdfList.length === 0;

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
      }}
    >
      {/* Icon rail: tool chrome, so compact; its one button shows the drawer. */}
      <Box
        data-density="compact"
        sx={{
          ...railPanelSx,
          width: 48,
          flex: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: "var(--space-1)",
        }}
      >
        <Tooltip title="Show class materials" placement="right">
          <IconButton
            aria-label="Show class materials"
            aria-pressed={drawerOpen}
            onClick={() => setDrawerOpen((open) => !open)}
          >
            <FolderOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Document drawer: docked beside the viewer from lg; on narrower
          screens it floats over the viewer so the paper keeps its width. */}
      {drawerOpen && (
        <Box
          component="section"
          aria-labelledby={drawerTitleId}
          data-density="compact"
          sx={{
            ...railPanelSx,
            width: 248,
            flex: "none",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            position: { xs: "absolute", lg: "static" },
            top: 0,
            bottom: 0,
            left: 48,
            zIndex: 1,
            boxShadow: { xs: "var(--shadow-2)", lg: "none" },
          }}
        >
          <Box
            sx={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              height: "var(--size-toolbar-bar)",
              pl: "var(--space-4)",
              pr: "var(--space-1)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <Typography
              id={drawerTitleId}
              component="h2"
              variant="subtitle2"
              noWrap
              sx={{ flex: "1 1 auto", minWidth: 0, color: "var(--pdf-toolbar-variant-rail-text)" }}
            >
              Class materials
            </Typography>
            <Tooltip title="Close">
              <IconButton aria-label="Close" onClick={() => setDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Lecture / Recitation: two exclusive filter chips (toggle buttons) */}
          <Box
            sx={{
              flex: "none",
              display: "flex",
              gap: "var(--space-2)",
              px: "var(--space-4)",
              py: "var(--space-3)",
            }}
          >
            {MATERIAL_FILTERS.map(({ label, value }) => {
              const pressed = materialFilter === value;
              return (
                <Chip
                  key={value}
                  component="button"
                  label={label}
                  variant="outlined"
                  color={pressed ? "primary" : "default"}
                  aria-pressed={pressed}
                  onClick={() => setMaterialFilter(value)}
                />
              );
            })}
          </Box>

          {/* File list */}
          <Box sx={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", pb: "var(--space-3)" }}>
            {!pdfList ? (
              <Box sx={{ display: "grid", gap: "var(--space-1)", px: "var(--space-2)" }}>
                <Skeleton variant="rounded" height={36} />
                <Skeleton variant="rounded" height={36} />
                <Skeleton variant="rounded" height={36} />
              </Box>
            ) : drawerFiles.length === 0 ? (
              <Typography
                variant="caption"
                component="p"
                sx={{ px: "var(--space-4)", py: "var(--space-2)", color: "text.secondary" }}
              >
                {activeFilter.empty}
              </Typography>
            ) : (
              <Box
                component="ul"
                sx={{
                  listStyle: "none",
                  m: 0,
                  p: 0,
                  display: "grid",
                  gap: "var(--pdf-toolbar-drawer-row-gap)",
                }}
              >
                {drawerFiles.map((pdf) => {
                  const current = pdf.id === selectedPDFID;
                  return (
                    <li key={pdf.id}>
                      <ButtonBase
                        aria-current={current ? "true" : undefined}
                        onClick={() => handlePickPdf(pdf)}
                        sx={fileRowSx}
                      >
                        <DescriptionOutlinedIcon aria-hidden />
                        <Box
                          component="span"
                          sx={{
                            flex: "1 1 auto",
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pdf.fileName}
                        </Box>
                        {current && <CheckIcon aria-hidden />}
                      </ButtonBase>
                    </li>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* PDF viewer (its own stacking context, under a floating drawer) */}
      <Box
        sx={{
          flex: "1 1 auto",
          minWidth: 0,
          position: "relative",
          zIndex: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {noMaterials ? (
          <Box
            sx={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              p: "var(--pdf-toolbar-canvas-padding)",
              bgcolor: "var(--pdf-toolbar-canvas)",
            }}
          >
            <EmptyState
              title="No materials yet"
              description="Your instructor hasn't added any to this class."
            />
          </Box>
        ) : (
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
        )}
      </Box>
    </Box>
  );
};

export default PDFComponent;
