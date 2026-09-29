import { Module } from '@nestjs/common';
import { InstructorClassController } from './instructor-class.controller';
import { InstructorClassService } from './instructor-class.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { MaterialManageGuard } from './material-manage.guard';
import { MaterialAccessModule } from 'src/class/material/material-access.module';

@Module({
  imports: [DatabaseModule, MaterialAccessModule],
  controllers: [InstructorClassController],
  providers: [InstructorClassService, MaterialManageGuard],
  exports: [InstructorClassService, MaterialManageGuard],
})
export class InstructorClassModule {}