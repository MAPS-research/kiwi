import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Logger,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { McpService } from './mcp-server-impl.service';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCErrorResponse as JSONRPCError,
  InitializeRequest,
  ReadResourceRequest,
  CallToolRequest,
} from '@modelcontextprotocol/server';

@ApiTags('MCP')
@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private readonly mcpService: McpService) {}

  @Get('capabilities')
  @ApiOperation({ summary: 'Get MCP server capabilities' })
  @ApiResponse({ status: 200, description: 'MCP server capabilities' })
  getCapabilities() {
    return {
      protocol: 'mcp',
      version: '0.1.0',
      capabilities: {
        resources: {
          subscribe: false,
          listChanged: false,
        },
        tools: {},
        prompts: {},
      },
      serverInfo: {
        name: 'kiwi-mcp-server',
        version: '1.0.0',
      },
    };
  }

  @Post('rpc')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Handle MCP JSON-RPC requests' })
  @ApiResponse({ status: 200, description: 'MCP JSON-RPC response' })
  async handleRpcRequest(
    @Body() request: JSONRPCRequest,
    @Request() req: any,
  ): Promise<JSONRPCResponse | JSONRPCError> {
    this.logger.debug('MCP RPC request:', request);

    const userId = req.user?.sub;
    if (!userId) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32600,
          message: 'Invalid request - user not authenticated',
        },
      } as JSONRPCError;
    }

    try {
      const result = await this.handleMethod(request, userId);

      return {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
    } catch (error) {
      this.logger.error('MCP RPC error:', error);

      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error.message || 'Internal error',
        },
      } as JSONRPCError;
    }
  }

  private async handleMethod(
    request: JSONRPCRequest,
    userId: string,
  ): Promise<any> {
    switch (request.method) {
      case 'initialize':
        return this.handleInitialize(
          request as JSONRPCRequest & { params: InitializeRequest },
        );

      case 'resources/list':
        return this.mcpService.listResources(userId);

      case 'resources/read':
        const readRequest = request as JSONRPCRequest & {
          params: ReadResourceRequest;
        };
        return this.mcpService.getResource(
          readRequest.params.uri as string,
          userId,
        );

      case 'tools/list':
        return this.mcpService.listTools();

      case 'tools/call':
        const toolRequest = request as JSONRPCRequest & {
          params: CallToolRequest;
        };
        return this.mcpService.callTool(
          toolRequest.params.name as string,
          toolRequest.params.arguments || {},
          userId,
        );

      default:
        throw new Error(`Unknown method: ${request.method}`);
    }
  }

  private async handleInitialize(
    request: JSONRPCRequest & { params: InitializeRequest },
  ) {
    this.logger.debug('MCP initialize request:', request.params);

    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        resources: {
          subscribe: false,
          listChanged: false,
        },
        tools: {},
        prompts: {},
      },
      serverInfo: {
        name: 'kiwi-mcp-server',
        version: '1.0.0',
      },
    };
  }

  @Post('notifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Handle MCP notifications' })
  @ApiResponse({ status: 200, description: 'Notification received' })
  async handleNotification(@Body() notification: any) {
    this.logger.debug('MCP notification:', notification);

    // Handle notifications like initialized, etc.
    switch (notification.method) {
      case 'notifications/initialized':
        this.logger.debug('MCP client initialized');
        break;

      default:
        this.logger.debug('Unknown notification:', notification.method);
    }

    return { status: 'ok' };
  }
}
