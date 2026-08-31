import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { WidgetService } from './widget.service';
import {
  SaveWidgetStateDto,
  UpdateWidgetStateDto,
  WidgetStateResponseDto,
} from './dto/widget-state.dto';
import {
  UpdateUserPreferenceDto,
  UserPreferenceResponseDto,
} from './dto/user-preference.dto';

/**
 * Widget Controller
 *
 * REST API for widget state persistence and user preferences.
 * Works with the Kiwi Apps framework in the frontend (kiwi-ui).
 *
 * Note: Widgets are React components defined in the frontend.
 * This controller only handles state persistence for cross-device sync.
 */
@ApiTags('widgets')
@Controller('api/widgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WidgetController {
  constructor(private readonly widgetService: WidgetService) {}

  // ============================================================================
  // Widget State Endpoints
  // ============================================================================

  @Post('state')
  @ApiOperation({ summary: 'Save widget state (create or update)' })
  @ApiBody({ type: SaveWidgetStateDto })
  @ApiResponse({ status: 201, description: 'Widget state saved', type: WidgetStateResponseDto })
  async saveWidgetState(
    @Body() body: SaveWidgetStateDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.widgetService.saveWidgetState(user.sub, body);
  }

  @Get('state/:widgetId')
  @ApiOperation({ summary: 'Get widget state by widget ID' })
  @ApiParam({ name: 'widgetId', description: 'Widget instance ID' })
  @ApiResponse({ status: 200, description: 'Widget state', type: WidgetStateResponseDto })
  async getWidgetState(
    @Param('widgetId') widgetId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.widgetService.getWidgetState(widgetId, user.sub);
  }

  @Get('states')
  @ApiOperation({ summary: 'Get all widget states for user with optional filters' })
  @ApiQuery({ name: 'appId', required: false })
  @ApiQuery({ name: 'conversationId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'exerciseId', required: false })
  @ApiQuery({ name: 'exerciseSetId', required: false })
  @ApiResponse({ status: 200, description: 'List of widget states', type: [WidgetStateResponseDto] })
  async getWidgetStates(
    @Query('appId') appId?: string,
    @Query('conversationId') conversationId?: string,
    @Query('classId') classId?: string,
    @Query('exerciseId') exerciseId?: string,
    @Query('exerciseSetId') exerciseSetId?: string,
    @Req() req?: Request,
  ) {
    const user = (req as any).user;
    return this.widgetService.getWidgetStates(user.sub, {
      appId,
      conversationId,
      classId,
      exerciseId,
      exerciseSetId,
    });
  }

  @Patch('state/:widgetId')
  @ApiOperation({ summary: 'Update widget state (partial merge)' })
  @ApiParam({ name: 'widgetId', description: 'Widget instance ID' })
  @ApiQuery({ name: 'merge', required: false, type: Boolean, description: 'Merge with existing state (default: true)' })
  @ApiBody({ type: UpdateWidgetStateDto })
  @ApiResponse({ status: 200, description: 'Widget state updated', type: WidgetStateResponseDto })
  async updateWidgetState(
    @Param('widgetId') widgetId: string,
    @Body() body: UpdateWidgetStateDto,
    @Query('merge') merge: string = 'true',
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.widgetService.updateWidgetState(
      widgetId,
      user.sub,
      body.widgetState,
      merge !== 'false',
    );
  }

  @Delete('state/:widgetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete widget state' })
  @ApiParam({ name: 'widgetId', description: 'Widget instance ID' })
  @ApiResponse({ status: 204, description: 'Widget state deleted' })
  async deleteWidgetState(
    @Param('widgetId') widgetId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    await this.widgetService.deleteWidgetState(widgetId, user.sub);
  }

  @Delete('states/exercise/:exerciseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all widget states for an exercise' })
  @ApiParam({ name: 'exerciseId', description: 'Exercise ID' })
  @ApiResponse({ status: 204, description: 'Widget states deleted' })
  async deleteExerciseStates(
    @Param('exerciseId') exerciseId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    await this.widgetService.deleteWidgetStatesForExercise(exerciseId, user.sub);
  }

  // ============================================================================
  // User Preferences Endpoints
  // ============================================================================

  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiResponse({ status: 200, description: 'User preferences', type: UserPreferenceResponseDto })
  async getUserPreferences(@Req() req: Request) {
    const user = (req as any).user;
    return this.widgetService.getUserPreferences(user.sub);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiBody({ type: UpdateUserPreferenceDto })
  @ApiResponse({ status: 200, description: 'Preferences updated', type: UserPreferenceResponseDto })
  async updateUserPreferences(
    @Body() body: UpdateUserPreferenceDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.widgetService.updateUserPreferences(user.sub, body);
  }

  @Get('preferences/app/:appId')
  @ApiOperation({ summary: 'Get preferences for a specific app' })
  @ApiParam({ name: 'appId', description: 'App ID (e.g., "codegen")' })
  @ApiResponse({ status: 200, description: 'App preferences' })
  async getAppPreferences(
    @Param('appId') appId: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.widgetService.getAppPreferences(user.sub, appId);
  }

  @Patch('preferences/app/:appId')
  @ApiOperation({ summary: 'Update preferences for a specific app' })
  @ApiParam({ name: 'appId', description: 'App ID (e.g., "codegen")' })
  @ApiResponse({ status: 200, description: 'App preferences updated' })
  async updateAppPreferences(
    @Param('appId') appId: string,
    @Body() preferences: Record<string, any>,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.widgetService.updateAppPreferences(user.sub, appId, preferences);
  }
}
