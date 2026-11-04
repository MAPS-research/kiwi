import { Box } from "@mui/material";
import { INSTITUTION_NAME, LOGO_LIGHT_URL, LOGO_URL } from "../../config/branding";

interface InstitutionLogoProps {
  /** Width of the institution's masked wordmark (`VITE_LOGO_LIGHT_URL`). */
  width?: number;
  /** Height of the masked wordmark. */
  height?: number;
}

/** The square mark beside the name: the top bar's 28 px logo (JOURNEY SR-1, block 2). */
const MARK_SIZE = 28;

/**
 * The brand mark of this Kiwi instance: the top bar's logo link and the sign-in
 * page's narrow header (kiwi-ui/DESIGN.md, Hand-off: MUI grey and common).
 *
 * With `VITE_LOGO_LIGHT_URL` set, that asset is masked and painted neutral (G2):
 * black on a light surface, white on a dark one. This is the one file that reads
 * `palette.common`. Without it, the square logo (`LOGO_URL`, Kiwi's own mark by
 * default) is shown as is beside "Kiwi" in the ink (see `src/config/branding.ts`).
 */
const InstitutionLogo = ({ width = 144, height = 32 }: InstitutionLogoProps) =>
  LOGO_LIGHT_URL ? (
    <Box
      component="span"
      role="img"
      aria-label={INSTITUTION_NAME}
      sx={[
        (theme) => ({
          display: "block",
          width,
          height,
          flexShrink: 0,
          backgroundColor: theme.palette.common.black,
          maskImage: `url(${LOGO_LIGHT_URL})`,
          WebkitMaskImage: `url(${LOGO_LIGHT_URL})`,
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskSize: "contain",
          WebkitMaskSize: "contain",
        }),
        (theme) => theme.applyStyles("dark", { backgroundColor: theme.palette.common.white }),
      ]}
    />
  ) : (
    <Box
      component="span"
      role="img"
      aria-label={INSTITUTION_NAME}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        flexShrink: 0,
      }}
    >
      <Box
        component="img"
        src={LOGO_URL}
        alt=""
        width={MARK_SIZE}
        height={MARK_SIZE}
        sx={{ display: "block", width: MARK_SIZE, height: MARK_SIZE, flexShrink: 0 }}
      />
      <Box
        component="span"
        aria-hidden="true"
        sx={{
          color: "var(--text)",
          fontSize: "var(--text-lg)",
          lineHeight: "var(--leading-lg)",
          fontWeight: "var(--weight-semibold)",
          whiteSpace: "nowrap",
        }}
      >
        Kiwi
      </Box>
    </Box>
  );

export default InstitutionLogo;
