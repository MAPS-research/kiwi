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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApiTokensService } from './api-tokens.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { UpdateApiTokenDto } from './dto/update-api-token.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import {
  ApiTokenResponseDto,
  ApiTokenWithWebhookDto,
  DeleteApiTokenResponseDto,
} from './dto/api-token-response.dto';

@ApiTags('API Tokens')
@Controller('api-tokens')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearerAuth')
export class ApiTokensController {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  @Post()
  @ApiOperation({
    summary: 'Generate a new API token for a webhook',
    description:
      'Creates a new API token for authenticating webhook requests. Only one token can exist per webhook - creating a new token will automatically revoke any existing token for that webhook. The raw token value is only shown once during creation and cannot be retrieved later.',
  })
  @ApiResponse({
    status: 201,
    description:
      'API token created successfully. The raw token is only shown once.',
    type: ApiTokenResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  create(@Request() req: any, @Body() createApiTokenDto: CreateApiTokenDto) {
    return this.apiTokensService.create(req.user.sub, createApiTokenDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all API tokens for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of API tokens',
    type: [ApiTokenWithWebhookDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Request() req: any) {
    return this.apiTokensService.findAll(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific API token by ID' })
  @ApiParam({ name: 'id', description: 'API Token ID' })
  @ApiResponse({
    status: 200,
    description: 'API token details',
    type: ApiTokenWithWebhookDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'API token not found' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.apiTokensService.findOne(req.user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an API token' })
  @ApiParam({ name: 'id', description: 'API Token ID' })
  @ApiResponse({
    status: 200,
    description: 'API token updated successfully',
    type: ApiTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'API token not found' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateApiTokenDto: UpdateApiTokenDto,
  ) {
    return this.apiTokensService.update(req.user.sub, id, updateApiTokenDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an API token',
    description:
      'Permanently deletes an API token. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'API Token ID' })
  @ApiResponse({
    status: 200,
    description: 'API token deleted successfully',
    type: DeleteApiTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'API token not found' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.apiTokensService.remove(req.user.sub, id);
  }
}
