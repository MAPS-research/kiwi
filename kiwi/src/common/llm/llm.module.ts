import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ConfigModule } from '@nestjs/config';
import { TokenLimitGuard } from './llm.token-usage.guard';
import { DatabaseModule } from '../database/database.module';
import { FeatureFlagsModule } from 'src/feature-flags/feature-flags.module';

@Module({
  imports: [ConfigModule, DatabaseModule, FeatureFlagsModule],
  providers: [LlmService, TokenLimitGuard],
  exports: [LlmService, TokenLimitGuard],
})
export class LlmModule {}
