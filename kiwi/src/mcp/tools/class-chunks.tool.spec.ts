import { Test } from '@nestjs/testing';
import { ClassChunksTool } from './class-chunks.tool';
import { AppChunksService } from 'src/kiwi-app/app-chunks.service';
import { KiwiAppService } from 'src/kiwi-app/kiwi-app.service';

describe('ClassChunksTool', () => {
  let tool: ClassChunksTool;

  const appChunksService = {
    getClassDocumentChunks: jest.fn(),
  };

  const kiwiAppService = {
    getUserClassRole: jest.fn(),
    logAuditEvent: jest.fn(),
  };

  const mcpContext = { reportProgress: jest.fn() } as any;

  const appTokenRequest = (overrides: object = {}) =>
    ({
      appContext: {
        appSlug: 'flashcards',
        classId: 'class-1',
        scopes: ['class:materials:chunks:read'],
        userId: 'user-1',
        ...overrides,
      },
    }) as any;

  const emptyResult = {
    classId: 'class-1',
    documents: [],
    nextCursor: null,
    hasMore: false,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClassChunksTool,
        { provide: AppChunksService, useValue: appChunksService },
        { provide: KiwiAppService, useValue: kiwiAppService },
      ],
    }).compile();
    tool = moduleRef.get(ClassChunksTool);
  });

  it('serves an app token with the chunks scope and audits the call', async () => {
    appChunksService.getClassDocumentChunks.mockResolvedValue(emptyResult);

    const result = await tool.getClassDocumentChunks(
      { classId: 'class-1' },
      mcpContext,
      appTokenRequest(),
    );

    expect(result.isError).toBeUndefined();
    expect(appChunksService.getClassDocumentChunks).toHaveBeenCalledWith({
      classId: 'class-1',
      documentIds: undefined,
      cursor: undefined,
      limit: undefined,
    });
    expect(kiwiAppService.logAuditEvent).toHaveBeenCalledWith(
      'mcp_call',
      'flashcards',
      'user-1',
      'class-1',
      expect.objectContaining({ tool: 'get_class_document_chunks' }),
      expect.anything(),
    );
  });

  it('rejects an app token missing the chunks scope', async () => {
    const result = await tool.getClassDocumentChunks(
      { classId: 'class-1' },
      mcpContext,
      appTokenRequest({ scopes: ['class:info:read'] }),
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('class:materials:chunks:read');
    expect(appChunksService.getClassDocumentChunks).not.toHaveBeenCalled();
  });

  it('rejects an app token scoped to a different class', async () => {
    const result = await tool.getClassDocumentChunks(
      { classId: 'class-OTHER' },
      mcpContext,
      appTokenRequest(),
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('scoped to class');
    expect(appChunksService.getClassDocumentChunks).not.toHaveBeenCalled();
  });

  it('serves a user JWT with a class role, without auditing', async () => {
    kiwiAppService.getUserClassRole.mockResolvedValue({ role: 'student' });
    appChunksService.getClassDocumentChunks.mockResolvedValue(emptyResult);

    const result = await tool.getClassDocumentChunks(
      { classId: 'class-1' },
      mcpContext,
      { user: { sub: 'user-2' } } as any,
    );

    expect(result.isError).toBeUndefined();
    expect(kiwiAppService.getUserClassRole).toHaveBeenCalledWith(
      'user-2',
      'class-1',
    );
    expect(kiwiAppService.logAuditEvent).not.toHaveBeenCalled();
  });

  it('reports a non-Error throw instead of throwing itself', async () => {
    appChunksService.getClassDocumentChunks.mockRejectedValue('boom');

    const result = await tool.getClassDocumentChunks(
      { classId: 'class-1' },
      mcpContext,
      appTokenRequest(),
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Error: boom');
  });

  it('rejects a user JWT with no role in the class', async () => {
    kiwiAppService.getUserClassRole.mockResolvedValue({ role: null });

    const result = await tool.getClassDocumentChunks(
      { classId: 'class-1' },
      mcpContext,
      { user: { sub: 'user-3' } } as any,
    );

    expect(result.isError).toBe(true);
    expect(appChunksService.getClassDocumentChunks).not.toHaveBeenCalled();
  });
});
