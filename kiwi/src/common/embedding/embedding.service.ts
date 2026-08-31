import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  constructor(private llmService: LlmService) {}

  async createEmbedding(input: string | Array<string>) {
    this.logger.debug('Creating embedding for', input);

    const embeddingResponse = await this.llmService.createEmbedding(input);

    this.logger.debug(embeddingResponse);

    return embeddingResponse;
  }
}
