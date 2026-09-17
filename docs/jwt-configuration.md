# JWT configuration

How Kiwi signs its JSON Web Tokens, how to configure the signing keys, and how an
external service can verify Kiwi tokens. For operators and for developers of
services that accept Kiwi tokens (Kiwi Apps, MCP servers).

## Signing modes

Kiwi picks the algorithm at startup (`kiwi/src/auth/auth.module.ts`):

| Configuration | Algorithm | JWKS |
|---|---|---|
| `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` both set | RS256 with those keys | Publishes the matching public key |
| Either key missing | HS256 with `JWT_SECRET` | Publishes an **unrelated** key; see below |

Without both keys, `/.well-known/jwks.json` still responds.
`kiwi/src/auth/jwt-keys.service.ts` generates a throwaway RSA key pair at each
startup and publishes its public half, but no token is signed with it. JWKS
verification therefore only works when both keys are set.

In HS256 mode, tokens stay valid across restarts because `JWT_SECRET` does not
change. `JWT_SECRET` must be set to a long random value; the value in
`kiwi/.env.example` is a placeholder. Verifying HS256 tokens elsewhere means
sharing the secret, so use RS256 whenever another service needs to verify
tokens.

## Configuring RS256

Generate a key pair and base64-encode both PEM files. Run these anywhere; the
commands work on macOS and Linux.

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

echo "JWT_PRIVATE_KEY=$(base64 < private.pem | tr -d '\n')"
echo "JWT_PUBLIC_KEY=$(base64 < public.pem | tr -d '\n')"
```

Put the two lines in `kiwi/.env`, restart the backend, and delete or securely
store the PEM files.

Kiwi holds one key pair at a time. The JWKS contains a single key whose `kid` is
derived from the public key. To rotate, restart with new keys. Every
outstanding access, refresh and app token becomes invalid, and users must sign
in again.

## JWKS endpoint

```
GET /.well-known/jwks.json
```

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

The endpoint is public. It is also advertised as `jwks_uri` in
`/.well-known/oauth-authorization-server`.

Signed tokens do not include a `kid` header. Because the set holds exactly one
key, verifiers should use that key rather than look it up by `kid`; the
examples below do this.

## Token types

All tokens are signed with the same key. None carries `iss` or `aud`.

| Token | Claims | Lifetime |
|---|---|---|
| Access token | `sub` (user id), `email`, `iat`, `exp` | 60 s; 86400 s when dev auth is enabled (`DEV_AUTH=true` and `NODE_ENV` not `production`) |
| Refresh token | Access claims plus `jti` | 7 days |
| MCP refresh token | Refresh claims plus `mcp_server_id` and `token_type: "mcp"` | 7 days |
| Kiwi App token | `sub`, `type: "app_token"`, `appSlug`, `classId` (or `null`), `tokenScope` (`"class"` or `"admin"`), `scopes`, `iat`, `exp`; no `email` | `APP_TOKEN_TTL_SECONDS`, default 3600 s |

Sources: `generateAccessToken` and the refresh-token functions in
`kiwi/src/auth/auth.service.ts`, lifetimes in `kiwi/src/auth/auth.constants.ts`
and `kiwi/src/auth/dev-auth.ts`, and `generateAppToken` in
`kiwi/src/kiwi-app/kiwi-app.service.ts`.

Tokens contain no role claim. A user's system role (`user`, `instructor` or
`admin`) is read from the database by the guards that need it.

Kiwi's own guards reject tokens that carry a `jti`, so a refresh token cannot be
used as a bearer token.

Example access token payload:

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "student@example.edu",
  "iat": 1767225600,
  "exp": 1767225660
}
```

## Verifying Kiwi tokens

Rules for an external verifier:

- Require RS256 and fetch keys from the JWKS. Do not accept HS256.
- Reject tokens that have a `jti` claim; those are refresh tokens.
- Reject tokens with `type: "app_token"` unless your service is a Kiwi App that
  expects them. Conversely, a Kiwi App should require `type: "app_token"`.
- Do not check `iss` or `aud`; Kiwi does not set them. Pin the JWKS URL to your
  Kiwi server instead.
- Check `exp` and allow for the short access-token lifetime.

### Python (PyJWT)

```python
import jwt
from jwt import PyJWKClient

jwks_client = PyJWKClient("https://kiwi.example.edu/.well-known/jwks.json")

def verify_kiwi_access_token(token: str) -> dict:
    # Kiwi tokens have no `kid` header, so take the single published key
    # instead of get_signing_key_from_jwt().
    key = jwks_client.get_signing_keys()[0]
    payload = jwt.decode(
        token,
        key.key,
        algorithms=["RS256"],
        options={"verify_aud": False},
    )
    if "jti" in payload or payload.get("type") == "app_token":
        raise jwt.InvalidTokenError("not an access token")
    return payload
```

### TypeScript (jose)

```typescript
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://kiwi.example.edu/.well-known/jwks.json'),
);

interface KiwiAccessToken extends JWTPayload {
  sub: string;
  email: string;
}

export async function verifyKiwiAccessToken(
  token: string,
): Promise<KiwiAccessToken> {
  const { payload } = await jwtVerify(token, JWKS, { algorithms: ['RS256'] });
  if (payload.jti !== undefined || payload.type === 'app_token') {
    throw new Error('not an access token');
  }
  return payload as KiwiAccessToken;
}
```

jose accepts a token without `kid` when the key set holds a single matching key.

### Go (lestrrat-go/jwx v2)

```go
package kiwiauth

import (
	"context"
	"errors"

	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

const jwksURL = "https://kiwi.example.edu/.well-known/jwks.json"

func VerifyAccessToken(ctx context.Context, raw string) (jwt.Token, error) {
	set, err := jwk.Fetch(ctx, jwksURL) // cache this in production
	if err != nil {
		return nil, err
	}
	key, ok := set.Key(0)
	if !ok {
		return nil, errors.New("empty JWKS")
	}
	tok, err := jwt.Parse([]byte(raw), jwt.WithKey(jwa.RS256, key), jwt.WithValidate(true))
	if err != nil {
		return nil, err
	}
	if tok.JwtID() != "" {
		return nil, errors.New("refresh token")
	}
	if t, ok := tok.Get("type"); ok && t == "app_token" {
		return nil, errors.New("app token")
	}
	return tok, nil
}
```

## Troubleshooting

- **Signature fails against the JWKS.** Check that both `JWT_PRIVATE_KEY` and
  `JWT_PUBLIC_KEY` are set. Without them tokens are HS256 and the published key
  is unrelated. The backend logs `Loaded JWT keys from environment variables`
  when both are present.
- **"Unable to find a signing key" or "no key ID".** The library is looking up
  the key by `kid`, which Kiwi tokens lack. Use the single key from the set.
- **All tokens rejected after a restart.** The keys changed. Refetch the JWKS;
  users must sign in again.
- **Token expired.** Access tokens live 60 seconds; the Kiwi frontend refreshes
  them with the refresh-token cookie. Check clock synchronization as well.

## Related documentation

- [MCP](mcp.md): OAuth flow and MCP clients
- [Google sign-in](../kiwi/README.md#google-sign-in-optional)
