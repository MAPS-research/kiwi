import React from "react";
import { Worker } from "@react-pdf-viewer/core";
import { Viewer } from "@react-pdf-viewer/core";
// import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { thumbnailPlugin } from "@react-pdf-viewer/thumbnail";

// Import styles
import "@react-pdf-viewer/thumbnail/lib/styles/index.css";
import type { Plugin, RenderViewer } from "@react-pdf-viewer/core";
import { transformGetDocumentParams } from "../PDFViewer/pdfLoadOptions.tsx";

interface PageThumbnailPluginProps {
  PageThumbnail: React.ReactElement;
}

const pageThumbnailPlugin = (props: PageThumbnailPluginProps): Plugin => {
  const { PageThumbnail } = props;

  return {
    renderViewer: (renderProps: RenderViewer) => {
      let { slot } = renderProps;

      slot.children = PageThumbnail;

      // Reset the sub slot
      if (slot.subSlot) {
        slot.subSlot.attrs = {};
        slot.subSlot.children = <></>;
      }

      return slot;
    },
  };
};

interface PDFViewerProps {
  pdfFile: string;
}

export const ThumbnailViewer: React.FC<PDFViewerProps> = ({ pdfFile }) => {
  const thumbnailPluginInstance = thumbnailPlugin();
  const { Cover } = thumbnailPluginInstance;
  const pageThumbnailPluginInstance = pageThumbnailPlugin({
    PageThumbnail: <Cover getPageIndex={() => 0} />,
  });

  return (
    <div>
      <Worker workerUrl="/assets/pdf.worker.min.js">
        {pdfFile ? (
          <Viewer
            fileUrl={pdfFile}
            transformGetDocumentParams={transformGetDocumentParams}
            plugins={[thumbnailPluginInstance, pageThumbnailPluginInstance]}
          />
        ) : (
          <p>Error displaying thumbnail.</p>
        )}
      </Worker>
    </div>
  );
};
