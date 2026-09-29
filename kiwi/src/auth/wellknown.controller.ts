import { Controller, Get, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from './auth.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtKeysService } from './jwt-keys.service';

/**
 * Controller for OAuth 2.1 discovery endpoints (RFC 8414, RFC 9728)
 * Required for MCP (Model Context Protocol) client discovery
 * Also provides JWKS endpoint for JWT public key distribution
 */
@Controller('.well-known')
@ApiTags('OAuth Discovery')
export class WellKnownController {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtKeysService: JwtKeysService,
  ) {}

  /**
   * Build authorization server metadata for a given issuer
   * Shared logic for root and path-based discovery
   */
  private buildAuthorizationServerMetadata(issuer: string) {
    const serverUrl =
      this.configService.get('SERVER_URL') || 'http://localhost:3000';

    return {
      issuer,
      authorization_endpoint: `${serverUrl}/auth/authorize`,
      // OAuth 2.1 authorization endpoint with PKCE
      token_endpoint: `${serverUrl}/auth/token`,
      // Token exchange endpoint
      registration_endpoint: `${serverUrl}/auth/clients/register`,
      // Dynamic client registration endpoint (RFC 7591)
      jwks_uri: `${serverUrl}/.well-known/jwks.json`,
      // JWKS endpoint for RS256 public key verification
      scopes_supported: ['openid', 'profile', 'email'],
      response_types_supported: ['code'],
      // Only authorization code flow supported
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['none'],
      // Public clients (PKCE instead of client secret)
      code_challenge_methods_supported: ['S256'], // PKCE support
      service_documentation: `${serverUrl}/docs`,
      ui_locales_supported: ['en-US'],
      revocation_endpoint: `${serverUrl}/auth/refresh-token`, // Refresh token revocation
      revocation_endpoint_auth_methods_supported: ['none'],
    };
  }

  /**
   * Build protected resource metadata for a given resource URI
   * Shared logic for root and path-based discovery
   */
  private buildProtectedResourceMetadata(resource: string) {
    const serverUrl =
      this.configService.get('SERVER_URL') || 'http://localhost:3000';

    return {
      resource,
      // The MCP server resource URI
      authorization_servers: [serverUrl],
      // Authorization servers that can issue tokens for this resource
      jwks_uri: `${serverUrl}/.well-known/jwks.json`,
      // JWKS endpoint for RS256 public key verification
      bearer_methods_supported: ['header'],
      // Bearer token methods (Authorization: Bearer <token>)
      scopes_supported: [
        'openid',
        'profile',
        'email',
        'mcp:tools',
        'mcp:resources',
        'mcp:prompts',
      ],
      // MCP-specific scopes
      resource_documentation: `${serverUrl}/docs`,
      resource_policy_uri: `${serverUrl}/policy`,
      resource_tos_uri: `${serverUrl}/tos`,
      resource_signing_alg_values_supported: ['RS256'],
      // Using RS256 (asymmetric) signing with JWKS
    };
  }

  /**
   * OAuth Authorization Server Metadata (RFC 8414)
   * Provides discovery information about the OAuth authorization server
   */
  @Get('oauth-authorization-server')
  @Public()
  @ApiOperation({
    summary: 'OAuth Authorization Server Metadata',
    description: 'RFC 8414 compliant authorization server metadata endpoint',
  })
  @ApiResponse({
    status: 200,
    description: 'Authorization server metadata',
  })
  getAuthorizationServerMetadata() {
    const serverUrl =
      this.configService.get('SERVER_URL') || 'http://localhost:3000';
    return this.buildAuthorizationServerMetadata(serverUrl);
  }

  /**
   * OAuth Authorization Server Metadata with path support (RFC 8414 Section 3.1)
   * Handles path-based issuer discovery: /.well-known/oauth-authorization-server/:path*
   */
  @Get('oauth-authorization-server/*path')
  @Public()
  @ApiOperation({
    summary: 'OAuth Authorization Server Metadata (path-based)',
    description:
      'RFC 8414 compliant authorization server metadata endpoint with path support',
  })
  @ApiResponse({
    status: 200,
    description: 'Authorization server metadata for path-based issuer',
  })
  getAuthorizationServerMetadataWithPath(@Param('path') path: string[]) {
    const serverUrl =
      this.configService.get('SERVER_URL') || 'http://localhost:3000';
    const issuer = `${serverUrl}/${path.join('/')}`;
    return this.buildAuthorizationServerMetadata(issuer);
  }

  /**
   * OAuth Protected Resource Metadata (RFC 9728)
   * Provides MCP-specific discovery information about the protected resource
   */
  @Get('oauth-protected-resource')
  @Public()
  @ApiOperation({
    summary: 'OAuth Protected Resource Metadata',
    description:
      'RFC 9728 compliant protected resource metadata endpoint for MCP discovery',
  })
  @ApiResponse({
    status: 200,
    description: 'Protected resource metadata',
  })
  getProtectedResourceMetadata() {
    const serverUrl =
      this.configService.get('SERVER_URL') || 'http://localhost:3000';
    return this.buildProtectedResourceMetadata(`${serverUrl}/mcp`);
  }

  /**
   * OAuth Protected Resource Metadata with path support (RFC 9728)
   * Handles path-based resource discovery: /.well-known/oauth-protected-resource/:path*
   */
  @Get('oauth-protected-resource/*path')
  @Public()
  @ApiOperation({
    summary: 'OAuth Protected Resource Metadata (path-based)',
    description:
      'RFC 9728 compliant protected resource metadata endpoint with path support',
  })
  @ApiResponse({
    status: 200,
    description: 'Protected resource metadata for path-based resource',
  })
  getProtectedResourceMetadataWithPath(@Param('path') path: string[]) {
    const serverUrl =
      this.configService.get('SERVER_URL') || 'http://localhost:3000';
    const resource = `${serverUrl}/${path.join('/')}`;
    return this.buildProtectedResourceMetadata(resource);
  }

  /**
   * JSON Web Key Set (JWKS) endpoint
   * Exposes the public key for JWT verification by external services.
   * External services (like codegen) can fetch this on startup and
   * verify JWTs locally without calling back to kiwi.
   */
  @Get('jwks.json')
  @Public()
  @ApiOperation({
    summary: 'JSON Web Key Set',
    description:
      'JWKS endpoint exposing public keys for JWT verification. ' +
      'External services can cache this on startup for local token validation.',
  })
  @ApiResponse({
    status: 200,
    description: 'JWKS containing RS256 public key(s)',
  })
  getJwks() {
    return this.jwtKeysService.getJwks();
  }
}
