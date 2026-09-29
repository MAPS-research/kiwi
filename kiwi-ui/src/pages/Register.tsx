import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Link, Typography } from "@mui/material";
import AuthLayout from "../components/AuthLayout/AuthLayout.tsx";
import FormCard from "../components/FormCard/FormCard.tsx";
import InstitutionLogo from "../components/Brand/InstitutionLogo.tsx";
import { GoogleLoginButton } from "../components/GoogleLoginButton/GoogleLoginButton.tsx";
import { googleLoginEnabled, SUPPORT_EMAIL } from "../config/branding";

/**
 * Self-service sign-up exists only through Google. Password accounts are
 * created by an administrator (Admin → User Management); there is no
 * email-verification flow.
 */
export const Register: React.FC = () => {
  const googleLoginOn = googleLoginEnabled();
  return (
    <AuthLayout variant="split">
      <FormCard appearance="plain">
        <Box
          sx={{
            width: "100%",
            display: { xs: "flex", md: "none" },
            justifyContent: "flex-start",
            mb: 2,
          }}
        >
          <InstitutionLogo width={124} height={28} />
        </Box>

        <Typography
          component="h1"
          variant="h3"
          sx={{
            fontWeight: 700,
            textAlign: "left",
            width: "100%",
            fontSize: { xs: "1.75rem", sm: "2.1rem", md: "2.4rem" },
            lineHeight: 1.15,
            letterSpacing: "-0.035em",
          }}
        >
          Create your account
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            textAlign: "left",
            width: "100%",
            mt: 1.5,
            mb: 4,
            lineHeight: 1.6,
          }}
        >
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
          <Box sx={{ width: "100%" }}>
            <GoogleLoginButton mode="register" appearance="neutral" />
          </Box>
        )}

        <Typography
          variant="body2"
          sx={{ color: "text.secondary", textAlign: "center", mt: 4 }}
        >
          Already have an account?{" "}
          <Link
            component={RouterLink}
            to="/login"
            underline="hover"
            sx={{ fontWeight: 700 }}
          >
            Log in
          </Link>
        </Typography>
      </FormCard>
    </AuthLayout>
  );
};
