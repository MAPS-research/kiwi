import React from "react";
import { Paper, Stack, Typography } from "@mui/material";

interface AnalyticsChartTooltipProps {
  title: React.ReactNode;
  value: React.ReactNode;
}

/**
 * The chart tooltip in the toggletip look (DESIGN.md § Tooltip): the sheet with a
 * hairline edge and the menu shadow. Its text wears text tokens, never a series colour.
 */
export const AnalyticsChartTooltip: React.FC<AnalyticsChartTooltipProps> = ({
  title,
  value,
}) => (
  <Paper
    sx={{
      px: "var(--toggletip-padding-x)",
      py: "var(--toggletip-padding-y)",
      border: "1px solid var(--border)",
      borderRadius: "var(--toggletip-radius)",
      boxShadow: "var(--toggletip-shadow)",
      maxWidth: "var(--toggletip-max-width)",
      pointerEvents: "none",
    }}
  >
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {title}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: "text.primary", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Typography>
    </Stack>
  </Paper>
);
