import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import {
  AdminGuard,
  InstructorClassGuard,
  JwtAuthGuard,
} from 'src/auth/auth.guard';
import { Public } from 'src/auth/auth.decorator';
import { KiwiAppService } from './kiwi-app.service';
import {
  CreateWhitelistEntryDto,
  UpdateWhitelistEntryDto,
  WhitelistEntryResponseDto,
  RegisterAppDto,
  UpdateAppDto,
  AppResponseDto,
  AppUIResponseDto,
  AppPromptResponseDto,
  EnableClassAppDto,
  UpdateClassAppDto,
  ReorderClassAppsDto,
  ClassAppResponseDto,
  RequestAppTokenDto,
  AppTokenResponseDto,
  AppScopesResponseDto,
  ClassAppScopesResponseDto,
  ReportContextUpdateDto,
  ContextUpdateResponseDto,
} from './dto';
import { isAppTokenRequest } from '../mcp/utils/scope-check';

/**
 * Global request validation is not enabled, so endpoints whose DTO constraints
 * matter for security (e.g. the 32-character registration secret) validate
 * their body explicitly.
 */
const validateBody = new ValidationPipe();

@ApiTags('kiwi-apps')
@Controller('api/kiwi-apps')
export class KiwiAppController {
  constructor(private readonly kiwiAppService: KiwiAppService) {}

  // ==========================================================================
  // WHITELIST MANAGEMENT (Admin only)
  // ==========================================================================

  @Get('whitelist')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all whitelist entries (Admin)' })
  @ApiResponse({ status: 200, type: [WhitelistEntryResponseDto] })
  async listWhitelist() {
    return this.kiwiAppService.listWhitelist();
  }

  @Post('whitelist')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add app to whitelist (Admin)' })
  @ApiResponse({ status: 201, type: WhitelistEntryResponseDto })
  async createWhitelistEntry(
    @Body(validateBody) dto: CreateWhitelistEntryDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.kiwiAppService.createWhitelistEntry(dto, user.sub);
  }

  @Patch('whitelist/:slug')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update whitelist entry (Admin)' })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiResponse({ status: 200, type: WhitelistEntryResponseDto })
  async updateWhitelistEntry(
    @Param('slug') slug: string,
    @Body(validateBody) dto: UpdateWhitelistEntryDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.kiwiAppService.updateWhitelistEntry(slug, dto, user.sub);
  }

  @Delete('whitelist/:slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove app from whitelist (Admin)' })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiResponse({ status: 204 })
  async deleteWhitelistEntry(@Param('slug') slug: string) {
    await this.kiwiAppService.deleteWhitelistEntry(slug);
  }

  // ==========================================================================
  // APP REGISTRY
  // ==========================================================================

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all registered apps' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [AppResponseDto] })
  async listApps(@Query('includeInactive') includeInactive?: string) {
    return this.kiwiAppService.listApps(includeInactive === 'true');
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Self-register an app (must be whitelisted)' })
  @ApiResponse({ status: 201, type: AppResponseDto })
  @ApiResponse({ status: 403, description: 'App not whitelisted or not approved' })
  async registerApp(@Body() dto: RegisterAppDto) {
    return this.kiwiAppService.registerApp(dto);
  }

  @Get(':slug')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get app details by slug' })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiResponse({ status: 200, type: AppResponseDto })
  async getApp(@Param('slug') slug: string) {
    return this.kiwiAppService.getApp(slug);
  }

  @Get(':slug/uis')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get UI registrations for an app' })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiResponse({ status: 200, type: [AppUIResponseDto] })
  async getAppUIs(@Param('slug') slug: string) {
    return this.kiwiAppService.getAppUIs(slug);
  }

  @Get(':slug/prompts')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get LLM prompts for an app (Admin)' })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [AppPromptResponseDto] })
  async getAppPrompts(
    @Param('slug') slug: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.kiwiAppService.getAppPrompts(slug, includeInactive === 'true');
  }

  @Post(':slug/prompts/:promptId/approve')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve an LLM prompt (Admin)' })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID' })
  @ApiResponse({ status: 200, type: AppPromptResponseDto })
  async approvePrompt(
    @Param('slug') slug: string,
    @Param('promptId') promptId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.kiwiAppService.approvePrompt(slug, promptId, user.sub);
  }

  @Post(':slug/prompts/:promptId/revoke')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an LLM prompt (Admin)' })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiParam({ name: 'promptId', description: 'Prompt ID' })
  @ApiResponse({ status: 200, type: AppPromptResponseDto })
  async revokePrompt(
    @Param('slug') slug: string,
    @Param('promptId') promptId: string,
  ) {
    return this.kiwiAppService.revokePrompt(slug, promptId);
  }

  @Patch(':slug')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update app (Admin)' })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiResponse({ status: 200, type: AppResponseDto })
  async updateApp(@Param('slug') slug: string, @Body() dto: UpdateAppDto) {
    return this.kiwiAppService.updateApp(slug, dto);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unregister app (Admin)' })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiResponse({ status: 204 })
  async deleteApp(@Param('slug') slug: string) {
    await this.kiwiAppService.deleteApp(slug);
  }

  @Post(':slug/heartbeat')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'App heartbeat (updates lastSeenAt)' })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiResponse({ status: 200, description: 'Heartbeat recorded' })
  async heartbeat(@Param('slug') slug: string) {
    await this.kiwiAppService.heartbeat(slug);
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // ==========================================================================
  // APP-SCOPED TOKENS & SCOPE INSPECTION
  // ==========================================================================

  @Post(':slug/token')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get app-scoped token for class context',
    description:
      'Issues a scoped JWT for the app to use in the specified class context. ' +
      'The token contains the effective scopes (intersection of whitelist maxScopes and class enabledScopes).',
  })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiResponse({ status: 200, type: AppTokenResponseDto })
  @ApiResponse({ status: 403, description: 'User not enrolled or app not enabled for class' })
  async getAppToken(
    @Param('slug') slug: string,
    @Body() dto: RequestAppTokenDto,
    @Req() req: Request,
  ): Promise<AppTokenResponseDto> {
    // Minting is a HOST privilege, never an app one. The global guard accepts
    // an app token as authentication on any route (auth.guard.ts), so without
    // this an app handed a token could mint itself a fresh one — for any
    // whitelisted slug, at that slug's whitelist ceiling, indefinitely. The
    // expiry would be decorative and a leaked token would never lapse. Apps
    // must always come back to the host, which holds the user's session.
    if (isAppTokenRequest(req)) {
      throw new ForbiddenException(
        'App tokens cannot mint app tokens. Request one from the Kiwi host.',
      );
    }
    const user = (req as any).user;
    const { accessToken, expiresIn, scopes } = await this.kiwiAppService.generateAppToken(
      slug,
      dto.classId,
      user.sub,
    );
    return { accessToken, expiresIn, scopes, appSlug: slug };
  }

  @Get(':slug/scopes')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get app scope information',
    description: 'Returns the maximum scopes this app can request (from whitelist) and its active prompt scopes.',
  })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiResponse({ status: 200, type: AppScopesResponseDto })
  async getAppScopes(@Param('slug') slug: string): Promise<AppScopesResponseDto> {
    const { maxScopes, promptScopes } = await this.kiwiAppService.getAppScopes(slug);
    return { appSlug: slug, maxScopes, promptScopes };
  }

  @Get(':slug/scopes/:classId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get effective scopes for app in class',
    description:
      'Returns the effective scopes for the app in the specified class. ' +
      'Effective scopes = intersection of maxScopes and enabledScopes, plus active prompt scopes.',
  })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 200, type: ClassAppScopesResponseDto })
  async getClassAppScopes(
    @Param('slug') slug: string,
    @Param('classId') classId: string,
  ): Promise<ClassAppScopesResponseDto> {
    const result = await this.kiwiAppService.getClassAppScopes(slug, classId);
    return { appSlug: slug, classId, ...result };
  }

  @Post(':slug/audit/context-update')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Report a context update from app (for audit logging)',
    description:
      'Apps should call this endpoint to report significant user actions. ' +
      'This creates an audit log entry that Kiwi uses for accountability.',
  })
  @ApiParam({ name: 'slug', description: 'App slug' })
  @ApiResponse({ status: 200, type: ContextUpdateResponseDto })
  async reportContextUpdate(
    @Param('slug') slug: string,
    @Body() dto: ReportContextUpdateDto,
    @Req() req: Request,
  ): Promise<ContextUpdateResponseDto> {
    const user = (req as any).user;
    const appContext = (req as any).appContext;

    const auditLogId = await this.kiwiAppService.logAuditEvent(
      'context_update',
      appContext?.appSlug || slug,
      user?.sub,
      dto.classId || appContext?.classId,
      {
        actionType: dto.actionType,
        actionData: dto.actionData,
      },
      req,
    );

    return { success: true, auditLogId };
  }
}

// ==========================================================================
// CLASS-APP MANAGEMENT (separate controller for cleaner routing)
// ==========================================================================

@ApiTags('class-apps')
@Controller('api/classes/:classId/apps')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClassKiwiAppController {
  constructor(private readonly kiwiAppService: KiwiAppService) {}

  @Get()
  @ApiOperation({ summary: 'Get enabled apps for a class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiQuery({
    name: 'placement',
    required: false,
    description: 'Filter by UI placement (class-tab, admin-panel, modal, dashboard-widget)',
  })
  @ApiQuery({
    name: 'userRole',
    required: false,
    description: 'Filter by user role (student, ta, instructor, admin)',
  })
  @ApiResponse({ status: 200, type: [ClassAppResponseDto] })
  async getClassApps(
    @Param('classId') classId: string,
    @Query('placement') placement?: string,
    @Query('userRole') userRole?: string,
  ) {
    return this.kiwiAppService.getClassApps(classId, placement, userRole);
  }

  @Post()
  @UseGuards(InstructorClassGuard)
  @ApiOperation({ summary: 'Enable an app for a class (Professor/Admin)' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 201, type: ClassAppResponseDto })
  async enableClassApp(
    @Param('classId') classId: string,
    @Body() dto: EnableClassAppDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.kiwiAppService.enableClassApp(classId, dto, user.sub);
  }

  @Patch(':appId')
  @UseGuards(InstructorClassGuard)
  @ApiOperation({ summary: 'Update class app configuration (Professor/Admin)' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'appId', description: 'App ID' })
  @ApiResponse({ status: 200, type: ClassAppResponseDto })
  async updateClassApp(
    @Param('classId') classId: string,
    @Param('appId') appId: string,
    @Body() dto: UpdateClassAppDto,
  ) {
    return this.kiwiAppService.updateClassApp(classId, appId, dto);
  }

  @Delete(':appId')
  @UseGuards(InstructorClassGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable an app for a class (Professor/Admin)' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'appId', description: 'App ID' })
  @ApiResponse({ status: 204 })
  async disableClassApp(
    @Param('classId') classId: string,
    @Param('appId') appId: string,
  ) {
    await this.kiwiAppService.disableClassApp(classId, appId);
  }

  @Put('order')
  @UseGuards(InstructorClassGuard)
  @ApiOperation({ summary: 'Reorder class app tabs (Professor/Admin)' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({ status: 200, type: [ClassAppResponseDto] })
  async reorderClassApps(
    @Param('classId') classId: string,
    @Body() dto: ReorderClassAppsDto,
  ) {
    return this.kiwiAppService.reorderClassApps(classId, dto);
  }
}

// ==========================================================================
// PERMISSION CHECK (for Kiwi Apps to call)
// ==========================================================================

@ApiTags('permissions')
@Controller('api/permissions')
export class PermissionsController {
  constructor(private readonly kiwiAppService: KiwiAppService) {}

  @Get('class-role')
  @Public()
  @ApiOperation({ summary: 'Get user role in a class (for Kiwi Apps)' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'classId', required: true })
  @ApiResponse({
    status: 200,
    description: 'User role in class',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        classId: { type: 'string' },
        role: { type: 'string', nullable: true, enum: ['student', 'ta', 'professor', 'admin'] },
      },
    },
  })
  async getUserClassRole(
    @Query('userId') userId: string,
    @Query('classId') classId: string,
  ) {
    return this.kiwiAppService.getUserClassRole(userId, classId);
  }
}
