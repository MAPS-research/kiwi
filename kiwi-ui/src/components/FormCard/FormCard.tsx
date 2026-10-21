import React from "react";
import { Paper } from "@mui/material";

interface FormCardProps {
  children: React.ReactNode;
  /**
   * "glass" and "solid" both draw the sheet now: the glass card on a photo is
   * retired (DESIGN.md, Hand-off: MUI grey and common; TD-19, SF-63). "plain"
   * draws no surface of its own.
   */
  appearance?: "glass" | "solid" | "plain";
}

/**
 * The card a centred auth page (S-08) sits in: a sheet on the canvas with a
 * 1 px edge and the 8 px sheet radius; inline, so it casts no shadow.
 */
const FormCard: React.FC<FormCardProps> = ({ children, appearance = "glass" }) => {
  const isPlain = appearance === "plain";

  return (
    <Paper
      component="main"
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: isPlain ? 420 : "none",
        boxSizing: "border-box",
        py: isPlain ? 0 : "var(--space-6)",
        px: isPlain ? 0 : { xs: "var(--space-5)", sm: "var(--space-6)" },
        borderRadius: isPlain ? 0 : "var(--radius-sheet)",
        border: isPlain ? "none" : "1px solid var(--border)",
        bgcolor: isPlain ? "transparent" : "background.paper",
        boxShadow: "none",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isPlain ? 0 : "var(--space-4)",
      }}
    >
      {children}
    </Paper>
  );
};

export default FormCard;
