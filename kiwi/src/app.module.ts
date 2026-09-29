// import { Module } from '@nestjs/common';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import cors from 'cors';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './common/chat/chat.module';
import { EmbeddingModule } from './common/embedding/embedding.module';
import { LlmModule } from './common/llm/llm.module';
import { ParserModule } from './common/parser/parser.module';
import { ConsentModule } from './consent/consent.module';
import { DocumentModule } from './document/document.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { ClassModule } from './class/class.module';
import { StudentModule } from './student/student.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { InteractionModule } from './interaction/interaction.module';
import { BullModule } from '@nestjs/bullmq';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { StorageModule } from './common/storage/storage.module';
import { CompetitionModule } from './competition/competition.module';
import { EmailModule } from './email/email.module';
import { EmailAuditModule } from './email-audit/email-audit.module';
import { McpModule } from './mcp/mcp.module';
import { McpClientModule } from './mcp/mcp-client.module';
import { InstructorClassModule } from './instructor-class/instructor-class.module';
import { ApiTokensModule } from './api-tokens/api-tokens.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ExperimentModule } from './experiment/experiment.module';
import { WidgetModule } from './widget/widget.module';
import { KiwiAppModule } from './kiwi-app/kiwi-app.module';
import { ContextJobsModule } from './context-jobs/context-jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || ''),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    HealthModule,
    EventsModule,
    AuthModule,
    ConsentModule,
    EmbeddingModule,
    LlmModule,
    ChatModule,
    ParserModule,
    DocumentModule,
    ClassModule,
    StudentModule,
    InteractionModule,
    AnalyticsModule,
    FeatureFlagsModule,
    StorageModule,
    CompetitionModule,
    EmailModule,
    EmailAuditModule,
    McpModule, // MCP Server (external clients connecting TO Kiwi)
    McpClientModule, // MCP Client (Kiwi connecting TO external MCP servers)
    InstructorClassModule,
    ApiTokensModule,
    WebhooksModule,
    ExperimentModule,
    WidgetModule,
    KiwiAppModule,
    ContextJobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        cors({
          origin: process.env.FRONTEND_URL?.split(','), // Replace with your frontend's URL
          methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
          credentials: true,
        }),
      )
      .forRoutes('{*splat}');
  }
}
