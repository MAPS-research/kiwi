import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  Typography
} from '@mui/material';
import { SessionActivity } from "./interface.tsx";

interface UserActivity {
  userId: string;
  sessionCount: number;
  displayName: string;
}

interface DailyPlotProps {
  sessionActivities: SessionActivity[];
}

// Mock data generator for user activities
const generateMockUserData = (days: number) => {
  const users = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
  const data: { userId: string; displayName: string; sessionCount: number; rank: number }[] = [];

  // Generate data for each user
  users.forEach((user, index) => {
    // Base activity level varies by user
    const baseActivity = Math.floor(Math.random() * 15) + 5; // 5-20 base sessions
    const timeMultiplier = days / 7; // Scale with time range
    const totalSessions = Math.floor(baseActivity * timeMultiplier);

    data.push({
      userId: `user_${index + 1}`,
      displayName: user,
      sessionCount: Math.max(1, totalSessions),
      rank: index + 1
    });
  });

  // Sort by session count for better visualization
  return data.sort((a, b) => a.sessionCount - b.sessionCount);
};

export const UserLoginPlot: React.FC<DailyPlotProps> = ({
  sessionActivities,
}) => {
  const [timeRange, setTimeRange] = useState<string>('7');

  const handleTimeRangeChange = (event: SelectChangeEvent<string>) => {
    setTimeRange(event.target.value);
  };

  // Generate mock data based on selected time range
  const chartData = useMemo(() => {
    const days = parseInt(timeRange);
    return generateMockUserData(days);
  }, [timeRange]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#666' }}>
            {`User: ${data.displayName}`}
          </p>
          <p style={{ margin: '4px 0 0 0', color: '#FF9800' }}>
            {`Sessions: ${payload[0].value}`}
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#999' }}>
            {`User ID: ${data.userId}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '3': return 'Last 3 Days';
      case '7': return 'This Week';
      case '30': return 'This Month';
      default: return 'This Week';
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2 }}>
      {/* Header with title and time range selector */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
            User Activity
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Active Users: {chartData.length} | Total Sessions: {chartData.reduce((sum, item) => sum + item.sessionCount, 0)}
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={timeRange}
            onChange={handleTimeRangeChange}
            displayEmpty
            sx={{
              '& .MuiSelect-select': {
                py: 1,
                fontSize: '14px'
              }
            }}
          >
            <MenuItem value="3">Last 3 Days</MenuItem>
            <MenuItem value="7">This Week</MenuItem>
            <MenuItem value="30">This Month</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Chart */}
      <Box sx={{ height: "calc(100% - 80px)" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorUserLogin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF9800" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF9800" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="displayName"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#666' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="sessionCount"
              stroke="#FF9800"
              strokeWidth={3}
              fill="url(#colorUserLogin)"
              dot={{ fill: '#FF9800', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 4, stroke: '#FF9800', strokeWidth: 0, fill: '#FF9800' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};
