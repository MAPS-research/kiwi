import type { ReactNode, SyntheticEvent } from "react";
import { Box, Snackbar, SnackbarContent, type SnackbarCloseReason } from "@mui/material";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import HighlightOffOutlined from "@mui/icons-material/HighlightOffOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";

export type AdminToastSeverity = "success" | "error" | "info";

export interface AdminToastProps {
  open: boolean;
  severity: AdminToastSeverity;
  message: ReactNode;
  onClose: () => void;
}

/** An info or success toast leaves after 6 s, the timer paused while it is hovered or focused (WCAG 2.2.1). */
export const TOAST_AUTO_HIDE_MS = 6000;

const ICON = {
  success: CheckOutlined,
  error: HighlightOffOutlined,
  info: InfoOutlined,
} as const;

/** The toast's text and icon roles: a status label in its -11 colour, a neutral one in the ink. */
const TONE: Record<AdminToastSeverity, { text: string; icon: string }> = {
  success: { text: "var(--toast-success-text)", icon: "var(--toast-success-icon)" },
  error: { text: "var(--toast-error-text)", icon: "var(--toast-error-icon)" },
  info: { text: "var(--toast-text)", icon: "var(--toast-icon)" },
};

/**
 * A toast (DESIGN.md, Toasts): the --surface sheet with a hairline and
 * --shadow-1 that the theme draws for SnackbarContent, bottom right, one at a
 * time; the status icon and label, and Dismiss as a text action. Success and
 * info leave after 6 s unless hovered or focused; an error stays until it is
 * dismissed. A click elsewhere never closes it.
 */
const AdminToast = ({ open, severity, message, onClose }: AdminToastProps) => {
  const Icon = ICON[severity];
  const tone = TONE[severity];

  const handleClose = (_event: Event | SyntheticEvent, reason?: SnackbarCloseReason) => {
    if (reason === "clickaway") return;
    onClose();
  };

  return (
    <Snackbar
      open={open}
      onClose={handleClose}
      autoHideDuration={severity === "error" ? null : TOAST_AUTO_HIDE_MS}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <SnackbarContent
        role={severity === "error" ? "alert" : "status"}
        sx={{
          color: tone.text,
          // One row: icon, label and Dismiss 12 px apart inside the sheet's own padding.
          "& .MuiSnackbarContent-message": { py: 0 },
          "& .MuiSnackbarContent-action": { mr: 0, pl: "var(--space-3)" },
        }}
        message={
          <Box component="span" sx={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Icon aria-hidden sx={{ flexShrink: 0, fontSize: "var(--toast-icon-size)", color: tone.icon }} />
            <span>{message}</span>
          </Box>
        }
        action={
          // The text action (Retry, Dismiss, Undo): underlined at rest, 600, --link on the
          // sheet; a plain button, so the global 2 px ring is its focus frame.
          <Box
            component="button"
            type="button"
            onClick={onClose}
            sx={{
              position: "relative",
              p: 0,
              border: 0,
              bgcolor: "transparent",
              cursor: "pointer",
              color: "var(--toast-action)",
              font: "inherit",
              fontWeight: "var(--weight-semibold)",
              textDecorationLine: "underline",
              textDecorationThickness: "var(--toast-action-underline)",
              textUnderlineOffset: "2px",
              "&:hover": { textDecorationThickness: "var(--toast-action-underline-hover)" },
              // The text action's hit area: its line box with a fine pointer, 44 px with a coarse one.
              "&::before": {
                content: '""',
                position: "absolute",
                left: "50%",
                top: "50%",
                width: "max(100%, var(--toast-action-hit))",
                height: "max(100%, var(--toast-action-hit))",
                transform: "translate(-50%, -50%)",
              },
            }}
          >
            Dismiss
          </Box>
        }
      />
    </Snackbar>
  );
};

export default AdminToast;
