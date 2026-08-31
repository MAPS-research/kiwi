// Visual tokens for the class analytics page. Pure white surfaces with a
// restrained set of deep, low-saturation accent hues. The violet accent remains the
// primary accent; the other hues carry semantic meaning (intent categories,
// stat icons) — color encodes information, never decoration.

export const tokens = {
  ink: "#1a1523", // primary text
  slate: "#64748b", // secondary text
  faint: "#94a3b8", // tertiary text, timestamps
  line: "#eceaf1", // hairline borders
  canvas: "#ffffff", // page background
  paper: "#ffffff", // panels
  hover: "#faf9fc", // row hover wash

  violet: "#5b3a8c", // primary accent
  violetInk: "#43066b",
  violetSoft: "#f6f0fb",
  violetTrack: "#ece2f6",

  // Accent hues — deep and muted, consistent lightness
  indigo: "#3b5bdb",
  indigoSoft: "#edf2ff",
  teal: "#0b7285",
  tealSoft: "#e3fafc",
  orange: "#d9480f",
  orangeSoft: "#fff4e6",
  rose: "#c2255c",
  roseSoft: "#fff0f6",
  grape: "#7048e8",
  grapeSoft: "#f3f0ff",
  gray: "#495057",
  graySoft: "#f1f3f5",

  green: "#2b8a3e",
  greenSoft: "#ebfbee",
  amber: "#946300", // "generating" status text
  red: "#c92a2a", // errors
} as const;

export const mono =
  '"SF Mono", "Roboto Mono", Consolas, "Liberation Mono", monospace';

/** Color assignment for the fixed intent taxonomy (ids from the backend). */
export const intentStyles: Record<string, { color: string; soft: string }> = {
  concept: { color: tokens.indigo, soft: tokens.indigoSoft },
  "answer-seeking": { color: tokens.rose, soft: tokens.roseSoft },
  guidance: { color: tokens.teal, soft: tokens.tealSoft },
  debugging: { color: tokens.orange, soft: tokens.orangeSoft },
  logistics: { color: tokens.gray, soft: tokens.graySoft },
  exploration: { color: tokens.grape, soft: tokens.grapeSoft },
  other: { color: "#868e96", soft: tokens.graySoft },
};

export const intentStyleOf = (id: string) =>
  intentStyles[id] ?? intentStyles.other;
