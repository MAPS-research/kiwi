/**
 * Kiwi Apps Framework - App Type Definitions
 *
 * Defines the structure for app manifests, registration, and permissions.
 * Inspired by OpenAI's Apps SDK patterns.
 */

import type { KiwiToolDefinition } from './tool.types.ts';
import type { KiwiWidgetDefinition } from './widget.types.ts';

/**
 * Permissions that an app can request.
 * These map to OAuth scopes and feature flags.
 */
export type AppPermission =
  | 'read:exercises'
  | 'write:exercises'
  | 'execute:code'
  | 'chat:ai'
  | 'read:user'
  | 'read:class'
  | 'read:materials'
  | 'write:materials';

/**
 * App manifest defining an application's capabilities.
 * Similar to OpenAI's MCP server registration.
 */
export interface KiwiAppManifest {
  /** Unique app identifier (e.g., 'codegen', 'pdf-viewer') */
  id: string;

  /** Human-readable display name */
  name: string;

  /** Semantic version (e.g., '1.0.0') */
  version: string;

  /** Description of what the app does */
  description: string;

  /** Optional icon URL or Material-UI icon name */
  icon?: string;

  /** Feature flags required for this app to be available */
  requiredFeatures?: string[];

  /** OAuth scopes/permissions needed */
  permissions?: AppPermission[];

  /** Tools exposed by this app */
  tools: KiwiToolDefinition[];

  /** UI widgets provided by this app */
  widgets: KiwiWidgetDefinition[];

  /** Lifecycle hook called when app is activated */
  onActivate?: () => Promise<void>;

  /** Lifecycle hook called when app is deactivated */
  onDeactivate?: () => Promise<void>;
}

/**
 * Status of a registered app
 */
export type AppStatus = 'active' | 'inactive' | 'error' | 'loading';

/**
 * A registered app with runtime state
 */
export interface RegisteredApp {
  /** The app's manifest */
  manifest: KiwiAppManifest;

  /** Current status */
  status: AppStatus;

  /** Error message if status is 'error' */
  error?: string;

  /** When the app was registered */
  registeredAt: Date;

  /** When the app was last activated */
  activatedAt?: Date;
}

/**
 * Options for registering an app
 */
export interface AppRegistrationOptions {
  /** Auto-activate after registration */
  autoActivate?: boolean;

  /** Override existing app with same ID */
  replace?: boolean;
}

/**
 * Result of app registration
 */
export interface AppRegistrationResult {
  success: boolean;
  app?: RegisteredApp;
  error?: string;
}
