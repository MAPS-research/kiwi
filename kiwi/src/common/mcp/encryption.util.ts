import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Encryption utilities for sensitive data (OAuth tokens)
 *
 * Uses AES-256-GCM for authenticated encryption
 * Key derivation from environment variable using scrypt
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment or generate a default (for development)
 */
function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'ENCRYPTION_KEY or SESSION_SECRET environment variable must be set',
    );
  }
  return secret;
}

/**
 * Encrypt a string value
 * Returns: base64(salt + iv + authTag + ciphertext)
 */
export async function encrypt(plaintext: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = (await scryptAsync(getEncryptionSecret(), salt, 32)) as Buffer;
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Concatenate: salt + iv + authTag + ciphertext
  const result = Buffer.concat([salt, iv, authTag, ciphertext]);

  return result.toString('base64');
}

/**
 * Decrypt an encrypted string value
 * Input: base64(salt + iv + authTag + ciphertext)
 */
export async function decrypt(encrypted: string): Promise<string> {
  const buffer = Buffer.from(encrypted, 'base64');

  // Extract components
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = buffer.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const ciphertext = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = (await scryptAsync(getEncryptionSecret(), salt, 32)) as Buffer;

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}
