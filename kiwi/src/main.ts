import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import helmet from 'helmet';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { isDevAuthEnabled } from './auth/dev-auth';

import cookieParser from 'cookie-parser';

import session from 'express-session';
import { InteractionInterceptor } from './interaction/interaction.interceptor';
import { InteractionService } from './interaction/interaction.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createPrismaClient } from './common/database/prisma-client.factory';
import { mcpStrategy } from './mcp/mcp-http.controller';

async function bootstrap() {
  // Gate verbose logs: in production only log/warn/error; in dev also emit
  // debug/verbose (e.g. the [AGENT-CTX]/[AGENT-DECISION] agent traces, which use
  // logger.debug). Override with LOG_LEVEL_DEBUG=true to force debug logs on.
  const debugLogs =
    process.env.LOG_LEVEL_DEBUG === 'true' ||
    process.env.NODE_ENV !== 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    logger: debugLogs
      ? ['error', 'warn', 'log', 'debug', 'verbose']
      : ['error', 'warn', 'log'],
  });

  // Shutdown Hooks
  app.enableShutdownHooks();

  // Setup Environment Variables
  const configService = app.get(ConfigService);
  const port = configService.get('PORT');

  // Setup Helmet
  app.use(helmet());

  const SESSION_MAX_AGE = 1 * 60 * 60 * 1000; // 1 hour

  // Setup Session
  app.use(
    session({
      proxy: !!process.env.API_DOMAIN,
      cookie: {
        maxAge: SESSION_MAX_AGE, // 1 hour
        httpOnly: true,
        secure: !!process.env.API_DOMAIN,
      },
      store: new PrismaSessionStore(createPrismaClient(), {
        checkPeriod: 2 * 60 * 1000, //ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
        ttl: SESSION_MAX_AGE, // 1 hour
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: true,
    }),
  );

  // use cookie parser
  app.use(cookieParser());

  // Setup Swagger

  const DEV_AUTH = isDevAuthEnabled();

  const configBuilder = new DocumentBuilder()
    .setTitle('Kiwi Framework')
    .setDescription('Kiwi API description')
    .setVersion('0.1');

  if (DEV_AUTH) {
    configBuilder.addOAuth2(
      {
        type: 'oauth2',
        flows: {
          password: {
            tokenUrl: '/auth/dev', // Your token endpoint
            refreshUrl: '/auth/refresh-token', // Your refresh token endpoint
            scopes: {}, // If you have any scopes, list them here
          },
        },
      },
      'bearerAuth',
    );
  } else {
    configBuilder.addBearerAuth(
      { type: 'http', scheme: 'bearer' },
      'bearerAuth',
    );
  }

  const config = configBuilder.build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document); // JSON version at /docs-json

  // add the interceptor globally
  const interactionService = app.get(InteractionService);
  app.useGlobalInterceptors(new InteractionInterceptor(interactionService));

  // Add global validation pipe
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true, // Strip properties that don't have decorators
  //     forbidNonWhitelisted: false, // Throw error if non-whitelisted properties exist
  //     transform: true, // Automatically transform payloads to DTO instances
  //     transformOptions: {
  //       enableImplicitConversion: true, // Enable automatic type conversion
  //     },
  //   }),
  // );

  // Set body parser limit to 10mb
  app.useBodyParser('json', { limit: '10mb' });

  mcpStrategy.setHttpAdapter(app.getHttpAdapter());
  app.connectMicroservice({ strategy: mcpStrategy });
  await app.startAllMicroservices();
  await app.listen(port);
}
bootstrap();
