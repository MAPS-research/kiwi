import { Test, TestingModule } from '@nestjs/testing';
import { McpService } from './mcp-server-impl.service';
import { ClassService } from 'src/class/class.service';
import { ChatService } from 'src/common/chat/chat.service';
import { UserService } from 'src/common/database/user.service';

function getTextContent(
  result: Awaited<ReturnType<McpService['callTool']>>,
): string {
  const content = result.content[0];
  if (content.type !== 'text') {
    throw new Error(`Expected text content, received ${content.type}`);
  }
  return content.text;
}

describe('McpService', () => {
  let service: McpService;
  let classService: jest.Mocked<ClassService>;
  let chatService: jest.Mocked<ChatService>;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpService,
        {
          provide: ClassService,
          useValue: {
            getEnrollmentsPerUser: jest.fn(),
            getClassById: jest.fn(),
            getDocumentByClassId: jest.fn(),
          },
        },
        {
          provide: ChatService,
          useValue: {
            createChat: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            user: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<McpService>(McpService);
    classService = module.get(ClassService);
    chatService = module.get(ChatService);
    userService = module.get(UserService);
  });

  describe('listResources', () => {
    const userId = 'user-123';

    it('should return class list resource for all users', async () => {
      classService.getEnrollmentsPerUser.mockResolvedValue([]);

      const result = await service.listResources(userId);

      expect(result.resources).toContainEqual({
        uri: 'kiwi://classes',
        name: 'Class List',
        description: 'List of enrolled classes with metadata',
        mimeType: 'application/json',
      });
    });

    it('should return document resources for enrolled classes', async () => {
      const classId = 'class-123';

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId, role: 'student' },
      ] as any);

      classService.getClassById.mockResolvedValue({
        id: classId,
        classMetadata: { name: 'Test Class' },
      } as any);

      const result = await service.listResources(userId);

      expect(result.resources).toHaveLength(2);
      expect(result.resources[1]).toEqual({
        uri: `kiwi://class/${classId}/documents`,
        name: 'Test Class Documents',
        description: `Documents for class: Test Class`,
        mimeType: 'application/json',
      });
    });

    it('should handle multiple enrolled classes', async () => {
      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId: 'class-1', role: 'student' },
        { classId: 'class-2', role: 'professor' },
      ] as any);

      classService.getClassById
        .mockResolvedValueOnce({
          id: 'class-1',
          classMetadata: { name: 'Class One' },
        } as any)
        .mockResolvedValueOnce({
          id: 'class-2',
          classMetadata: { name: 'Class Two' },
        } as any);

      const result = await service.listResources(userId);

      expect(result.resources).toHaveLength(3);
    });

    it('should handle class not found', async () => {
      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId: 'class-123', role: 'student' },
      ] as any);

      classService.getClassById.mockResolvedValue(null as any);

      const result = await service.listResources(userId);

      // Should only have the class list resource
      expect(result.resources).toHaveLength(1);
    });

    it('should return empty resources on error', async () => {
      classService.getEnrollmentsPerUser.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.listResources(userId);

      expect(result.resources).toEqual([]);
    });
  });

  describe('getResource', () => {
    const userId = 'user-123';

    describe('kiwi://classes', () => {
      it('should return enrolled classes with details', async () => {
        classService.getEnrollmentsPerUser.mockResolvedValue([
          { classId: 'class-1', role: 'student' },
        ] as any);

        classService.getClassById.mockResolvedValue({
          id: 'class-1',
          classMetadata: { name: 'Test Class' },
          professorId: 'prof-1',
          createdDate: '2024-01-01',
        } as any);

        const result = await service.getResource('kiwi://classes', userId);

        expect(result.contents[0].uri).toBe('kiwi://classes');
        expect(result.contents[0].mimeType).toBe('application/json');

        const content = JSON.parse(result.contents[0].text);
        expect(content).toHaveLength(1);
        expect(content[0].id).toBe('class-1');
        expect(content[0].name).toBe('Test Class');
        expect(content[0].userRole).toBe('student');
      });

      it('should handle user with no enrollments', async () => {
        classService.getEnrollmentsPerUser.mockResolvedValue([]);

        const result = await service.getResource('kiwi://classes', userId);

        const content = JSON.parse(result.contents[0].text);
        expect(content).toEqual([]);
      });
    });

    describe('kiwi://class/{id}/documents', () => {
      const classId = 'class-123';
      const uri = `kiwi://class/${classId}/documents`;

      it('should return documents for enrolled class', async () => {
        classService.getEnrollmentsPerUser.mockResolvedValue([
          { classId, role: 'student' },
        ] as any);

        classService.getDocumentByClassId.mockResolvedValue({
          documents: [
            {
              id: 'doc-1',
              fileName: 'lecture.pdf',
              file: 'https://example.com/lecture.pdf',
              isStudent: false,
              isLlm: true,
              materialType: 'lecture',
            },
          ],
        } as any);

        const result = await service.getResource(uri, userId);

        const content = JSON.parse(result.contents[0].text);
        expect(content).toHaveLength(1);
        expect(content[0].id).toBe('doc-1');
        expect(content[0].fileName).toBe('lecture.pdf');
        expect(content[0].fileUrl).toBe('https://example.com/lecture.pdf');
      });

      it('should deny access to non-enrolled class', async () => {
        classService.getEnrollmentsPerUser.mockResolvedValue([
          { classId: 'different-class', role: 'student' },
        ] as any);

        await expect(service.getResource(uri, userId)).rejects.toThrow(
          'Access denied to class documents',
        );
      });

      it('should deny access when user has no enrollments', async () => {
        classService.getEnrollmentsPerUser.mockResolvedValue([]);

        await expect(service.getResource(uri, userId)).rejects.toThrow(
          'Access denied to class documents',
        );
      });
    });

    it('should throw for unknown resource URI', async () => {
      await expect(
        service.getResource('kiwi://unknown/resource', userId),
      ).rejects.toThrow('Resource not found: kiwi://unknown/resource');
    });
  });

  describe('listTools', () => {
    it('should return list of available tools', async () => {
      const result = await service.listTools();

      expect(result.tools).toHaveLength(2);

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('get_authenticated_user');
      expect(toolNames).toContain('chat');
    });

    it('should include correct schema for get_authenticated_user', async () => {
      const result = await service.listTools();

      const userTool = result.tools.find(
        (t) => t.name === 'get_authenticated_user',
      );
      expect(userTool?.inputSchema).toEqual({
        type: 'object',
        properties: {},
        required: [],
      });
    });

    it('should include correct schema for chat tool', async () => {
      const result = await service.listTools();

      const chatTool = result.tools.find((t) => t.name === 'chat');
      expect(chatTool?.inputSchema?.properties?.input).toBeDefined();
      expect(chatTool?.inputSchema?.required).toContain('input');
    });
  });

  describe('callTool', () => {
    const userId = 'user-123';

    describe('get_authenticated_user', () => {
      it('should return user information', async () => {
        userService.user.mockResolvedValue({
          id: userId,
          email: 'user@test.com',
          systemRole: 'student',
          consent: true,
          oauth: 'google',
        } as any);

        const result = await service.callTool(
          'get_authenticated_user',
          {},
          userId,
        );

        expect(result.isError).toBeUndefined();
        const content = JSON.parse(getTextContent(result));
        expect(content.id).toBe(userId);
        expect(content.email).toBe('user@test.com');
        expect(content.systemRole).toBe('student');
      });

      it('should return error when user not found', async () => {
        userService.user.mockResolvedValue(null);

        const result = await service.callTool(
          'get_authenticated_user',
          {},
          userId,
        );

        expect(result.isError).toBe(true);
        expect(getTextContent(result)).toContain('User not found');
      });

      it('should handle service errors', async () => {
        userService.user.mockRejectedValue(new Error('Database error'));

        const result = await service.callTool(
          'get_authenticated_user',
          {},
          userId,
        );

        expect(result.isError).toBe(true);
        expect(getTextContent(result)).toContain('Database error');
      });
    });

    describe('chat', () => {
      it('should send message and return response', async () => {
        const input = 'Hello, AI!';

        chatService.createChat.mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Hello! How can I help you?',
              },
            },
          ],
        } as any);

        const result = await service.callTool('chat', { input }, userId);

        expect(result.isError).toBeUndefined();
        expect(getTextContent(result)).toBe('Hello! How can I help you?');
        expect(chatService.createChat).toHaveBeenCalledWith(input, undefined);
      });

      it('should handle chat with image', async () => {
        const input = 'Describe this image';
        const image = 'base64imagedata';

        chatService.createChat.mockResolvedValue({
          choices: [
            {
              message: {
                content: 'I see an image',
              },
            },
          ],
        } as any);

        await service.callTool('chat', { input, image }, userId);

        expect(chatService.createChat).toHaveBeenCalledWith(input, image);
      });

      it('should handle empty response', async () => {
        chatService.createChat.mockResolvedValue({
          choices: [{ message: {} }],
        } as any);

        const result = await service.callTool(
          'chat',
          { input: 'test' },
          userId,
        );

        expect(getTextContent(result)).toBe('No response generated');
      });

      it('should handle chat service errors', async () => {
        chatService.createChat.mockRejectedValue(
          new Error('Chat service unavailable'),
        );

        const result = await service.callTool(
          'chat',
          { input: 'test' },
          userId,
        );

        expect(result.isError).toBe(true);
        expect(getTextContent(result)).toContain('Chat service unavailable');
      });
    });

    it('should throw for unknown tool', async () => {
      await expect(
        service.callTool('unknown_tool', {}, userId),
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });
});
