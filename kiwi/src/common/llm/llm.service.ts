import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources/chat/completions';
import { Stream } from 'openai/streaming';
import { EngineChoice, EngineConfig } from './interfaces/engine-config';
import {
  MODEL_CONTEXT_WINDOW_ENV_KEY,
  loadContextWindowTable,
  lookupContextWindow,
} from './context-window';
import { worstCasePromptChars } from '../context/context-budget';
import { estimateTokens } from '../context/context.types';

/**
 * Options for `createChat` / `createChatStream`. Both also accept the legacy
 * positional argument list; the object form is the only way to pass `cacheKey`.
 */
export interface CreateChatOptions {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
  responseFormat?:
    | OpenAI.ResponseFormatText
    | OpenAI.ResponseFormatJSONObject
    | OpenAI.ResponseFormatJSONSchema;
  engineChoice?: EngineChoice;

  /**
   * Value for `prompt_cache_key`, built by `buildPromptCacheKey`. Ignored on
   * engines whose config sets `supportsPromptCacheKey: false`.
   */
  cacheKey?: string;
}

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);

  constructor(private configService: ConfigService) {}

  private engines: Map<string, { instance: OpenAI; config: EngineConfig }> =
    new Map();

  private engineConfigs: { [key: string]: EngineConfig } = {
    openai: {
      chatModel: this.configService.get<string>('LLM_CHAT_MODEL')!,
      embeddingModel: this.configService.get<string>('LLM_EMBEDDING_MODEL')!,
      chatCompatibleMode: false,
      apiKey: this.configService.get<string>('LLM_API_KEY')!,
      baseURL: this.configService.get<string>('LLM_BASE_URL')!,
      // OpenAI chat model is a gpt-5.x reasoning model (gpt-5.4-mini).
      isReasoningModel: true,
      supportsPromptCacheKey: true,
    },
    qwen: {
      chatModel: this.configService.get<string>('QWEN_CHAT_MODEL')!,
      chatVisionModel: this.configService.get<string>('QWEN_VISION_MODEL')!,
      embeddingModel: this.configService.get<string>('QWEN_EMBEDDING_MODEL')!,
      chatCompatibleMode: true,
      apiKey: this.configService.get<string>('QWEN_API_KEY')!,
      baseURL: this.configService.get<string>('QWEN_BASE_URL')!,
      // Qwen keeps the legacy temperature / max_tokens params.
      isReasoningModel: false,
      // DashScope caches prefixes implicitly and rejects `prompt_cache_key`.
      supportsPromptCacheKey: false,
    },
  };

  private initializeEngines() {
    for (const [engineName, config] of Object.entries(this.engineConfigs)) {
      if (!config.apiKey) {
        this.logger.warn(
          `Engine ${engineName} is disabled: API key is not configured.`,
        );
        continue;
      }
      const instance = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      this.engines.set(engineName, { instance, config });
    }
  }

  private getEngine(engineChoice: string) {
    const engineData = this.engines.get(engineChoice);
    if (!engineData) {
      throw new Error(
        `Engine ${engineChoice} is not supported or its API key is not configured.`,
      );
    }
    return engineData;
  }

  onModuleInit() {
    this.initializeEngines();
    this.checkPromptCeiling();
  }

  /**
   * Compare the worst prompt the budgets permit against each engine's window.
   *
   * `worstCasePromptChars` existed to make the ceiling explicit "so it can be
   * checked against the model window" — and had no callers, because there was
   * no window to check it against. This is that caller.
   *
   * At boot rather than per turn, and a warning rather than a throw. Every
   * budget is env-overridable, so `CONTEXT_MAX_HISTORY_TURNS=400` in a
   * deployment's env silently rewrites the ceiling; the operator who did it
   * should hear about it at deploy time. Refusing to start over a heuristic
   * estimate — the token count here is `chars/3.6`, measured ~5% low — would be
   * trading a possible truncation for a certain outage.
   */
  private checkPromptCeiling(): void {
    const table = loadContextWindowTable((key) =>
      this.configService.get<string>(key),
    );
    // The head is small next to the budgets and is not itself env-tunable;
    // 9 KB is its measured size, and being wrong here moves the estimate by
    // under 3%.
    const APPROX_STABLE_HEAD_CHARS = 9_000;
    const worstChars = worstCasePromptChars(APPROX_STABLE_HEAD_CHARS);
    const worstTokens = estimateTokens('x'.repeat(worstChars));

    for (const [engineChoice, config] of Object.entries(this.engineConfigs)) {
      for (const model of new Set(
        [
          config.chatModel,
          (config as { chatVisionModel?: string }).chatVisionModel,
        ].filter(Boolean) as string[],
      )) {
        const window = lookupContextWindow(model, table);
        if (window === null) {
          this.logger.warn(
            `[CTX-CEILING] no context window known for "${model}" ` +
              `(${engineChoice}); add it to ${MODEL_CONTEXT_WINDOW_ENV_KEY} so ` +
              `overflow can be anticipated rather than discovered`,
          );
          continue;
        }
        if (worstTokens >= window) {
          this.logger.warn(
            `[CTX-CEILING] the configured budgets permit a prompt of about ` +
              `${worstTokens} tokens, which does not fit "${model}"'s ` +
              `${window}-token window (${engineChoice}). Lower CONTEXT_MAX_* ` +
              `or expect truncation.`,
          );
        }
      }
    }
  }

  async createEmbedding(
    input: string | Array<string>,
    engineChoice: EngineChoice = 'openai',
  ): Promise<OpenAI.Embeddings.CreateEmbeddingResponse> {
    const { instance: engine, config } = this.getEngine(engineChoice);

    const embedding = await engine.embeddings.create({
      model: config.embeddingModel,
      input: input,
      encoding_format: 'float',
    });

    return embedding;
  }

  /**
   * Probe an engine's embedding model for its output dimensionality by embedding
   * a single token. Used to auto-detect and cache `EmbeddingModel.dimensions`
   * when it isn't known ahead of time. Returns the vector length.
   */
  async resolveDimensions(
    engineChoice: EngineChoice = 'openai',
  ): Promise<number> {
    const probe = await this.createEmbedding('dim probe', engineChoice);
    return probe.data[0].embedding.length;
  }

  async describeImage(
    url: string,
    engineChoice: EngineChoice = 'openai',
  ): Promise<string> {
    const { instance: engine, config } = this.getEngine(engineChoice);

    const describerPrompt =
      'You are a helpful AI that summarizes images for later retrieval. Summarize this image given to you.';

    const describerSystemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: describerPrompt,
    };
    const imageMessage: ChatCompletionUserMessageParam = {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: url,
          },
        },
      ],
    };
    const describerAnswer = await engine.chat.completions.create(
      this.buildChatParams(config, {
        messages: [describerSystemMessage, imageMessage],
        model: config.chatCompatibleMode
          ? config.chatVisionModel
          : config.chatModel,
        temperature: 0,
      }),
    );

    const description = describerAnswer.choices[0].message.content;

    if (!description) {
      return 'There should be an image here, but you cannot see it.';
    }

    return description;
  }

  async convertMessagesToCompatibleMode(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    engineChoice: EngineChoice = 'openai',
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
    const { config } = this.getEngine(engineChoice);

    if (!config.chatCompatibleMode) {
      return messages;
    }

    const compatibleMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      [];
    for (const { content, ...rest } of messages) {
      const compatibleContent: string[] = [];

      if (content) {
        // If the content is a string, add it directly
        if (typeof content === 'string') {
          compatibleContent.push(content);
        }
        // If the content is an array, process each part
        else if (Array.isArray(content)) {
          for (const contentPart of content) {
            if (typeof contentPart === 'object' && 'type' in contentPart) {
              // Check if type is 'text'
              if (contentPart.type === 'text') {
                compatibleContent.push(contentPart.text);
              }
              // Check if type is 'image_url' and it has a valid URL
              else if (
                contentPart.type === 'image_url' &&
                contentPart.image_url?.url
              ) {
                const imageContent = await this.describeImage(
                  contentPart.image_url.url,
                  engineChoice,
                );
                compatibleContent.push(imageContent);
              }
            }
          }
        }
      }

      const compatibleMessageContent = compatibleContent.join('\n');

      const compatibleMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam =
        {
          ...rest,
          content: compatibleMessageContent,
        };
      compatibleMessages.push(compatibleMessage);
    }

    return compatibleMessages;
  }

  /**
   * Build the chat.completions params for an engine, translating temperature /
   * max_tokens for reasoning models (gpt-5.x): such models reject a custom
   * `temperature` (only the default is accepted) and require
   * `max_completion_tokens` instead of `max_tokens`. Non-reasoning engines
   * (Qwen) keep the legacy params unchanged.
   */
  private buildChatParams(
    config: EngineConfig,
    params: {
      messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
      model: string;
      tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
      temperature?: number;
      max_tokens?: number;
      response_format?:
        | OpenAI.ResponseFormatText
        | OpenAI.ResponseFormatJSONObject
        | OpenAI.ResponseFormatJSONSchema;
      prompt_cache_key?: string;
    },
  ): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
    const {
      messages,
      model,
      tools,
      temperature,
      max_tokens,
      response_format,
      prompt_cache_key,
    } = params;

    // `prompt_cache_key` is a live API param but is not in the installed
    // openai@4.69.0 types (only the legacy `user`), hence the untyped spread.
    // Engines that don't support it reject the unknown param outright.
    const cacheKeyParam =
      prompt_cache_key && config.supportsPromptCacheKey
        ? ({ prompt_cache_key } as Record<string, unknown>)
        : {};

    const base = {
      messages,
      model,
      tools,
      response_format,
      ...cacheKeyParam,
    };

    if (config.isReasoningModel) {
      // Omit temperature entirely; map max_tokens -> max_completion_tokens.
      return {
        ...base,
        ...(max_tokens !== undefined
          ? { max_completion_tokens: max_tokens }
          : {}),
      };
    }

    return {
      ...base,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(max_tokens !== undefined ? { max_tokens } : {}),
    };
  }

  /**
   * Normalize the options-object and the legacy positional call shapes into
   * one options object. The positional form is kept because it has many call
   * sites; new callers should pass the object so `cacheKey` is reachable.
   */
  private toChatOptions(
    messagesOrOptions:
      OpenAI.Chat.Completions.ChatCompletionMessageParam[] | CreateChatOptions,
    temperature?: number,
    max_tokens?: number,
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[],
    response_format?:
      | OpenAI.ResponseFormatText
      | OpenAI.ResponseFormatJSONObject
      | OpenAI.ResponseFormatJSONSchema,
    engineChoice?: EngineChoice,
  ): Required<Pick<CreateChatOptions, 'messages' | 'engineChoice'>> &
    CreateChatOptions {
    if (Array.isArray(messagesOrOptions)) {
      return {
        messages: messagesOrOptions,
        temperature,
        maxTokens: max_tokens,
        tools,
        responseFormat: response_format,
        engineChoice: engineChoice ?? 'openai',
      };
    }

    return {
      ...messagesOrOptions,
      engineChoice: messagesOrOptions.engineChoice ?? 'openai',
    };
  }

  async createChat(
    options: CreateChatOptions,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion>;
  async createChat(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature?: number,
    max_tokens?: number,
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[],
    response_format?:
      | OpenAI.ResponseFormatText
      | OpenAI.ResponseFormatJSONObject
      | OpenAI.ResponseFormatJSONSchema,
    engineChoice?: EngineChoice,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion>;
  async createChat(
    messagesOrOptions:
      OpenAI.Chat.Completions.ChatCompletionMessageParam[] | CreateChatOptions,
    temperature?: number,
    max_tokens?: number,
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[],
    response_format?:
      | OpenAI.ResponseFormatText
      | OpenAI.ResponseFormatJSONObject
      | OpenAI.ResponseFormatJSONSchema,
    engineChoice?: EngineChoice,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    const options = this.toChatOptions(
      messagesOrOptions,
      temperature,
      max_tokens,
      tools,
      response_format,
      engineChoice,
    );

    const { instance: engine, config } = this.getEngine(options.engineChoice);

    const messages = await this.convertMessagesToCompatibleMode(
      options.messages,
      options.engineChoice,
    );

    const chat = await engine.chat.completions.create(
      this.buildChatParams(config, {
        messages,
        model: config.chatModel,
        tools: options.tools,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format: options.responseFormat,
        prompt_cache_key: options.cacheKey,
      }),
    );

    return chat;
  }

  async createChatStream(
    options: CreateChatOptions,
  ): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>>;
  async createChatStream(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature?: number,
    max_tokens?: number,
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[],
    response_format?:
      | OpenAI.ResponseFormatText
      | OpenAI.ResponseFormatJSONObject
      | OpenAI.ResponseFormatJSONSchema,
    engineChoice?: EngineChoice,
  ): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>>;
  async createChatStream(
    messagesOrOptions:
      OpenAI.Chat.Completions.ChatCompletionMessageParam[] | CreateChatOptions,
    temperature?: number,
    max_tokens?: number,
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[],
    response_format?:
      | OpenAI.ResponseFormatText
      | OpenAI.ResponseFormatJSONObject
      | OpenAI.ResponseFormatJSONSchema,
    engineChoice?: EngineChoice,
  ): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const options = this.toChatOptions(
      messagesOrOptions,
      temperature,
      max_tokens,
      tools,
      response_format,
      engineChoice,
    );

    const { instance: engine, config } = this.getEngine(options.engineChoice);

    const messages = await this.convertMessagesToCompatibleMode(
      options.messages,
      options.engineChoice,
    );

    const chat = await engine.chat.completions.create({
      ...this.buildChatParams(config, {
        messages,
        model: config.chatModel,
        tools: options.tools,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format: options.responseFormat,
        prompt_cache_key: options.cacheKey,
      }),
      stream: true,
      stream_options: {
        include_usage: true,
      },
    });

    return chat;
  }
}
