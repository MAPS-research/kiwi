import { Injectable, Logger } from '@nestjs/common';
import { ClassService } from 'src/class/class.service';
import { ChatService } from 'src/common/chat/chat.service';
import { UserService } from 'src/common/database/user.service';
import {
  ListResourcesResult,
  ListToolsResult,
  Resource,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/server';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    private readonly classService: ClassService,
    private readonly chatService: ChatService,
    private readonly userService: UserService,
  ) {}

  async listResources(userId: string): Promise<ListResourcesResult> {
    this.logger.debug('Listing MCP resources for user:', userId);

    const resources: Resource[] = [];

    try {
      // Get user's enrolled classes
      const enrollments = await this.classService.getEnrollmentsPerUser(userId);

      // Add class list resource
      resources.push({
        uri: 'kiwi://classes',
        name: 'Class List',
        description: 'List of enrolled classes with metadata',
        mimeType: 'application/json',
      });

      // Add document resources for each class
      for (const enrollment of enrollments) {
        const classInfo = await this.classService.getClassById(
          enrollment.classId,
        );

        if (classInfo) {
          resources.push({
            uri: `kiwi://class/${enrollment.classId}/documents`,
            name: `${(classInfo.classMetadata as any)?.name || 'Class'} Documents`,
            description: `Documents for class: ${
              (classInfo.classMetadata as any)?.name || enrollment.classId
            }`,
            mimeType: 'application/json',
          });
        }
      }

      return { resources };
    } catch (error) {
      this.logger.error('Error listing resources:', error);
      return { resources: [] };
    }
  }

  async getResource(uri: string, userId: string): Promise<any> {
    this.logger.debug('Getting resource:', uri, 'for user:', userId);

    if (uri === 'kiwi://classes') {
      // Return class list
      const enrollments = await this.classService.getEnrollmentsPerUser(userId);
      const classDetails = [];

      for (const enrollment of enrollments) {
        const classInfo = await this.classService.getClassById(
          enrollment.classId,
        );
        if (classInfo) {
          classDetails.push({
            id: classInfo.id,
            name: (classInfo.classMetadata as any)?.name,
            metadata: classInfo.classMetadata,
            professorId: classInfo.professorId,
            createdDate: classInfo.createdDate,
            userRole: enrollment.role,
          });
        }
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(classDetails, null, 2),
          },
        ],
      };
    }

    // Handle document resources
    const documentMatch = uri.match(/^kiwi:\/\/class\/([^\/]+)\/documents$/);
    if (documentMatch) {
      const classId = documentMatch[1];

      // Verify user has access to this class
      const enrollments = await this.classService.getEnrollmentsPerUser(userId);
      const hasAccess = enrollments.some(
        (enrollment) => enrollment.classId === classId,
      );

      if (!hasAccess) {
        throw new Error('Access denied to class documents');
      }

      const documentsResult =
        await this.classService.getDocumentByClassId(classId);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              documentsResult.documents.map((doc: any) => ({
                id: doc.id,
                fileName: doc.fileName,
                fileUrl: doc.file, // Note: API returns 'file' not 'fileUrl'
                isStudent: doc.isStudent,
                isLlm: doc.isLlm,
                materialType: doc.materialType,
              })),
              null,
              2,
            ),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  }

  async listTools(): Promise<ListToolsResult> {
    this.logger.debug('Listing MCP tools');

    const tools: Tool[] = [
      {
        name: 'get_authenticated_user',
        description: 'Get information about the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'chat',
        description: 'Send a message to the AI chat system',
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'The message to send to the AI',
            },
            image: {
              type: 'string',
              description: 'Optional base64-encoded image data',
            },
          },
          required: ['input'],
        },
      },
    ];

    return { tools };
  }

  async callTool(
    name: string,
    arguments_: any,
    userId: string,
  ): Promise<CallToolResult> {
    this.logger.debug('Calling tool:', name, 'for user:', userId);

    switch (name) {
      case 'get_authenticated_user':
        return this.getAuthenticatedUser(userId);

      case 'chat':
        return this.handleChatTool(arguments_.input, arguments_.image);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getAuthenticatedUser(userId: string): Promise<CallToolResult> {
    try {
      const user = await this.userService.user({ id: userId });

      if (!user) {
        throw new Error('User not found');
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

  private async handleChatTool(
    input: string,
    image?: string,
  ): Promise<CallToolResult> {
    try {
      const response = await this.chatService.createChat(input, image);

      return {
        content: [
          {
            type: 'text',
            text:
              response.choices[0]?.message?.content || 'No response generated',
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error in chat tool:', error);
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
