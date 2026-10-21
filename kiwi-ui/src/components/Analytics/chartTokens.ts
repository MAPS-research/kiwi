import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";

/**
 * The data colours and chart chrome of kiwi-ui/DESIGN.md § Chart tokens, read
 * from the current colour scheme (useTheme() follows data-theme), so a chart
 * redraws in the dark palette when the scheme changes.
 *
 * - `series1` is the one colour of every single-series chart; categories take
 *   series1–series5 in that fixed order (never cycled), and "Other" or
 *   "Unknown" take `other`.
 * - Ticks and labels wear `tickText` at the caption size; gridlines are solid
 *   `grid` hairlines; the zero line is `baseline`; the plot sits on `plot`.
 */

/** --type-caption-size (0.75rem): ticks and chart labels. */
export const CHART_TICK_FONT_SIZE = 12;
/** A bar is at most 24 px thick and square at both ends. */
export const CHART_MAX_BAR_SIZE = 24;
/** Donut slices are separated by a 2 px gap in the plot colour, never an outline. */
export const CHART_SLICE_GAP = 2;

interface ChartColours {
  series1: string;
  series2: string;
  series3: string;
  series4: string;
  series5: string;
  other: string;
  grid: string;
  baseline: string;
  tickText: string;
  plot: string;
}

export interface ChartTokens extends ChartColours {
  /** Props for a Recharts axis `tick`. */
  tick: { fontSize: number; fill: string };
  /** The hover band behind a bar under the pointer. */
  cursorFill: string;
}

// Outside the app's ThemeProvider (an isolated test or story) the tokens still resolve.
const CSS_FALLBACK: ChartColours = {
  series1: "var(--chart-1)",
  series2: "var(--chart-2)",
  series3: "var(--chart-3)",
  series4: "var(--chart-4)",
  series5: "var(--chart-5)",
  other: "var(--chart-other)",
  grid: "var(--chart-grid)",
  baseline: "var(--chart-baseline)",
  tickText: "var(--chart-tick-text)",
  plot: "var(--chart-plot)",
};

export function useChartTokens(): ChartTokens {
  const { palette } = useTheme();
  const themed: ChartColours | undefined = palette.chart;
  const hover = palette.action?.hover;
  return useMemo(() => {
    const chart = themed ?? CSS_FALLBACK;
    return {
      series1: chart.series1,
      series2: chart.series2,
      series3: chart.series3,
      series4: chart.series4,
      series5: chart.series5,
      other: chart.other,
      grid: chart.grid,
      baseline: chart.baseline,
      tickText: chart.tickText,
      plot: chart.plot,
      tick: { fontSize: CHART_TICK_FONT_SIZE, fill: chart.tickText },
      cursorFill: themed && hover ? hover : "var(--surface-hover)",
    };
  }, [themed, hover]);
}
