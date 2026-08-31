import { isSsoEmail } from "../../../config/branding";
/**
 * Shared types and pure helpers for the admin user-management feature.
 */

export type UserEntry = {
  id: string;
  email: string;
  systemRole: string;
  oauth: boolean;
  consent: boolean;
  status: "enabled" | "disabled";
  /** True if the email is whitelisted but no account has been registered yet. */
  isPending: boolean;
  /** Set on optimistically added rows so they sort to the top. */
  addedAt?: number;
};

export type BulkResult = {
  email: string;
  status: "success" | "error";
  error?: string;
};

export type RegistrationResult = BulkResult & {
  password: string;
  classId: string;
};

/**
 * SSO-domain emails are OAuth accounts (Google sign-in), not password users.
 * Single source of truth for whether a row renders as an OAuth user vs. a
 * password user (issue #174).
 */
export const isSsoDomainEmail = (email: string): boolean =>
  isSsoEmail(email);

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const parseEmails = (text: string): string[] =>
  Array.from(
    new Set(
      text
        .split(/[\n,;\s]+/)
        .map((email) => email.trim())
        .filter(Boolean)
    )
  );

export const generatePassword = (): string => {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  return Array.from({ length: 8 }, () =>
    charset.charAt(Math.floor(Math.random() * charset.length))
  ).join("");
};

/** Extract a human-readable message from a generated-client API error. */
export const apiErrorMessage = async (
  error: unknown,
  fallback: string
): Promise<string> => {
  const err = error as { response?: Response; message?: string };
  if (err?.response) {
    try {
      const data = await err.response.json();
      if (typeof data === "string") return data;
      return data?.error?.message || data?.message || fallback;
    } catch {
      return `HTTP ${err.response.status}: ${err.response.statusText}`;
    }
  }
  return err?.message || fallback;
};

/** Trigger a client-side CSV download. */
export const downloadCsv = (filename: string, headers: string[], rows: string[][]) => {
  const escape = (cell: string) =>
    /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
  const content = [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Display label for a class; falls back to its id when it has no name. */
export const classLabel = (cls: { id: string; className?: string | null }): string =>
  cls.className?.trim() || `Unnamed class (${cls.id})`;

export const initialsOf = (email: string): string => {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase() || "?";
};
