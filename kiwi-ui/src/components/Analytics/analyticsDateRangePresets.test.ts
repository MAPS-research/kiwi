import {
  DEFAULT_ANALYTICS_DATE_RANGE_PRESETS,
  matchesDateRangePreset,
} from "./analyticsDateRangePresets.ts";

describe("analytics date range presets", () => {
  const context = {
    now: new Date("2026-08-19T10:45:00Z"),
    timeZone: "Asia/Shanghai",
  };

  it("resolves relative ranges in the configured time zone", () => {
    const last24Hours = DEFAULT_ANALYTICS_DATE_RANGE_PRESETS.find(
      (preset) => preset.id === "24-hours",
    )!;

    expect(last24Hours.resolve(context)).toEqual({
      startDate: "2026-08-18",
      startTime: "18:45",
      endDate: "2026-08-19",
      endTime: "18:45",
    });
  });

  it("does not match an unrelated historical 24-hour range", () => {
    const last24Hours = DEFAULT_ANALYTICS_DATE_RANGE_PRESETS.find(
      (preset) => preset.id === "24-hours",
    )!;

    expect(matchesDateRangePreset(last24Hours, {
      startDate: "2026-08-10",
      startTime: "06:00",
      endDate: "2026-08-11",
      endTime: "06:00",
    }, context)).toBe(false);
  });
});
