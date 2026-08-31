import type { SessionActivity } from "./interface.tsx";
import { buildAnalyticsActivitySeries } from "./activityTimeSeries.ts";

function session(userId: string, sessionId: string, sessionStartTime: Date): SessionActivity {
  return {
    userId,
    sessionId,
    sessionStartTime,
    totalWatchTime: 0,
    pdfActions: [],
    codeActions: [],
    chatActions: [],
    otherActions: [],
    weekStart: sessionStartTime,
  };
}

describe("analytics activity time series", () => {
  it("uses hourly buckets for ranges of 24 hours or less", () => {
    const series = buildAnalyticsActivitySeries([
      session("user-1", "session-1", new Date(2026, 7, 19, 14, 10)),
      session("user-1", "session-2", new Date(2026, 7, 19, 14, 40)),
    ], {
      startDate: "2026-08-18",
      startTime: "20:00",
      endDate: "2026-08-19",
      endTime: "19:00",
    });

    expect(series.granularity).toBe("hour");
    const twoPm = series.data.find(
      (point) => new Date(point.timestamp).getHours() === 14,
    );
    expect(twoPm).toMatchObject({ sessions: 2, userLogins: 1 });
  });

  it("keeps daily buckets for longer ranges", () => {
    const series = buildAnalyticsActivitySeries([], {
      startDate: "2026-08-18",
      startTime: "00:00",
      endDate: "2026-08-20",
      endTime: "23:59",
    });

    expect(series.granularity).toBe("day");
    expect(series.data).toHaveLength(3);
  });
});
