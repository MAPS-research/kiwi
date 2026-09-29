import { Payload, Ctx } from '@nestjs/microservices';
import { Logger, Scope } from '@nestjs/common';
import {
  ResourceTemplate,
  McpContext as Context,
  McpController,
  McpRawRequest,
} from '@rekog/mcp-nest';
import { Request } from 'express';
import { UserService } from 'src/common/database/user.service';
import { EnrollmentService } from 'src/common/database/enrollment.service';
import { requireScope } from '../utils/scope-check';

/**
 * MCP Resources for User Data
 * Provides read-only access to user information for Kiwi Apps
 *
 * Available resources:
 * - kiwi://users/{userId} - Basic user profile (email only for the user themselves or an admin)
 * - kiwi://users/{userId}/role/{classId} - User's role in a specific class
 */
/**
 * The Express request, where the auth guard put `user` and `appContext`.
 * @rekog/mcp-nest 2 passes it directly; older adapters wrapped it as `.raw`,
 * and reading the wrapper silently skips every app-token scope check.
 */
function expressRequest(httpRequest: unknown): Request {
  return ((httpRequest as any)?.raw ?? httpRequest) as Request;
}

@McpController({ scope: Scope.REQUEST })
export class UserResource {
  private readonly logger = new Logger(UserResource.name);

  constructor(
    private readonly userService: UserService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  private async mayReadEmail(
    request: Request,
    targetUserId: string,
  ): Promise<boolean> {
    if (request?.['appContext']) return false;
    const callerId: string | undefined = (request as any)?.user?.sub;
    if (!callerId) return false;
    if (callerId === targetUserId) return true;
    const caller = await this.userService.user({ id: callerId });
    return caller?.systemRole === 'admin';
  }

  /**
   * Get basic user profile information
   * URI pattern: kiwi://users/{userId}
   *
   * Returns: id, systemRole, and email when the caller is that user or an admin
   * (never for app tokens)
   * Does NOT expose: password hashes, OAuth tokens, etc.
   */
  @ResourceTemplate({
    name: 'user-profile',
    description: 'Get basic user profile information by user ID',
    mimeType: 'application/json',
    uriTemplate: 'kiwi://users/{userId}',
  })
  async getUserProfile(
    @Payload() { uri }: { uri: string },
    @Ctx() context: Context,
    @McpRawRequest() httpRequest: Request,
  ) {
    try {
      // Check scope for app tokens
      requireScope(expressRequest(httpRequest), 'user:profile:read');

      // Extract userId from URI
      const match = uri.match(/^kiwi:\/\/users\/([^\/]+)$/);
      if (!match) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Invalid URI format' }, null, 2),
            },
          ],
        };
      }

      const userId = match[1];

      // Get user information
      const user = await this.userService.user({ id: userId });

      if (!user) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'User not found' }, null, 2),
            },
          ],
        };
      }

      // A user id must never resolve to an email for anyone but that user or
      // an admin, and never for an embedded app (apps see opaque ids only).
      const includeEmail = await this.mayReadEmail(
        expressRequest(httpRequest),
        user.id,
      );

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                id: user.id,
                ...(includeEmail ? { email: user.email } : {}),
                systemRole: user.systemRole,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting user profile:', error);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Get user's role in a specific class
   * URI pattern: kiwi://users/{userId}/role/{classId}
   *
   * Returns: userId, classId, role (student/ta/professor/admin)
   * Returns null role if user is not enrolled in the class
   */
  @ResourceTemplate({
    name: 'user-class-role',
    description: "Get a user's role in a specific class",
    mimeType: 'application/json',
    uriTemplate: 'kiwi://users/{userId}/role/{classId}',
  })
  async getUserClassRole(
    @Payload() { uri }: { uri: string },
    @Ctx() context: Context,
    @McpRawRequest() httpRequest: Request,
  ) {
    try {
      // Check scope for app tokens
      requireScope(expressRequest(httpRequest), 'class:info:read');

      // Extract userId and classId from URI
      const match = uri.match(/^kiwi:\/\/users\/([^\/]+)\/role\/([^\/]+)$/);
      if (!match) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Invalid URI format' }, null, 2),
            },
          ],
        };
      }

      const userId = match[1];
      const classId = match[2];

      // Get enrollment for this user+class combination
      const enrollment = await this.enrollmentService.enrollment({
        classId_userId: { classId, userId },
      });

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                userId,
                classId,
                role: enrollment?.role || null,
                enrolled: !!enrollment,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting user class role:', error);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Get all class enrollments for a user
   * URI pattern: kiwi://users/{userId}/enrollments
   *
   * Returns: list of classes the user is enrolled in with their roles
   */
  @ResourceTemplate({
    name: 'user-enrollments',
    description: 'Get all class enrollments for a user',
    mimeType: 'application/json',
    uriTemplate: 'kiwi://users/{userId}/enrollments',
  })
  async getUserEnrollments(
    @Payload() { uri }: { uri: string },
    @Ctx() context: Context,
    @McpRawRequest() httpRequest: Request,
  ) {
    try {
      // Check scope for app tokens
      requireScope(expressRequest(httpRequest), 'class:enrollments:read');

      // Extract userId from URI
      const match = uri.match(/^kiwi:\/\/users\/([^\/]+)\/enrollments$/);
      if (!match) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Invalid URI format' }, null, 2),
            },
          ],
        };
      }

      const userId = match[1];

      // Get all enrollments for this user
      const enrollments = await this.enrollmentService.enrollments({
        where: { userId },
      });

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                userId,
                totalEnrollments: enrollments.length,
                enrollments: enrollments.map((e) => ({
                  classId: e.classId,
                  role: e.role,
                })),
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting user enrollments:', error);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
      };
    }
  }
}
