import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiTokensService } from '../../api-tokens/api-tokens.service';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const apiToken = await this.apiTokensService.validateToken(token);

    if (!apiToken) {
      throw new UnauthorizedException('Invalid or expired API token');
    }

    // Check if the webhook ID in the URL matches the token's webhook
    const webhookId = request.params.webhookId;
    if (apiToken.webhookId !== webhookId) {
      throw new UnauthorizedException('Token not valid for this webhook');
    }

    // Check if webhook is active
    if (!apiToken.webhook.isActive) {
      throw new UnauthorizedException('Webhook is not active');
    }

    // Attach token and user info to request
    request.apiToken = apiToken;
    request.user = apiToken.user;
    request.webhook = apiToken.webhook;

    return true;
  }
}