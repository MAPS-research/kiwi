import { Typography, type TypographyProps } from "@mui/material";

const KiwiWordmark = ({ sx, ...props }: Omit<TypographyProps, "children">) => (
  <Typography
    {...props}
    sx={[
      {
        fontFamily: '"Montserrat", sans-serif',
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
