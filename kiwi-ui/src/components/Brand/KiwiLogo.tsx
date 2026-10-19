import { Box, type SxProps, type Theme } from "@mui/material";

/** The original Kiwi logo: the app icon's rounded tile with the bird's head (the same artwork as favicon.svg). */
export const KIWI_LOGO_URL = "/assets/images/kiwi-mark.svg";

interface KiwiLogoProps {
  /** Rendered size: a number in px, or a CSS length such as "var(--companion-slot-empty)". */
  size: number | string;
  /** Accessible name; leave empty when text beside the logo already names Kiwi. */
  label?: string;
  sx?: SxProps<Theme>;
}

/**
 * Kiwi's own mark at the page placements (the companion v2 decision of
 * 2026-10-18: sign-in, empty and error frames, the class-card fallback, the
 * top bar's fallback). The artwork is used as is: it keeps its own colours and
 * rounded-square edge in both modes, and no circle ever crops it.
 */
const KiwiLogo = ({ size, label = "", sx }: KiwiLogoProps) => (
  <Box
    component="img"
    src={KIWI_LOGO_URL}
    alt={label}
    aria-hidden={label ? undefined : true}
    draggable={false}
    sx={[
      { display: "block", width: size, height: size, flexShrink: 0 },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  />
);

export default KiwiLogo;
