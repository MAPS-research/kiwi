/**
 * `POST /auth/dev` creates a new admin user for any caller, which is only
 * acceptable on a developer's machine. It needs DEV_AUTH=true and is refused
 * outright when NODE_ENV=production.
 *
 * Read at call time, not import time: `.env` may not be loaded yet when
 * decorators run.
 */
export function isDevAuthEnabled(): boolean {
  return (
    process.env.DEV_AUTH === 'true' && process.env.NODE_ENV !== 'production'
  );
}
