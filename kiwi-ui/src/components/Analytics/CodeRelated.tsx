import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { SessionActivity } from "./interface.tsx";

interface UserCodingActionCount {
  userid: string;
  runCodeCount: number;
  exportCodeCount: number;
}

interface DailyPlotProps {
  sessionActivities: SessionActivity[];
}

export const CumCodeRelatedPlot: React.FC<DailyPlotProps> = ({ sessionActivities }) => {
  // Initialize an empty array to store counts for each user
  const userActionCounts: UserCodingActionCount[] = [];

  // Function to count specific coding actions for each user
  sessionActivities.forEach(session => {
    const { userId, codeActions } = session;

    // Counters for "Run Code" and "Export Code and Output to Chat"
    let runCodeCount = 0;
    let exportCodeCount = 0;

    // Iterate through actions to count specific actions
    codeActions.forEach(action => {
      if (action.type === "frontend-interaction-ide-runcode") {
        runCodeCount++;
      } else if (action.type === "frontend-interaction-ide-movecodetochat") {
        exportCodeCount++;
      }
    });

    // Check if user exists in userActionCounts
    const existingUser = userActionCounts.find(user => user.userid === userId);
    if (existingUser) {
      existingUser.runCodeCount += runCodeCount;
      existingUser.exportCodeCount += exportCodeCount;
    } else {
      userActionCounts.push({
        userid: userId,
        runCodeCount,
        exportCodeCount,
      });
    }
  });

  // Prepare data for the chart
  const chartData = userActionCounts.map(user => ({
    "userId": user.userid,
    "Run Code": user.runCodeCount,
    "Export Code and Output": user.exportCodeCount,
  }));

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 'bold' }}>User Coding Action Count (user number: {userActionCounts.length})</span>
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
        <XAxis dataKey="userId" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="Run Code" fill="#8884d8" />
        <Bar dataKey="Export Code and Output" fill="#82ca9d" />
      </BarChart>
    </div>
  );
};