import { Request } from 'express';
import { Payload, Ctx } from '@nestjs/microservices';
import { Logger, Scope } from '@nestjs/common';
import {
  Resource,
  ResourceTemplate,
  McpContext as Context,
  McpController,
  McpRawRequest,
} from '@rekog/mcp-nest';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { ClassService } from 'src/class/class.service';
import { UserService } from 'src/common/database/user.service';
import { InstructorClassService } from 'src/instructor-class/instructor-class.service';

/**
 * MCP Resources for Analytics Data
 * Provides role-based access to analytics and usage metrics
 */
@McpController({ scope: Scope.REQUEST })
export class AnalyticsResource {
  private readonly logger = new Logger(AnalyticsResource.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly classService: ClassService,
    private readonly userService: UserService,
    private readonly instructorClassService: InstructorClassService,
  ) {}

  /**
   * Get analytics for a specific user
   * URI pattern: kiwi://analytics/user/{userId}
   * Access control: Users can see their own data, instructors/admins can see all
   */
  @ResourceTemplate({
    name: 'user-analytics',
    description: 'Analytics and usage metrics for a specific user',
    mimeType: 'application/json',
    uriTemplate: 'kiwi://analytics/user/{userId}',
  })
  async getUserAnalytics(
    @Payload() { uri }: { uri: string },
    @Ctx() context: Context,
    @McpRawRequest() httpRequest: Request,
  ) {
    try {
      const currentUserId = (httpRequest as any)?.user?.sub;
      if (!currentUserId) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                { error: 'User not authenticated' },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Extract userId from URI
      const match = uri.match(/^kiwi:\/\/analytics\/user\/([^\/]+)$/);
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

      const targetUserId = match[1];

      // Check permissions
      const currentUser = await this.userService.user({ id: currentUserId });
      const isAdmin = currentUser?.systemRole === 'admin';
      const isOwnData = currentUserId === targetUserId;

      if (!isOwnData && !isAdmin) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error:
                    'Access denied. You can only view your own analytics or need admin role.',
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Get user analytics
      const interactionsData =
        await this.analyticsService.presentUserInteractions(targetUserId);
      const tokenUsage =
        await this.analyticsService.userTokenUsageDetails(targetUserId);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                userId: targetUserId,
                interactions: interactionsData.interactions,
                interactionCount: interactionsData.count,
                tokenUsage,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting user analytics:', error);
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
   * Get analytics for a specific class
   * URI pattern: kiwi://analytics/class/{classId}
   * Access control: Instructors/admins or professors of the class
   */
  @ResourceTemplate({
    name: 'class-analytics',
    description: 'Analytics and engagement metrics for a specific class',
    mimeType: 'application/json',
    uriTemplate: 'kiwi://analytics/class/{classId}',
  })
  async getClassAnalytics(
    @Payload() { uri }: { uri: string },
    @Ctx() context: Context,
    @McpRawRequest() httpRequest: Request,
  ) {
    try {
      const userId = (httpRequest as any)?.user?.sub;
      if (!userId) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                { error: 'User not authenticated' },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Extract classId from URI
      const match = uri.match(/^kiwi:\/\/analytics\/class\/([^\/]+)$/);
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

      const classId = match[1];

      // Check permissions
      const user = await this.userService.user({ id: userId });
      const isAdmin = user?.systemRole === 'admin';

      // Check if user is professor of this specific class
      const enrollments = await this.classService.getEnrollmentsPerUser(userId);
      const isProfessor = enrollments.some(
        (enrollment) =>
          enrollment.classId === classId && enrollment.role === 'professor',
      );

      // Check if user is an instructor assigned to this specific class
      // with canViewAnalytics permission
      let isAssignedInstructor = false;
      if (user?.systemRole === 'instructor') {
        isAssignedInstructor =
          await this.instructorClassService.checkInstructorPermission(
            userId,
            classId,
            'canViewAnalytics',
          );
      }

      if (!isAdmin && !isProfessor && !isAssignedInstructor) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error:
                    'Access denied. Only admins, class professors, or instructors assigned to this class can view its analytics.',
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Get class analytics - using date range far in past and future to get all
      const startDate = '2020-01-01';
      const endDate = '2030-12-31';
      const result =
        await this.analyticsService.presentDateFilteredInteractions(
          startDate,
          endDate,
          classId,
        );

      // Read the interactions from the file
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(
        result.interactionsFileName,
        'utf-8',
      );
      const interactions = JSON.parse(fileContent);

      // Calculate aggregate metrics
      const uniqueUsers = new Set(interactions.map((i: any) => i.userId)).size;
      const totalInteractions = interactions.length;

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                classId,
                metrics: {
                  uniqueUsers,
                  totalInteractions,
                },
                interactions,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting class analytics:', error);
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
   * Get top token users
   * URI: kiwi://analytics/top-token-users
   * Access control: Instructors/admins only
   */
  @Resource({
    name: 'top-token-users',
    description: 'Top 10 users by token usage',
    mimeType: 'application/json',
    uri: 'kiwi://analytics/top-token-users',
  })
  async getTopTokenUsers(
    @Payload() { uri }: { uri: string },
    @Ctx() context: Context,
    @McpRawRequest() httpRequest: Request,
  ) {
    try {
      const userId = (httpRequest as any)?.user?.sub;
      if (!userId) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                { error: 'User not authenticated' },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Check permissions
      const user = await this.userService.user({ id: userId });
      const isAdmin = user?.systemRole === 'admin';

      if (!isAdmin) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error:
                    'Access denied. Only admins can view system-wide token usage statistics.',
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const topUsers = await this.analyticsService.topTokenUsers();

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                topUsers,
                count: topUsers.length,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting top token users:', error);
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
