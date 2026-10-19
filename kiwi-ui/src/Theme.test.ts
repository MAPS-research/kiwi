import { describe, expect, it } from "vitest";
import type { Theme } from "@mui/material/styles";
import theme, { createKiwiTheme } from "./Theme.ts";
import generated from "./theme/generated/mui-theme.json" with { type: "json" };

/** The generator's chart palette without its note, as the theme carries it. */
const chartOf = (scheme: "light" | "dark") => {
  const { _note: _ignored, ...chart } = generated.colorSchemes[scheme].palette.chart;
  return chart;
};

/** The per-scheme palettes a CSS-variables theme keeps (MUI's Theme type leaves them out). */
const schemesOf = (value: Theme) =>
  (value as unknown as { colorSchemes: Partial<Record<"light" | "dark", { palette: Theme["palette"] }>> })
    .colorSchemes;

/** Purple-era values the design bans everywhere (kiwi-ui/DESIGN.md, Never). */
const BANNED = ["#6a1b9a", "#7b1fa2", "#4a148c", "#9c27b0", "#5c3b6e", "#cf007e", "#ff4e4c", "#e91e63"];

describe("Kiwi theme", () => {
  it("switches colour schemes on the data-theme attribute the token CSS uses", () => {
    const withDark = createKiwiTheme({ dark: true });

    const selector = (withDark as unknown as { getColorSchemeSelector: (scheme: string) => string })
      .getColorSchemeSelector;

    expect(selector("dark")).toBe('[data-theme="dark"] &');
  });

  it("takes its light palette from the generated theme", () => {
    const light = generated.colorSchemes.light.palette;

    expect(theme.palette.primary.main).toBe(light.primary.main);
    expect(theme.palette.text.primary).toBe(light.text.primary);
    expect(theme.palette.background.default).toBe(light.background.default);
    expect(theme.palette.background.paper).toBe(light.background.paper);
    expect(theme.palette.divider).toBe(light.divider);
  });

  it("provides the Phase 6 chart palette in both schemes", () => {
    const withDark = createKiwiTheme({ dark: true });

    expect(theme.palette.chart).toEqual(chartOf("light"));
    expect(schemesOf(withDark).dark?.palette.chart).toEqual(chartOf("dark"));
  });

  it("carries the generated dark palette when the deployment ships dark mode", () => {
    const withDark = createKiwiTheme({ dark: true });

    expect(schemesOf(withDark).dark?.palette.background.default).toBe(
      generated.colorSchemes.dark.palette.background.default
    );
    expect(schemesOf(withDark).dark?.palette.text.primary).toBe(
      generated.colorSchemes.dark.palette.text.primary
    );
  });

  it("stays light until the dark release", () => {
    expect(schemesOf(createKiwiTheme({ dark: false })).dark).toBeUndefined();
  });

  it("keeps the retired purple out of both palettes", () => {
    const palettes = JSON.stringify(schemesOf(createKiwiTheme({ dark: true }))).toLowerCase();

    for (const hex of BANNED) expect(palettes).not.toContain(hex);
  });

  it("drops the generator's notes instead of turning them into CSS variables", () => {
    const palettes = JSON.stringify(schemesOf(createKiwiTheme({ dark: true })));

    expect(palettes).not.toMatch(/"_(note|kiwi|dot)"/);
  });

  it("uses the 6 px control radius from the token", () => {
    expect(theme.shape.borderRadius).toBe(generated.shape.borderRadius);
    expect(theme.shape.borderRadius).toBe(6);
  });

  it("keeps the system's two weights", () => {
    expect(theme.typography.fontWeightRegular).toBe(400);
    expect(theme.typography.fontWeightMedium).toBe(600);
    expect(theme.typography.fontWeightBold).toBe(600);
  });
});
