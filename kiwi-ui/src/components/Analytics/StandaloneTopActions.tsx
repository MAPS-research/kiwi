import React, { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Skeleton,
} from '@mui/material';
import { SessionActivity } from './interface.tsx';
import { AnalyticsChartTooltip } from './AnalyticsChartTooltip.tsx';
import { CHART_MAX_BAR_SIZE, useChartTokens } from './chartTokens.ts';

interface ActionData {
    action: string;
    count: number;
}

interface StandaloneTopActionsProps {
    realDataSessions?: SessionActivity[];
    loading?: boolean;
}

// Generate real data for top actions from SessionActivity[] (see CodeRelated.tsx and TopActions.tsx)
const generateRealActionData = (sessions: SessionActivity[]): ActionData[] => {
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
    }));

    // Sort by predefined order (no dynamic sorting to keep zero entries visible in position)
    return data;
};

export const StandaloneTopActions: React.FC<StandaloneTopActionsProps> = ({
    realDataSessions = [],
    loading = false
}) => {
    // One series in one colour: the category is on the axis, never in the hue
    // (DESIGN.md § Chart tokens › Colour rules).
    const chart = useChartTokens();

    // Generate chart data from real data
    const chartData = useMemo(() => {
        if (realDataSessions.length > 0) {
            return generateRealActionData(realDataSessions);
        } else {
            // Return zeroed baseline when no sessions available
            return [
                { action: 'Chat Action', count: 0 },
                { action: 'PDF Action', count: 0 },
                { action: 'Run Code', count: 0 },
                { action: 'Export Code and Output', count: 0 },
                { action: 'Other Code Actions', count: 0 },
                { action: 'Other Actions', count: 0 },
            ];
        }
    }, [realDataSessions]);

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
                        <Typography variant="body2" sx={{
                            color: "text.secondary"
                        }}>
                            Interactions grouped by action type
                        </Typography>
                    </Box>
                </Box>

                {/* Chart or Loading */}
                {loading ? (
                    <Box sx={{ flex: 1, minHeight: 230 }}>
                        <Skeleton variant="rounded" width="100%" height="100%" />
                    </Box>
                ) : (
                    <Box sx={{ flex: 1, minHeight: 230, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                            accessibilityLayer={false}
                        >
                            {/* A horizontal bar chart draws the zero baseline and no vertical gridlines. */}
                            <XAxis
                                type="number"
                                axisLine={false}
                                tickLine={false}
                                tick={chart.tick}
                                height={20}
                                tickMargin={4}
                                allowDecimals={false}
                                domain={[0, 'auto']}
                            />
                            <YAxis
                                type="category"
                                dataKey="action"
                                axisLine={{ stroke: chart.baseline }}
                                tickLine={false}
                                tick={chart.tick}
                                width={72}
                                tickMargin={4}
                                tickFormatter={(value: string) => ({
                                    'Chat Action': 'Chat',
                                    'PDF Action': 'PDF',
                                    'Run Code': 'Run code',
                                    'Export Code and Output': 'Export',
                                    'Other Code Actions': 'Other code',
                                    'Other Actions': 'Other',
                                } as Record<string, string>)[value] || value}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                offset={12}
                                isAnimationActive={false}
                                cursor={{ fill: chart.cursorFill }}
                            />
                            {/* Square at both ends, at most 24 px thick, no entrance animation. */}
                            <Bar
                                isAnimationActive={false}
                                dataKey="count"
                                fill={chart.series1}
                                maxBarSize={CHART_MAX_BAR_SIZE}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};
