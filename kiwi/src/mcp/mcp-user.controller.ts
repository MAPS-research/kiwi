import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Query,
  Res,
  Session,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { McpService } from './mcp.service';
import {
  McpConnectionResponseDto,
  OAuthInitiateResponseDto,
  OAuthCallbackQueryDto,
} from './dto/mcp-connection.dto';

/**
 * MCP User Controller
 *
 * User-facing endpoints for managing OAuth connections to MCP servers.
 * Allows users to:
 * - View their MCP server connections
 * - Initiate OAuth flow to connect to an MCP server
 * - Handle OAuth callback
 * - Disconnect from an MCP server
 */
@ApiTags('MCP User')
@Controller('mcp/user')
export class McpUserController {
  private readonly logger = new Logger(McpUserController.name);

  constructor(
    private readonly mcpService: McpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get user's MCP connections
   */
  @Get('connections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List user MCP connections' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user connections',
    type: [McpConnectionResponseDto],
  })
  async getUserConnections(
    @Session() session: { userId: string },
  ): Promise<McpConnectionResponseDto[]> {
    this.logger.log(`User ${session.userId} fetching MCP connections`);

    return await this.mcpService.getUserConnections(session.userId);
  }

  /**
   * Initiate OAuth flow for an MCP server
   */
  @Get('servers/:serverId/authorize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Initiate OAuth authorization',
    description:
      'Redirects user to OAuth provider for authorization. The authorization URL is returned.',
  })
  @ApiParam({ name: 'serverId', description: 'MCP server ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authorization URL',
    type: OAuthInitiateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Server does not require OAuth',
  })
  async initiateOAuth(
    @Param('serverId') serverId: string,
    @Session() session: { userId: string },
  ): Promise<OAuthInitiateResponseDto> {
    this.logger.log(
      `User ${session.userId} initiating OAuth for MCP server ${serverId}`,
    );

    return await this.mcpService.initiateOAuth(session.userId, serverId);
  }

  /**
   * OAuth callback handler
   * Redirects user back to frontend after processing OAuth callback
   */
  @Get('oauth/callback')
  @ApiOperation({
    summary: 'OAuth callback endpoint',
    description:
      'Handles OAuth provider callback with authorization code. Exchanges code for tokens, creates connection, and redirects to frontend.',
  })
  @ApiQuery({ name: 'code', description: 'Authorization code' })
  @ApiQuery({ name: 'state', description: 'State parameter for verification' })
  @ApiQuery({
    name: 'error',
    required: false,
    description: 'Error code if authorization failed',
  })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to frontend after OAuth completion',
  })
  async handleOAuthCallback(
    @Query() query: OAuthCallbackQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log('Handling OAuth callback');

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

    if (query.error) {
      this.logger.error(
        `OAuth error: ${query.error} - ${query.error_description}`,
      );
      return res.redirect(
        `${frontendUrl}/?mcp_oauth_error=${encodeURIComponent(query.error)}`,
      );
    }

    try {
      await this.mcpService.handleOAuthCallback(query.code, query.state);
      this.logger.log('OAuth callback successful, redirecting to frontend');
      return res.redirect(`${frontendUrl}/?mcp_oauth_success=true`);
    } catch (error) {
      this.logger.error('OAuth callback error:', error);
      return res.redirect(
        `${frontendUrl}/?mcp_oauth_error=${encodeURIComponent(error.message || 'Unknown error')}`,
      );
    }
  }

  /**
   * Disconnect user from an MCP server
   */
  @Delete('connections/:connectionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect from MCP server' })
  @ApiParam({ name: 'connectionId', description: 'Connection ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Connection deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Connection not found',
  })
  async disconnectMcpServer(
    @Param('connectionId') connectionId: string,
    @Session() session: { userId: string },
  ): Promise<void> {
    this.logger.log(
      `User ${session.userId} disconnecting connection ${connectionId}`,
    );

    await this.mcpService.disconnectUser(session.userId, connectionId);
  }
}
