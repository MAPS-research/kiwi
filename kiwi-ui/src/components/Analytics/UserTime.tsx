import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { SessionActivity } from "./interface.tsx";

interface UserActivity {
    userId: string;
    totalTime: number;
}

interface DailyPlotProps {
    sessionActivities: SessionActivity[];
}

export const UserTimePlot: React.FC<DailyPlotProps> = ({ sessionActivities }) => {
    // Transform the sessionActivities data into a format suitable for the chart
    const userTimeMap: { [key: string]: number } = {};

    sessionActivities.forEach(session => {
        const { userId, totalWatchTime } = session;

        if (!userTimeMap[userId]) {
            userTimeMap[userId] = 0;
        }

        userTimeMap[userId] += totalWatchTime 
    });

    const data: UserActivity[] = Object.keys(userTimeMap).map(userId => ({
        userId,
        totalTime: parseFloat(userTimeMap[userId].toFixed(2)), // Round to 2 decimal places
    }));

    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 'bold' }}>Total Watch Time (hours) of (Total Sessions: {sessionActivities.length})</span>
            </div>
            <BarChart
                width={500}
                height={300}
                data={data}
                margin={{
                    top: 5, right: 30, left: 20, bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="userId" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalTime" fill="#82ca22" />
            </BarChart>
        </div>
    );
};