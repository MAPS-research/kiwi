import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/common/database/database.module';
import { EmbeddingController } from './embedding.controller';
import { EmbeddingService } from './embedding.service';
import { LlmModule } from '../llm/llm.module';
import { AdminGuard } from 'src/auth/auth.guard';

@Module({
  imports: [DatabaseModule, LlmModule],
  providers: [EmbeddingService, AdminGuard],
  controllers: [EmbeddingController],
})
export class EmbeddingModule {}
