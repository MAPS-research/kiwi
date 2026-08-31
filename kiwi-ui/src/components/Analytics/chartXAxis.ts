export const MAX_ANALYTICS_X_AXIS_TICKS = 6;
export const MAX_MOBILE_ANALYTICS_X_AXIS_TICKS = 4;

const MINUTE_MS = 60 * 1000;
const NICE_TIME_INTERVALS = [
  5 * MINUTE_MS,
  10 * MINUTE_MS,
  15 * MINUTE_MS,
  30 * MINUTE_MS,
  60 * MINUTE_MS,
  2 * 60 * MINUTE_MS,
  3 * 60 * MINUTE_MS,
  4 * 60 * MINUTE_MS,
  6 * 60 * MINUTE_MS,
  8 * 60 * MINUTE_MS,
  12 * 60 * MINUTE_MS,
];

interface TimedChartPoint {
  timestamp: number;
}

export function getKeyDateTicks<T extends TimedChartPoint>(
  data: T[],
  maxTicks = MAX_ANALYTICS_X_AXIS_TICKS,
): number[] {
  if (data.length <= 2 || maxTicks <= 0) return [];

  const interiorCount = data.length - 2;
  if (interiorCount <= maxTicks) {
    return data.slice(1, -1).map((point) => point.timestamp);
  }

  const firstTimestamp = data[0].timestamp;
  const lastTimestamp = data[data.length - 1].timestamp;
  const range = lastTimestamp - firstTimestamp;
  if (!Number.isFinite(range) || range <= 0) return [];

  return Array.from(
    { length: maxTicks },
    (_, index) => firstTimestamp + ((index + 1) * range) / (maxTicks + 1),
  );
}

export function formatAnalyticsDateTick(value: string | number): string {
  const date = typeof value === "number"
    ? new Date(value)
    : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getKeyTimeTicks(
  startTimestamp: number,
  endTimestamp: number,
  maxTicks = MAX_ANALYTICS_X_AXIS_TICKS,
): number[] {
  const duration = endTimestamp - startTimestamp;
  if (!Number.isFinite(duration) || duration <= 0 || maxTicks <= 0) return [];

  const targetInterval = duration / (maxTicks + 1);
  const interval = NICE_TIME_INTERVALS.find((candidate) => candidate >= targetInterval) ??
    NICE_TIME_INTERVALS[NICE_TIME_INTERVALS.length - 1];
  const localOffset = new Date(startTimestamp).getTimezoneOffset() * MINUTE_MS;
  const firstTick = Math.ceil((startTimestamp - localOffset) / interval) * interval + localOffset;
  const ticks: number[] = [];
  for (let tick = firstTick; tick < endTimestamp && ticks.length < maxTicks; tick += interval) {
    if (tick > startTimestamp) ticks.push(tick);
  }
  return ticks;
}

export function formatAnalyticsTimeTick(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  if (date.getHours() === 0 && date.getMinutes() === 0) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const options: Intl.DateTimeFormatOptions = { hour: "numeric" };
  if (date.getMinutes() !== 0) options.minute = "2-digit";
  return date.toLocaleTimeString("en-US", options).replace(/\s/g, "").toLowerCase();
}

export function formatAnalyticsTimeTooltip(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
