import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Code as CodeIcon,
  Build as BuildIcon,
} from "@mui/icons-material";

export interface ToolStatusIndicatorProps {
  toolName: string;
  status: "running" | "complete";
}

const getToolIcon = (toolName: string) => {
  const lowerName = toolName.toLowerCase();
  if (lowerName.includes("rag") || lowerName.includes("search")) {
    return <SearchIcon fontSize="small" />;
  }
  if (lowerName.includes("code") || lowerName.includes("interpreter")) {
    return <CodeIcon fontSize="small" />;
  }
  return <BuildIcon fontSize="small" />;
};

const getDisplayName = (toolName: string): string => {
  // Clean up tool names for display
  if (toolName.toLowerCase().includes("rag")) {
    return "RAG Search";
  }
  if (toolName.toLowerCase().includes("code interpreter")) {
    return "Code Interpreter";
  }
  // Capitalize first letter of each word
  return toolName
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const ToolStatusIndicator: React.FC<ToolStatusIndicatorProps> = ({
  toolName,
  status,
}) => {
  const displayName = getDisplayName(toolName);
  const icon = getToolIcon(toolName);

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.75,
        mb: 1.5,
        borderRadius: 1,
        bgcolor: status === "running" ? "action.hover" : "success.light",
        border: 1,
        borderColor: status === "running" ? "divider" : "success.main",
        transition: "all 0.3s ease",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          color: status === "running" ? "primary.main" : "success.dark",
        }}
      >
        {icon}
      </Box>

      <Typography
        variant="body2"
        sx={{
          fontWeight: 500,
          color: status === "running" ? "text.primary" : "success.dark",
        }}
      >
        {status === "running" ? `Using ${displayName}...` : displayName}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", ml: 0.5 }}>
        {status === "running" ? (
          <CircularProgress size={14} thickness={4} />
        ) : (
          <CheckCircleIcon
            fontSize="small"
            sx={{ color: "success.main", fontSize: 16 }}
          />
        )}
      </Box>
    </Box>
  );
};

export default ToolStatusIndicator;
