import React from "react";
import { Paper } from "@mui/material";

interface FormCardProps {
  children: React.ReactNode;
  appearance?: "glass" | "solid" | "plain";
}

const FormCard: React.FC<FormCardProps> = ({ children, appearance = "glass" }) => {
  const isSolid = appearance === "solid";
  const isPlain = appearance === "plain";

  return (
    <Paper
      component="main"
      elevation={isPlain ? 0 : isSolid ? 6 : 12}
      sx={{
        width: "100%",
        maxWidth: isPlain ? 420 : "none",
        py: isPlain ? 0 : { xs: 4, sm: 5 },
        px: isPlain ? 0 : { xs: 3, sm: 5 },
        borderRadius: isPlain ? 0 : { xs: 3, sm: 4 },
        border: isSolid ? "1px solid rgba(255, 255, 255, 0.72)" : "none",
        bgcolor: isPlain ? "transparent" : isSolid ? "rgba(255, 255, 255, 0.96)" : "rgba(255, 255, 255, 0.2)",
        backdropFilter: isPlain ? "none" : isSolid ? "blur(20px)" : "blur(12px)",
        boxShadow: isPlain
          ? "none"
          : isSolid
          ? "0 24px 64px rgba(27, 10, 38, 0.28)"
          : 3,
        color: isPlain || isSolid ? "text.primary" : "common.white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isPlain || isSolid ? 0 : 2,
      }}
    >
      {children}
    </Paper>
  );
};

export default FormCard;
