// components/LogoBox/LogoBox.tsx
import React from "react";
import { Box } from "@mui/material";
import { INSTITUTION_NAME, LOGO_URL } from "../../config/branding";

interface LogoBoxProps {
  size?: number;
}

const LogoBox: React.FC<LogoBoxProps> = ({ size = 140 }) => {
  return (
    <Box
      sx={{
        borderRadius: size >= 120 ? 3 : 2.5,
        overflow: "hidden",
        width: size,
        height: size,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        mb: 1.5,
        mx: "auto",
        boxShadow: size < 120 ? "0 8px 24px rgba(0, 0, 0, 0.18)" : "none",
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
