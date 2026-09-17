/**
 * AdminAppView - Renders an external Kiwi App in an iframe for admin/faculty context
 *
 * Similar to ClassAppView but designed for admin-panel placement.
 * Used for app management UIs, analytics dashboards, etc.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, IconButton, Paper, Typography } from '@mui/material';
import {
  AppsOutlined as AppsIcon,
  RefreshOutlined as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';
import apiClient, {
  classAppsApiClient,
  kiwiAppsApiClient,
  permissionsApiClient,
} from '../../utils/api';
import type { RequestAppTokenDto } from '../../services/models';
import { useAdminNavigation } from '../../context/AdminNavigationContext.tsx';
import {
  ADMIN_NAVIGATE_MESSAGE,
  ADMIN_NAVIGATION_MESSAGE,
  isAppEnabledForClass,
  parseAppAdminNavigation,
} from '../../apps/adminNavigation.ts';

interface AdminAppViewProps {
  appId: string;
  appSlug: string;
  /** UI URL for the admin panel */
  uiUrl: string;
  /** UI slug for multi-UI apps */
  uiSlug?: string;
  appName: string;
  /** Optional class ID if viewing admin panel for a specific class */
  classId?: string;
}

export const AdminAppView: React.FC<AdminAppViewProps> = ({
  appId,
  appSlug,
  uiUrl,
  uiSlug,
  appName,
  classId,
}) => {
  const { classID: routeClassId } = useParams<{ classID?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setAppNavigation } = useAdminNavigation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // App-token cache. Unlike ClassAppView's host-held token (which never leaves
  // the host and is only used to proxy kiwi:apiRequest), this one IS handed to
  // the app — the codegen admin UI calls its own service with it. We still cache
  // and single-flight so a burst of kiwi:requestToken causes one mint.
  const appTokenCache = useRef<{ token: string; scopes: string[]; exp: number } | null>(null);
  const appTokenInflight = useRef<Promise<{ token: string; scopes: string[]; exp: number }> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The real user UUID (JWT `sub`). `user.username` is NOT this — sending it
  // broke every service that keys on user id.
  const [userId, setUserId] = useState<string | null>(user?.id || null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [resolvedRoleContextKey, setResolvedRoleContextKey] = useState<string | null>(null);
  const [classAppCheck, setClassAppCheck] = useState<{
    key: string;
    status: 'enabled' | 'not-enabled' | 'unknown';
  } | null>(null);

  // Use classId prop or route param
  const effectiveClassId = classId || routeClassId;
  const classAppKey = `${effectiveClassId ?? 'global'}:${appSlug}`;
  const classAppStatus = !effectiveClassId
    ? 'enabled'
    : classAppCheck?.key === classAppKey
      ? classAppCheck.status
      : 'checking';
  const roleContextKey = `${effectiveClassId ?? 'global'}:${userId ?? 'pending-user'}`;
  const isSystemAdmin = user?.systemRole === 'admin' || user?.isAdmin === true;
  const appContextReady = Boolean(
    userId &&
      resolvedRoleContextKey === roleContextKey &&
      (classAppStatus === 'enabled' || classAppStatus === 'unknown'),
  );

  useEffect(() => {
    if (!effectiveClassId) return;
    let cancelled = false;

    const checkClassApp = async () => {
      try {
        const apps = await classAppsApiClient.classKiwiAppControllerGetClassApps({
          classId: effectiveClassId,
        });
        if (!cancelled) {
          setClassAppCheck({
            key: classAppKey,
            status: isAppEnabledForClass(apps, appSlug)
              ? 'enabled'
              : 'not-enabled',
          });
        }
      } catch (err) {
        // A temporary availability-check failure should not become a false
        // "not enabled" result. Let token minting remain the fallback check.
        console.warn('[AdminAppView] Could not check class app status:', err);
        if (!cancelled) {
          setClassAppCheck({ key: classAppKey, status: 'unknown' });
        }
      }
    };

    checkClassApp();
    return () => {
      cancelled = true;
    };
  }, [appSlug, classAppKey, effectiveClassId]);

  // Fetch the user UUID from the profile when the stored session predates it.
  // Mirrors ClassAppView.tsx:86-102.
  useEffect(() => {
    const fetchUserId = async () => {
      if (userId) return;
      if (!user?.username) return;
      try {
        const profile = await apiClient.authControllerGetProfile();
        if (profile.sub) setUserId(profile.sub);
      } catch (err) {
        console.warn('[AdminAppView] Could not fetch user ID from profile:', err);
      }
    };
    fetchUserId();
  }, [user?.username, userId]);

  // Resolve the role we advertise to the app. In a class, use the real class
  // role; without one, only a system admin can be here at all (the classless
  // token mint enforces that server-side), so 'admin' is the honest answer.
  useEffect(() => {
    let cancelled = false;

    const fetchUserRole = async () => {
      setResolvedRoleContextKey(null);

      // A system admin is an admin in every class. Resolve this locally so a
      // fast iframe cannot receive a transient null role while a redundant
      // class-role request is still in flight. The app token remains the
      // server-side authority for actual access.
      if (isSystemAdmin) {
        setUserRole('admin');
        setResolvedRoleContextKey(roleContextKey);
        return;
      }

      if (!effectiveClassId) {
        setUserRole(null);
        setResolvedRoleContextKey(roleContextKey);
        return;
      }
      if (!userId) return;
      try {
        const response = await permissionsApiClient.permissionsControllerGetUserClassRole({
          userId,
          classId: effectiveClassId,
        });
        if (!cancelled) setUserRole(response.role || null);
      } catch (err) {
        console.warn('[AdminAppView] Could not fetch user role:', err);
        if (!cancelled) setUserRole(null);
      } finally {
        if (!cancelled) setResolvedRoleContextKey(roleContextKey);
      }
    };
    fetchUserRole();

    return () => {
      cancelled = true;
    };
  }, [effectiveClassId, isSystemAdmin, roleContextKey, userId]);

  // Construct the iframe URL with context parameters
  const iframeSrc = React.useMemo(() => {
    if (!uiUrl) return '';
    const url = new URL(uiUrl);
    url.searchParams.set('appId', appId);
    url.searchParams.set('userId', userId || '');
    url.searchParams.set('placement', 'admin-panel');
    if (effectiveClassId) {
      url.searchParams.set('classId', effectiveClassId);
    }
    if (uiSlug) {
      url.searchParams.set('uiSlug', uiSlug);
    }
    return url.toString();
  }, [uiUrl, appId, userId, effectiveClassId, uiSlug]);

  // Handle iframe load
  const handleLoad = () => {
    setLoading(false);
  };

  // Handle iframe error
  const handleError = () => {
    setLoading(false);
    setError(`Failed to load ${appName}`);
  };

  // Refresh iframe
  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    appTokenCache.current = null;
    if (iframeRef.current) {
      iframeRef.current.src = iframeSrc;
    }
  };

  // Mint (and cache) an app-scoped token for this user.
  //
  // This replaces handing the app `localStorage.authToken` — the raw *user*
  // access token, which lives 60 SECONDS (auth.constants.ts). The app cached it
  // as if it lasted an hour and never refreshed, so every admin action after the
  // first minute 401'd until the page was reloaded. App tokens live 3600s,
  // carry the app's scopes, and can never widen the user's access.
  //
  // Mirrors ClassAppView.tsx:275-300 (cache + refresh 60s early + single-flight).
  const getAppToken = useCallback(
    async (force = false): Promise<{ token: string; scopes: string[]; exp: number }> => {
      const cached = appTokenCache.current;
      if (!force && cached && cached.exp - Date.now() > 60_000) return cached;
      if (appTokenInflight.current) return appTokenInflight.current;

      const p = (async () => {
        const { accessToken, scopes, expiresIn } =
          await kiwiAppsApiClient.kiwiAppControllerGetAppToken({
            slug: appSlug,
            // classId is omitted for the global admin panel; the backend only
            // issues a classless token to a system admin. The generated DTO
            // still types classId as required — it becomes optional once the
            // client is regenerated against the backend change, at which point
            // this cast can go.
            requestAppTokenDto: (effectiveClassId
              ? { classId: effectiveClassId }
              : {}) as RequestAppTokenDto,
          });
        const entry = {
          token: accessToken,
          scopes: scopes || [],
          exp: Date.now() + (expiresIn || 3600) * 1000,
        };
        appTokenCache.current = entry;
        return entry;
      })();
      appTokenInflight.current = p;
      try {
        return await p;
      } finally {
        appTokenInflight.current = null;
      }
    },
    [appSlug, effectiveClassId],
  );

  // Send a freshly-minted app token to the iframe. `reason === 'expired'` means
  // the app took a 401, so bypass the cache.
  const sendAppToken = useCallback(
    async (appOrigin: string, reason?: string) => {
      try {
        const { token, scopes, exp } = await getAppToken(reason === 'expired');
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: 'kiwi:appToken',
            payload: {
              accessToken: token,
              scopes,
              // Real remaining lifetime, so the app can refresh before expiry
              // instead of inventing one.
              expiresIn: Math.max(0, Math.floor((exp - Date.now()) / 1000)),
              appSlug,
            },
          },
          appOrigin,
        );
      } catch (err) {
        console.error('[AdminAppView] Failed to mint app token:', err);
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: 'kiwi:error',
            message: effectiveClassId
              ? 'Could not obtain an app token for this class.'
              : 'Could not obtain an app token. Open this panel from a class, or sign in as an admin.',
          },
          appOrigin,
        );
      }
    },
    [getAppToken, appSlug, effectiveClassId],
  );

  // Set up postMessage communication with the iframe
  useEffect(() => {
    if (!uiUrl) return;

    const handleMessage = (event: MessageEvent) => {
      // Verify origin matches the app's URL
      const appOrigin = new URL(uiUrl).origin;
      if (event.origin !== appOrigin || event.source !== iframeRef.current?.contentWindow) return;

      // Handle messages from the app
      const { type, payload } = event.data || {};

      switch (type) {
        case 'kiwi:ready':
          // App is ready, send context
          iframeRef.current?.contentWindow?.postMessage(
            {
              type: 'kiwi:context',
              payload: {
                classId: effectiveClassId,
                // Opaque id only: apps never receive a name or email.
                userId,
                // Apps derive their role from this. Previously only `isAdmin`
                // was sent, so apps had to guess — and the SDK's context type
                // has no isAdmin field at all.
                userRole,
                appId,
                appSlug,
                uiSlug,
                placement: 'admin-panel',
                isAdmin: userRole === 'admin',
              },
            },
            appOrigin
          );
          // Push the token straight away so the app doesn't need a round trip.
          void sendAppToken(appOrigin);
          break;

        case 'kiwi:requestToken':
          // App asks for a token — on first load, on expiry, or after a 401.
          void sendAppToken(appOrigin, payload?.reason);
          break;

        case 'kiwi:navigate':
          // App requests navigation
          console.log('[AdminAppView] Navigation request:', payload);
          break;

        case ADMIN_NAVIGATION_MESSAGE: {
          const navigation = parseAppAdminNavigation(payload);
          if (!navigation) break;

          setAppNavigation({
            appSlug,
            items: navigation.items.map((item) => ({
              key: item.id,
              label: item.label,
              icon: null,
              selected: item.path === navigation.activePath,
              onClick: () => {
                iframeRef.current?.contentWindow?.postMessage(
                  {
                    type: ADMIN_NAVIGATE_MESSAGE,
                    payload: { path: item.path },
                  },
                  appOrigin,
                );
              },
            })),
          });
          break;
        }

        default:
          // Unknown message type
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [uiUrl, effectiveClassId, user, userId, userRole, appId, appSlug, uiSlug, sendAppToken, setAppNavigation]);

  // AdminLayout outlives this route, so release iframe-provided menu entries
  // when the app view goes away. The functional guard avoids clearing a newer
  // app's navigation during a fast route transition.
  useEffect(() => () => {
    setAppNavigation((current) => current?.appSlug === appSlug ? null : current);
  }, [appSlug, setAppNavigation]);

  useEffect(() => {
    setAppNavigation((current) => current?.appSlug === appSlug ? null : current);
  }, [appSlug, effectiveClassId, setAppNavigation]);

  // A token is bound to the class it was minted for, so drop the cache when the
  // class changes rather than letting the app keep using the previous one.
  useEffect(() => {
    appTokenCache.current = null;
  }, [effectiveClassId, appSlug]);

  if (effectiveClassId && classAppStatus === 'not-enabled') {
    return (
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          minHeight: 0,
        }}
      >
        <Box
          component="section"
          aria-labelledby="app-not-enabled-title"
          sx={{
            flex: 1,
            minHeight: 360,
            px: 3,
            py: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              mb: 2,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 2,
              color: 'primary.main',
              bgcolor: 'action.selected',
            }}
          >
            <AppsIcon aria-hidden="true" sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            id="app-not-enabled-title"
            component="h1"
            variant="h5"
            color="text.primary"
            sx={{ fontWeight: 600 }}
          >
            Exercise Manager is not enabled for this class
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, maxWidth: 480, lineHeight: 1.6 }}
          >
            Enable the Codegen app in this class before opening its exercise
            management tools.
          </Typography>

          {isSystemAdmin ? (
            <Button
              variant="contained"
              startIcon={<AppsIcon />}
              onClick={() =>
                navigate(
                  `/admin/class/${encodeURIComponent(effectiveClassId)}/kiwi-apps`,
                )
              }
              sx={{ mt: 3, minHeight: 44 }}
            >
              Manage Class Apps
            </Button>
          ) : (
            <Alert severity="info" sx={{ mt: 3, maxWidth: 480, textAlign: 'left' }}>
              Ask an administrator to enable Codegen for this class.
            </Alert>
          )}
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: { xs: 2, md: 3 },
        }}
      >
        <Alert
          severity="error"
          action={
            <IconButton
              color="inherit"
              size="small"
              aria-label={`Retry loading ${appName}`}
              onClick={handleRefresh}
            >
              <RefreshIcon />
            </IconButton>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              zIndex: 1,
            }}
          >
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Loading {appName}...
            </Typography>
          </Box>
        )}
        {appContextReady && (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title={appName}
            onLoad={handleLoad}
            onError={handleError}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: loading ? 'none' : 'block',
            }}
            // allow-downloads: admin panels export data (codegen ships a ZIP of a
            // set's submissions and a manual-feedback JSON). Without the flag
            // Chrome discards the download with no visible error — the request
            // returns 200 and nothing reaches the user.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          />
        )}
      </Box>
    </Paper>
  );
};

export default AdminAppView;
