import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { ChatStreamEvent } from './interfaces/chat-stream-event';
import { Stream } from 'openai/streaming';
import { Observable } from 'rxjs';
import OpenAI from 'openai';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  constructor(private llmService: LlmService) {}

  createMessage(
    input: string,
    image: string | undefined,
  ): OpenAI.Chat.Completions.ChatCompletionUserMessageParam {
    if (image) {
      return {
        role: 'user',
        content: [
          { type: 'text', text: input },
          {
            type: 'image_url',
            image_url: {
              url: image,
            },
          },
        ],
      };
    } else {
      return {
        role: 'user',
        content: input,
      };
    }
  }

  async createChat(input: string, image: string | undefined) {
    this.logger.debug('Creating chat for', input);

    const message = this.createMessage(input, image);

    const chatResponse = await this.llmService.createChat([message]);

    this.logger.debug(chatResponse);

    return chatResponse;
  }

  streamToObservable(
    stream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>,
  ): Observable<ChatStreamEvent> {
    return new Observable<ChatStreamEvent>((subscriber) => {
      const asyncIterator = stream[Symbol.asyncIterator]();

      const processNext = async () => {
        try {
          const { value, done } = await asyncIterator.next();
          if (done) {
            subscriber.complete();
          } else {
            const chunk = {
              id: value.id,
              data: value,
            };
            subscriber.next(chunk);
            processNext();
          }
        } catch (error) {
          subscriber.error(error);
        }
      };

      processNext();

      return () => {
        stream.controller.abort();
      };
    });
  }

  async createChatStream(input: string, image: string | undefined) {
    this.logger.debug('Creating chat stream for', input);

    const message = this.createMessage(input, image);

    const chatStream = await this.llmService.createChatStream([message]);

    this.logger.debug(chatStream);

    const chatObservable = this.streamToObservable(chatStream);

    return chatObservable;
  }
}
