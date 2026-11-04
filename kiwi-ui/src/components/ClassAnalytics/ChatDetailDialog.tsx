import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  IconButton,
  Skeleton,
  Typography,
} from "@mui/material";
import {
  CloseOutlined as CloseIcon,
  ExpandLessOutlined as ExpandLessIcon,
  ExpandMoreOutlined as ExpandMoreIcon,
} from "@mui/icons-material";
import {
  ChatAnswer,
  ChatEntry,
  ChatGroup,
  classAnalyticsApi,
} from "../../utils/classAnalyticsApi.ts";
import { numeric, tokens, typeRole } from "./tokens.ts";

const PAGE_SIZE = 30;

interface ExpandedAnswerState {
  loading: boolean;
  answers: ChatAnswer[] | null;
  error: string | null;
}

interface ChatDetailDialogProps {
  open: boolean;
  onClose: () => void;
  classId: string;
  group: ChatGroup | null;
  mode: "student" | "page";
  /** Lecture scope active on the page (undefined = whole class). */
  lectureId?: string;
  lectureNameByPdfId: Map<string, string>;
  onPageClick: (pdfId: string, pdfPage: number) => void;
}

/** Popup with the full chat history of one student or one PDF page. */
export const ChatDetailDialog: React.FC<ChatDetailDialogProps> = ({
  open,
  onClose,
  classId,
  group,
  mode,
  lectureId,
  lectureNameByPdfId,
  onPageClick,
}) => {
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState<Map<string, ExpandedAnswerState>>(
    new Map(),
  );

  const buildFilter = useCallback(
    () => ({
      lectureId: mode === "page" ? group?.pdfId ?? lectureId : lectureId,
      studentKey: mode === "student" ? group?.key : undefined,
      pdfPage: mode === "page" ? group?.pdfPage ?? undefined : undefined,
      order: (mode === "page" ? "asc" : "desc") as "asc" | "desc",
    }),
    [mode, group, lectureId],
  );

  useEffect(() => {
    if (!open || !group) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setExpanded(new Map());
        const response = await classAnalyticsApi.getChats(classId, {
          ...buildFilter(),
          offset: 0,
          limit: PAGE_SIZE,
        });
        if (cancelled) return;
        setChats(response.chats);
        setTotal(response.total);
      } catch {
        if (!cancelled) {
          setChats([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, group, classId, buildFilter]);

  const loadMore = async () => {
    try {
      setLoadingMore(true);
      const response = await classAnalyticsApi.getChats(classId, {
        ...buildFilter(),
        offset: chats.length,
        limit: PAGE_SIZE,
      });
      setChats((prev) => [...prev, ...response.chats]);
      setTotal(response.total);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleAnswer = async (chat: ChatEntry) => {
    if (expanded.get(chat.id)) {
      setExpanded((prev) => {
        const next = new Map(prev);
        next.delete(chat.id);
        return next;
      });
      return;
    }
    setExpanded((prev) =>
      new Map(prev).set(chat.id, { loading: true, answers: null, error: null }),
    );
    try {
      const response = await classAnalyticsApi.getChatAnswer(classId, chat.id);
      setExpanded((prev) =>
        new Map(prev).set(chat.id, {
          loading: false,
          answers: response.answers,
          error: null,
        }),
      );
    } catch (e: any) {
      setExpanded((prev) =>
        new Map(prev).set(chat.id, {
          loading: false,
          answers: null,
          error: e.message || "Could not load the answer",
        }),
      );
    }
  };

  const title =
    mode === "student"
      ? group?.label ?? group?.key ?? ""
      : `${group?.fileName ?? "PDF"} · p.${group?.pdfPage ?? "?"}`;

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
            height: "80vh",
          },
        }
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: `1px solid ${tokens.rule}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
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
          <Typography sx={{ ...typeRole("small"), ...numeric, color: tokens.slate }}>
            {total} {total === 1 ? "question" : "questions"}
            {mode === "student" && lectureId ? " in this lecture" : ""}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close chat details">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ px: 2.5, py: 2 }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={64} sx={{ transform: "none", mb: 1.5 }} />
            ))}
          </Box>
        ) : chats.length === 0 ? (
          <Typography sx={{ px: 2.5, py: 4, ...typeRole("small"), color: tokens.slate }}>
            No questions here.
          </Typography>
        ) : (
          <>
            {chats.map((chat) => {
              const answerState = expanded.get(chat.id);
              return (
                <Box
                  key={chat.id}
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    borderBottom: `1px solid ${tokens.rule}`,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                      mb: 0.5,
                    }}
                  >
                    <Typography
                      sx={{
                        ...typeRole("caption"),
                        fontWeight: "var(--type-weight-emphasis)",
                        color: tokens.ink,
                      }}
                    >
                      {chat.student}
                    </Typography>
                    {chat.pdfId && chat.pdfPage != null && (
                      <Chip
                        label={`${
                          lectureNameByPdfId.get(chat.pdfId) ?? "PDF"
                        } · p.${chat.pdfPage}`}
                        size="small"
                        onClick={() =>
                          onPageClick(chat.pdfId as string, chat.pdfPage as number)
                        }
                        sx={{
                          height: 20,
                          ...typeRole("caption"),
                          ...numeric,
                          maxWidth: 240,
                        }}
                      />
                    )}
                    <Typography sx={{ ...typeRole("caption"), ...numeric, color: tokens.slate }}>
                      {new Date(chat.timestamp).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <Typography
                      sx={{
                        ...typeRole("body"),
                        color: tokens.ink,
                        whiteSpace: "pre-wrap",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {chat.question || "(empty message)"}
                    </Typography>
                    {chat.hasAnswer && (
                      <IconButton
                        size="small"
                        onClick={() => toggleAnswer(chat)}
                        aria-label={
                          answerState ? "Hide AI answer" : "Show AI answer"
                        }
                        sx={{ mt: -0.5 }}
                      >
                        {answerState ? (
                          <ExpandLessIcon fontSize="small" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" />
                        )}
                      </IconButton>
                    )}
                  </Box>

                  <Collapse in={!!answerState} unmountOnExit>
                    {/* Kiwi's stored answer, set off by the ruler's neutral 1 px rule. */}
                    <Box
                      sx={{
                        mt: 1,
                        pl: 1.5,
                        borderLeft: "1px solid var(--border-strong)",
                      }}
                    >
                      {answerState?.loading && (
                        <CircularProgress size={16} sx={{ my: 1 }} />
                      )}
                      {answerState?.error && (
                        <Typography sx={{ ...typeRole("small"), color: tokens.error }}>
                          {answerState.error}
                        </Typography>
                      )}
                      {answerState?.answers?.map((answer, i) => (
                        <Box key={i} sx={{ mb: 1 }}>
                          <Typography
                            sx={{
                              ...typeRole("caption"),
                              fontWeight: "var(--type-weight-emphasis)",
                              color: tokens.slate,
                              mb: 0.25,
                            }}
                          >
                            AI answer{answer.engine ? ` · ${answer.engine}` : ""}
                          </Typography>
                          <Typography
                            sx={{
                              ...typeRole("body"),
                              color: tokens.slate,
                              whiteSpace: "pre-wrap",
                              maxHeight: 320,
                              overflowY: "auto",
                            }}
                          >
                            {answer.content}
                          </Typography>
                        </Box>
                      ))}
                      {answerState &&
                        !answerState.loading &&
                        !answerState.error &&
                        (answerState.answers?.length ?? 0) === 0 && (
                          <Typography sx={{ ...typeRole("small"), color: tokens.slate }}>
                            No stored answer for this question.
                          </Typography>
                        )}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}

            {chats.length < total && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
                <Button
                  size="small"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? "Loading…"
                    : `Load more (${chats.length} of ${total})`}
                </Button>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
