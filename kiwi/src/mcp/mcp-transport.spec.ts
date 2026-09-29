import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { SmartJwtAuthGuard } from '../auth/auth.guard';
import { McpHttpController, mcpStrategy } from './mcp-http.controller';
import { ClassManagementTool } from './tools/class-management.tool';
import { StorageResource } from './resources/storage.resource';
import { SystemPromptsProvider } from './prompts/system-prompts.provider';
import { UserService } from '../common/database/user.service';
import { ClassService } from '../class/class.service';
import { StorageService } from '../common/storage/storage.service';
import { ClassChunksTool } from './tools/class-chunks.tool';
import { AppChunksService } from '../kiwi-app/app-chunks.service';
import { KiwiAppService } from '../kiwi-app/kiwi-app.service';
import { McpClientService } from '../common/mcp/mcp-client.service';
import type { McpServer } from '@prisma/client';

describe('MCP HTTP transport', () => {
  let app: INestApplication;
  let url: string;
  let token: string;
  let client: Client;
  let jwt: JwtService;
  const getChunks = jest
    .fn()
    .mockResolvedValue({ documents: [], hasMore: false });
  const user = {
    id: 'mcp-test-user',
    email: 'mcp@example.test',
    systemRole: 'admin',
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'local-mcp-regression-test' })],
      controllers: [
        McpHttpController,
        ClassManagementTool,
        ClassChunksTool,
        StorageResource,
        SystemPromptsProvider,
      ],
      providers: [
        SmartJwtAuthGuard,
        { provide: APP_GUARD, useClass: SmartJwtAuthGuard },
        {
          provide: UserService,
          useValue: { user: jest.fn().mockResolvedValue(user) },
        },
        {
          provide: ClassService,
          useValue: {
            getEnrollmentsPerUser: jest.fn().mockResolvedValue([]),
            enroll: jest.fn().mockResolvedValue({ enrolled: 1 }),
          },
        },
        {
          provide: StorageService,
          useValue: {
            generateSignedUrl: jest
              .fn()
              .mockResolvedValue('https://example.test/document'),
          },
        },
        {
          provide: AppChunksService,
          useValue: { getClassDocumentChunks: getChunks },
        },
        { provide: KiwiAppService, useValue: { logAuditEvent: jest.fn() } },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    mcpStrategy.setHttpAdapter(app.getHttpAdapter());
    app.connectMicroservice({ strategy: mcpStrategy });
    await app.startAllMicroservices();
    await app.listen(0, '127.0.0.1');
    url = `${await app.getUrl()}/mcp`;
    jwt = module.get(JwtService);
    token = await jwt.signAsync({ sub: user.id });
  });

  afterAll(async () => {
    await client?.close();
    await app?.close();
  });

  it('rejects requests without a bearer token', async () => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(response.status).toBe(401);
  });

  it('initializes and executes discovered handlers with the authenticated request', async () => {
    client = new Client({ name: 'kiwi-regression-test', version: '1.0.0' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(url), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      }),
    );
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain(
      'get_authenticated_user',
    );
    const result = await client.callTool({
      name: 'get_authenticated_user',
      arguments: {},
    });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.content)).toContain(user.email);
    const templates = await client.listResourceTemplates();
    expect(
      templates.resourceTemplates.map((template) => template.uriTemplate),
    ).toContain('kiwi://storage/document/{key*}');
    const resource = await client.readResource({
      uri: 'kiwi://storage/document/folder/example.txt',
    });
    expect(JSON.stringify(resource.contents)).toContain(
      'https://example.test/document',
    );
    expect(
      (await client.listPrompts()).prompts.map((prompt) => prompt.name),
    ).toContain('default-system-prompt');
    expect(
      (await client.getPrompt({ name: 'default-system-prompt' })).messages
        .length,
    ).toBeGreaterThan(0);
  });

  it('delivers progress notifications on the streaming response', async () => {
    const onprogress = jest.fn();
    const result = await client.callTool(
      {
        name: 'add_users_to_class',
        arguments: {
          classId: 'test-class',
          userEmails: ['student@example.test'],
        },
      },
      { onprogress },
    );
    expect(result.isError).not.toBe(true);
    expect(onprogress).toHaveBeenCalledWith(
      expect.objectContaining({ progress: 100 }),
    );
  });

  it('retains app-token scope and class restrictions through the RPC pipeline', async () => {
    const scopedClient = new Client({ name: 'scoped-client', version: '1' });
    const scopedToken = await jwt.signAsync({
      sub: user.id,
      type: 'app_token',
      appSlug: 'test-app',
      classId: 'test-class',
      scopes: ['class:materials:chunks:read'],
    });
    try {
      await scopedClient.connect(
        new StreamableHTTPClientTransport(new URL(url), {
          requestInit: { headers: { Authorization: `Bearer ${scopedToken}` } },
        }),
      );
      const allowed = await scopedClient.callTool({
        name: 'get_class_document_chunks',
        arguments: { classId: 'test-class' },
      });
      expect(allowed.isError).not.toBe(true);
      expect(getChunks).toHaveBeenCalledTimes(1);
      const denied = await scopedClient.callTool({
        name: 'get_class_document_chunks',
        arguments: { classId: 'other-class' },
      });
      expect(denied.isError).toBe(true);
      expect(getChunks).toHaveBeenCalledTimes(1);
    } finally {
      await scopedClient.close();
    }
  });

  it('connects through the application outbound MCP client', async () => {
    const service = new McpClientService({
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any);
    const server = {
      id: 'local-regression',
      name: 'Local test',
      transport: 'http',
      config: { url },
      description: null,
      requiresOAuth: false,
      oauthMetadata: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
    } as McpServer;
    try {
      const tools = await service.listTools(server, token);
      expect(tools.map((tool) => tool.name)).toContain(
        'get_authenticated_user',
      );
    } finally {
      await service.disconnectAll();
    }
  });

  it('serves modern sessionless discovery while retaining HTTP authentication', async () => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2026-07-28',
        Authorization: `Bearer ${token}`,
        'Mcp-Method': 'tools/list',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/list',
        params: {
          _meta: {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientCapabilities': {},
          },
        },
      }),
    });
    const body = await response.text();
    expect({
      status: response.status,
      body: response.ok ? 'ok' : body,
    }).toEqual({ status: 200, body: 'ok' });
    expect(body).toContain('get_authenticated_user');
  });
});
