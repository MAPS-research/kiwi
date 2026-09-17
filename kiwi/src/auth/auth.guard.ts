import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './auth.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from 'src/common/database/user.service';
import { EnrollmentService } from 'src/common/database/enrollment.service';
import { InstructorClassService } from 'src/instructor-class/instructor-class.service';
import { RedisService } from 'src/common/redis/redis.service';
import { AuthService } from './auth.service';
import { isGoogleOAuthConfigured } from './google.strategy';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  constructor(private userService: UserService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_AUTH === 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.user({
      id: userId,
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.systemRole !== 'admin') {
      throw new UnauthorizedException();
    }

    return true;
  }
}

@Injectable()
export class ProfGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  constructor(
    private userService: UserService,
    private enrollmentService: EnrollmentService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_AUTH === 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.user({
      id: userId,
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.systemRole === 'admin') {
      return true;
    }

    const enrollments = await this.enrollmentService.enrollments({
      where: {
        userId: userId,
      },
    });

    if (enrollments.length === 0) {
      throw new UnauthorizedException();
    }

    const isProf = enrollments.some(
      (enrollment) => enrollment.role === 'professor',
    );

    if (!isProf) {
      throw new UnauthorizedException();
    }

    return true;
  }
}

@ApiBearerAuth('bearerAuth')
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_AUTH === 'true') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // const isPublic = true; //debug
    if (isPublic) {
      // 💡 See this condition
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      // Use module-configured verification (supports both RS256 and HS256)
      const payload = await this.jwtService.verifyAsync(token, {
        ignoreExpiration: false,
      });
      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      request['user'] = payload;
    } catch (e) {
      this.logger.error(e);
      throw new UnauthorizedException('Invalid or expired token.');
    }

    // Check for session
    const userSessionId = request.session.userSessionId;
    if (!userSessionId) {
      throw new UnauthorizedException("User's session is not initialized");
    }

    // Check for user id
    const userId = request.session.userId;
    if (!userId) {
      throw new UnauthorizedException("User's session is not initialized");
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  private readonly logger = new Logger(RefreshTokenGuard.name);
  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
    private authService: AuthService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_AUTH === 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromCookie(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      // Use module-configured verification (supports both RS256 and HS256)
      const payload = await this.jwtService.verifyAsync(token, {
        ignoreExpiration: false,
      });
      const userId = payload.sub;

      const storedTokenJwtId = await this.redisService.get(
        `refresh_token:${userId}`,
      );

      if (storedTokenJwtId !== payload?.jti) {
        throw new UnauthorizedException();
      }

      const user = {
        id: userId,
        email: payload.email,
      };

      request['user'] = user;

      // Check if session exists and contains userId and userSessionId
      if (
        !request.session ||
        !request.session.userId ||
        !request.session.userSessionId
      ) {
        // Session is expired or uninitialized
        await new Promise<void>((resolve, reject) => {
          request.session.regenerate(async (err: any) => {
            if (err) {
              this.logger.error('Session regeneration error:', err);
              reject(new UnauthorizedException('Could not regenerate session'));
            } else {
              try {
                this.logger.debug('Session regenerated successfully');
                // Session regenerated successfully
                // Attach userId to the new session
                request.session.userId = userId;

                // Create a new user session and get userSessionId
                const userSessionId =
                  await this.authService.createUserSession(userId);

                // Attach userSessionId to the session
                request.session.userSessionId = userSessionId;

                resolve();
              } catch (innerErr) {
                this.logger.error(
                  'Error during session initialization:',
                  innerErr,
                );
                reject(
                  new UnauthorizedException('Could not initialize session'),
                );
              }
            }
          });
        });
      }

      return true;
    } catch (e) {
      this.logger.error(e);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    return request.cookies?.refreshToken;
  }
}

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private configService: ConfigService) {
    super({
      accessType: 'offline',
    });
  }

  canActivate(context: ExecutionContext) {
    if (!isGoogleOAuthConfigured(this.configService)) {
      throw new NotFoundException('Google sign-in is not configured');
    }

    const request = context.switchToHttp().getRequest();

    // Capture the incoming query params in session.
    if (request?.session && request?.query.frontend) {
      request.session.frontend = request.query.frontend;
    }

    // Then continue to the default AuthGuard flow.
    return super.canActivate(context);
  }
}

@Injectable()
export class InstructorClassGuard implements CanActivate {
  private readonly logger = new Logger(InstructorClassGuard.name);
  constructor(
    private userService: UserService,
    private enrollmentService: EnrollmentService,
    private instructorClassService: InstructorClassService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_AUTH === 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.user({
      id: userId,
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    // Admin can always access
    if (user.systemRole === 'admin') {
      return true;
    }

    // Check if user is a professor via enrollment
    const enrollments = await this.enrollmentService.enrollments({
      where: {
        userId: userId,
      },
    });

    const isProf = enrollments.some(
      (enrollment) => enrollment.role === 'professor',
    );

    if (isProf && enrollments.length > 0) {
      return true;
    }

    // Check if user is instructor assigned to this class
    const classId = request.query.classID || request.params.classID || request.body.classId;
    if (!classId) {
      throw new UnauthorizedException('Class ID is required');
    }

    // Check if instructor is assigned to this class (any permission level)
    const hasClassAccess = await this.instructorClassService.checkInstructorHasClassAccess(
      userId,
      classId,
    );

    if (hasClassAccess) {
      return true;
    }

    throw new UnauthorizedException('User does not have access to this class');
  }
}

@Injectable()
export class InstructorRoleGuard implements CanActivate {
  private readonly logger = new Logger(InstructorRoleGuard.name);
  constructor(
    private userService: UserService,
    private enrollmentService: EnrollmentService,
    private instructorClassService: InstructorClassService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_AUTH === 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.user({
      id: userId,
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    // Admin can always access
    if (user.systemRole === 'admin') {
      return true;
    }

    // Check if user is a professor via enrollment
    const enrollments = await this.enrollmentService.enrollments({
      where: {
        userId: userId,
      },
    });

    const isProf = enrollments.some(
      (enrollment) => enrollment.role === 'professor',
    );

    if (isProf && enrollments.length > 0) {
      return true;
    }

    // Check if user is an instructor
    const isInstructor = user.systemRole === 'instructor';
    if (isInstructor) {
      return true;
    }

    throw new UnauthorizedException('User does not have access to this class');
  }
}

@Injectable()
export class AnalyticsAdminGuard implements CanActivate {
  private readonly logger = new Logger(AnalyticsAdminGuard.name);
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_AUTH === 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.user({ id: userId });
    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.systemRole !== 'admin') {
      throw new ForbiddenException(
        'Only admins can access this analytics endpoint',
      );
    }

    return true;
  }
}

@Injectable()
export class AnalyticsAccessGuard implements CanActivate {
  private readonly logger = new Logger(AnalyticsAccessGuard.name);
  constructor(
    private userService: UserService,
    private enrollmentService: EnrollmentService,
    private instructorClassService: InstructorClassService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_AUTH === 'true') {
      const request = context.switchToHttp().getRequest();
      request.analyticsClassIds = null;
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.user({ id: userId });
    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.systemRole === 'admin') {
      request.analyticsClassIds = null;
      return true;
    }

    const accessibleClassIds = new Set<string>();

    if (user.systemRole === 'instructor') {
      const instructorClasses =
        await this.instructorClassService.getClassesForInstructor(userId);
      for (const cls of instructorClasses) {
        const canView =
          await this.instructorClassService.checkInstructorPermission(
            userId,
            cls.id,
            'canViewAnalytics',
          );
        if (canView) {
          accessibleClassIds.add(cls.id);
        }
      }
    }

    const enrollments = await this.enrollmentService.enrollments({
      where: { userId, role: 'professor' },
    });
    for (const enrollment of enrollments) {
      accessibleClassIds.add(enrollment.classId);
    }

    if (accessibleClassIds.size === 0) {
      throw new ForbiddenException(
        'User does not have access to any class analytics',
      );
    }

    request.analyticsClassIds = Array.from(accessibleClassIds);
    return true;
  }
}

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}

/**
 * JWT Guard without session requirement
 * Used for MCP endpoints that need JWT authentication but don't maintain sessions
 */
@ApiBearerAuth('bearerAuth')
@Injectable()
export class JwtAuthOptionalSessionGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthOptionalSessionGuard.name);
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_AUTH === 'true') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      // Use module-configured verification (supports both RS256 and HS256)
      const payload = await this.jwtService.verifyAsync(token, {
        ignoreExpiration: false,
      });
      // Assign payload to request object for route handlers
      request['user'] = payload;
    } catch (e) {
      this.logger.error(e);
      throw new UnauthorizedException('Invalid or expired token.');
    }

    // No session check - MCP clients don't maintain sessions
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

/**
 * Smart JWT Guard - Automatically chooses between session-required and session-optional
 * Based on the request path:
 * - /mcp paths: Session optional (for MCP clients)
 * - All other paths: Session required (for web frontend)
 */
@ApiBearerAuth('bearerAuth')
@Injectable()
export class SmartJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(SmartJwtAuthGuard.name);
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NO_AUTH === 'true') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: any;
    try {
      // Use module-configured verification (supports both RS256 and HS256)
      payload = await this.jwtService.verifyAsync(token, {
        ignoreExpiration: false,
      });
      // Assign payload to request object for route handlers
      request['user'] = payload;
    } catch (e) {
      this.logger.error(e);
      throw new UnauthorizedException('Invalid or expired token.');
    }

    // Check for app token and attach appContext
    if (payload.type === 'app_token') {
      request['appContext'] = {
        appSlug: payload.appSlug,
        classId: payload.classId,
        scopes: payload.scopes || [],
        userId: payload.sub,
      };
      this.logger.debug(
        `App token detected: ${payload.appSlug} with ${payload.scopes?.length || 0} scopes`,
      );
      // App tokens don't require sessions
      return true;
    }

    // Check if this is an MCP endpoint
    const path = request.url || request.path || '';
    const isMcpEndpoint = path.startsWith('/mcp');

    if (isMcpEndpoint) {
      // MCP endpoints don't require sessions
      this.logger.debug('MCP endpoint - skipping session check');
      return true;
    }

    // Non-MCP endpoints require session
    const userSessionId = request.session.userSessionId;
    if (!userSessionId) {
      throw new UnauthorizedException("User's session is not initialized");
    }

    const userId = request.session.userId;
    if (!userId) {
      throw new UnauthorizedException("User's session is not initialized");
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
