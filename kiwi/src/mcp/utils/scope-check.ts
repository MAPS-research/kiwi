import { ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Checks if the current request (if using an app token) has the required scope.
 * If the request is not from an app token (i.e., a regular user JWT), access is allowed.
 *
 * @param request - Express request object
 * @param scope - Required scope (e.g., 'user:profile:read', 'llm:prompt:hint')
 * @throws ForbiddenException if the required scope is missing
 *
 * @example
 * // Require a specific scope
 * requireScope(request, 'user:profile:read');
 *
 * // Require a prompt scope
 * requireScope(request, 'llm:prompt:hint-generator');
 */
export function requireScope(request: Request, scope: string): void {
  const appContext = request['appContext'];

  // If not an app token request, skip scope check (user JWT has full access)
  if (!appContext) return;

  // Check for exact match or wildcard
  const hasScope = appContext.scopes.some(
    (s: string) =>
      s === scope || (s.endsWith(':*') && scope.startsWith(s.slice(0, -1))),
  );

  if (!hasScope) {
    throw new ForbiddenException(`Missing required scope: ${scope}`);
  }
}

/**
 * Checks if the current request has at least one of the required scopes.
 * If the request is not from an app token, access is allowed.
 *
 * @param request - Express request object
 * @param scopes - Array of scopes (at least one must be present)
 * @throws ForbiddenException if none of the required scopes are present
 *
 * @example
 * // Require at least one of the given scopes
 * requireAnyScope(request, ['class:info:read', 'class:enrollments:read']);
 */
export function requireAnyScope(request: Request, scopes: string[]): void {
  const appContext = request['appContext'];

  // If not an app token request, skip scope check (user JWT has full access)
  if (!appContext) return;

  const hasAny = scopes.some((scope) =>
    appContext.scopes.some(
      (s: string) =>
        s === scope || (s.endsWith(':*') && scope.startsWith(s.slice(0, -1))),
    ),
  );

  if (!hasAny) {
    throw new ForbiddenException(
      `Missing one of required scopes: ${scopes.join(', ')}`,
    );
  }
}

/**
 * Checks if the current request has all of the required scopes.
 * If the request is not from an app token, access is allowed.
 *
 * @param request - Express request object
 * @param scopes - Array of scopes (all must be present)
 * @throws ForbiddenException if any of the required scopes are missing
 *
 * @example
 * // Require all of the given scopes
 * requireAllScopes(request, ['user:profile:read', 'class:info:read']);
 */
export function requireAllScopes(request: Request, scopes: string[]): void {
  const appContext = request['appContext'];

  // If not an app token request, skip scope check (user JWT has full access)
  if (!appContext) return;

  const missingScopes = scopes.filter(
    (scope) =>
      !appContext.scopes.some(
        (s: string) =>
          s === scope || (s.endsWith(':*') && scope.startsWith(s.slice(0, -1))),
      ),
  );

  if (missingScopes.length > 0) {
    throw new ForbiddenException(
      `Missing required scopes: ${missingScopes.join(', ')}`,
    );
  }
}

/**
 * Returns the scopes from the app context if present, otherwise an empty array.
 * Useful for logging or conditional access based on available scopes.
 *
 * @param request - Express request object
 * @returns Array of scopes or empty array if not an app token
 *
 * @example
 * const scopes = getAppScopes(request);
 * if (scopes.includes('class:enrollments:read')) {
 *   // Include enrollment details
 * }
 */
export function getAppScopes(request: Request): string[] {
  const appContext = request['appContext'];
  return appContext?.scopes || [];
}

/**
 * Checks if the request is from an app token (vs a regular user JWT).
 *
 * @param request - Express request object
 * @returns true if the request is using an app token
 */
export function isAppTokenRequest(request: Request): boolean {
  return !!request['appContext'];
}

/**
 * Gets the app context from the request if available.
 * Returns undefined for regular user JWT requests.
 *
 * @param request - Express request object
 * @returns App context or undefined
 */
export function getAppContext(
  request: Request,
): { appSlug: string; classId: string | null; scopes: string[]; userId: string } | undefined {
  // classId is null for a classless admin token (see
  // KiwiAppService.generateAppToken). Such a token can never satisfy a
  // class-scoped route — callers must compare against their own :classId and
  // reject a mismatch, which a null value always is.
  return request['appContext'];
}
