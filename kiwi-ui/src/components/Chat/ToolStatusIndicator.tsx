import React from "react";
import { Box, SvgIcon, Typography } from "@mui/material";
import {
  Check as CheckIcon,
  SearchOutlined as SearchIcon,
  CodeOutlined as CodeIcon,
  BuildOutlined as BuildIcon,
} from "@mui/icons-material";

export interface ToolStatusIndicatorProps {
  toolName: string;
  status: "running" | "complete";
}

const getToolIcon = (toolName: string) => {
  const lowerName = toolName.toLowerCase();
  if (lowerName.includes("rag") || lowerName.includes("search")) {
    return <SearchIcon fontSize="inherit" />;
  }
  if (lowerName.includes("code") || lowerName.includes("interpreter")) {
    return <CodeIcon fontSize="inherit" />;
  }
  return <BuildIcon fontSize="inherit" />;
};

/** A tool's name for people: the two Kiwi tools by name, any other in sentence case. */
export const getDisplayName = (toolName: string): string => {
  if (toolName.toLowerCase().includes("rag")) {
    return "Materials search";
  }
  if (toolName.toLowerCase().includes("code interpreter")) {
    return "Code interpreter";
  }
  const words = toolName.split(/[\s_-]+/).filter(Boolean).map((word) => word.toLowerCase());
  if (!words.length) return toolName;
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ");
};

/** The static dashed ring of work in progress: never a spinner (kiwi-ui/DESIGN.md, Functional colour usage). */
const InProgressRing = () => (
  <SvgIcon aria-hidden viewBox="0 0 16 16" sx={{ fontSize: "inherit" }}>
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 2" />
  </SvgIcon>
);

/**
 * The tool pill: Kiwi running one of its own tools away from the page. In
 * progress is neutral (the in-progress surface and text, the dashed ring), and
 * a finished tool keeps a quiet check; neither borrows a status colour.
 */
export const ToolStatusIndicator: React.FC<ToolStatusIndicatorProps> = ({
  toolName,
  status,
}) => {
  const displayName = getDisplayName(toolName);

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        px: "var(--space-3)",
        minHeight: "var(--size-chip)",
        mb: "var(--tutor-message-block-gap)",
        borderRadius: "var(--radius-control)",
        bgcolor: "var(--in-progress-surface)",
        color: "var(--in-progress-text)",
        fontSize: "var(--size-icon-sm)",
      }}
    >
      <Box component="span" aria-hidden sx={{ display: "flex", alignItems: "center" }}>
        {getToolIcon(toolName)}
      </Box>

      <Typography variant="body2" component="span" sx={{ color: "inherit" }}>
        {status === "running" ? `Using ${displayName}…` : displayName}
      </Typography>

      <Box component="span" sx={{ display: "flex", alignItems: "center" }}>
        {status === "running" ? <InProgressRing /> : <CheckIcon aria-hidden fontSize="inherit" />}
      </Box>
    </Box>
  );
};

export default ToolStatusIndicator;
