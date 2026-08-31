/**
 * Authored sitemap for agent navigation. App.tsx has no central route registry,
 * so destinations are declared here: a human-readable key + description, a path
 * template, required params, and a role gate. The agent reads this via the
 * `get_sitemap` tool and navigates by `destination` (or explicit `path`).
 */

export type Role = 'admin' | 'instructor' | 'user';

export interface SiteDestination {
  /** Stable key the agent uses with navigate({ destination }). */
  key: string;
  /** What this page is for (the agent reads this to choose). */
  description: string;
  /** Path template; ":param" segments require matching params. */
  path: string;
  /** Param names required to build the path. */
  params?: string[];
  /** Roles allowed to see/use this destination. Omit = everyone. */
  roles?: Role[];
}

export const SITEMAP: SiteDestination[] = [
  // Student / shared
  {
    key: 'my-classes',
    description:
      'MY CLASSES / My Courses — the student view listing the classes I am ' +
      'enrolled in. Use this for "my class", "my classes", "my courses", "take ' +
      'me to my class", "go to classes" (when NOT explicitly admin). This is the ' +
      'default classes page for everyone, including admins acting as a student.',
    path: '/',
  },
  {
    key: 'class',
    description:
      'Open a specific class (materials + chat). Requires the class id.',
    path: '/:classID',
    params: ['classID'],
  },
  {
    key: 'class-code',
    description: 'The code/IDE view for a class. Requires the class id.',
    path: '/:classID/code',
    params: ['classID'],
  },

  // Admin
  {
    key: 'admin-classes',
    description:
      'ADMIN class management — the admin/instructor dashboard to manage, edit, ' +
      'and create classes. Use ONLY when the user explicitly wants the ADMIN or ' +
      'management view ("admin classes", "manage classes", "class admin"). For ' +
      '"my classes" or a plain "classes" request, use my-classes instead.',
    path: '/admin/classes',
    roles: ['admin', 'instructor'],
  },
  {
    key: 'new-class',
    description: 'Form to create a new class.',
    path: '/admin/new-class',
    roles: ['admin', 'instructor'],
  },
  {
    key: 'analytics',
    description: 'Admin analytics dashboard.',
    path: '/admin/analytics',
    roles: ['admin', 'instructor'],
  },
  {
    key: 'email',
    description: 'Admin email management.',
    path: '/admin/email',
    roles: ['admin'],
  },
  {
    key: 'feature-flags',
    description: 'System-wide feature flags.',
    path: '/admin/feature-flags',
    roles: ['admin'],
  },
  {
    key: 'webhooks',
    description: 'Webhook management.',
    path: '/admin/webhooks',
    roles: ['admin'],
  },
  {
    key: 'mcp-servers',
    description: 'MCP server management.',
    path: '/admin/mcp-servers',
    roles: ['admin'],
  },
  {
    key: 'kiwi-apps',
    description: 'Kiwi Apps admin.',
    path: '/admin/kiwi-apps',
    roles: ['admin'],
  },
  {
    key: 'user-management',
    description: 'Admin user management.',
    path: '/admin/user-management',
    roles: ['admin'],
  },

  // Class-admin subpages (need classID)
  {
    key: 'class-edit',
    description: 'Edit a class’s metadata. Requires the class id.',
    path: '/admin/class/:classID/edit-metadata',
    params: ['classID'],
    roles: ['admin', 'instructor'],
  },
  {
    key: 'class-materials',
    description: 'Manage a class’s materials. Requires the class id.',
    path: '/admin/class/:classID/manage-materials',
    params: ['classID'],
    roles: ['admin', 'instructor'],
  },
  {
    key: 'class-enroll',
    description: 'Enroll students into a class. Requires the class id.',
    path: '/admin/class/:classID/enroll-students',
    params: ['classID'],
    roles: ['admin', 'instructor'],
  },
  {
    key: 'class-emails',
    description: 'Send emails for a class. Requires the class id.',
    path: '/admin/class/:classID/send-emails',
    params: ['classID'],
    roles: ['admin', 'instructor'],
  },
  {
    key: 'class-analytics',
    description: 'Professor analytics for a class. Requires the class id.',
    path: '/admin/class/:classID/professor-analytics',
    params: ['classID'],
    roles: ['admin', 'instructor'],
  },
  {
    key: 'class-experiments',
    description:
      'LEARNING EXPERIMENTS for a class — list and manage experiments that split ' +
      'students into variant groups, each with its own chat engine (openai/qwen) ' +
      'and system prompts. Use for "experiments", "A/B test", "variant groups". ' +
      'Requires the class id. From here you can open an experiment or ' +
      'start a new one.',
    path: '/admin/class/:classID/experiments',
    params: ['classID'],
    roles: ['admin', 'instructor'],
  },
  {
    key: 'new-experiment',
    description:
      'CREATE a new learning experiment for a class: design variant groups ' +
      '(label, chat engine, system prompts, allocation or manual email rosters) ' +
      'and the assignment strategy. After navigating here, fill the fields with ' +
      'observe + fill; the instructor reviews and submits. Requires the class id.',
    path: '/admin/class/:classID/experiments/new',
    params: ['classID'],
    roles: ['admin', 'instructor'],
  },
];

/** Resolve a user's effective roles for gating (admin implies instructor view). */
export function effectiveRoles(systemRole?: string, isAdmin?: boolean): Role[] {
  if (isAdmin || systemRole === 'admin') return ['admin', 'instructor', 'user'];
  if (systemRole === 'instructor') return ['instructor', 'user'];
  return ['user'];
}

/** The destinations visible to a role. */
export function sitemapForRole(roles: Role[]): SiteDestination[] {
  return SITEMAP.filter(
    (d) => !d.roles || d.roles.some((r) => roles.includes(r)),
  );
}

/** Build a concrete path from a destination key + params. */
export function resolvePath(
  key: string,
  params: Record<string, string> = {},
  roles: Role[],
): { ok: true; path: string } | { ok: false; error: string } {
  const dest = SITEMAP.find((d) => d.key === key);
  if (!dest) return { ok: false, error: `Unknown destination "${key}".` };
  if (dest.roles && !dest.roles.some((r) => roles.includes(r))) {
    return { ok: false, error: `Not permitted to access "${key}".` };
  }
  let path = dest.path;
  for (const p of dest.params ?? []) {
    const val = params[p];
    if (!val) return { ok: false, error: `Missing required param "${p}" for "${key}".` };
    path = path.replace(`:${p}`, encodeURIComponent(val));
  }
  return { ok: true, path };
}
