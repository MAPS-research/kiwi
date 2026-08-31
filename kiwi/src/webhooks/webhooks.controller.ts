import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Headers,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { WebhookEventService } from './webhook-event.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { AdminGuard, JwtAuthGuard, ProfGuard } from '../auth/auth.guard';
import { ApiTokenGuard } from './guards/api-token.guard';
import {
  WebhookResponseDto,
  WebhookWithTokenDto,
  WebhookEventResponseDto as DeliveryEventResponseDto,
  WebhookDeliveryDto,
  DeleteWebhookResponseDto,
  TriggerTestEventResponseDto,
} from './dto/webhook-response.dto';
import { TriggerTestEventDto } from './dto/trigger-test-event.dto';
import {
  WebhookEventResponseDto,
  ApproveWebhookEventResponseDto,
  PendingWebhookEventsResponseDto,
} from './dto/webhook-event-response.dto';
import {
  WebhookEventAuditHistoryDto,
  CreateAuditLogDto,
} from './dto/webhook-event-audit.dto';
import { Public } from 'src/auth/auth.decorator';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly webhookEventService: WebhookEventService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Create a new webhook endpoint' })
  @ApiResponse({
    status: 201,
    description: 'Webhook created successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Request() req: any, @Body() createWebhookDto: CreateWebhookDto) {
    return this.webhooksService.create(req.user.sub, createWebhookDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get all webhooks for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of webhooks',
    type: [WebhookWithTokenDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Request() req: any) {
    return this.webhooksService.findAll(req.user.sub);
  }

  // Get all audit logs (admin only)
  @Get('audit')
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get all webhook event audit logs',
    description:
      'Retrieve all audit logs for webhook events with optional filtering',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filter by action type (approved/rejected)',
    type: String,
    example: 'approved',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based)',
    type: String,
    example: '1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records per page (max: 100)',
    type: String,
    example: '20',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter results from this date (ISO 8601 format)',
    type: String,
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter results until this date (ISO 8601 format)',
    type: String,
    example: '2024-12-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved',
    type: WebhookEventAuditHistoryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin or professor only',
  })
  async getAllAuditHistory(
    @Query('action') action?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    const skip = (pageNum - 1) * limitNum;

    return this.webhookEventService.getAllAuditHistory({
      action,
      page: pageNum,
      limit: limitNum,
      skip,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // Get audit logs for current user
  @Get('audit/my')
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get my audit logs',
    description:
      'Retrieve audit logs for actions performed by the current user',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filter by action type (approved/rejected)',
    type: String,
    example: 'approved',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based)',
    type: String,
    example: '1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records per page (max: 100)',
    type: String,
    example: '20',
  })
  @ApiResponse({
    status: 200,
    description: 'User audit logs retrieved',
    type: WebhookEventAuditHistoryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyAuditHistory(
    @Request() req: any,
    @Query('action') action?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    const skip = (pageNum - 1) * limitNum;

    return this.webhookEventService.getUserAuditHistory(req.user.sub, {
      action,
      page: pageNum,
      limit: limitNum,
      skip,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get a specific webhook by ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook details',
    type: WebhookWithTokenDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.webhooksService.findOne(req.user.sub, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook updated successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateWebhookDto: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(req.user.sub, id, updateWebhookDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook deleted successfully',
    type: DeleteWebhookResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.webhooksService.remove(req.user.sub, id);
  }

  @Get(':id/deliveries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get webhook delivery history',
    description:
      'Retrieve the delivery history for a specific webhook, showing all attempted deliveries and their status',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'List of webhook deliveries',
    type: [WebhookDeliveryDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  getDeliveries(@Request() req: any, @Param('id') id: string) {
    return this.webhooksService.getDeliveries(req.user.sub, id);
  }

  // Webhook endpoint that receives events
  @Post('webhook/:webhookId')
  @Public()
  @UseGuards(ApiTokenGuard)
  @ApiOperation({
    summary: 'Receive webhook events',
    description:
      'This endpoint receives events sent to a specific webhook. Requires API token authentication.',
  })
  @ApiParam({
    name: 'webhookId',
    description: 'The UUID of the webhook endpoint',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for API authentication',
    required: true,
    example: 'Bearer tok_1234567890abcdef',
  })
  @ApiBody({ type: WebhookEventDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook event received and queued',
    type: DeliveryEventResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 404, description: 'Webhook not found or inactive' })
  async handleWebhook(
    @Param('webhookId') webhookId: string,
    @Body() webhookEvent: WebhookEventDto,
  ) {
    // The API token guard will validate the token and attach webhook info to request
    return this.webhooksService.handleWebhookEvent(webhookId, webhookEvent);
  }

  // Get pending webhook events (admin or professor only)
  @Get('events/pending')
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get pending webhook events',
    description:
      'Retrieve all pending webhook events that require admin approval',
  })
  @ApiResponse({
    status: 200,
    description: 'List of pending webhook events',
    type: PendingWebhookEventsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin or professor only',
  })
  async getPendingEvents() {
    const events = await this.webhookEventService.getPendingEvents();
    return {
      events,
      total: events.length,
    };
  }

  // Get specific webhook event
  @Get('events/:id')
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get webhook event details',
    description: 'Retrieve details of a specific webhook event',
  })
  @ApiParam({ name: 'id', description: 'Webhook event ID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook event details',
    type: WebhookEventResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin or professor only',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getWebhookEvent(@Param('id') id: string) {
    return this.webhookEventService.getWebhookEvent(id);
  }

  // Approve webhook event (admin or professor only)
  @Post('events/:id/approve')
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Approve a webhook event',
    description:
      'Approve a pending webhook event and execute the associated action',
  })
  @ApiParam({ name: 'id', description: 'Webhook event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event approved and executed',
    type: ApproveWebhookEventResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin or professor only',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async approveEvent(@Request() req: any, @Param('id') id: string) {
    const metadata = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.webhookEventService.approveEvent(id, req.user.sub, metadata);
  }

  // Reject webhook event (admin or professor only)
  @Post('events/:id/reject')
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Reject a webhook event',
    description: 'Reject a pending webhook event',
  })
  @ApiParam({ name: 'id', description: 'Webhook event ID' })
  @ApiBody({
    required: false,
    type: CreateAuditLogDto,
    description: 'Optional rejection reason',
  })
  @ApiResponse({
    status: 200,
    description: 'Event rejected',
    type: WebhookEventResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin or professor only',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async rejectEvent(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body?: CreateAuditLogDto,
  ) {
    const metadata = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.webhookEventService.rejectEvent(
      id,
      req.user.sub,
      body?.reason,
      metadata,
    );
  }

  // Get events for a specific webhook
  @Get(':id/events')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get webhook events',
    description: 'Retrieve events for a specific webhook endpoint',
  })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({
    status: 200,
    description: 'List of webhook events',
    type: [WebhookEventResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  getWebhookEvents(@Request() req: any, @Param('id') id: string) {
    return this.webhookEventService.getEventsByWebhook(id, req.user.sub);
  }

  // Trigger test event (admin only)
  @Post('trigger-test')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Trigger a test webhook event',
    description: 'Manually trigger an event to test webhook delivery',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        event: {
          type: 'string',
          description: 'Event type to trigger',
          example: 'test.event',
        },
        data: {
          type: 'object',
          description: 'Event payload data',
          example: {
            message: 'Test webhook event',
            timestamp: '2024-01-01T00:00:00Z',
          },
        },
      },
      required: ['event', 'data'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Test event triggered',
    type: TriggerTestEventResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async triggerTestEvent(@Body() body: TriggerTestEventDto) {
    // In production, you might want to restrict this to admin users
    return this.webhooksService.triggerEvent(body.event, body.data);
  }

  // Get audit history for a specific event
  @Get('events/:id/audit')
  @UseGuards(JwtAuthGuard, ProfGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get audit history for a webhook event',
    description:
      'Retrieve the audit trail of approvals/rejections for a specific webhook event',
  })
  @ApiParam({ name: 'id', description: 'Webhook event ID' })
  @ApiResponse({
    status: 200,
    description: 'Audit history retrieved',
    type: WebhookEventAuditHistoryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin or professor only',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventAuditHistory(@Param('id') id: string) {
    return this.webhookEventService.getEventAuditHistory(id);
  }
}
