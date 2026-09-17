import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.tsx";
import { consentRequired } from "../config/branding";

interface UnprotectedRouteProps {
  children: React.ReactNode;
}

const UnprotectedRoute: React.FC<UnprotectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const token = localStorage.getItem('authToken');

   // check for consent
  if (token && user && consentRequired() && !user.consent && location.pathname !== "/consent") {
    return <Navigate to="/consent" />;
  }
  if (token && user) {
    // Redirect based on user role
    if (user.systemRole === 'instructor' || user.systemRole === 'admin' || user.isAdmin === true) {
      return <Navigate to="/admin" />;
    } else {
      return <Navigate to="/" />;
    }
  }

  return <>{children}</>;
};

export default UnprotectedRoute;
