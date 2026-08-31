import {
  formatAnalyticsDateTick,
  formatAnalyticsTimeTick,
  getKeyDateTicks,
  getKeyTimeTicks,
  MAX_MOBILE_ANALYTICS_X_AXIS_TICKS,
} from "./chartXAxis.ts";

const makeData = (length: number) =>
  Array.from({ length }, (_, index) => ({
    fullDate: `2026-08-${String(index + 1).padStart(2, "0")}`,
    timestamp: new Date(2026, 7, index + 1).getTime(),
  }));

describe("analytics chart X axis", () => {
  it("limits long ranges to evenly distributed interior dates", () => {
    const data = makeData(20);
    const ticks = getKeyDateTicks(data, 5);

    expect(ticks).toHaveLength(5);
    expect(ticks).not.toContain(data[0].timestamp);
    expect(ticks).not.toContain(data.at(-1)?.timestamp);
  });

  it("shows at most six dates with the default limit", () => {
    const data = makeData(20);
    const ticks = getKeyDateTicks(data);

    expect(ticks).toHaveLength(6);
    expect(ticks).not.toContain(data[0].timestamp);
    expect(ticks).not.toContain(data.at(-1)?.timestamp);
  });

  it("shows at most four dates with the mobile limit", () => {
    const data = makeData(7);
    const ticks = getKeyDateTicks(data, MAX_MOBILE_ANALYTICS_X_AXIS_TICKS);

    expect(ticks).toHaveLength(4);
    expect(ticks).not.toContain(data[0].timestamp);
    expect(ticks).not.toContain(data.at(-1)?.timestamp);

    const positions = [data[0].timestamp, ...ticks, data.at(-1)!.timestamp];
    const gaps = positions.slice(1).map((value, index) => value - positions[index]);
    gaps.forEach((gap) => expect(gap).toBeCloseTo(gaps[0]));
  });

  it("removes the first and last label from short ranges", () => {
    expect(getKeyDateTicks(makeData(7)).map(formatAnalyticsDateTick)).toEqual([
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
    ].map((date) => formatAnalyticsDateTick(date)));
    expect(getKeyDateTicks(makeData(2))).toEqual([]);
  });

  it("formats ISO dates as compact axis labels", () => {
    expect(formatAnalyticsDateTick("2026-08-19")).toBe("Aug 19");
  });

  it("uses compact clock labels and a date marker at midnight for sub-day ranges", () => {
    const start = new Date(2026, 7, 18, 20).getTime();
    const end = new Date(2026, 7, 19, 19).getTime();
    const ticks = getKeyTimeTicks(start, end);

    expect(ticks.length).toBeLessThanOrEqual(6);
    expect(ticks[0]).toBeGreaterThan(start);
    expect(ticks.at(-1)).toBeLessThan(end);
    expect(ticks.map(formatAnalyticsTimeTick)).toContain("Aug 19");
    expect(formatAnalyticsTimeTick(new Date(2026, 7, 19, 3).getTime())).toBe("3am");
  });

  it("limits sub-day ticks to four on mobile", () => {
    const start = new Date(2026, 7, 18, 20).getTime();
    const end = new Date(2026, 7, 19, 19).getTime();

    expect(getKeyTimeTicks(start, end, MAX_MOBILE_ANALYTICS_X_AXIS_TICKS).length)
      .toBeLessThanOrEqual(4);
  });
});
