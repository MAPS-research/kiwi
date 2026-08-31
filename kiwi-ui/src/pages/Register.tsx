import React, { FormEvent, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import AuthLayout from "../components/AuthLayout/AuthLayout.tsx";
import FormCard from "../components/FormCard/FormCard.tsx";
import InstitutionLogo from "../components/Brand/InstitutionLogo.tsx";
import { GoogleLoginButton } from "../components/GoogleLoginButton/GoogleLoginButton.tsx";

type RegistrationStep = "email" | "code" | "password";

const stepDetails: Record<RegistrationStep, { index: number; title: string; description: string }> = {
  email: {
    index: 1,
    title: "Create your account",
    description: "Start with your institutional email.",
  },
  code: {
    index: 2,
    title: "Check your email",
    description: "Enter the 6-digit verification code we sent you.",
  },
  password: {
    index: 3,
    title: "Set your password",
    description: "Choose a secure password to finish creating your account.",
  },
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "background.paper",
    borderRadius: 2,
  },
};

const primaryButtonSx = {
  mt: 1,
  minHeight: 48,
  borderRadius: 999,
  fontWeight: 700,
  boxShadow: "none",
  "&:hover": { boxShadow: "none" },
};

const isValidPassword = (password: string): boolean =>
  password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password) && !/\s/.test(password);

const RegistrationProgress = ({ step }: { step: RegistrationStep }) => {
  const currentStep = stepDetails[step].index;

  return (
    <Box
      aria-label={`Registration progress: step ${currentStep} of 3`}
      sx={{ width: "100%", mb: 3 }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        Step {currentStep} of 3
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mt: 1 }}>
        {[1, 2, 3].map((item) => (
          <Box
            key={item}
            aria-hidden="true"
            sx={{
              height: 4,
              borderRadius: 999,
              bgcolor: item <= currentStep ? "primary.main" : "grey.200",
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export const Register: React.FC = () => {
  const [step, setStep] = useState<RegistrationStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    console.log("Mock: Verification code sent to", email);
    setStep("code");
  };

  const handleCodeSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Please enter a 6-digit verification code.");
      return;
    }

    setError(null);
    console.log("Mock: Code verified for", email);
    setStep("password");
  };

  const handleRegisterSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidPassword(password)) {
      setError("Your password does not meet the requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    console.log("Mock: Registered", email, password);
    window.location.href = "/login";
  };

  const updateEmail = (value: string) => {
    setEmail(value);
    setError(null);
  };

  const updateCode = (value: string) => {
    setCode(value.replace(/\D/g, "").slice(0, 6));
    setError(null);
  };

  const passwordRules = [
    { label: "Minimum 8 characters", met: password.length >= 8 },
    { label: "At least one letter", met: /[a-zA-Z]/.test(password) },
    { label: "At least one number", met: /\d/.test(password) },
    { label: "No spaces", met: password.length > 0 && !/\s/.test(password) },
  ];

  const activeStep = stepDetails[step];

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

        <RegistrationProgress step={step} />

        <Typography
          component="h1"
          variant="h3"
          fontWeight={700}
          textAlign="left"
          sx={{
            width: "100%",
            fontSize: { xs: "1.75rem", sm: "2.1rem", md: "2.4rem" },
            lineHeight: 1.15,
            letterSpacing: "-0.035em",
          }}
        >
          {activeStep.title}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="left"
          sx={{ width: "100%", mt: 1.5, mb: 4, lineHeight: 1.6 }}
        >
          {activeStep.description}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: "100%", mb: 2.5, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {step === "email" && (
          <>
            <Box
              component="form"
              noValidate
              onSubmit={handleEmailSubmit}
              sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                id="register-email"
                label="Email"
                type="email"
                value={email}
                onChange={(event) => updateEmail(event.target.value)}
                autoComplete="email"
                required
                fullWidth
                sx={fieldSx}
              />
              <Button type="submit" variant="contained" color="primary" fullWidth sx={primaryButtonSx}>
                Send verification code
              </Button>
            </Box>

            <Divider sx={{ width: "100%", my: 2.5, color: "text.secondary", fontSize: 13 }}>
              OR
            </Divider>
            <Box sx={{ width: "100%" }}>
              <GoogleLoginButton mode="register" appearance="neutral" />
            </Box>
          </>
        )}

        {step === "code" && (
          <Box
            component="form"
            noValidate
            onSubmit={handleCodeSubmit}
            sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              id="register-code"
              label="Verification code"
              value={code}
              onChange={(event) => updateCode(event.target.value)}
              required
              fullWidth
              helperText={`Sent to ${email}`}
              slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 6, pattern: "[0-9]*" } }}
              sx={fieldSx}
            />
            <Button type="submit" variant="contained" color="primary" fullWidth sx={primaryButtonSx}>
              Verify code
            </Button>
            <Button
              type="button"
              variant="text"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              sx={{ minHeight: 44, fontWeight: 600 }}
            >
              Use a different email
            </Button>
          </Box>
        )}

        {step === "password" && (
          <Box
            component="form"
            noValidate
            onSubmit={handleRegisterSubmit}
            sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              id="register-password"
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              autoComplete="new-password"
              required
              fullWidth
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((visible) => !visible)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={fieldSx}
            />
            <TextField
              id="register-confirm-password"
              label="Confirm password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError(null);
              }}
              autoComplete="new-password"
              required
              fullWidth
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        onClick={() => setShowConfirmPassword((visible) => !visible)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={fieldSx}
            />

            <Box
              component="ul"
              sx={{
                m: 0,
                p: 0,
                listStyle: "none",
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                columnGap: 2,
                rowGap: 0.75,
              }}
            >
              {passwordRules.map((rule) => (
                <Box
                  component="li"
                  key={rule.label}
                  aria-label={`${rule.label}: ${rule.met ? "met" : "not met"}`}
                  data-met={rule.met}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    minWidth: 0,
                    color: rule.met ? "primary.main" : "text.secondary",
                  }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 10,
                      height: 10,
                      flexShrink: 0,
                      borderRadius: "50%",
                      border: "1.5px solid",
                      borderColor: rule.met ? "primary.main" : "grey.400",
                      bgcolor: rule.met ? "primary.main" : "transparent",
                    }}
                  />
                  <Typography variant="body2" color="inherit" fontWeight={rule.met ? 600 : 400}>
                    {rule.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Button type="submit" variant="contained" color="primary" fullWidth sx={primaryButtonSx}>
              Create account
            </Button>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ width: "100%", mt: 4 }}>
          Already have an account?{" "}
          <Link component={RouterLink} to="/login" fontWeight={700} underline="hover">
            Login
          </Link>
        </Typography>
      </FormCard>
    </AuthLayout>
  );
};
