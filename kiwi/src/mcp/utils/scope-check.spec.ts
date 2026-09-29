import { ForbiddenException } from '@nestjs/common';
import {
  requireScope,
  requireAnyScope,
  requireAllScopes,
  getAppScopes,
  isAppTokenRequest,
  getAppContext,
} from './scope-check';
import { Request } from 'express';

describe('scope-check utilities', () => {
  // Helper to create mock requests
  const createMockRequest = (appContext?: {
    appSlug: string;
    classId: string;
    scopes: string[];
    userId: string;
  }): Request => {
    const req = {} as Request;
    if (appContext) {
      req['appContext'] = appContext;
    }
    return req;
  };

  // ==========================================================================
  // requireScope Tests
  // ==========================================================================

  describe('requireScope', () => {
    it('should pass when appContext not present (user JWT)', () => {
      const request = createMockRequest();

      // Should not throw - user JWT has full access
      expect(() => requireScope(request, 'user:profile:read')).not.toThrow();
    });

    it('should pass when exact scope matches', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['user:profile:read', 'class:info:read'],
        userId: 'user-1',
      });

      expect(() => requireScope(request, 'user:profile:read')).not.toThrow();
    });

    it('should pass when wildcard scope matches', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['llm:prompt:*'],
        userId: 'user-1',
      });

      // llm:prompt:* should match llm:prompt:hint
      expect(() => requireScope(request, 'llm:prompt:hint')).not.toThrow();
      expect(() => requireScope(request, 'llm:prompt:explain')).not.toThrow();
    });

    it('should throw ForbiddenException when scope missing', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['class:info:read'],
        userId: 'user-1',
      });

      expect(() => requireScope(request, 'user:profile:read')).toThrow(
        ForbiddenException,
      );
      expect(() => requireScope(request, 'user:profile:read')).toThrow(
        'Missing required scope: user:profile:read',
      );
    });

    it('should not match partial wildcard incorrectly', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['llm:prompt:*'],
        userId: 'user-1',
      });

      // llm:prompt:* should NOT match llm:other:something
      expect(() => requireScope(request, 'llm:other:something')).toThrow(
        ForbiddenException,
      );
    });
  });

  // ==========================================================================
  // requireAnyScope Tests
  // ==========================================================================

  describe('requireAnyScope', () => {
    it('should pass when appContext not present (user JWT)', () => {
      const request = createMockRequest();

      expect(() =>
        requireAnyScope(request, ['user:profile:read', 'class:info:read']),
      ).not.toThrow();
    });

    it('should pass when at least one scope matches', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['class:info:read'],
        userId: 'user-1',
      });

      expect(() =>
        requireAnyScope(request, ['user:profile:read', 'class:info:read']),
      ).not.toThrow();
    });

    it('should pass when wildcard scope matches any', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['class:*'],
        userId: 'user-1',
      });

      expect(() =>
        requireAnyScope(request, ['class:info:read', 'class:enrollments:read']),
      ).not.toThrow();
    });

    it('should throw when no scopes match', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['other:scope'],
        userId: 'user-1',
      });

      expect(() =>
        requireAnyScope(request, ['user:profile:read', 'class:info:read']),
      ).toThrow(ForbiddenException);
      expect(() =>
        requireAnyScope(request, ['user:profile:read', 'class:info:read']),
      ).toThrow(
        'Missing one of required scopes: user:profile:read, class:info:read',
      );
    });
  });

  // ==========================================================================
  // requireAllScopes Tests
  // ==========================================================================

  describe('requireAllScopes', () => {
    it('should pass when appContext not present (user JWT)', () => {
      const request = createMockRequest();

      expect(() =>
        requireAllScopes(request, ['user:profile:read', 'class:info:read']),
      ).not.toThrow();
    });

    it('should pass when all scopes present', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['user:profile:read', 'class:info:read', 'llm:prompt:hint'],
        userId: 'user-1',
      });

      expect(() =>
        requireAllScopes(request, ['user:profile:read', 'class:info:read']),
      ).not.toThrow();
    });

    it('should pass when wildcards cover all required scopes', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['user:*', 'class:*'],
        userId: 'user-1',
      });

      expect(() =>
        requireAllScopes(request, ['user:profile:read', 'class:info:read']),
      ).not.toThrow();
    });

    it('should throw with list of missing scopes', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['user:profile:read'],
        userId: 'user-1',
      });

      expect(() =>
        requireAllScopes(request, [
          'user:profile:read',
          'class:info:read',
          'llm:prompt:hint',
        ]),
      ).toThrow(ForbiddenException);
      expect(() =>
        requireAllScopes(request, [
          'user:profile:read',
          'class:info:read',
          'llm:prompt:hint',
        ]),
      ).toThrow('Missing required scopes: class:info:read, llm:prompt:hint');
    });

    it('should throw when some scopes are missing', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['user:profile:read'],
        userId: 'user-1',
      });

      expect(() =>
        requireAllScopes(request, ['user:profile:read', 'class:info:read']),
      ).toThrow(ForbiddenException);
    });
  });

  // ==========================================================================
  // getAppScopes Tests
  // ==========================================================================

  describe('getAppScopes', () => {
    it('should return scopes from appContext', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['user:profile:read', 'class:info:read'],
        userId: 'user-1',
      });

      const scopes = getAppScopes(request);

      expect(scopes).toEqual(['user:profile:read', 'class:info:read']);
    });

    it('should return empty array when appContext not present', () => {
      const request = createMockRequest();

      const scopes = getAppScopes(request);

      expect(scopes).toEqual([]);
    });

    it('should return empty array when scopes not defined', () => {
      const request = {} as Request;
      // Simulate an incomplete appContext without scopes
      request['appContext'] = {
        appSlug: 'test',
        classId: 'class-1',
        userId: 'user-1',
        scopes: undefined,
      } as any;

      const scopes = getAppScopes(request);

      expect(scopes).toEqual([]);
    });
  });

  // ==========================================================================
  // isAppTokenRequest Tests
  // ==========================================================================

  describe('isAppTokenRequest', () => {
    it('should return true when appContext present', () => {
      const request = createMockRequest({
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['user:profile:read'],
        userId: 'user-1',
      });

      expect(isAppTokenRequest(request)).toBe(true);
    });

    it('should return false when appContext not present', () => {
      const request = createMockRequest();

      expect(isAppTokenRequest(request)).toBe(false);
    });

    it('should return false for regular user JWT request', () => {
      const request = {} as Request;
      request['user'] = { sub: 'user-1' };

      expect(isAppTokenRequest(request)).toBe(false);
    });
  });

  // ==========================================================================
  // getAppContext Tests
  // ==========================================================================

  describe('getAppContext', () => {
    it('should return full context when present', () => {
      const appContext = {
        appSlug: 'codegen',
        classId: 'class-1',
        scopes: ['user:profile:read'],
        userId: 'user-1',
      };
      const request = createMockRequest(appContext);

      const result = getAppContext(request);

      expect(result).toEqual(appContext);
      expect(result?.appSlug).toBe('codegen');
      expect(result?.classId).toBe('class-1');
      expect(result?.userId).toBe('user-1');
      expect(result?.scopes).toEqual(['user:profile:read']);
    });

    it('should return undefined for non-app token requests', () => {
      const request = createMockRequest();

      const result = getAppContext(request);

      expect(result).toBeUndefined();
    });
  });
});
