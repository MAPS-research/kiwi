import { useColorScheme } from "@mui/material/styles";

export type ColorMode = "light" | "dark";

/**
 * The colour mode on screen. With the CSS-variables theme, `theme.palette.mode`
 * is the default scheme's and never changes when the page switches to dark; the
 * scheme on screen is MUI's colour-scheme state, which `data-theme` follows.
 * Outside a theme provider (an isolated test) it is light.
 */
export function useColorMode(): ColorMode {
  const { mode, systemMode } = useColorScheme();
  return (mode === "system" ? systemMode : mode) === "dark" ? "dark" : "light";
}
