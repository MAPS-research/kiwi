import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthGuard } from './auth.guard';
import { GoogleStrategy, isGoogleOAuthConfigured } from './google.strategy';
import { WhitelistService } from './whitelist/whitelist.service';

const config = (values: Record<string, string | undefined>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const context = {
  switchToHttp: () => ({ getRequest: () => ({ query: {}, session: {} }) }),
} as any;

describe('Google sign-in is optional', () => {
  it('is configured only when GOOGLE_CLIENT_ID is set', () => {
    expect(isGoogleOAuthConfigured(config({}))).toBe(false);
    expect(isGoogleOAuthConfigured(config({ GOOGLE_CLIENT_ID: '' }))).toBe(false);
    expect(isGoogleOAuthConfigured(config({ GOOGLE_CLIENT_ID: 'abc' }))).toBe(true);
  });

  it('constructs the strategy without Google credentials', () => {
    // passport-oauth2 throws "requires a clientID option" when this is empty,
    // which used to stop the whole app from booting.
    expect(
      () => new GoogleStrategy(config({}), {} as WhitelistService),
    ).not.toThrow();
  });

  it('answers 404 on the Google routes when not configured', () => {
    const guard = new GoogleOAuthGuard(config({}));
    expect(() => guard.canActivate(context)).toThrow(NotFoundException);
  });
});
