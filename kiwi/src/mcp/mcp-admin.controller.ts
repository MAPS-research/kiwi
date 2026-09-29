import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
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
  CreateMcpServerDto,
  UpdateMcpServerDto,
  McpServerResponseDto,
  McpServerTestResponseDto,
  OAuthDiscoverRequestDto,
  OAuthDiscoverResponseDto,
} from './dto/mcp-server.dto';
import {
  OAuthRegisterRequestDto,
  OAuthRegisterResponseDto,
} from './dto/oauth-register.dto';
import {
  AssignMcpServerDto,
  UpdateClassMcpServerDto,
  ClassMcpServerResponseDto,
  ClassSummaryDto,
} from './dto/class-mcp-server.dto';

/**
 * MCP Admin Controller
 *
 * Admin-only endpoints for managing MCP server configurations.
 * Servers are now GLOBAL and can be assigned to multiple classes.
 * Allows admins to:
 * - Create/manage global MCP server configurations
 * - Assign/remove servers to/from classes
 * - Configure class-specific server settings
 * - Test MCP server connections
 * - List tools provided by MCP servers
 */
@ApiTags('MCP Admin')
@Controller('mcp/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('bearerAuth')
export class McpAdminController {
  private readonly logger = new Logger(McpAdminController.name);

  constructor(private readonly mcpService: McpService) {}

  /**
   * Create a new MCP server configuration
   */
  @Post('servers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new MCP server configuration' })
  @ApiBody({ type: CreateMcpServerDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'MCP server created successfully',
    type: McpServerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have admin permissions',
  })
  async createMcpServer(
    @Body() createDto: CreateMcpServerDto,
    @Session() session: { userId: string; userRole?: string },
  ): Promise<McpServerResponseDto> {
    this.logger.log(
      `User ${session.userId} creating MCP server: ${createDto.name}`,
    );

    return await this.mcpService.createMcpServer(createDto, session.userId);
  }

  /**
   * Get all global MCP servers
   */
  @Get('servers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all global MCP servers' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all global MCP servers',
    type: [McpServerResponseDto],
  })
  async listMcpServers(
    @Session() session: { userId: string },
  ): Promise<McpServerResponseDto[]> {
    this.logger.log(`User ${session.userId} listing all global MCP servers`);

    return await this.mcpService.listAllMcpServers();
  }

  /**
   * Get a specific MCP server by ID
   */
  @Get('servers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get MCP server by ID' })
  @ApiParam({ name: 'id', description: 'MCP server ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MCP server details',
    type: McpServerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'MCP server not found',
  })
  async getMcpServer(
    @Param('id') id: string,
    @Session() session: { userId: string },
  ): Promise<McpServerResponseDto> {
    this.logger.log(`User ${session.userId} getting MCP server ${id}`);

    return await this.mcpService.getMcpServer(id);
  }

  /**
   * Update an MCP server configuration
   */
  @Put('servers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update MCP server configuration' })
  @ApiParam({ name: 'id', description: 'MCP server ID' })
  @ApiBody({ type: UpdateMcpServerDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MCP server updated successfully',
    type: McpServerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'MCP server not found',
  })
  async updateMcpServer(
    @Param('id') id: string,
    @Body() updateDto: UpdateMcpServerDto,
    @Session() session: { userId: string },
  ): Promise<McpServerResponseDto> {
    this.logger.log(`User ${session.userId} updating MCP server ${id}`);

    return await this.mcpService.updateMcpServer(id, updateDto);
  }

  /**
   * Delete an MCP server configuration
   */
  @Delete('servers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete MCP server configuration' })
  @ApiParam({ name: 'id', description: 'MCP server ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'MCP server deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'MCP server not found',
  })
  async deleteMcpServer(
    @Param('id') id: string,
    @Session() session: { userId: string },
  ): Promise<void> {
    this.logger.log(`User ${session.userId} deleting MCP server ${id}`);

    await this.mcpService.deleteMcpServer(id);
  }

  /**
   * Test connection to an MCP server
   */
  @Post('servers/:id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test connection to MCP server',
    description:
      'Attempts to connect to the MCP server and list available tools',
  })
  @ApiParam({ name: 'id', description: 'MCP server ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connection test result',
    type: McpServerTestResponseDto,
  })
  async testMcpServer(
    @Param('id') id: string,
    @Session() session: { userId: string },
  ): Promise<McpServerTestResponseDto> {
    this.logger.log(`User ${session.userId} testing MCP server ${id}`);

    return await this.mcpService.testMcpServer(id, session.userId);
  }

  /**
   * List tools available from an MCP server
   */
  @Get('servers/:id/tools')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List tools from MCP server' })
  @ApiParam({ name: 'id', description: 'MCP server ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of available tools',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          inputSchema: { type: 'object' },
        },
      },
    },
  })
  async listMcpServerTools(
    @Param('id') id: string,
    @Session() session: { userId: string },
  ): Promise<any[]> {
    this.logger.log(
      `User ${session.userId} listing tools from MCP server ${id}`,
    );

    return await this.mcpService.listMcpServerTools(id);
  }

  /**
   * Discover OAuth metadata from a URL
   */
  @Post('oauth-discover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Discover OAuth metadata from well-known endpoints',
    description:
      'Attempts to discover OAuth configuration from RFC 8414 (.well-known/oauth-authorization-server) and OIDC (.well-known/openid-configuration) endpoints',
  })
  @ApiBody({ type: OAuthDiscoverRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Discovery result (success or failure with error message)',
    type: OAuthDiscoverResponseDto,
  })
  async discoverOAuthMetadata(
    @Body() discoverDto: OAuthDiscoverRequestDto,
    @Session() session: { userId: string },
  ): Promise<OAuthDiscoverResponseDto> {
    this.logger.log(
      `User ${session.userId} discovering OAuth metadata from: ${discoverDto.url}`,
    );

    return await this.mcpService.discoverOAuthMetadata(discoverDto.url);
  }

  /**
   * Register OAuth client with MCP server via Dynamic Client Registration (RFC 7591)
   */
  @Post('oauth-register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register OAuth client with MCP server via DCR',
    description:
      'Registers a new OAuth client with the MCP server using Dynamic Client Registration (RFC 7591). The client_secret is encrypted and stored securely.',
  })
  @ApiBody({ type: OAuthRegisterRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Registration result with client_id',
    type: OAuthRegisterResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'MCP server not found',
  })
  async registerOAuthClient(
    @Body() registerDto: OAuthRegisterRequestDto,
    @Session() session: { userId: string },
  ): Promise<OAuthRegisterResponseDto> {
    this.logger.log(
      `User ${session.userId} registering OAuth client for server ${registerDto.serverId}`,
    );

    return await this.mcpService.registerOAuthClient(registerDto);
  }

  // ============================================
  // Class-Server Assignment Endpoints
  // ============================================

  /**
   * Assign an MCP server to a class
   */
  @Post('servers/:serverId/assign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign MCP server to a class' })
  @ApiParam({ name: 'serverId', description: 'MCP server ID to assign' })
  @ApiBody({ type: AssignMcpServerDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Server assigned to class successfully',
    type: ClassMcpServerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Server or class not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Server already assigned to this class',
  })
  async assignServerToClass(
    @Param('serverId') serverId: string,
    @Body() assignDto: AssignMcpServerDto,
    @Session() session: { userId: string },
  ): Promise<ClassMcpServerResponseDto> {
    this.logger.log(
      `User ${session.userId} assigning server ${serverId} to class ${assignDto.classId}`,
    );

    return await this.mcpService.assignServerToClass(
      serverId,
      assignDto,
      session.userId,
    );
  }

  /**
   * Remove an MCP server assignment from a class
   */
  @Delete('classes/:classId/servers/:serverId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove MCP server assignment from class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'serverId', description: 'MCP server ID to remove' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Server removed from class successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assignment not found',
  })
  async removeServerFromClass(
    @Param('classId') classId: string,
    @Param('serverId') serverId: string,
    @Session() session: { userId: string },
  ): Promise<void> {
    this.logger.log(
      `User ${session.userId} removing server ${serverId} from class ${classId}`,
    );

    await this.mcpService.removeServerFromClass(classId, serverId);
  }

  /**
   * Update class-specific settings for an MCP server assignment
   */
  @Put('classes/:classId/servers/:serverId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update class-server assignment settings' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiParam({ name: 'serverId', description: 'MCP server ID' })
  @ApiBody({ type: UpdateClassMcpServerDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assignment updated successfully',
    type: ClassMcpServerResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assignment not found',
  })
  async updateClassServerSettings(
    @Param('classId') classId: string,
    @Param('serverId') serverId: string,
    @Body() updateDto: UpdateClassMcpServerDto,
    @Session() session: { userId: string },
  ): Promise<ClassMcpServerResponseDto> {
    this.logger.log(
      `User ${session.userId} updating assignment for server ${serverId} in class ${classId}`,
    );

    return await this.mcpService.updateClassServerSettings(
      classId,
      serverId,
      updateDto,
    );
  }

  /**
   * Get all MCP servers assigned to a class
   */
  @Get('classes/:classId/servers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List MCP servers assigned to a class' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of servers assigned to the class',
    type: [ClassMcpServerResponseDto],
  })
  async getClassServers(
    @Param('classId') classId: string,
    @Session() session: { userId: string },
  ): Promise<ClassMcpServerResponseDto[]> {
    this.logger.log(
      `User ${session.userId} listing servers for class ${classId}`,
    );

    return await this.mcpService.getClassServers(classId);
  }

  /**
   * Get all classes that have a specific MCP server assigned
   */
  @Get('servers/:serverId/classes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List classes using an MCP server' })
  @ApiParam({ name: 'serverId', description: 'MCP server ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of classes using this server',
    type: [ClassSummaryDto],
  })
  async getServerClasses(
    @Param('serverId') serverId: string,
    @Session() session: { userId: string },
  ): Promise<ClassSummaryDto[]> {
    this.logger.log(
      `User ${session.userId} listing classes for server ${serverId}`,
    );

    return await this.mcpService.getServerClasses(serverId);
  }
}
