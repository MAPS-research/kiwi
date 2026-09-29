import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';

/**
 * Widget Service
 *
 * Provides backend persistence for the Kiwi Apps framework:
 * - Widget State: Per-instance state synced from frontend for cross-device persistence
 * - User Preferences: Global per-user settings for all apps
 *
 * Note: Widgets themselves are React components defined in the frontend (kiwi-ui).
 * The backend only handles persistence, not widget definitions.
 */
@Injectable()
export class WidgetService {
  private readonly logger = new Logger(WidgetService.name);

  constructor(private readonly prisma: DatabaseService) {}

  // ============================================================================
  // Widget State Management
  // ============================================================================

  /**
   * Save or update widget state from frontend
   * Called when frontend wants to persist state for cross-device sync
   */
  async saveWidgetState(
    userId: string,
    data: {
      appId: string;
      widgetId: string;
      widgetState: Record<string, any>;
      conversationId?: string;
      messageId?: string;
      classId?: string;
      exerciseId?: string;
      exerciseSetId?: string;
      displayMode?: string;
    },
  ) {
    this.logger.log(`Saving widget state: ${data.widgetId} for user ${userId}`);

    return this.prisma.widgetState.upsert({
      where: {
        widgetId_userId: {
          widgetId: data.widgetId,
          userId,
        },
      },
      update: {
        widgetState: data.widgetState,
        ...(data.conversationId && { conversationId: data.conversationId }),
        ...(data.messageId && { messageId: data.messageId }),
        ...(data.classId && { classId: data.classId }),
        ...(data.exerciseId && { exerciseId: data.exerciseId }),
        ...(data.exerciseSetId && { exerciseSetId: data.exerciseSetId }),
        ...(data.displayMode && { displayMode: data.displayMode }),
      },
      create: {
        appId: data.appId,
        widgetId: data.widgetId,
        userId,
        widgetState: data.widgetState,
        conversationId: data.conversationId,
        messageId: data.messageId,
        classId: data.classId,
        exerciseId: data.exerciseId,
        exerciseSetId: data.exerciseSetId,
        displayMode: data.displayMode || 'expanded',
      },
    });
  }

  /**
   * Get widget state for a specific widget instance
   */
  async getWidgetState(widgetId: string, userId: string) {
    const state = await this.prisma.widgetState.findUnique({
      where: {
        widgetId_userId: {
          widgetId,
          userId,
        },
      },
    });
    return state;
  }

  /**
   * Get all widget states for a user, optionally filtered by app or context
   */
  async getWidgetStates(
    userId: string,
    filters?: {
      appId?: string;
      conversationId?: string;
      classId?: string;
      exerciseId?: string;
      exerciseSetId?: string;
    },
  ) {
    const where: any = { userId };

    if (filters?.appId) where.appId = filters.appId;
    if (filters?.conversationId) where.conversationId = filters.conversationId;
    if (filters?.classId) where.classId = filters.classId;
    if (filters?.exerciseId) where.exerciseId = filters.exerciseId;
    if (filters?.exerciseSetId) where.exerciseSetId = filters.exerciseSetId;

    return this.prisma.widgetState.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Update only the widgetState JSON (partial update)
   */
  async updateWidgetState(
    widgetId: string,
    userId: string,
    widgetState: Record<string, any>,
    merge: boolean = true,
  ) {
    const existing = await this.getWidgetState(widgetId, userId);

    if (!existing) {
      throw new NotFoundException(`Widget state not found: ${widgetId}`);
    }

    const newState = merge
      ? { ...(existing.widgetState as Record<string, any>), ...widgetState }
      : widgetState;

    return this.prisma.widgetState.update({
      where: {
        widgetId_userId: {
          widgetId,
          userId,
        },
      },
      data: {
        widgetState: newState,
      },
    });
  }

  /**
   * Delete widget state
   */
  async deleteWidgetState(widgetId: string, userId: string) {
    this.logger.log(`Deleting widget state: ${widgetId}`);

    const existing = await this.getWidgetState(widgetId, userId);
    if (!existing) {
      throw new NotFoundException(`Widget state not found: ${widgetId}`);
    }

    return this.prisma.widgetState.delete({
      where: {
        widgetId_userId: {
          widgetId,
          userId,
        },
      },
    });
  }

  /**
   * Delete all widget states for an exercise (cleanup)
   */
  async deleteWidgetStatesForExercise(exerciseId: string, userId: string) {
    return this.prisma.widgetState.deleteMany({
      where: {
        exerciseId,
        userId,
      },
    });
  }

  // ============================================================================
  // User Preferences
  // ============================================================================

  /**
   * Get user preferences, creating defaults if none exist
   */
  async getUserPreferences(userId: string) {
    let prefs = await this.prisma.widgetUserPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.widgetUserPreference.create({
        data: {
          userId,
          theme: 'system',
          codeEditorTheme: 'vs-dark',
          codeEditorFontSize: 14,
          appPreferences: {},
        },
      });
    }

    return prefs;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    data: {
      theme?: string;
      codeEditorTheme?: string;
      codeEditorFontSize?: number;
      appPreferences?: Record<string, any>;
    },
  ) {
    // Ensure preferences exist
    await this.getUserPreferences(userId);

    // Handle appPreferences merge if provided
    let appPreferences = data.appPreferences;
    if (appPreferences) {
      const existing = await this.prisma.widgetUserPreference.findUnique({
        where: { userId },
      });
      appPreferences = {
        ...(existing?.appPreferences as Record<string, any>),
        ...data.appPreferences,
      };
    }

    return this.prisma.widgetUserPreference.update({
      where: { userId },
      data: {
        ...(data.theme && { theme: data.theme }),
        ...(data.codeEditorTheme && { codeEditorTheme: data.codeEditorTheme }),
        ...(data.codeEditorFontSize && {
          codeEditorFontSize: data.codeEditorFontSize,
        }),
        ...(appPreferences && { appPreferences }),
      },
    });
  }

  /**
   * Get preferences for a specific app
   */
  async getAppPreferences(userId: string, appId: string) {
    const prefs = await this.getUserPreferences(userId);
    const appPrefs = (prefs.appPreferences as Record<string, any>) || {};
    return appPrefs[appId] || {};
  }

  /**
   * Update preferences for a specific app
   */
  async updateAppPreferences(
    userId: string,
    appId: string,
    preferences: Record<string, any>,
  ) {
    const prefs = await this.getUserPreferences(userId);
    const appPrefs = (prefs.appPreferences as Record<string, any>) || {};

    return this.prisma.widgetUserPreference.update({
      where: { userId },
      data: {
        appPreferences: {
          ...appPrefs,
          [appId]: {
            ...(appPrefs[appId] || {}),
            ...preferences,
          },
        },
      },
    });
  }
}
