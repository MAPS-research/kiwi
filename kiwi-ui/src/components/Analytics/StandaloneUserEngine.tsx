import React, { useMemo } from "react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip
} from "recharts";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Stack,
    Skeleton,
    useTheme
} from '@mui/material';
import { SessionActivity } from './interface.tsx';
import { AnalyticsChartTooltip } from './AnalyticsChartTooltip.tsx';
import { CHART_SLICE_GAP, useChartTokens } from './chartTokens.ts';

interface EngineData {
    engine: string;
    usage: number;
    color: string;
    percentage: number;
}

interface StandaloneUserEngineProps {
    realDataSessions?: SessionActivity[];
    loading?: boolean;
}

// Generate real data for user engine choices from SessionActivity[]
const generateRealEngineData = (
    sessions: SessionActivity[],
    colors: { openai: string; qwen: string; unknown: string },
): EngineData[] => {
    // Count by engineChoice found in action context or server-side actions (if projected into interactions)
    const counts: Record<string, number> = { openai: 0, qwen: 0, unknown: 0 };

    sessions.forEach(session => {
        // chat actions are the most reliable place to carry engineChoice in context
        session.chatActions.forEach((action: any) => {
            const choice: string | undefined = action?.context?.engineChoice;
            const key = typeof choice === 'string' ? choice.toLowerCase() : undefined;
            if (key === 'openai' || key === 'qwen') {
                counts[key] += 1;
            } else {
                counts.unknown += 1;
            }
        });

        // some interactions may log engineChoice in otherActions context as well
        session.otherActions.forEach((action: any) => {
            const choice: string | undefined = (action?.context as any)?.engineChoice;
            const key = typeof choice === 'string' ? choice.toLowerCase() : undefined;
            if (key === 'openai' || key === 'qwen') {
                counts[key] += 1;
            }
        });
    });

    // Map to display data
    const mapping = [
        { key: 'openai', label: 'OpenAI', color: colors.openai },
        { key: 'qwen', label: 'QWEN', color: colors.qwen },
        { key: 'unknown', label: 'Unknown', color: colors.unknown },
    ] as const;

    const total = mapping.reduce((sum, m) => sum + (counts[m.key] || 0), 0);

    return mapping.map(m => ({
        engine: m.label,
        usage: counts[m.key] || 0,
        color: m.color,
        percentage: total > 0 ? Math.round(((counts[m.key] || 0) * 100) / total) : 0,
    }));
};

export const StandaloneUserEngine: React.FC<StandaloneUserEngineProps> = ({
    realDataSessions = [],
    loading = false
}) => {
    const theme = useTheme();
    // Categories take the fixed slot order; "Unknown" is always the neutral.
    const chartColors = useChartTokens();
    const engineColors = useMemo(() => ({
        openai: chartColors.series1,
        qwen: chartColors.series2,
        unknown: chartColors.other,
    }), [chartColors.series1, chartColors.series2, chartColors.other]);

    // Generate chart data from real data only
    const chartData = useMemo(() => {
        if (realDataSessions.length > 0) {
            return generateRealEngineData(realDataSessions, engineColors);
        } else {
            // Return zero baselines when no sessions available
            return [
                { engine: 'OpenAI', usage: 0, color: engineColors.openai, percentage: 0 },
                { engine: 'QWEN', usage: 0, color: engineColors.qwen, percentage: 0 },
                { engine: 'Unknown', usage: 0, color: engineColors.unknown, percentage: 0 },
            ];
        }
    }, [engineColors, realDataSessions]);

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <AnalyticsChartTooltip
                    title={`${data.engine}: ${data.percentage}%`}
                    value={`Usage: ${data.usage} requests`}
                />
            );
        }
        return null;
    };

    const totalUsage = chartData.reduce((sum, item) => sum + item.usage, 0);
    const hasData = totalUsage > 0;

    return (
        <Card sx={{
            width: '100%',
            height: '100%',
            minHeight: 340,
        }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ mb: 1.5 }}>
                    <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }}>
                        User Engine Choice
                    </Typography>
                    <Typography variant="body2" sx={{
                        color: "text.secondary"
                    }}>
                        Model usage distribution
                    </Typography>
                </Box>

                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    rowGap: 0.5,
                }}>
                    {/* Pie Chart */}
                    <Box sx={{ height: 150, width: '100%', minWidth: 0 }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <Skeleton variant="circular" width={132} height={132} />
                            </Box>
                        ) : hasData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }} accessibilityLayer={false}>
                                    {/* Square slices; a 2 px gap in the plot colour separates them. */}
                                    <Pie
                                        isAnimationActive={false}
                                        data={chartData}
                                        dataKey="usage"
                                        nameKey="engine"
                                        innerRadius={44}
                                        outerRadius={66}
                                        stroke={chartColors.plot}
                                        strokeWidth={CHART_SLICE_GAP}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} offset={12} isAnimationActive={false} />
                                    <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill={theme.palette.text.primary} fontSize="20" fontWeight="600">
                                        {totalUsage.toLocaleString()}
                                    </text>
                                    <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" fill={chartColors.tickText} fontSize="12">
                                        requests
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
                                <Typography variant="body2" sx={{
                                    color: "text.secondary"
                                }}>
                                    No model usage for this range
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Legend */}
                    <Box sx={{ minWidth: 0, width: '100%', justifySelf: 'center' }}>
                        <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                            {loading ? Array.from({ length: 3 }, (_, index) => (
                                <Skeleton key={index} variant="text" width={190} height={28} />
                            )) : chartData.map((item) => (
                                <Box
                                    key={item.engine}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        py: 0.5,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            // A legend key is square, like the marks it keys.
                                            borderRadius: 0,
                                            backgroundColor: item.color,
                                            flexShrink: 0
                                        }}
                                    />
                                    <Typography variant="body2">
                                        {item.engine}
                                    </Typography>
                                    <Typography variant="body2" sx={{
                                        color: "text.secondary"
                                    }}>
                                        <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                            {item.usage.toLocaleString()} {item.usage === 1 ? 'request' : 'requests'}
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
