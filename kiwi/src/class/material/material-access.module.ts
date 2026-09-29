import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/common/database/database.module';
import { MaterialAccessService } from './material-access.service';
import { MaterialPermissionService } from './material-permission.service';

/**
 * Deliberately thin: only Prisma. Every module that reads documents imports
 * this one, so it must not pull in DocumentModule or MaterialModule.
 */
@Module({
  imports: [DatabaseModule],
  providers: [MaterialAccessService, MaterialPermissionService],
  exports: [MaterialAccessService, MaterialPermissionService],
})
export class MaterialAccessModule {}
