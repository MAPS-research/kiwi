import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { useAuth } from "./AuthContext.tsx";
import { consentRequired } from "../config/branding";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // check for consent
  if (consentRequired() && !user.consent && location.pathname !== "/consent") {
    return <Navigate to="/consent" />;
  }

  // Show loading while admin status is being determined
  if (user.isAdmin === undefined) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh"
        }}>
        <CircularProgress />
      </Box>
    );
  }

  // check for admin role
  if (user.isAdmin !== true && user.systemRole !== 'instructor') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;