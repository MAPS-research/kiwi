import { Typography, type TypographyProps } from "@mui/material";

/**
 * The Kiwi wordmark: Montserrat 800 italic, the one place that face appears
 * (kiwi-ui/DESIGN.md, Type: the wordmark), read from the --font-wordmark token.
 */
const KiwiWordmark = ({ sx, ...props }: Omit<TypographyProps, "children">) => (
  <Typography
    {...props}
    sx={[
      {
        fontFamily: "var(--font-wordmark)",
        fontStyle: "italic",
        fontWeight: 800,
        letterSpacing: "-0.08em",
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    Kiwi
  </Typography>
);

export default KiwiWordmark;
