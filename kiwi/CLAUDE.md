# CLAUDE.md — Agent Guide for the Kiwi Backend

NestJS + Prisma (PostgreSQL/pgvector) backend. This file orients agents working
in this repo; see `../docs/` for deeper topics.

## Environment & running

- **Always `nvm use` first** — Node is pinned in `.nvmrc` (v20.14.0). Prefix
  backend run/test/prisma commands with it.
- Infra (Postgres/pgvector, Redis, MinIO) runs via Docker: `npm run infra`
  (or `infra:detached`). Do **not** remove containers/volumes — stop, don't
  delete; local development data lives there.
- Dev server: `npm run start:dev` (watch) on :3000. If you start one for
  verification, shut it down afterwards so the port is free.
- Typecheck: `npx tsc --noEmit`. Build gate is `nest build` (esbuild), not bare
  `tsc` — a clean build matters more than tsc's pre-existing `nodenext` noise.
- `.env` holds secrets and is gitignored. Copy `.env.example` to `.env` and
  fill it in; never commit it.

## Database / Prisma

- Schema: `prisma/schema.prisma`. Apply migrations with
  `npx prisma migrate deploy` (use `deploy`, not `dev`, to avoid touching
  existing drift). Regenerate the client with `npx prisma generate`.
- Seed: `npx prisma db seed` replays `prisma/seed-data.json` if present, else a
  minimal baseline. See `../docs/database.md`.
- pgvector is enabled (the `vector` extension). See `../docs/embeddings.md` for how
  multi-dimensional embeddings are stored and indexed.

## Embeddings (RAG) — read before touching retrieval

Multiple embedding providers/models with different dimensions are supported
(OpenAI 1536, Qwen→bge-m3 1024) on pgvector. Full details in
**`../docs/embeddings.md`**. Key points:

- Vectors live in `EmbeddingVector` (plain `vector` column, any dimension), one
  row per `(chunk, model)`, with **per-model partial HNSW indexes**. Searches
  are always filtered to a single model.
- The embedding provider follows the chat request's `engineChoice`; otherwise
  `EMBEDDING_PROVIDER` env, then `openai`.

### When adding/switching an embedding engine — RUN THE SEEDING

Existing documents only hold vectors for the model that first embedded them.
After changing the embedding provider/model (env or a new engine), **re-embed
existing chunks for the target provider** so RAG works:

```bash
nvm use && npx ts-node scripts/reembed-missing.ts --provider qwen     # bge-m3 (1024)
npx ts-node scripts/reembed-missing.ts --provider openai              # 1536
npx ts-node scripts/reembed-missing.ts --provider qwen --documentId <uuid>
```

The script is idempotent (fills gaps only), auto-detects/caches the model's
dimension, and **creates the per-model partial HNSW index if missing**. To
register a brand-new provider/model, see `../docs/embeddings.md` → "Registering a
brand-new provider/model".

## Kiwi Apps — apps never get identity

**Apps must never receive the user-id → name/email connection.** Iframe-embedded
Kiwi Apps see opaque user UUIDs and nothing else.

Do **not** add a roster / class-members / user-lookup endpoint to the App API to
resolve those ids, and do not put name or email claims about *other* users into
an app token. This is a boundary, not a trade-off to weigh against usability:
apps are external and increasingly third-party, and handing one a class roster
hands it the students. (A claim identifying *the caller* is a different thing and
is not what this forbids.)

Consequence, so it isn't mistaken for a bug: an app's own user table is a shadow
table of Kiwi ids — `kiwi_codegen_service`'s `User` model has exactly one column,
`id`. App UIs that must distinguish people (grading rails, per-student lists,
leaderboards) show a shortened UUID or an app-local label. Treat "the instructor
can't tell who this is" as a constraint to design around, not a gap to close.

## Conventions

- Keep changes scoped; match surrounding code style.
- Don't commit planning/scratch docs into the repo.
- Verify behavior by running the app, not just by reading code, for anything
  user-facing.
