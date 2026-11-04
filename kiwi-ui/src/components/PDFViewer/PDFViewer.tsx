import React, { useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import type { PageChangeEvent } from "./pdfTypes.ts";
import { PdfSearch, type PdfDocument } from "./PdfSearch.tsx";
import { usePdfSource } from "./usePdfSource.ts";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "./setupPdfWorker.ts";

interface PDFViewerProps {
  pdfFile: string;
  initialPage?: number;
  onPageChangeCallback?: (event: PageChangeEvent) => void;
  renderHighlights?: (props: { pageIndex: number }) => React.ReactNode;
  renderPage?: (page: React.ReactNode) => React.ReactNode;
  continuous?: boolean;
}

// The paper's hairline frame (px, each side), counted when fitting the width.
const PAPER_FRAME = 1;

const statusLineSx = { color: "var(--pdf-toolbar-loading-label)" } as const;

// Page and zoom labels: caption, tabular figures, so the controls do not shift.
const barLabelSx = {
  color: "var(--pdf-toolbar-label)",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
} as const;

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

export const PDFViewer = ({ pdfFile, ...props }: PDFViewerProps) => (
  <PdfDocumentViewer key={pdfFile} pdfFile={pdfFile} {...props} />
);

function PdfDocumentViewer({
  pdfFile,
  initialPage = 0,
  onPageChangeCallback,
  renderHighlights,
  renderPage,
  continuous = false,
}: PDFViewerProps) {
  const [pdf, setPdf] = useState<PdfDocument>();
  const [showSearch, setShowSearch] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(initialPage);
  const [scale, setScale] = useState(1);
  const [retry, setRetry] = useState(0);
  const [width, setWidth] = useState(600);
  const [thumbnails, setThumbnails] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const pages = useRef(new Map<number, HTMLDivElement>());
  const source = usePdfSource(pdfFile, retry);
  const callback = useRef(onPageChangeCallback);
  callback.current = onPageChangeCallback;

  useEffect(() => {
    const element = scrollContainer.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      // The page fits inside the canvas padding (a density token) and its frame.
      const style = getComputedStyle(element);
      const padX =
        (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      setWidth(Math.max(100, element.clientWidth - padX - 2 * PAPER_FRAME));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (numPages) callback.current?.({ currentPage: pageIndex });
  }, [numPages, pageIndex]);
  useEffect(() => {
    setPageIndex(
      numPages ? Math.max(0, Math.min(initialPage, numPages - 1)) : initialPage,
    );
  }, [initialPage, numPages]);

  function goToPage(index: number) {
    const next = Math.max(0, Math.min(numPages - 1, index));
    setPageIndex(next);
    if (continuous) {
      const page = pages.current.get(next);
      const scroll = scrollContainer.current;
      if (page && scroll)
        scroll.scrollTop +=
          page.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
    } else scrollContainer.current?.scrollTo({ top: 0, left: 0 });
  }
  const error = (
    <Alert
      severity="error"
      action={
        <Button
          variant="outlined"
          onClick={() => {
            setNumPages(0);
            setPdf(undefined);
            setRetry((value) => value + 1);
          }}
        >
          Retry
        </Button>
      }
    >
      Couldn't load this PDF. Your connection may be slow or unstable. Check it, then select Retry.
    </Alert>
  );
  if (!pdfFile)
    return (
      <Typography variant="body2" sx={statusLineSx}>
        Choose a file to open.
      </Typography>
    );

  const loading = (
    <Typography role="status" variant="body2" sx={statusLineSx}>
      Loading PDF…
    </Typography>
  );

  return (
    <Box
      ref={container}
      sx={{
        height: "80vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--border)",
        bgcolor: "background.paper",
        color: "text.primary",
      }}
    >
      <Box
        role="toolbar"
        aria-label="PDF controls"
        data-density="compact"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "var(--icon-button-row-gap)",
          minHeight: "var(--pdf-toolbar-height)",
          px: "var(--space-2)",
          py: "var(--space-1)",
          bgcolor: "var(--pdf-toolbar-fill)",
          borderBottom: "1px solid var(--pdf-toolbar-rule)",
        }}
      >
        <Button
          disabled={!numPages}
          onClick={() => setShowSearch(!showSearch)}
          aria-pressed={showSearch}
        >
          Search
        </Button>
        <Button
          disabled={!numPages}
          onClick={() => setThumbnails(!thumbnails)}
          aria-pressed={thumbnails}
        >
          Thumbnails
        </Button>
        <Button
          disabled={!numPages || pageIndex === 0}
          onClick={() => goToPage(0)}
        >
          First
        </Button>
        <Button
          disabled={!numPages || pageIndex === 0}
          onClick={() => goToPage(pageIndex - 1)}
        >
          Previous
        </Button>
        <TextField
          label="Page"
          type="number"
          size="small"
          value={numPages ? pageIndex + 1 : ""}
          disabled={!numPages}
          sx={{ width: 80 }}
          slotProps={{
            htmlInput: { min: 1, max: numPages, style: { fontVariantNumeric: "tabular-nums" } },
          }}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isInteger(value) && value > 0) goToPage(value - 1);
          }}
        />
        <Typography component="span" variant="caption" sx={barLabelSx}>
          {" / "}
          {numPages || (
            <>
              <span aria-hidden="true">—</span>
              <Box component="span" sx={visuallyHiddenSx}>
                No value
              </Box>
            </>
          )}
        </Typography>
        <Button
          disabled={!numPages || pageIndex >= numPages - 1}
          onClick={() => goToPage(pageIndex + 1)}
        >
          Next
        </Button>
        <Button
          disabled={!numPages || pageIndex >= numPages - 1}
          onClick={() => goToPage(numPages - 1)}
        >
          Last
        </Button>
        <Button
          aria-label="Zoom out"
          disabled={scale <= 0.5}
          onClick={() => setScale((value) => Math.max(0.5, value - 0.25))}
        >
          −
        </Button>
        <Typography component="span" variant="caption" sx={barLabelSx}>
          {Math.round(scale * 100)}%
        </Typography>
        <Button
          aria-label="Zoom in"
          disabled={scale >= 3}
          onClick={() => setScale((value) => Math.min(3, value + 0.25))}
        >
          +
        </Button>
        <Button onClick={() => setScale(1)}>Fit width</Button>
        <Button
          component="a"
          href={pdfFile}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open or print
        </Button>
        <Button
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void container.current?.requestFullscreen();
          }}
        >
          Fullscreen
        </Button>
      </Box>
      {showSearch && pdf && (
        <PdfSearch key={retry} pdf={pdf} onSelect={goToPage} />
      )}
      <Box
        ref={scrollContainer}
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          p: "var(--pdf-toolbar-canvas-padding)",
          bgcolor: "var(--pdf-toolbar-canvas)",
          // Paper stays paper (G5): pages and miniatures keep their own
          // rendering, dimmed in dark mode against glare.
          "& .react-pdf__Page": { opacity: "var(--pdf-toolbar-paper-dim)" },
        }}
        onScroll={() => {
          if (!continuous || !scrollContainer.current) return;
          const top = scrollContainer.current.getBoundingClientRect().top;
          let closest = pageIndex,
            distance = Infinity;
          pages.current.forEach((element, index) => {
            const delta = Math.abs(element.getBoundingClientRect().top - top);
            if (delta < distance) {
              closest = index;
              distance = delta;
            }
          });
          setPageIndex(closest);
        }}
      >
        {source ? (
          <Document
            key={retry}
            file={pdfFile}
            options={source.options}
            suspense={false}
            loading={loading}
            error={error}
            onLoadSuccess={(document) => {
              setPageIndex(
                Math.max(0, Math.min(initialPage, document.numPages - 1)),
              );
              setNumPages(document.numPages);
              setPdf(document);
            }}
            onItemClick={({ pageNumber }) => {
              if (pageNumber) goToPage(pageNumber - 1);
            }}
          >
            {thumbnails && (
              <Box
                sx={{
                  display: "flex",
                  gap: "var(--space-2)",
                  overflowX: "auto",
                  pb: "var(--space-4)",
                }}
              >
                {Array.from({ length: numPages }, (_, index) => (
                  // A paper miniature on its hairline frame; the current one
                  // takes the 2 px frame of the page in view.
                  <Box
                    component="button"
                    type="button"
                    key={index}
                    aria-label={`Go to page ${index + 1}`}
                    aria-current={index === pageIndex ? "true" : undefined}
                    onClick={() => goToPage(index)}
                    sx={{
                      flex: "none",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "var(--space-1)",
                      p: 0,
                      border: 0,
                      bgcolor: "transparent",
                      cursor: "pointer",
                      color: "var(--pdf-toolbar-variant-thumbnails-label)",
                      fontFamily: "var(--type-caption-family)",
                      fontSize: "var(--type-caption-size)",
                      lineHeight: "var(--type-caption-leading)",
                      fontVariantNumeric: "tabular-nums",
                      "& .react-pdf__Page": {
                        border: "1px solid var(--pdf-toolbar-variant-thumbnails-frame)",
                        forcedColorAdjust: "none",
                      },
                      // The current miniature: its edge at 2 px, the extra pixel
                      // drawn inward over the paper (one frame).
                      "&[aria-current='true'] .react-pdf__Page": {
                        borderColor: "var(--pdf-toolbar-variant-thumbnails-outline)",
                        outline: "1px solid var(--pdf-toolbar-variant-thumbnails-outline)",
                        outlineOffset: "-2px",
                      },
                    }}
                  >
                    <Page
                      pageNumber={index + 1}
                      width={90}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                    {index + 1}
                  </Box>
                ))}
              </Box>
            )}
            {(continuous
              ? Array.from({ length: numPages }, (_, index) => index)
              : numPages
                ? [pageIndex]
                : []
            ).map((index) => {
              const page = (
                <div style={{ position: "relative", width: "fit-content" }}>
                  <Page
                    pageNumber={index + 1}
                    width={width * scale}
                    error={error}
                  />
                  {renderHighlights?.({ pageIndex: index })}
                </div>
              );
              return (
                // The paper on its hairline frame, drawn outside any selection
                // surface so the page's own geometry is unchanged.
                <div
                  key={index}
                  ref={(element) => {
                    if (element) pages.current.set(index, element);
                    else pages.current.delete(index);
                  }}
                  style={{
                    width: "fit-content",
                    margin: "0 auto var(--space-4)",
                    border: `${PAPER_FRAME}px solid var(--pdf-toolbar-frame)`,
                    forcedColorAdjust: "none",
                  }}
                >
                  {renderPage ? renderPage(page) : page}
                </div>
              );
            })}
          </Document>
        ) : (
          loading
        )}
      </Box>
    </Box>
  );
}
