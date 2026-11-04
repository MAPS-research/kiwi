// components/AuthLayout/LearningToolGallery.tsx
import React, { useId, useState } from "react";
import { Box, IconButton, Link, Tooltip, Typography } from "@mui/material";
import { ChevronLeftOutlined, ChevronRightOutlined, OpenInNewOutlined } from "@mui/icons-material";
import { visuallyHidden } from "../../theme/visuallyHidden";
import {
  AnalyticsScene,
  DemoScene,
  ExerciseScene,
  FlashcardScene,
  MaterialsScene,
  PodcastScene,
} from "./LearningToolScenes.tsx";

export const KIWI_SITE_URL = "https://kiwiai.org/";

/**
 * The learning tools kiwiai.org shows, described in Kiwi's own words. The
 * site's Scratchpad is left out: in this app the scratchpad is the code tab,
 * and one word names one thing (DESIGN.md, Terminology).
 */
export const LEARNING_TOOLS = [
  {
    name: "Materials",
    description: "Read lecture PDFs from your class and ask Kiwi about the page you're on.",
    Scene: MaterialsScene,
  },
  {
    name: "Flashcard",
    description: "Study a deck from your class or build your own, then quiz yourself on what stuck.",
    Scene: FlashcardScene,
  },
  {
    name: "Exercise",
    description: "Each new exercise builds on your earlier attempts and the feedback on them.",
    Scene: ExerciseScene,
  },
  {
    name: "Demo",
    description: "Move an input in a live model of a process or an algorithm and see the effect.",
    Scene: DemoScene,
  },
  {
    name: "Podcast",
    description: "Hear a lecture with its script and sources on screen, or make a podcast for your own study.",
    Scene: PodcastScene,
  },
  {
    name: "Analytics",
    description: "For instructors: the topics students ask Kiwi about, and the kind of help they want.",
    Scene: AnalyticsScene,
  },
] as const;

/**
 * The sign-in aside's gallery (JOURNEY SR-5): one learning tool at a time on a
 * single sheet, a picture of it above its name and description, and Previous
 * and Next to move through the tools (it wraps at both ends). Nothing turns by
 * itself and the change is instant: the motion budget lets no reading surface
 * move (DESIGN.md, Motion). Shown from 900 px only, where the aside has room
 * beside the form.
 */
const LearningToolGallery: React.FC = () => {
  const [index, setIndex] = useState(0);
  const labelId = useId();
  const count = LEARNING_TOOLS.length;
  const tool = LEARNING_TOOLS[index];
  const step = (by: number) => setIndex((current) => (current + by + count) % count);

  return (
    <Box
      component="section"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "center",
        flex: "1 1 auto",
        maxWidth: 640,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <Typography
          id={labelId}
          component="p"
          variant="subtitle2"
          sx={{ flex: "1 1 auto", color: "text.secondary", textWrap: "balance" }}
        >
          Learning tools built on Kiwi
        </Typography>
        {/* The slide's own label reads the position, so this copy is for the eye only. */}
        <Typography
          component="span"
          variant="body2"
          aria-hidden="true"
          sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
        >
          {index + 1} of {count}
        </Typography>
        <Tooltip title="Show previous tool">
          <IconButton aria-label="Show previous tool" onClick={() => step(-1)}>
            <ChevronLeftOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title="Show next tool">
          <IconButton aria-label="Show next tool" onClick={() => step(1)}>
            <ChevronRightOutlined />
          </IconButton>
        </Tooltip>
      </Box>

      {/* WHY: polite, so a press of Previous or Next reads the new slide out. */}
      <Box aria-live="polite" sx={{ mt: "var(--space-3)", flex: "1 1 auto", maxHeight: 360, display: "flex" }}>
        <Box
          key={tool.name}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${count}`}
          sx={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.paper",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sheet)",
            overflow: "hidden",
          }}
        >
          <Box
            aria-hidden="true"
            sx={{
              flex: "1 1 auto",
              // WHY: size containment ignores the picture's own height, so this floor keeps the
              // tallest picture (110 px, plus 12 px above and below) whole; the card grows
              // rather than clipping it.
              minHeight: 134,
              // The picture takes the height left over and grows a step once there is room for it.
              containerType: "size",
              display: "grid",
              placeItems: "center",
              p: "var(--space-3)",
              bgcolor: "background.default",
              borderBottom: "1px solid var(--border-subtle)",
              overflow: "hidden",
              "@container (min-height: 200px)": { "& > *": { zoom: 1.2 } },
            }}
          >
            <tool.Scene />
          </Box>
          <Box sx={{ p: "var(--space-5)" }}>
            <Typography component="p" variant="h3">
              {tool.name}
            </Typography>
            <Typography component="p" variant="body2" sx={{ mt: "var(--space-1)", color: "text.secondary" }}>
              {tool.description}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Typography component="p" variant="body2" sx={{ mt: "var(--space-3)" }}>
        <Link href={KIWI_SITE_URL} target="_blank" rel="noopener noreferrer">
          More on kiwiai.org
          <Box component="span" sx={visuallyHidden}>
            {" "}(opens in a new tab)
          </Box>
        </Link>
        <OpenInNewOutlined
          fontSize="inherit"
          sx={{ ml: "var(--space-1)", verticalAlign: "-0.125em", color: "var(--link)" }}
        />
      </Typography>
    </Box>
  );
};

export default LearningToolGallery;
