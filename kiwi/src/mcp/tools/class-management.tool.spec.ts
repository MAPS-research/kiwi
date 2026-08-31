import { Test, TestingModule } from '@nestjs/testing';
import { ClassManagementTool } from './class-management.tool';
import { ClassService } from 'src/class/class.service';
import { UserService } from 'src/common/database/user.service';

describe('ClassManagementTool', () => {
  let tool: ClassManagementTool;
  let classService: jest.Mocked<ClassService>;
  let userService: jest.Mocked<UserService>;

  const mockContext = {
    reportProgress: jest.fn(),
  };

  const createMockRequest = (userId?: string) => ({
    user: userId ? { sub: userId } : undefined,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassManagementTool,
        {
          provide: ClassService,
          useValue: {
            getEnrollmentsPerUser: jest.fn(),
            enroll: jest.fn(),
            roster: jest.fn(),
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

    tool = module.get<ClassManagementTool>(ClassManagementTool);
    classService = module.get(ClassService);
    userService = module.get(UserService);

    mockContext.reportProgress.mockClear();
  });

  describe('addUsersToClass', () => {
    const classId = 'class-123';
    const userEmails = ['student1@test.com', 'student2@test.com'];

    it('should deny access when user is not authenticated', async () => {
      const result = await tool.addUsersToClass(
        { classId, userEmails },
        mockContext as any,
        createMockRequest() as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('User not authenticated');
    });

    it('should deny student access to add users', async () => {
      const studentId = 'student-123';

      userService.user.mockResolvedValue({
        id: studentId,
        systemRole: 'student',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId, role: 'student' },
      ] as any);

      const result = await tool.addUsersToClass(
        { classId, userEmails },
        mockContext as any,
        createMockRequest(studentId) as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Insufficient permissions');
      expect(result.content[0].text).toContain('admins and class professors');
    });

    it('should allow admin to add users to any class', async () => {
      const adminId = 'admin-123';

      userService.user.mockResolvedValue({
        id: adminId,
        systemRole: 'admin',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([]);
      classService.enroll.mockResolvedValue({ enrolled: 2 } as any);

      const result = await tool.addUsersToClass(
        { classId, userEmails },
        mockContext as any,
        createMockRequest(adminId) as any,
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.message).toBe('Users enrolled successfully');
      expect(content.classId).toBe(classId);
      expect(content.enrolledEmails).toEqual(userEmails);
      expect(mockContext.reportProgress).toHaveBeenCalledTimes(2);
    });

    it('should allow professor to add users to their class', async () => {
      const professorId = 'professor-123';

      userService.user.mockResolvedValue({
        id: professorId,
        systemRole: 'student', // Not system admin
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId, role: 'professor' },
      ] as any);
      classService.enroll.mockResolvedValue({ enrolled: 2 } as any);

      const result = await tool.addUsersToClass(
        { classId, userEmails },
        mockContext as any,
        createMockRequest(professorId) as any,
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.message).toBe('Users enrolled successfully');
    });

    it('should deny professor of different class from adding users', async () => {
      const professorId = 'professor-123';

      userService.user.mockResolvedValue({
        id: professorId,
        systemRole: 'student',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId: 'different-class', role: 'professor' },
      ] as any);

      const result = await tool.addUsersToClass(
        { classId, userEmails },
        mockContext as any,
        createMockRequest(professorId) as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Insufficient permissions');
    });

    it('should handle enrollment service errors', async () => {
      const adminId = 'admin-123';

      userService.user.mockResolvedValue({
        id: adminId,
        systemRole: 'admin',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([]);
      classService.enroll.mockRejectedValue(new Error('Enrollment failed'));

      const result = await tool.addUsersToClass(
        { classId, userEmails },
        mockContext as any,
        createMockRequest(adminId) as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Enrollment failed');
    });
  });

  describe('getClassRoster', () => {
    const classId = 'class-123';

    it('should deny access when user is not authenticated', async () => {
      const result = await tool.getClassRoster(
        { classId },
        mockContext as any,
        createMockRequest() as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('User not authenticated');
    });

    it('should deny student access to roster', async () => {
      const studentId = 'student-123';

      userService.user.mockResolvedValue({
        id: studentId,
        systemRole: 'student',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId, role: 'student' },
      ] as any);

      const result = await tool.getClassRoster(
        { classId },
        mockContext as any,
        createMockRequest(studentId) as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Insufficient permissions');
      expect(result.content[0].text).toContain('admins and class professors');
    });

    it('should allow admin to view any class roster', async () => {
      const adminId = 'admin-123';

      userService.user.mockResolvedValue({
        id: adminId,
        systemRole: 'admin',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([]);
      classService.roster.mockResolvedValue({
        users: [
          { id: 'user-1', role: 'professor' },
          { id: 'user-2', role: 'student' },
          { id: 'user-3', role: 'student' },
        ],
      } as any);

      const result = await tool.getClassRoster(
        { classId },
        mockContext as any,
        createMockRequest(adminId) as any,
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.classId).toBe(classId);
      expect(content.totalStudents).toBe(2);
      expect(content.totalProfessors).toBe(1);
      expect(content.users).toHaveLength(3);
      expect(mockContext.reportProgress).toHaveBeenCalledTimes(2);
    });

    it('should allow professor to view their class roster', async () => {
      const professorId = 'professor-123';

      userService.user.mockResolvedValue({
        id: professorId,
        systemRole: 'student',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId, role: 'professor' },
      ] as any);
      classService.roster.mockResolvedValue({
        users: [{ id: 'user-1', role: 'student' }],
      } as any);

      const result = await tool.getClassRoster(
        { classId },
        mockContext as any,
        createMockRequest(professorId) as any,
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.totalStudents).toBe(1);
    });

    it('should deny professor of different class from viewing roster', async () => {
      const professorId = 'professor-123';

      userService.user.mockResolvedValue({
        id: professorId,
        systemRole: 'student',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId: 'different-class', role: 'professor' },
      ] as any);

      const result = await tool.getClassRoster(
        { classId },
        mockContext as any,
        createMockRequest(professorId) as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Insufficient permissions');
    });

    it('should handle empty roster', async () => {
      const adminId = 'admin-123';

      userService.user.mockResolvedValue({
        id: adminId,
        systemRole: 'admin',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([]);
      classService.roster.mockResolvedValue({
        users: [],
      } as any);

      const result = await tool.getClassRoster(
        { classId },
        mockContext as any,
        createMockRequest(adminId) as any,
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.totalStudents).toBe(0);
      expect(content.totalProfessors).toBe(0);
    });

    it('should handle roster service errors', async () => {
      const adminId = 'admin-123';

      userService.user.mockResolvedValue({
        id: adminId,
        systemRole: 'admin',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([]);
      classService.roster.mockRejectedValue(new Error('Roster not found'));

      const result = await tool.getClassRoster(
        { classId },
        mockContext as any,
        createMockRequest(adminId) as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Roster not found');
    });
  });

  describe('getAuthenticatedUser', () => {
    it('should deny access when user is not authenticated', async () => {
      const result = await tool.getAuthenticatedUser(
        {},
        mockContext as any,
        createMockRequest() as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('User not authenticated');
    });

    it('should return error when user not found in database', async () => {
      const userId = 'user-123';

      userService.user.mockResolvedValue(null);

      const result = await tool.getAuthenticatedUser(
        {},
        mockContext as any,
        createMockRequest(userId) as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('User not found');
    });

    it('should return user information for authenticated user', async () => {
      const userId = 'user-123';

      userService.user.mockResolvedValue({
        id: userId,
        email: 'user@test.com',
        systemRole: 'student',
        consent: true,
        oauth: 'google',
      } as any);

      const result = await tool.getAuthenticatedUser(
        {},
        mockContext as any,
        createMockRequest(userId) as any,
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.id).toBe(userId);
      expect(content.email).toBe('user@test.com');
      expect(content.systemRole).toBe('student');
      expect(content.consent).toBe(true);
      expect(content.oauth).toBe('google');
    });

    it('should return admin user information', async () => {
      const adminId = 'admin-123';

      userService.user.mockResolvedValue({
        id: adminId,
        email: 'admin@test.com',
        systemRole: 'admin',
        consent: true,
        oauth: 'google',
      } as any);

      const result = await tool.getAuthenticatedUser(
        {},
        mockContext as any,
        createMockRequest(adminId) as any,
      );

      expect(result.isError).toBeUndefined();
      const content = JSON.parse(result.content[0].text);
      expect(content.systemRole).toBe('admin');
    });

    it('should handle service errors', async () => {
      const userId = 'user-123';

      userService.user.mockRejectedValue(new Error('Database connection error'));

      const result = await tool.getAuthenticatedUser(
        {},
        mockContext as any,
        createMockRequest(userId) as any,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Database connection error');
    });
  });
});
