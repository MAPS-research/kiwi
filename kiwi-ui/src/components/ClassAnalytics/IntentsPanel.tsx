import React from "react";
import { Box, ButtonBase, Skeleton, Tooltip, Typography } from "@mui/material";
import { IntentSummary } from "../../utils/classAnalyticsApi.ts";
import { numeric, tokens, typeRole } from "./tokens.ts";

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
        border: `1px solid ${tokens.edge}`,
        borderRadius: "var(--radius-sheet)",
        backgroundColor: tokens.paper,
        px: 3,
        pt: 2.25,
        pb: 2.5,
        mb: 2,
      }}
    >
      <Typography sx={{ ...typeRole("group-title"), color: tokens.ink }}>
        Student intent
      </Typography>
      <Typography sx={{ ...typeRole("small"), color: tokens.slate, mt: 0.25, mb: 1.75 }}>
        What students are trying to get from the AI — and the topics inside
        each intent
      </Typography>

      {loading && intents.length === 0 ? (
        <Skeleton height={72} sx={{ transform: "none" }} />
      ) : total === 0 ? (
        <Typography sx={{ ...typeRole("small"), color: tokens.slate }}>
          {generating
            ? "Intent analysis will appear here once processing finishes."
            : "No analyzed questions yet."}
        </Typography>
      ) : (
        <>
          {/* Distribution bar: one series in --chart-1, square ends, 2 px gaps on the plot. */}
          <Box
            sx={{
              display: "flex",
              height: 12,
              overflow: "hidden",
              mb: 2,
              gap: "2px",
            }}
          >
            {intents.map((intent) => {
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
                      backgroundColor: tokens.bar,
                      cursor: "pointer",
                      transition: "opacity var(--motion-micro) var(--motion-ease-toggle)",
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
              const share = Math.round((intent.questionCount / total) * 100);
              return (
                <ButtonBase
                  key={intent.id}
                  onClick={() => onIntentClick(intent)}
                  sx={{
                    border: `1px solid ${tokens.edge}`,
                    borderRadius: "var(--radius-sheet)",
                    px: 1.75,
                    py: 1.25,
                    minWidth: 190,
                    flex: "1 1 190px",
                    maxWidth: 280,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    textAlign: "left",
                    // A tile that opens a detail: the hover fill, no lift and no tint.
                    "&:hover": { backgroundColor: tokens.hover },
                    "&:active": { backgroundColor: "var(--surface-active)" },
                    // Bordered: focus recolours its own edge (one frame), never a ring outside it.
                    "&.Mui-focusVisible, &:focus-visible": {
                      outline: "none",
                      borderColor: "var(--focus-ring)",
                      boxShadow: "inset 0 0 0 1px var(--focus-ring)",
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
                    <Typography
                      sx={{
                        ...typeRole("label"),
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
                        ...typeRole("label"),
                        ...numeric,
                        color: tokens.ink,
                        marginLeft: "auto",
                      }}
                    >
                      {intent.questionCount}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{ ...typeRole("caption"), ...numeric, color: tokens.slate, mt: 0.25 }}
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
                            ...typeRole("caption"),
                            px: 0.75,
                            py: 0.25,
                            borderRadius: "var(--radius-small)",
                            backgroundColor: "var(--chip-role-fill)",
                            color: "var(--chip-role-text)",
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
