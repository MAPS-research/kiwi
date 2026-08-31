import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { createHash } from 'crypto';

/**
 * OAuth Service for MCP Servers
 *
 * Implements OAuth 2.1 Authorization Code Flow with PKCE (Proof Key for Code Exchange)
 * for MCP servers that require user authentication.
 *
 * Flow:
 * 1. User initiates OAuth → Generate PKCE challenge → Redirect to authorization server
 * 2. User authorizes → Authorization server redirects back with code
 * 3. Exchange code for tokens using PKCE verifier
 * 4. Store encrypted tokens in database
 * 5. Use access token for MCP server requests
 * 6. Auto-refresh tokens when they expire
 *
 * Supports:
 * - Authorization Code Flow with PKCE (RFC 7636)
 * - Token refresh (RFC 6749)
 * - Dynamic Client Registration (RFC 7591) - future
 */
@Injectable()
export class McpOAuthService {
  private readonly logger = new Logger(McpOAuthService.name);

  // In-memory storage for PKCE verifiers during OAuth flow
  // Key: state parameter, Value: { codeVerifier, serverId, userId, timestamp }
  private pendingAuthorizations: Map<
    string,
    {
      codeVerifier: string;
      serverId: string;
      userId: string;
      timestamp: number;
    }
  > = new Map();

  constructor(private configService: ConfigService) {
    // Clean up expired pending authorizations every 10 minutes
    setInterval(() => this.cleanupExpiredAuthorizations(), 10 * 60 * 1000);
  }

  /**
   * Get pending authorization data from state
   * Useful for retrieving serverId/userId before the actual token exchange
   */
  getPendingAuthorization(
    state: string,
  ): { userId: string; serverId: string } | null {
    const pending = this.pendingAuthorizations.get(state);
    if (!pending) {
      return null;
    }
    return {
      userId: pending.userId,
      serverId: pending.serverId,
    };
  }

  /**
   * Generate PKCE code verifier and challenge
   * Used for OAuth 2.1 security
   */
  generatePkceChallenge(): {
    codeVerifier: string;
    codeChallenge: string;
    codeChallengeMethod: string;
  } {
    // Generate random code verifier (43-128 characters)
    const codeVerifier = randomBytes(32).toString('base64url');

    // Generate S256 challenge from verifier
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  /**
   * Generate a secure random state parameter
   * Used to prevent CSRF attacks
   */
  generateState(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Initiate OAuth authorization flow
   * Returns the authorization URL to redirect the user to
   *
   * @param oauthMetadata OAuth configuration from McpServer
   * @param userId User initiating the authorization
   * @param serverId MCP server ID
   * @returns Authorization URL and state parameter
   */
  initiateAuthorization(
    oauthMetadata: {
      authorizationUrl: string;
      clientId: string;
      scopes?: string[];
      redirectUri: string;
    },
    userId: string,
    serverId: string,
  ): { authorizationUrl: string; state: string } {
    const { codeVerifier, codeChallenge, codeChallengeMethod } =
      this.generatePkceChallenge();
    const state = this.generateState();

    // Store PKCE verifier for later use during token exchange
    this.pendingAuthorizations.set(state, {
      codeVerifier,
      serverId,
      userId,
      timestamp: Date.now(),
    });

    // Build authorization URL
    const authUrl = new URL(oauthMetadata.authorizationUrl);
    authUrl.searchParams.set('client_id', oauthMetadata.clientId);
    authUrl.searchParams.set('redirect_uri', oauthMetadata.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', codeChallengeMethod);

    if (oauthMetadata.scopes && oauthMetadata.scopes.length > 0) {
      authUrl.searchParams.set('scope', oauthMetadata.scopes.join(' '));
    }

    this.logger.log(
      `Initiated OAuth flow for user ${userId}, server ${serverId}`,
    );

    return {
      authorizationUrl: authUrl.toString(),
      state,
    };
  }

  /**
   * Exchange authorization code for access token
   *
   * @param code Authorization code from OAuth server
   * @param state State parameter to verify PKCE
   * @param oauthMetadata OAuth configuration from McpServer
   * @returns Token response with access_token, refresh_token, expires_in
   */
  async exchangeCodeForToken(
    code: string,
    state: string,
    oauthMetadata: {
      tokenUrl: string;
      clientId: string;
      clientSecret?: string;
      redirectUri: string;
    },
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    tokenType: string;
    expiresIn?: number;
    scope?: string;
    userId: string;
    serverId: string;
  }> {
    // Retrieve PKCE verifier
    const pending = this.pendingAuthorizations.get(state);
    if (!pending) {
      throw new Error('Invalid or expired state parameter');
    }

    const { codeVerifier, userId, serverId } = pending;

    try {
      // Build token request
      const body = new URLSearchParams();
      body.set('grant_type', 'authorization_code');
      body.set('code', code);
      body.set('redirect_uri', oauthMetadata.redirectUri);
      body.set('client_id', oauthMetadata.clientId);
      body.set('code_verifier', codeVerifier);

      if (oauthMetadata.clientSecret) {
        body.set('client_secret', oauthMetadata.clientSecret);
      }

      // Exchange code for token
      const response = await fetch(oauthMetadata.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Token exchange failed: ${response.status} ${errorText}`,
        );
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const tokenResponse = await response.json();

      this.logger.log(
        `Successfully exchanged code for token (user: ${userId}, server: ${serverId})`,
      );

      // Clean up pending authorization
      this.pendingAuthorizations.delete(state);

      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenType: tokenResponse.token_type || 'Bearer',
        expiresIn: tokenResponse.expires_in,
        scope: tokenResponse.scope,
        userId,
        serverId,
      };
    } catch (error) {
      this.logger.error('Token exchange error:', error);
      this.pendingAuthorizations.delete(state);
      throw error;
    }
  }

  /**
   * Refresh an expired access token
   *
   * @param refreshToken The refresh token
   * @param oauthMetadata OAuth configuration from McpServer
   * @returns New token response
   */
  async refreshAccessToken(
    refreshToken: string,
    oauthMetadata: {
      tokenUrl: string;
      clientId: string;
      clientSecret?: string;
    },
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    tokenType: string;
    expiresIn?: number;
    scope?: string;
  }> {
    try {
      const body = new URLSearchParams();
      body.set('grant_type', 'refresh_token');
      body.set('refresh_token', refreshToken);
      body.set('client_id', oauthMetadata.clientId);

      if (oauthMetadata.clientSecret) {
        body.set('client_secret', oauthMetadata.clientSecret);
      }

      const response = await fetch(oauthMetadata.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Token refresh failed: ${response.status} ${errorText}`,
        );
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokenResponse = await response.json();

      this.logger.log('Successfully refreshed access token');

      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || refreshToken, // Some servers don't return new refresh token
        tokenType: tokenResponse.token_type || 'Bearer',
        expiresIn: tokenResponse.expires_in,
        scope: tokenResponse.scope,
      };
    } catch (error) {
      this.logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Revoke an access or refresh token
   *
   * @param token Token to revoke
   * @param tokenTypeHint 'access_token' or 'refresh_token'
   * @param oauthMetadata OAuth configuration with revocationUrl
   */
  async revokeToken(
    token: string,
    tokenTypeHint: 'access_token' | 'refresh_token',
    oauthMetadata: {
      revocationUrl?: string;
      clientId: string;
      clientSecret?: string;
    },
  ): Promise<void> {
    if (!oauthMetadata.revocationUrl) {
      this.logger.warn('No revocation URL provided, skipping token revocation');
      return;
    }

    try {
      const body = new URLSearchParams();
      body.set('token', token);
      body.set('token_type_hint', tokenTypeHint);
      body.set('client_id', oauthMetadata.clientId);

      if (oauthMetadata.clientSecret) {
        body.set('client_secret', oauthMetadata.clientSecret);
      }

      const response = await fetch(oauthMetadata.revocationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        this.logger.warn(
          `Token revocation returned ${response.status}, continuing anyway`,
        );
      } else {
        this.logger.log(`Successfully revoked ${tokenTypeHint}`);
      }
    } catch (error) {
      this.logger.error('Token revocation error:', error);
      // Don't throw - revocation is best-effort
    }
  }

  /**
   * Get the redirect URI for OAuth callbacks
   * This should be configured in the MCP server's OAuth settings
   */
  getRedirectUri(): string {
    const baseUrl =
      this.configService.get<string>('SERVER_URL') || 'http://localhost:3000';
    return `${baseUrl}/mcp/user/oauth/callback`;
  }

  /**
   * Clean up expired pending authorizations (older than 10 minutes)
   */
  private cleanupExpiredAuthorizations(): void {
    const now = Date.now();
    const expiry = 10 * 60 * 1000; // 10 minutes

    let cleaned = 0;
    for (const [state, data] of this.pendingAuthorizations.entries()) {
      if (now - data.timestamp > expiry) {
        this.pendingAuthorizations.delete(state);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired OAuth authorizations`);
    }
  }

  /**
   * Calculate expiration date from expires_in seconds
   */
  calculateExpirationDate(expiresIn?: number): Date | null {
    if (!expiresIn) return null;
    return new Date(Date.now() + expiresIn * 1000);
  }

  /**
   * Check if a token is expired or about to expire (within 5 minutes)
   */
  isTokenExpired(expiresAt?: Date | null): boolean {
    if (!expiresAt) return false;

    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes buffer
    return now.getTime() + buffer >= expiresAt.getTime();
  }
}
