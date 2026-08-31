import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.tsx";
import apiClient from "../utils/api.ts";
import { SUPPORT_EMAIL } from "../config/branding";

const GoogleRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();



  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (token) {
      // store token in localStorage
      localStorage.setItem('authToken', token);
    } else {
      console.error("No token found in the URL");
    }

    const fetchUserProfile = async () => {
      try {
        const response = await apiClient.authControllerGetProfile();
        const email = response.email;
        const consentStatus = await apiClient.consentControllerGetConsentStatus();
        console.log('consent', consentStatus);
        console.log('consent type', typeof consentStatus); // gives string
        const convertedConsentStatus = typeof consentStatus == 'string'? consentStatus === 'true' : consentStatus;
        console.log('converted consent', convertedConsentStatus);
        console.log('converted consent type', typeof convertedConsentStatus); // gives boolean
        
        if (email) {
          // Check user role to determine redirect path
          try {
            const roleResponse = await apiClient.authControllerGetUserRole();
            const systemRole = roleResponse.role || 'user';
            
            login({ id: response.sub, username: email, consent: convertedConsentStatus, isAdmin: undefined, systemRole });

            // Redirect based on role
            if (systemRole === 'instructor' || systemRole === 'admin') {
              console.log(`Redirecting ${systemRole} to admin interface`);
              navigate("/admin");
            } else {
              navigate("/");
            }
          } catch (roleError) {
            console.warn("Failed to fetch role, defaulting to student path");
            login({ id: response.sub, username: email, consent: convertedConsentStatus, isAdmin: undefined, systemRole: 'user' });
            navigate("/");
          }
        } else {
          alert(
            `Cannot get email from Google account.${SUPPORT_EMAIL ? ` Please contact ${SUPPORT_EMAIL}.` : ""}`,
          );
          navigate("/");
        }
      } catch (error) {
        console.error("Error fetching email:", error);
        alert(
          `Login failed.${SUPPORT_EMAIL ? ` Please contact ${SUPPORT_EMAIL}.` : ""}`,
        );
        navigate("/");
      }
    };

    fetchUserProfile();
  }, [location, login, navigate]);


  return <div>Loading...</div>;
};

export default GoogleRedirectHandler;
