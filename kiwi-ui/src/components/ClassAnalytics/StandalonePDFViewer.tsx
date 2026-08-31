import React, { useEffect, useState } from "react";
import {
    Worker,
    Viewer,
    PageChangeEvent
} from "@react-pdf-viewer/core";
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { toolbarPlugin, ToolbarSlot } from "@react-pdf-viewer/toolbar";
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/toolbar/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";
import {
    Box,
    IconButton,
    Stack,
    useTheme
} from "@mui/material";
import { ZoomOutOutlined as ZoomOutIcon, ZoomInOutlined as ZoomInIcon } from "@mui/icons-material";
import { transformGetDocumentParams, renderPdfError } from "../PDFViewer/pdfLoadOptions.tsx";

interface StandalonePDFViewerProps {
    pdfFile: string;
    initialPage?: number;
    onPageChangeCallback?: (e: PageChangeEvent) => void;
}

export const StandalonePDFViewer: React.FC<StandalonePDFViewerProps> = ({
    pdfFile,
    initialPage = 1,
    onPageChangeCallback
}) => {
    const theme = useTheme();
    const viewerTheme = theme.palette.mode === "dark" ? "dark" : "light";

    // Initialize plugins
    const pageNavigationPluginInstance = pageNavigationPlugin();
    const { jumpToPage } = pageNavigationPluginInstance;
    const toolbarPluginInstance = toolbarPlugin();
    const { Toolbar } = toolbarPluginInstance;
    const zoomPluginInstance = zoomPlugin();

    const [isDocumentLoaded, setIsDocumentLoaded] = useState(false);
    // Bump this to force the Viewer to remount and re-attempt loading the PDF.
    const [reloadKey, setReloadKey] = useState(0);

    // Jump to initial page when document is loaded
    useEffect(() => {
        if (isDocumentLoaded && initialPage && initialPage > 1) {
            const timer = setTimeout(() => {
                jumpToPage(initialPage - 1);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isDocumentLoaded, initialPage, jumpToPage]);

    const handleDocumentLoad = () => {
        setIsDocumentLoaded(true);
    };

    const handlePageChange = (e: PageChangeEvent) => {
        if (onPageChangeCallback) {
            onPageChangeCallback(e);
        }
    };

    if (!pdfFile) {
        return null;
    }

    return (
        <Worker workerUrl="/assets/pdf.worker.min.js">
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    width: '100%'
                }}
            >
                {/* Main content area */}
                <Box
                    sx={{
                        display: "flex",
                        height: "100%",
                        width: "100%"
                    }}
                >
                    {/* PDF Viewer area */}
                    <Box sx={{ flexGrow: 1, position: "relative", height: "100%" }}>
                        <Viewer
                            key={reloadKey}
                            theme={viewerTheme}
                            fileUrl={pdfFile}
                            transformGetDocumentParams={transformGetDocumentParams}
                            renderError={renderPdfError(() => setReloadKey((k) => k + 1))}
                            onDocumentLoad={handleDocumentLoad}
                            onPageChange={handlePageChange}
                            plugins={[
                                pageNavigationPluginInstance,
                                toolbarPluginInstance,
                                zoomPluginInstance,
                            ]}
                        />
                    </Box>

                    {/* Vertical toolbar on the right */}
                    <Box
                        sx={{
                            width: "50px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                            py: 2,
                            backgroundColor: "rgba(0,0,0,0.05)",
                        }}
                    >
                        <Toolbar>
                            {(props: ToolbarSlot) => {
                                const {
                                    ZoomOut,
                                    ZoomIn,
                                    GoToFirstPage,
                                    GoToPreviousPage,
                                    GoToNextPage,
                                    GoToLastPage
                                } = props;

                                return (
                                    <Stack direction="column" alignItems="center" spacing={1}>
                                        {/* Page Navigation */}
                                        <GoToFirstPage>
                                            {(goToFirstPageProps) => (
                                                <IconButton
                                                    onClick={goToFirstPageProps.onClick}
                                                    size="small"
                                                    title="First Page"
                                                    sx={{
                                                        cursor: "pointer",
                                                        '&:disabled': { opacity: 0.5 }
                                                    }}
                                                    disabled={goToFirstPageProps.isDisabled}
                                                >
                                                    ⏮️
                                                </IconButton>
                                            )}
                                        </GoToFirstPage>

                                        <GoToPreviousPage>
                                            {(goToPrevPageProps) => (
                                                <IconButton
                                                    onClick={goToPrevPageProps.onClick}
                                                    size="small"
                                                    title="Previous Page"
                                                    sx={{
                                                        cursor: "pointer",
                                                        '&:disabled': { opacity: 0.5 }
                                                    }}
                                                    disabled={goToPrevPageProps.isDisabled}
                                                >
                                                    ⏪
                                                </IconButton>
                                            )}
                                        </GoToPreviousPage>

                                        {/* Current page indicator will be shown by the viewer */}

                                        <GoToNextPage>
                                            {(goToNextPageProps) => (
                                                <IconButton
                                                    onClick={goToNextPageProps.onClick}
                                                    size="small"
                                                    title="Next Page"
                                                    sx={{
                                                        cursor: "pointer",
                                                        '&:disabled': { opacity: 0.5 }
                                                    }}
                                                    disabled={goToNextPageProps.isDisabled}
                                                >
                                                    ⏩
                                                </IconButton>
                                            )}
                                        </GoToNextPage>

                                        <GoToLastPage>
                                            {(goToLastPageProps) => (
                                                <IconButton
                                                    onClick={goToLastPageProps.onClick}
                                                    size="small"
                                                    title="Last Page"
                                                    sx={{
                                                        cursor: "pointer",
                                                        '&:disabled': { opacity: 0.5 }
                                                    }}
                                                    disabled={goToLastPageProps.isDisabled}
                                                >
                                                    ⏭️
                                                </IconButton>
                                            )}
                                        </GoToLastPage>

                                        {/* Divider */}
                                        <Box sx={{ height: "1px", width: "30px", backgroundColor: "#ccc", my: 1 }} />

                                        {/* Zoom Controls */}
                                        <ZoomIn>
                                            {(zoomInProps) => (
                                                <IconButton
                                                    onClick={zoomInProps.onClick}
                                                    size="small"
                                                    title="Zoom In"
                                                    sx={{ cursor: "pointer" }}
                                                >
                                                    <ZoomInIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </ZoomIn>

                                        <ZoomOut>
                                            {(zoomOutProps) => (
                                                <IconButton
                                                    onClick={zoomOutProps.onClick}
                                                    size="small"
                                                    title="Zoom Out"
                                                    sx={{ cursor: "pointer" }}
                                                >
                                                    <ZoomOutIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </ZoomOut>
                                    </Stack>
                                );
                            }}
                        </Toolbar>
                    </Box>
                </Box>
            </Box>
        </Worker>
    );
};
