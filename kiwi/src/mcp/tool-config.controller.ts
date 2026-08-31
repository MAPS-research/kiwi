import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Put,
  Session,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, AdminGuard } from '../auth/auth.guard';
import { McpService } from './mcp.service';
import {
  BulkToolConfigDto,
  ToolConfigResponseDto,
  UpdateToolStatusDto,
} from './dto/tool-config.dto';

/**
 * Tool Configuration Controller
 *
 * Manages which tools are available for each class.
 * Allows admins to:
 * - View all available tools for a class (built-in + MCP)
 * - Enable/disable specific tools
 * - Configure which chat types can use each tool
 * - Bulk update tool configurations
 */
@ApiTags('Tool Configuration')
@Controller('mcp/tools')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('bearerAuth')
export class ToolConfigController {
  private readonly logger = new Logger(ToolConfigController.name);

  constructor(private readonly mcpService: McpService) {}

  /**
   * Get all tool configurations for a class
   */
  @Get('classes/:classId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all tools for a class',
    description:
      'Returns all available tools (built-in + MCP) with their configuration status',
  })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of tool configurations',
    type: [ToolConfigResponseDto],
  })
  async getToolsForClass(
    @Param('classId') classId: string,
    @Session() session: { userId: string },
  ): Promise<ToolConfigResponseDto[]> {
    this.logger.log(
      `User ${session.userId} fetching tool configs for class ${classId}`,
    );

    return await this.mcpService.getToolConfigsForClass(classId);
  }

  /**
   * Update a specific tool configuration
   */
  @Put('config/:toolConfigId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tool configuration' })
  @ApiParam({ name: 'toolConfigId', description: 'Tool configuration ID' })
  @ApiBody({ type: UpdateToolStatusDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tool configuration updated',
    type: ToolConfigResponseDto,
  })
  async updateToolConfig(
    @Param('toolConfigId') toolConfigId: string,
    @Body() updateDto: UpdateToolStatusDto,
    @Session() session: { userId: string },
  ): Promise<ToolConfigResponseDto> {
    this.logger.log(
      `User ${session.userId} updating tool config ${toolConfigId}`,
    );

    return await this.mcpService.updateToolConfig(toolConfigId, updateDto);
  }

  /**
   * Bulk update tool configurations for a class
   */
  @Put('classes/:classId/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk update tool configurations',
    description: 'Update multiple tool configurations at once',
  })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: BulkToolConfigDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tool configurations updated',
    type: [ToolConfigResponseDto],
  })
  async bulkUpdateToolConfigs(
    @Param('classId') classId: string,
    @Body() bulkDto: BulkToolConfigDto,
    @Session() session: { userId: string },
  ): Promise<ToolConfigResponseDto[]> {
    this.logger.log(
      `User ${session.userId} bulk updating tool configs for class ${classId}`,
    );

    return await this.mcpService.bulkUpdateToolConfigs(classId, bulkDto);
  }
}
