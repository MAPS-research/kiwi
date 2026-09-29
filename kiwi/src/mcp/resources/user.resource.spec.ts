import { Test, TestingModule } from '@nestjs/testing';
import { UserResource } from './user.resource';
import { UserService } from 'src/common/database/user.service';
import { EnrollmentService } from 'src/common/database/enrollment.service';

describe('UserResource', () => {
  let resource: UserResource;
  let userService: jest.Mocked<UserService>;
  let enrollmentService: jest.Mocked<EnrollmentService>;

  const mockContext = {};

  const createMockHttpRequest = (
    userId?: string,
    appContext?: {
      appSlug: string;
      classId: string;
      scopes: string[];
      userId: string;
    },
  ) => {
    // @rekog/mcp-nest 2 hands resources the Express request itself, which
    // carries `user` and `appContext`.
    const req: any = userId ? { user: { sub: userId } } : {};
    if (appContext) {
      req.appContext = appContext;
    }
    return req;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserResource,
        {
          provide: UserService,
          useValue: {
            user: jest.fn(),
          },
        },
        {
          provide: EnrollmentService,
          useValue: {
            enrollment: jest.fn(),
            enrollments: jest.fn(),
          },
        },
      ],
    }).compile();

    resource = await module.resolve<UserResource>(UserResource);
    userService = module.get(UserService);
    enrollmentService = module.get(EnrollmentService);
  });

  // ==========================================================================
  // getUserProfile Tests
  // ==========================================================================

  describe('getUserProfile', () => {
    const userId = 'user-123';
    const uri = `kiwi://users/${userId}`;

    it('should return user profile with id, email, systemRole', async () => {
      userService.user.mockResolvedValue({
        id: userId,
        email: 'student@example.edu',
        systemRole: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await resource.getUserProfile(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.id).toBe(userId);
      expect(content.email).toBe('student@example.edu');
      expect(content.systemRole).toBe('user');
      // Should not expose sensitive fields
      expect(content.password).toBeUndefined();
    });

    describe('email visibility', () => {
      const target = {
        id: userId,
        email: 'student@example.edu',
        systemRole: 'user',
      } as any;
      const read = async (req: any) =>
        JSON.parse(
          (await resource.getUserProfile({ uri }, mockContext as any, req))
            .contents[0].text,
        );

      it('hides the email from another non-admin user', async () => {
        userService.user.mockImplementation(async ({ id }: any) =>
          id === userId ? target : ({ id, systemRole: 'user' } as any),
        );
        const content = await read(createMockHttpRequest('someone-else'));
        expect(content.id).toBe(userId);
        expect(content.email).toBeUndefined();
      });

      it('shows the email to an admin', async () => {
        userService.user.mockImplementation(async ({ id }: any) =>
          id === userId ? target : ({ id, systemRole: 'admin' } as any),
        );
        const content = await read(createMockHttpRequest('an-admin'));
        expect(content.email).toBe('student@example.edu');
      });

      it('never shows an email to an app token, even for its own user', async () => {
        userService.user.mockResolvedValue(target);
        const content = await read(
          createMockHttpRequest(userId, {
            appSlug: 'demo',
            classId: 'c1',
            scopes: ['user:profile:read'],
            userId,
          }),
        );
        expect(content.id).toBe(userId);
        expect(content.email).toBeUndefined();
      });
    });

    it('should return error for invalid URI format', async () => {
      const invalidUri = 'kiwi://users/';

      const result = await resource.getUserProfile(
        { uri: invalidUri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Invalid URI format');
    });

    it('should return error when user not found', async () => {
      userService.user.mockResolvedValue(null);

      const result = await resource.getUserProfile(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('User not found');
    });

    it('should throw ForbiddenException when missing user:profile:read scope', async () => {
      // Create request with app token but without required scope
      const appContext = {
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['class:info:read'], // Missing user:profile:read
        userId: 'user-1',
      };

      const result = await resource.getUserProfile(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId, appContext) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toContain('Missing required scope');
    });

    it('should skip scope check for non-app token requests', async () => {
      userService.user.mockResolvedValue({
        id: userId,
        email: 'student@example.edu',
        systemRole: 'user',
      } as any);

      // Regular user JWT request (no appContext)
      const result = await resource.getUserProfile(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.id).toBe(userId);
      expect(content.error).toBeUndefined();
    });

    it('should pass scope check when user:profile:read scope present', async () => {
      userService.user.mockResolvedValue({
        id: userId,
        email: 'student@example.edu',
        systemRole: 'user',
      } as any);

      const appContext = {
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['user:profile:read'],
        userId: 'user-1',
      };

      const result = await resource.getUserProfile(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId, appContext) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.id).toBe(userId);
      expect(content.error).toBeUndefined();
    });

    it('should handle service errors gracefully', async () => {
      userService.user.mockRejectedValue(new Error('Database error'));

      const result = await resource.getUserProfile(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Database error');
    });
  });

  // ==========================================================================
  // getUserClassRole Tests
  // ==========================================================================

  describe('getUserClassRole', () => {
    const userId = 'user-123';
    const classId = 'class-456';
    const uri = `kiwi://users/${userId}/role/${classId}`;

    it('should return user role and enrolled status', async () => {
      enrollmentService.enrollment.mockResolvedValue({
        userId,
        classId,
        role: 'student',
      } as any);

      const result = await resource.getUserClassRole(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.userId).toBe(userId);
      expect(content.classId).toBe(classId);
      expect(content.role).toBe('student');
      expect(content.enrolled).toBe(true);
    });

    it('should return null role when not enrolled', async () => {
      enrollmentService.enrollment.mockResolvedValue(null);

      const result = await resource.getUserClassRole(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.userId).toBe(userId);
      expect(content.classId).toBe(classId);
      expect(content.role).toBeNull();
      expect(content.enrolled).toBe(false);
    });

    it('should return error for invalid URI format', async () => {
      const invalidUri = 'kiwi://users/user-123/role/';

      const result = await resource.getUserClassRole(
        { uri: invalidUri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Invalid URI format');
    });

    it('should check class:info:read scope for app tokens', async () => {
      const appContext = {
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['user:profile:read'], // Missing class:info:read
        userId: 'user-1',
      };

      const result = await resource.getUserClassRole(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId, appContext) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toContain('Missing required scope');
    });

    it('should pass scope check with class:info:read scope', async () => {
      enrollmentService.enrollment.mockResolvedValue({
        userId,
        classId,
        role: 'ta',
      } as any);

      const appContext = {
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['class:info:read'],
        userId: 'user-1',
      };

      const result = await resource.getUserClassRole(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId, appContext) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.role).toBe('ta');
      expect(content.error).toBeUndefined();
    });

    it('should handle service errors gracefully', async () => {
      enrollmentService.enrollment.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await resource.getUserClassRole(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Database error');
    });
  });

  // ==========================================================================
  // getUserEnrollments Tests
  // ==========================================================================

  describe('getUserEnrollments', () => {
    const userId = 'user-123';
    const uri = `kiwi://users/${userId}/enrollments`;

    it('should return list of enrollments', async () => {
      enrollmentService.enrollments.mockResolvedValue([
        { classId: 'class-1', role: 'student' },
        { classId: 'class-2', role: 'ta' },
      ] as any);

      const result = await resource.getUserEnrollments(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.userId).toBe(userId);
      expect(content.totalEnrollments).toBe(2);
      expect(content.enrollments).toHaveLength(2);
      expect(content.enrollments[0].classId).toBe('class-1');
      expect(content.enrollments[0].role).toBe('student');
    });

    it('should return empty list when no enrollments', async () => {
      enrollmentService.enrollments.mockResolvedValue([]);

      const result = await resource.getUserEnrollments(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.totalEnrollments).toBe(0);
      expect(content.enrollments).toEqual([]);
    });

    it('should return error for invalid URI format', async () => {
      const invalidUri = 'kiwi://users/invalid';

      const result = await resource.getUserEnrollments(
        { uri: invalidUri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Invalid URI format');
    });

    it('should check class:enrollments:read scope for app tokens', async () => {
      const appContext = {
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['user:profile:read'], // Missing class:enrollments:read
        userId: 'user-1',
      };

      const result = await resource.getUserEnrollments(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId, appContext) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toContain('Missing required scope');
    });

    it('should handle service errors gracefully', async () => {
      enrollmentService.enrollments.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await resource.getUserEnrollments(
        { uri },
        mockContext as any,
        createMockHttpRequest(userId) as any,
      );

      const content = JSON.parse(result.contents[0].text);
      expect(content.error).toBe('Database error');
    });
  });
});
