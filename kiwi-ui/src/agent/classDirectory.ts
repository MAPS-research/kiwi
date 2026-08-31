/**
 * Class name → class id lookup for agent navigation.
 *
 * The agent only ever hears a class by its NAME ("the kiwi demo class"), but
 * every class-scoped route is keyed by class id. Without this, the agent
 * substitutes the name straight into the path and lands on a URL that renders
 * but whose data calls 404 ("The requested resource was not found").
 *
 * The list is fetched per role and cached for the session — the admin/instructor
 * path costs one request per class, which is too expensive to repeat on every
 * navigation.
 */

import apiClient from "../utils/api.ts";
import type { Role } from "./sitemap.ts";

export interface ClassEntry {
  classID: string;
  className: string;
}

let cache: Promise<ClassEntry[]> | null = null;

/** Drop the cached list (e.g. after a class is created or renamed). */
export function invalidateClassDirectory(): void {
  cache = null;
}

const infoFor = async (id: string): Promise<ClassEntry | null> => {
  try {
    const entry = await apiClient.classControllerGetById({ classID: id });
    return { classID: entry.id, className: entry.className };
  } catch {
    // A class the user can list but not read shouldn't sink the whole lookup.
    return null;
  }
};

const fetchClasses = async (roles: Role[]): Promise<ClassEntry[]> => {
  // Students get name + id in a single response; staff only get ids and need a
  // follow-up read per class.
  if (!roles.includes("instructor") && !roles.includes("admin")) {
    const response =
      await apiClient.studentControllerGetEnrolledClassesInfoByStudentId();
    return (response.classInfoList ?? []).map((info) => ({
      classID: info.id,
      className: info.className,
    }));
  }

  let classIds: string[] = [];
  if (roles.includes("admin")) {
    classIds = (await apiClient.classControllerList()).classIds ?? [];
  } else {
    const response =
      await apiClient.instructorClassControllerGetInstructorClasses();
    classIds = (response.classes ?? []).map((cls: unknown) =>
      typeof cls === "string"
        ? cls
        : ((cls as any).classID ?? (cls as any).id ?? String(cls)),
    );
  }

  const entries = await Promise.all(classIds.map(infoFor));
  return entries.filter((e): e is ClassEntry => e !== null);
};

export async function listClasses(roles: Role[]): Promise<ClassEntry[]> {
  if (!cache) {
    cache = fetchClasses(roles).catch((err) => {
      cache = null; // Let the next call retry rather than caching the failure.
      throw err;
    });
  }
  return cache;
}

/**
 * "Kiwi Demo" / "kiwi-demo" / "kiwi_demo " all normalize to "kiwidemo".
 *
 * Digit runs also drop leading zeros, so a user saying "test class 01" still
 * finds a class named "Test Class 1". Users and class names disagree about
 * zero-padding constantly, and neither exact nor substring matching bridges
 * "01" vs "1" — the lookup just fails and the agent is left retrying.
 */
const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/\d+/g, (digits) => String(Number(digits)))
    .trim();

/**
 * Substring match that respects number boundaries: "kiwi demo" should find
 * "Kiwi Demo Class", but "class 10" must NOT match "Class 100" — those are
 * different classes, and silently opening the wrong one is worse than failing.
 */
const partialMatch = (name: string, target: string): boolean => {
  const index = name.indexOf(target);
  if (index === -1) return false;
  const next = name[index + target.length] ?? "";
  return !(/\d$/.test(target) && /\d/.test(next));
};

export type ClassLookup =
  | { ok: true; classID: string }
  | { ok: false; error: string; candidates: ClassEntry[] };

/**
 * Turn whatever the agent passed as `classID` into a real class id.
 *
 * Accepts an actual id unchanged; otherwise matches on class name, exactly
 * first and then by unique substring, so "kiwi demo" finds "Kiwi Demo Class".
 * An ambiguous or unknown name is an error with the candidates attached — the
 * agent should ask rather than navigate somewhere broken.
 */
export async function resolveClassId(
  value: string,
  roles: Role[],
): Promise<ClassLookup> {
  let classes: ClassEntry[];
  try {
    classes = await listClasses(roles);
  } catch {
    // Can't verify — the value may well be a real id, so don't block navigation.
    return { ok: true, classID: value };
  }

  if (classes.some((c) => c.classID === value)) {
    return { ok: true, classID: value };
  }

  const target = normalize(value);
  const exact = classes.filter((c) => normalize(c.className) === target);
  if (exact.length === 1) return { ok: true, classID: exact[0].classID };

  const partial = classes.filter((c) => partialMatch(normalize(c.className), target));
  if (partial.length === 1) return { ok: true, classID: partial[0].classID };

  // Failure messages carry the full list inline and say what to do next. An
  // error that says "call list_classes" invites the agent to re-list, retry the
  // same bad value, and loop until the round-trip cap kills the turn.
  const inventory = classes.length
    ? classes.map((c) => `${c.className} (classID: ${c.classID})`).join("; ")
    : "none";

  const matches = exact.length > 1 ? exact : partial;
  if (matches.length > 1) {
    return {
      ok: false,
      error:
        `"${value}" matches more than one class: ` +
        `${matches.map((c) => `${c.className} (classID: ${c.classID})`).join("; ")}. ` +
        `Do NOT retry — ask the user which one they mean.`,
      candidates: matches,
    };
  }

  return {
    ok: false,
    error:
      `"${value}" is not a class id or a class name you can open. ` +
      `Available classes: ${inventory}. ` +
      `If one of them is what the user meant, call navigate ONCE more with that ` +
      `exact classID. Otherwise tell the user the class was not found — do NOT ` +
      `retry navigate or re-list the classes.`,
    candidates: classes,
  };
}

/**
 * Class-scoped route shapes, with the class segment captured. Mirrors the
 * KNOWN_ROUTE_PATTERNS in AgentBridge — an explicit `path` bypasses the
 * destination/params route, so it needs the same name → id resolution.
 */
const CLASS_PATH_PATTERNS: RegExp[] = [
  /^\/admin\/class\/([^/]+)/,
  /^\/(?!admin(?:\/|$))([^/]+)(?:\/(?:code|app)(?:\/|$)|\/?$)/,
];

export type PathLookup =
  | { ok: true; path: string }
  | { ok: false; error: string; candidates: ClassEntry[] };

/** Rewrite the class segment of an explicit in-app path to a real class id. */
export async function resolveClassInPath(
  path: string,
  roles: Role[],
): Promise<PathLookup> {
  for (const pattern of CLASS_PATH_PATTERNS) {
    const match = path.match(pattern);
    if (!match) continue;

    const segment = match[1];
    const lookup = await resolveClassId(decodeURIComponent(segment), roles);
    if (!lookup.ok) return { ok: false, error: lookup.error, candidates: lookup.candidates };
    if (lookup.classID === segment) return { ok: true, path };

    const start = match.index! + match[0].indexOf(segment);
    return {
      ok: true,
      path:
        path.slice(0, start) +
        encodeURIComponent(lookup.classID) +
        path.slice(start + segment.length),
    };
  }
  return { ok: true, path };
}
