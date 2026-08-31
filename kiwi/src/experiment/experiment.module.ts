import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/common/database/database.module';
import { InstructorClassModule } from 'src/instructor-class/instructor-class.module';
import { ClassModule } from 'src/class/class.module';
import { LlmModule } from 'src/common/llm/llm.module';
import { ConfigModule } from '@nestjs/config';
import { ExperimentController } from './experiment.controller';
import { ExperimentService } from './experiment.service';

@Module({
  imports: [
    DatabaseModule,
    InstructorClassModule,
    ClassModule,
    LlmModule,
    ConfigModule,
  ],
  controllers: [ExperimentController],
  providers: [ExperimentService],
  exports: [ExperimentService],
})
export class ExperimentModule {}
