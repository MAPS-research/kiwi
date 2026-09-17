import {
  Controller,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  Logger,
  Res,
  Post,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  AdminGuard,
  GoogleOAuthGuard,
  JwtAuthGuard,
  LocalAuthGuard,
  RefreshTokenGuard,
} from './auth.guard';
import { DevAuthEnabled, Public } from './auth.decorator';
import { ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { jwtExpiration } from './auth.constants';
import { RegisterDto } from './dto/auth-register.dto';
import { ResetPasswordDto } from './dto/auth-reset-password.dto';
import { LoginDto, LoginResponseDto } from './dto/auth-login.dto';
import { ChangeRoleDto } from './dto/auth-change-role.dto';
import { OAuthLoginDto } from './dto/auth-oauth-login.dto';
import { OAuthClientService } from './oauth-client.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/common/redis/redis.service';
import { UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private configService: ConfigService,
    private readonly oauthClientService: OAuthClientService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Post('register')
  @UseGuards(AdminGuard)
  async register(@Body() body: RegisterDto) {
    await this.authService.registerUser(
      body.email,
      body.password,
      body.classId,
    );
    return { message: 'registered' };
  }

  @Post('resetpassword')
  @UseGuards(AdminGuard)
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body.email, body.password);
    return { message: 'password reset' };
  }

  @Post('clients/register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: 201,
    description: 'OAuth client registered successfully',
  })
  async registerOAuthClient(@Body() body: any) {
    this.logger.debug('OAuth client registration request received');

    // Validate required fields according to RFC 7591
    if (!body.redirect_uris || !Array.isArray(body.redirect_uris)) {
      throw new BadRequestException(
        'redirect_uris is required and must be an array',
      );
    }

    const registrationResponse = await this.oauthClientService.registerClient({
      redirect_uris: body.redirect_uris,
      token_endpoint_auth_method: body.token_endpoint_auth_method,
      grant_types: body.grant_types,
      response_types: body.response_types,
      scope: body.scope,
      client_name: body.client_name,
      mcp_server_id: body.mcp_server_id, // Optional link to MCP server
    });

    this.logger.debug(
      `OAuth client registered with client_id: ${registrationResponse.client_id}`,
    );

    return registrationResponse;
  }

  @ApiResponse({
    status: 200,
    description: 'Successful response',
    type: LoginResponseDto,
  })
  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  async login(
    @Request() req: any,
    @Body() body: LoginDto,
    @Res() res: Response,
  ) {
    this.logger.debug('User login from', body.email);
    const token = await this.authService.authenticate(req);

    res.cookie('refreshToken', token.refresh_token, {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * jwtExpiration.refreshToken,
    });

    return res.json({
      access_token: token.access_token,
    });
  }

  @Post('oauth-login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description:
      'OAuth login successful, redirects to client with authorization code',
  })
  @ApiResponse({
    status: 400,
    description: 'No pending OAuth request or invalid credentials',
  })
  async oauthLogin(
    @Request() req: any,
    @Body() body: OAuthLoginDto,
    @Res() res: Response,
  ) {
    this.logger.debug('OAuth login attempt from', body.email);

    // Check for pending OAuth request
    const sessionId = req.session.id || req.sessionID;
    const pendingOAuthRequest =
      await this.authService.getPendingOAuthRequest(sessionId);

    if (!pendingOAuthRequest) {
      throw new BadRequestException(
        'No pending OAuth authorization request. Please start the OAuth flow again.',
      );
    }

    // Validate credentials
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Set user on request for authenticate method
    req.user = user;

    // Authenticate user and create session
    await this.authService.authenticate(req);
    const userId = req.session.userId;

    if (!userId) {
      throw new BadRequestException('User authentication failed');
    }

    // Generate authorization code
    const authCode = await this.authService.generateAuthorizationCode({
      userId,
      clientId: pendingOAuthRequest.clientId,
      redirectUri: pendingOAuthRequest.redirectUri,
      codeChallenge: pendingOAuthRequest.codeChallenge,
      codeChallengeMethod: pendingOAuthRequest.codeChallengeMethod,
      scope: pendingOAuthRequest.scope,
    });

    // Clean up pending request
    await this.authService.removePendingOAuthRequest(sessionId);

    // Redirect to client's redirect_uri with authorization code
    const redirectUrl = new URL(pendingOAuthRequest.redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    redirectUrl.searchParams.set('state', pendingOAuthRequest.state);

    this.logger.debug(
      `OAuth login successful, redirecting to: ${redirectUrl.toString()}`,
    );
    return res.redirect(redirectUrl.toString());
  }

  @Post('oauth-authorize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description:
      'OAuth authorization successful, redirects to client with authorization code',
  })
  @ApiResponse({
    status: 400,
    description: 'No pending OAuth request',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  async oauthAuthorizeWithToken(@Request() req: any, @Res() res: Response) {
    this.logger.debug('OAuth authorization with JWT for user', req.user.sub);

    // Check for pending OAuth request
    const sessionId = req.session.id || req.sessionID;
    const pendingOAuthRequest =
      await this.authService.getPendingOAuthRequest(sessionId);

    if (!pendingOAuthRequest) {
      throw new BadRequestException(
        'No pending OAuth authorization request. Please start the OAuth flow again.',
      );
    }

    // Get user ID from JWT
    const userId = req.user.sub;

    // Generate authorization code
    const authCode = await this.authService.generateAuthorizationCode({
      userId,
      clientId: pendingOAuthRequest.clientId,
      redirectUri: pendingOAuthRequest.redirectUri,
      codeChallenge: pendingOAuthRequest.codeChallenge,
      codeChallengeMethod: pendingOAuthRequest.codeChallengeMethod,
      scope: pendingOAuthRequest.scope,
    });

    // Clean up pending request
    await this.authService.removePendingOAuthRequest(sessionId);

    // Redirect to client's redirect_uri with authorization code
    const redirectUrl = new URL(pendingOAuthRequest.redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    redirectUrl.searchParams.set('state', pendingOAuthRequest.state);

    this.logger.debug(
      `OAuth authorization successful, redirecting to: ${redirectUrl.toString()}`,
    );
    return res.redirect(redirectUrl.toString());
  }

  @Get('authorize')
  @Public()
  @ApiQuery({ name: 'client_id', required: true })
  @ApiQuery({ name: 'redirect_uri', required: true })
  @ApiQuery({ name: 'state', required: true })
  @ApiQuery({ name: 'code_challenge', required: true })
  @ApiQuery({ name: 'code_challenge_method', required: true })
  @ApiQuery({ name: 'response_type', required: false })
  @ApiQuery({ name: 'scope', required: false })
  async oauthAuthorize(@Request() req: any, @Res() res: Response) {
    const {
      client_id,
      redirect_uri,
      state,
      code_challenge,
      code_challenge_method,
      response_type = 'code',
      scope,
    } = req.query;

    // Validate required parameters
    if (
      !client_id ||
      !redirect_uri ||
      !state ||
      !code_challenge ||
      !code_challenge_method
    ) {
      throw new BadRequestException('Missing required OAuth parameters');
    }

    // Validate client_id and redirect_uri against registered OAuth clients
    await this.oauthClientService.validateClient(client_id, redirect_uri);

    // Validate code_challenge_method
    if (code_challenge_method !== 'S256') {
      throw new BadRequestException(
        'Only S256 code_challenge_method is supported',
      );
    }

    // Validate response_type
    if (response_type !== 'code') {
      throw new BadRequestException('Only response_type=code is supported');
    }

    // Store OAuth request parameters in Redis using session ID
    const sessionId = req.session.id || req.sessionID;
    await this.authService.storePendingOAuthRequest(sessionId, {
      clientId: client_id,
      redirectUri: redirect_uri,
      state,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      scope,
      responseType: response_type,
    });

    // Get frontend URL for OAuth authorization page
    const frontURLs = this.configService.get('FRONTEND_URL').split(',');
    const frontURL = frontURLs[0];

    // Redirect to frontend authorize page with oauth_pending flag
    // Frontend should show authorization options (Google, password, or use existing session)
    return res.redirect(`${frontURL}/authorize?oauth_pending=true`);
  }

  @Get()
  @Public()
  @UseGuards(GoogleOAuthGuard)
  async googleAuth(@Request() req: any) {
    this.logger.debug(req);
  }

  @HttpCode(HttpStatus.OK)
  @Post('dev')
  @Public()
  @DevAuthEnabled()
  async devAuth(
    @Request() req: any,
    // @Res({ passthrough: true }) res: Response,
  ) {
    req.user = await this.authService.createDevUser();

    const token = await this.authService.authenticate(req);

    return {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_type: 'Bearer',
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get('google')
  @Public()
  @UseGuards(GoogleOAuthGuard)
  @ApiQuery({ name: 'frontend', required: false })
  async googleAuthRedirect(@Request() req: any, @Res() res: Response) {
    // Check if this is an OAuth authorization code flow
    const sessionId = req.session.id || req.sessionID;
    const pendingOAuthRequest =
      await this.authService.getPendingOAuthRequest(sessionId);

    if (pendingOAuthRequest) {
      // MCP OAuth flow - return authorization code
      this.logger.debug('Processing MCP OAuth authorization code flow');

      const token = await this.authService.authenticate(req);
      const userId = req.session.userId;

      if (!userId) {
        throw new BadRequestException('User authentication failed');
      }

      // Generate authorization code
      const authCode = await this.authService.generateAuthorizationCode({
        userId,
        clientId: pendingOAuthRequest.clientId,
        redirectUri: pendingOAuthRequest.redirectUri,
        codeChallenge: pendingOAuthRequest.codeChallenge,
        codeChallengeMethod: pendingOAuthRequest.codeChallengeMethod,
        scope: pendingOAuthRequest.scope,
      });

      // Clean up pending request
      await this.authService.removePendingOAuthRequest(sessionId);

      // Redirect to client's redirect_uri with authorization code
      const redirectUrl = new URL(pendingOAuthRequest.redirectUri);
      redirectUrl.searchParams.set('code', authCode);
      redirectUrl.searchParams.set('state', pendingOAuthRequest.state);

      this.logger.debug(`Redirecting to: ${redirectUrl.toString()}`);
      return res.redirect(redirectUrl.toString());
    }

    // Standard frontend OAuth flow
    this.logger.debug('Processing standard frontend OAuth flow');

    const { frontend } = req.session;
    // Remove it from session
    delete req.session.frontend;

    const token = await this.authService.authenticate(req);

    const frontURLs = this.configService.get('FRONTEND_URL').split(',');
    let frontURL = '';

    // The requested frontend must be one of FRONTEND_URL
    if (frontend) {
      if (frontURLs.includes(frontend)) frontURL = frontend;
      else {
        throw new BadRequestException(
          'Invalid frontend URL. Your URL is not in the FRONTEND_URL whitelist.',
        );
      }
    } else {
      // Redirect to first frontURL in whitelist
      frontURL = frontURLs[0];
    }

    res.cookie('refreshToken', token.refresh_token, {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * jwtExpiration.refreshToken,
    });
    return res.redirect(
      `${frontURL}/auth/callback?token=${token.access_token}`,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('token')
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Token exchange successful',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        token_type: { type: 'string' },
        expires_in: { type: 'number' },
        refresh_token: { type: 'string' },
      },
    },
  })
  async exchangeToken(@Body() body: any) {
    const { grant_type } = body;

    // Validate grant_type
    if (grant_type !== 'authorization_code' && grant_type !== 'refresh_token') {
      throw new BadRequestException('Unsupported grant_type');
    }

    // Handle authorization_code grant
    if (grant_type === 'authorization_code') {
      return this.handleAuthorizationCodeGrant(body);
    }

    // Handle refresh_token grant
    if (grant_type === 'refresh_token') {
      return this.handleRefreshTokenGrant(body);
    }
  }

  private async handleAuthorizationCodeGrant(body: any) {
    const { code, code_verifier, redirect_uri, client_id } = body;

    // Validate required parameters
    if (!code || !code_verifier || !redirect_uri) {
      throw new BadRequestException('Missing required parameters');
    }

    // Retrieve authorization code data
    const authCodeData = await this.authService.getAuthorizationCode(code);
    if (!authCodeData) {
      throw new BadRequestException('Invalid or expired authorization code');
    }

    // Validate redirect_uri matches
    if (authCodeData.redirectUri !== redirect_uri) {
      throw new BadRequestException('redirect_uri mismatch');
    }

    // Validate client_id if provided
    if (client_id && authCodeData.clientId !== client_id) {
      throw new BadRequestException('client_id mismatch');
    }

    // Validate PKCE code verifier
    const isPKCEValid = await this.authService.validatePKCE(
      code_verifier,
      authCodeData.codeChallenge,
      authCodeData.codeChallengeMethod,
    );

    if (!isPKCEValid) {
      throw new BadRequestException('Invalid code_verifier');
    }

    // Remove authorization code (one-time use)
    await this.authService.removeAuthorizationCode(code);

    // Check if this OAuth client is linked to an MCP server
    const oauthClient = await this.databaseService.oAuthClient.findUnique({
      where: { clientId: authCodeData.clientId },
    });

    if (oauthClient?.mcpServerId) {
      // Generate MCP-specific tokens with separate JTI tracking
      const tokens = await this.authService.generateMcpOAuthTokens(
        authCodeData.userId,
        oauthClient.mcpServerId,
      );

      this.logger.debug(
        `MCP token exchange successful for user ${authCodeData.userId}, server ${oauthClient.mcpServerId}`,
      );

      return tokens;
    }

    // Generate regular OAuth tokens
    const tokens = await this.authService.generateOAuthTokens(
      authCodeData.userId,
    );

    this.logger.debug(
      `Token exchange successful for user ${authCodeData.userId}`,
    );

    return tokens;
  }

  private async handleRefreshTokenGrant(body: any) {
    const { refresh_token, client_id } = body;

    // Validate required parameters
    if (!refresh_token) {
      throw new BadRequestException('Missing refresh_token parameter');
    }

    try {
      // Verify and decode the refresh token
      const payload = await this.jwtService.verifyAsync(refresh_token, {
        ignoreExpiration: false,
      });

      const userId = payload.sub;
      const jti = payload.jti;
      const mcpServerId = payload.mcp_server_id;
      const tokenType = payload.token_type;

      // Check if this is an MCP refresh token
      if (tokenType === 'mcp' && mcpServerId) {
        // Validate against MCP-specific Redis key
        const isValid = await this.authService.validateMcpRefreshToken(
          userId,
          mcpServerId,
          jti,
        );

        if (!isValid) {
          this.logger.warn(
            `MCP refresh token jti mismatch for user ${userId}, server ${mcpServerId}`,
          );
          throw new UnauthorizedException('Invalid or revoked refresh token');
        }

        // Generate new MCP token pair
        const tokens = await this.authService.generateMcpOAuthTokens(
          userId,
          mcpServerId,
        );

        this.logger.debug(
          `MCP token refresh successful for user ${userId}, server ${mcpServerId}`,
        );

        return tokens;
      }

      // Regular refresh token validation
      const storedTokenJwtId = await this.redisService.get(
        `refresh_token:${userId}`,
      );

      if (storedTokenJwtId !== jti) {
        this.logger.warn(`Refresh token jti mismatch for user ${userId}`);
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }

      // Optional: Validate client_id if provided
      // For now, we skip this as it's optional per OAuth 2.0 spec

      // Generate new token pair
      const tokens = await this.authService.generateOAuthTokens(userId);

      this.logger.debug(`Token refresh successful for user ${userId}`);

      return tokens;
    } catch (error) {
      this.logger.error('Refresh token validation failed:', error.message);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @HttpCode(HttpStatus.OK)
  @Get('refresh-token')
  @Public()
  @UseGuards(RefreshTokenGuard)
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async refreshAccessToken(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user;
    const newAccessToken = await this.authService.generateAccessToken(user);
    const newRefreshToken = await this.authService.generateRefreshToken(user);
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * jwtExpiration.refreshToken,
    });
    return { accessToken: newAccessToken };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('profile')
  @ApiResponse({
    status: 200,
    description: 'Successful response',
    schema: {
      type: 'object',
      properties: {
        sub: { type: 'string' },
        email: { type: 'string' },
        iat: { type: 'number' },
        exp: { type: 'number' },
      },
    },
  })
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('is-admin')
  @ApiResponse({
    status: 200,
    description: 'Returns whether the authenticated user is an admin',
    schema: {
      type: 'object',
      properties: {
        isAdmin: { type: 'boolean' },
      },
    },
  })
  async isAdmin(@Request() req: any) {
    const isAdmin = await this.authService.isAdmin(req.user.sub);
    return { isAdmin };
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'List of all admin users',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
        },
      },
    },
  })
  async listAdmins() {
    return this.authService.listAdmins();
  }

  @Post('change-role')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiResponse({
    status: 200,
    description: 'User role has been changed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async changeRole(@Body() body: ChangeRoleDto) {
    await this.authService.changeUserRole(body.email, body.role);
    return { message: `User role changed to ${body.role}` };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('role')
  @ApiResponse({
    status: 200,
    description: 'Returns the authenticated user role',
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string' },
      },
    },
  })
  async getUserRole(@Request() req: any) {
    const role = await this.authService.getUserRole(req.user.sub);
    return { role };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('users')
  @ApiResponse({
    status: 200,
    description: 'Returns all users (admin only)',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              systemRole: { type: 'string' },
              oauth: { type: 'boolean' },
              consent: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  async getAllUsers() {
    const users = await this.authService.getAllUsers();
    return { users };
  }
}
