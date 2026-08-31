import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTokenService as DatabaseApiTokenService } from '../common/database/api-token.service';
import { WebhookEndpointService } from '../common/database/webhook-endpoint.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { UpdateApiTokenDto } from './dto/update-api-token.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ApiTokensService {
  constructor(
    private readonly apiTokenService: DatabaseApiTokenService,
    private readonly webhookEndpointService: WebhookEndpointService,
  ) {}

  async create(userId: string, createApiTokenDto: CreateApiTokenDto) {
    // Check if webhook exists and belongs to user
    const webhook = await this.webhookEndpointService.webhookEndpoint({
      id: createApiTokenDto.webhookId,
    });

    if (!webhook) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    if (webhook.userId !== userId) {
      throw new ForbiddenException('You do not have permission to create a token for this webhook');
    }

    // Check if a token already exists for this webhook
    const existingToken = await this.apiTokenService.apiToken({
      webhookId: createApiTokenDto.webhookId,
    });

    if (existingToken) {
      // Delete the existing token to replace it with a new one
      await this.apiTokenService.deleteApiToken({ id: existingToken.id });
    }

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);

    const apiToken = await this.apiTokenService.create({
      data: {
        token: hashedToken,
        name: createApiTokenDto.name,
        userId,
        webhookId: createApiTokenDto.webhookId,
        scopes: createApiTokenDto.scopes || ['webhook:receive'],
        expiresAt: createApiTokenDto.expiresAt,
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
        webhookId: true,
      },
    });

    // Return the raw token only on creation
    return {
      ...apiToken,
      token: rawToken,
    };
  }

  async findAll(userId: string) {
    return this.apiTokenService.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        scopes: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        lastUsedAt: true,
        webhookId: true,
        webhook: {
          select: {
            id: true,
            url: true,
            events: true,
          },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const apiToken = await this.apiTokenService.findUnique({
      where: { id },
      include: {
        webhook: true,
      },
    });

    if (!apiToken) {
      throw new NotFoundException('API token not found');
    }

    if (apiToken.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this token');
    }

    // Don't return the actual token
    const { token, ...tokenData } = apiToken;
    return tokenData;
  }

  async update(userId: string, id: string, updateApiTokenDto: UpdateApiTokenDto) {
    const apiToken = await this.apiTokenService.apiToken({ id });

    if (!apiToken) {
      throw new NotFoundException('API token not found');
    }

    if (apiToken.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this token');
    }

    return this.apiTokenService.update({
      where: { id },
      data: updateApiTokenDto,
      select: {
        id: true,
        name: true,
        scopes: true,
        isActive: true,
        expiresAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(userId: string, id: string) {
    const apiToken = await this.apiTokenService.apiToken({ id });

    if (!apiToken) {
      throw new NotFoundException('API token not found');
    }

    if (apiToken.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this token');
    }

    await this.apiTokenService.deleteApiToken({ id });

    return { message: 'API token deleted successfully' };
  }

  async validateToken(rawToken: string) {
    // Find all tokens and check against hashed values
    const tokens = await this.apiTokenService.findActiveTokens();

    for (const token of tokens) {
      const isValid = await bcrypt.compare(rawToken, token.token);
      if (isValid) {
        // Check if token is expired
        if (token.expiresAt && token.expiresAt < new Date()) {
          return null;
        }

        // Update lastUsedAt
        await this.apiTokenService.updateApiToken({
          where: { id: token.id },
          data: { lastUsedAt: new Date() },
        });

        return token;
      }
    }

    return null;
  }
}