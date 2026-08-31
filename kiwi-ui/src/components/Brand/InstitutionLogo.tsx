import { Box } from "@mui/material";
import { INSTITUTION_NAME, LOGO_LIGHT_URL } from "../../config/branding";

interface InstitutionLogoProps {
  color?: string;
  width?: number;
  height?: number;
}

/**
 * Wordmark for the institution running this Kiwi instance.
 *
 * The asset is masked so it takes the surrounding text colour; override it
 * with `VITE_LOGO_LIGHT_URL` (see `src/config/branding.ts`).
 */
const InstitutionLogo = ({
  color = "primary.main",
  width = 144,
  height = 32,
}: InstitutionLogoProps) => (
  <Box
    component="span"
    role="img"
    aria-label={INSTITUTION_NAME}
    sx={{
      display: "block",
      width,
      height,
      flexShrink: 0,
      bgcolor: color,
      maskImage: `url(${LOGO_LIGHT_URL})`,
      WebkitMaskImage: `url(${LOGO_LIGHT_URL})`,
      maskPosition: "center",
      WebkitMaskPosition: "center",
      maskRepeat: "no-repeat",
      WebkitMaskRepeat: "no-repeat",
      maskSize: "contain",
      WebkitMaskSize: "contain",
    }}
  />
);

export default InstitutionLogo;
