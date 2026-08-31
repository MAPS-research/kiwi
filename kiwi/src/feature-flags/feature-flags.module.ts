import { Module } from '@nestjs/common';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';
import { DatabaseModule } from 'src/common/database/database.module';
import {
  FeatureFlagGuardQwenModel,
  FeatureFlagGuardTokenLimit,
} from './feature-flags.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [FeatureFlagsController],
  providers: [
    FeatureFlagsService,
    FeatureFlagGuardQwenModel,
    FeatureFlagGuardTokenLimit,
  ],
  exports: [FeatureFlagsService, FeatureFlagGuardTokenLimit],
})
export class FeatureFlagsModule {}
