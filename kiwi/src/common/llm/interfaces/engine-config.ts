export interface EngineConfigBase {
  chatModel: string;
  embeddingModel: string;
  chatCompatibleMode: boolean;
  apiKey: string;
  baseURL: string;
  // gpt-5.x reasoning models reject a custom `temperature` and require
  // `max_completion_tokens` instead of `max_tokens`. When true, LlmService
  // translates chat params accordingly.
  isReasoningModel: boolean;
  // OpenAI accepts `prompt_cache_key` to steer requests that share a prefix at
  // the same cache shard. Qwen/DashScope does implicit prefix caching only and
  // rejects the param, so it must not be sent there.
  supportsPromptCacheKey: boolean;
}

export interface ChatCompatibleConfig extends EngineConfigBase {
  chatCompatibleMode: true;
  chatVisionModel: string;
}

export interface NonChatCompatibleConfig extends EngineConfigBase {
  chatCompatibleMode: false;
}

export type EngineConfig = ChatCompatibleConfig | NonChatCompatibleConfig;

export type EngineChoice = 'openai' | 'qwen';
