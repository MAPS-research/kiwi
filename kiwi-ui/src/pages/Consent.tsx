import React, { useState } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
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
import { CONSENT_FORM_URL } from "../config/branding";

export const Consent: React.FC = () => {
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

  return (
    <div>
      <Container>
        <Typography variant="h4" component="h1" sx={{ my: 2, fontWeight: "bold" }}>
          Consent Form
        </Typography>
        <Typography sx={{ my: 2 }}>
          Please read the document below and accept to continue.
        </Typography>
      </Container>
      {CONSENT_FORM_URL ? (
        <Container>
          <Worker workerUrl="/assets/pdf.worker.min.js">
            <Viewer theme="dark" fileUrl={CONSENT_FORM_URL} />
          </Worker>
        </Container>
      ) : (
        <Container>
          <Typography sx={{ my: 2 }}>
            No consent document is configured for this deployment. Set
            <code> VITE_CONSENT_FORM_URL </code> to the URL of your
            institution&apos;s form.
          </Typography>
        </Container>
      )}
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
                InputLabelProps={{
                  shrink: true,
                }}
                variant="outlined"
                fullWidth
                margin="normal"
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
