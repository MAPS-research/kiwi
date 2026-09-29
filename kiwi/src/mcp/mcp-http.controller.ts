import { Controller, UseGuards } from '@nestjs/common';
import {
  McpHttpControllerFor,
  McpStrategy,
  StreamableHttpTransport,
} from '@rekog/mcp-nest';
import { SmartJwtAuthGuard } from '../auth/auth.guard';

const transport = new StreamableHttpTransport({
  statefulMode: true,
  enableJsonResponse: false,
});

export const mcpStrategy = new McpStrategy({
  name: 'kiwi-mcp-server',
  version: '1.0.0',
  transports: [transport],
  instructions:
    'MCP server for Kiwi learning platform - provides access to classes, materials, chat, and analytics',
});

// Claim the HTTP route so authentication runs for every transport request.
@Controller('mcp')
@UseGuards(SmartJwtAuthGuard)
export class McpHttpController extends McpHttpControllerFor(transport) {}
