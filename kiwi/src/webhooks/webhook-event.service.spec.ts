import { Test, TestingModule } from '@nestjs/testing';
import { WebhookEventService } from './webhook-event.service';
import { DatabaseService } from '../common/database/database.service';
import { WebhookEventService as DatabaseWebhookEventService } from '../common/database/webhook-event.service';
import { WebhookEventAuditService } from '../common/database/webhook-event-audit.service';
import { UserService } from '../common/database/user.service';
import { UserWhitelistService } from '../common/database/user-whistelist.service';
import { EnrollmentService } from '../common/database/enrollment.service';
import { ClassService } from '../common/database/class.service';
import { PendingEnrollmentService } from '../common/database/pending-enrollment.service';
import { InstructorClassService } from '../instructor-class/instructor-class.service';

describe('WebhookEventService', () => {
  let service: WebhookEventService;
  let databaseService: any;
  let webhookEvents: any;
  let audits: any;
  let userService: any;
  let whitelist: any;
  let enrollmentService: any;
  let classService: any;
  let pendingEnrollmentService: any;

  const email = 'new@example.com';
  const classId = 'class-1';
  const enrollEvent = (status = 'pending') => ({
    id: 'event-1',
    eventType: 'user.enroll',
    status,
    payload: { email, classId },
  });

  beforeEach(async () => {
    databaseService = { user: { findMany: jest.fn() } };
    webhookEvents = {
      findUnique: jest.fn().mockResolvedValue(enrollEvent()),
      findMany: jest.fn(),
      update: jest.fn(),
    };
    audits = { create: jest.fn() };
    userService = { user: jest.fn(), createUser: jest.fn() };
    whitelist = {
      userWhitelist: jest.fn().mockResolvedValue({ email, status: 'enabled' }),
      createUserWhitelist: jest.fn(),
      updateUserWhitelist: jest.fn(),
    };
    enrollmentService = {
      enrollment: jest.fn(),
      createEnrollment: jest.fn(),
    };
    classService = { class: jest.fn().mockResolvedValue({ id: classId }) };
    pendingEnrollmentService = {
      pendingEnrollments: jest.fn().mockResolvedValue([]),
      createPendingEnrollment: jest
        .fn()
        .mockImplementation(async (data) => ({ id: 'pending-1', ...data })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookEventService,
        { provide: DatabaseService, useValue: databaseService },
        { provide: DatabaseWebhookEventService, useValue: webhookEvents },
        { provide: WebhookEventAuditService, useValue: audits },
        { provide: UserService, useValue: userService },
        { provide: UserWhitelistService, useValue: whitelist },
        { provide: EnrollmentService, useValue: enrollmentService },
        { provide: ClassService, useValue: classService },
        // Who may act on an event is checked by the controller before these
        // methods run; the service only needs it for canActOnEvent.
        { provide: InstructorClassService, useValue: {} },
        {
          provide: PendingEnrollmentService,
          useValue: pendingEnrollmentService,
        },
      ],
    }).compile();

    service = module.get(WebhookEventService);
  });

  describe('executeUserEnrollment', () => {
    it('records a pending enrollment for someone who has never signed in, without creating a user', async () => {
      userService.user.mockResolvedValue(null);

      const result = await service.executeUserEnrollment('event-1');

      expect(userService.createUser).not.toHaveBeenCalled();
      expect(enrollmentService.createEnrollment).not.toHaveBeenCalled();
      // 'not enrolled' is the only status the login hook drains.
      expect(
        pendingEnrollmentService.createPendingEnrollment,
      ).toHaveBeenCalledWith({
        classId,
        userEmail: email,
        role: 'student',
        status: 'not enrolled',
      });
      expect(result.outcome).toBe('pending_first_login');
      expect(webhookEvents.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: expect.objectContaining({
          status: 'executed',
          enrollmentId: null,
        }),
      });
    });

    it('reuses an existing pending enrollment instead of adding another', async () => {
      userService.user.mockResolvedValue(null);
      pendingEnrollmentService.pendingEnrollments.mockResolvedValue([
        { id: 'pending-0', classId, userEmail: email, status: 'not enrolled' },
      ]);

      const result = await service.executeUserEnrollment('event-1');

      expect(
        pendingEnrollmentService.createPendingEnrollment,
      ).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        outcome: 'pending_first_login',
        pendingEnrollment: { id: 'pending-0' },
      });
    });

    it('enrolls an existing user directly', async () => {
      userService.user.mockResolvedValue({ id: 'user-1', email });
      enrollmentService.enrollment.mockResolvedValue(null);
      enrollmentService.createEnrollment.mockResolvedValue({
        classId,
        userId: 'user-1',
      });

      const result = await service.executeUserEnrollment('event-1');

      expect(enrollmentService.createEnrollment).toHaveBeenCalledWith({
        classId,
        userId: 'user-1',
        role: 'student',
      });
      expect(
        pendingEnrollmentService.createPendingEnrollment,
      ).not.toHaveBeenCalled();
      expect(result.outcome).toBe('enrolled');
      expect(webhookEvents.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: expect.objectContaining({
          status: 'executed',
          enrollmentId: `${classId}_user-1`,
        }),
      });
    });

    it('reports an existing enrollment as already_enrolled', async () => {
      userService.user.mockResolvedValue({ id: 'user-1', email });
      enrollmentService.enrollment.mockResolvedValue({
        classId,
        userId: 'user-1',
      });

      const result = await service.executeUserEnrollment('event-1');

      expect(enrollmentService.createEnrollment).not.toHaveBeenCalled();
      expect(result.outcome).toBe('already_enrolled');
    });

    it('marks the event failed when the class is gone', async () => {
      classService.class.mockResolvedValue(null);

      await expect(service.executeUserEnrollment('event-1')).rejects.toThrow(
        `Class ${classId} not found`,
      );
      expect(webhookEvents.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: expect.objectContaining({ status: 'failed' }),
      });
    });
  });

  describe('approveEvent', () => {
    it('audits the execution outcome and returns it', async () => {
      userService.user.mockResolvedValue(null);

      const result = await service.approveEvent('event-1', 'admin-1');

      expect(result.outcome).toBe('pending_first_login');
      expect(audits.create).toHaveBeenCalledWith({
        webhookEvent: { connect: { id: 'event-1' } },
        action: 'executed',
        performer: { connect: { id: 'admin-1' } },
        metadata: { outcome: 'pending_first_login', classId },
      });
    });
  });

  describe('getPendingEvents', () => {
    it('flags whether each user.enroll email belongs to an existing user', async () => {
      webhookEvents.findMany.mockResolvedValue([
        {
          id: 'a',
          eventType: 'user.enroll',
          payload: { email: 'old@example.com' },
        },
        { id: 'b', eventType: 'user.enroll', payload: { email } },
        { id: 'c', eventType: 'test.event', payload: {} },
      ]);
      databaseService.user.findMany.mockResolvedValue([
        { email: 'old@example.com' },
      ]);

      const events = await service.getPendingEvents();

      expect(events.map((e: any) => e.userExists)).toEqual([
        true,
        false,
        undefined,
      ]);
      expect(databaseService.user.findMany).toHaveBeenCalledWith({
        where: { email: { in: ['old@example.com', email] } },
        select: { email: true },
      });
    });
  });
});
