import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Fade,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { ExpandMore, RefreshOutlined } from "@mui/icons-material";
import { format, isValid, parseISO, type Locale } from "date-fns";
import {
  DateTimeRangePicker,
  type DateTimeRangeValue,
} from "../DateTimeRangePicker/index.ts";
import {
  DEFAULT_ANALYTICS_DATE_RANGE_PRESETS,
  dateTimeRangeValuesEqual,
  matchesDateRangePreset,
  type DateRangePreset,
} from "./analyticsDateRangePresets.ts";
import { COMPACT_POPUP_TYPOGRAPHY } from "../../theme/compactPopup.ts";
import { POPUP_FADE_DURATION_MS } from "../../theme/motion.ts";

export type AnalyticsDateRangeValue = DateTimeRangeValue;
export type { DateRangePreset } from "./analyticsDateRangePresets.ts";

export interface AnalyticsDateRangeControlProps {
  value: AnalyticsDateRangeValue;
  disabled?: boolean;
  refreshing?: boolean;
  lastUpdated?: Date | null;
  presets?: readonly DateRangePreset[];
  now?: Date;
  timeZone?: string;
  locale?: Locale;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  minDate?: string;
  maxDate?: string;
  shouldDisableDate?: (date: Date) => boolean;
  onApply: (value: AnalyticsDateRangeValue) => void;
  onRefresh?: () => void;
}

interface RememberedPreset {
  id: string;
  value: AnalyticsDateRangeValue;
}

function parseInputDate(value: string, fallback: Date): Date {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : fallback;
}

function formatLastUpdated(date: Date, timeZone: string): string {
  try {
    return date.toLocaleString(undefined, { timeZone });
  } catch {
    return date.toLocaleString();
  }
}

export const AnalyticsDateRangeControl = ({
  value,
  disabled = false,
  refreshing = false,
  lastUpdated,
  presets = DEFAULT_ANALYTICS_DATE_RANGE_PRESETS,
  now,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  locale,
  weekStartsOn = 0,
  minDate,
  maxDate,
  shouldDisableDate,
  onApply,
  onRefresh,
}: AnalyticsDateRangeControlProps) => {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [rememberedPreset, setRememberedPreset] = useState<RememberedPreset | null>(null);
  const presetContext = { now: now ?? new Date(), timeZone };
  const selectedPreset =
    rememberedPreset && dateTimeRangeValuesEqual(value, rememberedPreset.value)
      ? presets.find((preset) => preset.id === rememberedPreset.id)
      : presets.find((preset) => matchesDateRangePreset(preset, value, presetContext));

  const appliedStart = parseInputDate(value.startDate, presetContext.now);
  const appliedEnd = parseInputDate(value.endDate, appliedStart);
  const rangeLabel = selectedPreset?.label ??
    `${format(appliedStart, "MMM d", { locale })} – ${format(appliedEnd, "MMM d", { locale })}`;

  const applyCustomRange = (nextValue: AnalyticsDateRangeValue) => {
    setRememberedPreset(null);
    onApply(nextValue);
  };

  const applyPreset = (preset: DateRangePreset) => {
    const nextValue = preset.resolve(presetContext);
    setRememberedPreset({ id: preset.id, value: nextValue });
    onApply(nextValue);
    setMenuAnchor(null);
  };

  return (
    <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
      <Box
        sx={{
          display: "flex",
          minWidth: { xs: 0, sm: 230 },
          flex: { xs: 1, sm: "0 0 auto" },
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <DateTimeRangePicker
          value={value}
          onApply={applyCustomRange}
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
          shouldDisableDate={shouldDisableDate}
          locale={locale}
          weekStartsOn={weekStartsOn}
          timeZone={timeZone}
          labels={{ trigger: "Choose analytics date range" }}
          triggerSx={{
            width: 48,
            minHeight: 44,
            borderRadius: 0,
            borderRight: 1,
            borderColor: "divider",
            color: "text.secondary",
          }}
        />

        <Button
          aria-label={`Select analytics period: ${rangeLabel}`}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          disabled={disabled}
          endIcon={
            <ExpandMore
              sx={{
                transition: "transform 160ms ease",
                transform: menuAnchor ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          }
          sx={{
            minWidth: 0,
            minHeight: 44,
            flex: 1,
            justifyContent: "space-between",
            px: 1.75,
            color: "text.primary",
            fontWeight: 500,
            whiteSpace: "nowrap",
            ...COMPACT_POPUP_TYPOGRAPHY.primary,
          }}
        >
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {rangeLabel}
          </Box>
        </Button>
      </Box>

      {onRefresh && (
        <Tooltip
          title={lastUpdated
            ? `Updated ${formatLastUpdated(lastUpdated, timeZone)}`
            : "Refresh analytics"}
        >
          <span>
            <IconButton
              aria-label="Refresh analytics"
              onClick={onRefresh}
              disabled={disabled || refreshing}
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "background.paper",
                color: "text.secondary",
              }}
            >
              {refreshing ? <CircularProgress size={18} color="inherit" /> : <RefreshOutlined />}
            </IconButton>
          </span>
        </Tooltip>
      )}

      <Menu
        open={Boolean(menuAnchor)}
        anchorEl={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        slots={{ transition: Fade }}
        transitionDuration={reduceMotion ? 0 : POPUP_FADE_DURATION_MS}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              minWidth: 184,
              border: 1,
              borderColor: "divider",
              borderRadius: 1.75,
              boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
            },
          },
        }}
      >
        {presets.map((preset) => (
          <MenuItem
            key={preset.id}
            selected={preset.id === selectedPreset?.id}
            onClick={() => applyPreset(preset)}
            sx={{
              minHeight: 40,
              mx: 0.75,
              my: 0.25,
              borderRadius: 1.25,
              ...COMPACT_POPUP_TYPOGRAPHY.primary,
            }}
          >
            {preset.label}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
};
