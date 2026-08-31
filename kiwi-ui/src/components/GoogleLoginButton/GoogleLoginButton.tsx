import React from "react";
import { Button, type ButtonProps } from "@mui/material";

interface GoogleButtonProps extends Omit<ButtonProps, "children"> {
  mode: "login" | "register";
  appearance?: "primary" | "neutral";
}

const GoogleMark = () => (
  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20H24v8h11.3A12 12 0 0 1 12.7 28L6.2 33A20 20 0 1 0 3.7 16.4l6.6 4.9A12 12 0 0 1 35.3 20z" />
    <path fill="#FF3D00" d="M6.2 15 12.8 20A12 12 0 0 1 32 15l5.7-5.6A20 20 0 0 0 6.2 15z" />
    <path fill="#4CAF50" d="M24 44c5.1 0 9.8-1.9 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z" />
    <path fill="#1976D2" d="M43.6 20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2A20 20 0 0 0 44 24c0-1.3-.1-2.7-.4-4z" />
  </svg>
);

export const GoogleLoginButton: React.FC<GoogleButtonProps> = ({
  mode,
  appearance = "primary",
  sx,
  ...buttonProps
}) => {
  const backendPath =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
  const isNeutral = appearance === "neutral";

  const handleGoogleLogin = () => {
    window.location.href = `${backendPath}/auth?frontend=${window.location.origin}`;
  };

  return (
    <Button
      onClick={handleGoogleLogin}
      fullWidth
      variant={isNeutral ? "outlined" : "contained"}
      color={isNeutral ? "inherit" : "primary"}
      startIcon={isNeutral ? <GoogleMark /> : undefined}
      sx={{
        minHeight: 48,
        fontWeight: 700,
        borderRadius: 999,
        px: 2,
        textTransform: "none",
        letterSpacing: 0.2,
        ...(isNeutral
          ? {
              bgcolor: "background.paper",
              color: "text.primary",
              borderColor: "grey.200",
              boxShadow: "none",
            }
          : { boxShadow: "0 8px 20px rgba(87, 6, 140, 0.2)" }),
        "&:hover": {
          bgcolor: isNeutral ? "grey.50" : undefined,
          borderColor: isNeutral ? "grey.300" : undefined,
          boxShadow: isNeutral ? "none" : "0 10px 24px rgba(87, 6, 140, 0.28)",
        },
        ...sx,
      }}
      {...buttonProps}
    >
      {isNeutral
        ? `Continue with Google`
        : `${mode === "login" ? "Login" : "Register"} with Google`}
    </Button>
  );
};
