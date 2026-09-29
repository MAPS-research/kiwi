import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';
import { Prisma, OAuthClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

export interface ClientRegistrationRequest {
  redirect_uris?: string[];
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  client_name?: string;
  mcp_server_id?: string; // Optional link to MCP server for separate JTI tracking
}

export interface ClientRegistrationResponse {
  client_id: string;
  client_secret?: string;
  client_id_issued_at: number;
  redirect_uris: string[];
  token_endpoint_auth_method: string;
  grant_types: string[];
  response_types: string[];
  scope: string;
}

@Injectable()
export class OAuthClientService {
  constructor(private database: DatabaseService) {}

  /**
   * Register a new OAuth client according to RFC 7591
   */
  async registerClient(
    request: ClientRegistrationRequest,
  ): Promise<ClientRegistrationResponse> {
    // Validate redirect_uris
    if (!request.redirect_uris || request.redirect_uris.length === 0) {
      throw new BadRequestException('redirect_uris is required');
    }

    // Validate that redirect URIs use proper protocols
    // - localhost/127.0.0.1: HTTP only (prevents javascript://, file://, etc.)
    // - other hosts: HTTPS only
    for (const uri of request.redirect_uris) {
      const url = new URL(uri);
      if (
        (['localhost', '127.0.0.1'].includes(url.hostname) &&
          url.protocol !== 'http:') ||
        (!['localhost', '127.0.0.1'].includes(url.hostname) &&
          url.protocol !== 'https:')
      ) {
        throw new BadRequestException(
          `redirect_uri must use HTTPS (or HTTP for localhost): ${uri}`,
        );
      }
    }

    // Default values
    const tokenEndpointAuthMethod =
      request.token_endpoint_auth_method || 'none';
    const grantTypes = request.grant_types || [
      'authorization_code',
      'refresh_token',
    ];
    const responseTypes = request.response_types || ['code'];
    const scope = request.scope || 'openid profile email';

    // Generate client_id
    const clientId = randomUUID();

    // Generate client_secret for confidential clients
    let clientSecret: string | undefined;
    let hashedClientSecret: string | undefined;

    if (tokenEndpointAuthMethod !== 'none') {
      clientSecret = randomUUID();
      const saltRounds = 10;
      hashedClientSecret = await bcrypt.hash(clientSecret, saltRounds);
    }

    // Create the client in the database
    const client = await this.database.oAuthClient.create({
      data: {
        clientId,
        clientSecret: hashedClientSecret,
        redirectUris: request.redirect_uris,
        grantTypes,
        responseTypes,
        scope,
        tokenEndpointAuthMethod,
        mcpServerId: request.mcp_server_id || null,
      },
    });

    // Prepare the response according to RFC 7591
    const response: ClientRegistrationResponse = {
      client_id: client.clientId,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      scope: client.scope,
    };

    // Include client_secret in response only for confidential clients
    if (clientSecret) {
      response.client_secret = clientSecret;
    }

    return response;
  }

  /**
   * Find an OAuth client by client_id
   */
  async findByClientId(clientId: string): Promise<OAuthClient | null> {
    return this.database.oAuthClient.findUnique({
      where: { clientId },
    });
  }

  /**
   * Validate a client during authorization flow
   * Checks if the client exists and if the redirect_uri is registered
   */
  async validateClient(
    clientId: string,
    redirectUri: string,
  ): Promise<OAuthClient> {
    const client = await this.findByClientId(clientId);

    if (!client) {
      throw new UnauthorizedException('Invalid client_id');
    }

    // Validate redirect_uri matches one of the registered URIs
    if (!client.redirectUris.includes(redirectUri)) {
      throw new BadRequestException('Invalid redirect_uri');
    }

    return client;
  }

  /**
   * Validate client credentials for confidential clients
   */
  async validateClientCredentials(
    clientId: string,
    clientSecret: string,
  ): Promise<OAuthClient> {
    const client = await this.findByClientId(clientId);

    if (!client) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    if (client.tokenEndpointAuthMethod === 'none') {
      throw new UnauthorizedException(
        'Client does not use client authentication',
      );
    }

    if (!client.clientSecret) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    // Verify the client_secret
    const isValid = await bcrypt.compare(clientSecret, client.clientSecret);

    if (!isValid) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    return client;
  }

  /**
   * Generic find method for Prisma queries
   */
  async findUnique<T extends Prisma.OAuthClientFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.OAuthClientFindUniqueArgs>,
  ) {
    return this.database.oAuthClient.findUnique<T>(args);
  }

  /**
   * Generic find many method for Prisma queries
   */
  async findMany<T extends Prisma.OAuthClientFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.OAuthClientFindManyArgs>,
  ) {
    return this.database.oAuthClient.findMany<T>(args);
  }
}
