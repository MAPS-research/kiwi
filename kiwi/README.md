# Kiwi backend

The Kiwi API server: NestJS with Prisma on PostgreSQL (pgvector), Redis and
BullMQ for background jobs, S3-compatible storage for documents, and an MCP
server for external AI clients.

The frontend lives in [`../kiwi-ui`](../kiwi-ui). Project-wide documentation is
in [`../docs`](../docs/README.md).

## Requirements

- Node.js 24 (`.nvmrc` pins 24.21.0)
- Docker

## Setup

Run everything from this directory.

```bash
# Local services: PostgreSQL/pgvector (5432), Redis (6379),
# Adminer (8081), RustFS (9000, console 9001), and the Xberg document
# parser (8002; see docs/parsers.md for Unstructured instead)
docker compose up -d

cp .env.example .env     # then set LLM_API_KEY
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed       # creates admin@example.com and prints its password
npm run start:dev        # http://localhost:3000, API docs at /docs
```

`.env.example` is set up to match `compose.yml`; the only value you must
provide is an LLM API key. Its comments explain the rest.

To stop the services without losing data, use `docker compose stop` (not
`down -v`, which deletes the volumes).

### Local object storage

`docker compose up -d` starts RustFS, and the one-shot `oss-init` service
creates the `kiwi` bucket and gives it a CORS policy: the UI loads PDFs straight
from signed URLs on another origin, and RustFS, unlike MinIO, sends no CORS
headers without one. The console is at http://localhost:9001 (`kiwi` /
`kiwikiwi`), and objects live in the `rustfs-data` volume. The `OSS_*` values
in `.env.example` match this setup; for AWS S3, set `OSS_VENDOR="s3"` and your
bucket, region and credentials.

Coming from MinIO: the old `oss-data` volume is left untouched, and
`OSS_VENDOR="minio"` keeps working. See
[docs/object-storage.md](../docs/object-storage.md) for copying your files over
and for moving a deployment.

## Signing in

The seed creates `admin@example.com` (or `SEED_ADMIN_EMAIL`) with the password
in `SEED_ADMIN_PASSWORD`, or a generated one printed once. Create further
accounts in the UI under **Admin → User Management**. See
[Administration](../docs/administration.md).

### Google sign-in (optional)

Password login works out of the box. To also allow Google sign-in:

- Go to https://console.cloud.google.com/apis/credentials
- **Create Credentials → OAuth client ID → Web application**
- Add `http://localhost:3000/auth/google` as an authorized redirect URI
- Put the client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Set `GOOGLE_DOMAIN` to the Google Workspace domain(s) allowed to sign in,
  comma-separated, or `*`
- In `kiwi-ui/.env`, set `VITE_ENABLE_GOOGLE_LOGIN=true`
- Whitelist the people who may sign in (Admin → User Management)

Without `GOOGLE_CLIENT_ID`, the Google routes return 404 and the button is hidden.

## JWT signing

Without keys, tokens are signed with `JWT_SECRET` (HS256). To let other
services verify Kiwi tokens through `/.well-known/jwks.json`, configure RS256:

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
# then in .env:
JWT_PRIVATE_KEY=$(base64 < private.pem | tr -d '\n')
JWT_PUBLIC_KEY=$(base64 < public.pem | tr -d '\n')
```

See [JWT configuration](../docs/jwt-configuration.md).

## Runtime notes

The backend uses NestJS 12 with TypeScript 6 and remains CommonJS. Use the
Node version in `.nvmrc`. The `npm test`, `test:watch`, `test:cov`, and
`test:e2e` scripts enable Jest's VM module support to load Nest's ESM packages.

The MCP server uses MCP-Nest v2 and the stable MCP TypeScript SDK v2. Connect
clients to `/mcp` using Streamable HTTP and a Kiwi bearer token. Authentication
runs on every HTTP request; app-token scopes and class restrictions still apply.
The endpoint supports both initialized 2025 protocol sessions (including SSE
responses) and the sessionless 2026-07-28 protocol. The old server-side
HTTP+SSE endpoints (`/sse` and `/messages`) are gone; clients using them must
switch to Streamable HTTP at `/mcp`. Outbound Kiwi connections still support
configured `http`, `sse`, and `stdio` transports.

LLM engines without API keys are disabled at startup; configure the engine's
key before using its chat or embedding features.

## Useful commands

| Command | What it does |
|---|---|
| `npm run start:dev` | Start with file watching |
| `npm run start:debug` | Start with watching and the Node inspector |
| `npm run build` | Compile to `dist/` (also the type check) |
| `npm run start:prod` | Run the compiled build |
| `npm test` | Unit tests |
| `npx prisma studio` | Browse the database |
| `npx prisma migrate dev --name <change>` | Create a migration after editing `prisma/schema.prisma` |

More in [docs/development.md](../docs/development.md).

## Troubleshooting

- **Uploaded materials never finish processing.** The document parser isn't
  running or its URL is wrong. Check `docker compose ps` for the `xberg`
  service and that `XBERG_API_URL` matches its port (8002); for Unstructured,
  see [docs/parsers.md](../docs/parsers.md).
- **The UI can't reach the API (CORS).** `FRONTEND_URL` must list the UI's
  exact origin, e.g. `http://localhost:3001`.
- **Google sign-in is refused.** Check that the email is whitelisted and, for
  Google Workspace accounts, that its domain is in `GOOGLE_DOMAIN`.

## License

MIT — see the [LICENSE](../LICENSE) at the repository root.
