import React, { useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import { Alert, Box, Button, TextField } from "@mui/material";
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
    const observer = new ResizeObserver(() =>
      setWidth(Math.max(100, element.clientWidth - 32)),
    );
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
    <Alert severity="error">
      Couldn't load this PDF.{" "}
      <Button
        onClick={() => {
          setNumPages(0);
          setPdf(undefined);
          setRetry((value) => value + 1);
        }}
      >
        Retry
      </Button>
    </Alert>
  );
  if (!pdfFile) return <p>Please select a file</p>;

  return (
    <Box
      ref={container}
      sx={{
        height: "80vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        color: "text.primary",
      }}
    >
      <Box
        role="toolbar"
        aria-label="PDF controls"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 0.5,
          p: 1,
          borderBottom: 1,
          borderColor: "divider",
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
          slotProps={{ htmlInput: { min: 1, max: numPages } }}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isInteger(value) && value > 0) goToPage(value - 1);
          }}
        />
        <span> / {numPages || "–"}</span>
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
        <span>{Math.round(scale * 100)}%</span>
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
          Open / print
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
        sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2 }}
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
            loading={<p>Loading PDF…</p>}
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
              <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 2 }}>
                {Array.from({ length: numPages }, (_, index) => (
                  <button
                    key={index}
                    aria-label={`Go to page ${index + 1}`}
                    onClick={() => goToPage(index)}
                  >
                    <Page
                      pageNumber={index + 1}
                      width={90}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                    {index + 1}
                  </button>
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
                <div
                  key={index}
                  ref={(element) => {
                    if (element) pages.current.set(index, element);
                    else pages.current.delete(index);
                  }}
                  style={{ width: "fit-content", margin: "0 auto 16px" }}
                >
                  {renderPage ? renderPage(page) : page}
                </div>
              );
            })}
          </Document>
        ) : (
          <p>Loading PDF…</p>
        )}
      </Box>
    </Box>
  );
}
