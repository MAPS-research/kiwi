import { useMediaQuery } from "@mui/material";

export const ANALYTICS_CHART_ANIMATION_DURATION_MS = 1000;

export function useAnalyticsChartAnimation() {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  return {
    animationDuration: ANALYTICS_CHART_ANIMATION_DURATION_MS,
    animationEasing: "ease" as const,
    isAnimationActive: !prefersReducedMotion,
  };
}
