import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { UnstructuredModule } from 'src/common/unstructured/unstructured.module';
import { LlmModule } from 'src/common/llm/llm.module';
import { BullModule } from '@nestjs/bullmq';
import { DocumentConsumer } from './document.consumer';
import { StorageModule } from 'src/common/storage/storage.module';
import { InstructorClassModule } from 'src/instructor-class/instructor-class.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UnstructuredModule,
    LlmModule,
    BullModule.registerQueue({ name: 'document' }),
    StorageModule,
    InstructorClassModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentConsumer],
  exports: [DocumentService],
})
export class DocumentModule {}
