import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * JWT Keys Service
 *
 * Manages RSA key pair for RS256 JWT signing.
 * Keys can be provided via environment variables or auto-generated on startup.
 *
 * Environment variables:
 * - JWT_PRIVATE_KEY: Base64-encoded PEM private key
 * - JWT_PUBLIC_KEY: Base64-encoded PEM public key
 *
 * If not provided, generates ephemeral keys on startup (for development).
 * In production, always provide keys via environment variables.
 */
@Injectable()
export class JwtKeysService implements OnModuleInit {
  private readonly logger = new Logger(JwtKeysService.name);

  private privateKey: string;
  private publicKey: string;
  private keyId: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeKeys();
  }

  private async initializeKeys() {
    const privateKeyEnv = this.configService.get<string>('JWT_PRIVATE_KEY');
    const publicKeyEnv = this.configService.get<string>('JWT_PUBLIC_KEY');

    if (privateKeyEnv && publicKeyEnv) {
      // Load keys from environment (Base64 encoded)
      this.privateKey = Buffer.from(privateKeyEnv, 'base64').toString('utf-8');
      this.publicKey = Buffer.from(publicKeyEnv, 'base64').toString('utf-8');
      this.logger.log('Loaded JWT keys from environment variables');
    } else {
      // Generate ephemeral keys for development
      this.logger.warn(
        'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY not set. Generating ephemeral keys. ' +
          'This is fine for development but NOT recommended for production.',
      );
      const { privateKey, publicKey } = await this.generateKeyPair();
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    }

    // Generate key ID from public key hash
    this.keyId = this.generateKeyId(this.publicKey);
    this.logger.log(`JWT Key ID: ${this.keyId}`);
  }

  private generateKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair(
        'rsa',
        {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        },
        (err, publicKey, privateKey) => {
          if (err) reject(err);
          else resolve({ privateKey, publicKey });
        },
      );
    });
  }

  private generateKeyId(publicKey: string): string {
    const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
    return hash.substring(0, 8);
  }

  /**
   * Get private key for JWT signing
   */
  getPrivateKey(): string {
    return this.privateKey;
  }

  /**
   * Get public key for JWT verification
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Get key ID
   */
  getKeyId(): string {
    return this.keyId;
  }

  /**
   * Get JWKS (JSON Web Key Set) for the public key
   */
  getJwks(): {
    keys: Array<{
      kty: string;
      use: string;
      kid: string;
      alg: string;
      n: string;
      e: string;
    }>;
  } {
    const publicKeyObject = crypto.createPublicKey(this.publicKey);
    const jwk = publicKeyObject.export({ format: 'jwk' });

    return {
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          kid: this.keyId,
          alg: 'RS256',
          n: jwk.n as string,
          e: jwk.e as string,
        },
      ],
    };
  }
}
