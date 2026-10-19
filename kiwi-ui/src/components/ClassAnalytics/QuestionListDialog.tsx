import React, { useEffect, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import { CloseOutlined as CloseIcon } from "@mui/icons-material";
import { TopicQuestion } from "../../utils/classAnalyticsApi.ts";
import { numeric, tokens, typeRole } from "./tokens.ts";

interface QuestionListDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** The key square before the title; the intent and topic bars' one series colour by default. */
  accentColor?: string;
  fetchQuestions: (() => Promise<TopicQuestion[]>) | null;
  lectureNameByPdfId: Map<string, string>;
  onPageClick: (pdfId: string, pdfPage: number) => void;
}

/** Popup listing the questions behind a topic or an intent. */
export const QuestionListDialog: React.FC<QuestionListDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  accentColor = tokens.bar,
  fetchQuestions,
  lectureNameByPdfId,
  onPageClick,
}) => {
  const [questions, setQuestions] = useState<TopicQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !fetchQuestions) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchQuestions();
        if (!cancelled) setQuestions(result);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Could not load questions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fetchQuestions]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      // The theme draws the dialog sheet: hairline edge, sheet radius, --shadow-2.
      slotProps={{
        paper: {
          sx: {
            maxHeight: "80vh",
          },
        }
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: `1px solid ${tokens.rule}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* A legend key: square, like the bars it keys. */}
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: 0,
                backgroundColor: accentColor,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                ...typeRole("group-title"),
                color: tokens.ink,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </Typography>
          </Box>
          <Typography sx={{ ...typeRole("small"), ...numeric, color: tokens.slate, mt: 0.25 }}>
            {subtitle ??
              `${questions.length} ${questions.length === 1 ? "question" : "questions"}`}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close question list">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {!loading && error && (
          <Typography sx={{ p: 3, color: tokens.error, ...typeRole("small") }}>
            {error}
          </Typography>
        )}
        {!loading &&
          !error &&
          questions.map((q) => (
            <Box
              key={q.id}
              sx={{
                px: 3,
                py: 1.75,
                borderBottom: `1px solid ${tokens.rule}`,
                "&:last-child": { borderBottom: "none" },
                "&:hover": { backgroundColor: tokens.hover },
              }}
            >
              <Typography
                sx={{ ...typeRole("body"), color: tokens.ink, whiteSpace: "pre-wrap" }}
              >
                {q.question}
              </Typography>
              <Box
                sx={{
                  mt: 0.75,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  sx={{ ...typeRole("caption"), color: tokens.slate, fontWeight: "var(--type-weight-emphasis)" }}
                >
                  {q.student}
                </Typography>
                {q.pdfId && q.pdfPage != null && (
                  <Chip
                    label={`${
                      lectureNameByPdfId.get(q.pdfId) ?? "PDF"
                    } · p.${q.pdfPage}`}
                    size="small"
                    onClick={() =>
                      onPageClick(q.pdfId as string, q.pdfPage as number)
                    }
                    sx={{
                      height: 20,
                      ...typeRole("caption"),
                      ...numeric,
                      maxWidth: 260,
                    }}
                  />
                )}
                <Typography sx={{ ...typeRole("caption"), ...numeric, color: tokens.slate }}>
                  {new Date(q.timestamp).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        {!loading && !error && questions.length === 0 && (
          <Typography sx={{ p: 3, color: tokens.slate, ...typeRole("small") }}>
            No questions here.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};
