import { Middleware } from "../services/index.ts";
import { apiClientWithoutMiddleWare as apiClient } from "./api.ts";

let refreshingAuthTokenPromise: Promise<boolean> | null = null;

const refreshAuthToken = async () => {
  if (!refreshingAuthTokenPromise) {
    refreshingAuthTokenPromise = (async () => {
      try {
        console.log("Refreshing access token...");
        const accessTokenResponse =
          await apiClient.authControllerRefreshAccessToken();
        const accessToken = accessTokenResponse.accessToken;
        if (accessToken) {
          localStorage.setItem("authToken", accessToken);
        } else {
          // Refresh token expired
          console.log("Refresh token expired");
          return false;
        }
        return !!accessToken;
      } catch (error: any) {
        console.error("Failed to refresh access token:", error);

        if (error.response && error.response.status === 401) {
          // Refresh token has expired
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
          if (!window.location.href.includes("/login")) {
            window.location.href = "/login?sessionExpired=true";
          }
        }

        return false;
      } finally {
        refreshingAuthTokenPromise = null;
      }
    })();
  }
  return refreshingAuthTokenPromise;
};

const handleUnauthorized: Middleware = {
  pre: async ({ fetch, url, init }) => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      localStorage.removeItem("authUser");
      if (!window.location.href.includes("/login")) {
        window.location.href = "/login?timeout=true";
      }
      return;
    }
    // Some generated clients omit auth metadata, so attach the user token
    // here as well. Preserve explicit credentials (such as an app token).
    const headers = new Headers(init.headers);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return { url, init: { ...init, headers } };
  },
  post: async ({ fetch, url, init, response }) => {
    if (response.status === 401) {
      // Prevent endless loop by checking if we've already retried
      if ((init as any)._retry) {
        // We've already retried, logout the user
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        if (!window.location.href.includes("/login")) {
          window.location.href = "/login?timeout=true";
        }
        return response;
      }

      // Mark the request as retried
      (init as any)._retry = true;

      // Try to refresh the token
      const refreshed = await refreshAuthToken();

      if (!refreshed) {
        // Cleanup and Redirect to the login page if refresh fails
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        if (!window.location.href.includes("/login")) {
          window.location.href = "/login?timeout=true";
        }
        return response;
      }

      // If refreshed, retry the original request with new token
      const newToken = localStorage.getItem("authToken");
      if (newToken) {
        const headers = new Headers(init.headers);
        headers.set("Authorization", `Bearer ${newToken}`);
        init.headers = headers;
      }

      // Retry the original request
      const newResponse = await fetch(url, init);
      return newResponse;
    }

    // Handle other responses
    switch (response.status) {
      case 403:
        alert("You do not have permission to perform this action.");
        break;
      case 404:
        alert("The requested resource was not found.");
        break;
      case 409:
        // Conflict error - forward to the catch block
        const errorMessage = await response.text();
        throw new Error(`ConflictException: ${errorMessage}`);
      case 500:
        // Don't block the whole app with a native alert on every 500 — log it
        // and let the calling code decide how to surface it (e.g. a neutral
        // inline "unavailable" state) so a single failing widget doesn't throw
        // a modal dialog over the UI.
        console.error("An internal server error occurred:", response.statusText);
        break;
      default:
        if (!response.ok) {
          console.error(`An error occurred: ${response.statusText}`);
          // if (!window.location.href.includes("/login")) {
          //   window.location.href = "/login?timeout=true";
          // }
        }
        break;
    }

    return response;
  },
};

export default handleUnauthorized;
