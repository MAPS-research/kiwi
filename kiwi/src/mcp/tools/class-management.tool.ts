import { reportMcpProgress } from '../utils/report-progress';
import { Payload, Ctx } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import {
  Tool,
  McpContext as Context,
  McpController,
  McpRawRequest,
} from '@rekog/mcp-nest';
import { z } from 'zod';
import { Request } from 'express';
import { ClassService } from 'src/class/class.service';
import { UserService } from 'src/common/database/user.service';

/**
 * MCP Tools for Class Management
 * Allows AI assistants to manage class enrollments and information
 */
@McpController()
export class ClassManagementTool {
  private readonly logger = new Logger(ClassManagementTool.name);

  constructor(
    private readonly classService: ClassService,
    private readonly userService: UserService,
  ) {}

  /**
   * Add users to a class by their email addresses
   * Requires professor or admin role
   */
  @Tool({
    name: 'add_users_to_class',
    description:
      'Enroll one or more users into a class by their email addresses. Creates pending enrollments for users not yet in the system.',
    parameters: z.object({
      classId: z
        .string()
        .describe('The ID of the class to enroll users into')
        .nonempty('Class ID is required'),
      userEmails: z
        .array(z.string().email('Must be a valid email address'))
        .describe('Array of user email addresses to enroll')
        .min(1, 'At least one email address is required'),
    }),
    annotations: {
      title: 'Add Users to Class',
      destructiveHint: false,
      readOnlyHint: false,
      idempotentHint: true,
    },
  })
  async addUsersToClass(
    @Payload()
    { classId, userEmails }: { classId: string; userEmails: string[] },
    @Ctx() context: Context,
    @McpRawRequest() request: Request,
  ) {
    try {
      // Get user ID from request
      const userId = (request as any).user?.sub;
      if (!userId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: User not authenticated',
            },
          ],
          isError: true,
        };
      }

      // Check if user is admin or professor of the class
      const user = await this.userService.user({ id: userId });
      const isAdmin = user?.systemRole === 'admin';

      // Check if user is professor of this class
      const enrollments = await this.classService.getEnrollmentsPerUser(userId);
      const isProfessor = enrollments.some(
        (enrollment) =>
          enrollment.classId === classId && enrollment.role === 'professor',
      );

      if (!isAdmin && !isProfessor) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Insufficient permissions. Only admins and class professors can add users to a class.',
            },
          ],
          isError: true,
        };
      }

      // Report progress
      await reportMcpProgress(context, { progress: 30, total: 100 });

      // Enroll users
      const result = await this.classService.enroll(classId, userEmails);

      await reportMcpProgress(context, { progress: 100, total: 100 });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: 'Users enrolled successfully',
                classId,
                enrolledEmails: userEmails,
                summary: result,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error enrolling users:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error enrolling users: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get class roster (all enrolled users)
   * Requires professor or admin role
   */
  @Tool({
    name: 'get_class_roster',
    description:
      'Get the list of all users enrolled in a class with their roles',
    parameters: z.object({
      classId: z
        .string()
        .describe('The ID of the class')
        .nonempty('Class ID is required'),
    }),
    annotations: {
      title: 'Get Class Roster',
      destructiveHint: false,
      readOnlyHint: true,
      idempotentHint: true,
    },
  })
  async getClassRoster(
    @Payload() { classId }: { classId: string },
    @Ctx() context: Context,
    @McpRawRequest() request: Request,
  ) {
    try {
      const userId = (request as any).user?.sub;
      if (!userId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: User not authenticated',
            },
          ],
          isError: true,
        };
      }

      // Check permissions
      const user = await this.userService.user({ id: userId });
      const isAdmin = user?.systemRole === 'admin';
      const enrollments = await this.classService.getEnrollmentsPerUser(userId);
      const isProfessor = enrollments.some(
        (enrollment) =>
          enrollment.classId === classId && enrollment.role === 'professor',
      );

      if (!isAdmin && !isProfessor) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Insufficient permissions. Only admins and class professors can view the roster.',
            },
          ],
          isError: true,
        };
      }

      await reportMcpProgress(context, { progress: 50, total: 100 });

      const roster = await this.classService.roster(classId);

      await reportMcpProgress(context, { progress: 100, total: 100 });

      const users = roster.users || [];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                classId,
                totalStudents: users.filter((u: any) => u.role === 'student')
                  .length,
                totalProfessors: users.filter(
                  (u: any) => u.role === 'professor',
                ).length,
                users: users,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting class roster:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error getting roster: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get authenticated user information
   */
  @Tool({
    name: 'get_authenticated_user',
    description: 'Get information about the currently authenticated user',
    parameters: z.object({}),
    annotations: {
      title: 'Get Authenticated User',
      destructiveHint: false,
      readOnlyHint: true,
      idempotentHint: true,
    },
  })
  async getAuthenticatedUser(
    @Payload() {},
    @Ctx() context: Context,
    @McpRawRequest() request: Request,
  ) {
    try {
      const userId = (request as any).user?.sub;
      if (!userId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: User not authenticated',
            },
          ],
          isError: true,
        };
      }

      const user = await this.userService.user({ id: userId });
      if (!user) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: User not found',
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                id: user.id,
                email: user.email,
                systemRole: user.systemRole,
                consent: user.consent,
                oauth: user.oauth,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting authenticated user:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
