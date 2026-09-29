import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from 'src/common/database/user.service';
import { ClassService } from 'src/class/class.service';
import { WhitelistService } from './whitelist/whitelist.service';
import { JwtService } from '@nestjs/jwt';
import { UserSessionService } from 'src/common/database/user-session.service';
import { PendingEnrollmentService } from 'src/common/database/pending-enrollment.service';
import { RedisService } from 'src/common/redis/redis.service';
import { PendingAdminService } from 'src/common/database/pending-admin.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userService: any;
  let classService: any;
  let whitelistService: any;
  let pendingAdminService: any;
  let userSessionService: any;
  let pendingEnrollmentService: any;

  beforeEach(async () => {
    userService = {
      createUser: jest.fn(),
      updateUser: jest.fn(),
      user: jest.fn(),
    };
    classService = {
      enroll: jest.fn(),
      checkPendingProfessor: jest.fn(),
      assignProfessor: jest.fn(),
    };
    whitelistService = {
      create: jest.fn(),
    };
    pendingAdminService = {
      pendingAdmin: jest.fn(),
      updatePendingAdmin: jest.fn(),
    };
    userSessionService = {
      createUserSession: jest.fn(),
    };
    pendingEnrollmentService = {
      pendingEnrollments: jest.fn().mockResolvedValue([]),
      updatePendingEnrollment: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
        { provide: UserService, useValue: userService },
        { provide: UserSessionService, useValue: userSessionService },
        {
          provide: PendingEnrollmentService,
          useValue: pendingEnrollmentService,
        },
        { provide: ClassService, useValue: classService },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: RedisService, useValue: { set: jest.fn() } },
        { provide: WhitelistService, useValue: whitelistService },
        { provide: PendingAdminService, useValue: pendingAdminService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('stores salt and hashed password for a new user', async () => {
    userService.user.mockResolvedValue(null); // Simulate new user
    userService.createUser.mockResolvedValue({ id: '1', email: 'a@b.c' });
    await service.registerUser('a@b.c', 'secret', 'class1');
    expect(userService.createUser).toHaveBeenCalled();
    const args = userService.createUser.mock.calls[0][0];
    expect(args.passwordSalt).toBeDefined();
    expect(args.passwordHash).toBeDefined();
    const hash = await bcrypt.hash('secret', args.passwordSalt);
    expect(hash).toBe(args.passwordHash);
    expect(classService.enroll).toHaveBeenCalledWith('class1', ['a@b.c']);
    expect(whitelistService.create).toHaveBeenCalledWith({ email: 'a@b.c' });
  });

  it('enrolls a new password account in classes it was added to beforehand', async () => {
    userService.user.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({ id: '1', email: 'a@b.c' });
    pendingEnrollmentService.pendingEnrollments.mockResolvedValue([
      { id: 'pe-1', classId: 'class2' },
    ]);

    await service.registerUser('a@b.c', 'secret', 'class1');

    expect(pendingEnrollmentService.pendingEnrollments).toHaveBeenCalledWith({
      where: { userEmail: 'a@b.c', status: 'not enrolled' },
    });
    expect(classService.enroll).toHaveBeenCalledWith('class2', ['a@b.c']);
    expect(
      pendingEnrollmentService.updatePendingEnrollment,
    ).toHaveBeenCalledWith({
      where: { id: 'pe-1' },
      data: { status: 'enrolled' },
    });
  });

  it('stores salt and hashed password', async () => {
    userService.createUser.mockResolvedValue({ id: '1', email: 'a@b.c' });
    await service.registerUser('a@b.c', 'secret', 'class1');
    const args = userService.createUser.mock.calls[0][0];
    expect(args.passwordSalt).toBeDefined();
    expect(args.passwordHash).toBeDefined();
    const hash = await bcrypt.hash('secret', args.passwordSalt);
    expect(hash).toBe(args.passwordHash);
  });

  it('updates existing user with new password', async () => {
    userService.user.mockResolvedValue({ id: '1', email: 'a@b.c' });
    await expect(
      service.registerUser('a@b.c', 'secret', 'class1'),
    ).rejects.toThrow();
  });

  it('rejects if user already exists', async () => {
    userService.user.mockResolvedValue({ id: '1', email: 'a@b.c' });
    await expect(
      service.registerUser('a@b.c', 'new_secret', 'class2'),
    ).rejects.toThrow('User already exists');
  });

  it('registerUser proceeds even if class enrollment fails', async () => {
    userService.user.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({ id: '1', email: 'a@b.c' });
    classService.enroll.mockRejectedValue(new Error('Enrollment failed'));
    await service.registerUser('a@b.c', 'secret', 'class1');
    expect(userService.createUser).toHaveBeenCalled();
    expect(whitelistService.create).toHaveBeenCalled(); // Should still be called
  });

  it('registerUser proceeds even if whitelist creation fails', async () => {
    userService.user.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({ id: '1', email: 'a@b.c' });
    whitelistService.create.mockRejectedValue(new Error('Whitelist failed'));
    await service.registerUser('a@b.c', 'secret', 'class1');
    expect(userService.createUser).toHaveBeenCalled();
    expect(classService.enroll).toHaveBeenCalled(); // Should still be called
  });

  it('resetPassword updates existing user', async () => {
    userService.user.mockResolvedValue({ id: '1', email: 'a@b.c' });
    userService.updateUser.mockResolvedValue({ id: '1', email: 'a@b.c' });
    await service.resetPassword('a@b.c', 'secret');
    expect(userService.updateUser).toHaveBeenCalled();
    const args = userService.updateUser.mock.calls[0][0].data;
    const hash = await bcrypt.hash('secret', args.passwordSalt);
    expect(hash).toBe(args.passwordHash);
  });

  it('resetPassword throws error if user not found', async () => {
    userService.user.mockResolvedValue(null); // Simulate user not found
    await expect(service.resetPassword('a@b.c', 'secret')).rejects.toThrow(
      'User not found',
    );
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  describe('Pending Admin', () => {
    it('should grant admin privileges when pending admin logs in', async () => {
      const mockUser = {
        id: 'user1',
        email: 'admin@test.com',
        oauthId: 'oauth1',
        researchNotes: null,
      };
      const mockPendingAdmin = {
        id: 'pending1',
        email: 'admin@test.com',
        status: 'pending',
      };
      const mockSession = {
        userSessionId: null,
        userId: null,
        save: jest.fn(),
      };
      const req = {
        user: { id: 'oauth1', email: 'admin@test.com' },
        session: mockSession,
      };

      userService.user.mockResolvedValue(mockUser);
      classService.checkPendingProfessor.mockResolvedValue(null);
      pendingEnrollmentService.pendingEnrollments.mockResolvedValue([]);
      pendingAdminService.pendingAdmin.mockResolvedValue(mockPendingAdmin);
      userSessionService.createUserSession.mockResolvedValue('session1');
      jest
        .spyOn(service as any, 'createUserSession')
        .mockResolvedValue('session1');
      jest
        .spyOn(service as any, 'generateAccessToken')
        .mockResolvedValue('access_token');
      jest
        .spyOn(service as any, 'generateRefreshToken')
        .mockResolvedValue('refresh_token');

      await service.authenticate(req);

      expect(pendingAdminService.pendingAdmin).toHaveBeenCalledWith({
        email: 'admin@test.com',
        status: 'pending',
      });
      expect(userService.updateUser).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { systemRole: 'admin' },
      });
      expect(pendingAdminService.updatePendingAdmin).toHaveBeenCalledWith({
        where: { id: 'pending1' },
        data: { status: 'activated' },
      });
    });

    it('should not grant admin privileges if no pending admin exists', async () => {
      const mockUser = {
        id: 'user1',
        email: 'user@test.com',
        oauthId: 'oauth1',
        researchNotes: null,
      };
      const mockSession = {
        userSessionId: null,
        userId: null,
        save: jest.fn(),
      };
      const req = {
        user: { id: 'oauth1', email: 'user@test.com' },
        session: mockSession,
      };

      userService.user.mockResolvedValue(mockUser);
      classService.checkPendingProfessor.mockResolvedValue(null);
      pendingEnrollmentService.pendingEnrollments.mockResolvedValue([]);
      pendingAdminService.pendingAdmin.mockResolvedValue(null);
      userSessionService.createUserSession.mockResolvedValue('session1');
      jest
        .spyOn(service as any, 'createUserSession')
        .mockResolvedValue('session1');
      jest
        .spyOn(service as any, 'generateAccessToken')
        .mockResolvedValue('access_token');
      jest
        .spyOn(service as any, 'generateRefreshToken')
        .mockResolvedValue('refresh_token');

      await service.authenticate(req);

      expect(pendingAdminService.pendingAdmin).toHaveBeenCalledWith({
        email: 'user@test.com',
        status: 'pending',
      });
      expect(userService.updateUser).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: { systemRole: 'admin' },
        }),
      );
      expect(pendingAdminService.updatePendingAdmin).not.toHaveBeenCalled();
    });

    it('should not grant admin privileges if pending admin is already activated', async () => {
      const mockUser = {
        id: 'user1',
        email: 'admin@test.com',
        oauthId: 'oauth1',
        researchNotes: null,
      };
      const mockSession = {
        userSessionId: null,
        userId: null,
        save: jest.fn(),
      };
      const req = {
        user: { id: 'oauth1', email: 'admin@test.com' },
        session: mockSession,
      };

      userService.user.mockResolvedValue(mockUser);
      classService.checkPendingProfessor.mockResolvedValue(null);
      pendingEnrollmentService.pendingEnrollments.mockResolvedValue([]);
      pendingAdminService.pendingAdmin.mockResolvedValue(null); // Already activated, so not found with 'pending' status
      userSessionService.createUserSession.mockResolvedValue('session1');
      jest
        .spyOn(service as any, 'createUserSession')
        .mockResolvedValue('session1');
      jest
        .spyOn(service as any, 'generateAccessToken')
        .mockResolvedValue('access_token');
      jest
        .spyOn(service as any, 'generateRefreshToken')
        .mockResolvedValue('refresh_token');

      await service.authenticate(req);

      expect(userService.updateUser).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: { systemRole: 'admin' },
        }),
      );
      expect(pendingAdminService.updatePendingAdmin).not.toHaveBeenCalled();
    });
  });
});
