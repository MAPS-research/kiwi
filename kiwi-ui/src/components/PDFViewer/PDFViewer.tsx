import { useTheme } from "@mui/material";
import {
  PageChangeEvent,
  RenderPage,
  ScrollMode,
  Viewer,
  Worker,
} from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { HighlightArea } from "@react-pdf-viewer/highlight";
import "@react-pdf-viewer/toolbar/lib/styles/index.css";
import React, { useEffect } from "react";
import "./PDFViewer.css";
import { transformGetDocumentParams, renderPdfError } from "./pdfLoadOptions.tsx";

type HighlightsType = {
  id: string;
  image: string;
  selectionRegion: HighlightArea;
}[];

interface PDFViewerProps {
  pdfFile: string;
  onPageChangeCallback?: (e: PageChangeEvent) => void;
  highlightSelectionPlugin?: Plugin;
  highlightPlugin?: any;
  previousHighlights?: Array<any>;
  highlights?: HighlightsType;
  customRenderPage?: RenderPage;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfFile,
  onPageChangeCallback,
  highlightSelectionPlugin,
  highlightPlugin,
  previousHighlights,
  highlights,
  customRenderPage,
}) => {
  const theme = useTheme();

  const viewerTheme = theme.palette.mode === "dark" ? "dark" : "light";

  const [currentPDFPage, setCurrentPDFPage] = React.useState<number | null>(
    null
  );
  // Bump this to force the Viewer to remount and re-attempt loading the PDF.
  const [reloadKey, setReloadKey] = React.useState(0);

  // get the current page number for the PDF viewer from the context
  useEffect(() => {
    if (setCurrentPDFPage) {
      setCurrentPDFPage(currentPDFPage ?? 1);
    }
    console.log(`Current page: ${currentPDFPage} from PDFViewer.tsx`);
  }, [currentPDFPage, setCurrentPDFPage]);

  const newplugin = defaultLayoutPlugin();
  const { jumpToHighlightArea } = highlightPlugin || {};
  console.log("my previous highlights", previousHighlights);

  return (
    <div>
      <div className='pdf-container'>
        <Worker workerUrl='/assets/pdf.worker.min.js'>
          {pdfFile ? (
            <div
              style={{
                border: "1px solid rgba(0, 0, 0, 0.3)",
                display: "flex",
                height: "100%",
                overflow: "hidden",
              }}
            >
              {/* Removed the left-side highlights/thumbnails rail */}

              <div
                style={
                  highlights
                    ? {
                        flex: "1 1 0",
                      }
                    : {}
                }
              >
                <Viewer
                  key={reloadKey}
                  fileUrl={pdfFile}
                  transformGetDocumentParams={transformGetDocumentParams}
                  renderError={renderPdfError(() => setReloadKey((k) => k + 1))}
                  plugins={[
                    newplugin,
                    highlightPlugin ?? {},
                    highlightSelectionPlugin ?? {},
                  ]}
                  scrollMode={ScrollMode.Page}
                  onPageChange={onPageChangeCallback}
                  renderPage={customRenderPage ?? undefined}
                  theme={viewerTheme}
                />
              </div>
            </div>
          ) : (
            <p style={{ margin: "1em 0" }}>Please select a file</p>
          )}
        </Worker>
      </div>
    </div>
  );
};
