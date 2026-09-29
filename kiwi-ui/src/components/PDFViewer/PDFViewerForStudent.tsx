import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./setupPdfWorker.ts";
import { ChatContext } from "../../pages/ClassLayout.tsx";
import theme from "../../Theme.ts";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
  Badge,
} from "@mui/material";
import {
  ZoomOut as ZoomOutIcon,
  ZoomIn as ZoomInIcon,
  CropFree as CropFreeIcon,
  MenuBook as MenuBookIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";

import { buildResilientDocumentOptions } from "./pdfRangeTransport.ts";
import type { DocumentCommentPin } from "../../types/documentComments.ts";
import { getDefaultPinPosition } from "../../utils/documentComments.ts";
import { basePath } from "../../utils/api.ts";

// react-pdf reports the current page via an intersection observer over rendered
// pages. We keep the public prop shape compatible with the old viewer so callers
// (PDFComponent) don't change: a page change event carries `currentPage` (0-based).
interface PageChangeEvent {
  currentPage: number;
}

interface DocumentSummary {
  id: string;
  documentId: string;
  summaryNumber: number;
  content: string;
  isVisibleToStudents: boolean;
  authorId: string;
  author: {
    id: string;
    name?: string;
    email?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface PDFViewerProps {
  pdfFile: string;
  // Display name of the current document, shown in the viewer toolbar.
  fileName?: string;
  onPageChangeCallback?: (e: PageChangeEvent) => void;
  studentMode?: boolean;
  comments?: DocumentCommentPin[];
  documentId?: string;
  // 0-based page to scroll to once the document renders (e.g. a restored
  // last-viewed page). Explicit channel so it isn't clobbered by scroll tracking.
  initialPage?: number;
  isExpanded?: boolean;
}

const ZOOM_STEP = 0.2;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

// Toolbar control styling (Materials Page Redesign): quiet grey buttons with a
// soft lilac hover.
const toolbarButtonSx = {
  color: "#55555E",
  borderRadius: "4px",
  "&:hover": { bgcolor: "#F3F1F7" },
};

export const PDFViewerForStudents: React.FC<PDFViewerProps> = ({
  pdfFile,
  fileName,
  onPageChangeCallback,
  studentMode,
  comments,
  documentId,
  initialPage = 0,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [pageWidth, setPageWidth] = useState<number>(0);
  // Container height drives fit-to-height sizing so a whole page fits vertically
  // (at scale=1) instead of filling the width and running very tall.
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [documentSummaries, setDocumentSummaries] = useState<DocumentSummary[]>([]);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [showSummaryBanner, setShowSummaryBanner] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // Bump to re-probe + remount the Document, re-attempting a failed/stalled load.
  const [reloadKey, setReloadKey] = useState(0);
  // Resolved <Document options>: a resilient range transport when supported,
  // otherwise undefined (pdf.js loads via the URL directly). undefined until the
  // URL has been probed.
  const [docOptions, setDocOptions] = useState<Record<string, unknown> | undefined>(undefined);
  const [optionsReady, setOptionsReady] = useState(false);

  const {
    currentPDFPage,
    pdfNavigationRef,
    setCurrentPDFPage,
  } = useContext(ChatContext);

  // Once-per-document guard for restoring the scroll position to `initialPage`
  // (e.g. after a refresh restored the last-viewed PDF). Reset when the document
  // changes so switching PDFs re-arms it. While a restore is pending, handleScroll
  // is suppressed so the initial layout scroll (page 0) doesn't overwrite the
  // target before we can jump to it.
  const didRestorePageRef = useRef(false);
  const restorePendingRef = useRef(false);
  useEffect(() => {
    didRestorePageRef.current = false;
    restorePendingRef.current = initialPage > 0;
  }, [pdfFile, documentId, initialPage]);

  // Probe the URL once (per reload) to decide on the resilient transport.
  useEffect(() => {
    let cancelled = false;
    setOptionsReady(false);
    setDocOptions(undefined);
    setLoadError(false);
    if (!pdfFile) return;
    buildResilientDocumentOptions(pdfFile)
      .then((opts) => {
        if (cancelled) return;
        setDocOptions(opts);
        setOptionsReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setOptionsReady(true); // fall back to plain URL loading
      });
    return () => {
      cancelled = true;
    };
  }, [pdfFile, reloadKey]);

  // Track container width AND height so pages render to fit (responsive). Height
  // drives the default fit-to-height sizing; width caps the page so it never
  // overflows horizontally on narrow/portrait containers.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      // Account for the 20px padding around the page stack plus breathing room.
      setPageWidth(el.clientWidth - 48);
      setContainerHeight(el.clientHeight - 48);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [optionsReady]);

  useEffect(() => {
    if (setCurrentPDFPage && currentPDFPage == null) {
      setCurrentPDFPage(1);
    }
  }, [setCurrentPDFPage]);

  useEffect(() => {
    const fetchDocumentSummaries = async () => {
      if (!documentId) return;
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${basePath}/document/${documentId}/summaries/student`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        });
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const data = await response.json();
        const summaryList = Array.isArray(data)
          ? data
          : Array.isArray(data?.summaries)
          ? data.summaries
          : [];
        setDocumentSummaries(summaryList.filter((s: DocumentSummary) => s.isVisibleToStudents));
      } catch (error) {
        console.error("Failed to load document summaries:", error);
      }
    };
    if (documentId) fetchDocumentSummaries();
  }, [documentId]);

  const handleToggleComment = useCallback(
    (commentId: string, isActive: boolean, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveCommentId(isActive ? null : commentId);
    },
    []
  );

  const handleClickOutsideComment = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains("comment-backdrop")) {
      setActiveCommentId(null);
    }
  }, []);

  // Determine the visible page on scroll and report it (0-based, matching the
  // old viewer's contract).
  const handleScroll = useCallback(() => {
    // Ignore scroll events until a pending page-restore has run, so the initial
    // layout scroll (at page 0) doesn't clobber the target page.
    if (restorePendingRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const mid = container.scrollTop + container.clientHeight / 2;
    let best = 0;
    let bestDist = Infinity;
    pageRefs.current.forEach((el, idx) => {
      const center = el.offsetTop + el.offsetHeight / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = idx;
      }
    });
    if (best !== currentPDFPage) {
      if (setCurrentPDFPage) setCurrentPDFPage(best);
      onPageChangeCallback?.({ currentPage: best });
    }
  }, [currentPDFPage, setCurrentPDFPage, onPageChangeCallback]);

  // Toolbar page navigation: scroll the target page to the top of the container.
  // handleScroll then reports it as the current page, same as a manual scroll.
  const goToPage = useCallback(
    (target: number) => {
      const clamped = Math.min(Math.max(target, 0), Math.max(numPages - 1, 0));
      const container = containerRef.current;
      const el = pageRefs.current.get(clamped);
      if (!container || !el) return;
      container.scrollTop = el.offsetTop;
    },
    [numPages]
  );

  useEffect(() => {
    if (!pdfNavigationRef) return;
    pdfNavigationRef.current = goToPage;
    return () => { pdfNavigationRef.current = undefined; };
  }, [pdfNavigationRef, goToPage]);

  // Restore the scroll position to `initialPage` once the document has rendered.
  // react-pdf renders pages lazily and progressively, so pages ABOVE the target
  // grow from placeholder to real height after the target first appears — a
  // one-shot scroll lands, then drifts as the layout settles (the "not always"
  // symptom). Instead, keep re-aligning the target to the top of the container
  // every frame and only finish once its offsetTop has been stable for a few
  // consecutive frames (layout settled). Bounded, then hands back to handleScroll.
  useEffect(() => {
    if (numPages === 0) return;
    if (didRestorePageRef.current) return;
    const target = initialPage;
    if (target <= 0 || target >= numPages) {
      // Nothing to restore (default page 0 or out-of-range) — disarm.
      didRestorePageRef.current = true;
      restorePendingRef.current = false;
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    let frames = 0;
    let stableFrames = 0;
    let lastOffset = -1;
    let raf = 0;

    const finish = () => {
      didRestorePageRef.current = true;
      restorePendingRef.current = false;
      if (setCurrentPDFPage) setCurrentPDFPage(target);
    };

    const align = () => {
      if (didRestorePageRef.current) return;
      const el = pageRefs.current.get(target);
      // Target present and laid out (real height): align it to the container top.
      if (el && el.offsetHeight > 1) {
        const offset = el.offsetTop;
        // Re-pin to the target every frame so late-growing pages above it don't
        // strand the scroll.
        container.scrollTop = offset;
        // Consider it settled once the target's offset stops moving.
        if (Math.abs(offset - lastOffset) <= 1) {
          if (++stableFrames >= 5) {
            finish();
            return;
          }
        } else {
          stableFrames = 0;
        }
        lastOffset = offset;
      }
      // Up to ~4s of frames for slow documents, then give up gracefully.
      if (frames++ < 240) {
        raf = requestAnimationFrame(align);
      } else {
        finish();
      }
    };
    raf = requestAnimationFrame(align);
    return () => cancelAnimationFrame(raf);
  }, [numPages, pageWidth, containerHeight, initialPage, setCurrentPDFPage]);

  const renderCommentPins = useCallback(
    (pageIndex: number) => {
      if (!comments || comments.length === 0) return null;
      return comments
        .filter((comment) => comment.selectionRegion.pageIndex === pageIndex)
        .map((comment) => {
          const pinPosition =
            comment.pinPosition ?? getDefaultPinPosition(comment.selectionRegion);
          const isActive = activeCommentId === comment.id;
          return (
            <React.Fragment key={comment.id}>
              {isActive && (
                <div
                  className="comment-backdrop"
                  onClick={handleClickOutsideComment}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9,
                    backgroundColor: "transparent",
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  left: `${pinPosition.left}%`,
                  top: `${pinPosition.top}%`,
                  width: 0,
                  height: 0,
                  zIndex: isActive ? 11 : 3,
                }}
              >
                <div
                  onClick={(e) => handleToggleComment(comment.id, isActive, e)}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transform: "translate(-50%, -50%)",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: "#1976d2",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isActive
                      ? "0 4px 12px rgba(25, 118, 210, 0.6)"
                      : "0 2px 6px rgba(25, 118, 210, 0.3)",
                    pointerEvents: "auto",
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "transform 0.2s ease",
                  }}
                >
                  💬
                </div>
                {isActive && (
                  <Paper
                    elevation={4}
                    sx={{
                      position: "absolute",
                      left: "50%",
                      top: "calc(100% + 12px)",
                      transform: "translateX(-50%)",
                      width: 280,
                      maxWidth: "90vw",
                      p: 2,
                      zIndex: 11,
                      backgroundColor: "background.paper",
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {comment.text}
                    </Typography>
                  </Paper>
                )}
              </div>
            </React.Fragment>
          );
        });
    },
    [comments, activeCommentId, handleToggleComment, handleClickOutsideComment]
  );

  const retry = useCallback(() => {
    setLoadError(false);
    setReloadKey((k) => k + 1);
  }, []);

  if (!studentMode) return null;

  if (!pdfFile) {
    return <p>Loading your class lectures...</p>;
  }

  const renderError = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 2,
        p: 3,
      }}
    >
      <Typography color="error" sx={{ maxWidth: 420, textAlign: "center" }}>
        Couldn&apos;t load this PDF. This can happen on a slow or unstable network
        connection.
      </Typography>
      <Button variant="contained" startIcon={<RefreshIcon />} onClick={retry}>
        Retry
      </Button>
    </Box>
  );

  const loader = (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box
      className="fullscreen-container"
      sx={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}
    >
      {/* Document Summary Banner */}
      {documentSummaries.length > 0 && showSummaryBanner && (
        <Paper
          elevation={6}
          sx={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            maxWidth: "90%",
            backgroundColor: "#1976d2",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2.5,
            py: 1,
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(25, 118, 210, 0.4)",
          }}
        >
          <InfoIcon sx={{ fontSize: 24 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
            Professor added {documentSummaries.length}{" "}
            {documentSummaries.length === 1 ? "summary" : "summaries"}
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setShowSummaryBanner(false);
              setIsSummaryDialogOpen(true);
            }}
            sx={{
              backgroundColor: "white",
              color: "#1976d2",
              fontWeight: 600,
              px: 2,
              py: 0.5,
              minWidth: "auto",
              "&:hover": { backgroundColor: "#f5f5f5" },
            }}
          >
            Read
          </Button>
          <IconButton
            size="small"
            onClick={() => setShowSummaryBanner(false)}
            sx={{ color: "white", padding: 0.5, "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}

      {documentSummaries.length > 0 && !showSummaryBanner && (
        <IconButton
          onClick={() => setShowSummaryBanner(true)}
          sx={{
            position: "absolute",
            top: 16,
            right: 80,
            zIndex: 1000,
            backgroundColor: "#1976d2",
            color: "white",
            "&:hover": { backgroundColor: "#1565c0" },
            boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
          }}
        >
          <Badge badgeContent={documentSummaries.length} color="error">
            <MenuBookIcon />
          </Badge>
        </IconButton>
      )}

      {/* Viewer toolbar (Materials Page Redesign): filename, page nav, zoom, fullscreen */}
      <Box
        sx={{
          height: 44,
          flex: "none",
          bgcolor: "#ffffff",
          borderBottom: "1px solid #E5E1EB",
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
        }}
      >
        <Typography
          noWrap
          sx={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "#2A2A30" }}
        >
          {fileName || ""}
        </Typography>
        <Stack
          direction="row"
          spacing={0}
          sx={{
            alignItems: "center",
            flex: "none",
            color: "#55555E"
          }}>
          <IconButton
            size="small"
            sx={toolbarButtonSx}
            onClick={() => goToPage((currentPDFPage ?? 0) - 1)}
            aria-label="previous page"
          >
            <NavigateBeforeIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ fontSize: 12, minWidth: 44, textAlign: "center" }}>
            {numPages > 0 ? `${(currentPDFPage ?? 0) + 1} / ${numPages}` : "– / –"}
          </Typography>
          <IconButton
            size="small"
            sx={toolbarButtonSx}
            onClick={() => goToPage((currentPDFPage ?? 0) + 1)}
            aria-label="next page"
          >
            <NavigateNextIcon fontSize="small" />
          </IconButton>
          <Box sx={{ width: "1px", height: 18, bgcolor: "#E5E1EB", mx: 0.75 }} />
          <IconButton
            size="small"
            sx={toolbarButtonSx}
            onClick={() => setScale((s) => Math.max(s - ZOOM_STEP, MIN_SCALE))}
            aria-label="zoom out"
          >
            <ZoomOutIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ fontSize: 12, minWidth: 40, textAlign: "center" }}>
            {Math.round(scale * 100)}%
          </Typography>
          <IconButton
            size="small"
            sx={toolbarButtonSx}
            onClick={() => setScale((s) => Math.min(s + ZOOM_STEP, MAX_SCALE))}
            aria-label="zoom in"
          >
            <ZoomInIcon fontSize="small" />
          </IconButton>
          <Box sx={{ width: "1px", height: 18, bgcolor: "#E5E1EB", mx: 0.75 }} />
          <IconButton
            size="small"
            sx={toolbarButtonSx}
            onClick={() => containerRef.current?.requestFullscreen?.()}
            aria-label="fullscreen"
          >
            <CropFreeIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Scrollable viewer area */}
      <Box
        ref={containerRef}
        onScroll={handleScroll}
        sx={{
          flexGrow: 1,
          minHeight: 0,
          position: "relative",
          overflow: "auto",
          bgcolor: "#EDEBF1",
          p: "20px",
        }}
      >
          {loadError ? (
            renderError
          ) : !optionsReady ? (
            loader
          ) : (
            <Document
              suspense={false}
              key={reloadKey}
              file={pdfFile}
              options={docOptions}
              loading={loader}
              error={renderError}
              noData={loader}
              onLoadSuccess={(pdf) => {
                setNumPages(pdf.numPages);
                setLoadError(false);
              }}
              onLoadError={(error) => {
                console.error("Failed to load PDF:", error);
                setLoadError(true);
              }}
            >
              {Array.from({ length: numPages }, (_, index) => (
                <div
                  key={index}
                  ref={(el) => {
                    if (el) pageRefs.current.set(index, el);
                    else pageRefs.current.delete(index);
                  }}
                  style={{
                    position: "relative",
                    margin: "0 auto 16px",
                    width: "fit-content",
                    background: "#ffffff",
                    boxShadow: "0 1px 4px rgba(28,12,48,0.14)",
                  }}
                >
                  <Page
                    pageNumber={index + 1}
                    // Fit a whole page to the container height by default (scale=1),
                    // so it fits vertically instead of filling the width and
                    // running tall. Fall back to width-fit until height is known.
                    height={containerHeight > 0 ? containerHeight * scale : undefined}
                    width={
                      containerHeight > 0
                        ? undefined
                        : pageWidth > 0
                        ? pageWidth * scale
                        : undefined
                    }
                    renderTextLayer
                    renderAnnotationLayer
                  />
                  {/* Current-page marker — kept so the user can see which page
                      the AI currently has context for. */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      border: index === currentPDFPage ? `2px solid ${theme.palette.primary.main}` : "none",
                      pointerEvents: "none",
                    }}
                  />
                  {/* Comment pins overlay */}
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    {renderCommentPins(index)}
                  </div>
                </div>
              ))}
            </Document>
          )}
      </Box>

      {/* Document Summary Dialog */}
      <Dialog
        open={isSummaryDialogOpen}
        onClose={() => setIsSummaryDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 2 } }
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, backgroundColor: "#f5f5f5" }}>
          <MenuBookIcon color="primary" />
          <Typography variant="h6">Document Summaries</Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              ml: "auto"
            }}>
            {documentSummaries.length} {documentSummaries.length === 1 ? "summary" : "summaries"}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {documentSummaries.length === 0 ? (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                textAlign: "center",
                py: 3
              }}>
              No summaries available for this document.
            </Typography>
          ) : (
            <Stack spacing={3}>
              {documentSummaries.map((summary, index) => (
                <Box key={summary.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      backgroundColor: "rgba(25, 118, 210, 0.03)",
                      border: "1px solid rgba(25, 118, 210, 0.1)",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: "#1976d2" }}>
                      Summary {index + 1}
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8, mb: 2 }}>
                      {summary.content}
                    </Typography>
                    {summary.author && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5
                        }}>
                        <strong>Added by:</strong> {summary.author.name || summary.author.email}
                      </Typography>
                    )}
                  </Paper>
                  {index < documentSummaries.length - 1 && <Divider sx={{ my: 1 }} />}
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
          <Button onClick={() => setIsSummaryDialogOpen(false)} variant="contained" sx={{ px: 4 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
