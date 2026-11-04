import React, { useState } from "react";
import { PDFViewer } from "../components/PDFViewer/PDFViewer.tsx";
import { Container } from "@mui/material";
import { Navigate, useNavigate } from "react-router-dom";
import apiClient from "../utils/api.ts";
import {
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  FormGroup,
  Typography,
} from "@mui/material";
import { useAuth } from "../auth/AuthContext.tsx";
import { consentFormUrl } from "../config/branding";

export const Consent: React.FC = () => {
  const formUrl = consentFormUrl();
  const todayDate = new Date().toISOString().split("T")[0];
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [text, setText] = useState<string>(todayDate);
  const { user, login } = useAuth();

  const canSubmit = text.trim() !== "" && isChecked;

  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    apiClient.consentControllerUpdateConsentStatus().then(
      () => {
        login({ username: user!.username, consent: true, isAdmin: user!.isAdmin });
        navigate("/");
      },
      (error) => {
        console.error(error);
      }
    );
  };

  if (!formUrl) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <Container>
        {/* The page title and its line in the theme's type roles (no UA bold). */}
        <Typography component="h1" variant="h2" sx={{ mt: 3, mb: 1 }}>Consent Form</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>Please read the document below and accept to continue.</Typography>
      </Container>
      <Container>
        <PDFViewer pdfFile={formUrl} continuous />
      </Container>
      {user!.consent === false && (
        <Container>
          <form onSubmit={handleSubmit} noValidate autoComplete="off">
            <FormGroup sx={{ mb: 2 }}>
              <TextField
                id="date"
                label="Today's date"
                type="date"
                defaultValue={todayDate}
                onChange={(e) => setText(e.target.value)}
                variant="outlined"
                fullWidth
                margin="normal"
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  }
                }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => setIsChecked(e.target.checked)}
                    color="primary"
                  />
                }
                label="I agree to participate"
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!canSubmit}
                sx={{ mt: 2 }}
              >
                Submit
              </Button>
            </FormGroup>
          </form>
        </Container>
      )}
    </div>
  );
};
