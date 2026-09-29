import { Module } from '@nestjs/common';
import { ApiTokensController } from './api-tokens.controller';
import { ApiTokensService } from './api-tokens.service';
import { DatabaseModule } from '../common/database/database.module';
import { ApiTokenService as DatabaseApiTokenService } from '../common/database/api-token.service';
import { WebhookEndpointService } from '../common/database/webhook-endpoint.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ApiTokensController],
  providers: [
    ApiTokensService,
    DatabaseApiTokenService,
    WebhookEndpointService,
  ],
  exports: [ApiTokensService],
})
export class ApiTokensModule {}
