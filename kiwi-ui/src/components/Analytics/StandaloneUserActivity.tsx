import React, { useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Skeleton,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { SessionActivity } from "./interface.tsx";
import { AnalyticsChartTooltip } from "./AnalyticsChartTooltip.tsx";
import {
    formatAnalyticsDateTick,
    formatAnalyticsTimeTick,
    formatAnalyticsTimeTooltip,
    getKeyDateTicks,
    getKeyTimeTicks,
    MAX_MOBILE_ANALYTICS_X_AXIS_TICKS,
} from "./chartXAxis.ts";
import { useChartTokens } from "./chartTokens.ts";
import { buildAnalyticsActivitySeries } from "./activityTimeSeries.ts";

interface StandaloneUserActivityProps {
    realDataSessions?: SessionActivity[];
    loading?: boolean;
    dateStart?: string;
    startTime?: string;
    dateEnd?: string;
    endTime?: string;
}

export const StandaloneUserActivity: React.FC<StandaloneUserActivityProps> = ({
    realDataSessions = [],
    loading = false,
    dateStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    startTime = "00:00",
    dateEnd = new Date().toISOString().slice(0, 10),
    endTime = "23:59",
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    // One series: the accent hue of every single-series chart (DESIGN.md § Chart tokens).
    const chart = useChartTokens();
    const chartColor = chart.series1;

    // A fixed compact height keeps the chart's visual density consistent;
    // longer ranges add horizontal data points rather than needing more height.
    const chartHeight = 320;
    const series = useMemo(
        () => buildAnalyticsActivitySeries(realDataSessions, {
            startDate: dateStart,
            startTime,
            endDate: dateEnd,
            endTime,
        }),
        [realDataSessions, dateStart, startTime, dateEnd, endTime],
    );
    const chartData = series.data;
    const xAxisTicks = useMemo(
        () => {
            const maxTicks = isMobile ? MAX_MOBILE_ANALYTICS_X_AXIS_TICKS : undefined;
            return series.granularity === "hour"
                ? getKeyTimeTicks(series.startTimestamp, series.endTimestamp, maxTicks)
                : getKeyDateTicks(chartData, maxTicks);
        },
        [chartData, isMobile, series.endTimestamp, series.granularity, series.startTimestamp],
    );

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <AnalyticsChartTooltip
                    title={series.granularity === "hour"
                        ? `Time: ${formatAnalyticsTimeTooltip(label)}`
                        : `Date: ${formatAnalyticsDateTick(label)}`}
                    value={`Active users: ${payload[0].value}`}
                />
            );
        }
        return null;
    };

    return (
        <Card sx={{ height: chartHeight }}>
            <CardContent sx={{
                p: 2.5,
                '&:last-child': { pb: 2.5 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Header with title */}
                <Box sx={{
                    mb: 1.5
                }}>
                    <Box>
                        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }}>
                            {series.granularity === "hour" ? "Hourly Active Users" : "Daily Active Users"}
                        </Typography>
                        <Typography variant="body2" sx={{
                            color: "text.secondary"
                        }}>
                            Unique users active each {series.granularity === "hour" ? "hour" : "day"}
                        </Typography>
                    </Box>
                </Box>

                {/* Chart or Loading */}
                {loading ? (
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        <Skeleton variant="rounded" width="100%" height="100%" />
                    </Box>
                ) : (
                    <Box sx={{ flex: 1, minHeight: 0, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                            accessibilityLayer={false}
                        >
                            <CartesianGrid vertical={false} stroke={chart.grid} />
                            <XAxis
                                dataKey="timestamp"
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                axisLine={{ stroke: chart.baseline }}
                                tickLine={false}
                                tick={chart.tick}
                                height={28}
                                tickMargin={8}
                                ticks={xAxisTicks}
                                interval={0}
                                tickFormatter={series.granularity === "hour"
                                    ? formatAnalyticsTimeTick
                                    : formatAnalyticsDateTick}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={chart.tick}
                                width={32}
                                tickMargin={4}
                                allowDecimals={false}
                                domain={[0, 'auto']}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                offset={12}
                                isAnimationActive={false}
                                cursor={{ stroke: chart.baseline, strokeWidth: 1 }}
                            />
                            {/* No smoothing and no area wash: a 2 px straight-segment line. */}
                            <Line
                                isAnimationActive={false}
                                type="linear"
                                dataKey="userLogins"
                                stroke={chartColor}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{
                                    r: 4,
                                    stroke: chart.plot,
                                    strokeWidth: 2,
                                    fill: chartColor,
                                }}
                            />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};
