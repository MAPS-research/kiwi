/**
 * Context attached to requests when using app-scoped tokens
 */
export interface AppContext {
  /** App slug identifier */
  appSlug: string;
  /** Class ID the token is scoped to */
  classId: string;
  /** Scopes granted to this app for this class */
  scopes: string[];
  /** User ID from the token subject */
  userId: string;
}

/**
 * JWT payload for app-scoped tokens
 */
export interface AppTokenPayload {
  /** User ID */
  sub: string;
  /** Token type identifier */
  type: 'app_token';
  /** App slug */
  appSlug: string;
  /** Class context */
  classId: string;
  /** Granted scopes */
  scopes: string[];
  /** Issued at timestamp */
  iat?: number;
  /** Expiration timestamp */
  exp?: number;
}

// Extend Express Request to include appContext
declare global {
  namespace Express {
    interface Request {
      appContext?: AppContext;
    }
  }
}
