import { Module } from '@nestjs/common';
import { MaterialPersonalizationService } from './material-personalization.service';
import { DatabaseModule } from '../../common/database/database.module';
import { RedisModule } from 'src/common/redis/redis.module';
import { InteractionModule } from 'src/interaction/interaction.module';
import { DocumentModule } from 'src/document/document.module';
import { LlmModule } from 'src/common/llm/llm.module';

// import services
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    InteractionModule,
    DocumentModule,
    LlmModule,
  ],
  providers: [MaterialPersonalizationService],
  exports: [MaterialPersonalizationService],
})
export class MaterialPersonalizationModule {}
