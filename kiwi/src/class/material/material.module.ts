import { Module } from '@nestjs/common';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { DocumentModule } from 'src/document/document.module';
import { StorageModule } from 'src/common/storage/storage.module';
import { InstructorClassModule } from 'src/instructor-class/instructor-class.module';
import { MaterialAccessModule } from './material-access.module';

@Module({
  imports: [
    DatabaseModule,
    DocumentModule,
    StorageModule,
    InstructorClassModule,
    MaterialAccessModule,
  ],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MaterialService, MaterialAccessModule],
})
export class MaterialModule {}
