import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhitelistService } from './whitelist/whitelist.service';
import { Request } from 'express';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly whitelistService: WhitelistService,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET')!,
      callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, _json } = profile;
    // Check if emails has a value
    if (!emails || emails.length === 0 || !emails[0].value) {
      return done(new Error('No emails found'), false);
    }

    const allowedDomains = this.configService.get('GOOGLE_DOMAIN').split(',');
    if (
      !allowedDomains.includes('*') &&
      _json.hd &&
      !allowedDomains.includes(_json.hd)
    ) {
      return done(
        new UnauthorizedException('User from this domain is not allowed', {
          cause: 'Invalid domain',
          description: `Your domain (${_json.hd}) is not allowed to access this application.`,
        }),
        false,
      );
    }

    // Check if user is in whitelist
    const whitelist = await this.whitelistService.listAllowed();
    const isWhitelisted = whitelist.entries.some(
      (entry) => entry.email === emails![0].value,
    );
    if (!isWhitelisted) {
      return done(
        new UnauthorizedException('User not whitelisted', {
          cause: 'User not whitelisted',
          description:
            'You are not allowed to access this application. Please contact the administrator.',
        }),
        false,
      );
      // done(new Error('User not whitelisted'), false);
    }

    const user = {
      email: emails![0].value,
      id: id,
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}
