import type { SyntheticEvent } from "react";
import { Box, ButtonBase, Snackbar, type SnackbarCloseReason } from "@mui/material";
import InfoOutlined from "@mui/icons-material/InfoOutlined";

/** One value at every breakpoint, so it replaces MUI's own breakpoint offsets for the snackbar root. */
const atEveryWidth = (value: string) => ({ xs: value, sm: value });

/**
 * The text action (DESIGN.md, Text actions): underlined at rest, 600, in the
 * toast's --link; hover and press thicken the underline, press adds the shared
 * scale; the hit area grows to 44 px on coarse pointers. Focus is the global ring.
 */
const TEXT_ACTION = {
  position: "relative",
  font: "inherit",
  fontWeight: "var(--weight-semibold)",
  color: "var(--toast-action)",
  textDecoration: "underline",
  textDecorationThickness: "var(--toast-action-underline)",
  textUnderlineOffset: "2px",
  transition: "transform var(--motion-micro) var(--motion-ease-toggle)",
  "&:hover": { textDecorationThickness: "var(--toast-action-underline-hover)" },
  "&:active": {
    textDecorationThickness: "var(--toast-action-underline-hover)",
    transform: "scale(var(--motion-press-scale))",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "max(100%, var(--toast-action-hit))",
    height: "var(--toast-action-hit)",
    transform: "translate(-50%, -50%)",
  },
} as const;

interface InfoToastProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

/**
 * An info toast (DESIGN.md, Toasts; preview SPEC § 0): a floating sheet at the
 * bottom right of the safe area with the i glyph, the message and Dismiss. It is
 * a status (announced, never focused) and leaves after 6 s; MUI's Snackbar
 * pauses that timer on hover, on focus inside it and while the window is
 * blurred, and closes it on Escape. The sheet itself (surface, border, radius,
 * shadow, type) is the theme's MuiSnackbarContent.
 */
export const InfoToast = ({ open, message, onClose }: InfoToastProps) => {
  const handleClose = (_event: SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
    // WHY: a click elsewhere on the page must not take the notice away (as before).
    if (reason === "clickaway") return;
    onClose();
  };

  return (
    <Snackbar
      open={open}
      onClose={handleClose}
      autoHideDuration={6000}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      // The floating layer is its own region: comfortable wherever it is rendered.
      data-density="comfortable"
      sx={{
        left: atEveryWidth("auto"),
        right: atEveryWidth("calc(var(--toast-offset-x) + env(safe-area-inset-right, 0px))"),
        bottom: atEveryWidth("calc(var(--toast-offset-y) + env(safe-area-inset-bottom, 0px))"),
        // WHY: the width belongs on the fixed root, whose 100% is the viewport, so the
        // sheet is 420 px wide on a desktop and keeps 24 px from both edges on a phone.
        width: "min(100% - 2 * var(--toast-edge-offset), var(--toast-max-width))",
      }}
      slotProps={{ content: { role: "status", sx: { width: "100%" } } }}
      message={
        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <InfoOutlined aria-hidden sx={{ fontSize: "var(--toast-icon-size)", color: "var(--toast-icon)" }} />
          {message}
        </Box>
      }
      action={
        <ButtonBase onClick={onClose} sx={TEXT_ACTION}>
          Dismiss
        </ButtonBase>
      }
    />
  );
};
