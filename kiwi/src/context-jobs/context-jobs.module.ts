import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MaterialPersonalizationModule } from 'src/student/material-personalization/material-personalization.module';
import { ContextModule } from 'src/common/context/context.module';
import { LlmModule } from 'src/common/llm/llm.module';
import { ContextJobsConsumer } from './context-jobs.consumer';
import { ContextJobsService } from './context-jobs.service';
import { CONTEXT_QUEUE } from './context-jobs.types';

/**
 * Owns the `context` queue: background work that keeps a student's chat context
 * fresh (profile extraction now, conversation compaction next) without ever
 * running on a request.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: CONTEXT_QUEUE }),
    MaterialPersonalizationModule,
    ContextModule,
    LlmModule,
  ],
  providers: [ContextJobsService, ContextJobsConsumer],
  exports: [ContextJobsService],
})
export class ContextJobsModule {}
