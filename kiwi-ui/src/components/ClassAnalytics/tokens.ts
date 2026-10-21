// Style roles of the class analytics page, re-pointed at the Stage 1 design
// tokens (kiwi-ui/DESIGN.md § Design system and § Chart tokens). Every value is a
// CSS custom property, so the page follows data-theme and data-density.
//
// Retired: the violet accent, the seven intent hues, the amber and red literals
// and the monospace counts. Text wears the text tokens; the intent and topic bars
// are one series in --chart-1 (the category is in the label, never in the hue);
// status text uses the status tokens; counts use the UI face with tabular figures.

export const tokens = {
  ink: "var(--text)", // primary text
  slate: "var(--text-secondary)", // secondary text, timestamps
  rule: "var(--border-subtle)", // rules between sections and rows
  edge: "var(--border)", // a panel's hairline
  paper: "var(--surface)", // panels
  hover: "var(--surface-hover)", // row hover
  accentText: "var(--accent-text)", // accent text and links
  icon: "var(--icon-default)",
  bar: "var(--chart-1)", // the one series colour of the intent and topic bars
  inProgress: "var(--in-progress-text)", // "analyzing" notes
  error: "var(--status-error-text)", // errors
} as const;

/** Counts and figures: the UI face with tabular numerals (the monospace counts are retired). */
export const numeric = { fontVariantNumeric: "tabular-nums" } as const;

type TypeRole = "body" | "label" | "caption" | "group-title";

const role = (name: TypeRole) => ({
  fontFamily: `var(--type-${name}-family)`,
  fontSize: `var(--type-${name}-size)`,
  lineHeight: `var(--type-${name}-leading)`,
  fontWeight: `var(--type-${name}-weight)`,
});

const ROLES = {
  /** Reading text (questions, stored answers): 16/24, or 14/20 inside a compact region. */
  body: role("body"),
  /** Chrome text: 14/20 400 in every density (the theme's body2). */
  small: {
    fontFamily: "var(--font-ui)",
    fontSize: "var(--text-sm)",
    lineHeight: "var(--leading-sm)",
    fontWeight: "var(--weight-regular)",
  },
  label: role("label"),
  caption: role("caption"),
  "group-title": role("group-title"),
} as const;

/** A type role of the scale as `sx` properties (`--type-<role>-*`). */
export const typeRole = (name: keyof typeof ROLES) => ROLES[name];
