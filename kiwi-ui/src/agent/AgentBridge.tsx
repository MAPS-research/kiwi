import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';
import { toolRegistry } from './toolRegistry.ts';
import {
  effectiveRoles,
  resolvePath,
  sitemapForRole,
  type Role,
  type SiteDestination,
} from './sitemap.ts';
import { observe, clickRef, fillRef } from './observe.ts';
import {
  listClasses,
  resolveClassId,
  resolveClassInPath,
} from './classDirectory.ts';
import { useGlobalChat } from '../context/GlobalChatContext.tsx';

/**
 * Known in-app route shapes (regexes). navigate({path}) only allows paths that
 * match one of these — so the agent can't navigate to a URL it invented (e.g. a
 * removed feature, or a wrong "/classes/<id>/..." prefix). To move within a page
 * it must observe + click (tabs, cards, links) instead.
 */
const KNOWN_ROUTE_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/admin(\/[\w-]+)*\/?$/, // admin pages and subpages
  /^\/[\w-]+\/?$/, // /:classID (a single segment)
  /^\/[\w-]+\/code\/?$/, // /:classID/code
  /^\/[\w-]+\/app\/[\w-]+\/?$/, // /:classID/app/:appSlug
];

function isKnownRoute(path: string): boolean {
  const clean = path.split('?')[0].split('#')[0];
  return KNOWN_ROUTE_PATTERNS.some((re) => re.test(clean));
}

/**
 * Normalize the `params` a model sent. Some models stringify the object, and
 * they freely vary the key's casing ("classId" vs "classID"). resolvePath does
 * an exact key lookup, so an unnormalized param reads as "missing" — the agent
 * then re-checks the sitemap, retries, and loops.
 */
function coerceParams(raw: unknown): Record<string, string> {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]),
  );
}

/**
 * The destinations this user can reach, attached to every navigate failure.
 *
 * A bare "Missing required param" / "Unknown destination" reads to the agent as
 * "you don't know the map", and its reflex is to call get_sitemap and try again
 * — a round-trip that ends where it started. Handing back the map WITH the
 * failure lets it correct on the spot, the same way a class lookup failure
 * already returns the class list.
 */
function availableDestinations(roles: Role[]) {
  return sitemapForRole(roles).map((d: SiteDestination) => ({
    key: d.key,
    description: d.description,
    params: d.params ?? [],
  }));
}

/** Read a param by name, ignoring key casing. */
function getParam(
  params: Record<string, string>,
  name: string,
): string | undefined {
  const target = name.toLowerCase();
  const key = Object.keys(params).find((k) => k.toLowerCase() === target);
  return key ? params[key] : undefined;
}

/**
 * A client action the backend agent asked the browser to perform.
 */
export interface ClientAction {
  toolCallId: string;
  tool: string;
  args: Record<string, unknown>;
}

export interface ClientActionResult {
  toolCallId: string;
  name: string;
  result: unknown;
  isError?: boolean;
}

/**
 * Module-level executor ref. AgentBridge populates it on mount (it needs router
 * + auth hooks); ChatCore (elsewhere in the tree) calls it to run a clientAction
 * the backend streamed. Avoids threading a context through every consumer.
 */
let executor: ((action: ClientAction) => Promise<ClientActionResult>) | null =
  null;

export async function executeClientAction(
  action: ClientAction,
): Promise<ClientActionResult> {
  if (!executor) {
    return {
      toolCallId: action.toolCallId,
      name: action.tool,
      result: { ok: false, message: 'Agent bridge not ready.' },
      isError: true,
    };
  }
  return executor(action);
}

/**
 * Mounted once in RootLayout (inside RouterProvider). Registers the WebMCP-shaped
 * built-in tools and wires the executor used by the chat agent round-trip.
 */
export const AgentBridge: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activeTab, appContext } = useGlobalChat();

  // Keep latest values in refs so the registered tools always see fresh state.
  const rolesRef = React.useRef<Role[]>(['user']);
  const pathRef = React.useRef<string>(location.pathname);
  // Embedded-app context (challenge + code) mirrored from GlobalChatContext, which
  // the app keeps fresh via kiwi:updateContext. observe() surfaces this on app tabs
  // so the agent can see content that lives inside the cross-origin iframe (#213).
  const appTabRef = React.useRef<boolean>(false);
  const appContextRef = React.useRef<string | undefined>(undefined);
  rolesRef.current = effectiveRoles(user?.systemRole, user?.isAdmin);
  pathRef.current = location.pathname + location.search;
  appTabRef.current = activeTab === 'app';
  appContextRef.current = appContext;

  useEffect(() => {
    const unregisters = [
      toolRegistry.registerTool({
        name: 'get_sitemap',
        title: 'Get sitemap',
        description:
          'List the pages the current user can navigate to, with the current location.',
        execute: () => ({
          currentPath: pathRef.current,
          destinations: sitemapForRole(rolesRef.current).map((d: SiteDestination) => ({
            key: d.key,
            description: d.description,
            params: d.params ?? [],
          })),
        }),
      }),

      toolRegistry.registerTool({
        name: 'list_classes',
        title: 'List classes',
        description:
          'List the classes the current user can open, with each class id and name.',
        execute: async () => {
          try {
            const classes = await listClasses(rolesRef.current);
            return { ok: true, classes };
          } catch (err) {
            return {
              ok: false,
              message: `Could not load the class list: ${(err as Error).message}`,
            };
          }
        },
      }),

      toolRegistry.registerTool({
        name: 'navigate',
        title: 'Navigate',
        description: 'Navigate to a destination key or an explicit in-app path.',
        execute: async (input: Record<string, unknown>) => {
          const destination = input.destination as string | undefined;
          const explicitPath = input.path as string | undefined;
          const params = coerceParams(input.params);

          if (destination) {
            // The agent usually only knows a class by name, but every
            // class-scoped route is keyed by id — substituting the name builds
            // a URL whose data calls 404. Resolve it before navigating.
            const rawClassId = getParam(params, 'classID');
            let resolvedParams = params;
            if (rawClassId) {
              const lookup = await resolveClassId(rawClassId, rolesRef.current);
              if (!lookup.ok) {
                return {
                  ok: false,
                  message: lookup.error,
                  classes: lookup.candidates,
                };
              }
              // Write back under the exact key resolvePath expects, whatever
              // casing the model used.
              resolvedParams = { ...params, classID: lookup.classID };
            }
            const r = resolvePath(destination, resolvedParams, rolesRef.current);
            if (!r.ok) {
              // Echo what actually arrived. Without it a params mismatch looks
              // identical to a wrong destination, and the agent's usual reply to
              // that is to re-read the sitemap and try again — a loop.
              return {
                ok: false,
                message:
                  `${r.error} Fix the call from the destinations below and retry ` +
                  `navigate ONCE — do NOT call get_sitemap, it is already here.`,
                receivedParams: resolvedParams,
                destinations: availableDestinations(rolesRef.current),
              };
            }
            navigate(r.path);
            return { ok: true, message: `Navigated to ${r.path}` };
          }
          if (explicitPath) {
            if (!explicitPath.startsWith('/') || explicitPath.startsWith('//')) {
              return { ok: false, message: 'Only in-app paths are allowed.' };
            }
            // Reject invented/unknown paths — the agent must not type URLs it
            // guessed (e.g. a removed feature). Only allow paths that match a
            // known route shape; otherwise tell it to use observe + click (tabs,
            // cards, links) to move around within a page.
            if (!isKnownRoute(explicitPath)) {
              return {
                ok: false,
                message:
                  `"${explicitPath}" is not a known route. Do NOT guess URLs. ` +
                  `Use one of the destinations below, or — to move within the current ` +
                  `page (e.g. switch tabs, open a class) — call observe and click the ` +
                  `tab/card/link you want. Do NOT call get_sitemap, it is already here.`,
                destinations: availableDestinations(rolesRef.current),
              };
            }
            // Same name → id resolution as the destination branch: an explicit
            // path can carry a class name in its class segment just as easily.
            const lookup = await resolveClassInPath(
              explicitPath,
              rolesRef.current,
            );
            if (!lookup.ok) {
              return {
                ok: false,
                message: lookup.error,
                classes: lookup.candidates,
              };
            }
            navigate(lookup.path);
            return { ok: true, message: `Navigated to ${lookup.path}` };
          }
          return {
            ok: false,
            message:
              'Provide a destination (a key from the list below) or an in-app path. ' +
              'Note: targetTab/pdfId/exerciseId belong to the open_material tool, ' +
              'not to navigate.',
            destinations: availableDestinations(rolesRef.current),
          };
        },
      }),

      toolRegistry.registerTool({
        name: 'observe',
        title: 'Observe page',
        description:
          'Snapshot the interactable elements on the current screen with ref ids.',
        execute: () =>
          observe(pathRef.current, () => ({
            isAppTab: appTabRef.current,
            appContext: appContextRef.current,
          })),
      }),

      toolRegistry.registerTool({
        name: 'click',
        title: 'Click',
        description: 'Click a non-submitting element by ref.',
        execute: (input: Record<string, unknown>) => clickRef(String(input.ref)),
      }),

      toolRegistry.registerTool({
        name: 'fill',
        title: 'Fill',
        description: 'Set a field value by ref.',
        execute: (input: Record<string, unknown>) =>
          fillRef(String(input.ref), String(input.value ?? '')),
      }),
    ];

    executor = async (action: ClientAction): Promise<ClientActionResult> => {
      try {
        const result = await toolRegistry.execute(action.tool, action.args);
        const isError =
          result != null &&
          typeof result === 'object' &&
          'ok' in (result as any) &&
          (result as any).ok === false;
        return { toolCallId: action.toolCallId, name: action.tool, result, isError };
      } catch (err) {
        return {
          toolCallId: action.toolCallId,
          name: action.tool,
          result: { ok: false, message: (err as Error).message },
          isError: true,
        };
      }
    };

    return () => {
      unregisters.forEach((u) => u());
      executor = null;
    };
  }, [navigate]);

  return null;
};

export default AgentBridge;
