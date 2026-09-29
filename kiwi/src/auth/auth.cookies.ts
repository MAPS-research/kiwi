import type { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';
import { jwtExpiration } from './auth.constants';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Safari rejects Secure cookies on HTTP localhost, so the refresh cookie drops
 * Secure only for local requests outside production. Anything else keeps it:
 * a misconfigured hosted environment must not send the refresh token in the
 * clear. The hostname comes from the victim's own browser, so a remote attacker
 * cannot use it to turn Secure off. */
export function refreshCookieOptions(
  config: ConfigService,
  hostname: string | undefined,
): CookieOptions {
  const isLocalDevelopment =
    config.get<string>('NODE_ENV') !== 'production' &&
    LOCAL_HOSTNAMES.has(hostname ?? '');

  return {
    httpOnly: true,
    secure: !isLocalDevelopment,
    sameSite: 'lax',
    maxAge: 1000 * jwtExpiration.refreshToken,
  };
}
