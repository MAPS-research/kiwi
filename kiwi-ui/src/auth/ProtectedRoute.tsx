import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.tsx";
import { consentRequired } from "../config/branding";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [checkingOAuthReturn, setCheckingOAuthReturn] = useState(true);

  // Check for OAuth return redirect on mount
  useEffect(() => {
    const returnContextStr = sessionStorage.getItem("mcp_oauth_return");
    if (returnContextStr) {
      try {
        const returnContext = JSON.parse(returnContextStr);
        sessionStorage.removeItem("mcp_oauth_return");

        // Redirect based on stored context
        if (returnContext.returnTo) {
          // Admin flow: redirect to stored path (e.g., /admin/mcp-servers)
          navigate(returnContext.returnTo, { replace: true });
          return;
        } else if (returnContext.classId) {
          // Student flow: redirect back to class/chat
          if (returnContext.pdfId) {
            navigate(`/class/${returnContext.classId}/pdf/${returnContext.pdfId}`, { replace: true });
          } else {
            navigate(`/class/${returnContext.classId}`, { replace: true });
          }
          return;
        }
      } catch (e) {
        console.error("Error parsing OAuth return context:", e);
        sessionStorage.removeItem("mcp_oauth_return");
      }
    }
    setCheckingOAuthReturn(false);
  }, [navigate]);

  // Wait for OAuth check before rendering
  if (checkingOAuthReturn) {
    return null; // Or a loading spinner
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // check for consent
  if (consentRequired() && !user.consent && location.pathname !== "/consent") {
    return <Navigate to="/consent"/>;
  }


  return <>{children}</>;
};

export default ProtectedRoute;
