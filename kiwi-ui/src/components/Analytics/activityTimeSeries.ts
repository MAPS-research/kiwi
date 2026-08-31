import type { SessionActivity } from "./interface.tsx";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type AnalyticsTimeGranularity = "hour" | "day";

export interface AnalyticsActivityPoint {
  timestamp: number;
  userLogins: number;
  sessions: number;
}

export interface AnalyticsActivitySeries {
  data: AnalyticsActivityPoint[];
  granularity: AnalyticsTimeGranularity;
  startTimestamp: number;
  endTimestamp: number;
}

export interface AnalyticsTimeRange {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

function parseLocalDateTime(dateValue: string, timeValue: string): Date {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildHourlyPoints(startTimestamp: number, endTimestamp: number): AnalyticsActivityPoint[] {
  const intervalCount = Math.ceil((endTimestamp - startTimestamp) / HOUR_MS);
  const timestamps = Array.from(
    { length: intervalCount + 1 },
    (_, index) => Math.min(startTimestamp + index * HOUR_MS, endTimestamp),
  );
  return Array.from(new Set(timestamps)).map((timestamp) => ({
    timestamp,
    userLogins: 0,
    sessions: 0,
  }));
}

function buildDailyPoints(start: Date, end: Date): AnalyticsActivityPoint[] {
  const points: AnalyticsActivityPoint[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (current <= last) {
    points.push({ timestamp: current.getTime(), userLogins: 0, sessions: 0 });
    current.setDate(current.getDate() + 1);
  }
  return points;
}

export function buildAnalyticsActivitySeries(
  sessions: SessionActivity[],
  range: AnalyticsTimeRange,
): AnalyticsActivitySeries {
  const start = parseLocalDateTime(range.startDate, range.startTime);
  const end = parseLocalDateTime(range.endDate, range.endTime);
  const startTimestamp = start.getTime();
  const endTimestamp = end.getTime();
  const duration = endTimestamp - startTimestamp;
  const granularity: AnalyticsTimeGranularity = duration <= DAY_MS ? "hour" : "day";

  if (!Number.isFinite(duration) || duration < 0) {
    return { data: [], granularity, startTimestamp, endTimestamp };
  }

  const data = granularity === "hour"
    ? buildHourlyPoints(startTimestamp, endTimestamp)
    : buildDailyPoints(start, end);
  const usersByBucket = data.map(() => new Set<string>());
  const dailyIndexByKey = granularity === "day"
    ? new Map(data.map((point, index) => [localDateKey(new Date(point.timestamp)), index]))
    : null;

  sessions.forEach((session) => {
    const sessionTimestamp = session.sessionStartTime instanceof Date
      ? session.sessionStartTime.getTime()
      : Date.parse(String(session.sessionStartTime));
    if (!Number.isFinite(sessionTimestamp) || sessionTimestamp < startTimestamp || sessionTimestamp > endTimestamp) {
      return;
    }

    const bucketIndex = granularity === "hour"
      ? Math.min(Math.floor((sessionTimestamp - startTimestamp) / HOUR_MS), data.length - 1)
      : dailyIndexByKey?.get(localDateKey(new Date(sessionTimestamp)));
    if (bucketIndex === undefined || bucketIndex < 0) return;

    data[bucketIndex].sessions += 1;
    usersByBucket[bucketIndex].add(session.userId);
  });

  data.forEach((point, index) => {
    point.userLogins = usersByBucket[index].size;
  });

  return { data, granularity, startTimestamp, endTimestamp };
}
