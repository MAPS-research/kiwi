import { Injectable, Logger, Scope } from '@nestjs/common';
import { Resource, Context, HttpRequest } from '@rekog/mcp-nest';
import { Request } from 'express';
import { UserService } from 'src/common/database/user.service';
import { EnrollmentService } from 'src/common/database/enrollment.service';
import { requireScope } from '../utils/scope-check';

/**
 * MCP Resources for User Data
 * Provides read-only access to user information for Kiwi Apps
 *
 * Available resources:
 * - kiwi://users/{userId} - Basic user profile (name, email)
 * - kiwi://users/{userId}/role/{classId} - User's role in a specific class
 */
@Injectable({ scope: Scope.REQUEST })
export class UserResource {
  private readonly logger = new Logger(UserResource.name);

  constructor(
    private readonly userService: UserService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  /**
   * Get basic user profile information
   * URI pattern: kiwi://users/{userId}
   *
   * Returns: id, email (for display purposes)
   * Does NOT expose: password hashes, OAuth tokens, etc.
   */
  @Resource({
    name: 'user-profile',
    description: 'Get basic user profile information by user ID',
    mimeType: 'application/json',
    uri: 'kiwi://users/{userId}',
  })
  async getUserProfile(
    { uri }: { uri: string },
    context: Context,
    httpRequest: HttpRequest,
  ) {
    try {
      // Check scope for app tokens
      requireScope(httpRequest as Request, 'user:profile:read');

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

      // Return only safe, public information
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                id: user.id,
                email: user.email,
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
  @Resource({
    name: 'user-class-role',
    description: "Get a user's role in a specific class",
    mimeType: 'application/json',
    uri: 'kiwi://users/{userId}/role/{classId}',
  })
  async getUserClassRole(
    { uri }: { uri: string },
    context: Context,
    httpRequest: HttpRequest,
  ) {
    try {
      // Check scope for app tokens
      requireScope(httpRequest as Request, 'class:info:read');

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
  @Resource({
    name: 'user-enrollments',
    description: 'Get all class enrollments for a user',
    mimeType: 'application/json',
    uri: 'kiwi://users/{userId}/enrollments',
  })
  async getUserEnrollments(
    { uri }: { uri: string },
    context: Context,
    httpRequest: HttpRequest,
  ) {
    try {
      // Check scope for app tokens
      requireScope(httpRequest as Request, 'class:enrollments:read');

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
