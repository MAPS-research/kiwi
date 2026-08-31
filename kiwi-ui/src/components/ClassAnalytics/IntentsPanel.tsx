import React from "react";
import { Box, ButtonBase, Skeleton, Tooltip, Typography } from "@mui/material";
import { IntentSummary } from "../../utils/classAnalyticsApi.ts";
import { intentStyleOf, mono, tokens } from "./tokens.ts";

interface IntentsPanelProps {
  intents: IntentSummary[];
  loading: boolean;
  generating: boolean;
  onIntentClick: (intent: IntentSummary) => void;
}

/**
 * "Why do students come to the AI" — intent distribution as a single stacked
 * bar, with one card per intent showing its share and the key topics inside.
 */
export const IntentsPanel: React.FC<IntentsPanelProps> = ({
  intents,
  loading,
  generating,
  onIntentClick,
}) => {
  const total = intents.reduce((sum, i) => sum + i.questionCount, 0);

  return (
    <Box
      sx={{
        border: `1px solid ${tokens.line}`,
        borderRadius: 3,
        backgroundColor: tokens.paper,
        px: 3,
        pt: 2.25,
        pb: 2.5,
        mb: 2,
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: tokens.slate,
          textTransform: "uppercase",
        }}
      >
        Student intent
      </Typography>
      <Typography sx={{ fontSize: 13, color: tokens.faint, mt: 0.25, mb: 1.75 }}>
        What students are trying to get from the AI — and the topics inside
        each intent
      </Typography>

      {loading && intents.length === 0 ? (
        <Skeleton height={72} sx={{ transform: "none" }} />
      ) : total === 0 ? (
        <Typography sx={{ fontSize: 14, color: tokens.slate }}>
          {generating
            ? "Intent analysis will appear here once processing finishes."
            : "No analyzed questions yet."}
        </Typography>
      ) : (
        <>
          {/* Stacked distribution bar */}
          <Box
            sx={{
              display: "flex",
              height: 12,
              borderRadius: 6,
              overflow: "hidden",
              mb: 2,
              gap: "2px",
            }}
          >
            {intents.map((intent) => {
              const style = intentStyleOf(intent.id);
              const share = (intent.questionCount / total) * 100;
              return (
                <Tooltip
                  key={intent.id}
                  title={`${intent.label} · ${intent.questionCount} (${Math.round(share)}%)`}
                  arrow
                >
                  <Box
                    sx={{
                      width: `${share}%`,
                      minWidth: 6,
                      backgroundColor: style.color,
                      cursor: "pointer",
                      transition: "opacity 120ms ease",
                      "&:hover": { opacity: 0.8 },
                    }}
                    onClick={() => onIntentClick(intent)}
                  />
                </Tooltip>
              );
            })}
          </Box>

          {/* Intent cards */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
            {intents.map((intent) => {
              const style = intentStyleOf(intent.id);
              const share = Math.round((intent.questionCount / total) * 100);
              return (
                <ButtonBase
                  key={intent.id}
                  onClick={() => onIntentClick(intent)}
                  sx={{
                    border: `1px solid ${tokens.line}`,
                    borderRadius: 2.5,
                    px: 1.75,
                    py: 1.25,
                    minWidth: 190,
                    flex: "1 1 190px",
                    maxWidth: 280,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    textAlign: "left",
                    transition:
                      "border-color 130ms ease, box-shadow 130ms ease",
                    "&:hover": {
                      borderColor: style.color,
                      boxShadow: `0 2px 12px ${style.soft}`,
                      backgroundColor: style.soft,
                    },
                    "&.Mui-focusVisible": {
                      outline: `2px solid ${style.color}`,
                      outlineOffset: 1,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      width: "100%",
                    }}
                  >
                    <Box
                      sx={{
                        width: 9,
                        height: 9,
                        borderRadius: "3px",
                        backgroundColor: style.color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: tokens.ink,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {intent.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: mono,
                        fontSize: 13,
                        fontWeight: 600,
                        color: style.color,
                        marginLeft: "auto",
                      }}
                    >
                      {intent.questionCount}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{ fontSize: 11.5, color: tokens.faint, mt: 0.25 }}
                  >
                    {share}% of questions · {intent.studentCount}{" "}
                    {intent.studentCount === 1 ? "student" : "students"}
                  </Typography>
                  {intent.topTopics.length > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        mt: 0.75,
                        flexWrap: "wrap",
                      }}
                    >
                      {intent.topTopics.map((topic) => (
                        <Box
                          key={topic.id}
                          component="span"
                          sx={{
                            fontSize: 11,
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 1,
                            backgroundColor: style.soft,
                            color: style.color,
                            fontWeight: 600,
                            maxWidth: 150,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {topic.label} ×{topic.count}
                        </Box>
                      ))}
                    </Box>
                  )}
                </ButtonBase>
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
};
