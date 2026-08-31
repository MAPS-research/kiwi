import React from "react";
import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import { RefreshOutlined as RefreshIcon } from "@mui/icons-material";
import { TopicsResponse, TopicSummary } from "../../utils/classAnalyticsApi.ts";
import { mono, tokens } from "./tokens.ts";

interface TopicsPanelProps {
  topics: TopicsResponse | null;
  loading: boolean;
  onTopicClick: (topic: TopicSummary) => void;
  onPageClick: (pdfId: string, pdfPage: number) => void;
  onRefresh: () => void;
  lectureName?: string;
}

const panelSx = {
  border: `1px solid ${tokens.line}`,
  borderRadius: 3,
  backgroundColor: tokens.paper,
  display: "flex",
  flexDirection: "column" as const,
  minHeight: 420,
  overflow: "hidden",
};

export const TopicsPanel: React.FC<TopicsPanelProps> = ({
  topics,
  loading,
  onTopicClick,
  onPageClick,
  onRefresh,
  lectureName,
}) => {
  const list = topics?.topics ?? [];
  const maxCount = Math.max(...list.map((t) => t.questionCount), 1);
  const generating = topics?.generating ?? false;

  return (
    <Box sx={panelSx}>
      <Box
        sx={{
          px: 2.5,
          pt: 2,
          pb: 1.5,
          borderBottom: `1px solid ${tokens.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: tokens.slate,
              textTransform: "uppercase",
            }}
          >
            Topics
          </Typography>
          <Typography sx={{ fontSize: 13, color: tokens.faint, mt: 0.25 }}>
            {lectureName
              ? `What students ask about in ${lectureName}`
              : "What students ask about across the class"}
          </Typography>
        </Box>
        <Tooltip title="Re-analyze all questions">
          <span>
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={generating}
              aria-label="Re-analyze topics"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {generating && (
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${tokens.line}` }}>
          <Typography sx={{ fontSize: 13, color: tokens.amber, mb: 0.75 }}>
            Analyzing student questions… this usually takes under a minute.
          </Typography>
          <LinearProgress
            sx={{
              height: 3,
              borderRadius: 2,
              backgroundColor: tokens.violetTrack,
              "& .MuiLinearProgress-bar": { backgroundColor: tokens.violet },
            }}
          />
        </Box>
      )}

      {topics?.error && !generating && (
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${tokens.line}` }}>
          <Typography sx={{ fontSize: 13, color: tokens.red }}>
            Topic analysis failed: {topics.error}. Use the refresh button to
            retry.
          </Typography>
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: "auto", py: 1 }}>
        {loading && !topics ? (
          <Box sx={{ px: 2.5, py: 1 }}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height={42} sx={{ transform: "none", mb: 1 }} />
            ))}
          </Box>
        ) : list.length === 0 ? (
          <Box sx={{ px: 2.5, py: 4, textAlign: "center" }}>
            <Typography sx={{ fontSize: 14, color: tokens.slate }}>
              {generating
                ? "Topics will appear here once analysis finishes."
                : "No topics yet — they appear once students start asking questions."}
            </Typography>
          </Box>
        ) : (
          list.map((topic) => (
            <Box
              key={topic.id}
              onClick={() => onTopicClick(topic)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onTopicClick(topic);
              }}
              sx={{
                px: 2.5,
                py: 1.25,
                cursor: "pointer",
                outlineColor: tokens.violet,
                "&:hover": { backgroundColor: tokens.violetSoft },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: tokens.ink,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {topic.label}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: mono,
                    fontSize: 13,
                    color: tokens.violet,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {topic.questionCount}
                </Typography>
              </Box>

              {/* Proportional frequency bar */}
              <Box
                sx={{
                  mt: 0.75,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: tokens.violetTrack,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    width: `${(topic.questionCount / maxCount) * 100}%`,
                    height: "100%",
                    borderRadius: 2,
                    backgroundColor: tokens.violet,
                  }}
                />
              </Box>

              <Box
                sx={{
                  mt: 0.75,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  flexWrap: "wrap",
                }}
              >
                <Typography sx={{ fontSize: 12, color: tokens.faint }}>
                  {topic.studentCount}{" "}
                  {topic.studentCount === 1 ? "student" : "students"}
                </Typography>
                {topic.topPages.slice(0, 4).map((page) => (
                  <Chip
                    key={`${page.pdfId}:${page.pdfPage}`}
                    label={`p.${page.pdfPage} ×${page.count}`}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPageClick(page.pdfId, page.pdfPage);
                    }}
                    sx={{
                      height: 20,
                      fontSize: 11,
                      fontFamily: mono,
                      backgroundColor: tokens.violetTrack,
                      color: tokens.violetInk,
                      "&:hover": { backgroundColor: tokens.violetSoft },
                    }}
                  />
                ))}
              </Box>
            </Box>
          ))
        )}
      </Box>

      {topics?.updatedAt && (
        <Box
          sx={{
            px: 2.5,
            py: 1,
            borderTop: `1px solid ${tokens.line}`,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography sx={{ fontSize: 12, color: tokens.faint }}>
            {list.length} topics · {topics.questionCount} questions analyzed
          </Typography>
          <Typography sx={{ fontSize: 12, color: tokens.faint }}>
            Updated {new Date(topics.updatedAt).toLocaleString()}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
