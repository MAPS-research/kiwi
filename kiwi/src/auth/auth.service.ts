import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClassService } from 'src/class/class.service';
import { UserSessionService } from 'src/common/database/user-session.service';
import { UserService } from 'src/common/database/user.service';
import { RedisService } from 'src/common/redis/redis.service';
import { jwtExpiration } from './auth.constants';
import { v4 as uuidv4 } from 'uuid';
import { PendingEnrollmentService } from 'src/common/database/pending-enrollment.service';
import * as bcrypt from 'bcryptjs';
import { WhitelistService } from './whitelist/whitelist.service';
import { PendingAdminService } from 'src/common/database/pending-admin.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private userService: UserService,
    private userSessionService: UserSessionService,
    private pendingEnrollmentService: PendingEnrollmentService,
    private classService: ClassService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private whitelistService: WhitelistService,
    private pendingAdminService: PendingAdminService,
    private configService: ConfigService,
  ) {}

  async generateAccessToken(user: {
    id: string;
    email: string;
  }): Promise<string> {
    const payload = { sub: user.id, email: user.email };

    return this.jwtService.signAsync(payload);
  }

  async generateRefreshToken(user: {
    id: string;
    email: string;
  }): Promise<string> {
    const payload = { sub: user.id, email: user.email };
    const refresh_token_jwtid = uuidv4();

    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: jwtExpiration.refreshToken,
      jwtid: refresh_token_jwtid,
    });

    await this.redisService.set(
      `refresh_token:${user.id}`,
      refresh_token_jwtid,
      jwtExpiration.refreshToken,
    );

    return refresh_token;
  }

  async createUserSession(userId: string, classId?: string): Promise<string> {
    const ratio = Math.random(); // ratio of P:N, 0 ≤ Math.random() < 1
    this.logger.debug('ratio', ratio);

    const researchNotesForSession = {
      PN_STUDY: ratio,
    };

    // get classes the user is enrolled in
    const classIds = await this.userService.classIdsByUserId(userId);
    // throw an error if the user is not enrolled in any class
    let userIsAdmin = false;
    if (classIds.length === 0) {
      // check if the user is an admin
      const user = await this.userService.user({
        id: userId,
      });
      if (user && user.systemRole === 'admin') {
        userIsAdmin = true;
      }

      if (!userIsAdmin) {
        // if the user is an admin, do not enforce the check
        throw new UnauthorizedException('User not enrolled in any class');
      }
    }

    // check if classId is in the list of classIds
    if (!classId && !userIsAdmin) {
      classId = classIds[0];
    } else if (classId && !classIds.includes(classId)) {
      throw new UnauthorizedException('User not enrolled in this class');
    }
    if (userIsAdmin) {
      this.logger.debug('create session for admin', userId);
    } else {
      this.logger.debug(
        'create session for userId',
        userId,
        ' classId',
        classId,
      );
    }

    // User is authenticated, so create a user session
    const userSession = await this.userSessionService.createUserSession(
      userId,
      researchNotesForSession,
    );
    // PERSONALIZATION -- SESSION
    // START THE TIMEOUT AND CALL THE THIS.MATERIAL-PERSONALIZATION.START(START_SESSION_TIME)
    // const startTime = new Date();
    // await this.redisService.set(
    //   `session_start_time:${userSession.id}`,
    //   startTime.toISOString(),
    // );
    return userSession.id;
  }

  async createDevUser(): Promise<any> {
    const userId = `dev-${uuidv4()}`;
    const emailDomain =
      this.configService.get('SYNTHETIC_EMAIL_DOMAIN') || 'kiwi.local';
    const email = `${userId}@${emailDomain}`;

    // Create the user here
    await this.userService.createUser({
      email: email,
      oauthId: userId,
      oauth: false,
      consent: true,
      systemRole: 'admin',
    });

    return {
      id: userId,
      email,
    };
  }

  async registerUser(
    email: string,
    password: string,
    classId: string,
  ): Promise<any> {
    const existing = await this.userService.user({ email });

    if (existing) {
      throw new BadRequestException('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await this.userService.createUser({
      email,
      oauthId: uuidv4(),
      oauth: false,
      passwordHash,
      passwordSalt: salt,
    });

    try {
      await this.whitelistService.create({ email });
    } catch (e) {
      this.logger.debug('whitelist creation failed', e);
    }

    try {
      await this.classService.enroll(classId, [email]);
    } catch (e) {
      this.logger.debug('class enrollment failed', e);
    }

    return { id: user.id, email: user.email };
  }

  async resetPassword(email: string, password: string): Promise<void> {
    const user = await this.userService.user({ email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await this.userService.updateUser({
      where: { id: user.id },
      data: { passwordHash, passwordSalt: salt },
    });
  }

  async validateUser(email: string, password: string): Promise<any | null> {
    const user = await this.userService.user({ email });
    if (!user || !user.passwordHash || !user.passwordSalt) {
      return null;
    }
    const hash = await bcrypt.hash(password, user.passwordSalt);
    const valid = hash === user.passwordHash;
    if (!valid) {
      return null;
    }
    return { id: user.oauthId, email: user.email };
  }

  async authenticate(req: any): Promise<any> {
    try {
      const authUser = req.user;

      const { id, email } = authUser;

      let user = await this.userService.user({
        oauthId: id,
      });

      // Create user if not exists
      if (user === null) {
        user = await this.userService.createUser({
          email: email,
          oauthId: id,
          oauth: true,
        });
      }

      if (!user) {
        throw new UnauthorizedException();
      }

      // Check is user is a pending professor
      const classesPendingProfessor =
        await this.classService.checkPendingProfessor(user.id);

      if (classesPendingProfessor) {
        const promises = classesPendingProfessor.classIds.map((classId) =>
          this.classService.assignProfessor(classId, user.id),
        );

        await Promise.all(promises);
      }

      // Check pending enrollments
      const pendingEnrollments =
        await this.pendingEnrollmentService.pendingEnrollments({
          where: {
            userEmail: user.email,
            status: 'not enrolled',
          },
        });
      if (pendingEnrollments.length > 0) {
        await Promise.all(
          pendingEnrollments.map(async (pendingEnrollment) => {
            await this.classService.enroll(pendingEnrollment.classId, [
              user.email,
            ]);
            await this.pendingEnrollmentService.updatePendingEnrollment({
              where: { id: pendingEnrollment.id },
              data: {
                status: 'enrolled',
              },
            });
          }),
        );
      }

      // Check pending admin
      const pendingAdmin = await this.pendingAdminService.pendingAdmin({
        email: user.email,
        status: 'pending',
      });

      if (pendingAdmin) {
        // Update user to admin role
        await this.userService.updateUser({
          where: { id: user.id },
          data: { systemRole: 'admin' },
        });

        // Mark pending admin as activated
        await this.pendingAdminService.updatePendingAdmin({
          where: { id: pendingAdmin.id },
          data: { status: 'activated' },
        });

        this.logger.log(`Activated admin privileges for user ${user.email}`);
      }

      // User is authenticated, so create a user session
      // Create the user session after checking for pending enrollments
      const userSessionId = await this.createUserSession(user.id);

      // Attach user session to session
      req.session.userSessionId = userSessionId;
      // Attach user id to session
      req.session.userId = user.id;

      // Assign user to control or test group
      const { researchNotes: userResearchNotes } = user;
      if (userResearchNotes === null) {
        // Choose control or test group
        const group = Math.random() < 0.5 ? 'control' : 'test';

        // Assign user to group
        const newResearchNotes = {
          CONTEXT_STUDY: group,
        };

        await this.userService.updateUser({
          where: { id: user.id },
          data: {
            researchNotes: newResearchNotes,
          },
        });
      }

      const access_token = await this.generateAccessToken(user);

      const refresh_token = await this.generateRefreshToken(user);

      return {
        access_token,
        refresh_token,
      };
    } catch (e) {
      this.logger.error(e);
      throw new UnauthorizedException();
    }
  }

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.userService.user({
      id: userId,
    });

    return user?.systemRole === 'admin';
  }

  async listAdmins(): Promise<{ id: string; email: string }[]> {
    const admins = await this.userService.users({
      where: { systemRole: 'admin' },
    });

    return admins.map((admin) => ({
      id: admin.id,
      email: admin.email,
    }));
  }

  async changeUserRole(email: string, role: 'user' | 'admin' | 'instructor'): Promise<void> {
    const user = await this.userService.user({ email });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.systemRole === role) {
      throw new BadRequestException(
        `User is already assigned the role: ${role}`,
      );
    }

    await this.userService.updateUser({
      where: { id: user.id },
      data: { systemRole: role },
    });

    this.logger.log(`User ${email} role changed to ${role}`);
  }

  async getUserRole(userId: string): Promise<string> {
    const user = await this.userService.user({
      id: userId,
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user.systemRole;
  }

  async getAllUsers(): Promise<{ id: string; email: string; systemRole: string; oauth: boolean; consent: boolean | null }[]> {
    const users = await this.userService.users({});

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      systemRole: user.systemRole,
      oauth: user.oauth,
      consent: user.consent,
    }));
  }

  // ============================================================================
  // OAuth Authorization Code Flow Methods
  // ============================================================================

  /**
   * Store pending OAuth authorization request in Redis
   */
  async storePendingOAuthRequest(
    sessionId: string,
    params: {
      clientId: string;
      redirectUri: string;
      state: string;
      codeChallenge: string;
      codeChallengeMethod: string;
      scope?: string;
      responseType: string;
    },
  ): Promise<void> {
    await this.redisService.set(
      `oauth:pending:${sessionId}`,
      JSON.stringify(params),
      600, // 10 minutes expiration
    );
  }

  /**
   * Retrieve pending OAuth authorization request from Redis
   */
  async getPendingOAuthRequest(
    sessionId: string,
  ): Promise<{
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    scope?: string;
    responseType: string;
  } | null> {
    const data = await this.redisService.get(`oauth:pending:${sessionId}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  /**
   * Remove pending OAuth request from Redis
   */
  async removePendingOAuthRequest(sessionId: string): Promise<void> {
    await this.redisService.del(`oauth:pending:${sessionId}`);
  }

  /**
   * Generate and store authorization code
   */
  async generateAuthorizationCode(params: {
    userId: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    scope?: string;
  }): Promise<string> {
    const authCode = uuidv4();

    await this.redisService.set(
      `oauth:code:${authCode}`,
      JSON.stringify(params),
      600, // 10 minutes expiration
    );

    return authCode;
  }

  /**
   * Retrieve and validate authorization code
   */
  async getAuthorizationCode(code: string): Promise<{
    userId: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    scope?: string;
  } | null> {
    const data = await this.redisService.get(`oauth:code:${code}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  /**
   * Remove authorization code from Redis (one-time use)
   */
  async removeAuthorizationCode(code: string): Promise<void> {
    await this.redisService.del(`oauth:code:${code}`);
  }

  /**
   * Validate PKCE code verifier against stored code challenge
   */
  async validatePKCE(
    codeVerifier: string,
    codeChallenge: string,
    codeChallengeMethod: string,
  ): Promise<boolean> {
    if (codeChallengeMethod !== 'S256') {
      this.logger.warn(`Unsupported code challenge method: ${codeChallengeMethod}`);
      return false;
    }

    // Compute SHA256 hash of code verifier
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    const computedChallenge = hash.toString('base64url');

    return computedChallenge === codeChallenge;
  }

  /**
   * Generate tokens for OAuth client (without session)
   */
  async generateOAuthTokens(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  }> {
    const user = await this.userService.user({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = await this.generateAccessToken({
      id: user.id,
      email: user.email,
    });

    const refreshToken = await this.generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: jwtExpiration.accessToken,
    };
  }

  // ============================================================================
  // MCP OAuth Token Methods
  // These methods generate tokens for MCP OAuth clients with separate JTI tracking
  // to avoid conflicts with user session token rotation.
  // ============================================================================

  /**
   * Generate MCP-specific refresh token with separate JTI tracking.
   * Stores JTI in Redis at `mcp_refresh_token:{userId}:{mcpServerId}`.
   */
  async generateMcpRefreshToken(
    user: { id: string; email: string },
    mcpServerId: string,
  ): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      mcp_server_id: mcpServerId,
      token_type: 'mcp',
    };
    const refresh_token_jwtid = uuidv4();

    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: jwtExpiration.refreshToken,
      jwtid: refresh_token_jwtid,
    });

    // Store JTI in MCP-specific Redis key
    await this.redisService.set(
      `mcp_refresh_token:${user.id}:${mcpServerId}`,
      refresh_token_jwtid,
      jwtExpiration.refreshToken,
    );

    return refresh_token;
  }

  /**
   * Generate tokens for MCP OAuth client with separate JTI tracking.
   * This allows MCP tokens to work independently of user session tokens.
   */
  async generateMcpOAuthTokens(
    userId: string,
    mcpServerId: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  }> {
    const user = await this.userService.user({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = await this.generateAccessToken({
      id: user.id,
      email: user.email,
    });

    const refreshToken = await this.generateMcpRefreshToken(
      { id: user.id, email: user.email },
      mcpServerId,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: jwtExpiration.accessToken,
    };
  }

  /**
   * Validate MCP refresh token JTI against Redis.
   */
  async validateMcpRefreshToken(
    userId: string,
    mcpServerId: string,
    jti: string,
  ): Promise<boolean> {
    const storedJti = await this.redisService.get(
      `mcp_refresh_token:${userId}:${mcpServerId}`,
    );
    return storedJti === jti;
  }

  /**
   * Revoke MCP refresh token by deleting JTI from Redis.
   * Called when user disconnects from an MCP server.
   */
  async revokeMcpRefreshToken(
    userId: string,
    mcpServerId: string,
  ): Promise<void> {
    await this.redisService.del(`mcp_refresh_token:${userId}:${mcpServerId}`);
    this.logger.log(
      `Revoked MCP refresh token for user ${userId}, server ${mcpServerId}`,
    );
  }
}
