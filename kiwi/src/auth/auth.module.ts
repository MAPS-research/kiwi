import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { WellKnownController } from './wellknown.controller';
import { AuthService } from './auth.service';
import { DatabaseModule } from 'src/common/database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtExpiration } from './auth.constants';
import { APP_GUARD } from '@nestjs/core';
import {
  AdminGuard,
  JwtAuthGuard,
  JwtAuthOptionalSessionGuard,
  LocalAuthGuard,
  ProfGuard,
  SmartJwtAuthGuard,
} from './auth.guard';
import { GoogleStrategy } from './google.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClassModule } from 'src/class/class.module';
import { RedisModule } from 'src/common/redis/redis.module';
import { WhitelistModule } from './whitelist/whitelist.module';
import { LocalStrategy } from './local.strategy';
import { OAuthClientService } from './oauth-client.service';
import { JwtKeysService } from './jwt-keys.service';
import { isDevAuthEnabled } from './dev-auth';

@Module({
  imports: [
    PassportModule.register({}),
    ConfigModule.forRoot(),
    DatabaseModule,
    ClassModule,
    RedisModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // Check if RS256 keys are configured
        const privateKey = configService.get<string>('JWT_PRIVATE_KEY');
        const publicKey = configService.get<string>('JWT_PUBLIC_KEY');

        if (privateKey && publicKey) {
          // Use RS256 with asymmetric keys
          return {
            privateKey: Buffer.from(privateKey, 'base64').toString('utf-8'),
            publicKey: Buffer.from(publicKey, 'base64').toString('utf-8'),
            signOptions: {
              algorithm: 'RS256',
              expiresIn:
                isDevAuthEnabled()
                  ? 86400
                  : jwtExpiration.accessToken,
            },
            verifyOptions: {
              algorithms: ['RS256'],
            },
          };
        } else {
          // Fallback to HS256 for backward compatibility (development only)
          const secret = configService.get<string>('JWT_SECRET');
          return {
            secret,
            signOptions: {
              expiresIn:
                isDevAuthEnabled()
                  ? 86400
                  : jwtExpiration.accessToken,
            },
          };
        }
      },
    }),
    WhitelistModule,
  ],
  controllers: [AuthController, WellKnownController],
  providers: [
    AuthService,
    OAuthClientService,
    JwtKeysService,
    {
      provide: APP_GUARD,
      useClass: SmartJwtAuthGuard,
    },
    GoogleStrategy,
    LocalStrategy,
    LocalAuthGuard,
    AdminGuard,
    ProfGuard,
    JwtAuthGuard,
    JwtAuthOptionalSessionGuard,
    SmartJwtAuthGuard,
  ],
  exports: [
    AdminGuard,
    ProfGuard,
    JwtAuthOptionalSessionGuard,
    SmartJwtAuthGuard,
    JwtKeysService,
  ],
})
export class AuthModule {}
