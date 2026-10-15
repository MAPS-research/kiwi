# Configuration beyond the defaults

Read the section you need. Paths are relative to the repository root. Write
`.env` values with `scripts/set-env.sh` so secrets aren't echoed.

- [Port conflicts](#port-conflicts)
- [LLM providers](#llm-providers)
- [Qwen as a second engine](#qwen-as-a-second-engine)
- [Google sign-in](#google-sign-in)
- [Branding](#branding)
- [Document parser: Unstructured instead of Xberg](#document-parser-unstructured-instead-of-xberg)
- [Email](#email)
- [RS256 token signing](#rs256-token-signing)
- [Going to production](#going-to-production)

## Port conflicts

Kiwi's containers publish fixed host ports: PostgreSQL 5432, Redis 6379,
Adminer 8081, RustFS 9000/9001, Xberg 8002. The dev servers use 3000 (backend)
and 3001 (frontend). When the doctor reports one taken, tell the person what
holds it and offer:

**A. Stop the other program** — only with their go-ahead. For another
compose project: `docker compose -p <project> stop` (keeps its data).

**B. Move Kiwi** (no impact on anything else). PostgreSQL and Redis ports are
written literally in `compose.yml`, so override them in
`kiwi/compose.override.yml`, which Compose loads automatically and which is
gitignored. `!override` replaces the list instead of appending to it (needs
Compose 2.24 or newer):

```yaml
# kiwi/compose.override.yml — local port changes, not committed
services:
  db:
    ports: !override
      - 127.0.0.1:5433:5432
  redis:
    ports: !override
      - 127.0.0.1:6380:6379
```

Then point the backend at the new ports in `kiwi/.env`:

```bash
bash <skill-dir>/scripts/set-env.sh kiwi/.env DATABASE_URL 'postgresql://kiwi:kiwi@localhost:5433/kiwi'
bash <skill-dir>/scripts/set-env.sh kiwi/.env REDIS_PORT 6380
```

Check the result with `docker compose config` (from `kiwi/`) before starting.

Other ports:

| Port | How to move it |
|---|---|
| Xberg 8002 | `XBERG_PORT=<port>` and `XBERG_API_URL=http://localhost:<port>` in `kiwi/.env` (Compose reads `XBERG_PORT` from that file) |
| Adminer 8081, RustFS 9000/9001 | Same `!override` pattern. If 9000 moves, also set `OSS_ENDPOINT` |
| Backend 3000 | `PORT`, `SERVER_URL`, `BASE_URL` in `kiwi/.env`; `VITE_BASE_PATH`, `VITE_BACKEND_URL` in `kiwi-ui/.env` |
| Frontend 3001 | Set in `kiwi-ui/vite.config.ts`, not by env. Moving it also means updating `FRONTEND_URL` in `kiwi/.env`. Prefer freeing 3001 |

## LLM providers

The `openai` engine (`LLM_*` variables) talks to any OpenAI-compatible API and
does **both chat and embeddings** with one key and one base URL:

| Variable | Default |
|---|---|
| `LLM_API_KEY` | — (required) |
| `LLM_BASE_URL` | `https://api.openai.com/v1` |
| `LLM_CHAT_MODEL` | `gpt-5.4-mini` |
| `LLM_EMBEDDING_MODEL` | `text-embedding-3-small` |

Two constraints matter when the person uses something other than OpenAI:

1. **Embeddings must be 1536-dimensional** unless you register a new model.
   The migrations register the `openai` embedding model as 1536 dimensions,
   and vectors of another size fail to insert, so uploads never become
   searchable. If their provider's embedding model has a different size, follow
   `docs/embeddings.md#registering-a-brand-new-providermodel` *before* the
   first upload. If their provider has no embeddings endpoint at all, retrieval
   won't work through this engine — say so plainly and look at
   `docs/embeddings.md` together rather than guessing a workaround.
2. **The chat model is called like a reasoning model**: Kiwi sends
   `max_completion_tokens` and no `temperature`. Most current
   OpenAI-compatible APIs accept that. If chat fails with an error about either
   parameter, the provider expects the classic parameters; the Qwen engine
   slot (below) sends those.

Check the person's provider documentation for the base URL and model names
rather than recalling them; they change.

The per-user token quota is `LLM_TOKEN_LIMIT` (default 100000). Hitting it
looks like chat suddenly refusing; raise it locally or grant the `TokenLimit`
feature flag (`docs/development.md#feature-flags`).

## Qwen as a second engine

Optional. The `qwen` engine is another OpenAI-compatible slot that sends
classic `temperature`/`max_tokens`. It is disabled while `QWEN_API_KEY` is
empty. Its embedding model is registered as 1024-dimensional (`bge-m3`);
`QWEN_EMBEDDING_MODEL` must produce that size. When you enable it on an
instance that already has documents, backfill their vectors:

```bash
cd kiwi && npx ts-node scripts/reembed-missing.ts --provider qwen
```

Until the key is set, ingestion skips Qwen, so that backfill is what gives
earlier uploads their Qwen vectors. Details: `docs/embeddings.md`.

## Google sign-in

Optional; password sign-in works without it. The person needs a Google Cloud
OAuth client ("Web application") — they create it themselves in the Google
Cloud console; you can't do it for them.

1. Authorized redirect URI: `http://localhost:3000/auth/google` (locally).
2. `kiwi/.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
   `GOOGLE_DOMAIN` (comma-separated Workspace domains, or `*`).
3. `kiwi-ui/.env`: `VITE_ENABLE_GOOGLE_LOGIN=true`; restart the frontend.
4. Restart the backend.
5. Whitelist who may sign in: Admin → User Management → Add users.

Only whitelisted emails get in. `GOOGLE_DOMAIN` restricts Workspace accounts
only; personal Gmail accounts are limited by the whitelist alone. Full notes:
`docs/administration.md#google-sign-in-optional`.

## Branding

All optional, in `kiwi-ui/.env` (restart the dev server, or rebuild for
production): `VITE_INSTITUTION_NAME`, `VITE_SUPPORT_EMAIL`, `VITE_LOGO_URL`,
`VITE_LOGO_LIGHT_URL` (used as a mask — only the shape matters),
`VITE_SSO_EMAIL_DOMAIN`, and `VITE_CONSENT_FORM_URL` (a PDF users must accept;
leave empty for no consent gate). Backend welcome emails use
`INSTITUTION_NAME`, `SUPPORT_EMAIL`, `ONBOARDING_GUIDE_URL`. Keep these out of
committed files — Kiwi is deliberately institution-neutral.

## Document parser: Unstructured instead of Xberg

Xberg is the default and needs nothing. To use Unstructured: uncomment the
`unstructured` service in `kiwi/compose.yml` (or add it in
`compose.override.yml` to keep the tracked file clean), `docker compose up -d`,
then set `PARSER=unstructured` and `UNSTRUCTURED_API_URL=http://localhost:9500`
in `kiwi/.env` and restart the backend. Only new uploads are affected. See
`docs/parsers.md`.

## Email

Off by default: `EMAIL_TEST_MODE=true` logs emails instead of sending them.
To send, configure the `AWS_SES_SMTP_*` settings (any SMTP server works) and
set `EMAIL_TEST_MODE=false`. See `docs/email.md`.

## RS256 token signing

Only needed when other services must verify Kiwi tokens via
`/.well-known/jwks.json`. See `kiwi/README.md#jwt-signing` and
`docs/jwt-configuration.md`.

## Going to production

This skill sets up a development instance. For real users, work through
`docs/administration.md#before-going-to-production` with the person: strong
secrets and RS256, `NODE_ENV=production`, `API_DOMAIN`, HTTPS, real S3 with
CORS, replaced database/Redis credentials, SMTP, backups, and a built frontend
(`npm run build` in `kiwi-ui/`, served as static files with an `index.html`
fallback). The Xberg API has no authentication — it must never be reachable
from outside the host.
