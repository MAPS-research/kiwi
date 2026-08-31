import { Module } from '@nestjs/common';
import { CompetitionController } from './competition.controller';
import { CompetitionService } from './competition.service';
// import { UserService } from '../common/database/user.service';
import { AdminGuard } from 'src/auth/auth.guard';
import { DatabaseModule } from '../common/database/database.module';
import { StorageModule } from '../common/storage/storage.module';
import { ConfigModule } from '@nestjs/config';
// import { DocumentModule } from '../document/document.module';

@Module({
  imports: [DatabaseModule, StorageModule, ConfigModule],
  controllers: [CompetitionController],
  providers: [CompetitionService, AdminGuard],
  exports: [CompetitionService],
})
export class CompetitionModule {}
