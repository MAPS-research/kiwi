# Backend development

Day-to-day tasks for developers working on the Kiwi backend (`kiwi/`): the
project layout, adding modules, database migrations and seeding, backups,
feature flags, and calling the API by hand.

## Project layout

`kiwi/` is a NestJS application with Prisma on PostgreSQL (pgvector). Each
feature is a module under `kiwi/src/`:

| Module | Purpose |
|---|---|
| `auth` | Password and Google login, JWTs, session guards, OAuth for MCP clients, `/.well-known` endpoints |
| `class`, `instructor-class` | Classes, enrollments, materials, instructor assignments |
| `document` | Uploads, parsing and chunking, embedding, retrieval |
| `student` | Student-facing chat and material features |
| `kiwi-app`, `widget` | Kiwi Apps (iframe apps) and their widgets |
| `mcp` | MCP server registry and MCP endpoints |
| `analytics`, `interaction`, `experiment`, `competition`, `consent` | Usage tracking, experiments, competitions, research consent |
| `context-jobs` | Queued LLM work such as conversation compaction |
| `events` | WebSocket gateway |
| `email`, `email-audit` | Outbound email and its log; see [email.md](email.md) |
| `webhooks`, `api-tokens` | Inbound webhooks; see [webhooks.md](webhooks.md) |
| `feature-flags` | Per-user and per-class feature flags |
| `health` | Health check |
| `common` | Shared services: `database` (Prisma wrappers), `llm`, `embedding`, `storage`, `redis`, `parser` (Xberg or Unstructured), `unstructured`, `chat`, `agent`, `tools`, `context`, `mcp` |

The schema is `kiwi/prisma/schema.prisma`; it is the reference for the data
model.

## Running locally

Follow the quick start in the [root README](../README.md#quick-start). Details
on environment variables are in [`kiwi/README.md`](../kiwi/README.md) and
`kiwi/.env.example`.

`kiwi/compose.yml` starts PostgreSQL, Redis, Adminer (http://localhost:8081),
RustFS object storage (API on 9000, console on 9001; see
[object-storage.md](object-storage.md)) and the Xberg document parser (8002). To
parse with Unstructured instead, see [parsers.md](parsers.md).

## Generating a module

Run the Nest CLI from `kiwi/`:

```bash
npx nest g resource <name>      # module, controller, service, DTOs and entity

# or piece by piece
npx nest g module <name>
npx nest g controller <name>
npx nest g service <name>
```

## Database

Run these from `kiwi/`.

| Task | Command |
|---|---|
| Create a migration after editing `prisma/schema.prisma` | `npx prisma migrate dev --name <change>` |
| Apply migrations (fresh clone, after pulling, deployment) | `npx prisma migrate deploy` |
| Regenerate the Prisma client (`npm install` also does this) | `npx prisma generate` |
| Browse data | `npx prisma studio`, or Adminer at http://localhost:8081 (system PostgreSQL, server `db`, user, password and database `kiwi`) |

Do not use `npx prisma db push`. It builds tables from the schema and skips the
migration SQL, which seeds the `EmbeddingModel` rows and creates the per-model
HNSW indexes that retrieval depends on (see [embeddings.md](embeddings.md)).

`migrate dev` may offer to reset the database when it detects drift. A reset
deletes all data, so take a [backup](#backups) or a
[snapshot](#seeding) first.

## Seeding

```bash
# from kiwi/
npx prisma db seed
```

The seed script `kiwi/prisma/seed.ts` has two modes.

**Minimal baseline**, when `kiwi/prisma/seed-data.json` does not exist:

- `admin@example.com` (or `SEED_ADMIN_EMAIL`) with a password. The password is
  `SEED_ADMIN_PASSWORD`, or is generated and printed once. Re-running the seed
  changes an existing admin's password only when `SEED_ADMIN_PASSWORD` is set.
- `instructor@example.com` and `student@example.com`, OAuth-only accounts with
  no password.
- A class `seed-class-001` with one material.

**Snapshot replay**, when `kiwi/prisma/seed-data.json` exists: the snapshot's
rows are upserted and the admin password step is skipped. Accounts keep the
passwords they had when the snapshot was taken.

Capture a snapshot of your current database:

```bash
# from kiwi/
npx ts-node prisma/seed-capture.ts
```

It captures users, whitelist, pending admins, classes, instructor assignments,
enrollments, pending enrollments, feature flags, class materials, documents,
document comments and summaries, `Embedding` rows (including the legacy OpenAI
vector column) and lecture keywords.

Nothing else is captured. That includes sessions, OAuth clients, interactions,
conversations, discussions and upvotes, server actions, competitions,
experiments, material personalization, email audit logs, API tokens and
webhooks, MCP servers and class tool settings, Kiwi Apps and widgets, analytics
topics, `EmbeddingModel` and `EmbeddingVector`. Files in object storage are not
captured either.

After restoring a snapshot, rebuild the vectors retrieval uses:

```bash
# from kiwi/
npx ts-node scripts/reembed-missing.ts --provider openai
```

Snapshots contain real user data, including password hashes. Never commit or
share them. `prisma/seed-data.json` is gitignored.

## Backups

A `pg_dump` covers the whole database, including tables the snapshot skips.
From `kiwi/`:

```bash
docker compose exec -T db pg_dump -U kiwi -Fc kiwi > backup.dump

# restore
docker compose exec -T db pg_restore -U kiwi -d kiwi --clean --if-exists < backup.dump
```

Keep dumps out of the repository.

## Feature flags

Flags turn features on for a user or a class, optionally until a date. They are
stored in the `FeatureFlag` table. The current values of the `Feature` enum in
`kiwi/prisma/schema.prisma` are:

| Flag | Effect |
|---|---|
| `QwenModel` | No effect. The Qwen engine is available to everyone. |
| `TokenLimit` | Exempts the user or class from the per-session token limit (`LLM_TOKEN_LIMIT`) |
| `RLanguageClass` | Enables R in a class's code editor (checked in the frontend) |

### Granting flags

Admins manage flags from the UI or through these endpoints
(`kiwi/src/feature-flags/feature-flags.controller.ts`):

| Method and path | Access | Purpose |
|---|---|---|
| `POST /feature-flags/user/add`, `POST /feature-flags/class/add` | Admin | Body `{"featureName", "targetId", "validUntil?"}`; `targetId` is a user or class id |
| `PATCH /feature-flags/user/edit`, `PATCH /feature-flags/class/edit` | Admin | Same body; `validUntil: null` removes the expiry |
| `GET /feature-flags/list` | Admin | All flags |
| `GET /feature-flags/user/list?userId=` | Admin | One user's flags |
| `GET /feature-flags/class/list?classId=` | Professor | One class's flags |
| `GET /feature-flags/me/list` | Signed-in user | Your flags, and those of your classes |

### Adding a flag

1. Add the value to `enum Feature` in `kiwi/prisma/schema.prisma` and create a
   migration from `kiwi/`:

   ```bash
   npx prisma migrate dev --name add_<flag>_feature_flag
   ```

2. The `Feature` type comes from `@prisma/client`, so `migrate dev` (which
   regenerates the client) makes the new value available to the code.
3. Guard the endpoints. `kiwi/src/feature-flags/` provides a generic decorator
   and guard that check user-level flags:

   ```typescript
   import { FeatureFlags } from 'src/feature-flags/feature-flags.decorator';
   import { FeatureFlagGuardByUserId } from 'src/feature-flags/feature-flags.guard';

   @Get('new-feature')
   @FeatureFlags('NewFeature')
   @UseGuards(FeatureFlagGuardByUserId)
   newFeature() {
     // ...
   }
   ```

   The controller's module must import `FeatureFlagsModule`. The guard reads the
   user from the session and returns `403` if any listed flag is off. For
   class-level flags, write a guard that passes `classId` to
   `FeatureFlagsService.isFeatureEnabled`, as `FeatureFlagGuardTokenLimit` does.
4. Regenerate the frontend API client so the new value appears in
   `FeatureResponseFeatureNameEnum`. With the backend running, from `kiwi-ui/`:

   ```bash
   npm run generate-openapi
   ```

5. Hide the feature in the UI with `featureFlagChecker` from
   `kiwi-ui/src/utils/featureFlagChecker.ts`, and handle a `403` from the API:

   ```typescript
   const { availableFeatures } = useAuth();
   const enabled = featureFlagChecker({
     featureFlag: "NewFeature",
     availableFeatures,
     classId: selectedClass?.classID,
   });
   ```

## Exploring the API

Swagger UI is at http://localhost:3000/docs, and the OpenAPI JSON at
http://localhost:3000/docs-json.

Most endpoints need **both** a bearer access token and the session cookie that
login sets. Access tokens expire after 60 seconds unless dev auth is enabled
(`DEV_AUTH=true`).

**From the browser.** Sign in at http://localhost:3001, open the developer
console, and copy `localStorage.authToken` into Swagger's Authorize dialog. The
browser already holds the session cookie for `localhost`. Copy a fresh token if
requests start returning `401`.

**With curl.** Log in with a cookie jar, then send the token and the cookies
together. Run from any directory; this example uses `jq`.

```bash
TOKEN=$(curl -s -c cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"<seed password>"}' \
  http://localhost:3000/auth/login | jq -r .access_token)

curl -s -b cookies.txt -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/feature-flags/me/list
```

Run the login again when the token expires. The session cookie lasts one hour.
Delete `cookies.txt` when you are done.
