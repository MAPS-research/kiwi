import React, { useState, FormEvent, useEffect } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout/AuthLayout.tsx";
import FormCard from "../components/FormCard/FormCard.tsx";
import InstitutionLogo from "../components/Brand/InstitutionLogo.tsx";
import { googleLoginEnabled, passwordLoginEnabled } from "../config/branding";
import KiwiWordmark from "../components/Brand/KiwiWordmark.tsx";
import { GoogleLoginButton } from "../components/GoogleLoginButton/GoogleLoginButton.tsx";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useAuth } from "../auth/AuthContext.tsx";
import apiClient, { apiClientWithoutMiddleWare } from "../utils/api.ts";

export const Login: React.FC = () => {
  const googleLoginOn = googleLoginEnabled();
  const passwordLoginOn = passwordLoginEnabled();
  const [showTimeoutBanner, setShowTimeoutBanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const tokenResponse = await apiClientWithoutMiddleWare.authControllerLogin({
        loginDto: { email, password },
      });
      if (tokenResponse.accessToken) {
        localStorage.setItem("authToken", tokenResponse.accessToken);
      }

      const profile = await apiClient.authControllerGetProfile();
      console.log("Profile fetched:", profile);
      const consentStatus = await apiClient.consentControllerGetConsentStatus();
      const consent =
        typeof consentStatus === "string"
          ? consentStatus === "true"
          : consentStatus;

      // Check user role to determine redirect path
      try {
        const roleResponse = await apiClient.authControllerGetUserRole();
        const systemRole = roleResponse.role || "user";

        login({
          id: profile.sub,
          username: profile.email ?? email,
          consent,
          isAdmin: undefined,
          systemRole,
        });

        // Redirect based on role
        if (systemRole === "instructor" || systemRole === "admin") {
          console.log(`Redirecting ${systemRole} to admin interface`);
          navigate("/admin");
        } else {
          navigate("/");
        }
      } catch (roleError) {
        console.warn("Failed to fetch role, defaulting to student path");
        login({
          id: profile.sub,
          username: profile.email ?? email,
          consent,
          isAdmin: undefined,
          systemRole: "user",
        });
        navigate("/");
      }
    } catch (error) {
      console.error("Login failed", error);
      setErrorMessage(
        "Login failed. Please check your credentials and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("timeout") === "true") {
      setShowTimeoutBanner(true);
    }
  }, [location]);

  return (
    <AuthLayout variant="split">
      <FormCard appearance="plain">
        {showTimeoutBanner && (
          <Alert
            severity="warning"
            sx={{ width: "100%", mb: 3, borderRadius: 2 }}
          >
            Your session has expired. Please log in again.
          </Alert>
        )}

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
            mt: 0,
            fontSize: { xs: "1.75rem", sm: "2.1rem", md: "2.4rem" },
            lineHeight: 1.15,
            letterSpacing: "-0.035em",
            whiteSpace: { xs: "normal", md: "nowrap" }
          }}>
          Welcome back to{" "}
          <KiwiWordmark
            component="span"
            sx={{ fontSize: "inherit", lineHeight: "inherit" }}
          />
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            textAlign: "left",
            width: "100%",
            mt: 1.5,
            mb: 6,
            lineHeight: 1.6
          }}>
          Continue learning with AI-powered support.
        </Typography>

        {errorMessage && (
          <Alert
            severity="error"
            sx={{ width: "100%", mb: 2.5, borderRadius: 2 }}
          >
            {errorMessage}
          </Alert>
        )}

        {passwordLoginOn && (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 2
            }}>
            <TextField
              id="login-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage(null);
              }}
              autoComplete="email"
              required
              disabled={isSubmitting}
              fullWidth
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "background.paper",
                  borderRadius: 2,
                },
              }}
            />
            <TextField
              id="login-password"
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage(null);
              }}
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              fullWidth
              variant="outlined"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((visible) => !visible)}
                        edge="end"
                        disabled={isSubmitting}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "background.paper",
                  borderRadius: 2,
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={isSubmitting}
              sx={{
                mt: 1,
                minHeight: 48,
                borderRadius: 999,
                fontWeight: 700,
                boxShadow: "none",
                "&:hover": { boxShadow: "none" },
              }}
            >
              {isSubmitting ? (
                <>
                  <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                  Signing in…
                </>
              ) : (
                "Login"
              )}
            </Button>

            {googleLoginOn && (
              <Divider sx={{ my: 1.5, color: "text.secondary", fontSize: 13 }}>
                OR
              </Divider>
            )}
          </Box>
        )}

        {googleLoginOn && (
          <Box sx={{
            width: "100%"
          }}>
            <GoogleLoginButton mode="login" appearance="neutral" />
          </Box>
        )}

        {!passwordLoginOn && !googleLoginOn && (
          <Alert severity="warning" sx={{ width: "100%", borderRadius: 2 }}>
            No sign-in method is enabled. Unset VITE_DISABLE_PASSWORD_LOGIN or
            set VITE_ENABLE_GOOGLE_LOGIN=true.
          </Alert>
        )}

        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            textAlign: "center",
            mt: 4
          }}>
          {googleLoginOn ? (
            <>
              Don&apos;t have an account?{" "}
              <Link
                component={RouterLink}
                to="/register"
                underline="hover"
                sx={{
                  fontWeight: 700
                }}
              >
                Create one
              </Link>
            </>
          ) : (
            <>Need an account? Ask your administrator.</>
          )}
        </Typography>
      </FormCard>
    </AuthLayout>
  );
};
