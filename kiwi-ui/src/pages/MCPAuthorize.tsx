// pages/MCPAuthorize.tsx - MCP OAuth Authorization page
import React, { useState, FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout/AuthLayout.tsx";
import FormCard from "../components/FormCard/FormCard.tsx";
import LogoBox from "../components/LogoBox/LogoBox.tsx";
import { TextField, Button, CircularProgress } from "@mui/material";
import { GoogleLoginButton } from "../components/GoogleLoginButton/GoogleLoginButton.tsx";
import { Box, Typography } from "@mui/material";
import { useAuth } from "../auth/AuthContext.tsx";
import { basePath } from "../utils/api.ts";
import { googleLoginEnabled, passwordLoginEnabled } from "../config/branding";

export const MCPAuthorize: React.FC = () => {
  const googleLoginOn = googleLoginEnabled();
  const passwordLoginOn = passwordLoginEnabled();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if this is a valid MCP OAuth request
  const params = new URLSearchParams(location.search);
  const isOAuthPending = params.get("oauth_pending") === "true";

  // Handle authorization for already logged-in users
  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`${basePath}/auth/oauth-authorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Handle redirect URL from response
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        }
      } else {
        throw new Error('Authorization failed');
      }
    } catch (err) {
      // Fetch errors (like CORS on redirect) mean the authorization likely succeeded
      // The backend completed the authorization and returned a redirect to the callback
      // We just can't follow it due to CORS, so navigate home
      console.log("MCP OAuth authorization completed (redirect blocked by CORS)", err);
      navigate('/');
    }
  };

  // Handle password login for MCP OAuth flow
  const handlePasswordLogin = async (event: FormEvent) => {
    event.preventDefault();
    setIsAuthorizing(true);
    setError(null);

    try {
      // Use form submission to avoid CORS issues with redirects
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${basePath}/auth/oauth-login`;
      form.style.display = 'none';

      const emailInput = document.createElement('input');
      emailInput.type = 'hidden';
      emailInput.name = 'email';
      emailInput.value = email;
      form.appendChild(emailInput);

      const passwordInput = document.createElement('input');
      passwordInput.type = 'hidden';
      passwordInput.name = 'password';
      passwordInput.value = password;
      form.appendChild(passwordInput);

      document.body.appendChild(form);
      form.submit();
      // Form submission will navigate away, no need to handle response
    } catch (err) {
      console.error("MCP OAuth login failed", err);
      const errorMessage = err instanceof Error ? err.message : "Authorization failed";
      setError(errorMessage);
      setIsAuthorizing(false);
    }
  };

  // If not a valid OAuth request, show error
  if (!isOAuthPending) {
    return (
      <AuthLayout>
        <FormCard>
          <LogoBox />
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="h6" color="error">
              Invalid Authorization Request
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              This page is only accessible during an OAuth authorization flow.
            </Typography>
          </Box>
        </FormCard>
      </AuthLayout>
    );
  }

  // Logged-in user: show authorization confirmation
  if (user) {
    return (
      <AuthLayout>
        <FormCard>
          <LogoBox />
          <Box sx={{ textAlign: "center", mt: 2, width: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Authorize Application
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              An application is requesting access to your account.
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
              Signed in as: {user.username}
            </Typography>

            {error && (
              <Box
                sx={{
                  bgcolor: "error.main",
                  color: "error.contrastText",
                  p: 1,
                  borderRadius: 1,
                  mb: 2,
                }}
              >
                <Typography variant="body2">{error}</Typography>
              </Box>
            )}

            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleAuthorize}
              disabled={isAuthorizing}
              sx={{ mb: 2 }}
            >
              {isAuthorizing ? <CircularProgress size={24} color="inherit" /> : "Authorize"}
            </Button>

            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate('/')}
              disabled={isAuthorizing}
            >
              Cancel
            </Button>
          </Box>
        </FormCard>
      </AuthLayout>
    );
  }

  // Logged-out user: show login form
  return (
    <AuthLayout>
      <FormCard>
        <Box
          sx={{
            bgcolor: "info.main",
            color: "info.contrastText",
            p: 1,
            borderRadius: 1,
            mb: 2,
            textAlign: "center",
          }}
        >
          <Typography>
            Sign in to authorize the application to access your account.
          </Typography>
        </Box>

        {error && (
          <Box
            sx={{
              bgcolor: "error.main",
              color: "error.contrastText",
              p: 1,
              borderRadius: 1,
              mb: 2,
              textAlign: "center",
            }}
          >
            <Typography>{error}</Typography>
          </Box>
        )}

        <LogoBox />

        {passwordLoginOn && (
          <Box component="form" onSubmit={handlePasswordLogin} sx={{
            width: "100%"
          }}>
            <TextField
              label="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              fullWidth
              margin="normal"
              variant="outlined"
              disabled={isAuthorizing}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              fullWidth
              margin="normal"
              variant="outlined"
              disabled={isAuthorizing}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
              disabled={isAuthorizing}
            >
              {isAuthorizing ? <CircularProgress size={24} color="inherit" /> : "Login & Authorize"}
            </Button>
          </Box>
        )}

        {googleLoginOn && (
          <Box
            sx={{
              mt: 2,
              width: "100%"
            }}>
            <GoogleLoginButton mode="login" />
          </Box>
        )}
      </FormCard>
    </AuthLayout>
  );
};

export default MCPAuthorize;
