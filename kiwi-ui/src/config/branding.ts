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
 * Whether this deployment names an institution. When it doesn't, UI that would
 * otherwise sit an institution logo next to the Kiwi wordmark shows Kiwi alone.
 */
export function institutionConfigured(): boolean {
  return Boolean(import.meta.env.VITE_INSTITUTION_NAME);
}

/**
 * "<Institution> Kiwi", collapsing to just "Kiwi" when no institution is
 * configured, so an unbranded deployment never reads "Kiwi Kiwi".
 */
export const BRAND_LABEL: string =
  INSTITUTION_NAME === "Kiwi" ? "Kiwi" : `${INSTITUTION_NAME} Kiwi`;

/** Support address shown to users. Empty string hides support prompts. */
export const SUPPORT_EMAIL: string = env.VITE_SUPPORT_EMAIL || "";


/**
 * Email domain whose accounts sign in with Google (e.g. "example.edu"). In
 * Admin → User Management these are treated as Google accounts: they are
 * whitelisted instead of given a password. Empty means no such domain.
 *
 * Read lazily rather than captured at module load so tests (and any runtime
 * override) can change it without re-importing this module.
 */
export function ssoEmailDomain(): string {
  return import.meta.env.VITE_SSO_EMAIL_DOMAIN || "";
}

/** Square logo image (LogoBox), shown as-is. */
export const LOGO_URL: string =
  env.VITE_LOGO_URL || "/assets/images/kiwi-mark.svg";

/**
 * Wordmark shown in the nav and on the auth panel. Rendered as a CSS mask, so
 * only its shape matters; it takes the surrounding text colour. Empty (the
 * default) shows LOGO_URL in full colour next to the name instead.
 * `/assets/images/kiwi-logo.svg` is a one-colour Kiwi wordmark for this slot.
 */
export const LOGO_LIGHT_URL: string = env.VITE_LOGO_LIGHT_URL || "";

/** Returns true when `email` belongs to the configured SSO domain. */
export function isSsoEmail(email: string): boolean {
  const domain = ssoEmailDomain();
  if (!domain) return false;
  return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}

/**
 * URL of the consent document shown on /consent. The consent gate (users must
 * accept before using the app) is only enforced when this is set, so a fresh
 * install goes straight to the main page.
 */
export function consentFormUrl(): string {
  return import.meta.env.VITE_CONSENT_FORM_URL || "";
}

/** Whether users must accept the consent document before using the app. */
export function consentRequired(): boolean {
  return Boolean(consentFormUrl());
}

/**
 * Password login is the default.
 * (Sign-in flags are read lazily, like ssoEmailDomain, so tests can stub them.)
 * Deployments that only allow SSO can turn it
 * off with VITE_DISABLE_PASSWORD_LOGIN=true.
 */
export function passwordLoginEnabled(): boolean {
  return import.meta.env.VITE_DISABLE_PASSWORD_LOGIN !== "true";
}

/**
 * Google sign-in is opt-in. The backend also needs GOOGLE_CLIENT_ID; without
 * it /auth/google returns 404.
 */
export function googleLoginEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === "true";
}
