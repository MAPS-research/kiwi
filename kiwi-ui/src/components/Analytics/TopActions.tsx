import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Interaction, SessionActivity } from "./interface.tsx";


interface DailyPlotProps {
  sessionActivities: SessionActivity[];
}

interface CodingActionCount {
  name: string;
  count: number;
}

export const CumTopActionPlot: React.FC<DailyPlotProps> = ({ sessionActivities }) => {
  // Aggregate all coding actions from otherActions and chatActions
  const codingActions: Interaction[] = sessionActivities.flatMap(activity => [...activity.otherActions, ...activity.chatActions,...activity.codeActions]);

  // Count occurrences of each coding action type
  const codingActionCounts = codingActions.reduce((acc, action) => {
    const actionName = action.type;
    if (acc[actionName]) {
      acc[actionName] += 1;
    } else {
      acc[actionName] = 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Prepare data for the chart and sort by count in descending order
  const chartData: CodingActionCount[] = Object.entries(codingActionCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 'bold' }}>Top Coding Actions for All Users(user number: {chartData.length})</span>
      </div>
      <BarChart
        width={500}
        height={300}
        data={chartData}
        margin={{
          top: 5, right: 30, left: 20, bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#82ca22" />
      </BarChart>
    </div>
  );
};
