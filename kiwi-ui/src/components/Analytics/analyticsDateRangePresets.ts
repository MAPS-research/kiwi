import type { DateTimeRangeValue } from "../DateTimeRangePicker/index.ts";

export interface DateRangePresetContext {
  now: Date;
  timeZone: string;
}

export interface DateRangePreset {
  id: string;
  label: string;
  resolve: (context: DateRangePresetContext) => DateTimeRangeValue;
  matches?: (value: DateTimeRangeValue, context: DateRangePresetContext) => boolean;
}

interface ZonedDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function getZonedParts(date: Date, timeZone: string): ZonedDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  };
}

function formatDate(parts: Pick<ZonedDateTimeParts, "year" | "month" | "day">): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function formatTime(parts: Pick<ZonedDateTimeParts, "hour" | "minute">): string {
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function subtractCalendarDays(
  parts: ZonedDateTimeParts,
  days: number,
): Pick<ZonedDateTimeParts, "year" | "month" | "day"> {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function subtractCalendarMonths(
  parts: ZonedDateTimeParts,
  months: number,
): Pick<ZonedDateTimeParts, "year" | "month" | "day"> {
  const monthIndex = parts.year * 12 + parts.month - 1 - months;
  const year = Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12 + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day: Math.min(parts.day, lastDay) };
}

function valuesEqual(left: DateTimeRangeValue, right: DateTimeRangeValue): boolean {
  return left.startDate === right.startDate &&
    left.startTime === right.startTime &&
    left.endDate === right.endDate &&
    left.endTime === right.endTime;
}

function currentCalendarRange(
  context: DateRangePresetContext,
  amount: number,
  unit: "days" | "months",
): DateTimeRangeValue {
  const end = getZonedParts(context.now, context.timeZone);
  const start = unit === "days"
    ? subtractCalendarDays(end, amount - 1)
    : subtractCalendarMonths(end, amount);
  return {
    startDate: formatDate(start),
    startTime: "00:00",
    endDate: formatDate(end),
    endTime: "23:59",
  };
}

function createCurrentPreset(
  id: string,
  label: string,
  resolve: (context: DateRangePresetContext) => DateTimeRangeValue,
): DateRangePreset {
  return {
    id,
    label,
    resolve,
    matches: (value, context) => valuesEqual(value, resolve(context)),
  };
}

export const DEFAULT_ANALYTICS_DATE_RANGE_PRESETS: readonly DateRangePreset[] = [
  createCurrentPreset("24-hours", "Last 24 Hours", (context) => {
    const start = getZonedParts(
      new Date(context.now.getTime() - 24 * 60 * 60 * 1000),
      context.timeZone,
    );
    const end = getZonedParts(context.now, context.timeZone);
    return {
      startDate: formatDate(start),
      startTime: formatTime(start),
      endDate: formatDate(end),
      endTime: formatTime(end),
    };
  }),
  createCurrentPreset("7-days", "Last 7 Days", (context) =>
    currentCalendarRange(context, 7, "days")),
  createCurrentPreset("30-days", "Last 30 Days", (context) =>
    currentCalendarRange(context, 30, "days")),
  createCurrentPreset("3-months", "Last 3 Months", (context) =>
    currentCalendarRange(context, 3, "months")),
  createCurrentPreset("6-months", "Last 6 Months", (context) =>
    currentCalendarRange(context, 6, "months")),
  createCurrentPreset("12-months", "Last 12 Months", (context) =>
    currentCalendarRange(context, 12, "months")),
];

export function matchesDateRangePreset(
  preset: DateRangePreset,
  value: DateTimeRangeValue,
  context: DateRangePresetContext,
): boolean {
  return preset.matches
    ? preset.matches(value, context)
    : valuesEqual(value, preset.resolve(context));
}

export function dateTimeRangeValuesEqual(
  left: DateTimeRangeValue,
  right: DateTimeRangeValue,
): boolean {
  return valuesEqual(left, right);
}
