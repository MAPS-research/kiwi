import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/common/database/database.module';
import { WidgetService } from './widget.service';
import { WidgetController } from './widget.controller';

/**
 * Widget Module
 *
 * Provides backend persistence for the Kiwi Apps framework:
 * - Widget State: Per-instance state synced from frontend for cross-device persistence
 * - User Preferences: Global per-user settings for widgets/apps
 *
 * Note: Widgets are React components defined in the frontend (kiwi-ui).
 * The frontend uses window.kiwiApp bridge API (similar to OpenAI's window.openai).
 */
@Module({
  imports: [DatabaseModule],
  providers: [WidgetService],
  controllers: [WidgetController],
  exports: [WidgetService],
})
export class WidgetModule {}
