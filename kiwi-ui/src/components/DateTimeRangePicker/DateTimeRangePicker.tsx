import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  Box,
  Button,
  Divider,
  Fade,
  IconButton,
  Popover,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import {
  CalendarMonthOutlined,
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";
import {
  addDays,
  addMonths,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  type Locale,
} from "date-fns";
import { COMPACT_POPUP_TYPOGRAPHY } from "../../theme/compactPopup.ts";
import { POPUP_FADE_DURATION_MS } from "../../theme/motion.ts";

export interface DateTimeRangeValue {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export interface DateTimeRangePickerLabels {
  trigger: string;
  previousMonth: string;
  nextMonth: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  apply: string;
  localTimeZone: (timeZone: string) => string;
}

export interface DateTimeRangePickerProps {
  value: DateTimeRangeValue;
  onApply: (value: DateTimeRangeValue) => void;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  shouldDisableDate?: (date: Date) => boolean;
  locale?: Locale;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  timeZone?: string;
  labels?: Partial<DateTimeRangePickerLabels>;
  triggerIcon?: ReactNode;
  triggerSx?: SxProps<Theme>;
  popoverWidth?: number;
}

const DEFAULT_LABELS: DateTimeRangePickerLabels = {
  trigger: "Choose date range",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  startDate: "Start",
  startTime: "Start time",
  endDate: "End",
  endTime: "End time",
  apply: "Apply",
  localTimeZone: (timeZone) => `Local (${timeZone})`,
};

function toInputDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function parseInputDate(value: string, fallback: Date): Date {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : fallback;
}

function laterDate(left?: string, right?: string): string | undefined {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}

function earlierDate(left?: string, right?: string): string | undefined {
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
}

export const DateTimeRangePicker = ({
  value,
  onApply,
  disabled = false,
  minDate,
  maxDate,
  shouldDisableDate,
  locale,
  weekStartsOn = 0,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  labels: labelsOverride,
  triggerIcon = <CalendarMonthOutlined fontSize="small" />,
  triggerSx,
  popoverWidth = 332,
}: DateTimeRangePickerProps) => {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const labels = { ...DEFAULT_LABELS, ...labelsOverride };
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState<DateTimeRangeValue>(value);
  const initialEnd = parseInputDate(value.endDate, new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(initialEnd));
  const [focusedDay, setFocusedDay] = useState(initialEnd);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const dayButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  const appliedStart = parseInputDate(value.startDate, new Date());
  const draftStart = parseInputDate(draft.startDate, appliedStart);
  const draftEnd = parseInputDate(draft.endDate, draftStart);
  const calendarStart = useMemo(
    () => startOfWeek(startOfMonth(visibleMonth), { weekStartsOn }),
    [visibleMonth, weekStartsOn],
  );
  const calendarDays = useMemo(
    () => Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index)),
    [calendarStart],
  );
  const weekdayDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(calendarStart, index)),
    [calendarStart],
  );

  const isDateDisabled = (date: Date) => {
    const inputDate = toInputDate(date);
    return Boolean(
      (minDate && inputDate < minDate) ||
      (maxDate && inputDate > maxDate) ||
      shouldDisableDate?.(date),
    );
  };

  const invalidRange =
    !draft.startDate ||
    !draft.endDate ||
    !draft.startTime ||
    !draft.endTime ||
    !isValid(parseISO(draft.startDate)) ||
    !isValid(parseISO(draft.endDate)) ||
    Boolean(minDate && (draft.startDate < minDate || draft.endDate < minDate)) ||
    Boolean(maxDate && (draft.startDate > maxDate || draft.endDate > maxDate)) ||
    draft.startDate > draft.endDate ||
    (draft.startDate === draft.endDate && draft.startTime > draft.endTime) ||
    shouldDisableDate?.(draftStart) ||
    shouldDisableDate?.(draftEnd);

  useEffect(() => {
    if (!anchor) return;
    const frame = requestAnimationFrame(() => {
      dayButtonRefs.current.get(toInputDate(focusedDay))?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [anchor, focusedDay, visibleMonth]);

  const openPicker = (event: MouseEvent<HTMLElement>) => {
    const end = parseInputDate(value.endDate, new Date());
    setDraft(value);
    setVisibleMonth(startOfMonth(end));
    setFocusedDay(end);
    setSelectingEnd(false);
    setAnchor(event.currentTarget);
  };

  const selectDay = (day: Date) => {
    if (isDateDisabled(day)) return;
    const nextDate = toInputDate(day);
    if (!selectingEnd) {
      setDraft((current) => ({ ...current, startDate: nextDate, endDate: nextDate }));
      setSelectingEnd(true);
      return;
    }

    setDraft((current) =>
      nextDate < current.startDate
        ? { ...current, startDate: nextDate, endDate: current.startDate }
        : { ...current, endDate: nextDate },
    );
    setSelectingEnd(false);
  };

  const moveFocus = (nextDay: Date) => {
    setFocusedDay(nextDay);
    if (!isSameMonth(nextDay, visibleMonth)) {
      setVisibleMonth(startOfMonth(nextDay));
    }
  };

  const handleDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, day: Date) => {
    let nextDay: Date | null = null;
    switch (event.key) {
      case "ArrowLeft":
        nextDay = addDays(day, -1);
        break;
      case "ArrowRight":
        nextDay = addDays(day, 1);
        break;
      case "ArrowUp":
        nextDay = addDays(day, -7);
        break;
      case "ArrowDown":
        nextDay = addDays(day, 7);
        break;
      case "Home":
        nextDay = startOfWeek(day, { weekStartsOn });
        break;
      case "End":
        nextDay = endOfWeek(day, { weekStartsOn });
        break;
      case "PageUp":
        nextDay = addMonths(day, -1);
        break;
      case "PageDown":
        nextDay = addMonths(day, 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    if (isDateDisabled(nextDay)) return;
    moveFocus(nextDay);
  };

  const applyDraft = () => {
    if (invalidRange) return;
    onApply(draft);
    setAnchor(null);
  };

  return (
    <>
      <IconButton
        aria-label={labels.trigger}
        onClick={openPicker}
        disabled={disabled}
        sx={triggerSx}
      >
        {triggerIcon}
      </IconButton>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        slots={{ transition: Fade }}
        transitionDuration={reduceMotion ? 0 : POPUP_FADE_DURATION_MS}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              // The theme draws the popover sheet: hairline edge, sheet radius, --shadow-1.
              width: { xs: "calc(100vw - 24px)", sm: popoverWidth },
              maxWidth: popoverWidth,
              mt: 0.75,
              overflow: "hidden",
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1
            }}>
            <Typography sx={{ fontWeight: 600, ...COMPACT_POPUP_TYPOGRAPHY.title }}>
              {format(visibleMonth, "MMMM yyyy", { locale })}
            </Typography>
            <Stack direction="row" spacing={0.25}>
              <IconButton
                size="small"
                aria-label={labels.previousMonth}
                onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
                sx={{ width: 32, height: 32 }}
              >
                <ChevronLeft fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label={labels.nextMonth}
                onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
                sx={{ width: 32, height: 32 }}
              >
                <ChevronRight fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <Box
            role="grid"
            aria-label={format(visibleMonth, "MMMM yyyy", { locale })}
            sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
          >
            {weekdayDates.map((date) => (
              <Box
                key={date.toISOString()}
                role="columnheader"
                aria-label={format(date, "EEEE", { locale })}
                sx={{
                  py: 0.625,
                  textAlign: "center",
                  color: "text.secondary",
                  ...COMPACT_POPUP_TYPOGRAPHY.supporting,
                }}
              >
                {format(date, "EEEEE", { locale })}
              </Box>
            ))}
            {calendarDays.map((day) => {
              const dateKey = toInputDate(day);
              const isStart = isSameDay(day, draftStart);
              const isEnd = isSameDay(day, draftEnd);
              const inRange = isAfter(day, draftStart) && isBefore(day, draftEnd);
              const selected = isStart || isEnd;
              const dayDisabled = isDateDisabled(day);

              return (
                <Box
                  key={day.toISOString()}
                  role="gridcell"
                  aria-selected={selected}
                  sx={{
                    position: "relative",
                    display: "grid",
                    placeItems: "center",
                    minWidth: 0,
                    height: 36,
                    // The range band in the selection tint: a flat fill behind the days,
                    // from the middle of the start day to the middle of the end day.
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: isStart ? "50%" : 0,
                      right: isEnd ? "50%" : 0,
                      bgcolor: "var(--selection-bg)",
                      display:
                        !dayDisabled && !(isStart && isEnd) && (isStart || isEnd || inRange)
                          ? "block"
                          : "none",
                    },
                  }}
                >
                  <Button
                    disableRipple
                    ref={(node) => {
                      if (node) dayButtonRefs.current.set(dateKey, node);
                      else dayButtonRefs.current.delete(dateKey);
                    }}
                    aria-label={format(day, "MMMM d, yyyy", { locale })}
                    aria-pressed={selected}
                    disabled={dayDisabled}
                    tabIndex={isSameDay(day, focusedDay) ? 0 : -1}
                    onFocus={() => setFocusedDay(day)}
                    onKeyDown={(event) => handleDayKeyDown(event, day)}
                    onClick={() => selectDay(day)}
                    sx={{
                      minWidth: 36,
                      maxWidth: 36,
                      width: 36,
                      height: 36,
                      aspectRatio: "1 / 1",
                      flex: "0 0 36px",
                      p: 0,
                      borderRadius: "var(--radius-small)",
                      ...COMPACT_POPUP_TYPOGRAPHY.primary,
                      // A selected end is the filled cell: the Soft sage fill, its 1 px
                      // edge and the label on the fill (DESIGN.md, the grey and common hand-off).
                      color: selected
                        ? "var(--accent-on-solid)"
                        : isSameMonth(day, visibleMonth)
                          ? "text.primary"
                          : "text.secondary",
                      bgcolor: selected ? "var(--accent-solid)" : "transparent",
                      border: "1px solid",
                      borderColor: selected ? "var(--accent-solid-border)" : "transparent",
                      boxShadow: "none",
                      "&:hover": {
                        bgcolor: selected ? "var(--accent-solid-hover)" : "action.hover",
                      },
                      // Bordered: focus recolours the day's own edge (one frame).
                      "&.Mui-focusVisible, &:focus-visible": {
                        outline: "none",
                        borderColor: "var(--focus-ring)",
                        boxShadow: "inset 0 0 0 1px var(--focus-ring)",
                      },
                    }}
                  >
                    {format(day, "d", { locale })}
                  </Button>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Divider />

        <Stack spacing={1} sx={{ p: 2 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.6fr) minmax(108px, 1fr)",
              alignItems: "end",
              gap: 1,
            }}
          >
            <TextField
              label={labels.startDate}
              type="date"
              size="small"
              value={draft.startDate}
              onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
              sx={{
                "& .MuiInputBase-input": COMPACT_POPUP_TYPOGRAPHY.primary,
                "& .MuiInputLabel-root": COMPACT_POPUP_TYPOGRAPHY.supporting,
              }}
              slotProps={{
                htmlInput: { min: minDate, max: earlierDate(draft.endDate, maxDate) }
              }}
            />
            <TextField
              type="time"
              size="small"
              value={draft.startTime}
              onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))}
              sx={{
                "& .MuiInputBase-input": COMPACT_POPUP_TYPOGRAPHY.primary,
                "& .MuiInputLabel-root": COMPACT_POPUP_TYPOGRAPHY.supporting,
              }}
              slotProps={{
                htmlInput: { "aria-label": labels.startTime }
              }}
            />
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.6fr) minmax(108px, 1fr)",
              alignItems: "end",
              gap: 1,
            }}
          >
            <TextField
              label={labels.endDate}
              type="date"
              size="small"
              value={draft.endDate}
              onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
              sx={{
                "& .MuiInputBase-input": COMPACT_POPUP_TYPOGRAPHY.primary,
                "& .MuiInputLabel-root": COMPACT_POPUP_TYPOGRAPHY.supporting,
              }}
              slotProps={{
                htmlInput: { min: laterDate(draft.startDate, minDate), max: maxDate }
              }}
            />
            <TextField
              type="time"
              size="small"
              value={draft.endTime}
              onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))}
              sx={{
                "& .MuiInputBase-input": COMPACT_POPUP_TYPOGRAPHY.primary,
                "& .MuiInputLabel-root": COMPACT_POPUP_TYPOGRAPHY.supporting,
              }}
              slotProps={{
                htmlInput: { "aria-label": labels.endTime }
              }}
            />
          </Box>
          <Box sx={{ pt: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              disabled={invalidRange}
              onClick={applyDraft}
              sx={{
                minHeight: 38,
                ...COMPACT_POPUP_TYPOGRAPHY.primary,
              }}
            >
              {labels.apply}
            </Button>
          </Box>
          <Typography
            variant="caption"
            align="center"
            noWrap
            sx={[{
              color: "text.secondary"
            }, COMPACT_POPUP_TYPOGRAPHY.supporting]}>
            {labels.localTimeZone(timeZone)}
          </Typography>
        </Stack>
      </Popover>
    </>
  );
};
