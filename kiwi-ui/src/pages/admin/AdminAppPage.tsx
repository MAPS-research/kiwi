/**
 * AdminAppPage - Route handler for rendering a Kiwi App admin panel
 *
 * This component looks up the app by slug and renders one admin panel. The
 * optional class route parameter changes that panel's scope.
 *
 * Slug and class come from the URL — `/admin/app/:appSlug`,
 * `/admin/app/:appSlug/class/:classId`, or `/admin/class/:classID/app/:appSlug`
 * inside the class-admin layout. Both may also be passed as props, but no
 * caller should hardcode a slug: which apps appear is driven by what each app
 * registered.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { kiwiAppsApiClient } from '../../utils/api';
import type { AppUIResponseDto } from '../../services/models';
import AdminAppView from './AdminAppView';

interface AdminAppPageProps {
  /** Overrides the :appSlug route param. */
  appSlug?: string;
  /** Overrides the class route param. */
  classId?: string;
}

export const AdminAppPage: React.FC<AdminAppPageProps> = ({
  appSlug: appSlugProp,
  classId: classIdProp,
}) => {
  const params = useParams<{ appSlug?: string; classId?: string; classID?: string }>();
  const appSlug = appSlugProp ?? params.appSlug;
  // The class-admin routes name the param `classID`; /admin/app/... names it
  // `classId`. Accept either so this works mounted in both places.
  const classId = classIdProp ?? params.classId ?? params.classID;
  const [appUI, setAppUI] = useState<AppUIResponseDto | null>(null);
  const [appName, setAppName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppUI = async () => {
      if (!appSlug) {
        setError('Missing app slug');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get app details first
        const appDetails = await kiwiAppsApiClient.kiwiAppControllerGetApp({
          slug: appSlug,
        });
        setAppName(appDetails.name);

        // Fetch all UIs for the app
        const uis = await kiwiAppsApiClient.kiwiAppControllerGetAppUIs({
          slug: appSlug,
        });

        // Exercise Manager is a single admin surface. A class changes its
        // scope, not which product the user enters. Prefer the same admin-panel
        // UI in both cases and keep class-admin-panel as a compatibility
        // fallback for apps that have not registered a global surface.
        const enabled = uis.filter((ui: AppUIResponseDto) => ui.isEnabled);
        const adminUI =
          enabled.find((ui: AppUIResponseDto) => ui.placement === 'admin-panel') ||
          (classId &&
            enabled.find(
              (ui: AppUIResponseDto) => ui.placement === 'class-admin-panel',
            ));

        if (adminUI) {
          setAppUI(adminUI);
        } else {
          setError(`App "${appSlug}" does not have an admin panel`);
        }
      } catch (err) {
        console.error('Error fetching app UI:', err);
        setError('Failed to load app admin panel');
      } finally {
        setLoading(false);
      }
    };

    fetchAppUI();
  }, [appSlug, classId]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 400,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          Loading admin panel...
        </Typography>
      </Box>
    );
  }

  if (error || !appUI) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 400,
          p: { xs: 2, md: 3 },
        }}
      >
        <Alert severity="error">{error || 'Admin panel not found'}</Alert>
      </Box>
    );
  }

  return (
    <AdminAppView
      appId={appUI.id}
      appSlug={appSlug!}
      uiUrl={appUI.uiUrl}
      uiSlug={appUI.uiSlug}
      appName={appUI.uiName || appName}
      classId={classId}
    />
  );
};

export default AdminAppPage;
