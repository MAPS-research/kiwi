/**
 * Deployment-specific branding and institution configuration.
 *
 * Every value here has a neutral default so a fresh checkout runs unbranded.
 * Deployments override them via `VITE_*` environment variables at build time
 * (see `.env.example`); nothing institution-specific should be hardcoded in
 * components.
 */

const env = import.meta.env;

/** Display name of the institution running this Kiwi instance. */
export const INSTITUTION_NAME: string =
  env.VITE_INSTITUTION_NAME || "Kiwi";

/**
 * "<Institution> Kiwi", collapsing to just "Kiwi" when no institution is
 * configured, so an unbranded deployment never reads "Kiwi Kiwi".
 */
export const BRAND_LABEL: string =
  INSTITUTION_NAME === "Kiwi" ? "Kiwi" : `${INSTITUTION_NAME} Kiwi`;

/** Support address shown to users. Empty string hides support prompts. */
export const SUPPORT_EMAIL: string = env.VITE_SUPPORT_EMAIL || "";

/** Public URL of this deployment's frontend. */
export const FRONTEND_URL: string =
  env.VITE_FRONTEND_URL || window.location.origin;

/**
 * Email domain routed to SSO instead of password login (e.g. "example.edu").
 * Empty string means no domain-based routing.
 *
 * Read lazily rather than captured at module load so tests (and any runtime
 * override) can change it without re-importing this module.
 */
export function ssoEmailDomain(): string {
  return import.meta.env.VITE_SSO_EMAIL_DOMAIN || "";
}

/** Logo shown in the nav and auth screens. */
export const LOGO_URL: string =
  env.VITE_LOGO_URL || "/assets/images/kiwi-mark.svg";

/** Optional wordmark/light-on-dark variant. Falls back to LOGO_URL. */
export const LOGO_LIGHT_URL: string =
  env.VITE_LOGO_LIGHT_URL || "/assets/images/kiwi-logo.svg";

/** Returns true when `email` belongs to the configured SSO domain. */
export function isSsoEmail(email: string): boolean {
  const domain = ssoEmailDomain();
  if (!domain) return false;
  return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}

/**
 * URL of the consent document shown on /consent. Empty string means this
 * deployment has no consent form; the page then explains how to configure one.
 */
export const CONSENT_FORM_URL: string = env.VITE_CONSENT_FORM_URL || "";
