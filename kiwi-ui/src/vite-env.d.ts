/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_DISABLE_PASSWORD_LOGIN?: string;
  readonly VITE_ENABLE_GOOGLE_LOGIN?: string;
  // Branding / institution configuration - see src/config/branding.ts
  readonly VITE_INSTITUTION_NAME?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_SSO_EMAIL_DOMAIN?: string;
  readonly VITE_LOGO_URL?: string;
  readonly VITE_LOGO_LIGHT_URL?: string;
  readonly VITE_CONSENT_FORM_URL?: string;
  // Stage 1 release switches - see src/config/branding.ts
  readonly VITE_ENABLE_DARK_MODE?: string;
  readonly VITE_ENABLE_MASCOT_MOTION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
