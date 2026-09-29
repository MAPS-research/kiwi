import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhookEventService } from './webhook-event.service';
import { DatabaseModule } from '../common/database/database.module';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { BullModule } from '@nestjs/bullmq';
import { InstructorClassModule } from '../instructor-class/instructor-class.module';
import { WebhookEndpointService } from '../common/database/webhook-endpoint.service';
import { WebhookDeliveryService as DatabaseWebhookDeliveryService } from '../common/database/webhook-delivery.service';
import { UserService } from '../common/database/user.service';
import { UserWhitelistService } from '../common/database/user-whistelist.service';
import { EnrollmentService } from '../common/database/enrollment.service';
import { ClassService } from '../common/database/class.service';
import { WebhookEventService as DatabaseWebhookEventService } from '../common/database/webhook-event.service';
import { WebhookEventAuditService } from '../common/database/webhook-event-audit.service';

@Module({
  imports: [
    DatabaseModule,
    ApiTokensModule,
    InstructorClassModule,
    BullModule.registerQueue({
      name: 'webhook-delivery',
    }),
  ],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhookDeliveryService,
    WebhookEventService,
    WebhookEndpointService,
    DatabaseWebhookDeliveryService,
    UserService,
    UserWhitelistService,
    EnrollmentService,
    ClassService,
    DatabaseWebhookEventService,
    WebhookEventAuditService,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {}
