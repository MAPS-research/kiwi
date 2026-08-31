import { Test, TestingModule } from '@nestjs/testing';
import { KiwiAppService } from './kiwi-app.service';
import { DatabaseService } from 'src/common/database/database.service';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-secret'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('KiwiAppService', () => {
  let service: KiwiAppService;
  let db: any;
  let jwtService: jest.Mocked<JwtService>;

  const mockWhitelistEntry = {
    id: 'whitelist-1',
    slug: 'codegen',
    baseUrl: 'http://localhost:8000',
    registrationSecret: 'hashed-secret',
    status: 'approved',
    description: 'Code exercises app',
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedBy: 'admin-1',
  };

  const mockApp = {
    id: 'app-1',
    slug: 'codegen',
    name: 'Code Exercises',
    description: 'Interactive code exercises',
    baseUrl: 'http://localhost:8000',
    iconUrl: null,
    category: 'plugin',
    version: '1.0.0',
    isActive: true,
    config: {},
    capabilities: ['code-execution', 'grading'],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSeenAt: new Date(),
    uis: [
      {
        id: 'ui-1',
        uiSlug: 'main',
        uiName: 'Main UI',
        uiUrl: 'http://localhost:8000',
        placement: 'tab',
        allowedRoles: ['student', 'ta', 'professor'],
      },
    ],
  };

  const mockClassApp = {
    id: 'class-app-1',
    classId: 'class-1',
    appId: 'app-1',
    tabOrder: 0,
    tabLabel: 'Code',
    isEnabled: true,
    config: { timeout: 30 },
    createdAt: new Date(),
    updatedAt: new Date(),
    enabledBy: 'user-1',
    app: mockApp,
  };

  beforeEach(async () => {
    db = {
      kiwiAppWhitelist: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      kiwiApp: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      classKiwiApp: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      instructorClass: {
        findUnique: jest.fn(),
      },
      enrollment: {
        findUnique: jest.fn(),
      },
      kiwiAppPrompt: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      kiwiAppAuditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KiwiAppService,
        {
          provide: DatabaseService,
          useValue: db,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('test-token'),
          },
        },
      ],
    }).compile();

    service = module.get<KiwiAppService>(KiwiAppService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // WHITELIST MANAGEMENT
  // ==========================================================================

  describe('listWhitelist', () => {
    it('should return all whitelist entries without secrets', async () => {
      const entries = [mockWhitelistEntry];
      db.kiwiAppWhitelist.findMany.mockResolvedValue(entries);

      const result = await service.listWhitelist();

      expect(result).toEqual(entries);
      expect(db.kiwiAppWhitelist.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          slug: true,
          baseUrl: true,
          status: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          approvedBy: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createWhitelistEntry', () => {
    const createDto = {
      slug: 'new-app',
      registrationSecret: 'a-very-long-secret-that-is-at-least-32-chars',
      baseUrl: 'http://localhost:9000',
      status: 'approved',
      description: 'New app',
    };

    it('should create a new whitelist entry with hashed secret', async () => {
      db.kiwiAppWhitelist.findUnique.mockResolvedValue(null);
      db.kiwiAppWhitelist.create.mockResolvedValue({
        ...mockWhitelistEntry,
        slug: 'new-app',
      });

      const result = await service.createWhitelistEntry(createDto, 'admin-1');

      expect(bcrypt.hash).toHaveBeenCalledWith(createDto.registrationSecret, 10);
      expect(db.kiwiAppWhitelist.create).toHaveBeenCalledWith({
        data: {
          slug: 'new-app',
          registrationSecret: 'hashed-secret',
          baseUrl: 'http://localhost:9000',
          status: 'approved',
          description: 'New app',
          approvedBy: 'admin-1',
        },
        select: expect.any(Object),
      });
      expect(result.slug).toBe('new-app');
    });

    it('should throw ConflictException if slug already exists', async () => {
      db.kiwiAppWhitelist.findUnique.mockResolvedValue(mockWhitelistEntry);

      await expect(service.createWhitelistEntry(createDto, 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should not set approvedBy if status is not approved', async () => {
      db.kiwiAppWhitelist.findUnique.mockResolvedValue(null);
      db.kiwiAppWhitelist.create.mockResolvedValue(mockWhitelistEntry);

      await service.createWhitelistEntry(
        { ...createDto, status: 'pending' },
        'admin-1',
      );

      expect(db.kiwiAppWhitelist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ approvedBy: null }),
        }),
      );
    });
  });

  describe('updateWhitelistEntry', () => {
    const updateDto = {
      status: 'approved',
      description: 'Updated description',
    };

    it('should update an existing whitelist entry', async () => {
      db.kiwiAppWhitelist.findUnique.mockResolvedValue(mockWhitelistEntry);
      db.kiwiAppWhitelist.update.mockResolvedValue({
        ...mockWhitelistEntry,
        ...updateDto,
      });

      const result = await service.updateWhitelistEntry('codegen', updateDto, 'admin-1');

      expect(result.description).toBe('Updated description');
    });

    it('should throw NotFoundException if entry does not exist', async () => {
      db.kiwiAppWhitelist.findUnique.mockResolvedValue(null);

      await expect(
        service.updateWhitelistEntry('nonexistent', updateDto, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should hash new secret if provided', async () => {
      const updateWithSecret = {
        registrationSecret: 'new-very-long-secret-that-is-at-least-32-chars',
      };
      db.kiwiAppWhitelist.findUnique.mockResolvedValue(mockWhitelistEntry);
      db.kiwiAppWhitelist.update.mockResolvedValue(mockWhitelistEntry);

      await service.updateWhitelistEntry('codegen', updateWithSecret, 'admin-1');

      expect(bcrypt.hash).toHaveBeenCalledWith(updateWithSecret.registrationSecret, 10);
    });
  });

  describe('deleteWhitelistEntry', () => {
    it('should delete an existing whitelist entry', async () => {
      db.kiwiAppWhitelist.findUnique.mockResolvedValue(mockWhitelistEntry);
      db.kiwiAppWhitelist.delete.mockResolvedValue(mockWhitelistEntry);

      const result = await service.deleteWhitelistEntry('codegen');

      expect(db.kiwiAppWhitelist.delete).toHaveBeenCalledWith({
        where: { slug: 'codegen' },
      });
      expect(result).toEqual(mockWhitelistEntry);
    });

    it('should throw NotFoundException if entry does not exist', async () => {
      db.kiwiAppWhitelist.findUnique.mockResolvedValue(null);

      await expect(service.deleteWhitelistEntry('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // APP REGISTRY
  // ==========================================================================

  describe('listApps', () => {
    it('should return all active apps by default', async () => {
      db.kiwiApp.findMany.mockResolvedValue([mockApp]);

      const result = await service.listApps();

      expect(db.kiwiApp.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: { uis: true },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
    });

    it('should include inactive apps when requested', async () => {
      db.kiwiApp.findMany.mockResolvedValue([mockApp]);

      await service.listApps(true);

      expect(db.kiwiApp.findMany).toHaveBeenCalledWith({
        where: {},
        include: { uis: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getApp', () => {
    it('should return app by slug', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);

      const result = await service.getApp('codegen');

      expect(result).toEqual(mockApp);
    });

    it('should throw NotFoundException if app not found', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(null);

      await expect(service.getApp('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('registerApp', () => {
    const registerDto = {
      slug: 'codegen',
      registrationSecret: 'the-secret-from-whitelist',
      name: 'Code Exercises',
      description: 'Interactive code exercises',
      baseUrl: 'http://localhost:8000',
      capabilities: ['code-execution'],
    };

    it('should register a new app when whitelisted and approved', async () => {
      db.kiwiAppWhitelist.findUnique.mockResolvedValue(mockWhitelistEntry);
      db.kiwiApp.findUnique.mockResolvedValue(null);
      db.kiwiApp.create.mockResolvedValue(mockApp);

      const result = await service.registerApp(registerDto);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        registerDto.registrationSecret,
        mockWhitelistEntry.registrationSecret,
      );
      expect(db.kiwiApp.create).toHaveBeenCalled();
      expect(result).toEqual(mockApp);
    });

    it('should throw ForbiddenException if not in whitelist', async () => {
      db.kiwiAppWhitelist.findUnique.mockResolvedValue(null);

      await expect(service.registerApp(registerDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if whitelist status is not approved', async () => {
      db.kiwiAppWhitelist.findUnique.mockResolvedValue({
        ...mockWhitelistEntry,
        status: 'pending',
      });

      await expect(service.registerApp(registerDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException if secret is invalid', async () => {
      db.kiwiAppWhitelist.findUnique.mockResolvedValue(mockWhitelistEntry);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.registerApp(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should update existing app on re-registration', async () => {
      db.kiwiAppWhitelist.findUnique.mockResolvedValue(mockWhitelistEntry);
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.kiwiApp.update.mockResolvedValue({
        ...mockApp,
        lastSeenAt: new Date(),
      });

      const result = await service.registerApp(registerDto);

      expect(db.kiwiApp.update).toHaveBeenCalled();
      expect(db.kiwiApp.create).not.toHaveBeenCalled();
      expect(result!.lastSeenAt).toBeDefined();
    });
  });

  describe('updateApp', () => {
    const updateDto = { name: 'Updated Name' };

    it('should update an existing app', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.kiwiApp.update.mockResolvedValue({
        ...mockApp,
        name: 'Updated Name',
      });

      const result = await service.updateApp('codegen', updateDto);

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if app not found', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(null);

      await expect(service.updateApp('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteApp', () => {
    it('should delete an existing app', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.kiwiApp.delete.mockResolvedValue(mockApp);

      await service.deleteApp('codegen');

      expect(db.kiwiApp.delete).toHaveBeenCalledWith({
        where: { slug: 'codegen' },
      });
    });

    it('should throw NotFoundException if app not found', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(null);

      await expect(service.deleteApp('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('heartbeat', () => {
    it('should update lastSeenAt for existing app', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.kiwiApp.update.mockResolvedValue({
        ...mockApp,
        lastSeenAt: new Date(),
      });

      const result = await service.heartbeat('codegen');

      expect(db.kiwiApp.update).toHaveBeenCalledWith({
        where: { slug: 'codegen' },
        data: { lastSeenAt: expect.any(Date) },
      });
      expect(result.lastSeenAt).toBeDefined();
    });

    it('should throw NotFoundException if app not found', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(null);

      await expect(service.heartbeat('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // CLASS-APP MANAGEMENT
  // ==========================================================================

  describe('resolveChatApp', () => {
    // The chat prompt asks this before it lets an `app` block influence the
    // tutoring mode. `appSlug` comes from the student's request body, so a
    // "yes" here has to mean the class really installed that app.
    const enabledClassApp = {
      id: 'class-app-1',
      classId: 'class-1',
      appId: 'app-1',
      isEnabled: true,
      config: {},
      app: { ...mockApp, config: {} },
    };

    it('scopes the lookup to the class, the app slug, and both enabled flags', async () => {
      db.classKiwiApp.findFirst.mockResolvedValue(enabledClassApp);

      await service.resolveChatApp('class-1', 'codegen');

      expect(db.classKiwiApp.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            classId: 'class-1',
            isEnabled: true,
            app: { slug: 'codegen', isActive: true },
          },
        }),
      );
    });

    it('returns null for a slug the class has not installed', async () => {
      db.classKiwiApp.findFirst.mockResolvedValue(null);

      await expect(service.resolveChatApp('class-1', 'ghost')).resolves.toBeNull();
    });

    it('returns null without a class, rather than trusting a bare slug', async () => {
      // A classless turn has no installation to check against, so there is
      // nothing that could authorise a mode.
      await expect(service.resolveChatApp(undefined, 'codegen')).resolves.toBeNull();
      expect(db.classKiwiApp.findFirst).not.toHaveBeenCalled();
    });

    it('reads tutoringMode from the app default', async () => {
      db.classKiwiApp.findFirst.mockResolvedValue({
        ...enabledClassApp,
        app: { ...mockApp, config: { tutoringMode: 'guidance' } },
      });

      await expect(service.resolveChatApp('class-1', 'codegen')).resolves.toEqual({
        appSlug: 'codegen',
        tutoringMode: 'guidance',
      });
    });

    it('lets the class config override the app default', async () => {
      // Same precedence as getClassApps: the professor's setting wins.
      db.classKiwiApp.findFirst.mockResolvedValue({
        ...enabledClassApp,
        config: { tutoringMode: 'app' },
        app: { ...mockApp, config: { tutoringMode: 'guidance' } },
      });

      const resolved = await service.resolveChatApp('class-1', 'codegen');

      expect(resolved?.tutoringMode).toBe('app');
    });

    it('reports no mode when the registration declares none', async () => {
      db.classKiwiApp.findFirst.mockResolvedValue(enabledClassApp);

      const resolved = await service.resolveChatApp('class-1', 'codegen');

      expect(resolved).toEqual({ appSlug: 'codegen', tutoringMode: undefined });
    });
  });

  describe('getClassApps', () => {
    it('should return enabled apps for a class with merged config', async () => {
      db.classKiwiApp.findMany.mockResolvedValue([mockClassApp]);

      const result = await service.getClassApps('class-1');

      expect(db.classKiwiApp.findMany).toHaveBeenCalledWith({
        where: { classId: 'class-1', isEnabled: true },
        include: { app: { include: { uis: { orderBy: { tabOrder: 'asc' } } } } },
        orderBy: { tabOrder: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('codegen');
      expect(result[0].mergedConfig).toEqual({ timeout: 30 });
    });
  });

  describe('enableClassApp', () => {
    const enableDto = {
      appId: 'app-1',
      tabOrder: 1,
      tabLabel: 'Exercises',
      config: { timeout: 60 },
    };

    it('should enable an app for a class', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.classKiwiApp.findUnique.mockResolvedValue(null);
      db.classKiwiApp.aggregate.mockResolvedValue({ _max: { tabOrder: 0 } });
      db.classKiwiApp.create.mockResolvedValue(mockClassApp);

      const result = await service.enableClassApp('class-1', enableDto, 'user-1');

      expect(db.classKiwiApp.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if app does not exist', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(null);

      await expect(service.enableClassApp('class-1', enableDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if app is not active', async () => {
      db.kiwiApp.findUnique.mockResolvedValue({ ...mockApp, isActive: false });

      await expect(service.enableClassApp('class-1', enableDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should re-enable a disabled app', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.classKiwiApp.findUnique.mockResolvedValue({
        ...mockClassApp,
        isEnabled: false,
      });
      db.classKiwiApp.update.mockResolvedValue(mockClassApp);

      await service.enableClassApp('class-1', enableDto, 'user-1');

      expect(db.classKiwiApp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isEnabled: true }),
        }),
      );
    });
  });

  describe('updateClassApp', () => {
    const updateDto = { tabLabel: 'New Label' };

    it('should update class app configuration', async () => {
      db.classKiwiApp.findUnique.mockResolvedValue(mockClassApp);
      db.classKiwiApp.update.mockResolvedValue({
        ...mockClassApp,
        tabLabel: 'New Label',
      });

      const result = await service.updateClassApp('class-1', 'app-1', updateDto);

      expect(result.tabLabel).toBe('New Label');
    });

    it('should throw NotFoundException if class app not found', async () => {
      db.classKiwiApp.findUnique.mockResolvedValue(null);

      await expect(
        service.updateClassApp('class-1', 'app-1', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('disableClassApp', () => {
    it('should disable a class app (soft delete)', async () => {
      db.classKiwiApp.findUnique.mockResolvedValue(mockClassApp);
      db.classKiwiApp.update.mockResolvedValue({
        ...mockClassApp,
        isEnabled: false,
      });

      const result = await service.disableClassApp('class-1', 'app-1');

      expect(db.classKiwiApp.update).toHaveBeenCalledWith({
        where: { classId_appId: { classId: 'class-1', appId: 'app-1' } },
        data: { isEnabled: false },
      });
      expect(result.isEnabled).toBe(false);
    });

    it('should throw NotFoundException if class app not found', async () => {
      db.classKiwiApp.findUnique.mockResolvedValue(null);

      await expect(service.disableClassApp('class-1', 'app-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reorderClassApps', () => {
    const reorderDto = {
      order: [
        { appId: 'app-1', tabOrder: 1 },
        { appId: 'app-2', tabOrder: 0 },
      ],
    };

    it('should reorder class apps', async () => {
      db.$transaction.mockResolvedValue([{ count: 1 }, { count: 1 }]);
      db.classKiwiApp.findMany.mockResolvedValue([mockClassApp]);

      const result = await service.reorderClassApps('class-1', reorderDto);

      expect(db.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // PERMISSION CHECK
  // ==========================================================================

  describe('getUserClassRole', () => {
    it('should return admin role for system admin', async () => {
      db.user.findUnique.mockResolvedValue({ systemRole: 'admin' });

      const result = await service.getUserClassRole('user-1', 'class-1');

      expect(result).toEqual({
        userId: 'user-1',
        classId: 'class-1',
        role: 'admin',
      });
    });

    it('should return professor role for active instructor', async () => {
      db.user.findUnique.mockResolvedValue({ systemRole: 'user' });
      db.instructorClass.findUnique.mockResolvedValue({
        role: 'instructor',
        isActive: true,
      });

      const result = await service.getUserClassRole('user-1', 'class-1');

      expect(result.role).toBe('professor');
    });

    it('should return ta role for assistant instructor', async () => {
      db.user.findUnique.mockResolvedValue({ systemRole: 'user' });
      db.instructorClass.findUnique.mockResolvedValue({
        role: 'assistant',
        isActive: true,
      });

      const result = await service.getUserClassRole('user-1', 'class-1');

      expect(result.role).toBe('ta');
    });

    it('should return student role for enrolled student', async () => {
      db.user.findUnique.mockResolvedValue({ systemRole: 'user' });
      db.instructorClass.findUnique.mockResolvedValue(null);
      db.enrollment.findUnique.mockResolvedValue({ role: 'student' });

      const result = await service.getUserClassRole('user-1', 'class-1');

      expect(result.role).toBe('student');
    });

    it('should return null role for non-enrolled user', async () => {
      db.user.findUnique.mockResolvedValue({ systemRole: 'user' });
      db.instructorClass.findUnique.mockResolvedValue(null);
      db.enrollment.findUnique.mockResolvedValue(null);

      const result = await service.getUserClassRole('user-1', 'class-1');

      expect(result.role).toBeNull();
    });

    it('should skip inactive instructor assignments', async () => {
      db.user.findUnique.mockResolvedValue({ systemRole: 'user' });
      db.instructorClass.findUnique.mockResolvedValue({
        role: 'instructor',
        isActive: false,
      });
      db.enrollment.findUnique.mockResolvedValue({ role: 'student' });

      const result = await service.getUserClassRole('user-1', 'class-1');

      expect(result.role).toBe('student');
    });
  });

  // ==========================================================================
  // PROMPT MANAGEMENT
  // ==========================================================================

  describe('getAppPrompts', () => {
    const mockPrompts = [
      {
        id: 'prompt-1',
        appId: 'app-1',
        promptId: 'hint',
        name: 'Hint Generator',
        description: 'Generates hints for students',
        systemPrompt: 'You are a helpful assistant...',
        maxTokens: 1000,
        temperature: 0.7,
        isActive: true,
        approvedBy: 'admin-1',
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'prompt-2',
        appId: 'app-1',
        promptId: 'explain',
        name: 'Error Explainer',
        description: 'Explains errors to students',
        systemPrompt: 'You explain errors...',
        maxTokens: 500,
        temperature: 0.5,
        isActive: false,
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return only active prompts by default', async () => {
      db.kiwiApp.findUnique.mockResolvedValue({
        ...mockApp,
        prompts: [mockPrompts[0]],
      });

      const result = await service.getAppPrompts('codegen');

      expect(db.kiwiApp.findUnique).toHaveBeenCalledWith({
        where: { slug: 'codegen' },
        include: {
          prompts: {
            where: { isActive: true },
            orderBy: { promptId: 'asc' },
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('should return all prompts when includeInactive=true', async () => {
      db.kiwiApp.findUnique.mockResolvedValue({
        ...mockApp,
        prompts: mockPrompts,
      });

      const result = await service.getAppPrompts('codegen', true);

      expect(db.kiwiApp.findUnique).toHaveBeenCalledWith({
        where: { slug: 'codegen' },
        include: {
          prompts: {
            where: {},
            orderBy: { promptId: 'asc' },
          },
        },
      });
      expect(result).toHaveLength(2);
    });

    it('should throw NotFoundException when app not found', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(null);

      await expect(service.getAppPrompts('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty array when no prompts', async () => {
      db.kiwiApp.findUnique.mockResolvedValue({
        ...mockApp,
        prompts: [],
      });

      const result = await service.getAppPrompts('codegen');

      expect(result).toEqual([]);
    });
  });

  describe('approvePrompt', () => {
    const mockPrompt = {
      id: 'prompt-1',
      appId: 'app-1',
      promptId: 'hint',
      name: 'Hint Generator',
      systemPrompt: 'You are helpful...',
      isActive: false,
      approvedBy: null,
      approvedAt: null,
    };

    it('should set isActive=true and record approvedBy/approvedAt', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.kiwiAppPrompt.findUnique.mockResolvedValue(mockPrompt);
      db.kiwiAppPrompt.update.mockResolvedValue({
        ...mockPrompt,
        isActive: true,
        approvedBy: 'admin-1',
        approvedAt: expect.any(Date),
      });

      const result = await service.approvePrompt('codegen', 'hint', 'admin-1');

      expect(db.kiwiAppPrompt.update).toHaveBeenCalledWith({
        where: { appId_promptId: { appId: 'app-1', promptId: 'hint' } },
        data: {
          isActive: true,
          approvedBy: 'admin-1',
          approvedAt: expect.any(Date),
        },
      });
      expect(result.isActive).toBe(true);
      expect(result.approvedBy).toBe('admin-1');
    });

    it('should throw NotFoundException when app not found', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(null);

      await expect(
        service.approvePrompt('nonexistent', 'hint', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when prompt not found', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.kiwiAppPrompt.findUnique.mockResolvedValue(null);

      await expect(
        service.approvePrompt('codegen', 'nonexistent', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokePrompt', () => {
    const mockPrompt = {
      id: 'prompt-1',
      appId: 'app-1',
      promptId: 'hint',
      name: 'Hint Generator',
      isActive: true,
      approvedBy: 'admin-1',
    };

    it('should set isActive=false', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.kiwiAppPrompt.findUnique.mockResolvedValue(mockPrompt);
      db.kiwiAppPrompt.update.mockResolvedValue({
        ...mockPrompt,
        isActive: false,
      });

      const result = await service.revokePrompt('codegen', 'hint');

      expect(db.kiwiAppPrompt.update).toHaveBeenCalledWith({
        where: { appId_promptId: { appId: 'app-1', promptId: 'hint' } },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when app not found', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(null);

      await expect(service.revokePrompt('nonexistent', 'hint')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when prompt not found', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.kiwiAppPrompt.findUnique.mockResolvedValue(null);

      await expect(service.revokePrompt('codegen', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getActivePrompt', () => {
    const mockPrompt = {
      id: 'prompt-1',
      appId: 'app-1',
      promptId: 'hint',
      name: 'Hint Generator',
      systemPrompt: 'You are a helpful assistant...',
      isActive: true,
      approvedBy: 'admin-1',
    };

    it('should return prompt when active', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.kiwiAppPrompt.findUnique.mockResolvedValue(mockPrompt);

      const result = await service.getActivePrompt('codegen', 'hint');

      expect(result).toEqual(mockPrompt);
      expect(result.systemPrompt).toBe('You are a helpful assistant...');
    });

    it('should throw NotFoundException when app not found', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(null);

      await expect(
        service.getActivePrompt('nonexistent', 'hint'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when prompt not found', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.kiwiAppPrompt.findUnique.mockResolvedValue(null);

      await expect(
        service.getActivePrompt('codegen', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when prompt not active', async () => {
      db.kiwiApp.findUnique.mockResolvedValue(mockApp);
      db.kiwiAppPrompt.findUnique.mockResolvedValue({
        ...mockPrompt,
        isActive: false,
      });

      await expect(
        service.getActivePrompt('codegen', 'hint'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
