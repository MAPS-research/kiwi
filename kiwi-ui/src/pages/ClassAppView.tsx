/**
 * ClassAppView - Renders an external Kiwi App in an iframe
 *
 * External apps registered via the backend serve their UI via HTTP.
 * This component embeds them in an iframe and sets up the bridge communication.
 * Apps are responsible for providing their own UI features (including AI panels).
 */

import React, { useEffect, useRef, useState, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { ChatContext } from './ClassLayout.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
import { useGlobalChat } from '../context/GlobalChatContext.tsx';
import type { ChatDisplayMode } from '../context/GlobalChatContext.tsx';
import apiClient, { permissionsApiClient, kiwiAppsApiClient } from '../utils/api.ts';
import { basePath } from '../utils/api.ts';
import { OP_TABLE, requiredScopesFor, scopeMatches } from '../apps/classApps/bridgeOps.generated.ts';

interface ClassAppViewProps {
  appId: string;
  appSlug: string;
  /** @deprecated Use uiUrl instead */
  baseUrl?: string;
  /** UI URL (preferred over baseUrl) */
  uiUrl?: string;
  /** UI slug for multi-UI apps */
  uiSlug?: string;
  appName: string;
  /** App capabilities (e.g., 'mcp', 'ai') */
  capabilities?: string[];
}

export const ClassAppView: React.FC<ClassAppViewProps> = ({
  appId,
  appSlug,
  baseUrl,
  uiUrl,
  uiSlug,
  appName,
  capabilities = [],
}) => {
  // Use uiUrl if provided, fall back to baseUrl for backwards compatibility
  const effectiveUrl = uiUrl || baseUrl || '';
  const { classID } = useParams<{ classID: string }>();
  const navigate = useNavigate();
  const { class: classData } = useContext(ChatContext);
  const { user } = useAuth();
  const { setAppContext, setAppPreferredMode, setAppTutoringMode, setDisplayMode, openChat } =
    useGlobalChat();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Host-held app token cache for the kiwi:apiRequest proxy — never sent to the app.
  const appTokenCache = useRef<{ token: string; scopes: string[]; exp: number } | null>(null);
  const appTokenInflight = useRef<Promise<{ token: string; scopes: string[] }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(user?.id || null);
  // AI context provided by the app for LLM requests
  const [appAIContext, setAppAIContext] = useState<string>('');
  // Tutoring mode the app requests for AI replies (e.g. 'guidance' → hints, not
  // full solutions). Sent alongside context in kiwi:updateContext.
  const [appTutoringMode, setLocalAppTutoringMode] = useState<string | undefined>();

  // Sync app AI context to GlobalChatContext for global chat modal
  useEffect(() => {
    setAppContext(appAIContext || undefined);
  }, [appAIContext, setAppContext]);

  // Sync tutoring mode to GlobalChatContext so the chat request carries it.
  useEffect(() => {
    setAppTutoringMode(appTutoringMode);
  }, [appTutoringMode, setAppTutoringMode]);

  // Clear app context on unmount
  useEffect(() => {
    return () => {
      setAppContext(undefined);
      setAppPreferredMode(undefined);
      setAppTutoringMode(undefined);
    };
  }, [setAppContext, setAppPreferredMode, setAppTutoringMode]);

  // Fetch user ID from profile if not available (for existing sessions)
  useEffect(() => {
    const fetchUserId = async () => {
      if (userId) return; // Already have it
      if (!user?.username) return;

      try {
        const profile = await apiClient.authControllerGetProfile();
        if (profile.sub) {
          setUserId(profile.sub);
        }
      } catch (err) {
        console.warn('[ClassAppView] Could not fetch user ID from profile:', err);
      }
    };

    fetchUserId();
  }, [user?.username, userId]);

  // Fetch user's role in this class
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!classID || !userId) return;

      try {
        const response = await permissionsApiClient.permissionsControllerGetUserClassRole({
          userId: userId,
          classId: classID,
        });
        setUserRole(response.role || 'student');
      } catch (err) {
        console.warn('[ClassAppView] Could not fetch user role, defaulting to student:', err);
        setUserRole('student');
      }
    };

    fetchUserRole();
  }, [classID, userId]);

  // Handle AI request from app - routes through Kiwi Agent with SSE streaming
  const handleAIRequest = useCallback(async (
    prompt: string,
    requestId: string,
    appOrigin: string
  ) => {
    const token = localStorage.getItem('authToken');
    if (!token || !classID) {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'kiwi:aiError',
          payload: { requestId, error: 'Not authenticated or missing class context' },
        },
        appOrigin
      );
      return;
    }

    try {
      // The student agent streams CUMULATIVE text: every event carries the full
      // answer so far in data.bot.botResponse, ending with streaming:'stop'. It
      // can also SHRINK (transient "Using <tool>..." narration is dropped on the
      // next delta), so a naive append would leave stale text. We therefore send
      // both an incremental `chunk` (back-compat) and the authoritative `full`
      // snapshot; the SDK prefers `full`.
      let sent = '';
      let completed = false;
      const complete = () => {
        if (completed) return;
        completed = true;
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'kiwi:aiComplete', payload: { requestId } },
          appOrigin
        );
      };

      await fetchEventSource(`${basePath}/student/chat/v2`, {
        method: 'POST',
        // JwtAuthGuard requires the cookie-based session on top of the bearer
        // token; without credentials the cookie is dropped cross-origin and the
        // endpoint 401s as JSON ("Expected content-type to be text/event-stream").
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        // UnifiedChatRequest for the student agent (JwtAuthGuard) — the old
        // /chat/stream target is AdminGuard-ed, so it 403'd for every non-admin.
        body: JSON.stringify({
          prompt,
          conversationId: `app-${appSlug}-${requestId}`,
          context: {
            environment: {
              activeTab: 'app',
              activeAppSlug: appSlug,
              activeAppName: appName,
              currentPath: window.location.pathname,
            },
            app: {
              appSlug,
              classId: classID,
              ...(appAIContext ? { appContext: appAIContext } : {}),
              ...(appTutoringMode ? { tutoringMode: appTutoringMode } : {}),
            },
          },
        }),
        openWhenHidden: true,
        onmessage(event) {
          if (!event.data) return;
          try {
            const d = JSON.parse(event.data);
            const full: string = d?.bot?.botResponse ?? '';
            if (full !== sent) {
              const chunk = full.startsWith(sent) ? full.slice(sent.length) : full;
              sent = full;
              iframeRef.current?.contentWindow?.postMessage(
                { type: 'kiwi:aiChunk', payload: { requestId, chunk, full } },
                appOrigin
              );
            }
            if (d?.bot?.streaming === 'stop') complete();
          } catch {
            // Non-JSON frame — forward as-is.
            iframeRef.current?.contentWindow?.postMessage(
              { type: 'kiwi:aiChunk', payload: { requestId, chunk: event.data } },
              appOrigin
            );
          }
        },
        onclose() {
          complete();
        },
        onerror(err) {
          console.error('[ClassAppView] AI stream error:', err);
          iframeRef.current?.contentWindow?.postMessage(
            {
              type: 'kiwi:aiError',
              payload: { requestId, error: 'Stream error' },
            },
            appOrigin
          );
          throw err; // Stop retrying
        },
      });
    } catch (err) {
      console.error('[ClassAppView] AI request failed:', err);
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'kiwi:aiError',
          payload: { requestId, error: 'Request failed' },
        },
        appOrigin
      );
    }
  }, [classID, appAIContext, appId, appSlug, appName, appTutoringMode]);

  // Fetch app-scoped token for apps with MCP capability
  // forceRequest: bypass capability check when app explicitly requests token
  const fetchAppToken = useCallback(async (appOrigin: string, forceRequest = false) => {
    if (!forceRequest && !capabilities.includes('mcp')) return;

    if (!classID) {
      console.warn('[ClassAppView] Cannot fetch app token: missing class context');
      return;
    }

    try {
      const { accessToken, scopes, expiresIn } = await kiwiAppsApiClient.kiwiAppControllerGetAppToken({
        slug: appSlug,
        requestAppTokenDto: { classId: classID },
      });

      // Send app-scoped token to iframe
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'kiwi:appToken',
          payload: { accessToken, scopes, expiresIn, appSlug },
        },
        appOrigin
      );

      console.debug('[ClassAppView] Sent app-scoped token to app');
    } catch (err) {
      console.error('[ClassAppView] Failed to fetch app token:', err);
    }
  }, [capabilities, classID, appSlug]);

  // Obtain (and cache) the host-held app token for THIS user in THIS class.
  // Minted via the user's session, so it can only ever act as the logged-in
  // user, narrowed to the app's scopes — an app can never widen a user's
  // access. Refreshed ~1min before expiry; single-flighted.
  const getHostAppToken = useCallback(async (): Promise<{ token: string; scopes: string[] }> => {
    const cached = appTokenCache.current;
    if (cached && cached.exp - Date.now() > 60_000) {
      return { token: cached.token, scopes: cached.scopes };
    }
    if (appTokenInflight.current) return appTokenInflight.current;
    if (!classID) throw new Error('missing class context');
    const p = (async () => {
      const { accessToken, scopes, expiresIn } = await kiwiAppsApiClient.kiwiAppControllerGetAppToken({
        slug: appSlug,
        requestAppTokenDto: { classId: classID },
      });
      appTokenCache.current = {
        token: accessToken,
        scopes: scopes || [],
        exp: Date.now() + (expiresIn || 3600) * 1000,
      };
      return { token: accessToken, scopes: scopes || [] };
    })();
    appTokenInflight.current = p;
    try {
      return await p;
    } finally {
      appTokenInflight.current = null;
    }
  }, [appSlug, classID]);

  // Proxy a kiwi:apiRequest: run the named op against the App API with the
  // host-held app token (backend requireScope stays the enforcement boundary),
  // then post back exactly one kiwi:apiResponse correlated by requestId.
  // classId/appSlug come from trusted host state, never from the app.
  const handleApiRequest = useCallback(
    async (op: string, params: unknown, requestId: string, appOrigin: string) => {
      const reply = (r: Record<string, unknown>) =>
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'kiwi:apiResponse', payload: { requestId, ...r } },
          appOrigin,
        );

      const def = OP_TABLE[op];
      if (!def) return reply({ ok: false, status: 400, error: { code: 'unknown_op', message: `unknown op: ${op}` } });
      if (!classID) return reply({ ok: false, status: 400, error: { code: 'not_ready', message: 'no class context yet' } });

      let token: string;
      let scopes: string[];
      try {
        ({ token, scopes } = await getHostAppToken());
      } catch (e) {
        return reply({ ok: false, status: 403, error: { code: 'token_error', message: (e as Error)?.message || 'could not obtain app token' } });
      }

      // Includes the op's dynamic scopes resolved against the app's own params
      // (contextualChat also needs llm:prompt:<promptId>), so we don't pass the
      // pre-flight and then take a predictable 403 from the backend — and so the
      // error names every scope that's actually missing.
      const needed = requiredScopesFor(def, (params as Record<string, unknown>) || {});
      if (!scopeMatches(scopes, needed)) {
        const missing = needed.filter((s) => !scopeMatches(scopes, [s]));
        return reply({ ok: false, status: 403, error: { code: 'op_not_granted', message: `missing scope(s): ${missing.join(', ')}` } });
      }

      const controller = new AbortController();
      // Tracked explicitly: the generated runtime rethrows an aborted fetch as
      // FetchError(cause=AbortError), so neither err.name nor a plain instanceof
      // check would identify our own timeout.
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, def.timeoutMs);
      // Function-form initOverride: the generated runtime replaces headers
      // wholesale, so spread the existing ones and add the app-token
      // Authorization plus the abort signal.
      const initOverride = async ({ init }: { init: RequestInit }) => ({
        ...init,
        headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      try {
        const data = await def.invoke((params as Record<string, unknown>) || {}, { classId: classID, appSlug }, initOverride);
        reply({ ok: true, status: 200, data });
      } catch (e) {
        const err = e as { name?: string; message?: string; response?: Response; cause?: { name?: string } };
        if (timedOut || err?.name === 'AbortError' || err?.cause?.name === 'AbortError') {
          return reply({ ok: false, status: 408, error: { code: 'timeout', message: `op timed out: ${op}` } });
        }
        if (err?.response) {
          let body: { message?: string } | null = null;
          try { body = await err.response.json(); } catch { /* non-JSON body */ }
          if (err.response.status === 401) appTokenCache.current = null; // expired → refetch next time
          return reply({ ok: false, status: err.response.status, error: { code: 'backend_error', message: body?.message || err.message || 'backend error' } });
        }
        reply({ ok: false, status: 0, error: { code: 'network_error', message: err?.message || 'request failed' } });
      } finally {
        clearTimeout(timer);
      }
    },
    [classID, appSlug, getHostAppToken],
  );

  // Construct the iframe URL with context parameters
  const iframeSrc = React.useMemo(() => {
    if (!effectiveUrl) return '';
    const url = new URL(effectiveUrl);
    url.searchParams.set('classId', classID || '');
    url.searchParams.set('appId', appId);
    url.searchParams.set('userId', userId || '');
    if (uiSlug) {
      url.searchParams.set('uiSlug', uiSlug);
    }
    return url.toString();
  }, [effectiveUrl, classID, appId, userId, uiSlug]);

  // Handle iframe load
  const handleLoad = () => {
    setLoading(false);
  };

  // Handle iframe error
  const handleError = () => {
    setLoading(false);
    setError(`Failed to load ${appName}`);
  };

  // Set up postMessage communication with the iframe
  useEffect(() => {
    if (!effectiveUrl) return;

    const handleMessage = (event: MessageEvent) => {
      // Verify origin matches the app's URL
      const appOrigin = new URL(effectiveUrl).origin;
      if (event.origin !== appOrigin) return;

      // Handle messages from the app
      const { type, payload } = event.data || {};

      // Optional ack for the fire-and-forget messages. Apps that include a
      // requestId get a kiwi:ack back so they can tell "done" from "silently
      // ignored" — previously a blocked navigate or a dropped display-mode
      // request looked identical to success. Apps that send no requestId keep
      // the original fire-and-forget behaviour.
      const ack = (ok: boolean, error?: { code: string; message: string }) => {
        const requestId = payload?.requestId;
        if (!requestId) return;
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'kiwi:ack', payload: { requestId, ok, ...(error ? { error } : {}) } },
          appOrigin,
        );
      };

      switch (type) {
        case 'kiwi:ready':
          // App is ready, send context
          iframeRef.current?.contentWindow?.postMessage(
            {
              type: 'kiwi:context',
              payload: {
                classId: classID,
                className: classData?.className,
                // Opaque id only: apps never receive a name or email.
                userId: userId,
                userRole: userRole || 'student',
                appId,
                appSlug,
                uiSlug,
                capabilities,
              },
            },
            appOrigin
          );

          // Handle app's preferred chat mode from ready payload
          if (payload?.preferredChatMode) {
            const validModes: ChatDisplayMode[] = ['modal', 'sidepanel', 'snap', 'fullscreen'];
            if (validModes.includes(payload.preferredChatMode)) {
              setAppPreferredMode(payload.preferredChatMode);
            }
          }

          // If app has MCP capability, send app-scoped token
          if (capabilities.includes('mcp')) {
            fetchAppToken(appOrigin);
          }

          // Eagerly pull the app's current context (challenge + code) so the AI
          // assistant has it even before the student edits anything (#213). Apps
          // that don't implement kiwi:requestContext simply ignore this.
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'kiwi:requestContext' },
            appOrigin
          );
          break;

        case 'kiwi:askAI':
          // App requests AI completion - route through Kiwi Agent
          if (payload?.prompt && payload?.requestId) {
            handleAIRequest(payload.prompt, payload.requestId, appOrigin);
          } else {
            console.warn('[ClassAppView] kiwi:askAI missing prompt or requestId');
          }
          break;

        case 'kiwi:updateContext':
          // App updates AI context for future requests. Prefer the pre-formatted
          // `context` string; fall back to `codeContext` for older apps that only
          // send the raw code.
          {
            const ctx = payload?.context ?? payload?.codeContext;
            if (ctx !== undefined) {
              setAppAIContext(ctx);
              console.debug('[ClassAppView] AI context updated');
            }
            // tutoringMode is a top-level sibling of context; carry it through so
            // the chat request can apply the Socratic guardrail (hints, not answers).
            if (payload?.tutoringMode !== undefined) {
              setLocalAppTutoringMode(payload.tutoringMode || undefined);
            }
          }
          break;

        case 'kiwi:contextResponse':
          // App replied to our kiwi:requestContext pull with its current context
          // (challenge text + code). Treat it the same as an updateContext push.
          {
            const ctx = payload?.context ?? payload?.codeContext;
            if (ctx !== undefined) {
              setAppAIContext(ctx);
              console.debug('[ClassAppView] AI context received (requestContext reply)');
            }
            if (payload?.tutoringMode !== undefined) {
              setLocalAppTutoringMode(payload.tutoringMode || undefined);
            }
          }
          break;

        case 'kiwi:navigate':
          // App requests navigation
          console.log('[ClassAppView] Navigation request:', payload);
          if (payload?.action === 'back') {
            navigate(-1);
            ack(true);
          } else if (payload?.action === 'forward') {
            navigate(1);
            ack(true);
          } else if (payload?.path) {
            // Security: only allow relative paths within the class or specific allowed routes
            const path = payload.path as string;
            if (path === '/' || path === '') {
              // "home" for an embedded app is the current class root — still
              // class-scoped, so it's allowed (a bare "/" would otherwise be
              // rejected as outside the class).
              navigate(`/${classID}`);
              ack(true);
            } else if (path.startsWith('/')) {
              // Absolute path - only allow paths starting with current class
              if (path.startsWith(`/${classID}/`) || path === `/${classID}`) {
                navigate(path);
                ack(true);
              } else {
                console.warn('[ClassAppView] Navigation blocked - path outside class scope:', path);
                ack(false, {
                  code: 'blocked_out_of_scope',
                  message: `path "${path}" is outside the current class`,
                });
              }
            } else {
              // Relative path - navigate within current class
              navigate(`/${classID}/${path}`);
              ack(true);
            }
          } else {
            ack(false, { code: 'invalid_request', message: 'navigate needs an action or a path' });
          }
          break;

        case 'kiwi:requestToken':
          // App explicitly requests token (e.g., after token expired or on reconnect)
          console.debug('[ClassAppView] Token requested by app');
          fetchAppToken(appOrigin, true); // force request even without MCP capability
          break;

        case 'kiwi:setChatDisplayMode':
          // An EXPLICIT request (the user clicked something in the app), unlike
          // the passive preferredChatMode sent with kiwi:ready. Apply it
          // directly: setAppPreferredMode is ignored once displayModeSource is
          // 'user', which it always is for anyone who has ever picked a layout
          // (it's restored from localStorage as 'user' on mount) — so routing
          // this through it silently dropped every request. Also open the chat,
          // otherwise changing where a closed panel sits does nothing visible.
          if (payload?.mode) {
            const validModes: ChatDisplayMode[] = ['modal', 'sidepanel', 'snap', 'fullscreen'];
            if (validModes.includes(payload.mode)) {
              setDisplayMode(payload.mode);
              openChat();
              ack(true);
            } else {
              console.warn('[ClassAppView] Invalid chat display mode:', payload.mode);
              ack(false, {
                code: 'invalid_mode',
                message: `unknown chat display mode "${payload.mode}"`,
              });
            }
          } else {
            ack(false, { code: 'invalid_request', message: 'setChatDisplayMode needs a mode' });
          }
          break;

        case 'kiwi:apiRequest':
          // Host-proxied App API call. Frontend-only apps never hit the backend
          // directly; classId/appSlug are injected by handleApiRequest.
          if (payload?.op && payload?.requestId) {
            handleApiRequest(payload.op, payload.params, payload.requestId, appOrigin);
          } else {
            console.warn('[ClassAppView] kiwi:apiRequest missing op or requestId');
          }
          break;

        default:
          // Unknown message type - apps may send custom messages
          console.debug('[ClassAppView] Unhandled message type:', type);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [effectiveUrl, classID, classData, user, appId, appSlug, uiSlug, userId, userRole, handleAIRequest, handleApiRequest, navigate, capabilities, fetchAppToken]);

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: 4,
        }}
      >
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        height: '100%',
        minHeight: 'calc(100vh - 180px)',
      }}
    >
      {/* Iframe Container */}
      <Box
        sx={{
          position: 'relative',
          flex: '1 1 100%',
          height: '100%',
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
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </Box>
    </Box>
  );
};

export default ClassAppView;
