import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Skeleton,
  useTheme,
} from "@mui/material";
import { ChatOutlined, CodeOutlined } from "@mui/icons-material";
import { SessionActivity } from "./interface.tsx";
import { AnalyticsChartTooltip } from "./AnalyticsChartTooltip.tsx";
import { useAnalyticsChartAnimation } from "./chartAnimation.ts";

interface DurationData {
  activity: string;
  duration: number; // in minutes
  color: string;
  percentage: number;
  icon: React.ReactNode;
}

interface StandaloneUserDurationProps {
  realDataSessions?: SessionActivity[];
  loading?: boolean;
}

// Generate real data for user duration from SessionActivity[]
const generateRealDurationData = (
  sessions: SessionActivity[],
  colors: { chat: string; ide: string },
): DurationData[] => {
  // A third bucket, 'Exercise', used to sit here. It was derived from
  // `session.otherActions` -- a catch-all -- and presented as time spent on
  // exercises. Exercises were removed from Kiwi in June 2026, so the slice was
  // attributing unrelated activity to a feature that no longer exists.
  // Dropped rather than zeroed: a zero bar still asserts the category is real
  // and merely unused.
  const activityDurations = {
    Chat: 0,
    IDE: 0,
  };

  // Calculate activity durations from real session data
  sessions.forEach((session) => {
    // Chat duration - estimate based on chat actions count (rough approximation)
    activityDurations["Chat"] += session.chatActions.length * 2; // ~2 minutes per chat action

    // IDE duration - estimate based on code actions count
    activityDurations["IDE"] += session.codeActions.length * 5; // ~5 minutes per code action
  });

  // Convert to chart data format with colors and icons
  const activities = [
    {
      activity: "Chat",
      color: colors.chat,
      icon: <ChatOutlined fontSize="small" />,
    },
    {
      activity: "IDE",
      color: colors.ide,
      icon: <CodeOutlined fontSize="small" />,
    },
  ];

  const dataWithDuration = activities.map((activityItem) => ({
    activity: activityItem.activity,
    duration:
      activityDurations[
        activityItem.activity as keyof typeof activityDurations
      ],
    color: activityItem.color,
    percentage: 0, // Will be calculated below
    icon: activityItem.icon,
  }));

  // Calculate percentages
  const totalDuration = dataWithDuration.reduce(
    (sum, item) => sum + item.duration,
    0,
  );
  return dataWithDuration.map((item) => ({
    ...item,
    percentage:
      totalDuration > 0 ? Math.round((item.duration / totalDuration) * 100) : 0,
  }));
};

export const StandaloneUserDuration: React.FC<StandaloneUserDurationProps> = ({
  realDataSessions = [],
  loading = false,
}) => {
  const theme = useTheme();
  const chartAnimation = useAnalyticsChartAnimation();
  const chartColors = theme.palette.chart;

  // Generate chart data from real data only
  const chartData = useMemo(() => {
    if (realDataSessions.length > 0) {
      return generateRealDurationData(realDataSessions, {
        chat: chartColors.series1,
        ide: chartColors.series2,
      });
    } else {
      // Return empty data when no sessions available
      return [];
    }
  }, [chartColors, realDataSessions]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const durationInHours = (data.duration / 60).toFixed(1);
      return (
        <AnalyticsChartTooltip
          title={`${data.activity}: ${data.percentage}%`}
          value={`Duration: ${durationInHours} hours`}
          valueColor={data.color}
        />
      );
    }
    return null;
  };

  const totalDuration = chartData.reduce((sum, item) => sum + item.duration, 0);
  const totalHours = (totalDuration / 60).toFixed(1);
  const hasData = totalDuration > 0;

  return (
    <Card
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 340,
        backgroundColor: "background.paper",
        boxShadow: "none",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <CardContent
        sx={{
          p: 2.5,
          "&:last-child": { pb: 2.5 },
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header with title and selectors */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1.5,
          }}
        >
          <Box>
            <Typography
              component="h3"
              variant="subtitle1"
              sx={{ fontWeight: 600, mb: 0.25 }}
            >
              User Duration
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Estimated active time by activity
            </Typography>
          </Box>
        </Box>

        {/* Pie Chart and Legend */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            rowGap: 0.5,
          }}
        >
          {/* Pie Chart */}
          <Box sx={{ height: 150, width: "100%", minWidth: 0 }}>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <Skeleton variant="circular" width={132} height={132} />
              </Box>
            ) : hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    {...chartAnimation}
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={66}
                    paddingAngle={3}
                    cornerRadius={4}
                    stroke={theme.palette.background.paper}
                    strokeWidth={3}
                    dataKey="duration"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} offset={12} />
                  <text
                    x="50%"
                    y="47%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={theme.palette.text.primary}
                    fontSize="20"
                    fontWeight="600"
                  >
                    {totalHours}
                  </text>
                  <text
                    x="50%"
                    y="57%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={theme.palette.text.secondary}
                    fontSize="12"
                  >
                    hours
                  </text>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box
                sx={{ height: "100%", display: "grid", placeItems: "center" }}
              >
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  No duration data for this range
                </Typography>
              </Box>
            )}
          </Box>

          {/* Legend */}
          <Box sx={{ minWidth: 0, width: "100%", justifySelf: "center" }}>
            <Stack spacing={0.5} sx={{ alignItems: "center" }}>
              {loading
                ? Array.from({ length: 2 }, (_, index) => (
                    <Skeleton
                      key={index}
                      variant="text"
                      width={190}
                      height={28}
                    />
                  ))
                : chartData.map((item) => (
                    <Box
                      key={item.activity}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        py: 0.5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: item.color,
                          flexShrink: 0,
                        }}
                      />
                      {item.icon}
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.activity}
                      </Typography>
                      <Typography variant="body2" sx={{
                        color: "text.secondary"
                      }}>
                        <Box
                          component="span"
                          sx={{ fontWeight: 600, color: "text.primary" }}
                        >
                          {item.duration.toLocaleString()} min
                        </Box>
                        <Box component="span" sx={{ ml: 1 }}>
                          {item.percentage}%
                        </Box>
                      </Typography>
                    </Box>
                  ))}
            </Stack>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
