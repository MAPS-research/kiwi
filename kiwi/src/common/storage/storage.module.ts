import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { ConfigModule } from '@nestjs/config';
import { AdminGuard } from 'src/auth/auth.guard';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [ConfigModule, DatabaseModule, RedisModule],
  controllers: [StorageController],
  providers: [StorageService, AdminGuard],
  exports: [StorageService],
})
export class StorageModule {}
