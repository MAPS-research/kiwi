import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  FormControl,
  Grid,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  ChatBubbleOutlined as ChatIcon,
  MenuBookOutlined as MenuBookIcon,
  GroupOutlined as PeopleIcon,
  SellOutlined as TopicIcon,
} from "@mui/icons-material";
import { useParams } from "react-router-dom";
import {
  ClassOverview,
  classAnalyticsApi,
  IntentSummary,
  LectureStats,
  TopicsResponse,
  TopicSummary,
} from "../../utils/classAnalyticsApi.ts";
import { ChatBrowser } from "./ChatBrowser.tsx";
import { IntentsPanel } from "./IntentsPanel.tsx";
import { PdfPageDialog } from "./PdfPageDialog.tsx";
import { QuestionListDialog } from "./QuestionListDialog.tsx";
import { TopicsPanel } from "./TopicsPanel.tsx";
import { intentStyleOf, mono, tokens } from "./tokens.ts";
import { AdminPage, AdminPageHeader } from "../AdminPage/index.ts";

const POLL_INTERVAL_MS = 3000;

const OverviewMetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  loading?: boolean;
}> = ({ label, value, icon, loading = false }) => (
  <Paper
    variant="outlined"
    sx={{ p: 2.5, height: 104, boxSizing: "border-box", borderRadius: 2 }}
  >
    <Stack
      direction="row"
      spacing={2}
      sx={{
        justifyContent: "space-between",
        height: "100%"
      }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          noWrap
          sx={{
            color: "text.secondary",
            height: 20,
            lineHeight: "20px"
          }}>
          {label}
        </Typography>
        <Box sx={{ height: 44, display: "flex", alignItems: "center" }}>
          {loading ? (
            <Skeleton variant="text" width={96} height={44} />
          ) : (
            <Typography
              variant="h4"
              noWrap
              title={String(value)}
              sx={{
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontWeight: 600,
                lineHeight: "44px",
                letterSpacing: "-0.02em",
              }}
            >
              {value}
            </Typography>
          )}
        </Box>
      </Box>
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 40,
          height: 40,
          color: "primary.main",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
    </Stack>
  </Paper>
);

export const ClassAnalytics: React.FC = () => {
  const { classID } = useParams<{ classID: string }>();
  const classId = classID ?? "";

  const [overview, setOverview] = useState<ClassOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [topics, setTopics] = useState<TopicsResponse | null>(null);
  const [topicsLoading, setTopicsLoading] = useState(true);

  // null = whole class; otherwise a lecture (pdf) drill-down
  const [scopeLecture, setScopeLecture] = useState<LectureStats | null>(null);

  const [openTopic, setOpenTopic] = useState<TopicSummary | null>(null);
  const [openIntent, setOpenIntent] = useState<IntentSummary | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{
    pdfId: string;
    page: number;
  } | null>(null);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const lectureNameByPdfId = useMemo(
    () => new Map((overview?.lectures ?? []).map((l) => [l.pdfId, l.fileName])),
    [overview],
  );

  // Stable fetchers so the question dialog doesn't refetch on unrelated renders
  const topicQuestionsFetcher = useMemo(
    () =>
      openTopic
        ? () =>
            classAnalyticsApi
              .getTopicQuestions(classId, openTopic.id, scopeLecture?.pdfId)
              .then((r) => r.questions)
        : null,
    [openTopic, classId, scopeLecture],
  );
  const intentQuestionsFetcher = useMemo(
    () =>
      openIntent
        ? () =>
            classAnalyticsApi
              .getIntentQuestions(classId, openIntent.id, scopeLecture?.pdfId)
              .then((r) => r.questions)
        : null,
    [openIntent, classId, scopeLecture],
  );

  const loadOverview = useCallback(async () => {
    if (!classId) return;
    try {
      setOverviewLoading(true);
      setOverviewError(null);
      const data = await classAnalyticsApi.getOverview(classId);
      setOverview(data);
    } catch (e: any) {
      setOverviewError(e.message || "Could not load analytics");
    } finally {
      setOverviewLoading(false);
    }
  }, [classId]);

  const loadTopics = useCallback(
    async (lectureId?: string) => {
      if (!classId) return;
      try {
        setTopicsLoading(true);
        const data = await classAnalyticsApi.getTopics(classId, lectureId);
        setTopics(data);
      } catch {
        // keep previous topics on transient failures
      } finally {
        setTopicsLoading(false);
      }
    },
    [classId],
  );

  // Initial load
  useEffect(() => {
    loadOverview();
  }, [classId, loadOverview]);

  // (Re)load topics when the lecture scope changes
  useEffect(() => {
    loadTopics(scopeLecture?.pdfId);
  }, [loadTopics, scopeLecture]);

  // Poll while the backend is generating topics, then pick up the result
  useEffect(() => {
    if (!topics?.generating || !classId) return;
    pollTimer.current = setInterval(async () => {
      try {
        const status = await classAnalyticsApi.getTopicsStatus(classId);
        if (status.status === "completed" || status.status === "failed") {
          if (pollTimer.current) clearInterval(pollTimer.current);
          loadTopics(scopeLecture?.pdfId);
        }
      } catch {
        // keep polling
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [topics?.generating, classId, loadTopics, scopeLecture]);

  const handleManualRefresh = async () => {
    if (!classId) return;
    try {
      await classAnalyticsApi.refreshTopics(classId);
      setTopics((prev) =>
        prev ? { ...prev, generating: true, status: "processing" } : prev,
      );
      loadTopics(scopeLecture?.pdfId);
    } catch {
      // surfaced by the panel's error state on next load
    }
  };

  const handlePageClick = (pdfId: string, page: number) => {
    setPdfPreview({ pdfId, page });
  };

  if (!classId) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography sx={{ color: tokens.slate }}>
          Open analytics from a class page to see its data.
        </Typography>
      </Box>
    );
  }

  const scopedQuestionCount = scopeLecture
    ? scopeLecture.questionCount
    : overview?.totalQuestions ?? 0;
  const scopedStudentCount = scopeLecture
    ? scopeLecture.studentCount
    : overview?.activeStudents ?? 0;
  const activeLectures =
    overview?.lectures.filter((l) => l.questionCount > 0).length ?? 0;

  return (
    <AdminPage>
      <AdminPageHeader
        title="Class Analytics"
        description="Review class activity and engagement."
        actions={
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
          <FormControl size="small">
            <Select
              value={scopeLecture?.pdfId ?? "all"}
              onChange={(event) => {
                const value = event.target.value;
                setScopeLecture(
                  value === "all"
                    ? null
                    : (overview?.lectures.find((l) => l.pdfId === value) ??
                        null),
                );
              }}
              renderValue={(value) => (
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
                >
                  <MenuBookIcon
                    sx={{ fontSize: 17, color: tokens.violet, flexShrink: 0 }}
                  />
                  <Box
                    component="span"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                    }}
                  >
                    {value === "all"
                      ? "All lectures"
                      : (lectureNameByPdfId.get(value as string) ?? "Lecture")}
                  </Box>
                </Box>
              )}
              sx={{
                minWidth: 250,
                maxWidth: 380,
                borderRadius: 2.5,
                backgroundColor: tokens.paper,
                fontSize: 13.5,
                color: tokens.ink,
                boxShadow: "0 1px 2px rgba(26, 21, 35, 0.05)",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: tokens.line,
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: tokens.violetTrack,
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: tokens.violet,
                  borderWidth: 1,
                },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      mt: 0.5,
                      maxHeight: 380,
                      borderRadius: 2.5,
                      border: `1px solid ${tokens.line}`,
                      boxShadow: "0 12px 32px rgba(26, 21, 35, 0.12)",
                      "& .MuiMenuItem-root": {
                        fontSize: 13.5,
                        borderRadius: 1.5,
                        mx: 0.75,
                        my: 0.25,
                        "&:hover": { backgroundColor: tokens.hover },
                        "&.Mui-selected": {
                          backgroundColor: tokens.violetSoft,
                          "&:hover": { backgroundColor: tokens.violetTrack },
                        },
                      },
                    },
                  },
                },
              }}
            >
              <MenuItem value="all" sx={{ fontWeight: 600 }}>
                All lectures
              </MenuItem>
              {(overview?.lectures ?? []).map((lecture) => (
                <MenuItem
                  key={lecture.pdfId}
                  value={lecture.pdfId}
                  sx={{ gap: 1 }}
                >
                  <Box
                    component="span"
                    sx={{
                      maxWidth: 300,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lecture.fileName}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      fontFamily: mono,
                      fontSize: 12,
                      fontWeight: 600,
                      color:
                        lecture.questionCount > 0 ? tokens.violet : tokens.faint,
                      marginLeft: "auto",
                      backgroundColor:
                        lecture.questionCount > 0
                          ? tokens.violetSoft
                          : tokens.graySoft,
                      borderRadius: 1,
                      px: 0.75,
                      py: 0.1,
                    }}
                  >
                    {lecture.questionCount}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {topics?.updatedAt && !topics.generating && (
            <Typography sx={{ fontSize: 12, color: tokens.faint }}>
            Topics updated {new Date(topics.updatedAt).toLocaleString()}
            {topics.pendingNewQuestions > 0 &&
              ` · ${topics.pendingNewQuestions} new questions pending`}
            </Typography>
          )}
          </Box>
        }
      />

      {overviewError ? (
        <Box
          sx={{
            border: `1px solid ${tokens.line}`,
            borderRadius: 3,
            backgroundColor: tokens.paper,
            p: 4,
            textAlign: "center",
          }}
        >
          <Typography sx={{ color: tokens.red, fontSize: 14, mb: 1 }}>
            {overviewError}
          </Typography>
          <Typography
            component="button"
            onClick={loadOverview}
            sx={{
              color: tokens.violet,
              fontSize: 14,
              fontWeight: 600,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </Typography>
        </Box>
      ) : (
        <>
          <Typography
            component="h2"
            variant="h6"
            sx={{ mb: 2, fontWeight: 600 }}
          >
            Overview
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <OverviewMetricCard
                label="Questions"
                value={scopedQuestionCount.toLocaleString()}
                icon={<ChatIcon />}
                loading={overviewLoading && !overview}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <OverviewMetricCard
                label="Active students"
                value={scopedStudentCount.toLocaleString()}
                icon={<PeopleIcon />}
                loading={overviewLoading && !overview}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <OverviewMetricCard
                label="Topics"
                value={(topics?.topics.length ?? 0).toLocaleString()}
                icon={<TopicIcon />}
                loading={topicsLoading && !topics}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <OverviewMetricCard
                label={scopeLecture ? "Last activity" : "Active lectures"}
                value={
                  scopeLecture
                    ? scopeLecture.lastActivity
                      ? new Date(scopeLecture.lastActivity).toLocaleDateString()
                      : "—"
                    : `${activeLectures}/${overview?.lectureCount ?? 0}`
                }
                icon={<MenuBookIcon />}
                loading={overviewLoading && !overview}
              />
            </Grid>
          </Grid>

          {/* Intent analysis */}
          <IntentsPanel
            intents={topics?.intents ?? []}
            loading={topicsLoading && !topics}
            generating={topics?.generating ?? false}
            onIntentClick={setOpenIntent}
          />

          {/* Main panels */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "5fr 7fr" },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            <TopicsPanel
              topics={topics}
              loading={topicsLoading}
              onTopicClick={setOpenTopic}
              onPageClick={handlePageClick}
              onRefresh={handleManualRefresh}
              lectureName={scopeLecture?.fileName}
            />
            <ChatBrowser
              classId={classId}
              lectureId={scopeLecture?.pdfId}
              lectureNameByPdfId={lectureNameByPdfId}
              onPageClick={handlePageClick}
            />
          </Box>
        </>
      )}

      {/* Dialogs */}
      <QuestionListDialog
        open={!!openTopic}
        onClose={() => setOpenTopic(null)}
        title={openTopic?.label ?? ""}
        fetchQuestions={topicQuestionsFetcher}
        lectureNameByPdfId={lectureNameByPdfId}
        onPageClick={handlePageClick}
      />
      <QuestionListDialog
        open={!!openIntent}
        onClose={() => setOpenIntent(null)}
        title={openIntent?.label ?? ""}
        subtitle={
          openIntent
            ? `${openIntent.questionCount} questions from ${openIntent.studentCount} ${
                openIntent.studentCount === 1 ? "student" : "students"
              }${scopeLecture ? " in this lecture" : ""}`
            : undefined
        }
        accentColor={openIntent ? intentStyleOf(openIntent.id).color : undefined}
        fetchQuestions={intentQuestionsFetcher}
        lectureNameByPdfId={lectureNameByPdfId}
        onPageClick={handlePageClick}
      />
      <PdfPageDialog
        open={!!pdfPreview}
        onClose={() => setPdfPreview(null)}
        pdfId={pdfPreview?.pdfId ?? ""}
        pageNumber={pdfPreview?.page ?? 1}
        fileName={
          pdfPreview ? lectureNameByPdfId.get(pdfPreview.pdfId) : undefined
        }
      />
    </AdminPage>
  );
};
