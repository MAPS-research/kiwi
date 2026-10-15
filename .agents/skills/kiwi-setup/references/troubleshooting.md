# Troubleshooting

Start with the doctor (`scripts/doctor.sh`); it usually names the broken
layer. Then find the symptom below. Read the actual error before acting — most
of these look alike from the outside. Paths are relative to the repository
root; `docker compose` commands run from `kiwi/`.

- [Infrastructure (Docker)](#infrastructure-docker)
- [Installing and database](#installing-and-database)
- [Backend won't start](#backend-wont-start)
- [Signing in](#signing-in)
- [Materials never finish processing](#materials-never-finish-processing)
- [Chat](#chat)

## Infrastructure (Docker)

**`Bind for 127.0.0.1:5432 failed: port is already allocated`** (or any
port). Something else holds it. The doctor names it. See
[configuration.md → Port conflicts](configuration.md#port-conflicts).

**`Cannot connect to the Docker daemon`.** Docker Desktop isn't running, or
the Linux service is stopped. Start it and wait until `docker info` succeeds.

**Xberg is `unhealthy`, restarts, or exits with code 137.** 137 is out of
memory. Give Docker more memory (8 GB or more), or lower `XBERG_CPUS` and
`XBERG_MAX_CONCURRENT` together in `kiwi/.env` (e.g. both `2`) and
`docker compose up -d xberg`. Each concurrent extraction loads its own models,
so concurrency above the CPU limit just runs out of memory. Right after start
it is `health: starting` for about a minute — that's normal.

**`oss-init` exited with a non-zero code.** The bucket or its CORS policy
wasn't created, so uploads or the PDF viewer fail. Check
`docker compose logs oss-init`, make sure `oss` is healthy, then re-run it:
`docker compose up oss-init`.

**Containers show a working directory from another checkout**, or the
database already contains unexpected data. Compose project names come from the
directory name, so checkouts in folders all named `kiwi` share containers and
volumes. Set `COMPOSE_PROJECT_NAME` in `kiwi/.env` to separate them (SKILL.md,
step 3). Don't delete the old volumes — they may hold someone's work.

## Installing and database

**`npm install` fails with engine warnings, `node-gyp` or odd syntax errors.**
Almost always the wrong Node. Check `node -v` *in the same shell call* as
`npm` against `kiwi/.nvmrc`. Delete that app's `node_modules` only after fixing
Node, then reinstall.

**Prisma `P1001: Can't reach database server`.** The `db` container isn't
running, or `DATABASE_URL`'s port doesn't match the published port (after a
port move, check both `compose.override.yml` and `kiwi/.env`).

**Prisma `P1000: Authentication failed` for user `kiwi`.** You are very likely
talking to *a different PostgreSQL* — another project's, listening on the same
port. Kiwi's database accepts `kiwi`/`kiwi`. Find who owns the port
(the doctor shows it) and move Kiwi or stop the other one.

**`migrate deploy` fails on an existing database** (from an older install).
Don't reset it. Show the person the error. If the data doesn't matter and
they agree, the clean route is a separate `COMPOSE_PROJECT_NAME` (a fresh
volume) — the old data stays untouched. If it does matter, take a backup first
(`docs/development.md#backups`) and work from the error.

**Seed says the admin password is `unchanged (already set)`** and nobody
knows it. Set `SEED_ADMIN_PASSWORD` in `kiwi/.env` and run
`npx prisma db seed` again; it resets the admin's password and nothing else.
Remove it from `.env` afterwards if they prefer.

## Backend won't start

Look at the first error in the backend log, not the last.

| Message | Cause |
|---|---|
| `PARSER=xberg requires XBERG_API_URL to be set` | Missing parser URL in `kiwi/.env` |
| `ECONNREFUSED 127.0.0.1:6379` (or Redis retry spam) | Redis isn't up, or `REDIS_PORT` is wrong |
| `Can't reach database server` | As above, P1001 |
| `EADDRINUSE :::3000` | Something already serves 3000 — often a Kiwi backend from an earlier session. `lsof -nP -iTCP:3000 -sTCP:LISTEN` shows it; if it's Kiwi, reuse it or stop it |
| `Engine openai is disabled: API key is not configured` | A warning, not a crash: `LLM_API_KEY` is empty. Chat and embeddings won't work |
| `Engine qwen is disabled…` | Expected when not using Qwen |
| `[EmailService] Email transporter verification failed` | Harmless with `EMAIL_TEST_MODE=true` (the default): emails are logged, not sent. See `docs/email.md` to send real email |
| TypeScript or module errors on first start | Usually a stale Prisma client after pulling: `npx prisma generate`, restart |

## Signing in

**"Invalid credentials" as admin.** Check the email matches
`SEED_ADMIN_EMAIL`; otherwise reset as described under the seed above.

**The login page loads but every request fails / CORS errors in the browser
console.** `FRONTEND_URL` in `kiwi/.env` must contain the exact UI origin
(`http://localhost:3001`) — and `VITE_BASE_PATH` in `kiwi-ui/.env` must point
at the backend. Restart whichever side you changed (Vite reads `.env` only at
start).

**Signed in, but the session drops after an hour.** Sessions last one hour by
design. In Swagger, access tokens expire after 60 seconds — copy a fresh one
(`docs/development.md#exploring-the-api`).

**Google button missing.** Needs both `GOOGLE_CLIENT_ID` (backend) and
`VITE_ENABLE_GOOGLE_LOGIN=true` (frontend, then restart it).

## Materials never finish processing

Work along the pipeline: upload → object storage → parse (Xberg) → chunk →
embed (LLM provider) → ready.

1. **Backend log** around the upload time — it usually names the failing
   stage.
2. **Parser:** `docker compose ps xberg` healthy? `XBERG_API_URL` matches its
   port (default `http://localhost:8002`)? `docker compose logs xberg` for
   the extraction. Long scanned PDFs can genuinely take minutes.
3. **Queue:** background jobs run through Redis (BullMQ). If Redis was down
   during upload, reprocess the material ("Run the pipeline again").
4. **Embeddings:** an invalid `LLM_API_KEY`, an unknown embedding model, or a
   dimension mismatch (`expected 1536 dimensions`) stops at this stage. See
   [configuration.md → LLM providers](configuration.md#llm-providers).

**The PDF won't display in the viewer.** The browser loads it straight from
RustFS via a signed URL, which needs the bucket's CORS policy from `oss-init`.
Check that `oss-init` exited 0, and that `OSS_ENDPOINT` is reachable from the
browser (`http://localhost:9000` locally).

## Chat

**Answers ignore the uploaded material.** The document may have chunks but no
vectors for the model the chat uses. Run the coverage queries in
`docs/embeddings.md#backfilling-vectors` (Adminer at http://localhost:8081:
system PostgreSQL, server `db`, user/password/database `kiwi`), then backfill
with `npx ts-node scripts/reembed-missing.ts --provider openai`.

**Chat returns an error immediately.** Check the backend log for the
provider's message: wrong model name for the provider, invalid key, or an
`unsupported parameter` complaint about `max_completion_tokens`/`temperature`
(see [configuration.md → LLM providers](configuration.md#llm-providers)).

**Chat worked, then stopped for one user.** The per-user token quota
(`LLM_TOKEN_LIMIT`) was reached. Raise it locally, or grant the `TokenLimit`
feature flag.
