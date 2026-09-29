import { Module } from '@nestjs/common';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { MaterialModule } from './material/material.module';
import { MaterialAccessModule } from './material/material-access.module';
import { DocumentModule } from 'src/document/document.module';
import { StorageModule } from 'src/common/storage/storage.module';
import { InstructorClassModule } from 'src/instructor-class/instructor-class.module';
import { ClassMetadataUpdateGuard } from './class-metadata-update.guard';

@Module({
  imports: [
    DatabaseModule,
    MaterialModule,
    MaterialAccessModule,
    DocumentModule,
    StorageModule,
    InstructorClassModule,
  ],
  controllers: [ClassController],
  providers: [ClassService, ClassMetadataUpdateGuard],
  exports: [ClassService],
})
export class ClassModule {}
