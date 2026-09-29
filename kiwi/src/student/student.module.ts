import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { LlmModule } from 'src/common/llm/llm.module';
import { ClassModule } from 'src/class/class.module';
import { MaterialAccessModule } from 'src/class/material/material-access.module';
import { ChatModule } from 'src/common/chat/chat.module';
import { InteractionModule } from 'src/interaction/interaction.module';
import { DocumentModule } from 'src/document/document.module';
import { MaterialPersonalizationModule } from './material-personalization/material-personalization.module';
import { ConfigModule } from '@nestjs/config';
import { FeatureFlagsModule } from 'src/feature-flags/feature-flags.module';
import { StorageModule } from 'src/common/storage/storage.module';
import { InstructorClassModule } from 'src/instructor-class/instructor-class.module';
import { ExperimentModule } from 'src/experiment/experiment.module';
import { McpClientModule } from 'src/mcp/mcp-client.module';
import { AgentLoopModule } from 'src/common/agent/agent-loop.module';
import { ContextModule } from 'src/common/context/context.module';
import { ContextJobsModule } from 'src/context-jobs/context-jobs.module';
import { KiwiAppModule } from 'src/kiwi-app/kiwi-app.module';

@Module({
  imports: [
    DatabaseModule,
    LlmModule,
    ClassModule,
    MaterialAccessModule,
    ChatModule,
    InteractionModule,
    DocumentModule,
    MaterialPersonalizationModule,
    ConfigModule,
    FeatureFlagsModule,
    StorageModule,
    InstructorClassModule,
    ExperimentModule,
    McpClientModule,
    AgentLoopModule,
    ContextModule,
    ContextJobsModule,
    // For the app registration lookup that decides whether a request's app
    // block may influence the tutoring mode (see resolveTrustedAppContext).
    KiwiAppModule,
  ],
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}
