// components/AuthLayout/AuthLayout.tsx
import React from "react";
import { Box, Container, Typography, useTheme } from "@mui/material";
import InstitutionLogo from "../Brand/InstitutionLogo.tsx";
import { INSTITUTION_NAME } from "../../config/branding";
import KiwiWordmark from "../Brand/KiwiWordmark.tsx";

interface AuthLayoutProps {
  children: React.ReactNode;
  variant?: "centered" | "split";
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, variant = "centered" }) => {
  const theme = useTheme();

  if (variant === "split") {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          "@supports (height: 100dvh)": {
            minHeight: "100dvh",
          },
          boxSizing: "border-box",
          bgcolor: "grey.50",
          p: { xs: 0, md: 5, lg: 6 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 1400,
            minHeight: { xs: "100vh", md: "calc(100vh - 80px)" },
            "@supports (height: 100dvh)": {
              minHeight: { xs: "100dvh", md: "calc(100dvh - 80px)" },
            },
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(380px, 0.86fr) minmax(540px, 1.14fr)" },
            gap: { xs: 0, md: 6, lg: 10 },
          }}
        >
          <Box
            component="aside"
            aria-label="About Kiwi"
            sx={{
              display: { xs: "none", md: "flex" },
              position: "relative",
              minHeight: 640,
              p: { md: 4, lg: 6 },
              overflow: "hidden",
              borderRadius: 4,
              flexDirection: "column",
              justifyContent: "space-between",
              color: "common.white",
              backgroundImage: "linear-gradient(180deg, rgba(24, 10, 34, 0.28) 0%, rgba(24, 10, 34, 0.1) 38%, rgba(24, 10, 34, 0.82) 100%), url('/assets/images/bg-campus-1.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <Box
              sx={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <InstitutionLogo color="common.white" />
              <KiwiWordmark
                component="span"
                data-testid="login-visual-kiwi-wordmark"
                sx={{ color: "common.white", fontSize: "2rem", lineHeight: 1, fontWeight: 700 }}
              />
            </Box>

            <Box sx={{ position: "relative", zIndex: 1, maxWidth: 430 }}>
              <Typography
                component="p"
                sx={{
                  m: 0,
                  fontSize: { md: "1.65rem", lg: "2rem" },
                  lineHeight: 1.3,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                “Learn deeply. Ask freely. Grow with AI.”
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, opacity: 0.82, lineHeight: 1.6 }}>
                {`An AI learning companion built for the ${INSTITUTION_NAME} community.`}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", md: "center" },
              justifyContent: "center",
              px: { xs: 3, sm: 7, lg: 10 },
              py: { xs: 4, sm: 5, md: 7 },
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        "@supports (height: 100dvh)": {
          minHeight: "100dvh",
        },
        boxSizing: "border-box",
        background: `linear-gradient(135deg, ${theme.palette.primary.dark}B8 0%, rgba(20, 13, 30, 0.45) 48%, rgba(20, 13, 30, 0.18) 100%), url('/assets/images/bg-campus.jpg') center/cover no-repeat`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        py: { xs: 3, sm: 5 },
      }}
    >
      <Container maxWidth="xs" sx={{ px: { xs: 2, sm: 3 } }}>
        {children}
      </Container>
    </Box>
  );
};

export default AuthLayout;
