import { readFile } from 'fs/promises';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsResource } from './analytics.resource';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { ClassService } from 'src/class/class.service';
import { UserService } from 'src/common/database/user.service';
import { InstructorClassService } from 'src/instructor-class/instructor-class.service';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

describe('AnalyticsResource', () => {
  let resource: AnalyticsResource;
  let analyticsService: jest.Mocked<AnalyticsService>;
  let classService: jest.Mocked<ClassService>;
  let userService: jest.Mocked<UserService>;
  let instructorClassService: jest.Mocked<InstructorClassService>;

  const mockContext = {};

  const createMockHttpRequest = (userId?: string) => ({
    user: userId ? { sub: userId } : undefined,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsResource,
        {
          provide: AnalyticsService,
          useValue: {
            presentUserInteractions: jest.fn(),
            userTokenUsageDetails: jest.fn(),
            presentDateFilteredInteractions: jest.fn(),
            topTokenUsers: jest.fn(),
          },
        },
        {
          provide: ClassService,
          useValue: {
            getEnrollmentsPerUser: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            user: jest.fn(),
          },
        },
        {
          provide: InstructorClassService,
          useValue: {
            checkInstructorPermission: jest.fn(),
            checkInstructorHasClassAccess: jest.fn(),
            getClassesForInstructor: jest.fn(),
          },
        },
      ],
    }).compile();

    resource = await module.resolve<AnalyticsResource>(AnalyticsResource);
    analyticsService = module.get(AnalyticsService);
    classService = module.get(ClassService);
    userService = module.get(UserService);
    instructorClassService = module.get(InstructorClassService);
  });

  describe('getUserAnalytics', () => {
    const validUri = 'kiwi://analytics/user/target-user-id';

    it('should deny access when user is not authenticated', async () => {
      const result = await resource.getUserAnalytics(
        { uri: validUri },
        mockContext as any,
        createMockHttpRequest() as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('User not authenticated');
    });

    it('should return error for invalid URI format', async () => {
      const invalidUri = 'kiwi://analytics/invalid/path';

      const result = await resource.getUserAnalytics(
        { uri: invalidUri },
        mockContext as any,
        createMockHttpRequest('user-id') as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Invalid URI format');
    });

    it('should allow user to access their own analytics', async () => {
      const userId = 'user-123';
      const uri = `kiwi://analytics/user/${userId}`;

      userService.user.mockResolvedValue({
        id: userId,
        systemRole: 'student',
      } as any);

      analyticsService.presentUserInteractions.mockResolvedValue({
        interactions: [{ id: '1' }],
        count: 1,
      } as any);

      analyticsService.userTokenUsageDetails.mockResolvedValue({
        totalTokens: 1000,
      } as any);

      const result = await resource.getUserAnalytics(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.userId).toBe(userId);
      expect(content.interactions).toHaveLength(1);
      expect(content.tokenUsage).toEqual({ totalTokens: 1000 });
    });

    it('should deny student access to other user analytics', async () => {
      const currentUserId = 'student-123';
      const targetUserId = 'other-user-456';
      const uri = `kiwi://analytics/user/${targetUserId}`;

      userService.user.mockResolvedValue({
        id: currentUserId,
        systemRole: 'student',
      } as any);

      const result = await resource.getUserAnalytics(
        { uri },
        mockContext as any,
        createMockHttpRequest(currentUserId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toContain('Access denied');
      expect(content.error).toContain('admin');
    });

    it('should deny instructor access to other user analytics', async () => {
      const instructorId = 'instructor-123';
      const targetUserId = 'student-456';
      const uri = `kiwi://analytics/user/${targetUserId}`;

      userService.user.mockResolvedValue({
        id: instructorId,
        systemRole: 'instructor',
      } as any);

      const result = await resource.getUserAnalytics(
        { uri },
        mockContext as any,
        createMockHttpRequest(instructorId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toContain('Access denied');
      expect(analyticsService.presentUserInteractions).not.toHaveBeenCalled();
    });

    it('should allow admin to access any user analytics', async () => {
      const adminId = 'admin-123';
      const targetUserId = 'student-456';
      const uri = `kiwi://analytics/user/${targetUserId}`;

      userService.user.mockResolvedValue({
        id: adminId,
        systemRole: 'admin',
      } as any);

      analyticsService.presentUserInteractions.mockResolvedValue({
        interactions: [],
        count: 0,
      } as any);

      analyticsService.userTokenUsageDetails.mockResolvedValue({
        totalTokens: 200,
      } as any);

      const result = await resource.getUserAnalytics(
        { uri },
        mockContext as any,
        createMockHttpRequest(adminId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.userId).toBe(targetUserId);
      expect(content.error).toBeUndefined();
    });

    it('should handle service errors gracefully', async () => {
      const userId = 'user-123';
      const uri = `kiwi://analytics/user/${userId}`;

      userService.user.mockResolvedValue({
        id: userId,
        systemRole: 'student',
      } as any);

      analyticsService.presentUserInteractions.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await resource.getUserAnalytics(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Database error');
    });
  });

  describe('getClassAnalytics', () => {
    const classId = 'class-123';
    const validUri = `kiwi://analytics/class/${classId}`;

    it('should deny access when user is not authenticated', async () => {
      const result = await resource.getClassAnalytics(
        { uri: validUri },
        mockContext as any,
        createMockHttpRequest() as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('User not authenticated');
    });

    it('should return error for invalid URI format', async () => {
      const invalidUri = 'kiwi://analytics/invalid/path/extra';

      const result = await resource.getClassAnalytics(
        { uri: invalidUri },
        mockContext as any,
        createMockHttpRequest('user-id') as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Invalid URI format');
    });

    it('should deny student access to class analytics', async () => {
      const studentId = 'student-123';

      userService.user.mockResolvedValue({
        id: studentId,
        systemRole: 'student',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId, role: 'student' },
      ] as any);

      const result = await resource.getClassAnalytics(
        { uri: validUri },
        mockContext as any,
        createMockHttpRequest(studentId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toContain('Access denied');
    });

    it('should allow professor of the class to access analytics', async () => {
      const professorId = 'professor-123';

      userService.user.mockResolvedValue({
        id: professorId,
        systemRole: 'student',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId, role: 'professor' },
      ] as any);

      analyticsService.presentDateFilteredInteractions.mockResolvedValue({
        interactionsFileName: '/tmp/interactions.json',
      } as any);

      jest.mocked(readFile).mockResolvedValue(
        JSON.stringify([
          { userId: 'student-1', message: 'test' },
          { userId: 'student-2', message: 'test' },
        ]),
      );

      const result = await resource.getClassAnalytics(
        { uri: validUri },
        mockContext as any,
        createMockHttpRequest(professorId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.classId).toBe(classId);
      expect(content.metrics.uniqueUsers).toBe(2);
      expect(content.metrics.totalInteractions).toBe(2);
    });

    it('should deny professor of different class access', async () => {
      const professorId = 'professor-123';

      userService.user.mockResolvedValue({
        id: professorId,
        systemRole: 'student',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([
        { classId: 'different-class', role: 'professor' },
      ] as any);

      const result = await resource.getClassAnalytics(
        { uri: validUri },
        mockContext as any,
        createMockHttpRequest(professorId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toContain('Access denied');
    });

    it('should allow instructor assigned to the class with canViewAnalytics', async () => {
      const instructorId = 'instructor-123';

      userService.user.mockResolvedValue({
        id: instructorId,
        systemRole: 'instructor',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([]);
      instructorClassService.checkInstructorPermission.mockResolvedValue(true);

      analyticsService.presentDateFilteredInteractions.mockResolvedValue({
        interactionsFileName: '/tmp/interactions.json',
      } as any);

      jest.mocked(readFile).mockResolvedValue(JSON.stringify([]));

      const result = await resource.getClassAnalytics(
        { uri: validUri },
        mockContext as any,
        createMockHttpRequest(instructorId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.classId).toBe(classId);
      expect(content.error).toBeUndefined();
      expect(
        instructorClassService.checkInstructorPermission,
      ).toHaveBeenCalledWith(instructorId, classId, 'canViewAnalytics');
    });

    it('should deny instructor NOT assigned to the class', async () => {
      const instructorId = 'instructor-123';

      userService.user.mockResolvedValue({
        id: instructorId,
        systemRole: 'instructor',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([]);
      instructorClassService.checkInstructorPermission.mockResolvedValue(false);

      const result = await resource.getClassAnalytics(
        { uri: validUri },
        mockContext as any,
        createMockHttpRequest(instructorId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toContain('Access denied');
      expect(
        analyticsService.presentDateFilteredInteractions,
      ).not.toHaveBeenCalled();
    });

    it('should allow admin to access any class analytics', async () => {
      const adminId = 'admin-123';

      userService.user.mockResolvedValue({
        id: adminId,
        systemRole: 'admin',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([]);

      analyticsService.presentDateFilteredInteractions.mockResolvedValue({
        interactionsFileName: '/tmp/interactions.json',
      } as any);

      jest.mocked(readFile).mockResolvedValue(JSON.stringify([]));

      const result = await resource.getClassAnalytics(
        { uri: validUri },
        mockContext as any,
        createMockHttpRequest(adminId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.classId).toBe(classId);
      expect(content.error).toBeUndefined();
    });

    it('should handle service errors gracefully', async () => {
      const adminId = 'admin-123';

      userService.user.mockResolvedValue({
        id: adminId,
        systemRole: 'admin',
      } as any);

      classService.getEnrollmentsPerUser.mockResolvedValue([]);

      analyticsService.presentDateFilteredInteractions.mockRejectedValue(
        new Error('Analytics service error'),
      );

      const result = await resource.getClassAnalytics(
        { uri: validUri },
        mockContext as any,
        createMockHttpRequest(adminId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Analytics service error');
    });
  });

  describe('getTopTokenUsers', () => {
    const uri = 'kiwi://analytics/top-token-users';

    it('should deny access when user is not authenticated', async () => {
      const result = await resource.getTopTokenUsers(
        { uri },
        mockContext as any,
        createMockHttpRequest() as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('User not authenticated');
    });

    it('should deny student access to top token users', async () => {
      const studentId = 'student-123';

      userService.user.mockResolvedValue({
        id: studentId,
        systemRole: 'student',
      } as any);

      const result = await resource.getTopTokenUsers(
        { uri },
        mockContext as any,
        createMockHttpRequest(studentId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toContain('Access denied');
      expect(content.error).toContain('admins');
    });

    it('should deny instructor access to top token users', async () => {
      const instructorId = 'instructor-123';

      userService.user.mockResolvedValue({
        id: instructorId,
        systemRole: 'instructor',
      } as any);

      const result = await resource.getTopTokenUsers(
        { uri },
        mockContext as any,
        createMockHttpRequest(instructorId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toContain('Access denied');
      expect(analyticsService.topTokenUsers).not.toHaveBeenCalled();
    });

    it('should allow admin to access top token users', async () => {
      const adminId = 'admin-123';

      userService.user.mockResolvedValue({
        id: adminId,
        systemRole: 'admin',
      } as any);

      analyticsService.topTokenUsers.mockResolvedValue([
        { userId: 'user-1', tokens: 10000 },
      ] as any);

      const result = await resource.getTopTokenUsers(
        { uri },
        mockContext as any,
        createMockHttpRequest(adminId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.topUsers).toHaveLength(1);
      expect(content.count).toBe(1);
      expect(content.error).toBeUndefined();
    });

    it('should handle service errors gracefully', async () => {
      const adminId = 'admin-123';

      userService.user.mockResolvedValue({
        id: adminId,
        systemRole: 'admin',
      } as any);

      analyticsService.topTokenUsers.mockRejectedValue(
        new Error('Failed to fetch token data'),
      );

      const result = await resource.getTopTokenUsers(
        { uri },
        mockContext as any,
        createMockHttpRequest(adminId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Failed to fetch token data');
    });
  });
});
