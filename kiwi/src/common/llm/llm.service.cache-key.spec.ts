import { ConfigService } from '@nestjs/config';
import { LlmService } from './llm.service';

/**
 * `prompt_cache_key` steers requests that share a prompt prefix to the same
 * OpenAI cache shard. Qwen/DashScope caches prefixes implicitly and rejects the
 * param, so sending it there would fail the request outright.
 */
describe('LlmService prompt_cache_key', () => {
  let service: LlmService;
  let create: jest.Mock;

  const stubEngine = (engineChoice: 'openai' | 'qwen') => {
    const engines = (service as any).engines as Map<string, any>;
    const existing = engines.get(engineChoice);
    engines.set(engineChoice, {
      config: existing.config,
      instance: { chat: { completions: { create } } },
    });
  };

  beforeEach(() => {
    const config = { get: (key: string) => `stub-${key}` } as ConfigService;
    service = new LlmService(config);
    service.onModuleInit();

    create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'ok' } }],
    });
    stubEngine('openai');
    stubEngine('qwen');
  });

  it('sends prompt_cache_key on openai when a cacheKey is given', async () => {
    await service.createChat({
      messages: [{ role: 'user', content: 'hi' }],
      cacheKey: 'kiwi:v1:class-1:pdf:guidance:deadbeef',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt_cache_key: 'kiwi:v1:class-1:pdf:guidance:deadbeef',
      }),
    );
  });

  it('omits prompt_cache_key on qwen, which does not accept it', async () => {
    await service.createChat({
      messages: [{ role: 'user', content: 'hi' }],
      engineChoice: 'qwen',
      cacheKey: 'kiwi:v1:class-1:pdf:guidance:deadbeef',
    });

    expect(create).toHaveBeenCalledWith(
      expect.not.objectContaining({ prompt_cache_key: expect.anything() }),
    );
  });

  it('omits prompt_cache_key when no cacheKey is given', async () => {
    await service.createChat({ messages: [{ role: 'user', content: 'hi' }] });

    expect(create).toHaveBeenCalledWith(
      expect.not.objectContaining({ prompt_cache_key: expect.anything() }),
    );
  });

  it('still accepts the legacy positional argument list', async () => {
    await service.createChat(
      [{ role: 'user', content: 'hi' }],
      0.5,
      321,
      undefined,
      undefined,
      'qwen',
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'stub-QWEN_CHAT_MODEL',
        temperature: 0.5,
        max_tokens: 321,
      }),
    );
  });

  it('maps options-object params for a reasoning engine', async () => {
    await service.createChat({
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.5,
      maxTokens: 321,
    });

    const params = create.mock.calls[0][0];
    // gpt-5.x rejects a custom temperature and wants max_completion_tokens.
    expect(params.temperature).toBeUndefined();
    expect(params.max_completion_tokens).toBe(321);
  });

  it('passes the cacheKey through the streaming path', async () => {
    create.mockResolvedValue({});

    await service.createChatStream({
      messages: [{ role: 'user', content: 'hi' }],
      cacheKey: 'kiwi:v1:noclass:codegen:default:0badc0de',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        stream: true,
        prompt_cache_key: 'kiwi:v1:noclass:codegen:default:0badc0de',
      }),
    );
  });
});
