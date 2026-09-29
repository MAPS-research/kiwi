import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import { CloseOutlined as CloseIcon } from "@mui/icons-material";
import apiClient from "../../utils/api.ts";
import { StandalonePDFViewer } from "./StandalonePDFViewer.tsx";
import { tokens } from "./tokens.ts";

interface PdfPageDialogProps {
  open: boolean;
  onClose: () => void;
  pdfId: string;
  pageNumber: number;
  fileName?: string;
}

/**
 * Opens a class PDF at a given page. Fetches the document content directly by
 * id — no class scanning.
 */
export const PdfPageDialog: React.FC<PdfPageDialogProps> = ({
  open,
  onClose,
  pdfId,
  pageNumber,
  fileName,
}) => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !pdfId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.documentControllerRetrieveDocument({
          chunkRequest: { id: pdfId },
        });
        if (!cancelled) {
          setContent(response.document?.documentContent || "");
        }
      } catch (e) {
        if (!cancelled) setError("Could not load this PDF. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, pdfId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: "82vh",
            borderRadius: 3,
            border: `1px solid ${tokens.line}`,
            boxShadow: "0 24px 64px rgba(26, 21, 35, 0.18)",
          },
        }
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2.5,
          py: 1.5,
          borderBottom: `1px solid ${tokens.line}`,
        }}
      >
        <Typography sx={{ fontWeight: 600, color: tokens.ink, fontSize: 15 }}>
          {fileName || "Document"}
          <Typography
            component="span"
            sx={{ color: tokens.slate, ml: 1, fontSize: 14 }}
          >
            · page {pageNumber}
          </Typography>
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close PDF preview">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <DialogContent sx={{ p: 0, height: "100%", overflow: "hidden" }}>
        {loading && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 1.5,
              flexDirection: "column",
            }}
          >
            <CircularProgress size={32} sx={{ color: tokens.violet }} />
            <Typography sx={{ color: tokens.slate, fontSize: 14 }}>
              Loading page {pageNumber}…
            </Typography>
          </Box>
        )}
        {!loading && error && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
        {!loading && !error && content && (
          <StandalonePDFViewer
            pdfFile={content}
            initialPage={pageNumber}
            onPageChangeCallback={() => {}}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
