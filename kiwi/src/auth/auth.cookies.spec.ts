import { ConfigService } from '@nestjs/config';
import { refreshCookieOptions } from './auth.cookies';

describe('refreshCookieOptions', () => {
  it.each(['localhost', '127.0.0.1', '::1'])(
    'allows the refresh cookie on local HTTP (%s) without exposing it to JavaScript',
    (hostname) => {
      const options = refreshCookieOptions(
        new ConfigService({ NODE_ENV: 'development' }),
        hostname,
      );
      expect(options).toMatchObject({
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
      });
      expect(options.maxAge).toBeGreaterThan(0);
    },
  );

  it.each([
    { env: { NODE_ENV: 'production' }, hostname: 'localhost' },
    { env: { NODE_ENV: 'development' }, hostname: 'api.example.com' },
    // A hosted environment that forgot NODE_ENV and API_DOMAIN stays secure.
    { env: {}, hostname: 'staging-api.example.com' },
    { env: {}, hostname: undefined },
  ])('keeps the cookie secure with %j', ({ env, hostname }) => {
    expect(
      refreshCookieOptions(new ConfigService(env), hostname),
    ).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    });
  });
});
