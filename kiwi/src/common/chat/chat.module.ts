import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AdminGuard } from 'src/auth/auth.guard';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [LlmModule, DatabaseModule],
  providers: [ChatService, AdminGuard],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
