// components/AuthLayout/LearningToolScenes.tsx
import React from "react";
import { Box, Typography } from "@mui/material";
import { PlayArrowOutlined } from "@mui/icons-material";

/*
 * Small pictures of each learning tool for the sign-in gallery. They are drawn
 * with type, hairlines and the system's own tokens (no images), follow one
 * running example (a lecture on binary search) and are decorative: the gallery
 * hides them from assistive technology, and the slide's name and description
 * say the same thing in words.
 */

const sheet = {
  bgcolor: "background.paper",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-control)",
  p: "var(--space-3)",
} as const;

const tabular = { fontVariantNumeric: "tabular-nums" } as const;

/** A label and its text on one row, the label in the secondary ink. */
const Row: React.FC<{ label: string; children: React.ReactNode; strong?: boolean }> = ({
  label,
  children,
  strong = false,
}) => (
  <>
    <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
      {label}
    </Typography>
    <Typography component="span" variant="body2" sx={{ fontWeight: strong ? 600 : 400 }}>
      {children}
    </Typography>
  </>
);

/** A 1 px track with the played or chosen run and a round thumb at `at` percent. */
const Track: React.FC<{ at: number }> = ({ at }) => (
  <Box sx={{ position: "relative", flex: "1 1 auto", height: 12 }}>
    <Box sx={{ position: "absolute", insetInline: 0, top: 6, height: "1px", bgcolor: "var(--border-strong)" }} />
    <Box sx={{ position: "absolute", left: 0, width: `${at}%`, top: 5, height: 2, bgcolor: "var(--text-secondary)" }} />
    <Box
      sx={{
        position: "absolute",
        left: `${at}%`,
        top: 0,
        width: 12,
        height: 12,
        ml: "-6px",
        boxSizing: "border-box",
        borderRadius: "50%",
        bgcolor: "background.paper",
        border: "1px solid var(--border-interactive)",
      }}
    />
  </Box>
);

export const MaterialsScene: React.FC = () => (
  <Box sx={{ width: "100%", maxWidth: 340 }}>
    <Box sx={{ ...sheet, py: "var(--space-2)" }}>
      <Typography component="p" variant="caption" sx={{ color: "text.secondary" }}>
        Lecture 4, page 12
      </Typography>
      <Typography component="p" variant="subtitle2" sx={{ mt: "var(--space-1)" }}>
        Binary search
      </Typography>
    </Box>
    {/* The chat beside the page, on its own ruler. */}
    <Box
      className="kiwi-ruled"
      sx={{
        mt: "var(--space-2)",
        pl: "var(--space-3)",
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        alignItems: "baseline",
        columnGap: "var(--space-3)",
        rowGap: "var(--space-1)",
      }}
    >
      <Row label="You">Why keep only one half?</Row>
      <Row label="Kiwi">The target can't be in the other one.</Row>
    </Box>
  </Box>
);

export const FlashcardScene: React.FC = () => (
  <Box sx={{ position: "relative", width: "100%", maxWidth: 300, pr: "6px", pb: "6px", boxSizing: "border-box" }}>
    {/* The next card of the deck, showing at the edge. */}
    <Box sx={{ ...sheet, position: "absolute", inset: "6px 0 0 6px" }} />
    <Box sx={{ ...sheet, position: "relative", p: "var(--space-4)" }}>
      <Typography component="p" variant="subtitle1">
        What does a set keep?
      </Typography>
      <Box sx={{ my: "var(--space-3)", borderTop: "1px solid var(--border-subtle)" }} />
      <Typography component="p" variant="body2" sx={{ color: "text.secondary" }}>
        One copy of each value.
      </Typography>
    </Box>
  </Box>
);

export const ExerciseScene: React.FC = () => (
  <Box
    className="kiwi-ruled"
    sx={{
      width: "100%",
      maxWidth: 360,
      pl: "var(--space-3)",
      boxSizing: "border-box",
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      alignItems: "baseline",
      columnGap: "var(--space-4)",
      rowGap: "var(--space-2)",
    }}
  >
    <Row label="Your attempt">Checks every item in turn.</Row>
    <Row label="Feedback">Correct, but slow on a long list.</Row>
    <Row label="Next exercise" strong>
      Find it in fewer steps.
    </Row>
  </Box>
);

export const DemoScene: React.FC = () => (
  <Box sx={{ width: "100%", maxWidth: 320 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
        List length
      </Typography>
      <Typography component="span" variant="body2" sx={tabular}>
        1,024
      </Typography>
    </Box>
    <Box sx={{ display: "flex", mt: "var(--space-1)" }}>
      <Track at={62} />
    </Box>
    <Box sx={{ mt: "var(--space-3)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
        Halvings to reach one item
      </Typography>
      <Typography component="span" variant="h3" sx={tabular}>
        10
      </Typography>
    </Box>
  </Box>
);

export const PodcastScene: React.FC = () => (
  <Box sx={{ width: "100%", maxWidth: 340 }}>
    <Typography component="p" variant="caption" sx={{ color: "text.secondary" }}>
      Lecture 4: Binary search
    </Typography>
    <Box sx={{ mt: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
      <PlayArrowOutlined sx={{ fontSize: "var(--size-icon-sm)", color: "var(--icon-default)" }} />
      <Track at={33} />
      <Typography component="span" variant="caption" sx={{ ...tabular, color: "text.secondary" }}>
        12:40 / 38:05
      </Typography>
    </Box>
    <Box className="kiwi-ruled" sx={{ mt: "var(--space-3)", pl: "var(--space-3)" }}>
      <Typography component="p" variant="body2">
        "So each comparison halves what is left."
      </Typography>
      <Typography component="p" variant="caption" sx={{ mt: "var(--space-1)", color: "text.secondary" }}>
        Source: lecture 4 slides, page 12
      </Typography>
    </Box>
  </Box>
);

const TOPICS = [
  { name: "Code debugging", count: 42 },
  { name: "Python lists", count: 27 },
  { name: "Binary search", count: 15 },
] as const;

export const AnalyticsScene: React.FC = () => (
  <Box sx={{ width: "100%", maxWidth: 340 }}>
    <Typography component="p" variant="caption" sx={{ color: "text.secondary" }}>
      What students asked about this week
    </Typography>
    <Box
      sx={{
        mt: "var(--space-2)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        columnGap: "var(--space-3)",
        rowGap: "var(--space-2)",
      }}
    >
      {TOPICS.map((topic) => (
        <React.Fragment key={topic.name}>
          <Typography component="span" variant="body2">
            {topic.name}
          </Typography>
          {/* A bar's end marks its value, so it stays square (DESIGN.md, Radius). */}
          <Box sx={{ height: 8, width: `${(topic.count / TOPICS[0].count) * 100}%`, bgcolor: "var(--chart-1)" }} />
          <Typography component="span" variant="caption" sx={{ ...tabular, color: "text.secondary", textAlign: "right" }}>
            {topic.count}
          </Typography>
        </React.Fragment>
      ))}
    </Box>
  </Box>
);
