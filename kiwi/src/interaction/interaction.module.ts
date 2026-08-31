import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/common/database/database.module';
import { InteractionService } from './interaction.service';
import { InteractionController } from './interaction.controller';

@Module({
  imports: [DatabaseModule],
  providers: [InteractionService],
  controllers: [InteractionController],
  exports: [InteractionService],
})
export class InteractionModule {}
