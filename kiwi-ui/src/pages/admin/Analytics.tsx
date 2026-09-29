import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  GroupOutlined,
  ScheduleOutlined,
  TimelineOutlined,
  TouchAppOutlined,
} from "@mui/icons-material";
import { StandaloneUserActivity } from "../../components/Analytics/StandaloneUserActivity.tsx";
import { StandaloneDailySessions } from "../../components/Analytics/StandaloneDailySessions.tsx";
import { StandaloneTopActions } from "../../components/Analytics/StandaloneTopActions.tsx";
import { StandaloneUserDuration } from "../../components/Analytics/StandaloneUserDuration.tsx";
import { StandaloneUserEngine } from "../../components/Analytics/StandaloneUserEngine.tsx";
import {
  StandaloneTopTokenUsers,
  StandaloneTopTokenUsersHandle,
} from "../../components/Analytics/StandaloneTopTokenUsers.tsx";
import apiClient from "../../utils/api.ts";
import {
  Interaction,
  SessionActivity,
  pdfAction,
  chatAction,
  codeAction,
} from "../../components/Analytics/interface.tsx";
import {
  AdminPage,
  AdminPageHeader,
} from "../../components/AdminPage/index.ts";
import {
  AnalyticsDateRangeControl,
} from "../../components/Analytics/AnalyticsDateRangeControl.tsx";
import type { AnalyticsDateRangeValue } from "../../components/Analytics/AnalyticsDateRangeControl.tsx";

interface MetricCardProps {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  loading: boolean;
}

interface AnalyticsSectionHeaderProps {
  title: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  helper,
  icon,
  loading,
}) => (
  <Paper
    variant="outlined"
    sx={{ p: 2.5, height: 132, boxSizing: "border-box", borderRadius: 2 }}
  >
    <Stack
      direction="row"
      spacing={2}
      sx={{
        justifyContent: "space-between",
        height: "100%"
      }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            height: 20,
            lineHeight: "20px"
          }}>
          {label}
        </Typography>
        <Box sx={{ height: 44, display: "flex", alignItems: "center" }}>
          {loading ? (
            <Skeleton variant="text" width={96} height={44} />
          ) : (
            <Typography
              variant="h4"
              sx={{ fontWeight: 600, lineHeight: "44px", letterSpacing: "-0.02em" }}
            >
              {value}
            </Typography>
          )}
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block",
            height: 18,
            lineHeight: "18px",
            whiteSpace: "nowrap"
          }}>
          {helper}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 40,
          height: 40,
          color: "text.secondary",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
    </Stack>
  </Paper>
);

const AnalyticsSectionHeader: React.FC<AnalyticsSectionHeaderProps> = ({
  title,
}) => (
  <Box sx={{ mb: 2 }}>
    <Typography component="h2" variant="h6" sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
  </Box>
);

// Data transformation function
function transformInteractionsToSessionActivities(
  interactions: Interaction[],
  pdfIdNamePairs: { [key: string]: string } = {},
): SessionActivity[] {
  const sessionMap: { [key: string]: SessionActivity } = {};

  interactions.forEach((interaction) => {
    const sessionKey = `${interaction.userId}-${interaction.sessionId}`;
    const interactionTimestamp = interaction.timestamp;

    if (!sessionMap[sessionKey]) {
      sessionMap[sessionKey] = {
        userId: interaction.userId,
        sessionId: interaction.sessionId,
        sessionStartTime: interactionTimestamp,
        totalWatchTime: 0,
        pdfActions: [],
        codeActions: [],
        chatActions: [],
        otherActions: [],
        weekStart: interactionTimestamp,
      };
    }

    // Categorize by interaction type
    if (interaction.type.startsWith("frontend-interaction-chat")) {
      sessionMap[sessionKey].chatActions.push(interaction as chatAction);
    } else if (interaction.type.startsWith("frontend-interaction-ide")) {
      sessionMap[sessionKey].codeActions.push(interaction as codeAction);
    } else if (interaction.type.startsWith("frontend-interaction-pdf")) {
      sessionMap[sessionKey].pdfActions.push(interaction as pdfAction);
    } else {
      sessionMap[sessionKey].otherActions.push(interaction);
    }

    // Update session start time
    const sessionStartTime = sessionMap[sessionKey].sessionStartTime;
    if (interactionTimestamp < sessionStartTime) {
      sessionMap[sessionKey].sessionStartTime = interactionTimestamp;
    }
  });

  // Calculate total watch time and other stats
  Object.keys(sessionMap).forEach((sessionKey) => {
    const session = sessionMap[sessionKey];
    const allActions = [
      ...session.pdfActions,
      ...session.otherActions,
      ...session.chatActions,
      ...session.codeActions,
    ];

    allActions.sort((a, b) => {
      const timestampA = new Date(a.timestamp).getTime();
      const timestampB = new Date(b.timestamp).getTime();
      return timestampA - timestampB;
    });

    if (allActions.length > 0) {
      const first = allActions[0];
      const last = allActions[allActions.length - 1];
      const firstActionTime = new Date(first.timestamp);
      const lastActionTime = new Date(last.timestamp);
      const totalWatchTimeMs =
        lastActionTime.getTime() - firstActionTime.getTime();
      const totalWatchTime = totalWatchTimeMs / (60 * 60 * 1000);
      sessionMap[sessionKey].totalWatchTime = Math.max(totalWatchTime, 0);
    }
  });

  return Object.values(sessionMap);
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDateTimeIso(dateStr: string, timeStr: string, endOfMinute = false): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const d = new Date(
    year,
    (month as number) - 1,
    day as number,
    hour,
    minute,
    endOfMinute ? 59 : 0,
    endOfMinute ? 999 : 0,
  );
  return d.toISOString();
}

export const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [realDataSessions, setRealDataSessions] = useState<SessionActivity[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataLastUpdated, setDataLastUpdated] = useState<Date | null>(null);
  const topTokenUsersRef = useRef<StandaloneTopTokenUsersHandle>(null);
  const analyticsRequestIdRef = useRef(0);
  const initialLoadStartedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await apiClient.authControllerGetUserRole();
        if (resp.role !== "admin") {
          navigate("/admin/classes", { replace: true });
        }
      } catch {
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate]);

  const [dateStart, setDateStart] = useState<string>(
    () => toDateInputValue(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)),
  );
  const [dateEnd, setDateEnd] = useState<string>(
    () => toDateInputValue(new Date()),
  );
  const [dateStartTime, setDateStartTime] = useState("00:00");
  const [dateEndTime, setDateEndTime] = useState("23:59");

  // Fetch real data
  const loadRealData = async (
    overrideStart?: string,
    overrideEnd?: string,
    overrideStartTime?: string,
    overrideEndTime?: string,
  ) => {
    const requestId = ++analyticsRequestIdRef.current;
    setLoading(true);
    try {
      const startStr = overrideStart ?? dateStart;
      const endStr = overrideEnd ?? dateEnd;
      const startTimeStr = overrideStartTime ?? dateStartTime;
      const endTimeStr = overrideEndTime ?? dateEndTime;

      const startDate = buildDateTimeIso(startStr, startTimeStr);
      const endDate = buildDateTimeIso(endStr, endTimeStr, true);

      const result =
        await apiClient.analyticsControllerPresentDateFilteredInteractions({
          dateFilterRequest: {
            startDate: startDate,
            endDate: endDate,
          },
        });

      const gotInteractions = result as unknown as Interaction[];
      const sessionsActions =
        transformInteractionsToSessionActivities(gotInteractions);
      if (requestId !== analyticsRequestIdRef.current) return;
      setRealDataSessions(sessionsActions);
      setDataLastUpdated(new Date());
    } catch (error) {
      if (requestId !== analyticsRequestIdRef.current) return;
      console.error("Failed to load analytics data:", error);
      setRealDataSessions([]);
    } finally {
      if (requestId === analyticsRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const refreshAllAnalytics = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadRealData(),
        topTokenUsersRef.current?.refresh() ?? Promise.resolve(),
      ]);
      setDataLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  // Load the default range once. Later changes are explicitly applied from the popover.
  useEffect(() => {
    if (initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    void loadRealData(dateStart, dateEnd, dateStartTime, dateEndTime);
  }, []);

  const summary = useMemo(() => {
    const uniqueUsers = new Set(
      realDataSessions.map((session) => session.userId),
    ).size;
    const interactions = realDataSessions.reduce(
      (total, session) =>
        total +
        session.pdfActions.length +
        session.codeActions.length +
        session.chatActions.length +
        session.otherActions.length,
      0,
    );
    const totalHours = realDataSessions.reduce(
      (total, session) => total + session.totalWatchTime,
      0,
    );
    const averageMinutes = realDataSessions.length
      ? Math.round((totalHours * 60) / realDataSessions.length)
      : 0;

    return {
      uniqueUsers,
      interactions,
      averageMinutes,
    };
  }, [realDataSessions]);

  const applyDateRange = (value: AnalyticsDateRangeValue) => {
    setDateStart(value.startDate);
    setDateStartTime(value.startTime);
    setDateEnd(value.endDate);
    setDateEndTime(value.endTime);
    void loadRealData(value.startDate, value.endDate, value.startTime, value.endTime);
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="System Analytics"
        description="Usage and engagement across Kiwi."
        actions={
          <AnalyticsDateRangeControl
            value={{
              startDate: dateStart,
              startTime: dateStartTime,
              endDate: dateEnd,
              endTime: dateEndTime,
            }}
            disabled={loading}
            refreshing={loading || refreshing}
            lastUpdated={dataLastUpdated}
            onApply={applyDateRange}
            onRefresh={refreshAllAnalytics}
          />
        }
      />

      <AnalyticsSectionHeader
        title="Overview"
      />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Active users"
            value={summary.uniqueUsers.toLocaleString()}
            helper="Unique active users"
            icon={<GroupOutlined />}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Sessions"
            value={realDataSessions.length.toLocaleString()}
            helper="Total user sessions"
            icon={<TimelineOutlined />}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Interactions"
            value={summary.interactions.toLocaleString()}
            helper="Total recorded user actions"
            icon={<TouchAppOutlined />}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard
            label="Average session"
            value={`${summary.averageMinutes} min`}
            helper="Mean active time per session"
            icon={<ScheduleOutlined />}
            loading={loading}
          />
        </Grid>
      </Grid>

      <AnalyticsSectionHeader
        title="Activity over time"
      />
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <StandaloneUserActivity
            realDataSessions={realDataSessions}
            loading={loading}
            dateStart={dateStart}
            startTime={dateStartTime}
            dateEnd={dateEnd}
            endTime={dateEndTime}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <StandaloneDailySessions
            realDataSessions={realDataSessions}
            loading={loading}
            dateStart={dateStart}
            startTime={dateStartTime}
            dateEnd={dateEnd}
            endTime={dateEndTime}
          />
        </Grid>
      </Grid>

      <AnalyticsSectionHeader
        title="Product usage"
      />
      <Grid container spacing={3} sx={{ mb: 4, alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 6, lg: 4 }} sx={{ display: "flex" }}>
          <StandaloneTopActions
            realDataSessions={realDataSessions}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }} sx={{ display: "flex" }}>
          <StandaloneUserDuration
            realDataSessions={realDataSessions}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }} sx={{ display: "flex" }}>
          <StandaloneUserEngine
            realDataSessions={realDataSessions}
            loading={loading}
          />
        </Grid>
      </Grid>

      <AnalyticsSectionHeader
        title="Top token users"
      />
      <Grid container spacing={3}>
        <Grid size={12}>
          <StandaloneTopTokenUsers ref={topTokenUsersRef} />
        </Grid>
      </Grid>
    </AdminPage>
  );
};
