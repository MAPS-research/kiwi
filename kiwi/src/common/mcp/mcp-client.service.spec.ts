import type { McpServer } from '@prisma/client';
import { McpClientService } from './mcp-client.service';

/**
 * The tool list is part of the prompt prefix the engine caches, so it has to be
 * the same on every replica and it must not disappear when a server hiccups.
 */
describe('McpClientService tool-list cache', () => {
  const serverConfig = {
    id: 'server-1',
    name: 'Server One',
    transport: 'http',
    config: { url: 'https://example.test/mcp' },
  } as unknown as McpServer;

  let store: Map<string, string>;
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let service: McpClientService;
  let listTools: jest.Mock;

  /** Stand in for the connected MCP client so no transport is opened. */
  const stubClient = (svc: McpClientService) => {
    (svc as any).getClient = jest.fn().mockResolvedValue({ listTools });
  };

  beforeEach(() => {
    store = new Map();
    redis = {
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
        return 'OK' as const;
      }),
      del: jest.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
    };
    listTools = jest
      .fn()
      .mockResolvedValue({ tools: [{ name: 'alpha' }, { name: 'beta' }] });

    service = new McpClientService(redis as any);
    stubClient(service);
  });

  it('caches a fresh listing in Redis under mcp:tools:<serverId>', async () => {
    await service.listTools(serverConfig);

    expect(redis.set).toHaveBeenCalledWith(
      'mcp:tools:server-1',
      expect.any(String),
      expect.any(Number),
    );
    expect(JSON.parse(store.get('mcp:tools:server-1')!).tools).toHaveLength(2);
  });

  it('serves the in-process L1 cache without re-listing', async () => {
    await service.listTools(serverConfig);
    await service.listTools(serverConfig);

    expect(listTools).toHaveBeenCalledTimes(1);
  });

  it('shares the list across processes through Redis', async () => {
    await service.listTools(serverConfig);

    // A second replica: cold L1, same Redis.
    const replica = new McpClientService(redis as any);
    const replicaListTools = jest.fn();
    (replica as any).getClient = jest
      .fn()
      .mockResolvedValue({ listTools: replicaListTools });

    const tools = await replica.listTools(serverConfig);

    expect(tools.map((t: any) => t.name)).toEqual(['alpha', 'beta']);
    expect(replicaListTools).not.toHaveBeenCalled();
  });

  it('keys per access token', async () => {
    await service.listTools(serverConfig, 'token-abc');

    const keys = [...store.keys()];
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^mcp:tools:server-1:/);
    expect(keys[0]).not.toBe('mcp:tools:server-1');
  });

  it('serves the last-good list when listTools fails after the fresh window', async () => {
    await service.listTools(serverConfig);

    // Age the cached entry past the freshness window on both tiers.
    const stale = JSON.parse(store.get('mcp:tools:server-1')!);
    stale.cachedAt = Date.now() - 10 * 60 * 1000;
    store.set('mcp:tools:server-1', JSON.stringify(stale));
    (service as any).toolCache.clear();

    listTools.mockRejectedValue(new Error('server down'));

    const tools = await service.listTools(serverConfig);

    expect(listTools).toHaveBeenCalledTimes(2);
    expect(tools.map((t: any) => t.name)).toEqual(['alpha', 'beta']);
  });

  it('rethrows when a listTools failure has no last-good list to fall back on', async () => {
    listTools.mockRejectedValue(new Error('server down'));

    await expect(service.listTools(serverConfig)).rejects.toThrow(
      'server down',
    );
  });

  it('evicts both cache tiers when the server config changes', async () => {
    await service.listTools(serverConfig);

    service.clearToolCache('server-1');
    await Promise.resolve();

    expect(redis.del).toHaveBeenCalledWith('mcp:tools:server-1');
    expect((service as any).toolCache.size).toBe(0);
  });
});
