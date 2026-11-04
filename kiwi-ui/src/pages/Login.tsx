import React, { useState, FormEvent, useEffect } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout/AuthLayout.tsx";
import {
  googleLoginEnabled,
  passwordLoginEnabled,
  SUPPORT_EMAIL,
} from "../config/branding";
import KiwiLogo from "../components/Brand/KiwiLogo.tsx";
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

/** The logo slot beside the display line: 96 px from md, 64 px below it (JOURNEY S-05). */
const SIGN_IN_SLOT = {
  xs: "var(--companion-slot-inline)",
  md: "var(--companion-slot-signin)",
};

/**
 * The sign-in failure in words (copy S-05.03, .04, .05 and .16): a refused
 * sign-in, no response, a server error, or the generic line for anything else.
 * The generated client throws a ResponseError (with the response) or a
 * FetchError (no response). A refusal after the credentials were accepted (a
 * later call) is not a wrong password, so it gets the generic line.
 */
const signInErrorMessage = (error: unknown, credentialsAccepted: boolean): string => {
  const failure = error as { name?: string; response?: { status?: number } } | null;
  const status = failure?.response?.status;
  if (typeof status === "number") {
    if (status === 401 && !credentialsAccepted) {
      return "Couldn't sign you in. That email and password don't match. Check both and try again, or ask your administrator to reset your password.";
    }
    if (status >= 500) {
      return `Couldn't sign you in. The server returned an error (${status}). Try again in a moment.`;
    }
  } else if (failure?.name === "FetchError") {
    return "Couldn't sign you in. Kiwi couldn't reach the server. Check your connection, then try again.";
  }
  return "Couldn't sign you in. The server didn't respond as expected. Try again, or ask your administrator if it keeps happening.";
};

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
    let credentialsAccepted = false;

    try {
      const tokenResponse = await apiClientWithoutMiddleWare.authControllerLogin({
        loginDto: { email, password },
      });
      credentialsAccepted = true;
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
      setErrorMessage(signInErrorMessage(error, credentialsAccepted));
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
      {showTimeoutBanner && (
        <Alert severity="warning" sx={{ mb: "var(--space-5)" }}>
          Your session has expired. Please log in again.
        </Alert>
      )}

      <KiwiLogo
        size="var(--companion-slot-signin)"
        sx={{ width: SIGN_IN_SLOT, height: SIGN_IN_SLOT, mb: "var(--space-5)" }}
      />
      <Typography component="h1" variant="display" sx={{ overflowWrap: "anywhere" }}>
        Sign in to{" "}
        <KiwiWordmark
          component="span"
          sx={{
            fontSize: "inherit",
            lineHeight: "inherit",
            color: "var(--accent-text)",
            whiteSpace: "nowrap",
            pr: "0.08em",
          }}
        />
      </Typography>
      <Typography sx={{ mt: "var(--space-2)", color: "text.secondary" }}>
        Use the email address linked to your Kiwi account.
      </Typography>

      <Box sx={{ mt: "var(--space-6)", display: "grid", gap: "var(--space-stack)" }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        {passwordLoginOn && (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "grid", gap: "var(--space-stack)" }}
          >
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
              slotProps={{ inputLabel: { required: false } }}
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
              slotProps={{
                inputLabel: { required: false },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((visible) => !visible)}
                        disabled={isSubmitting}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <CircularProgress size={18} color="inherit" sx={{ mr: "var(--space-2)" }} />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </Box>
        )}

        {passwordLoginOn && googleLoginOn && (
          <Divider sx={{ color: "text.secondary", typography: "body2" }}>or</Divider>
        )}

        {googleLoginOn && <GoogleLoginButton mode="login" appearance="neutral" />}

        {!passwordLoginOn && !googleLoginOn && (
          <Alert severity="warning">
            Sign-in isn&apos;t available right now. No sign-in method is turned on
            for this site.{" "}
            {SUPPORT_EMAIL ? (
              <>
                Contact <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>, or
                ask an administrator.
              </>
            ) : (
              "Ask an administrator."
            )}
          </Alert>
        )}
      </Box>

      <Typography sx={{ mt: "var(--space-6)", color: "text.secondary" }}>
        {googleLoginOn ? (
          <>
            New to Kiwi?{" "}
            <Link component={RouterLink} to="/register">
              Create an account
            </Link>
          </>
        ) : (
          "New to Kiwi? Ask your administrator for an account."
        )}
      </Typography>
    </AuthLayout>
  );
};
