/**
 * Kiwi Apps - Class Apps Configuration Types
 *
 * Types for class-level app configuration fetched from backend.
 * These define which Kiwi Apps are enabled for a class and their settings.
 */

// Re-export generated types from OpenAPI
export type {
  ClassAppResponseDto,
  AppResponseDto,
  EnableClassAppDto,
  UpdateClassAppDto,
  ReorderClassAppsDto,
} from '../../services/models/index.ts';

// Re-export the generated API
export { ClassAppsApi } from '../../services/apis/ClassAppsApi.ts';
export { KiwiAppsApi } from '../../services/apis/KiwiAppsApi.ts';

// Import for use in this file
import type { ClassAppResponseDto } from '../../services/models/index.ts';

/**
 * Alias for the generated DTO - use this for cleaner imports
 */
export type ClassKiwiAppConfig = ClassAppResponseDto;

/**
 * Response from GET /api/classes/:classId/apps
 */
export type ClassAppsResponse = ClassAppResponseDto[];

/**
 * Class apps context value
 */
export interface ClassAppsContextValue {
  /** List of enabled apps for the current class */
  apps: ClassKiwiAppConfig[];

  /** Whether apps are loading */
  isLoading: boolean;

  /** Error if loading failed */
  error: Error | null;

  /** Current class ID */
  classId: string | null;

  /** Reload apps for the current class */
  reload: () => Promise<void>;

  /** Get an app by slug */
  getApp: (slug: string) => ClassKiwiAppConfig | undefined;

  /** Get JWT token for an app */
  getAppToken: (slug: string) => Promise<string>;

  /** Check if an app is enabled */
  isAppEnabled: (slug: string) => boolean;
}

/**
 * Props for ClassAppsProvider
 */
export interface ClassAppsProviderProps {
  children: React.ReactNode;

  /** Class ID to load apps for */
  classId: string | null;

  /** Custom token getter (defaults to localStorage authToken) */
  getToken?: () => string | Promise<string>;

  /** User's role in the class for filtering apps (student, ta, instructor, admin) */
  userRole?: string;

  /** Placement filter (defaults to 'class-tab') */
  placement?: string;
}
