import type { PageChangeEvent, HighlightArea } from "../../components/PDFViewer/pdfTypes.ts";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient, { basePath } from "../../utils/api.ts";
import { mapServerCommentToPin } from "../../utils/documentComments.ts";
import { PDFViewer } from "../../components/PDFViewer/PDFViewer.tsx";

import { Box, Button, MenuItem, Paper, TextField, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip } from "@mui/material";
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import type { Chunk } from "../../services/index.ts";
import ClickToSelect from "../../components/ClickToSelect/ClickToSelect.tsx";
import {
  DocumentSummaryDialog,
  DocumentSummaryItem,
} from "../../components/DocumentSummaryDialog/DocumentSummaryDialog.tsx";
import { AdminPageHeader } from "../../components/AdminPage/index.ts";
import { useAdminNavigation } from "../../context/AdminNavigationContext.tsx";
import { FolderOutlined as MaterialsIcon } from "@mui/icons-material";

interface ChunkData {
  text: string;
  type: string;
  metadata: any;
  element_id: string;
}

interface Document {
  id: string;
  fileName: string;
  chunks: ChunkData[];
  documentContent: string;
}

interface Coordinates {
  points: [number, number][];
  system: string;
  layout_width: number;
  layout_height: number;
}

const convertToHighlightArea = (
  data: Coordinates,
  pageIndex: number = 0
): HighlightArea => {
  const { points, layout_width, layout_height } = data;

  // Extract coordinates
  const xCoords = points.map((point) => point[0]);
  const yCoords = points.map((point) => point[1]);

  // Calculate boundaries
  const left = Math.min(...xCoords);
  const right = Math.max(...xCoords);
  const top = Math.min(...yCoords);
  const bottom = Math.max(...yCoords);

  // Calculate dimensions in pixels
  const widthPx = right - left;
  const heightPx = bottom - top;

  // Convert dimensions to percentages
  const leftPercent = (left / layout_width) * 100;
  const topPercent = (top / layout_height) * 100;
  const widthPercent = (widthPx / layout_width) * 100;
  const heightPercent = (heightPx / layout_height) * 100;

  return {
    height: heightPercent,
    left: leftPercent,
    pageIndex: pageIndex - 1,
    top: topPercent,
    width: widthPercent,
  };
};

// NEW: id is string so it matches element_id everywhere
interface HighlightItem {
  id: string;
  image: string;
  selectionRegion: HighlightArea;
  category?: "chunk" | "summary" | "summary-pending";
}

// Helper to convert local ChunkData to API Chunk type
const toApiChunk = (chunkData: ChunkData): Chunk => ({
  elementId: chunkData.element_id,
  fieldName: "", // Default value
  text: chunkData.text,
  type: chunkData.type,
  metadata: chunkData.metadata,
});

type CommentVisibility = "teachers" | "students";

interface CommentPin {
  id: string;
  text: string;
  selectionRegion: HighlightArea;
  isVisibleToStudents: boolean;
  pinPosition?: CommentPinPosition;
}

interface PendingComment {
  id: string;
  selectionRegion: HighlightArea;
  image: string;
  clickPosition?: { left: number; top: number };
}

interface CommentPinPosition {
  left: number;
  top: number;
}

const mapServerCommentToLocalComment = (comment: any): CommentPin => {
  const mapped = mapServerCommentToPin(comment);
  return {
    id: mapped.id,
    text: mapped.text,
    selectionRegion: mapped.selectionRegion,
    isVisibleToStudents: mapped.isVisibleToStudents,
    pinPosition: mapped.pinPosition ?? undefined,
  };
};

const extractCommentFromResponse = (payload: any) => {
  if (!payload) {
    return null;
  }
  if (Array.isArray(payload)) {
    return payload[0] ?? null;
  }
  if (payload.comment) {
    return payload.comment;
  }
  if (payload.data && !Array.isArray(payload.data)) {
    return payload.data;
  }
  return payload;
};

const selectionToChunk = (
  input: HighlightItem,
  fileName: string,
  fileType: string
): ChunkData => {
  const { id, image, selectionRegion } = input;

  // Convert percentage dimensions back to pixels
  const layoutWidth = 1700; // Example value, should be provided or derived from context
  const layoutHeight = 2200; // Example value, should be provided or derived from context

  const leftPx = (selectionRegion.left / 100) * layoutWidth;
  const topPx = (selectionRegion.top / 100) * layoutHeight;
  const widthPx = (selectionRegion.width / 100) * layoutWidth;
  const heightPx = (selectionRegion.height / 100) * layoutHeight;

  // Calculate the points
  const points: [number, number][] = [
    [leftPx, topPx],
    [leftPx, topPx + heightPx],
    [leftPx + widthPx, topPx + heightPx],
    [leftPx + widthPx, topPx],
  ];

  const languages = ["eng"];
  const image_mime_type = "image/jpeg";

  const imageBase64 = image.split(",")[1];

  return {
    text: "text...",
    type: "Image",
    metadata: {
      filename: fileName,
      filetype: fileType,
      languages,
      coordinates: {
        points,
        system: "PixelSpace",
        layout_width: layoutWidth,
        layout_height: layoutHeight,
      },
      page_number: selectionRegion.pageIndex + 1,
      image_base64: imageBase64,
      image_mime_type,
    },
    element_id: `${id}`,
  };
};

export const AnnotateDocument: React.FC = () => {

  const { documentID = "", classID = "", materialID = "" } = useParams();
  const navigate = useNavigate();
  const { setClassNavigation } = useAdminNavigation();
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [materialSummary, setMaterialSummary] = useState<{
    title: string;
    className: string;
  } | null>(null);
  const [pdfCurrentPage, setPdfCurrentPage] = React.useState<number>(0);
  const [highlights, setHighlights] = React.useState<HighlightItem[]>([]);
  const [selectedChunk, setSelectedChunk] = React.useState<string>("");
  const [documentSummaries, setDocumentSummaries] = useState<DocumentSummaryItem[]>([]);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [commentPins, setCommentPins] = useState<CommentPin[]>([]);
  const [pendingComment, setPendingComment] = useState<PendingComment | null>(null);
  const [pendingCommentText, setPendingCommentText] = useState<string>("");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [commentVisibilityDraft, setCommentVisibilityDraft] =
    useState<CommentVisibility>("students"); // Default to visible for students

  // Helper functions for localStorage persistence of pinPositions
  // This page hangs off /admin/class/... but is not a ClassLayout child, so
  // nothing else tells the shell which class it is looking at. Without this the
  // top bar shows a loading placeholder that never resolves.
  useEffect(() => {
    if (!classID) return;
    setClassNavigation({
      className: materialSummary?.className,
      classNameLoading: !materialSummary,
      items: [
        {
          key: "materials",
          label: "Materials",
          icon: <MaterialsIcon />,
          selected: true,
          onClick: () => navigate(`/admin/class/${classID}/manage-materials`),
        },
      ],
    });
  }, [classID, materialSummary, navigate, setClassNavigation]);

  const getStoredPinPositions = useCallback((documentId: string): Map<string, CommentPinPosition> => {
    try {
      const key = `commentPinPositions_${documentId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        return new Map(Object.entries(data));
      }
    } catch (error) {
      console.error("Failed to load pinPositions from localStorage:", error);
    }
    return new Map();
  }, []);

  const savePinPosition = useCallback((documentId: string, commentId: string, pinPosition: CommentPinPosition) => {
    try {
      const key = `commentPinPositions_${documentId}`;
      const stored = getStoredPinPositions(documentId);
      stored.set(commentId, pinPosition);
      localStorage.setItem(key, JSON.stringify(Object.fromEntries(stored)));
    } catch (error) {
      console.error("Failed to save pinPosition to localStorage:", error);
    }
  }, [getStoredPinPositions]);

  const fetchDocumentComments = useCallback(async () => {
    if (!documentID) {
      return;
    }
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${basePath}/document/${documentID}/comments`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      const commentList = Array.isArray(data)
        ? data
        : Array.isArray(data?.comments)
        ? data.comments
        : [];

      // Load stored pinPositions from localStorage
      const storedPinPositions = getStoredPinPositions(documentID);

      setCommentPins((prevComments) => {
        // Preserve existing pinPositions from local state when reloading
        const existingPinPositions = new Map(
          prevComments.map((c) => [c.id, c.pinPosition])
        );

        const mappedComments = commentList.map((comment: any) => {
          const mapped = mapServerCommentToLocalComment(comment);
          console.log('Loading comment from server:', {
            original: comment,
            mapped: mapped,
            pinPosition: mapped.pinPosition,
            existingPinPosition: existingPinPositions.get(mapped.id),
            storedPinPosition: storedPinPositions.get(mapped.id),
          });
          
          // Priority: 1) existing local state, 2) stored in localStorage, 3) server value (if valid), 4) default
          const existingPinPosition = existingPinPositions.get(mapped.id);
          const storedPinPosition = storedPinPositions.get(mapped.id);
          
          if (existingPinPosition && (!mapped.pinPosition || (mapped.pinPosition.left === 0 && mapped.pinPosition.top === 0))) {
            console.log('Preserving existing pinPosition from local state:', existingPinPosition);
            mapped.pinPosition = existingPinPosition;
          } else if (storedPinPosition && (!mapped.pinPosition || (mapped.pinPosition.left === 0 && mapped.pinPosition.top === 0))) {
            console.log('Using stored pinPosition from localStorage:', storedPinPosition);
            mapped.pinPosition = storedPinPosition;
          }
          
          return mapped;
        });
        return mappedComments;
      });
    } catch (error) {
      console.error("Failed to load document comments:", error);
    }
  }, [documentID, getStoredPinPositions]);

  useEffect(() => {
    fetchDocumentComments();
  }, [fetchDocumentComments]);

  const commentLayerRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());
  const dragStateRef = React.useRef<DragState | null>(null);

  // NEW: derived current page (1-indexed) and page-filtered chunks
  const currentPageNumber = pdfCurrentPage + 1;
  const chunksForCurrentPage = useMemo(
    () =>
      documentData?.chunks?.filter(
        (c) => Number(c?.metadata?.page_number) === currentPageNumber
      ) ?? [],
    [documentData?.chunks, currentPageNumber]
  );

  const generateCommentId = () =>
    `comment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const fetchDocumentSummaries = useCallback(async () => {
    if (!documentID) {
      return;
    }
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${basePath}/document/${documentID}/summaries`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      const summaryList = Array.isArray(data)
        ? data
        : Array.isArray(data?.summaries)
        ? data.summaries
        : [];

      setDocumentSummaries(summaryList);
    } catch (error) {
      console.error("Failed to load document summaries:", error);
    }
  }, [documentID]);

  useEffect(() => {
    if (documentID) {
      fetchDocumentSummaries();
    }
  }, [documentID, fetchDocumentSummaries]);

  const handleCreateSummary = useCallback(
    async (summary: { content: string; isVisibleToStudents: boolean }) => {
      if (!documentID) return;
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${basePath}/document/${documentID}/summaries`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(summary),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        await fetchDocumentSummaries();
      } catch (error) {
        console.error("Failed to create summary:", error);
        throw error;
      }
    },
    [documentID, fetchDocumentSummaries]
  );

  const handleUpdateSummary = useCallback(
    async (summaryId: string, content: string, isVisibleToStudents: boolean) => {
      if (!documentID) return;
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `${basePath}/document/${documentID}/summaries/${summaryId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ content, isVisibleToStudents }),
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        await fetchDocumentSummaries();
      } catch (error) {
        console.error("Failed to update summary:", error);
        throw error;
      }
    },
    [documentID, fetchDocumentSummaries]
  );

  const handleDeleteSummary = useCallback(
    async (summaryId: string) => {
      if (!documentID) return;
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `${basePath}/document/${documentID}/summaries/${summaryId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        await fetchDocumentSummaries();
      } catch (error) {
        console.error("Failed to delete summary:", error);
        throw error;
      }
    },
    [documentID, fetchDocumentSummaries]
  );

  const handleOpenSummaryDialog = useCallback(() => {
    setIsSummaryDialogOpen(true);
  }, []);

  const handleCloseSummaryDialog = useCallback(() => {
    setIsSummaryDialogOpen(false);
  }, []);

  interface DragState {
    commentId: string;
    pageIndex: number;
    pointerId: number;
    startX: number;
    startY: number;
    isDragging: boolean;
  }

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const getDefaultPinPosition = (region: HighlightArea): CommentPinPosition => ({
    left: region.left + region.width / 2,
    top: region.top + region.height / 2,
  });

  const updateCommentPinPosition = useCallback(
    (commentId: string, left: number, top: number) => {
      setCommentPins((prev) => {
        const index = prev.findIndex((comment) => comment.id === commentId);
        if (index === -1) {
          return prev;
        }

        const nextLeft = clamp(left, 0, 100);
        const nextTop = clamp(top, 0, 100);
        const target = prev[index];
        const currentPosition =
          target.pinPosition ?? getDefaultPinPosition(target.selectionRegion);

        if (
          Math.abs(currentPosition.left - nextLeft) < 0.01 &&
          Math.abs(currentPosition.top - nextTop) < 0.01
        ) {
          return prev;
        }

        const updatedComment: CommentPin = {
          ...target,
          pinPosition: { left: nextLeft, top: nextTop },
        };

        // Save updated pinPosition to localStorage
        if (documentID) {
          savePinPosition(documentID, commentId, { left: nextLeft, top: nextTop });
        }

        const next = [...prev];
        next[index] = updatedComment;
        return next;
      });
    },
    [documentID, savePinPosition]
  );

  const getCommentPinPosition = (comment: CommentPin): CommentPinPosition =>
    comment.pinPosition ?? getDefaultPinPosition(comment.selectionRegion);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await apiClient.documentControllerRetrieveDocument({
          chunkRequest: { id: documentID },
        });
        console.log("document", response); // Handle the response data as needed
        // Cast to local Document type since generated types may be incomplete
        setDocumentData(response.document as unknown as Document);

        // set highlights
        const doc = response.document as unknown as Document;
        const highlightsList = doc.chunks
          ? doc.chunks
              .filter((chunk: ChunkData) => chunk.metadata?.coordinates)
              .map((chunk: ChunkData) => {
                const coordinates = chunk.metadata.coordinates;
                const selectonRegion = convertToHighlightArea(
                  coordinates,
                  chunk.metadata.page_number // 1
                );
                return {
                  id: String(chunk.element_id), // NEW ensure string
                  image: "",
                  selectionRegion: selectonRegion,
                  category: "chunk",
                } as HighlightItem;
              })
          : [];
        console.log("highlights", highlightsList);
        setHighlights(highlightsList);
      } catch (error) {
        console.error("Failed to fetch document:", error);
      }
    };

    fetchDocument();

    // Names for the header. The page used to say only "Document Annotation",
    // which tells an instructor with several classes open nothing at all.
    const fetchMaterialSummary = async () => {
      if (!materialID) return;
      try {
        const summary = await apiClient.materialControllerSummary({
          materialID,
        });
        setMaterialSummary({
          title: summary.title,
          className: summary.className,
        });
      } catch (error) {
        // A missing breadcrumb must not take the annotation tool down with it.
        console.error("Failed to load material summary", error);
      }
    };
    fetchMaterialSummary();
  }, [documentID]);

  const onPageChangeCallback = (e: PageChangeEvent) => {
    console.log("page changed", e);
    setPdfCurrentPage(e.currentPage);
    setSelectedChunk(""); // NEW: clear selection when flipping pages
  };

  const combinedHighlights = useMemo(() => {
    return highlights.map((item) => ({
      ...item,
      category: item.category ?? "chunk",
    }));
  }, [highlights]);

  const renderHighlights = (props: { pageIndex: number }) => {
    const pageCommentPins = commentPins.filter(
      (comment) => comment.selectionRegion.pageIndex === props.pageIndex
    );

    const pendingCommentForPage =
      pendingComment &&
      pendingComment.selectionRegion.pageIndex === props.pageIndex
        ? pendingComment
        : null;

    return (
      <div
        style={{ position: "absolute", inset: 0 }}
        ref={(element) => {
          if (element) {
            commentLayerRefs.current.set(props.pageIndex, element);
          } else {
            commentLayerRefs.current.delete(props.pageIndex);
          }
        }}
      >
        {combinedHighlights &&
          combinedHighlights.length > 0 &&
          combinedHighlights
            .filter(
              (highlight) =>
                highlight.selectionRegion.pageIndex === props.pageIndex
            )
            .map((highlight) => {
              const isSelected = selectedChunk === highlight.id;
              return (
                // eslint-disable-next-line
                <a
                  className="highlight-target"
                  key={highlight.id}
                  style={{
                    border: isSelected
                      ? "2px solid #1976d2"
                      : "1px solid red",
                    position: "absolute",
                    display: "block",
                    left: `${highlight.selectionRegion.left}%`,
                    top: `${highlight.selectionRegion.top}%`,
                    width: `${highlight.selectionRegion.width}%`,
                    minWidth: `${highlight.selectionRegion.width}%`,
                    height: `${highlight.selectionRegion.height}%`,
                    minHeight: `${highlight.selectionRegion.height}%`,
                    zIndex: 1,
                    boxShadow: isSelected
                      ? "0 0 0 3px rgba(25,118,210,0.25)"
                      : "none",
                    background: isSelected
                      ? "rgba(25,118,210,0.08)"
                      : "transparent",
                    borderRadius: 4,
                  }}
                  href={`#${highlight.id}`}
                  onClick={() => {
                    setSelectedChunk(String(highlight.id));
                  }}
                ></a>
              );
            })}

        {pageCommentPins.map((comment) => {
          const pinPosition = getCommentPinPosition(comment);
          const baseLeft = pinPosition.left;
          const baseTop = pinPosition.top;

          console.log('Rendering comment:', {
            id: comment.id,
            commentPinPosition: comment.pinPosition,
            calculatedPinPosition: pinPosition,
            baseLeft,
            baseTop,
          });

          return (
            <div
              key={`comment-${comment.id}`}
              style={{
                position: "absolute",
                left: `${baseLeft}%`,
                top: `${baseTop}%`,
                width: 0,
                height: 0,
                zIndex: 3,
              }}
            >
              <button
                type="button"
                data-selection-ignore="true"
                onPointerDown={(event) =>
                  handleCommentPointerDown(event, comment)
                }
                onPointerMove={handleCommentPointerMove}
                onPointerUp={(event) =>
                  handleCommentPointerUp(event, comment)
                }
                onPointerCancel={handleCommentPointerCancel}
                title={comment.text} // Show comment text on hover
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transform: "translate(-50%, -50%)",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  border: "2px solid #1976d2",
                  backgroundColor: comment.isVisibleToStudents ? "#1976d2" : "#ffffff",
                  color: comment.isVisibleToStudents ? "#ffffff" : "#1976d2",
                  cursor: "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(25, 118, 210, 0.3)",
                  userSelect: "none",
                  fontSize: "12px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.15)";
                  e.currentTarget.style.boxShadow = "0 4px 10px rgba(25, 118, 210, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 6px rgba(25, 118, 210, 0.3)";
                }}
              >
                💬
              </button>

              {activeCommentId === comment.id && (
                <Paper
                  data-selection-ignore="true"
                  elevation={8}
                  sx={{
                    position: "fixed",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 320,
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    zIndex: 1000,
                    backgroundColor: "background.paper",
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Edit Comment
                  </Typography>
                  <TextField
                    label="Comment"
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    multiline
                    minRows={3}
                    size="small"
                    autoFocus
                  />
                  <TextField
                    select
                    label="Visibility"
                    size="small"
                    value={commentVisibilityDraft}
                    onChange={(event) =>
                      handleVisibilityDraftChange(
                        event.target.value as CommentVisibility
                      )
                    }
                  >
                    <MenuItem value="teachers">Hidden from students</MenuItem>
                    <MenuItem value="students">Visible to students</MenuItem>
                  </TextField>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    <Button
                      size="small"
                      onClick={handleCloseCommentEditor}
                      variant="outlined"
                    >
                      Close
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      Delete
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleSaveCommentEdit}
                    >
                      Save
                    </Button>
                  </Box>
                </Paper>
              )}
            </div>
          );
        })}

        {pendingCommentForPage && (
          <Paper
            data-selection-ignore="true"
            elevation={8}
            sx={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 320,
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              zIndex: 1000,
              backgroundColor: "background.paper",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Add a comment
            </Typography>
            <TextField
              label="Comment"
              multiline
              minRows={3}
              size="small"
              value={pendingCommentText}
              onChange={(event) =>
                setPendingCommentText(event.target.value)
              }
              autoFocus
            />
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                mt: 1,
              }}
            >
              <Button
                size="small"
                onClick={handleCancelPendingComment}
                variant="outlined"
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleSavePendingComment}
              >
                Save
              </Button>
            </Box>
          </Paper>
        )}
      </div>
    );
  };

  interface BoxCoordinates {
    left: number;
    top: number;
    width: number;
    height: number;
  }

  const handleAddChunkSelection = (selection: {
    image: string;
    selectionRegion: BoxCoordinates;
  }) => {
    const selectionRegion: HighlightArea = {
      left: selection.selectionRegion.left,
      top: selection.selectionRegion.top,
      width: selection.selectionRegion.width,
      height: selection.selectionRegion.height,
      pageIndex: pdfCurrentPage,
    };

    const newSelection: HighlightItem = {
      id: String(highlights.length + 1), // NEW ensure string id
      image: selection.image,
      selectionRegion,
      category: "chunk",
    };

    const newChunk = selectionToChunk(
      newSelection,
      documentData?.fileName || "",
      documentData?.chunks[0].metadata.filetype || ""
    );

    console.log("newSelection", newChunk);

    apiClient
      .documentControllerAddChunkField({
        chunkEditRequest: {
          documentId: documentData?.id || "",
          chunkId: newChunk.element_id,
          fieldName: "",
          newValue: toApiChunk(newChunk),
        },
      })
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.error("Failed to add chunk:", error);
      });
  };

  const handleAddCommentSelection = (selection: {
    image: string;
    selectionRegion: BoxCoordinates;
    clickPosition?: { left: number; top: number };
  }) => {
    const selectionRegion: HighlightArea = {
      left: selection.selectionRegion.left,
      top: selection.selectionRegion.top,
      width: selection.selectionRegion.width,
      height: selection.selectionRegion.height,
      pageIndex: pdfCurrentPage,
    };

    const commentId = generateCommentId();
    setPendingComment({
      id: commentId,
      selectionRegion,
      image: selection.image,
      clickPosition: selection.clickPosition,
    });
    setPendingCommentText("");
    setActiveCommentId(null);
  };

  const handleSavePendingComment = async () => {
    if (!pendingComment || !documentID) return;
    const text = pendingCommentText.trim();
    if (!text) return;

    // Use click position if available, otherwise fall back to center of selection region
    const pinPosition: CommentPinPosition = pendingComment.clickPosition
      ? {
          left: pendingComment.clickPosition.left,
          top: pendingComment.clickPosition.top,
        }
      : getDefaultPinPosition(pendingComment.selectionRegion);

    console.log('Saving comment with pinPosition:', pinPosition);
    console.log('Click position:', pendingComment.clickPosition);
    console.log('Selection region:', pendingComment.selectionRegion);

    const newComment: CommentPin = {
      id: pendingComment.id,
      text,
      selectionRegion: pendingComment.selectionRegion,
      isVisibleToStudents: true, // Default to visible for students
      pinPosition,
    };

    // Save pinPosition to localStorage for persistence across refreshes
    if (documentID && pinPosition) {
      savePinPosition(documentID, newComment.id, pinPosition);
    }

    setCommentPins((prev) => [...prev, newComment]);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${basePath}/document/${documentID}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pageNumber: pendingComment.selectionRegion.pageIndex,
          text,
          isVisibleToStudents: true, // Default to visible for students
          selectionRegion: pendingComment.selectionRegion,
          pinPosition: newComment.pinPosition,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      if (response.status !== 204) {
        const payload = await response.json();
        const comment = extractCommentFromResponse(payload);
        if (comment) {
          const mapped = mapServerCommentToLocalComment(comment);
          console.log('Server response comment:', comment);
          console.log('Mapped comment pinPosition:', mapped.pinPosition);
          // Always preserve the pinPosition we just calculated, regardless of what server returns
          // This ensures our calculated position is used (frontend-only solution)
          if (newComment.pinPosition) {
            console.log('Preserving pinPosition from newComment:', newComment.pinPosition);
            mapped.pinPosition = newComment.pinPosition;
            // Also save to localStorage for persistence
            if (documentID) {
              savePinPosition(documentID, newComment.id, newComment.pinPosition);
            }
          }
          setCommentPins((prev) =>
            prev.map((item) => (item.id === newComment.id ? mapped : item))
          );
        } else {
          // If we don't get a response, keep our local state with pinPosition
          console.log('No comment in response, keeping local state with pinPosition:', newComment.pinPosition);
        }
      } else {
        // 204 No Content - success but no response body, keep our local state with pinPosition
        console.log('204 response, keeping local state with pinPosition:', newComment.pinPosition);
        // Don't reload - our local state already has the correct pinPosition
      }
    } catch (error) {
      console.error("Failed to save document comment:", error);
      setCommentPins((prev) =>
        prev.filter((comment) => comment.id !== newComment.id)
      );
    }

    setPendingComment(null);
    setPendingCommentText("");
  };

  const handleCancelPendingComment = () => {
    setPendingComment(null);
    setPendingCommentText("");
  };

  const handleOpenCommentEditor = useCallback((comment: CommentPin) => {
    setActiveCommentId(comment.id);
    setCommentDraft(comment.text);
    setCommentVisibilityDraft(
      comment.isVisibleToStudents ? "students" : "teachers"
    );
  }, []);

  const handleSaveCommentEdit = async () => {
    if (!activeCommentId || !documentID) return;
    const text = commentDraft.trim();
    if (!text) return;

    const previousComment = commentPins.find(
      (comment) => comment.id === activeCommentId
    );
    const isVisibleToStudents = commentVisibilityDraft === "students";

    setCommentPins((prev) =>
      prev.map((comment) =>
        comment.id === activeCommentId
          ? {
              ...comment,
              text,
              isVisibleToStudents,
            }
          : comment
      )
    );

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${basePath}/document/${documentID}/comments/${activeCommentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            text,
            isVisibleToStudents,
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      if (response.status !== 204) {
        const payload = await response.json();
        const comment = extractCommentFromResponse(payload);
        if (comment) {
          const mapped = mapServerCommentToLocalComment(comment);
          setCommentPins((prev) =>
            prev.map((item) =>
              item.id === activeCommentId ? mapped : item
            )
          );
        } else {
          await fetchDocumentComments();
        }
      }
    } catch (error) {
      console.error("Failed to update document comment:", error);
      if (previousComment) {
        setCommentPins((prev) =>
          prev.map((comment) =>
            comment.id === activeCommentId ? previousComment : comment
          )
        );
      }
    }

    setActiveCommentId(null);
    setCommentDraft("");
    setCommentVisibilityDraft("students");
  };

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!documentID) {
        return;
      }

      setCommentPins((prev) =>
        prev.filter((comment) => comment.id !== commentId)
      );

      if (activeCommentId === commentId) {
        setActiveCommentId(null);
        setCommentDraft("");
        setCommentVisibilityDraft("students");
      }

      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `${basePath}/document/${documentID}/comments/${commentId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ id: commentId }),
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        await fetchDocumentComments();
      } catch (error) {
        console.error("Failed to delete document comment:", error);
        await fetchDocumentComments();
      }
    },
    [activeCommentId, documentID, fetchDocumentComments]
  );

  const handleCloseCommentEditor = useCallback(() => {
    setActiveCommentId(null);
    setCommentDraft("");
    setCommentVisibilityDraft("students");
  }, []);

  const handleVisibilityDraftChange = (value: CommentVisibility) => {
    setCommentVisibilityDraft(value);
  };

  const handleCommentPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, comment: CommentPin) => {
      event.preventDefault();
      event.stopPropagation();

      dragStateRef.current = {
        commentId: comment.id,
        pageIndex: comment.selectionRegion.pageIndex,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        isDragging: false,
      };

      const target = event.currentTarget;
      if (target.setPointerCapture) {
        target.setPointerCapture(event.pointerId);
      }
    },
    []
  );

  const handleCommentPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = Math.abs(event.clientX - state.startX);
      const deltaY = Math.abs(event.clientY - state.startY);

      if (!state.isDragging && (deltaX > 2 || deltaY > 2)) {
        state.isDragging = true;
      }

      if (!state.isDragging) {
        return;
      }

      const layer = commentLayerRefs.current.get(state.pageIndex);
      if (!layer) {
        return;
      }

      const rect = layer.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      const relativeX = ((event.clientX - rect.left) / rect.width) * 100;
      const relativeY = ((event.clientY - rect.top) / rect.height) * 100;

      updateCommentPinPosition(state.commentId, relativeX, relativeY);
    },
    [updateCommentPinPosition]
  );

  const handleCommentPointerUp = useCallback(
    async (event: React.PointerEvent<HTMLButtonElement>, comment: CommentPin) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) {
        return;
      }

      const target = event.currentTarget;
      if (target.releasePointerCapture) {
        target.releasePointerCapture(event.pointerId);
      }

      const wasDragging = state.isDragging;
      dragStateRef.current = null;

      event.preventDefault();
      event.stopPropagation();

      // If the comment was dragged, save the new pin position to the backend
      if (wasDragging && documentID) {
        // Get the current pin position from the state (already updated by updateCommentPinPosition)
        const currentComment = commentPins.find((c) => c.id === state.commentId);
        if (currentComment && currentComment.pinPosition) {
          try {
            const token = localStorage.getItem("authToken");
            await fetch(
              `${basePath}/document/${documentID}/comments/${state.commentId}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  pinPosition: currentComment.pinPosition,
                }),
                credentials: "include",
              }
            );
          } catch (error) {
            console.error("Failed to update comment pin position:", error);
          }
        }
        return;
      }

      if (activeCommentId === comment.id) {
        handleCloseCommentEditor();
      } else {
        handleOpenCommentEditor(comment);
      }
    },
    [activeCommentId, commentPins, documentID, handleCloseCommentEditor, handleOpenCommentEditor]
  );

  const handleCommentPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) {
        return;
      }

      const target = event.currentTarget;
      if (target.releasePointerCapture) {
        target.releasePointerCapture(event.pointerId);
      }

      dragStateRef.current = null;
    },
    []
  );

  const customRenderPage = (page: React.ReactNode) => {
    return (
      <ClickToSelect
        onAddChunk={handleAddChunkSelection}
        onAddComment={handleAddCommentSelection}
      >
        {page}
      </ClickToSelect>
    );
  };

  function onClickEditChunk(documentId: string, chunkId: string) {
    const fieldName = "";
    const newValue = window.prompt("Enter the new value:");

    // get the chunk object
    const chunk = documentData?.chunks.find(
      (chunk) => chunk.element_id === chunkId
    );
    // change to text
    if (chunk && newValue) {
      chunk.text = newValue;
    }

    console.log("chunk", chunk);

    if (!chunk) {
      console.error("Chunk not found");
      return;
    }

    apiClient
      .documentControllerEditChunkField({
        chunkEditRequest: {
          documentId,
          chunkId,
          fieldName,
          newValue: toApiChunk(chunk),
        },
      })
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.error("Failed to edit chunk:", error);
      });
  }

  function onClickDeleteChunk(documentId: string, chunkId: string) {
    apiClient
      .documentControllerDeleteChunkViaPost({
        chunkDeleteRequest: {
          documentId,
          chunkId,
        },
      })
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.error("Failed to delete chunk:", error);
      });
  }

  // Helper for CSS.escape in older browsers
  const cssEscape = (id: string) => {
    // @ts-ignore
    return (window.CSS && window.CSS.escape) ? (window as any).CSS.escape(id) : id;
  };

  return (
    <>
      {documentData && (
        <Box sx={{ mx: { xs: 2, md: 3 }, mt: { xs: 2, md: 3 } }}>
          <AdminPageHeader
            title={
              !materialSummary
                ? "Document Annotation"
                : materialSummary.className
                  ? `${materialSummary.className} / ${materialSummary.title}`
                  : // An unnamed class contributes nothing to a breadcrumb.
                    materialSummary.title
            }
            description={`Viewing page ${currentPageNumber} of ${documentData.fileName}.`}
            back={{
              label: "Materials",
              // Was `/admin/class/:classID/:materialID`, a page reachable from
              // nowhere else and now deleted.
              onClick: () => navigate(`/admin/class/${classID}/manage-materials`),
            }}
            actions={
              <Button variant="contained" onClick={handleOpenSummaryDialog} sx={{ whiteSpace: "nowrap" }}>
                Add Document Summary
              </Button>
            }
          />
        </Box>
      )}

      {/* NEW: Three-column workspace: Left rail | PDF | Right page-filtered chunks */}
      {documentData && (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            px: { xs: 2, md: 3 },
            py: 1,
            overflow: "hidden"
          }}>
          {/* LEFT RAIL (thin) */}
          <Paper
            elevation={0}
            sx={{
              width: 88,
              minWidth: 88,
              flexShrink: 0,
              borderRight: "1px solid",
              borderColor: "divider",
              p: 1.5,
              backgroundColor: "grey.50",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 1.5,
                fontWeight: 600,
                color: "text.secondary",
                textAlign: "center"
              }}
            >
              Page {currentPageNumber}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {chunksForCurrentPage.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.75rem",
                    textAlign: "center",
                    mt: 2
                  }}>
                  No chunks
                </Typography>
              ) : (
                chunksForCurrentPage.map((chunk, idx) => (
                  <Button
                    key={chunk.element_id}
                    size="small"
                    variant={selectedChunk === chunk.element_id ? "contained" : "outlined"}
                    onClick={() => {
                      setSelectedChunk(chunk.element_id);

                      // Scroll to the highlight in the PDF
                      const selector = `a.highlight-target[href="#${cssEscape(chunk.element_id)}"]`;
                      const anchor = document.querySelector<HTMLAnchorElement>(selector);
                      if (anchor) {
                        anchor.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                          inline: "center",
                        });
                      }

                      // Scroll to the row in the table
                      const tableRow = document.getElementById(chunk.element_id);
                      if (tableRow) {
                        tableRow.scrollIntoView({
                          behavior: "smooth",
                          block: "nearest",
                        });
                      }
                    }}
                    sx={{
                      justifyContent: "center",
                      textTransform: "none",
                      fontSize: "0.75rem",
                      minWidth: 0,
                      px: 1,
                      py: 0.5,
                      fontWeight: selectedChunk === chunk.element_id ? 600 : 400,
                    }}
                  >
                    {idx + 1}
                  </Button>
                ))
              )}
            </Box>
          </Paper>

          {/* PDF VIEWER (center) */}
          <Box
            sx={{
              width: "calc(100% - 88px - 500px - 32px)", // Total minus left rail minus right panel minus gaps
              minWidth: 350,
              flexShrink: 1,
              overflow: "auto"
            }}
          >
            <PDFViewer
              pdfFile={documentData.documentContent}
              onPageChangeCallback={onPageChangeCallback}
              renderHighlights={renderHighlights}
              renderPage={customRenderPage}
            />
          </Box>

          {/* RIGHT: page-filtered chunks table + basic doc info */}
          <Box
            sx={{
              width: 500,
              minWidth: 500,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              maxHeight: "calc(100vh - 160px)", // makes inner list scrollable independently
            }}
          >
            <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, px: 0.5 }}>
              Page {currentPageNumber} Chunks ({chunksForCurrentPage.length})
            </Typography>

            {/* Scrollable window for the chunks table */}
            <TableContainer
              component={Paper}
              sx={{
                flex: 1,
                minHeight: 0,
                maxHeight: "calc(100vh - 300px)",
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: "grey.50" }}>Text</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: "grey.50", width: 100 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: "grey.50", width: 120 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {chunksForCurrentPage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" sx={{
                          color: "text.secondary"
                        }}>
                          No chunks found on this page
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            mt: 1,
                            display: "block"
                          }}>
                          Select a region on the PDF to create a new chunk
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    chunksForCurrentPage.map((chunk) => (
                    <TableRow
                      key={chunk.element_id}
                      id={chunk.element_id}
                      hover
                      sx={{
                        backgroundColor: selectedChunk === chunk.element_id ? "rgba(25, 118, 210, 0.12)" : "inherit",
                        "&:hover": {
                          backgroundColor: selectedChunk === chunk.element_id ? "rgba(25, 118, 210, 0.18)" : "action.hover",
                        },
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setSelectedChunk(chunk.element_id);
                        // Scroll to the highlight in the PDF
                        const selector = `a.highlight-target[href="#${cssEscape(chunk.element_id)}"]`;
                        const anchor = document.querySelector<HTMLAnchorElement>(selector);
                        if (anchor) {
                          anchor.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                            inline: "center",
                          });
                        }
                      }}
                    >
                      <TableCell
                        sx={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          lineHeight: 1.5,
                          fontSize: "0.875rem",
                        }}
                      >
                        {chunk.text}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={chunk.type}
                          size="small"
                          color={chunk.type === "Image" ? "secondary" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => onClickEditChunk(documentData.id, chunk.element_id)}
                            title="Edit chunk"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onClickDeleteChunk(documentData.id, chunk.element_id)}
                            title="Delete chunk"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Paper sx={{ mt: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Document Information
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                    ID:
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: "break-all", color: "text.secondary" }}>
                    {documentData.id}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                    File Name:
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {documentData.fileName}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      )}
      <DocumentSummaryDialog
        open={isSummaryDialogOpen}
        documentId={documentID}
        documentName={documentData?.fileName || ""}
        summaries={documentSummaries}
        onClose={handleCloseSummaryDialog}
        onCreate={handleCreateSummary}
        onDelete={handleDeleteSummary}
        onUpdate={handleUpdateSummary}
        onRefresh={fetchDocumentSummaries}
      />
    </>
  );
};
