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
          // One control: the interactive edge around both halves.
          border: "1px solid var(--border-interactive)",
          borderRadius: "var(--radius-control)",
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
            minHeight: "var(--button-height)",
            borderRadius: 0,
            borderRight: "1px solid var(--border-interactive)",
            color: "var(--icon-default)",
            // Inside the clipped control: the ring is drawn inside the half.
            "&.Mui-focusVisible, &:focus-visible": { outlineOffset: "calc(-1 * var(--size-focus-ring))" },
          }}
        />

        <Button
          aria-label={`Select analytics period: ${rangeLabel}`}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          disabled={disabled}
          endIcon={
            <ExpandMore
              sx={{
                color: "var(--icon-default)",
                transition: "transform var(--motion-micro) var(--motion-ease-toggle)",
                transform: menuAnchor ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          }
          sx={{
            minWidth: 0,
            minHeight: "var(--button-height)",
            flex: 1,
            justifyContent: "space-between",
            px: 1.75,
            color: "text.primary",
            fontWeight: "var(--type-weight-regular)",
            borderRadius: 0,
            whiteSpace: "nowrap",
            "&.Mui-focusVisible, &:focus-visible": { outlineOffset: "calc(-1 * var(--size-focus-ring))" },
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
                width: "var(--icon-button-size)",
                height: "var(--icon-button-size)",
                flexShrink: 0,
                border: "1px solid var(--border-interactive)",
                borderRadius: "var(--radius-control)",
                bgcolor: "background.paper",
                // Bordered: focus recolours its own edge (one frame).
                "&.Mui-focusVisible, &:focus-visible": {
                  outline: "none",
                  borderColor: "var(--focus-ring)",
                  boxShadow: "inset 0 0 0 1px var(--focus-ring)",
                },
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
            // The theme draws the menu sheet: hairline edge, sheet radius, --shadow-1.
            sx: {
              mt: 0.75,
              minWidth: 184,
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
              borderRadius: "var(--radius-small)",
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
