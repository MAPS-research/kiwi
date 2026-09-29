import React, { useState, FormEvent } from "react";
// import { useNavigate } from "react-router-dom";
// import "./register.css"; // Update the path as necessary
// import apiClient from "../../utils/api";
// import { useAuth } from "../../auth/AuthContext";
import { GoogleLoginButton } from "../GoogleLoginButton/GoogleLoginButton.tsx";
// import { CodeResponse } from "@react-oauth/google";
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const Register: React.FC = () => {
  // const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // const [message, setMessage] = useState<string | null>(null);
  // const { login } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    // try {
    //   await apiClient.registerPost({
    //     registerPostRequest: {
    //       email: email,
    //       password: password,
    //     },
    //   });

    //   const { consent } = await apiClient.consentGet();

    //   navigate("/chat");
    //   login({ username: email, consent: consent ?? false });
    // } catch (error: any) {
    //   if (error.response && error.response.body) {
    //     const data = await new Response(error.response.body).json();
    //     const { message } = data;
    //     setMessage(message);
    //   } else {
    //     setMessage("An error occurred. Please try again later.");
    //   }
    // }
  };

  return (
    <Grid
      container
      sx={{
        justifyContent: "center",
        alignItems: "center",
        height: "100vh"
      }}>
      <Grid size="grow">
        <Container maxWidth="xs" fixed>
          <Paper elevation={24}>
            <Stack
              spacing={2}
              sx={{
                justifyContent: "center",
                alignItems: "center",
                padding: 2
              }}>
              <Grid>
                <Typography variant="h4">Create an Account.</Typography>
              </Grid>
              {import.meta.env.VITE_DISABLE_PASSWORD_LOGIN !== "true" && (
                <Grid
                  container
                  columnSpacing={1}
                  sx={{
                    justifyContent: "center",
                    alignItems: "center"
                  }}>
                  <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      label="Email"
                      fullWidth
                      helperText="Please enter an imaginary username."
                    />
                    <TextField
                      id="password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      label="Password"
                      fullWidth
                      helperText="Please enter your password."
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      type="submit"
                      value="Register"
                    >
                      Register
                    </Button>
                  </Box>
                  {/* {message && <div className="error-message">{message}</div>} */}
                </Grid>
              )}
              <Grid>
                <GoogleLoginButton mode="register" />
              </Grid>
            </Stack>
          </Paper>
        </Container>
      </Grid>
    </Grid>
  );
};

export default Register;
