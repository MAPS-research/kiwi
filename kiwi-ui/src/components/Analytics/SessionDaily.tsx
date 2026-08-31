import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  Typography
} from '@mui/material';
import { SessionActivity } from "./interface.tsx";

interface DailyPlotProps {
  interactions: SessionActivity[];
}

// Mock data generator
const generateMockData = (days: number) => {
  const data = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    // Generate realistic session counts with some variation
    const baseCount = Math.floor(Math.random() * 20) + 15; // 15-35 sessions
    const variation = Math.floor(Math.random() * 10) - 5; // ±5 variation
    const sessions = Math.max(5, baseCount + variation);

    data.push({
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      fullDate: date.toISOString().split('T')[0],
      sessions: sessions,
      timestamp: date.getTime()
    });
  }

  return data.sort((a, b) => a.timestamp - b.timestamp);
};

export const DailyPlot: React.FC<DailyPlotProps> = ({ interactions }) => {
  const [timeRange, setTimeRange] = useState<string>('7');

  const handleTimeRangeChange = (event: SelectChangeEvent<string>) => {
    setTimeRange(event.target.value);
  };

  // Generate mock data based on selected time range
  const chartData = useMemo(() => {
    const days = parseInt(timeRange);
    return generateMockData(days);
  }, [timeRange]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#666' }}>
            {`Date: ${label}`}
          </p>
          <p style={{ margin: '4px 0 0 0', color: '#2196F3' }}>
            {`Sessions: ${payload[0].value}`}
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
            Daily Sessions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Sessions: {chartData.reduce((sum, item) => sum + item.sessions, 0)}
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
      <ResponsiveContainer width="100%" height="calc(100% - 80px)">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2196F3" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2196F3" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#666' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#666' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="sessions"
            stroke="#2196F3"
            strokeWidth={3}
            fill="url(#colorSessions)"
            dot={{ fill: '#2196F3', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 4, stroke: '#2196F3', strokeWidth: 0, fill: '#2196F3' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};
