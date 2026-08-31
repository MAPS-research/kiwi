import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ConversationHistoryService } from './conversation-history.service';
import { ConversationService } from './conversation.service';

/**
 * Context assembly services.
 *
 * The pure helpers here (`context-trace`, `context-budget`, `template`) are
 * plain functions and need no provider — only the history reader touches the
 * database.
 */
@Module({
  imports: [DatabaseModule],
  providers: [ConversationHistoryService, ConversationService],
  exports: [ConversationHistoryService, ConversationService],
})
export class ContextModule {}
