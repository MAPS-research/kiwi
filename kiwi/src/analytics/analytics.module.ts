import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ClassAnalyticsService } from './class-analytics.service';
import { ClassAnalyticsController } from './class-analytics.controller';
import { InteractionModule } from 'src/interaction/interaction.module';
import { AnalyticsAccessGuard, AnalyticsAdminGuard } from 'src/auth/auth.guard';
import { DatabaseModule } from 'src/common/database/database.module';
import { InstructorClassModule } from 'src/instructor-class/instructor-class.module';
import { LlmModule } from 'src/common/llm/llm.module';
@Module({
  // ConfigModule: the cost aggregates read model names and LLM_MODEL_PRICING.
  imports: [
    ConfigModule,
    InteractionModule,
    DatabaseModule,
    InstructorClassModule,
    LlmModule,
  ],
  providers: [
    AnalyticsService,
    ClassAnalyticsService,
    AnalyticsAdminGuard,
    AnalyticsAccessGuard,
  ],
  controllers: [AnalyticsController, ClassAnalyticsController],
  exports: [AnalyticsService, ClassAnalyticsService],
})
export class AnalyticsModule {}
