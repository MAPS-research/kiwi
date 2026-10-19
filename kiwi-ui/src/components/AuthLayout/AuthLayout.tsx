// components/AuthLayout/AuthLayout.tsx
import React from "react";
import { Box, Container, Typography } from "@mui/material";
import InstitutionLogo from "../Brand/InstitutionLogo.tsx";
import { INSTITUTION_NAME, institutionConfigured } from "../../config/branding";
import KiwiWordmark from "../Brand/KiwiWordmark.tsx";

interface AuthLayoutProps {
  children: React.ReactNode;
  variant?: "centered" | "split";
}

/** The text sits 24 px right of the ruler, 12 px below 600 px (DESIGN.md, Signature move). */
const READING_GUTTER = { xs: "var(--space-3)", sm: "var(--space-reading-gutter)" };

/**
 * The auth shell (JOURNEY SR-5).
 *
 * `split` (sign-in S-05, register S-06; the Stage 1 preview's `main.signin`):
 * from 900 px the aside is a sheet holding one ruled column, the wordmark at
 * the top and what Kiwi does at the bottom, beside the form column; below
 * 900 px there is one column: Kiwi's logo, the form, then the aside's two
 * lines on their own ruler, without the sheet or the wordmark. The page's
 * children are the form column's ruled reading column.
 *
 * `centered` (S-08): the children on the canvas, centred.
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ children, variant = "centered" }) => {
  const hasInstitution = institutionConfigured();

  if (variant === "split") {
    return (
      <Box
        data-density="comfortable"
        sx={{
          minHeight: "100vh",
          "@supports (height: 100dvh)": {
            minHeight: "100dvh",
          },
          boxSizing: "border-box",
          bgcolor: "background.default",
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 1fr)" },
          alignItems: { xs: "start", md: "stretch" },
          gap: { md: "var(--space-6)" },
          p: { xs: "var(--space-6) var(--space-4)", md: "var(--space-6)" },
        }}
      >
        <Box
          component="aside"
          aria-label="About Kiwi"
          sx={{
            order: { xs: 2, md: 0 },
            width: "100%",
            maxWidth: { xs: 480, md: "none" },
            justifySelf: "center",
            boxSizing: "border-box",
            display: "flex",
            mt: { xs: "var(--space-6)", md: 0 },
            // The sheet appears with the second column.
            minHeight: { md: 640 },
            p: { md: "var(--space-7) var(--space-7) var(--space-7) var(--space-6)" },
            bgcolor: { md: "background.paper" },
            border: { md: "1px solid var(--border)" },
            borderRadius: { md: "var(--radius-sheet)" },
          }}
        >
          <Box
            className="kiwi-ruled"
            sx={{
              flex: "1 1 auto",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "var(--space-6)",
              pl: READING_GUTTER,
            }}
          >
            {/* Below 900 px the display line already names Kiwi, so the wordmark is left out. */}
            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: "var(--space-4)" }}>
              {hasInstitution && <InstitutionLogo />}
              <KiwiWordmark
                component="p"
                data-testid="login-visual-kiwi-wordmark"
                sx={{
                  m: 0,
                  pr: "0.08em",
                  color: "var(--accent-text)",
                  fontSize: "var(--text-4xl)",
                  lineHeight: "var(--leading-4xl)",
                }}
              />
            </Box>

            <Box sx={{ maxWidth: "30ch" }}>
              <Typography component="p" variant="h4">
                Ask about your class materials or your code.
              </Typography>
              <Typography component="p" variant="body1" sx={{ mt: "var(--space-3)", color: "text.secondary" }}>
                {hasInstitution
                  ? `Kiwi is an AI tutor for classes at ${INSTITUTION_NAME}.`
                  : "Kiwi is an AI tutor for your classes."}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          component="main"
          sx={{
            width: "100%",
            maxWidth: 480,
            justifySelf: "center",
            alignSelf: { md: "center" },
          }}
        >
          <Box
            data-testid="auth-narrow-logo"
            sx={{ display: { xs: "flex", md: "none" }, mb: "var(--space-6)" }}
          >
            <InstitutionLogo />
          </Box>
          <Box className="kiwi-ruled" sx={{ pl: READING_GUTTER }}>
            {children}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      data-density="comfortable"
      sx={{
        minHeight: "100vh",
        "@supports (height: 100dvh)": {
          minHeight: "100dvh",
        },
        boxSizing: "border-box",
        bgcolor: "background.default",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        py: { xs: "var(--space-5)", sm: "var(--space-7)" },
      }}
    >
      <Container maxWidth="xs" sx={{ px: { xs: "var(--space-4)", sm: "var(--space-5)" } }}>
        {children}
      </Container>
    </Box>
  );
};

export default AuthLayout;
