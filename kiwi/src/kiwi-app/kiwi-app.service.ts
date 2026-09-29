import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/common/database/database.service';
import {
  CreateWhitelistEntryDto,
  UpdateWhitelistEntryDto,
  RegisterAppDto,
  UpdateAppDto,
  EnableClassAppDto,
  UpdateClassAppDto,
  ReorderClassAppsDto,
} from './dto';
import * as bcrypt from 'bcryptjs';
import { Request } from 'express';

@Injectable()
export class KiwiAppService {
  private readonly logger = new Logger(KiwiAppService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  // ==========================================================================
  // WHITELIST MANAGEMENT
  // ==========================================================================

  async listWhitelist() {
    // Exclude the hashed secret from response
    return this.db.kiwiAppWhitelist.findMany({
      select: {
        id: true,
        slug: true,
        baseUrl: true,
        status: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        approvedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWhitelistEntry(dto: CreateWhitelistEntryDto, adminId: string) {
    const existing = await this.db.kiwiAppWhitelist.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Whitelist entry for "${dto.slug}" already exists`,
      );
    }

    // Hash the registration secret before storing
    const hashedSecret = await bcrypt.hash(dto.registrationSecret, 10);

    return this.db.kiwiAppWhitelist.create({
      data: {
        slug: dto.slug,
        registrationSecret: hashedSecret,
        baseUrl: dto.baseUrl,
        status: dto.status || 'pending',
        description: dto.description,
        maxScopes: dto.maxScopes ?? [],
        approvedBy: dto.status === 'approved' ? adminId : null,
      },
      // Exclude the hashed secret from response
      select: {
        id: true,
        slug: true,
        baseUrl: true,
        status: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        approvedBy: true,
      },
    });
  }

  async updateWhitelistEntry(
    slug: string,
    dto: UpdateWhitelistEntryDto,
    adminId: string,
  ) {
    const existing = await this.db.kiwiAppWhitelist.findUnique({
      where: { slug },
    });

    if (!existing) {
      throw new NotFoundException(`Whitelist entry "${slug}" not found`);
    }

    // If a new secret is provided, hash it
    const updateData: any = { ...dto };
    if (dto.registrationSecret) {
      updateData.registrationSecret = await bcrypt.hash(
        dto.registrationSecret,
        10,
      );
    }

    return this.db.kiwiAppWhitelist.update({
      where: { slug },
      data: {
        ...updateData,
        approvedBy: dto.status === 'approved' ? adminId : existing.approvedBy,
      },
      // Exclude the hashed secret from response
      select: {
        id: true,
        slug: true,
        baseUrl: true,
        status: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        approvedBy: true,
      },
    });
  }

  async deleteWhitelistEntry(slug: string) {
    const existing = await this.db.kiwiAppWhitelist.findUnique({
      where: { slug },
    });

    if (!existing) {
      throw new NotFoundException(`Whitelist entry "${slug}" not found`);
    }

    return this.db.kiwiAppWhitelist.delete({
      where: { slug },
    });
  }

  // ==========================================================================
  // APP REGISTRY
  // ==========================================================================

  async listApps(includeInactive = false) {
    return this.db.kiwiApp.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: { uis: true },
      orderBy: { name: 'asc' },
    });
  }

  async getApp(slug: string) {
    const app = await this.db.kiwiApp.findUnique({
      where: { slug },
      include: { uis: true },
    });

    if (!app) {
      throw new NotFoundException(`App "${slug}" not found`);
    }

    return app;
  }

  async getAppUIs(slug: string) {
    const app = await this.db.kiwiApp.findUnique({
      where: { slug },
      include: { uis: { orderBy: { tabOrder: 'asc' } } },
    });

    if (!app) {
      throw new NotFoundException(`App "${slug}" not found`);
    }

    return app.uis;
  }

  async registerApp(dto: RegisterAppDto) {
    // Check whitelist
    const whitelist = await this.db.kiwiAppWhitelist.findUnique({
      where: { slug: dto.slug },
    });

    if (!whitelist) {
      throw new ForbiddenException(`App "${dto.slug}" is not in the whitelist`);
    }

    if (whitelist.status !== 'approved') {
      throw new ForbiddenException(
        `App "${dto.slug}" whitelist entry is not approved (status: ${whitelist.status})`,
      );
    }

    // Validate registration secret
    const isValidSecret = await bcrypt.compare(
      dto.registrationSecret,
      whitelist.registrationSecret,
    );
    if (!isValidSecret) {
      throw new UnauthorizedException('Invalid registration secret');
    }

    // Check if already registered
    const existing = await this.db.kiwiApp.findUnique({
      where: { slug: dto.slug },
      include: { uis: true },
    });

    if (existing) {
      // Update existing registration (re-registration)
      const updatedApp = await this.db.kiwiApp.update({
        where: { slug: dto.slug },
        data: {
          name: dto.name,
          description: dto.description,
          baseUrl: dto.baseUrl,
          iconUrl: dto.iconUrl,
          category: dto.category,
          version: dto.version,
          capabilities: dto.capabilities || [],
          config: dto.config || {},
          appType: dto.appType || 'frontend_only',
          mcpServerUrl: dto.mcpServerUrl,
          isActive: true,
          lastSeenAt: new Date(),
        },
        include: { uis: true },
      });

      // Handle UI updates if provided
      if (dto.uis && dto.uis.length > 0) {
        await this.syncAppUIs(updatedApp.id, dto.uis);
      }

      // Handle prompt updates if provided
      if (dto.prompts && dto.prompts.length > 0) {
        await this.syncAppPrompts(updatedApp.id, dto.prompts);
      }

      // Re-fetch with updated UIs and prompts
      if (
        (dto.uis && dto.uis.length > 0) ||
        (dto.prompts && dto.prompts.length > 0)
      ) {
        return this.db.kiwiApp.findUnique({
          where: { slug: dto.slug },
          include: {
            uis: { orderBy: { tabOrder: 'asc' } },
            prompts: { orderBy: { promptId: 'asc' } },
          },
        });
      }

      return updatedApp;
    }

    // Create new registration
    const newApp = await this.db.kiwiApp.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        baseUrl: dto.baseUrl,
        iconUrl: dto.iconUrl,
        category: dto.category || 'plugin',
        version: dto.version || '1.0.0',
        capabilities: dto.capabilities || [],
        config: dto.config || {},
        appType: dto.appType || 'frontend_only',
        mcpServerUrl: dto.mcpServerUrl,
        lastSeenAt: new Date(),
      },
    });

    // Create UIs if provided
    if (dto.uis && dto.uis.length > 0) {
      await this.syncAppUIs(newApp.id, dto.uis);
    }

    // Create prompts if provided
    if (dto.prompts && dto.prompts.length > 0) {
      await this.syncAppPrompts(newApp.id, dto.prompts);
    }

    // Re-fetch with UIs and prompts
    if (
      (dto.uis && dto.uis.length > 0) ||
      (dto.prompts && dto.prompts.length > 0)
    ) {
      return this.db.kiwiApp.findUnique({
        where: { id: newApp.id },
        include: {
          uis: { orderBy: { tabOrder: 'asc' } },
          prompts: { orderBy: { promptId: 'asc' } },
        },
      });
    }

    return newApp;
  }

  /**
   * Sync app UIs - creates/updates UIs based on the provided list
   */
  private async syncAppUIs(appId: string, uis: RegisterAppDto['uis']) {
    if (!uis) return;

    for (const ui of uis) {
      await this.db.kiwiAppUI.upsert({
        where: { appId_uiSlug: { appId, uiSlug: ui.uiSlug } },
        create: {
          appId,
          uiSlug: ui.uiSlug,
          uiName: ui.uiName,
          uiUrl: ui.uiUrl,
          placement: ui.placement || 'class-tab',
          allowedRoles: ui.allowedRoles || [
            'student',
            'ta',
            'instructor',
            'admin',
          ],
          tabOrder: ui.tabOrder || 0,
          config: ui.config || {},
        },
        update: {
          uiName: ui.uiName,
          uiUrl: ui.uiUrl,
          placement: ui.placement || 'class-tab',
          allowedRoles: ui.allowedRoles || [
            'student',
            'ta',
            'instructor',
            'admin',
          ],
          tabOrder: ui.tabOrder || 0,
          config: ui.config || {},
        },
      });
    }
  }

  /**
   * Sync app prompts - creates/updates prompts based on the provided list
   * Note: Prompts are created as inactive and require admin approval
   */
  private async syncAppPrompts(
    appId: string,
    prompts: RegisterAppDto['prompts'],
  ) {
    if (!prompts) return;

    for (const prompt of prompts) {
      const existing = await this.db.kiwiAppPrompt.findUnique({
        where: { appId_promptId: { appId, promptId: prompt.promptId } },
      });

      if (existing) {
        // Update existing prompt - if system prompt changed, reset approval
        const systemPromptChanged =
          existing.systemPrompt !== prompt.systemPrompt;
        await this.db.kiwiAppPrompt.update({
          where: { appId_promptId: { appId, promptId: prompt.promptId } },
          data: {
            name: prompt.name,
            description: prompt.description,
            systemPrompt: prompt.systemPrompt,
            maxTokens: prompt.maxTokens,
            temperature: prompt.temperature,
            // If system prompt changed, require re-approval
            ...(systemPromptChanged && {
              isActive: false,
              approvedBy: null,
              approvedAt: null,
            }),
          },
        });
      } else {
        // Create new prompt (inactive until approved)
        await this.db.kiwiAppPrompt.create({
          data: {
            appId,
            promptId: prompt.promptId,
            name: prompt.name,
            description: prompt.description,
            systemPrompt: prompt.systemPrompt,
            maxTokens: prompt.maxTokens,
            temperature: prompt.temperature,
            isActive: false, // Requires admin approval
          },
        });
      }
    }
  }

  async updateApp(slug: string, dto: UpdateAppDto) {
    const existing = await this.db.kiwiApp.findUnique({
      where: { slug },
    });

    if (!existing) {
      throw new NotFoundException(`App "${slug}" not found`);
    }

    return this.db.kiwiApp.update({
      where: { slug },
      data: dto,
    });
  }

  async deleteApp(slug: string) {
    const existing = await this.db.kiwiApp.findUnique({
      where: { slug },
    });

    if (!existing) {
      throw new NotFoundException(`App "${slug}" not found`);
    }

    return this.db.kiwiApp.delete({
      where: { slug },
    });
  }

  async heartbeat(slug: string) {
    const existing = await this.db.kiwiApp.findUnique({
      where: { slug },
    });

    if (!existing) {
      throw new NotFoundException(`App "${slug}" not found`);
    }

    return this.db.kiwiApp.update({
      where: { slug },
      data: { lastSeenAt: new Date() },
    });
  }

  // ==========================================================================
  // CLASS-APP MANAGEMENT
  // ==========================================================================

  /**
   * The server's own view of an app-scoped chat turn.
   *
   * `appSlug` arrives in the *student's* request body, so it is the browser
   * talking. Chat trusted it, and the app branch of the prompt wins over every
   * other mode — so a student on a recitation worksheet could add
   * `app: {appSlug: 'anything'}` and land in App Mode, which has no
   * answer-withholding rule at all, while the late mode reminder (added for
   * #215/#46) also stopped firing. The request may nominate *which* app; only
   * the registration decides whether that app exists here.
   *
   * Class config overrides app defaults, matching `getClassApps`.
   *
   * @returns the trusted app identity, or `null` when the slug names no app
   *   installed and enabled for this class — the caller then ignores the app
   *   block entirely rather than honouring an unregistered one.
   */
  async resolveChatApp(
    classId: string | undefined | null,
    appSlug: string | undefined | null,
  ): Promise<{ appSlug: string; tutoringMode?: string } | null> {
    if (!classId || !appSlug) return null;

    const classApp = await this.db.classKiwiApp.findFirst({
      where: {
        classId,
        isEnabled: true,
        app: { slug: appSlug, isActive: true },
      },
      include: { app: true },
    });

    if (!classApp) return null;

    const config = {
      ...((classApp.app.config as Record<string, unknown>) ?? {}),
      ...((classApp.config as Record<string, unknown>) ?? {}),
    };
    const declared = config.tutoringMode;

    return {
      appSlug,
      tutoringMode: typeof declared === 'string' ? declared : undefined,
    };
  }

  async getClassApps(classId: string, placement?: string, userRole?: string) {
    const classApps = await this.db.classKiwiApp.findMany({
      where: { classId, isEnabled: true },
      include: {
        app: {
          include: { uis: { orderBy: { tabOrder: 'asc' } } },
        },
      },
      orderBy: { tabOrder: 'asc' },
    });

    // Transform to include merged config and filter UIs by placement/role
    const results = [];

    for (const ca of classApps) {
      // Filter UIs by placement and role if specified
      let filteredUIs = ca.app.uis;

      if (placement) {
        filteredUIs = filteredUIs.filter((ui) => ui.placement === placement);
      }

      if (userRole) {
        filteredUIs = filteredUIs.filter((ui) =>
          ui.allowedRoles.includes(userRole),
        );
      }

      // Skip apps with no matching UIs
      if (filteredUIs.length === 0 && (placement || userRole)) {
        continue;
      }

      results.push({
        id: ca.id,
        classId: ca.classId,
        appId: ca.appId,
        tabOrder: ca.tabOrder,
        tabLabel: ca.tabLabel,
        isEnabled: ca.isEnabled,
        config: ca.config,
        createdAt: ca.createdAt,
        updatedAt: ca.updatedAt,
        // App data
        slug: ca.app.slug,
        name: ca.app.name,
        baseUrl: ca.app.baseUrl,
        iconUrl: ca.app.iconUrl,
        category: ca.app.category,
        capabilities: ca.app.capabilities,
        appType: ca.app.appType,
        mcpServerUrl: ca.app.mcpServerUrl,
        // UIs (filtered if placement/role specified)
        uis: filteredUIs.map((ui) => ({
          id: ui.id,
          uiSlug: ui.uiSlug,
          uiName: ui.uiName,
          uiUrl: ui.uiUrl,
          placement: ui.placement,
          allowedRoles: ui.allowedRoles,
          tabOrder: ui.tabOrder,
          config: ui.config,
        })),
        // Merged config: app defaults overridden by class config
        mergedConfig: {
          ...(ca.app.config as object),
          ...(ca.config as object),
        },
      });
    }

    return results;
  }

  async enableClassApp(
    classId: string,
    dto: EnableClassAppDto,
    userId: string,
  ) {
    // Verify app exists and is active
    const app = await this.db.kiwiApp.findUnique({
      where: { id: dto.appId },
    });

    if (!app) {
      throw new NotFoundException(`App with ID "${dto.appId}" not found`);
    }

    if (!app.isActive) {
      throw new BadRequestException(`App "${app.slug}" is not active`);
    }

    // Check if already enabled
    const existing = await this.db.classKiwiApp.findUnique({
      where: { classId_appId: { classId, appId: dto.appId } },
    });

    if (existing) {
      // Re-enable if disabled
      return this.db.classKiwiApp.update({
        where: { classId_appId: { classId, appId: dto.appId } },
        data: {
          isEnabled: true,
          tabOrder: dto.tabOrder ?? existing.tabOrder,
          tabLabel: dto.tabLabel ?? existing.tabLabel,
          config: dto.config ?? (existing.config as object) ?? {},
          enabledScopes: dto.enabledScopes ?? existing.enabledScopes,
          enabledBy: userId,
        },
        include: { app: true },
      });
    }

    // Get max tab order
    const maxOrder = await this.db.classKiwiApp.aggregate({
      where: { classId },
      _max: { tabOrder: true },
    });

    return this.db.classKiwiApp.create({
      data: {
        classId,
        appId: dto.appId,
        tabOrder: dto.tabOrder ?? (maxOrder._max.tabOrder ?? -1) + 1,
        tabLabel: dto.tabLabel,
        config: dto.config || {},
        enabledScopes: dto.enabledScopes ?? [],
        enabledBy: userId,
      },
      include: { app: true },
    });
  }

  async updateClassApp(classId: string, appId: string, dto: UpdateClassAppDto) {
    const existing = await this.db.classKiwiApp.findUnique({
      where: { classId_appId: { classId, appId } },
    });

    if (!existing) {
      throw new NotFoundException(`App not enabled for this class`);
    }

    // Only the editable settings; the body is not validated, so never pass it
    // through wholesale (it could otherwise rewrite classId, enabledBy, ...).
    const { tabOrder, tabLabel, config, enabledScopes, isEnabled } = dto;
    return this.db.classKiwiApp.update({
      where: { classId_appId: { classId, appId } },
      data: { tabOrder, tabLabel, config, enabledScopes, isEnabled },
      include: { app: true },
    });
  }

  async disableClassApp(classId: string, appId: string) {
    const existing = await this.db.classKiwiApp.findUnique({
      where: { classId_appId: { classId, appId } },
    });

    if (!existing) {
      throw new NotFoundException(`App not enabled for this class`);
    }

    // Soft delete by setting isEnabled = false
    return this.db.classKiwiApp.update({
      where: { classId_appId: { classId, appId } },
      data: { isEnabled: false },
    });
  }

  async reorderClassApps(classId: string, dto: ReorderClassAppsDto) {
    // Update all tab orders in a transaction
    await this.db.$transaction(
      dto.order.map((item) =>
        this.db.classKiwiApp.updateMany({
          where: { classId, appId: item.appId },
          data: { tabOrder: item.tabOrder },
        }),
      ),
    );

    return this.getClassApps(classId);
  }

  // ==========================================================================
  // PROMPT MANAGEMENT
  // ==========================================================================

  async getAppPrompts(slug: string, includeInactive = false) {
    const app = await this.db.kiwiApp.findUnique({
      where: { slug },
      include: {
        prompts: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { promptId: 'asc' },
        },
      },
    });

    if (!app) {
      throw new NotFoundException(`App "${slug}" not found`);
    }

    return app.prompts;
  }

  async approvePrompt(slug: string, promptId: string, adminId: string) {
    const app = await this.db.kiwiApp.findUnique({
      where: { slug },
    });

    if (!app) {
      throw new NotFoundException(`App "${slug}" not found`);
    }

    const prompt = await this.db.kiwiAppPrompt.findUnique({
      where: { appId_promptId: { appId: app.id, promptId } },
    });

    if (!prompt) {
      throw new NotFoundException(
        `Prompt "${promptId}" not found for app "${slug}"`,
      );
    }

    return this.db.kiwiAppPrompt.update({
      where: { appId_promptId: { appId: app.id, promptId } },
      data: {
        isActive: true,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });
  }

  async revokePrompt(slug: string, promptId: string) {
    const app = await this.db.kiwiApp.findUnique({
      where: { slug },
    });

    if (!app) {
      throw new NotFoundException(`App "${slug}" not found`);
    }

    const prompt = await this.db.kiwiAppPrompt.findUnique({
      where: { appId_promptId: { appId: app.id, promptId } },
    });

    if (!prompt) {
      throw new NotFoundException(
        `Prompt "${promptId}" not found for app "${slug}"`,
      );
    }

    return this.db.kiwiAppPrompt.update({
      where: { appId_promptId: { appId: app.id, promptId } },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Get an active prompt for MCP chat - used by the MCP server
   */
  async getActivePrompt(slug: string, promptId: string) {
    const app = await this.db.kiwiApp.findUnique({
      where: { slug },
    });

    if (!app) {
      throw new NotFoundException(`App "${slug}" not found`);
    }

    const prompt = await this.db.kiwiAppPrompt.findUnique({
      where: { appId_promptId: { appId: app.id, promptId } },
    });

    if (!prompt) {
      throw new NotFoundException(
        `Prompt "${promptId}" not found for app "${slug}"`,
      );
    }

    if (!prompt.isActive) {
      throw new ForbiddenException(
        `Prompt "${promptId}" is not active (requires admin approval)`,
      );
    }

    return prompt;
  }

  // ==========================================================================
  // PERMISSION CHECK
  // ==========================================================================

  async getUserClassRole(userId: string, classId: string) {
    // Check if user is an admin (system-wide)
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { systemRole: true },
    });

    if (user?.systemRole === 'admin') {
      return { userId, classId, role: 'admin' };
    }

    // Check instructor assignment
    const instructor = await this.db.instructorClass.findUnique({
      where: { userId_classId: { userId, classId } },
      select: { role: true, isActive: true },
    });

    if (instructor?.isActive) {
      // Map instructor roles
      const roleMap: Record<string, string> = {
        instructor: 'professor',
        'co-instructor': 'professor',
        assistant: 'ta',
      };
      return { userId, classId, role: roleMap[instructor.role] || 'professor' };
    }

    // Check enrollment
    const enrollment = await this.db.enrollment.findUnique({
      where: { classId_userId: { classId, userId } },
      select: { role: true },
    });

    if (enrollment) {
      return { userId, classId, role: enrollment.role || 'student' };
    }

    // Not enrolled
    return { userId, classId, role: null };
  }

  // ==========================================================================
  // APP-SCOPED TOKENS & SCOPE MANAGEMENT
  // ==========================================================================

  /**
   * Calculate effective scopes for an app in a class
   * Effective = intersection(maxScopes, enabledScopes) + active prompt scopes
   */
  async calculateEffectiveScopes(
    appSlug: string,
    classId: string,
  ): Promise<string[]> {
    // Get whitelist for max scopes
    const whitelist = await this.db.kiwiAppWhitelist.findUnique({
      where: { slug: appSlug },
    });
    if (!whitelist) {
      throw new NotFoundException('App not whitelisted');
    }

    // Get app
    const app = await this.db.kiwiApp.findUnique({
      where: { slug: appSlug },
    });
    if (!app) {
      throw new NotFoundException('App not registered');
    }

    // Get class-app binding
    const classApp = await this.db.classKiwiApp.findUnique({
      where: { classId_appId: { classId, appId: app.id } },
    });
    if (!classApp || !classApp.isEnabled) {
      throw new ForbiddenException('App not enabled for this class');
    }

    // Get active prompts
    const prompts = await this.db.kiwiAppPrompt.findMany({
      where: { appId: app.id, isActive: true },
    });

    // Calculate intersection
    const maxScopes = whitelist.maxScopes || [];
    const enabledScopes = classApp.enabledScopes || [];

    // If enabledScopes is empty, use all maxScopes (default = all allowed)
    const baseScopes =
      enabledScopes.length > 0
        ? maxScopes.filter((s) => enabledScopes.includes(s))
        : maxScopes;

    // Add prompt scopes for active prompts
    const promptScopes = prompts.map((p) => `llm:prompt:${p.promptId}`);

    // Handle wildcard: if maxScopes includes "llm:prompt:*", add all prompt scopes
    const finalScopes = [...baseScopes];
    if (maxScopes.includes('llm:prompt:*')) {
      finalScopes.push(...promptScopes);
    } else {
      // Only add prompt scopes that are explicitly in maxScopes
      promptScopes.forEach((ps) => {
        if (maxScopes.includes(ps)) finalScopes.push(ps);
      });
    }

    return [...new Set(finalScopes)]; // Dedupe
  }

  /**
   * Generate app-scoped token for iframe apps.
   *
   * `classId` is normally required and the token is scoped to that class. It may
   * be omitted ONLY for a global admin panel that has no class context (e.g. a
   * cross-class exercise browser). A classless token:
   *   - is issued to **system admins only**;
   *   - carries the app's whitelist maxScopes, since per-class narrowing
   *     (ClassKiwiApp.enabledScopes) has no meaning without a class;
   *   - CANNOT be used for class-scoped App API / bridge operations —
   *     `app-data.controller.ts` rejects a request whose `appContext.classId`
   *     does not match the target class, and a null classId never matches. It is
   *     for apps that call their own service directly.
   */
  async generateAppToken(
    appSlug: string,
    classId: string | undefined,
    userId: string,
  ): Promise<{ accessToken: string; expiresIn: number; scopes: string[] }> {
    let scopes: string[];

    if (classId) {
      // Verify user is enrolled or has access to the class
      const userRole = await this.getUserClassRole(userId, classId);
      if (!userRole.role) {
        throw new ForbiddenException('User does not have access to this class');
      }

      // Calculate effective scopes
      scopes = await this.calculateEffectiveScopes(appSlug, classId);
    } else {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { systemRole: true },
      });
      if (user?.systemRole !== 'admin') {
        throw new ForbiddenException(
          'A class context is required for this app token. Only system admins may request a classless token.',
        );
      }
      scopes = await this.calculateAdminScopes(appSlug);
    }

    // One hour, unless overridden for testing.
    //
    // APP_TOKEN_TTL_SECONDS exists so the refresh path can be exercised without
    // waiting an hour for a token to age out — set it to ~10s and an app will
    // 401, re-request and heal within a single session. Leave it UNSET in
    // production: it shortens the life of a real credential, and a non-numeric
    // or zero value falls back to 3600 rather than minting something odd.
    const expiresIn = Number(process.env.APP_TOKEN_TTL_SECONDS) || 3600;
    const payload = {
      sub: userId,
      type: 'app_token',
      appSlug,
      classId: classId ?? null,
      // Lets downstream code distinguish a classless admin token from a
      // class-scoped one without re-deriving it from a null classId.
      tokenScope: classId ? 'class' : 'admin',
      scopes,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: `${expiresIn}s`,
    });

    // Audit log
    await this.logAuditEvent('token_issued', appSlug, userId, classId, {
      scopes,
      expiresIn,
      tokenScope: classId ? 'class' : 'admin',
    });

    this.logger.debug(
      `Generated app token for ${appSlug} ${
        classId ? `in class ${classId}` : '(classless, admin)'
      } with ${scopes.length} scopes`,
    );

    return { accessToken, expiresIn, scopes };
  }

  /**
   * Scopes for a classless admin token. There is no ClassKiwiApp binding to
   * intersect against, so this is the whitelist ceiling plus the app's active
   * prompt scopes — the same ceiling `calculateEffectiveScopes` starts from.
   */
  private async calculateAdminScopes(appSlug: string): Promise<string[]> {
    const whitelist = await this.db.kiwiAppWhitelist.findUnique({
      where: { slug: appSlug },
    });
    if (!whitelist) {
      throw new NotFoundException('App not whitelisted');
    }

    const app = await this.db.kiwiApp.findUnique({ where: { slug: appSlug } });
    if (!app) {
      throw new NotFoundException('App not registered');
    }

    const maxScopes = whitelist.maxScopes || [];
    const prompts = await this.db.kiwiAppPrompt.findMany({
      where: { appId: app.id, isActive: true },
    });
    const promptScopes = prompts.map((p) => `llm:prompt:${p.promptId}`);

    const finalScopes = [...maxScopes];
    if (maxScopes.includes('llm:prompt:*')) {
      finalScopes.push(...promptScopes);
    } else {
      promptScopes.forEach((ps) => {
        if (maxScopes.includes(ps)) finalScopes.push(ps);
      });
    }

    return [...new Set(finalScopes)];
  }

  /**
   * Get app scopes info (for inspection)
   */
  async getAppScopes(appSlug: string): Promise<{
    maxScopes: string[];
    promptScopes: string[];
  }> {
    const whitelist = await this.db.kiwiAppWhitelist.findUnique({
      where: { slug: appSlug },
    });
    if (!whitelist) {
      throw new NotFoundException('App not whitelisted');
    }

    const app = await this.db.kiwiApp.findUnique({
      where: { slug: appSlug },
    });

    const prompts = app
      ? await this.db.kiwiAppPrompt.findMany({
          where: { appId: app.id, isActive: true },
        })
      : [];

    return {
      maxScopes: whitelist.maxScopes || [],
      promptScopes: prompts.map((p) => `llm:prompt:${p.promptId}`),
    };
  }

  /**
   * Get class-specific scopes info
   */
  async getClassAppScopes(
    appSlug: string,
    classId: string,
  ): Promise<{
    maxScopes: string[];
    enabledScopes: string[];
    promptScopes: string[];
    effectiveScopes: string[];
  }> {
    const { maxScopes, promptScopes } = await this.getAppScopes(appSlug);

    const app = await this.db.kiwiApp.findUnique({ where: { slug: appSlug } });
    if (!app) {
      throw new NotFoundException('App not registered');
    }

    const classApp = await this.db.classKiwiApp.findUnique({
      where: { classId_appId: { classId, appId: app.id } },
    });

    const enabledScopes = classApp?.enabledScopes || [];

    // Calculate effective scopes (this will throw if not enabled for class)
    let effectiveScopes: string[] = [];
    try {
      effectiveScopes = await this.calculateEffectiveScopes(appSlug, classId);
    } catch {
      // App not enabled for this class - return empty effective scopes
      effectiveScopes = [];
    }

    return { maxScopes, enabledScopes, promptScopes, effectiveScopes };
  }

  // ==========================================================================
  // AUDIT LOGGING
  // ==========================================================================

  /**
   * Log audit event for Kiwi App actions
   */
  async logAuditEvent(
    eventType: string,
    appSlug: string,
    userId?: string,
    classId?: string,
    eventData?: Record<string, any>,
    request?: Request,
  ): Promise<string> {
    const log = await this.db.kiwiAppAuditLog.create({
      data: {
        appSlug,
        userId,
        classId,
        eventType,
        eventData: eventData || {},
        ipAddress: request?.ip,
        userAgent: request?.headers?.['user-agent'],
      },
    });

    this.logger.debug(`Audit log: ${eventType} for app ${appSlug}`);
    return log.id;
  }
}
