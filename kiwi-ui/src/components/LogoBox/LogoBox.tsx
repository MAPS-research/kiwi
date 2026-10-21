// components/LogoBox/LogoBox.tsx
import React from "react";
import { Box } from "@mui/material";
import { INSTITUTION_NAME, LOGO_URL } from "../../config/branding";

interface LogoBoxProps {
  size?: number;
}

/**
 * The square logo (`LOGO_URL`) above a centred auth card (S-08), shown as is:
 * no crop and no shadow, so Kiwi's own mark keeps its rounded tile.
 */
const LogoBox: React.FC<LogoBoxProps> = ({ size = 140 }) => {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        mb: "var(--space-3)",
        mx: "auto",
      }}
    >
      <img
        src={LOGO_URL}
        alt={`${INSTITUTION_NAME} logo`}
        height={size}
        width={size}
        style={{ objectFit: "cover" }}
      />
    </Box>
  );
};

export default LogoBox;
