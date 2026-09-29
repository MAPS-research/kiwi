import { ToolRegistryService } from './tool-registry.service';

/**
 * Tool ORDER is part of the prompt prefix the engine caches, so these are
 * cache-correctness tests, not cosmetics: any reshuffle of `tools[]` is a full
 * cache miss even when the messages are byte-identical.
 */
describe('ToolRegistryService tool ordering determinism', () => {
  const mcpServer = {
    id: 'server-1',
    name: 'Server One',
    isActive: true,
    requiresOAuth: false,
  };

  const buildService = (options: { mcpTools?: any[]; systemRole?: string }) => {
    const classMcpServerFindMany = jest
      .fn()
      .mockResolvedValue([{ id: 'assignment-1', priority: 0, mcpServer }]);

    const prisma = {
      classToolConfig: { findMany: jest.fn().mockResolvedValue([]) },
      classMcpServer: { findMany: classMcpServerFindMany },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ systemRole: options.systemRole ?? 'student' }),
      },
      instructorClass: { findUnique: jest.fn().mockResolvedValue(null) },
      enrollment: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const mcpClient = {
      listTools: jest.fn().mockResolvedValue(options.mcpTools ?? []),
    };

    const service = new ToolRegistryService(
      prisma as any,
      mcpClient as any,
      { getConnection: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    return { service, prisma, mcpClient, classMcpServerFindMany };
  };

  it('orders MCP server assignments by priority with an id tiebreak', async () => {
    const { service, classMcpServerFindMany } = buildService({});

    await service.getToolsForClass('class-1', 'pdf', 'user-1');

    expect(classMcpServerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ priority: 'desc' }, { id: 'asc' }],
      }),
    );
  });

  it("sorts each MCP server's tools by name", async () => {
    const { service } = buildService({
      mcpTools: [
        { name: 'zeta', description: 'z', inputSchema: {} },
        { name: 'alpha', description: 'a', inputSchema: {} },
        { name: 'mid', description: 'm', inputSchema: {} },
      ],
    });

    const tools = await service.getToolsForClass('class-1', 'pdf', 'user-1');
    const mcpNames = tools
      .map((t) => t.function.name)
      .filter((name) => ['zeta', 'alpha', 'mid'].includes(name));

    expect(mcpNames).toEqual(['alpha', 'mid', 'zeta']);
  });

  it('produces the same tool list when the MCP server reorders its tools', async () => {
    const forward = buildService({
      mcpTools: [
        { name: 'alpha', description: 'a', inputSchema: {} },
        { name: 'zeta', description: 'z', inputSchema: {} },
      ],
    });
    const reversed = buildService({
      mcpTools: [
        { name: 'zeta', description: 'z', inputSchema: {} },
        { name: 'alpha', description: 'a', inputSchema: {} },
      ],
    });

    const a = await forward.service.getToolsForClass('class-1', 'pdf', 'u');
    const b = await reversed.service.getToolsForClass('class-1', 'pdf', 'u');

    expect(a.map((t) => t.function.name)).toEqual(
      b.map((t) => t.function.name),
    );
  });

  it('keeps the section order built-ins -> MCP -> analytics', async () => {
    const { service } = buildService({
      mcpTools: [{ name: 'mcp-tool', description: 'm', inputSchema: {} }],
      systemRole: 'admin',
    });

    const names = (
      await service.getToolsForClass('class-1', 'pdf', 'user-1')
    ).map((t) => t.function.name);

    expect(names).toEqual([
      'rag',
      'code-interpreter',
      'open_material',
      'mcp-tool',
      'class-analytics',
    ]);
  });

  it("drops a failing server's tools but keeps the rest of the list intact", async () => {
    const { service, mcpClient } = buildService({});
    mcpClient.listTools.mockRejectedValue(new Error('server down'));

    const names = (
      await service.getToolsForClass('class-1', 'pdf', 'user-1')
    ).map((t) => t.function.name);

    expect(names).toEqual(['rag', 'code-interpreter', 'open_material']);
  });
});
