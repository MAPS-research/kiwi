# CLAUDE.md — Agent Guide for the Kiwi Backend

NestJS + Prisma (PostgreSQL/pgvector) backend. This file orients agents working
in this repo; see `../docs/` for deeper topics.

## Environment & running

- Use the Node version in `.nvmrc` (v24.21.0), e.g. `nvm use` or a version
  manager of your choice, before running backend commands.
- Infra (Postgres/pgvector, Redis, RustFS, Xberg) runs via Docker:
  `npm run infra` (or `infra:detached`). Do **not** remove containers/volumes —
  stop, don't delete; local development data lives there.
- Object storage (RustFS/MinIO/S3, CORS, migrating a deployment): see
  `../docs/object-storage.md`. Test storage changes with a browser-style request
  (`Origin` header, `Range`) — curl and Node ignore CORS.
- Dev server: `npm run start:dev` (watch) on :3000. If you start one for
  verification, shut it down afterwards so the port is free.
- Typecheck: `npx tsc --noEmit`. Build gate is `nest build`, not bare
  `tsc` — a clean build matters more than tsc's pre-existing `nodenext` noise.
- `.env` holds secrets and is gitignored. Copy `.env.example` to `.env` and
  fill it in; never commit it.

## Database / Prisma

- Schema: `prisma/schema.prisma`. Apply migrations with
  `npx prisma migrate deploy` (use `deploy`, not `dev`, to avoid touching
  existing drift). Regenerate the client with `npx prisma generate`.
- Prisma 7 no longer generates the client on install, so `npm install` runs
  `prisma generate` as a `postinstall` step. Config lives in `prisma.config.ts`;
  commands that talk to the database need `DATABASE_URL`, `generate` does not.
- Seed: `npx prisma db seed` replays `prisma/seed-data.json` if present, else a
  minimal baseline. See `../docs/development.md`.
- pgvector is enabled (the `vector` extension). See `../docs/embeddings.md` for how
  multi-dimensional embeddings are stored and indexed.

## Embeddings (RAG) — read before touching retrieval

Multiple embedding providers/models with different dimensions are supported
(OpenAI 1536, Qwen 1024) on pgvector. Full details in
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
npx ts-node scripts/reembed-missing.ts --provider qwen     # bge-m3 (1024)
npx ts-node scripts/reembed-missing.ts --provider openai              # 1536
npx ts-node scripts/reembed-missing.ts --provider qwen --documentId <uuid>
```

The script is idempotent (fills gaps only), auto-detects/caches the model's
dimension, and **creates the per-model partial HNSW index if missing**. To
register a brand-new provider/model, see `../docs/embeddings.md` → "Registering a
brand-new provider/model".

## Authorization — scope everything to a class

Most data belongs to one class. Never add a route that only checks that the
caller is signed in and then acts on a class, material or document id from the
request.

- Class management (settings, experiments, class apps): `InstructorClassGuard`
  — admin, a professor enrolled in that class, or an instructor assigned to it
  (`InstructorClassService.canManageClass`). It reads the class from
  `:classID`/`:classId`, the query, or the body.
- Materials and documents: `MaterialManageGuard` — resolves the class from a
  class, material or document id (`canManageMaterials`). Multipart bodies aren't
  parsed when guards run, so upload handlers check the material themselves.
- Reading a document as a student: `DocumentService.assertCanReadDocument`
  (students see only the document the material list shows them — never answer
  keys).
- A resource from the route (e.g. `:experimentId`) must be checked against the
  route's class; return 404 on a mismatch.
- Refresh tokens are not bearer credentials (guards reject tokens with a `jti`).
- The global validation pipe is off: validate security-relevant bodies with a
  per-route `ValidationPipe`, and never write a request body to the database
  wholesale.

## Kiwi Apps — apps never get identity

**Apps must never receive the user-id → name/email connection.** Iframe-embedded
Kiwi Apps see opaque user UUIDs and nothing else.

Do **not** add a roster / class-members / user-lookup endpoint to the App API to
resolve those ids, and do not put name or email claims about *other* users into
an app token. This is a boundary, not a trade-off to weigh against usability:
apps are external and increasingly third-party, and handing one a class roster
hands it the students. Apps don't receive the signed-in user's own name or email
either: `kiwi:context` carries only the opaque `userId`.

Consequence, so it isn't mistaken for a bug: an app's own user table is a shadow
table of Kiwi ids — for example, a companion service's `User` model has exactly one column,
`id`. App UIs that must distinguish people (grading rails, per-student lists,
leaderboards) show a shortened UUID or an app-local label. Treat "the instructor
can't tell who this is" as a constraint to design around, not a gap to close.

## Conventions

- Keep changes scoped; match surrounding code style.
- Don't commit planning/scratch docs into the repo.
- Verify behavior by running the app, not just by reading code, for anything
  user-facing.
