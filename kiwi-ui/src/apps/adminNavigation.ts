export const ADMIN_NAVIGATION_MESSAGE = 'kiwi:adminNavigation';
export const ADMIN_NAVIGATE_MESSAGE = 'kiwi:adminNavigate';
export const ALL_CLASSES_SCOPE_ID = '__all_classes__';
export const ALL_CLASSES_ADMIN_LABEL = 'All Classes';

export interface AdminClassScopeOption {
  id: string;
  label: string;
  kind?: 'admin-all-classes';
}

export function getVisibleClassScopeOptions(
  userRole: string | null,
  classes: AdminClassScopeOption[],
): AdminClassScopeOption[] {
  return userRole === 'admin'
    ? [
        {
          id: ALL_CLASSES_SCOPE_ID,
          label: ALL_CLASSES_ADMIN_LABEL,
          kind: 'admin-all-classes',
        },
        ...classes,
      ]
    : classes;
}

export function canRoleSeeAdminUI(
  userRole: string | null,
  allowedRoles?: readonly string[],
): boolean {
  if (!userRole) return false;
  return !allowedRoles?.length || allowedRoles.includes(userRole);
}

export function isAppEnabledForClass(
  apps: ReadonlyArray<{ slug: string; isEnabled: boolean }>,
  appSlug: string,
): boolean {
  return apps.some((app) => app.slug === appSlug && app.isEnabled);
}

export interface AppAdminNavigationItem {
  id: string;
  label: string;
  path: string;
}

export interface AppAdminNavigationPayload {
  items: AppAdminNavigationItem[];
  activePath?: string;
}

export function getActiveAdminAppSlug(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'admin') return undefined;
  if (segments[1] === 'app') return segments[2];
  if (segments[1] === 'class' && segments[3] === 'app') return segments[4];
  return undefined;
}

export interface AdminClassScopeRoute {
  classId?: string;
  legacyClassSuffix: string;
}

/** Reads class scope from both existing admin-app URL shapes. */
export function getAdminClassScopeRoute(pathname: string): AdminClassScopeRoute {
  const legacyMatch = pathname.match(/^\/admin\/class\/([^/]+)(\/.*)?$/);
  const appMatch = pathname.match(/^\/admin\/app\/[^/]+\/class\/([^/]+)(?:\/.*)?$/);
  const encodedClassId = appMatch?.[1] ?? legacyMatch?.[1];

  return {
    classId: encodedClassId ? decodeURIComponent(encodedClassId) : undefined,
    legacyClassSuffix: legacyMatch?.[2] ?? '',
  };
}

/** Keeps the current URL scheme while changing an app's selected class. */
export function getAdminAppPath(appSlug: string, classId?: string): string {
  const appPath = `/admin/app/${encodeURIComponent(appSlug)}`;
  return classId
    ? `${appPath}/class/${encodeURIComponent(classId)}`
    : appPath;
}

const MAX_ITEMS = 20;
const MAX_ID_LENGTH = 80;
const MAX_LABEL_LENGTH = 80;
const MAX_PATH_LENGTH = 256;

/**
 * Accept only a small, flat set of internal app routes from an iframe.
 * Rendering arbitrary postMessage data directly into the host navigation would
 * allow malformed labels, duplicate keys, or protocol URLs into the sidebar.
 */
export function parseAppAdminNavigation(
  payload: unknown,
): AppAdminNavigationPayload | null {
  if (!payload || typeof payload !== 'object') return null;

  const candidate = payload as { items?: unknown; activePath?: unknown };
  if (!Array.isArray(candidate.items)) return null;

  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();
  const items: AppAdminNavigationItem[] = [];

  for (const raw of candidate.items.slice(0, MAX_ITEMS)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as { id?: unknown; label?: unknown; path?: unknown };
    if (
      typeof item.id !== 'string' ||
      typeof item.label !== 'string' ||
      typeof item.path !== 'string'
    ) {
      continue;
    }

    const id = item.id.trim();
    const label = item.label.trim();
    const path = item.path.trim();
    if (
      !id ||
      !label ||
      id.length > MAX_ID_LENGTH ||
      label.length > MAX_LABEL_LENGTH ||
      path.length > MAX_PATH_LENGTH ||
      !path.startsWith('/') ||
      path.startsWith('//') ||
      seenIds.has(id) ||
      seenPaths.has(path)
    ) {
      continue;
    }

    seenIds.add(id);
    seenPaths.add(path);
    items.push({ id, label, path });
  }

  if (items.length === 0) return null;

  const requestedActivePath =
    typeof candidate.activePath === 'string' ? candidate.activePath.trim() : undefined;
  const activePath =
    requestedActivePath && seenPaths.has(requestedActivePath)
      ? requestedActivePath
      : undefined;

  return { items, activePath };
}
