import React, { useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./setupPdfWorker.ts";
import { ChatContext } from "../../pages/ClassLayout.tsx";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Paper,
  Skeleton,
  Stack,
  SvgIcon,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ZoomOut as ZoomOutIcon,
  ZoomIn as ZoomInIcon,
  CropFree as CropFreeIcon,
  MenuBookOutlined as MenuBookIcon,
  Close as CloseIcon,
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
// The paper's hairline frame (px, each side), counted when fitting a page.
const PAPER_FRAME = 1;

const LOADING_MATERIALS = "Loading your materials…";
const LOAD_ERROR =
  "Couldn't load this PDF. Your connection may be slow or unstable. Check it, then select Retry.";
// The stated reasons of the toolbar's unavailable controls (DESIGN.md shared strings).
const FIRST_PAGE_REASON = "This is the first page.";
const LAST_PAGE_REASON = "This is the last page.";
const SMALLEST_ZOOM_REASON = "This is the smallest zoom.";
const LOADING_REASON = "These controls are unavailable while the document loads.";

/** "1 summary", "2 summaries": the count with its noun. */
const countOf = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

// Read by assistive technology, not drawn.
const visuallyHiddenSx = {
  position: "absolute",
  width: "1px",
  height: "1px",
  p: 0,
  m: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

// The PDF bar (DESIGN.md, The PDF viewer): tool chrome on the sheet with its
// bottom rule. It wraps rather than overflow on a very narrow viewer.
const pdfBarSx = {
  flex: "none",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  columnGap: "var(--icon-button-row-gap)",
  minHeight: "var(--pdf-toolbar-height)",
  pl: "var(--space-4)",
  pr: "var(--space-2)",
  bgcolor: "var(--pdf-toolbar-fill)",
  borderBottom: "1px solid var(--pdf-toolbar-rule)",
} as const;

// Page and zoom labels: caption, tabular figures, so the buttons do not shift.
const barLabelSx = {
  flex: "none",
  color: "var(--pdf-toolbar-label)",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  textAlign: "center",
} as const;

/** A 1 px divider between the bar's button groups. */
const BarDivider = () => (
  <Box
    component="span"
    aria-hidden
    sx={{
      flex: "none",
      width: "1px",
      height: "var(--pdf-toolbar-divider-height)",
      mx: "var(--space-1)",
      bgcolor: "var(--pdf-toolbar-divider)",
    }}
  />
);

/**
 * A toolbar icon button. When its action is unavailable it stays focusable
 * (aria-disabled), does nothing, and its tooltip states why; the reason is
 * also its description for assistive technology.
 */
const BarButton = ({
  label,
  reason,
  onClick,
  children,
}: {
  label: string;
  reason?: string;
  onClick: () => void;
  children: React.ReactElement;
}) => {
  const reasonId = useId();
  return (
    <>
      <Tooltip title={reason ?? label}>
        <IconButton
          aria-label={label}
          aria-disabled={reason ? "true" : undefined}
          aria-describedby={reason ? reasonId : undefined}
          onClick={reason ? undefined : onClick}
          sx={{ flex: "none" }}
        >
          {children}
        </IconButton>
      </Tooltip>
      {reason && (
        <Box component="span" id={reasonId} hidden>
          {reason}
        </Box>
      )}
    </>
  );
};

/** The design system's speech-bubble glyph for comment pins: an SVG, never an emoji. */
const PinGlyph = () => (
  <SvgIcon viewBox="0 0 16 16" aria-hidden sx={{ fontSize: "var(--pdf-toolbar-pin-glyph)" }}>
    <path
      d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  </SvgIcon>
);

// A comment pin: a mark on the paper, so its colours never follow the mode (G5)
// and it dims with the page; 24 px drawn, a 44 px hit area on coarse pointers.
const pinSx = {
  position: "absolute",
  left: 0,
  top: 0,
  transform: "translate(-50%, -50%)",
  width: "var(--pdf-toolbar-pin)",
  height: "var(--pdf-toolbar-pin)",
  borderRadius: "50%",
  bgcolor: "var(--pdf-toolbar-variant-pin-visible-fill)",
  color: "var(--pdf-toolbar-variant-pin-visible-glyph)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: "var(--pdf-toolbar-paper-dim)",
  pointerEvents: "auto",
  cursor: "pointer",
  "&::before": {
    content: '""',
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "max(100%, var(--pdf-toolbar-pin-hit))",
    height: "max(100%, var(--pdf-toolbar-pin-hit))",
    transform: "translate(-50%, -50%)",
  },
} as const;

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
      // The page fits inside the canvas padding (a density token) and its own
      // hairline frame.
      const style = getComputedStyle(el);
      const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      setPageWidth(el.clientWidth - padX - 2 * PAPER_FRAME);
      setContainerHeight(el.clientHeight - padY - 2 * PAPER_FRAME);
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
                <Box
                  data-testid="comment-pin"
                  onClick={(e: React.MouseEvent) => handleToggleComment(comment.id, isActive, e)}
                  sx={pinSx}
                >
                  <PinGlyph />
                </Box>
                {isActive && (
                  // The opened comment is chrome floating over the paper: it
                  // follows the mode, with the popover's hairline and shadow.
                  <Paper
                    sx={{
                      position: "absolute",
                      left: "50%",
                      top: "calc(100% + var(--space-3))",
                      transform: "translateX(-50%)",
                      width: 280,
                      maxWidth: "90vw",
                      p: "var(--space-4)",
                      zIndex: 11,
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-1)",
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
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
    return (
      <Box
        role="status"
        sx={{
          height: "100%",
          p: "var(--pdf-toolbar-canvas-padding)",
          bgcolor: "var(--pdf-toolbar-canvas)",
        }}
      >
        <Typography variant="body2" sx={{ color: "var(--pdf-toolbar-loading-label)" }}>
          {LOADING_MATERIALS}
        </Typography>
      </Box>
    );
  }

  const renderError = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "var(--space-4)",
        p: "var(--space-5)",
      }}
    >
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        {LOAD_ERROR}
      </Alert>
      <Button variant="outlined" onClick={retry}>
        Retry
      </Button>
    </Box>
  );

  // While the document loads, a skeleton page holds the canvas (no spinner).
  const loader = (
    <Box role="status" sx={{ display: "flex", justifyContent: "center" }}>
      <Skeleton
        variant="rectangular"
        sx={{ width: "min(100%, 640px)", height: "auto", aspectRatio: "16 / 9" }}
      />
      <Box component="span" sx={visuallyHiddenSx}>
        {LOADING_MATERIALS}
      </Box>
    </Box>
  );

  const loaded = numPages > 0;
  const pageIndex = currentPDFPage ?? 0;
  const previousReason = !loaded
    ? LOADING_REASON
    : pageIndex <= 0
    ? FIRST_PAGE_REASON
    : undefined;
  const nextReason = !loaded
    ? LOADING_REASON
    : pageIndex >= numPages - 1
    ? LAST_PAGE_REASON
    : undefined;
  const zoomOutReason = scale <= MIN_SCALE ? SMALLEST_ZOOM_REASON : undefined;
  const summaryCount = documentSummaries.length;

  return (
    <Box
      className="fullscreen-container"
      sx={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}
    >
      {/* Summary banner: an info alert floating at the top of the canvas */}
      {summaryCount > 0 && showSummaryBanner && (
        <Alert
          severity="info"
          role="status"
          data-density="compact"
          action={
            <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <Link
                component="button"
                type="button"
                onClick={() => {
                  setShowSummaryBanner(false);
                  setIsSummaryDialogOpen(true);
                }}
                sx={{
                  position: "relative",
                  color: "var(--pdf-toolbar-variant-banner-action)",
                  fontWeight: "var(--weight-semibold)",
                  whiteSpace: "nowrap",
                  textDecorationThickness: "var(--pdf-toolbar-banner-action-underline)",
                  "&:hover": {
                    textDecorationThickness: "var(--pdf-toolbar-banner-action-underline-hover)",
                  },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: "max(100%, var(--pdf-toolbar-banner-action-hit))",
                    height: "var(--pdf-toolbar-banner-action-hit)",
                    transform: "translate(-50%, -50%)",
                  },
                }}
              >
                {summaryCount === 1 ? "Read summary" : "Read summaries"}
              </Link>
              <Tooltip title="Close">
                <IconButton
                  aria-label="Close"
                  color="inherit"
                  onClick={() => setShowSummaryBanner(false)}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          }
          sx={{
            position: "absolute",
            top: "calc(var(--pdf-toolbar-height) + var(--space-4))",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            width: "max-content",
            maxWidth: "calc(100% - 2 * var(--space-4))",
            alignItems: "center",
            boxShadow: "var(--pdf-toolbar-banner-shadow)",
          }}
        >
          {`Your instructor added ${countOf(summaryCount, "summary", "summaries")}`}
        </Alert>
      )}

      {/* PDF bar: file name, "Shared with Kiwi", page navigation, zoom, fullscreen */}
      <Box data-density="compact" sx={pdfBarSx}>
        <Typography
          component="span"
          variant="subtitle2"
          noWrap
          sx={{ flex: "1 1 0%", minWidth: 0, color: "var(--pdf-toolbar-title)" }}
        >
          {fileName || ""}
        </Typography>
        {summaryCount > 0 && !showSummaryBanner && (
          <Tooltip title="Document summaries">
            <IconButton
              aria-label="Document summaries"
              onClick={() => setShowSummaryBanner(true)}
              sx={{ flex: "none" }}
            >
              <Badge badgeContent={summaryCount} color="primary">
                <MenuBookIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        )}
        {loaded && (
          // The page outlined on the canvas is the one the chat can read.
          <Chip
            label="Shared with Kiwi"
            sx={{
              flex: "none",
              display: { xs: "none", sm: "inline-flex" },
              bgcolor: "var(--pdf-toolbar-success-chip)",
              color: "var(--pdf-toolbar-success-chip-text)",
            }}
          />
        )}
        <BarDivider />
        <BarButton
          label="Previous page"
          reason={previousReason}
          onClick={() => goToPage(pageIndex - 1)}
        >
          <NavigateBeforeIcon />
        </BarButton>
        <Typography component="span" variant="caption" sx={{ ...barLabelSx, minWidth: 40 }}>
          {loaded ? (
            `${pageIndex + 1} / ${numPages}`
          ) : (
            <>
              <span aria-hidden="true">— / —</span>
              <Box component="span" sx={visuallyHiddenSx}>
                No value
              </Box>
            </>
          )}
        </Typography>
        <BarButton label="Next page" reason={nextReason} onClick={() => goToPage(pageIndex + 1)}>
          <NavigateNextIcon />
        </BarButton>
        <BarDivider />
        <BarButton
          label="Zoom out"
          reason={zoomOutReason}
          onClick={() => setScale((s) => Math.max(s - ZOOM_STEP, MIN_SCALE))}
        >
          <ZoomOutIcon />
        </BarButton>
        <Typography component="span" variant="caption" sx={{ ...barLabelSx, minWidth: 36 }}>
          {Math.round(scale * 100)}%
        </Typography>
        <BarButton
          label="Zoom in"
          onClick={() => setScale((s) => Math.min(s + ZOOM_STEP, MAX_SCALE))}
        >
          <ZoomInIcon />
        </BarButton>
        <BarDivider />
        <BarButton label="Fullscreen" onClick={() => containerRef.current?.requestFullscreen?.()}>
          <CropFreeIcon />
        </BarButton>
      </Box>

      {/* Scrollable canvas: the paper on its hairline frame */}
      <Box
        ref={containerRef}
        onScroll={handleScroll}
        sx={{
          flexGrow: 1,
          minHeight: 0,
          position: "relative",
          overflow: "auto",
          bgcolor: "var(--pdf-toolbar-canvas)",
          p: "var(--pdf-toolbar-canvas-padding)",
          // Paper stays paper (G5): the page keeps its own rendering, dimmed in
          // dark mode against glare; the frame around it follows the mode.
          "& .react-pdf__Page": { opacity: "var(--pdf-toolbar-paper-dim)" },
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
              {Array.from({ length: numPages }, (_, index) => {
                // The page the chat has in context: its own 1 px edge becomes a
                // 2 px frame (the extra pixel inward), neutral, never a brand colour.
                const inContext = index === currentPDFPage;
                return (
                  <div
                    key={index}
                    ref={(el) => {
                      if (el) pageRefs.current.set(index, el);
                      else pageRefs.current.delete(index);
                    }}
                    aria-current={inContext ? "true" : undefined}
                    style={{
                      position: "relative",
                      width: "fit-content",
                      margin: "0 auto var(--space-4)",
                      border: `${PAPER_FRAME}px solid ${
                        inContext
                          ? "var(--pdf-toolbar-variant-page-current-outline)"
                          : "var(--pdf-toolbar-frame)"
                      }`,
                      // Paper is content: forced colours leave it and its marks alone.
                      forcedColorAdjust: "none",
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
                    {inContext && (
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          inset: 0,
                          pointerEvents: "none",
                          boxShadow: `inset 0 0 0 calc(var(--pdf-toolbar-page-outline) - ${PAPER_FRAME}px) var(--pdf-toolbar-variant-page-current-outline)`,
                        }}
                      />
                    )}
                    {/* Comment pins overlay */}
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                      {renderCommentPins(index)}
                    </div>
                  </div>
                );
              })}
            </Document>
          )}
      </Box>

      {/* Document Summary Dialog */}
      <Dialog
        open={isSummaryDialogOpen}
        onClose={() => setIsSummaryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <MenuBookIcon color="primary" aria-hidden />
          <Box component="span" sx={{ flex: "1 1 auto", minWidth: 0 }}>
            Document summaries
          </Box>
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
          >
            {countOf(summaryCount, "summary", "summaries")}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {summaryCount === 0 ? (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                textAlign: "center",
                py: "var(--space-5)",
              }}
            >
              No summaries available for this document
            </Typography>
          ) : (
            <Stack spacing="var(--space-5)" divider={<Divider />} sx={{ py: "var(--space-2)" }}>
              {documentSummaries.map((summary, index) => (
                <Box key={summary.id}>
                  <Typography
                    component="h3"
                    variant="subtitle1"
                    sx={{ mb: "var(--space-2)", color: "text.primary" }}
                  >
                    Summary {index + 1}
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", mb: "var(--space-2)" }}>
                    {summary.content}
                  </Typography>
                  {summary.author && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-1)",
                      }}
                    >
                      <strong>Added by:</strong> {summary.author.name || summary.author.email}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSummaryDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
