import React from "react";
import { Paper, Stack, Typography } from "@mui/material";

interface AnalyticsChartTooltipProps {
  title: React.ReactNode;
  value: React.ReactNode;
  valueColor?: string;
}

export const AnalyticsChartTooltip: React.FC<AnalyticsChartTooltipProps> = ({
  title,
  value,
  valueColor,
}) => (
  <Paper
    elevation={3}
    sx={{
      px: 1.5,
      py: 1,
      borderRadius: 1.5,
      pointerEvents: "none",
    }}
  >
    <Stack spacing={0.25}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: valueColor, fontWeight: 500 }}>
        {value}
      </Typography>
    </Stack>
  </Paper>
);
