import { Test, TestingModule } from '@nestjs/testing';
import {
  KiwiAppController,
  ClassKiwiAppController,
  PermissionsController,
} from './kiwi-app.controller';
import { KiwiAppService } from './kiwi-app.service';
import { JwtAuthGuard, AdminGuard } from 'src/auth/auth.guard';
import { Request } from 'express';

// Mock guards
const mockGuard = { canActivate: jest.fn(() => true) };

describe('KiwiAppController', () => {
  let controller: KiwiAppController;
  let service: jest.Mocked<KiwiAppService>;

  const mockWhitelistEntry = {
    id: 'whitelist-1',
    slug: 'codegen',
    baseUrl: 'http://localhost:8000',
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
  };

  const mockRequest = {
    user: { sub: 'user-1' },
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KiwiAppController],
      providers: [
        {
          provide: KiwiAppService,
          useValue: {
            listWhitelist: jest.fn(),
            createWhitelistEntry: jest.fn(),
            updateWhitelistEntry: jest.fn(),
            deleteWhitelistEntry: jest.fn(),
            listApps: jest.fn(),
            getApp: jest.fn(),
            registerApp: jest.fn(),
            updateApp: jest.fn(),
            deleteApp: jest.fn(),
            heartbeat: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue(mockGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<KiwiAppController>(KiwiAppController);
    service = module.get(KiwiAppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==========================================================================
  // WHITELIST MANAGEMENT
  // ==========================================================================

  describe('listWhitelist', () => {
    it('should return all whitelist entries', async () => {
      service.listWhitelist.mockResolvedValue([mockWhitelistEntry] as any);

      const result = await controller.listWhitelist();

      expect(result).toEqual([mockWhitelistEntry]);
      expect(service.listWhitelist).toHaveBeenCalled();
    });
  });

  describe('createWhitelistEntry', () => {
    it('should create a new whitelist entry', async () => {
      const dto = {
        slug: 'new-app',
        registrationSecret: 'secret-at-least-32-characters-long-here',
        baseUrl: 'http://localhost:9000',
      };
      service.createWhitelistEntry.mockResolvedValue(mockWhitelistEntry as any);

      const result = await controller.createWhitelistEntry(dto, mockRequest);

      expect(result).toEqual(mockWhitelistEntry);
      expect(service.createWhitelistEntry).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('updateWhitelistEntry', () => {
    it('should update a whitelist entry', async () => {
      const dto = { status: 'approved' };
      service.updateWhitelistEntry.mockResolvedValue(mockWhitelistEntry as any);

      const result = await controller.updateWhitelistEntry('codegen', dto, mockRequest);

      expect(result).toEqual(mockWhitelistEntry);
      expect(service.updateWhitelistEntry).toHaveBeenCalledWith('codegen', dto, 'user-1');
    });
  });

  describe('deleteWhitelistEntry', () => {
    it('should delete a whitelist entry', async () => {
      service.deleteWhitelistEntry.mockResolvedValue(mockWhitelistEntry as any);

      await controller.deleteWhitelistEntry('codegen');

      expect(service.deleteWhitelistEntry).toHaveBeenCalledWith('codegen');
    });
  });

  // ==========================================================================
  // APP REGISTRY
  // ==========================================================================

  describe('listApps', () => {
    it('should return all active apps by default', async () => {
      service.listApps.mockResolvedValue([mockApp] as any);

      const result = await controller.listApps();

      expect(result).toEqual([mockApp]);
      expect(service.listApps).toHaveBeenCalledWith(false);
    });

    it('should include inactive apps when requested', async () => {
      service.listApps.mockResolvedValue([mockApp] as any);

      await controller.listApps('true');

      expect(service.listApps).toHaveBeenCalledWith(true);
    });
  });

  describe('registerApp', () => {
    it('should register a new app', async () => {
      const dto = {
        slug: 'codegen',
        registrationSecret: 'the-secret',
        name: 'Code Exercises',
        baseUrl: 'http://localhost:8000',
      };
      service.registerApp.mockResolvedValue(mockApp as any);

      const result = await controller.registerApp(dto);

      expect(result).toEqual(mockApp);
      expect(service.registerApp).toHaveBeenCalledWith(dto);
    });
  });

  describe('getApp', () => {
    it('should return app by slug', async () => {
      service.getApp.mockResolvedValue(mockApp as any);

      const result = await controller.getApp('codegen');

      expect(result).toEqual(mockApp);
      expect(service.getApp).toHaveBeenCalledWith('codegen');
    });
  });

  describe('updateApp', () => {
    it('should update an app', async () => {
      const dto = { name: 'Updated Name' };
      service.updateApp.mockResolvedValue({ ...mockApp, name: 'Updated Name' } as any);

      const result = await controller.updateApp('codegen', dto);

      expect(result.name).toBe('Updated Name');
      expect(service.updateApp).toHaveBeenCalledWith('codegen', dto);
    });
  });

  describe('deleteApp', () => {
    it('should delete an app', async () => {
      service.deleteApp.mockResolvedValue(mockApp as any);

      await controller.deleteApp('codegen');

      expect(service.deleteApp).toHaveBeenCalledWith('codegen');
    });
  });

  describe('heartbeat', () => {
    it('should record heartbeat and return status', async () => {
      service.heartbeat.mockResolvedValue(mockApp as any);

      const result = await controller.heartbeat('codegen');

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(service.heartbeat).toHaveBeenCalledWith('codegen');
    });
  });
});

describe('ClassKiwiAppController', () => {
  let controller: ClassKiwiAppController;
  let service: jest.Mocked<KiwiAppService>;

  const mockClassApp = {
    id: 'class-app-1',
    classId: 'class-1',
    appId: 'app-1',
    tabOrder: 0,
    tabLabel: 'Code',
    isEnabled: true,
    config: { timeout: 30 },
    slug: 'codegen',
    name: 'Code Exercises',
    baseUrl: 'http://localhost:8000',
    mergedConfig: { timeout: 30 },
  };

  const mockRequest = {
    user: { sub: 'user-1' },
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassKiwiAppController],
      providers: [
        {
          provide: KiwiAppService,
          useValue: {
            getClassApps: jest.fn(),
            enableClassApp: jest.fn(),
            updateClassApp: jest.fn(),
            disableClassApp: jest.fn(),
            reorderClassApps: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(AdminGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ClassKiwiAppController>(ClassKiwiAppController);
    service = module.get(KiwiAppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getClassApps', () => {
    it('should return enabled apps for a class', async () => {
      service.getClassApps.mockResolvedValue([mockClassApp] as any);

      const result = await controller.getClassApps('class-1');

      expect(result).toEqual([mockClassApp]);
      expect(service.getClassApps).toHaveBeenCalledWith('class-1');
    });
  });

  describe('enableClassApp', () => {
    it('should enable an app for a class', async () => {
      const dto = {
        appId: 'app-1',
        tabOrder: 1,
      };
      service.enableClassApp.mockResolvedValue(mockClassApp as any);

      const result = await controller.enableClassApp('class-1', dto, mockRequest);

      expect(result).toEqual(mockClassApp);
      expect(service.enableClassApp).toHaveBeenCalledWith('class-1', dto, 'user-1');
    });
  });

  describe('updateClassApp', () => {
    it('should update class app configuration', async () => {
      const dto = { tabLabel: 'New Label' };
      service.updateClassApp.mockResolvedValue({ ...mockClassApp, tabLabel: 'New Label' } as any);

      const result = await controller.updateClassApp('class-1', 'app-1', dto);

      expect(result.tabLabel).toBe('New Label');
      expect(service.updateClassApp).toHaveBeenCalledWith('class-1', 'app-1', dto);
    });
  });

  describe('disableClassApp', () => {
    it('should disable an app for a class', async () => {
      service.disableClassApp.mockResolvedValue({ ...mockClassApp, isEnabled: false } as any);

      await controller.disableClassApp('class-1', 'app-1');

      expect(service.disableClassApp).toHaveBeenCalledWith('class-1', 'app-1');
    });
  });

  describe('reorderClassApps', () => {
    it('should reorder class apps', async () => {
      const dto = {
        order: [
          { appId: 'app-1', tabOrder: 1 },
          { appId: 'app-2', tabOrder: 0 },
        ],
      };
      service.reorderClassApps.mockResolvedValue([mockClassApp] as any);

      const result = await controller.reorderClassApps('class-1', dto);

      expect(result).toEqual([mockClassApp]);
      expect(service.reorderClassApps).toHaveBeenCalledWith('class-1', dto);
    });
  });
});

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let service: jest.Mocked<KiwiAppService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        {
          provide: KiwiAppService,
          useValue: {
            getUserClassRole: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
    service = module.get(KiwiAppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserClassRole', () => {
    it('should return user role in class', async () => {
      const roleResponse = {
        userId: 'user-1',
        classId: 'class-1',
        role: 'student',
      };
      service.getUserClassRole.mockResolvedValue(roleResponse as any);

      const result = await controller.getUserClassRole('user-1', 'class-1');

      expect(result).toEqual(roleResponse);
      expect(service.getUserClassRole).toHaveBeenCalledWith('user-1', 'class-1');
    });

    it('should return null role for non-enrolled user', async () => {
      const roleResponse = {
        userId: 'user-1',
        classId: 'class-1',
        role: null,
      };
      service.getUserClassRole.mockResolvedValue(roleResponse as any);

      const result = await controller.getUserClassRole('user-1', 'class-1');

      expect(result.role).toBeNull();
    });
  });
});
