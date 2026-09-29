import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';

@Processor('webhook-delivery')
@Injectable()
export class WebhookDeliveryService extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  constructor(private readonly databaseService: DatabaseService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { deliveryId, webhookId, event, payload } = job.data;

    try {
      // For now, just log the webhook event
      // In production, this would make an actual HTTP request to an external URL
      this.logger.log(`Processing webhook delivery ${deliveryId}`);
      this.logger.log(`Webhook ${webhookId} - Event: ${event}`);
      this.logger.log(`Payload: ${JSON.stringify(payload)}`);

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update delivery status to success
      await this.databaseService.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'success',
          response: {
            message: 'Webhook processed successfully (simulated)',
            timestamp: new Date().toISOString(),
          },
          attempts: 1,
        },
      });

      this.logger.log(`Webhook delivery ${deliveryId} completed successfully`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to deliver webhook ${deliveryId}:`, error);

      // Update delivery status to failed
      await this.databaseService.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'failed',
          response: {
            error: error.message,
            timestamp: new Date().toISOString(),
          },
          attempts: job.attemptsMade,
        },
      });

      throw error;
    }
  }
}
