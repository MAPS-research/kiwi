import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  assertBearerAccessToken,
  InstructorClassGuard,
  resolveRequestClassId,
} from './auth.guard';
import { InstructorClassService } from 'src/instructor-class/instructor-class.service';
import { ExperimentService } from 'src/experiment/experiment.service';
import { WebhookEventService } from 'src/webhooks/webhook-event.service';
import { isDevAuthEnabled } from './dev-auth';
import { DevAuthEnabled } from './auth.decorator';

/**
 * Regression tests for authorization gaps fixed before open-sourcing:
 * class-scoped instructor access, refresh tokens used as bearer tokens,
 * cross-class experiment access, webhook event scoping, and dev auth.
 */

type Enrollment = { classId: string; userId: string; role: string };

function fakeDatabase(opts: {
  users: Record<string, string>; // userId -> systemRole
  enrollments?: Enrollment[];
  assignments?: { userId: string; classId: string }[];
}) {
  return {
    user: {
      findUnique: jest.fn(async ({ where }: any) =>
        opts.users[where.id] ? { systemRole: opts.users[where.id] } : null,
      ),
    },
    enrollment: {
      findUnique: jest.fn(async ({ where }: any) => {
        const { classId, userId } = where.classId_userId;
        return (
          (opts.enrollments ?? []).find(
            (e) => e.classId === classId && e.userId === userId,
          ) ?? null
        );
      }),
    },
    instructorClass: {
      findUnique: jest.fn(async ({ where }: any) => {
        const { userId, classId } = where.userId_classId;
        return (
          (opts.assignments ?? []).find(
            (a) => a.userId === userId && a.classId === classId,
          ) ?? null
        );
      }),
    },
  };
}

function classAccess(db: ReturnType<typeof fakeDatabase>) {
  return new InstructorClassService(db as any, {} as any);
}

describe('InstructorClassService.canManageClass', () => {
  const db = fakeDatabase({
    users: { admin: 'admin', prof: 'user', inst: 'instructor', student: 'user' },
    enrollments: [
      { classId: 'A', userId: 'prof', role: 'professor' },
      { classId: 'A', userId: 'student', role: 'student' },
    ],
    assignments: [{ userId: 'inst', classId: 'A' }],
  });
  const service = classAccess(db);

  it.each([
    ['admin', 'A', true],
    ['admin', 'B', true],
    ['prof', 'A', true],
    ['inst', 'A', true],
    ['student', 'A', false],
    ['unknown', 'A', false],
  ])('%s on class %s -> %s', async (userId, classId, expected) => {
    await expect(service.canManageClass(userId, classId)).resolves.toBe(
      expected,
    );
  });

  it('does not let a professor of one class manage another', async () => {
    await expect(service.canManageClass('prof', 'B')).resolves.toBe(false);
  });

  it('does not let an instructor assigned elsewhere manage the class', async () => {
    await expect(service.canManageClass('inst', 'B')).resolves.toBe(false);
  });
});

describe('InstructorClassGuard', () => {
  const service = classAccess(
    fakeDatabase({
      users: { prof: 'user' },
      enrollments: [{ classId: 'A', userId: 'prof', role: 'professor' }],
    }),
  );
  const guard = new InstructorClassGuard(service);
  const ctx = (request: any) =>
    ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;

  it('allows the professor on their own class (route param)', async () => {
    await expect(
      guard.canActivate(
        ctx({ session: { userId: 'prof' }, params: { classID: 'A' } }),
      ),
    ).resolves.toBe(true);
  });

  it('allows the professor on their own class (lowercase param)', async () => {
    await expect(
      guard.canActivate(
        ctx({ session: { userId: 'prof' }, params: { classId: 'A' } }),
      ),
    ).resolves.toBe(true);
  });

  it('refuses the professor on a different class', async () => {
    await expect(
      guard.canActivate(
        ctx({ session: { userId: 'prof' }, params: { classID: 'B' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a request that names no class', async () => {
    await expect(
      guard.canActivate(ctx({ session: { userId: 'prof' }, params: {} })),
    ).rejects.toThrow('Class ID is required');
  });

  it('refuses a request without a session user', async () => {
    await expect(
      guard.canActivate(ctx({ session: {}, params: { classID: 'A' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('resolveRequestClassId', () => {
  it('prefers the route over query and body', () => {
    expect(
      resolveRequestClassId({
        params: { classID: 'route' },
        query: { classID: 'query' },
        body: { classId: 'body' },
      }),
    ).toBe('route');
  });

  it('falls back to query, then body', () => {
    expect(resolveRequestClassId({ query: { classID: 'q' } })).toBe('q');
    expect(resolveRequestClassId({ body: { classId: 'b' } })).toBe('b');
    expect(resolveRequestClassId({})).toBeUndefined();
  });
});

describe('assertBearerAccessToken', () => {
  it('accepts an access token', () => {
    expect(() =>
      assertBearerAccessToken({ sub: 'u', email: 'e' }),
    ).not.toThrow();
  });

  it('accepts an app token', () => {
    expect(() =>
      assertBearerAccessToken({ sub: 'u', type: 'app_token', scopes: [] }),
    ).not.toThrow();
  });

  it('rejects a refresh token (it carries a jti)', () => {
    expect(() =>
      assertBearerAccessToken({ sub: 'u', email: 'e', jti: 'abc' }),
    ).toThrow(UnauthorizedException);
  });

  it('rejects an MCP refresh token', () => {
    expect(() =>
      assertBearerAccessToken({ sub: 'u', token_type: 'mcp', jti: 'abc' }),
    ).toThrow(UnauthorizedException);
  });
});

describe('ExperimentService.getForClass', () => {
  const experiments: Record<string, { id: string; classId: string }> = {
    e1: { id: 'e1', classId: 'A' },
  };
  const service = Object.create(ExperimentService.prototype);
  service.db = {
    experiment: async ({ id }: { id: string }) => experiments[id] ?? null,
  };

  it('returns an experiment that belongs to the class', async () => {
    await expect(service.getForClass('e1', 'A')).resolves.toEqual(
      experiments.e1,
    );
  });

  it('hides an experiment that belongs to another class', async () => {
    await expect(service.getForClass('e1', 'B')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reports a missing experiment as not found', async () => {
    await expect(service.getForClass('nope', 'A')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('WebhookEventService event scoping', () => {
  const enrollEvent = (classId: string) => ({
    id: `ev-${classId}`,
    eventType: 'user.enroll',
    payload: { email: 'x@example.edu', classId },
    status: 'pending',
  });
  const service = Object.create(WebhookEventService.prototype);
  service.instructorClassService = classAccess(
    fakeDatabase({
      users: { prof: 'user', admin: 'admin' },
      enrollments: [{ classId: 'A', userId: 'prof', role: 'professor' }],
    }),
  );
  service.userService = {
    user: async ({ id }: { id: string }) =>
      id === 'admin' ? { systemRole: 'admin' } : { systemRole: 'user' },
  };

  it('lets a professor act on enrollments into their own class only', async () => {
    await expect(
      service.canActOnEvent(enrollEvent('A'), 'prof'),
    ).resolves.toBe(true);
    await expect(
      service.canActOnEvent(enrollEvent('B'), 'prof'),
    ).resolves.toBe(false);
  });

  it('keeps events without a class admin-only', async () => {
    const other = { eventType: 'user.create', payload: {} };
    await expect(service.canActOnEvent(other, 'prof')).resolves.toBe(false);
    await expect(service.canActOnEvent(other, 'admin')).resolves.toBe(true);
  });

  it('filters the pending list to events the caller may act on', async () => {
    service.getPendingEvents = async () => [enrollEvent('A'), enrollEvent('B')];
    const visible = await service.getPendingEventsFor('prof');
    expect(visible.map((e: { id: string }) => e.id)).toEqual(['ev-A']);
  });

  it('reports an event for another class as not found', async () => {
    service.getWebhookEvent = async () => enrollEvent('B');
    await expect(
      service.getWebhookEventFor('ev-B', 'prof'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('never loads the webhook secret or approver credentials', async () => {
    let include: any;
    service.webhookEventService = {
      findUnique: async (args: any) => {
        include = args.include;
        return enrollEvent('A');
      },
    };
    await WebhookEventService.prototype.getWebhookEvent.call(service, 'ev-A');
    expect(include.webhook).toEqual({
      select: expect.not.objectContaining({ secret: expect.anything() }),
    });
    expect(include.approver).toEqual({ select: { id: true, email: true } });
  });
});

describe('dev auth', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('is off unless DEV_AUTH=true', () => {
    delete process.env.DEV_AUTH;
    process.env.NODE_ENV = 'development';
    expect(isDevAuthEnabled()).toBe(false);
    process.env.DEV_AUTH = 'true';
    expect(isDevAuthEnabled()).toBe(true);
  });

  it('is always off in production', () => {
    process.env.DEV_AUTH = 'true';
    process.env.NODE_ENV = 'production';
    expect(isDevAuthEnabled()).toBe(false);
  });

  it('checks at call time, not when the route is declared', () => {
    process.env.DEV_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    class Controller {
      @DevAuthEnabled()
      dev() {
        return 'minted';
      }
    }
    const controller = new Controller();
    expect(controller.dev()).toBe('minted');

    process.env.NODE_ENV = 'production';
    expect(() => controller.dev()).toThrow(NotFoundException);
  });
});
