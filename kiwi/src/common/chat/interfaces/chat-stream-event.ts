import OpenAI from 'openai';

export interface ChatStreamEvent {
  id: string;
  data: OpenAI.Chat.Completions.ChatCompletionChunk;
}
