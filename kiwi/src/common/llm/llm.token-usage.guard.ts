// token-limit.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserSessionService } from 'src/common/database/user-session.service';
import { FeatureFlagGuardTokenLimit } from 'src/feature-flags/feature-flags.guard';

@Injectable()
export class TokenLimitGuard implements CanActivate {
  private readonly logger = new Logger(TokenLimitGuard.name);

  constructor(
    private userSessionService: UserSessionService,
    private configService: ConfigService,
    private featureFlagGuardTokenLimit: FeatureFlagGuardTokenLimit,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Access userSessionId from the session
    const userSessionId = request.session?.userSessionId;

    // Check if user is exempt from the token limit
    if (await this.featureFlagGuardTokenLimit.canActivate(context)) {
      return true;
    }

    if (!userSessionId) {
      throw new ForbiddenException('User session not found');
    }

    // Retrieve the user session
    const userSession = await this.userSessionService.userSession({
      id: userSessionId,
    });

    if (!userSession) {
      throw new ForbiddenException('User session invalid');
    }

    // Define your token limit
    const TOKEN_LIMIT = this.configService.get('LLM_TOKEN_LIMIT', 200_000_000);
    this.logger.log('used tokens in this session', userSession.tokensUsed);

    // Check if tokensUsed exceeds the limit
    if (userSession.tokensUsed >= TOKEN_LIMIT) {
      this.logger.warn(
        'token limit exceeded',
        userSession.tokensUsed,
        ' > ',
        TOKEN_LIMIT,
      );
      throw new HttpException(
        'Token limit exceeded.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
