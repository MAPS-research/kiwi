import { Box } from "@mui/material";
import { INSTITUTION_NAME, LOGO_LIGHT_URL, LOGO_URL } from "../../config/branding";

interface InstitutionLogoProps {
  color?: string;
  width?: number;
  height?: number;
}

/**
 * Wordmark for the institution running this Kiwi instance.
 *
 * With `VITE_LOGO_LIGHT_URL` set, that asset is masked so it takes the
 * surrounding text colour. Without it, the square logo is shown in full
 * colour next to the name, which follows `color` (see
 * `src/config/branding.ts`).
 */
const InstitutionLogo = ({
  color = "primary.main",
  width = 144,
  height = 32,
}: InstitutionLogoProps) =>
  LOGO_LIGHT_URL ? (
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
  ) : (
    <Box
      component="span"
      role="img"
      aria-label={INSTITUTION_NAME}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: `${Math.round(height * 0.2)}px`,
        width,
        height,
        flexShrink: 0,
        color,
      }}
    >
      <Box
        component="img"
        src={LOGO_URL}
        alt=""
        sx={{ display: "block", width: height, height, flexShrink: 0 }}
      />
      <Box
        component="span"
        aria-hidden="true"
        sx={{ fontSize: height * 0.6, fontWeight: 600, lineHeight: 1 }}
      >
        Kiwi
      </Box>
    </Box>
  );

export default InstitutionLogo;
