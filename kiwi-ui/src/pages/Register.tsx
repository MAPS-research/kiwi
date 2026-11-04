import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Link, Typography } from "@mui/material";
import AuthLayout from "../components/AuthLayout/AuthLayout.tsx";
import KiwiLogo from "../components/Brand/KiwiLogo.tsx";
import { GoogleLoginButton } from "../components/GoogleLoginButton/GoogleLoginButton.tsx";
import { googleLoginEnabled, SUPPORT_EMAIL } from "../config/branding";

/** The logo slot beside the display line: 96 px from md, 64 px below it (as on sign-in, JOURNEY S-06). */
const SIGN_IN_SLOT = {
  xs: "var(--companion-slot-inline)",
  md: "var(--companion-slot-signin)",
};

/**
 * Self-service sign-up exists only through Google. Password accounts are
 * created by an administrator (Admin → User Management); there is no
 * email-verification flow. The page shares the sign-in frame (SR-5).
 */
export const Register: React.FC = () => {
  const googleLoginOn = googleLoginEnabled();
  return (
    <AuthLayout variant="split">
      <KiwiLogo
        size="var(--companion-slot-signin)"
        sx={{ width: SIGN_IN_SLOT, height: SIGN_IN_SLOT, mb: "var(--space-5)" }}
      />
      <Typography component="h1" variant="display" sx={{ overflowWrap: "anywhere" }}>
        Create an account
      </Typography>
      <Typography sx={{ mt: "var(--space-2)", color: "text.secondary" }}>
        {googleLoginOn
          ? "Sign up with your Google account."
          : "Accounts are created by your administrator."}
        {!googleLoginOn && SUPPORT_EMAIL && (
          <>
            {" "}Contact{" "}
            <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>{" "}
            to request one.
          </>
        )}
      </Typography>

      {googleLoginOn && (
        <Box sx={{ mt: "var(--space-6)" }}>
          <GoogleLoginButton mode="register" appearance="neutral" />
        </Box>
      )}

      <Typography sx={{ mt: "var(--space-6)", color: "text.secondary" }}>
        Already have an account?{" "}
        <Link component={RouterLink} to="/login">
          Sign in
        </Link>
      </Typography>
    </AuthLayout>
  );
};
