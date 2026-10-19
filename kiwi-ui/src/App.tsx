// React Router
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

// MUI
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// Auth
import { AuthProvider } from "./auth/AuthContext.tsx";
import ProtectedRoute from "./auth/ProtectedRoute.tsx";
import AdminProtectedRoute from "./auth/AdminProtectedRoute.tsx";
import UnprotectedRoute from "./auth/UnprotectedRoute.tsx";

// Pages
import Courses from "./pages/Courses.tsx";
import { Login } from "./pages/Login.tsx";
import { Register } from "./pages/Register.tsx";
import { Logout } from "./pages/Logout.tsx";
import GoogleRedirectHandler from "./pages/GoogleRedirectHandler.tsx";
import MCPAuthorize from "./pages/MCPAuthorize.tsx";
import { Classes } from "./pages/admin/Classes.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import { AddNewClass } from "./pages/admin/AddNewClass.tsx";
import { Materials } from "./pages/admin/Materials.tsx";
import { Analytics } from "./pages/admin/Analytics.tsx";
import { ClassEnroll } from "./pages/admin/ClassEnroll.tsx";
import { SystemWideFeatureFlags } from "./pages/admin/SystemWideFeatureFlags.tsx";
import { ClassSpecificFeatureFlags } from "./pages/admin/ClassSpecificFeatureFlags.tsx";
import { AnnotateDocument } from "./pages/admin/AnnotateDocument.tsx";
import { ClassLayout } from "./pages/admin/ClassLayout.tsx";
import { ClassEdit } from "./pages/admin/ClassEdit.tsx";
import { ClassEmail } from "./pages/admin/ClassEmail.tsx";
import ExperimentList from "./pages/admin/experiments/ExperimentList.tsx";
import ExperimentForm from "./pages/admin/experiments/ExperimentForm.tsx";
import ExperimentDetail from "./pages/admin/experiments/ExperimentDetail.tsx";
import { Consent } from "./pages/Consent.tsx";
import { StudentClassLayout } from "./pages/ClassLayout.tsx";
import { ClassChat } from "./pages/ClassChat.tsx";
import { ClassIDE } from "./pages/ClassIDE.tsx";
import { ClassAppPage } from "./pages/ClassAppPage.tsx";
import UserManagement from "./pages/admin/UserManagement.tsx";
import AdminEmail from "./pages/admin/AdminEmail.tsx";
import { EmailAudit } from "./pages/admin/EmailAudit.tsx";
import { WebhookManagement } from "./pages/admin/WebhookManagement.tsx";
import { WebhookEventApprovals } from "./pages/admin/WebhookEventApprovals.tsx";
import { ClassAnalytics } from "./components/ClassAnalytics/ClassAnalytics.tsx";
import { MCPServerManagement } from "./pages/admin/MCPServerManagement.tsx";
import { ClassMCPSettings } from "./pages/admin/ClassMCPSettings.tsx";
import { ClassKiwiAppsSettings } from "./pages/admin/ClassKiwiAppsSettings.tsx";
import { KiwiAppsAdmin } from "./pages/admin/KiwiAppsAdmin.tsx";
import { AdminAppPage } from "./pages/admin/AdminAppPage.tsx";
import { RootLayout } from "./components/RootLayout.tsx";

const router = createBrowserRouter([
  {
    // Root layout wraps all routes, provides GlobalChatContainer inside router context
    element: <RootLayout />,
    children: [
      // --- Student Routes ---
      {
        path: "/",
    element: (
      <ProtectedRoute>
        <Courses />
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <UnprotectedRoute>
        <Login />
      </UnprotectedRoute>
    ),
  },
  {
    path: "/auth/callback",
    element: (
      <UnprotectedRoute>
        <GoogleRedirectHandler />
      </UnprotectedRoute>
    ),
  },
  {
    path: "/authorize",
    element: <MCPAuthorize />,
  },
  {
    path: "/logout",
    element: (
      <ProtectedRoute>
        <Logout />
      </ProtectedRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <UnprotectedRoute>
        <Register />
      </UnprotectedRoute>
    ),
  },
  {
    path: "/consent",
    element: (
      <ProtectedRoute>
        <Consent />
      </ProtectedRoute>
    ),
  },
  {
    path: "/:classID",
    element: (
      <ProtectedRoute>
        <StudentClassLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ClassChat /> },
      { path: "code", element: <ClassIDE /> },
      { path: "app/:appSlug", element: <ClassAppPage /> },
    ],
  },

      // --- Admin Routes ---
      // AdminLayout is a persistent layout route. Child navigation updates the
      // Outlet without remounting the sidebar or refetching its role/app data.
      {
        path: "/admin",
        element: (
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="classes" replace /> },
          { path: "classes", element: <Classes /> },
          { path: "analytics", element: <Analytics /> },
          {
            path: "email",
            element: <AdminProtectedRoute><AdminEmail /></AdminProtectedRoute>,
          },
          {
            path: "email-audit",
            element: <AdminProtectedRoute><EmailAudit /></AdminProtectedRoute>,
          },
          { path: "feature-flags", element: <SystemWideFeatureFlags /> },
          { path: "new-class", element: <AddNewClass /> },
          { path: "webhooks", element: <WebhookManagement /> },
          { path: "webhooks/approvals", element: <WebhookEventApprovals /> },
          {
            path: "mcp-servers",
            element: <AdminProtectedRoute><MCPServerManagement /></AdminProtectedRoute>,
          },
          {
            path: "kiwi-apps",
            element: <AdminProtectedRoute><KiwiAppsAdmin /></AdminProtectedRoute>,
          },
          { path: "app/:appSlug", element: <AdminAppPage /> },
          { path: "app/:appSlug/class/:classId", element: <AdminAppPage /> },
          { path: "user-management", element: <UserManagement /> },
          {
            path: "class/:classID",
            element: <ClassLayout />,
            children: [
              { index: true, element: <ClassEdit /> },
              { path: "edit-metadata", element: <ClassEdit /> },
              { path: "manage-materials", element: <Materials /> },
              // The batch page merged into the one above; keep the path
              // working for bookmarks and the old sidebar link.
              { path: "batch-upload", element: <Navigate to="../manage-materials" replace /> },
              { path: "feature-flags", element: <ClassSpecificFeatureFlags /> },
              { path: "enroll-students", element: <ClassEnroll /> },
              { path: "send-emails", element: <ClassEmail /> },
              { path: "professor-analytics", element: <ClassAnalytics /> },
              { path: "experiments", element: <ExperimentList /> },
              { path: "experiments/new", element: <ExperimentForm /> },
              { path: "experiments/:experimentId/edit", element: <ExperimentForm /> },
              { path: "experiments/:experimentId", element: <ExperimentDetail /> },
              { path: "mcp-settings", element: <ClassMCPSettings /> },
              { path: "kiwi-apps", element: <ClassKiwiAppsSettings /> },
              { path: "app/:appSlug", element: <AdminAppPage /> },
            ],
          },
          { path: "class/:classID/:materialID/:documentID", element: <AnnotateDocument /> },
          {
            path: "class/:classID/:materialID/:documentID/annotation",
            element: <AnnotateDocument />,
          },
        ],
      },

      // --- Fallback ---
      {
        path: "*",
        element: <div>Not found</div>,
      },
    ],
  },
]);

import theme from "./Theme.ts";
import { darkModeEnabled } from "./config/branding.ts";
import {
  DisplayPreferencesProvider,
  THEME_MODE_STORAGE_KEY,
} from "./theme/displayPreferences.tsx";

// Apps Framework
import { AppRegistryProvider, builtinApps } from "./apps/index.ts";

// Global Chat
import { GlobalChatProvider } from "./context/GlobalChatContext.tsx";

function App() {
  return (
    <AuthProvider>
      <GlobalChatProvider>
        {/* The scheme follows the device until the user picks one in the Display menu;
            before the dark release (VITE_ENABLE_DARK_MODE) the app is always light. */}
        <ThemeProvider
          theme={theme}
          defaultMode={darkModeEnabled() ? "system" : "light"}
          modeStorageKey={THEME_MODE_STORAGE_KEY}
          storageManager={darkModeEnabled() ? undefined : null}
          disableTransitionOnChange
        >
          <CssBaseline />
          <DisplayPreferencesProvider>
            <AppRegistryProvider initialApps={builtinApps}>
              <RouterProvider router={router} />
            </AppRegistryProvider>
          </DisplayPreferencesProvider>
        </ThemeProvider>
      </GlobalChatProvider>
    </AuthProvider>
  );
}

export default App;
