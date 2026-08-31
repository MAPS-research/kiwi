# JWT Configuration Guide

This guide covers JWT (JSON Web Token) configuration for Kiwi and how external services can verify Kiwi-issued tokens.

## Overview

Kiwi uses **RS256** (RSA Signature with SHA-256) for JWT signing. This asymmetric algorithm uses:
- **Private key**: Used by Kiwi to sign JWTs (kept secret)
- **Public key**: Used by external services to verify JWTs (publicly available via JWKS)

This approach allows external services to verify Kiwi tokens without sharing secrets.

## Configuration Options

### Development (Default)

No configuration required. Kiwi auto-generates ephemeral RSA keys on startup.

**Note**: Ephemeral keys are regenerated on each restart, which invalidates all previously issued tokens.

### Production

For production, set persistent keys via environment variables:

```bash
# .env
JWT_PRIVATE_KEY=<base64-encoded-private-key>
JWT_PUBLIC_KEY=<base64-encoded-public-key>
```

#### Generating Keys

```bash
# Generate 2048-bit RSA key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Base64 encode for environment variables
echo "JWT_PRIVATE_KEY=$(base64 < private.pem | tr -d '\n')"
echo "JWT_PUBLIC_KEY=$(base64 < public.pem | tr -d '\n')"

# Clean up (or store securely)
rm private.pem public.pem
```

#### macOS Note

On macOS, use `base64` without the `-w0` flag (it's the default behavior).

#### Linux Note

On Linux, you may need to use `base64 -w0` to avoid line wrapping:

```bash
echo "JWT_PRIVATE_KEY=$(base64 -w0 < private.pem)"
echo "JWT_PUBLIC_KEY=$(base64 -w0 < public.pem)"
```

### Fallback to HS256

If RS256 keys are not configured, Kiwi falls back to HS256 using `JWT_SECRET`:

```bash
# .env (fallback - not recommended for production)
JWT_SECRET=your-secret-key
```

**Warning**: HS256 requires sharing the secret with external services, which is a security risk.

## JWKS Endpoint

Kiwi exposes a JWKS (JSON Web Key Set) endpoint for public key distribution:

```
GET /.well-known/jwks.json
```

Example response:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "a1b2c3d4",
      "alg": "RS256",
      "n": "0vx7agoebG...",
      "e": "AQAB"
    }
  ]
}
```

## Verifying Kiwi JWTs

### Python (PyJWT)

```python
import jwt
from jwt import PyJWKClient

KIWI_JWKS_URL = "https://your-kiwi-server/.well-known/jwks.json"

# Initialize JWKS client (caches keys automatically)
jwks_client = PyJWKClient(KIWI_JWKS_URL)

def verify_kiwi_token(token: str) -> dict:
    """Verify a Kiwi JWT and return the payload."""
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        options={"verify_aud": False}  # Kiwi doesn't set audience
    )
    return payload

# Usage
try:
    payload = verify_kiwi_token(access_token)
    user_id = payload["sub"]
    email = payload.get("email")
    print(f"Authenticated user: {user_id} ({email})")
except jwt.ExpiredSignatureError:
    print("Token has expired")
except jwt.InvalidTokenError as e:
    print(f"Invalid token: {e}")
```

### TypeScript/Node.js (jose)

```typescript
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

const KIWI_JWKS_URL = 'https://your-kiwi-server/.well-known/jwks.json';

// Initialize JWKS client (caches keys automatically)
const JWKS = createRemoteJWKSet(new URL(KIWI_JWKS_URL));

interface KiwiJWTPayload extends JWTPayload {
  sub: string;
  email?: string;
  systemRole?: string;
}

async function verifyKiwiToken(token: string): Promise<KiwiJWTPayload> {
  const { payload } = await jwtVerify(token, JWKS, {
    algorithms: ['RS256'],
  });
  return payload as KiwiJWTPayload;
}

// Usage
try {
  const payload = await verifyKiwiToken(accessToken);
  console.log(`Authenticated user: ${payload.sub}`);
} catch (error) {
  console.error('Token verification failed:', error.message);
}
```

### Go

```go
package main

import (
    "context"
    "fmt"
    "github.com/lestrrat-go/jwx/v2/jwk"
    "github.com/lestrrat-go/jwx/v2/jwt"
)

const kiwiJWKSURL = "https://your-kiwi-server/.well-known/jwks.json"

func verifyKiwiToken(tokenString string) (jwt.Token, error) {
    // Fetch JWKS (consider caching in production)
    keySet, err := jwk.Fetch(context.Background(), kiwiJWKSURL)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
    }

    // Parse and verify token
    token, err := jwt.Parse(
        []byte(tokenString),
        jwt.WithKeySet(keySet),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to verify token: %w", err)
    }

    return token, nil
}

// Usage
func main() {
    token, err := verifyKiwiToken(accessToken)
    if err != nil {
        fmt.Printf("Verification failed: %v\n", err)
        return
    }

    userID, _ := token.Get("sub")
    fmt.Printf("Authenticated user: %v\n", userID)
}
```

## JWT Payload Structure

Kiwi JWTs contain the following claims:

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | User ID (UUID) |
| `email` | string | User's email address |
| `systemRole` | string | User's system role (`student`, `professor`, `admin`) |
| `iat` | number | Issued at timestamp |
| `exp` | number | Expiration timestamp |

Example payload:
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "student@example.edu",
  "systemRole": "student",
  "iat": 1704067200,
  "exp": 1704153600
}
```

## Best Practices

### 1. Cache the Public Key

Fetch the JWKS once on startup and cache it. Most JWT libraries handle this automatically.

```python
# PyJWKClient caches by default
jwks_client = PyJWKClient(KIWI_JWKS_URL)
```

### 2. Handle Key Rotation

Periodically refresh the JWKS to handle key rotation (e.g., every 24 hours or on verification failure).

```python
# Force refresh on unknown key ID
try:
    signing_key = jwks_client.get_signing_key_from_jwt(token)
except jwt.exceptions.PyJWKClientError:
    # Key not found, might be rotated - create new client to refresh
    jwks_client = PyJWKClient(KIWI_JWKS_URL)
    signing_key = jwks_client.get_signing_key_from_jwt(token)
```

### 3. Validate Token Expiration

Always check the `exp` claim. Most JWT libraries do this automatically.

### 4. Use HTTPS in Production

Always use HTTPS for the JWKS endpoint in production to prevent MITM attacks.

### 5. Don't Store Tokens Insecurely

- Never log full tokens
- Use secure storage (HTTP-only cookies, secure session storage)
- Clear tokens on logout

## Troubleshooting

### "Invalid signature" Error

1. Check if the token was issued by the correct Kiwi instance
2. Verify the JWKS URL is correct
3. Try refreshing the JWKS cache

### "Token expired" Error

1. Check system clock synchronization
2. Request a new token using refresh token flow

### JWKS Fetch Timeout

1. Verify network connectivity to Kiwi server
2. Check firewall rules
3. Consider increasing timeout or retrying

## Related Documentation

- [MCP Developer Guide](./MCP_DEVELOPER_GUIDE.md) - OAuth flow and MCP client setup
- [OAuth Configuration](./oauth.md) - Google OAuth setup
