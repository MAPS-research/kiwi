import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/common/database/database.module';
import { MaterialModule } from 'src/class/material/material.module';
import { ClassModule } from 'src/class/class.module';
import { KiwiAppService } from './kiwi-app.service';
import { AppChunksService } from './app-chunks.service';
import { AppContextService } from './app-context.service';
import { AppContextualChatService } from './app-contextual-chat.service';
import { LlmModule } from 'src/common/llm/llm.module';
import { InstructorClassModule } from 'src/instructor-class/instructor-class.module';
import {
  KiwiAppController,
  ClassKiwiAppController,
  PermissionsController,
} from './kiwi-app.controller';
import { AppDataController } from './app-data.controller';

@Module({
  imports: [
    DatabaseModule,
    MaterialModule,
    ClassModule,
    LlmModule,
    InstructorClassModule,
  ],
  controllers: [
    KiwiAppController,
    ClassKiwiAppController,
    PermissionsController,
    AppDataController,
  ],
  providers: [
    KiwiAppService,
    AppChunksService,
    AppContextService,
    AppContextualChatService,
  ],
  exports: [
    KiwiAppService,
    AppChunksService,
    AppContextService,
    AppContextualChatService,
  ],
})
export class KiwiAppModule {}
