import React, { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Skeleton,
    useTheme
} from '@mui/material';
import { SessionActivity } from './interface.tsx';
import { AnalyticsChartTooltip } from './AnalyticsChartTooltip.tsx';
import { useAnalyticsChartAnimation } from './chartAnimation.ts';

interface ActionData {
    action: string;
    count: number;
    color: string;
}

interface StandaloneTopActionsProps {
    realDataSessions?: SessionActivity[];
    loading?: boolean;
}

// Generate real data for top actions from SessionActivity[] (see CodeRelated.tsx and TopActions.tsx)
const generateRealActionData = (
    sessions: SessionActivity[],
    colorMap: Record<string, string>,
): ActionData[] => {
    const actionCounts: { [key: string]: number } = {};

    // Initialize counters
    actionCounts['Chat Action'] = 0;
    actionCounts['PDF Action'] = 0;
    actionCounts['Run Code'] = 0;
    actionCounts['Export Code and Output'] = 0;
    actionCounts['Other Code Actions'] = 0;
    actionCounts['Other Actions'] = 0;

    // Count actions from real session data (following CodeRelated.tsx's approach)
    sessions.forEach((session) => {
        // Count chat actions (total)
        actionCounts['Chat Action'] += session.chatActions.length;

        // Count PDF actions (total)
        actionCounts['PDF Action'] += session.pdfActions.length;

        // Put every code interaction into exactly one mutually exclusive bucket.
        session.codeActions.forEach(codeAction => {
            if (codeAction.type === "frontend-interaction-ide-runcode") {
                actionCounts['Run Code'] += 1;
            } else if (codeAction.type === "frontend-interaction-ide-movecodetochat") {
                actionCounts['Export Code and Output'] += 1;
            } else {
                actionCounts['Other Code Actions'] += 1;
            }
        });

        actionCounts['Other Actions'] += session.otherActions.length;
    });

    // Keep a stable display order
    const orderedKeys = [
        'Chat Action',
        'PDF Action',
        'Run Code',
        'Export Code and Output',
        'Other Code Actions',
        'Other Actions',
    ];

    const data: ActionData[] = orderedKeys.map(action => ({
        action,
        count: actionCounts[action] ?? 0,
        color: colorMap[action]
    }));

    // Sort by predefined order (no dynamic sorting to keep zero entries visible in position)
    return data;
};

export const StandaloneTopActions: React.FC<StandaloneTopActionsProps> = ({
    realDataSessions = [],
    loading = false
}) => {
    const theme = useTheme();
    const chartAnimation = useAnalyticsChartAnimation();
    const chartColors = theme.palette.chart;
    const actionColors = useMemo(() => ({
        'Chat Action': chartColors.series1,
        'PDF Action': chartColors.series2,
        'Run Code': chartColors.series3,
        'Export Code and Output': chartColors.series4,
        'Other Code Actions': chartColors.series5,
        'Other Actions': chartColors.series5,
    }), [chartColors]);

    // Generate chart data from real data
    const chartData = useMemo(() => {
        if (realDataSessions.length > 0) {
            return generateRealActionData(realDataSessions, actionColors);
        } else {
            // Return zeroed baseline when no sessions available
            return [
                { action: 'Chat Action', count: 0, color: actionColors['Chat Action'] },
                { action: 'PDF Action', count: 0, color: actionColors['PDF Action'] },
                { action: 'Run Code', count: 0, color: actionColors['Run Code'] },
                { action: 'Export Code and Output', count: 0, color: actionColors['Export Code and Output'] },
                { action: 'Other Code Actions', count: 0, color: actionColors['Other Code Actions'] },
                { action: 'Other Actions', count: 0, color: actionColors['Other Actions'] },
            ];
        }
    }, [actionColors, realDataSessions]);

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // Map shortened labels to full descriptions
            const fullNames: { [key: string]: string } = {
                'Chat Action': 'Chat Interactions (Total)',
                'PDF Action': 'PDF Interactions (Total)',
                'Run Code': 'IDE Code Execution',
                'Export Code and Output': 'Export Code and Output to Chat',
                'Other Code Actions': 'Other Code Interactions',
                'Other Actions': 'Other Interactions',
            };

            const fullName = fullNames[label] || label;

            return (
                <AnalyticsChartTooltip
                    title={`Action: ${fullName}`}
                    value={`Count: ${payload[0].value}`}
                    valueColor={payload[0].payload.color}
                />
            );
        }
        return null;
    };

    return (
        <Card sx={{
            width: '100%',
            minHeight: 340,
            height: '100%',
            backgroundColor: "background.paper",
            boxShadow: "none",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider"
        }}>
            <CardContent sx={{
                p: 2.5,
                '&:last-child': { pb: 2.5 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Header with title and selectors */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1.5
                }}>
                    <Box>
                        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }}>
                            Top Actions
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Interactions grouped by action type
                        </Typography>
                    </Box>
                </Box>

                {/* Chart or Loading */}
                {loading ? (
                    <Box sx={{ flex: 1, minHeight: 230 }}>
                        <Skeleton variant="rounded" width="100%" height="100%" sx={{ borderRadius: 1.5 }} />
                    </Box>
                ) : (
                    <Box sx={{ flex: 1, minHeight: 230, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                        >
                            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={theme.palette.divider} />
                            <XAxis
                                type="number"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                                height={20}
                                tickMargin={4}
                            />
                            <YAxis
                                type="category"
                                dataKey="action"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                                width={72}
                                tickMargin={4}
                                tickFormatter={(value) => ({
                                    'Chat Action': 'Chat',
                                    'PDF Action': 'PDF',
                                    'Run Code': 'Run code',
                                    'Export Code and Output': 'Export',
                                    'Other Code Actions': 'Other code',
                                    'Other Actions': 'Other',
                                }[value] || value)}
                            />
                            <Tooltip content={<CustomTooltip />} offset={12} />
                            <Bar
                                {...chartAnimation}
                                dataKey="count"
                                radius={[0, 4, 4, 0]}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};
