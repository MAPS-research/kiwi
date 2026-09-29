/**
 * ClassAppPage - Route handler for rendering a Kiwi App
 *
 * This component looks up the app by slug and renders it using ClassAppView.
 * Supports multi-UI apps by fetching the appropriate UI for class-tab placement.
 */

import React, { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { classAppsApiClient, kiwiAppsApiClient } from '../utils/api.ts';
import type { ClassAppResponseDto, AppUIResponseDto } from '../services/models/index.ts';
import ClassAppView from './ClassAppView.tsx';
import { ChatContext } from './ClassLayout.tsx';
import { useGlobalChat } from '../context/GlobalChatContext.tsx';

interface AppWithUI {
  app: ClassAppResponseDto;
  ui: AppUIResponseDto | null;
}

export const ClassAppPage: React.FC = () => {
  const { classID, appSlug } = useParams<{ classID: string; appSlug: string }>();
  const { class: myClass } = useContext(ChatContext);
  const {
    setCurrentClassId,
    setActiveTab,
    setActiveAppSlug,
    setActiveAppName,
    setCurrentPdfId,
    setCurrentPdfMaterialType,
    setAppContext,
    setAppPreferredMode,
  } = useGlobalChat();

  const [appData, setAppData] = useState<AppWithUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set active tab to app and update app context
  useEffect(() => {
    setActiveTab('app');
    if (appSlug) {
      setActiveAppSlug(appSlug);
    }
    // Clear PDF context when on app page
    setCurrentPdfId(undefined);
    setCurrentPdfMaterialType(undefined);

    // Cleanup: clear app context and preferred mode when navigating away
    return () => {
      setActiveAppSlug(undefined);
      setActiveAppName(undefined);
      setAppContext(undefined);
      setAppPreferredMode(undefined);
    };
  }, [
    appSlug,
    setActiveTab,
    setActiveAppSlug,
    setCurrentPdfId,
    setCurrentPdfMaterialType,
    setActiveAppName,
    setAppContext,
    setAppPreferredMode,
  ]);

  // Sync class ID to global chat context
  useEffect(() => {
    if (myClass?.classID) {
      setCurrentClassId(myClass.classID);
    }
  }, [myClass?.classID, setCurrentClassId]);

  // Update app name when app data is loaded
  useEffect(() => {
    if (appData) {
      const appName = appData.ui?.uiName || appData.app.tabLabel || appData.app.name;
      setActiveAppName(appName);
    }
  }, [appData, setActiveAppName]);

  useEffect(() => {
    const fetchAppAndUI = async () => {
      if (!classID || !appSlug) {
        setError('Missing class ID or app slug');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch all enabled apps and find the one matching the slug
        const apps = await classAppsApiClient.classKiwiAppControllerGetClassApps({
          classId: classID,
        });

        const foundApp = apps.find((a) => a.slug === appSlug);

        if (!foundApp) {
          setError(`App "${appSlug}" is not enabled for this class`);
          return;
        }

        // Fetch the app's UIs to get the class-tab UI
        let classTabUI: AppUIResponseDto | null = null;
        try {
          const uis = await kiwiAppsApiClient.kiwiAppControllerGetAppUIs({
            slug: appSlug,
          });
          // Find the class-tab UI that is enabled
          classTabUI = uis.find(
            (ui) => ui.placement === 'class-tab' && ui.isEnabled
          ) || null;
        } catch (uiErr) {
          // App might not have UIs registered yet - fallback to baseUrl
          console.debug(`No UIs found for app ${appSlug}, using baseUrl`);
        }

        setAppData({ app: foundApp, ui: classTabUI });
      } catch (err) {
        console.error('Error fetching app:', err);
        setError('Failed to load app');
      } finally {
        setLoading(false);
      }
    };

    fetchAppAndUI();
  }, [classID, appSlug]);

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
          Loading app...
        </Typography>
      </Box>
    );
  }

  if (error || !appData) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 400,
          p: 4,
        }}
      >
        <Alert severity="error">{error || 'App not found'}</Alert>
      </Box>
    );
  }

  const { app, ui } = appData;

  return (
    <ClassAppView
      appId={app.appId}
      appSlug={app.slug}
      // Use uiUrl from the class-tab UI if available, otherwise fallback to baseUrl
      uiUrl={ui?.uiUrl}
      uiSlug={ui?.uiSlug}
      baseUrl={app.baseUrl}
      appName={ui?.uiName || app.tabLabel || app.name}
      capabilities={app.capabilities}
    />
  );
};

export default ClassAppPage;
