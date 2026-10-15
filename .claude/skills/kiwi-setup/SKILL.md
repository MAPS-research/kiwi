---
name: kiwi-setup
description: Install, configure, run and first-use the Kiwi AI learning assistant (github.com/MAPS-research/kiwi) on a local machine — Docker infrastructure, NestJS backend, React frontend, admin login, then creating a class, uploading materials and chatting. Use this whenever someone wants to set up, install, run, start, restart, resume or check Kiwi locally, try it out, get the admin password, or is stuck on a Kiwi setup problem (ports in use, Docker, Node version, migrations, seeding, CORS, materials stuck processing, can't log in), even if they don't say "setup". Also use it as the starting point before contributing code to Kiwi, since contributors need the same running stack.
---

# Setting up Kiwi locally

Kiwi is an open-source AI learning assistant for university courses. A running
local instance is three layers, each depending on the one before:

```
Docker (kiwi/compose.yml)        Backend (kiwi/)            Frontend (kiwi-ui/)
  PostgreSQL+pgvector  :5432      NestJS dev server :3000     Vite dev server :3001
  Redis                :6379  ->  Swagger at /docs       ->   the app people use
  RustFS (S3)    :9000/:9001      needs LLM_API_KEY
  Xberg parser         :8002
  Adminer              :8081
```

The goal is: the person opens http://localhost:3001, signs in as admin, and
can create a class, upload a PDF and chat about it. The person you are helping
may be an instructor or researcher rather than a developer — explain what you
are doing in plain words, ask before anything that touches their other
projects, and don't bury them in logs.

## How to work through it

**Run the doctor first, and again after every step.**

```bash
bash <skill-dir>/scripts/doctor.sh            # from anywhere inside the repo
bash <skill-dir>/scripts/doctor.sh --root /path/to/kiwi
```

(`<skill-dir>` is the directory containing this file — inside the repository it
is `.claude/skills/kiwi-setup`.) It is read-only and reports, in order: tools,
ports, configuration, containers, dependencies and database, running
services. It ends with a `NEXT` line naming the earliest stage that needs
work. Setups are often interrupted halfway and resumed in a new session; the
doctor tells you where things stand so you never redo or skip a step. Start
at the step it points to.

### Ground rules

These protect the person's data and other work. Each has bitten someone.

- **Never delete Docker volumes** — no `docker compose down -v`, no
  `docker volume rm`. The database, uploaded files and the 1 GB Xberg model
  cache live there. Use `docker compose stop` to stop things.
- **Never use `npx prisma db push`, `migrate dev` or `migrate reset`.** Use
  `npx prisma migrate deploy`. `db push` skips the migration SQL that creates
  the embedding registry and vector indexes, so retrieval silently breaks;
  `migrate dev` may offer to wipe the database.
- **Keep secrets out of the conversation and out of git.** Write keys with
  `scripts/set-env.sh` (it never echoes values); don't `cat` a `.env`. Both
  `.env` files are gitignored — keep it that way. The one secret you *do* show
  is the admin password the seed prints, because the person needs it.
- **Ask before stopping or changing anything that isn't Kiwi's** — another
  project's containers holding a port, a global Node install, Docker settings.
- **Leave `DEV_AUTH=false`.** With it on, anyone who can reach the API can make
  themselves admin.

### Running commands as an agent

- **Each shell call starts fresh**, so a `nvm use` in one call is gone in the
  next. If the doctor says Node on PATH is the wrong version, prefix every
  `node`/`npm`/`npx` command with what it prints, e.g.
  `source ~/.nvm/nvm.sh && nvm use v24.21.0 >/dev/null && npm install`.
- **Dev servers run forever**, so start them in the background with output to a
  log file, then poll. If your harness has a background-process feature, use
  it; otherwise `nohup … > ../logs/backend.log 2>&1 &`. `logs/` at the
  repository root is gitignored.
- **Some steps are slow** the first time: pulling images (~2 GB, mostly Xberg),
  `npm install` (a few minutes each), the first backend compile (~1 minute).
  Tell the person before you start one so the silence isn't alarming.

## Step 0 — What are they after?

If it isn't clear, ask one question: are they **trying Kiwi out / developing
locally** (this skill, end to end), or **deploying it for real users**? For a
deployment, still get it running locally first — it's the fastest way to learn
the moving parts — then walk them through the production checklist in
`docs/administration.md#before-going-to-production`.

## Step 1 — Get the repository

If the doctor can't find it, clone it where the person wants it:

```bash
git clone https://github.com/MAPS-research/kiwi.git
```

All later paths are relative to the repository root (the directory with
`kiwi/`, `kiwi-ui/` and `docs/`).

## Step 2 — Prerequisites (doctor sections 1–2)

- **Docker** with Compose v2, running, with at least 8 GB of memory available
  to it (Xberg is capped at 6 GB). On Docker Desktop that is Settings →
  Resources.
- **Node exactly as pinned in `kiwi/.nvmrc`** (currently v24.21.0; both apps
  pin the same version). Prefer installing it through nvm/fnm/volta over
  replacing the person's global Node, which other projects may rely on.
- **Free ports.** If another program holds one of Kiwi's container ports
  (commonly another project's PostgreSQL on 5432 or Redis on 6379), tell the
  person who holds it and offer the two options in
  [references/configuration.md → Port conflicts](references/configuration.md#port-conflicts).
  Moving Kiwi is usually the kinder default; stopping their other project is
  their call.

## Step 3 — Configure the backend (`kiwi/.env`)

```bash
cp kiwi/.env.example kiwi/.env      # only if it doesn't exist yet
```

The defaults already match `compose.yml`. You need from the person:

1. **An LLM API key.** Ask which provider they'll use. With OpenAI, only
   `LLM_API_KEY` is needed. With any other OpenAI-compatible provider, read
   [references/configuration.md → LLM providers](references/configuration.md#llm-providers)
   first — the embedding model's vector size matters and getting it wrong
   breaks retrieval in a way that's hard to spot later.
   Offer two ways to supply the key: they paste it into `kiwi/.env` themselves
   (most private), or they give it to you and you write it with:
   ```bash
   printf '%s' '<key>' | bash <skill-dir>/scripts/set-env.sh kiwi/.env LLM_API_KEY --stdin
   ```
2. **Optionally, their own admin password** (`SEED_ADMIN_PASSWORD`). If they
   don't choose one, the seed generates one and prints it once.

Then, without asking, replace the placeholder secrets — it costs nothing and
means a local instance that ends up exposed isn't trivially forgeable:

```bash
bash <skill-dir>/scripts/set-env.sh kiwi/.env JWT_SECRET --random
bash <skill-dir>/scripts/set-env.sh kiwi/.env SESSION_SECRET --random
```

**Other Kiwi checkouts on this machine.** Compose names the project after the
directory, so every checkout in a folder called `kiwi` shares the same
containers and database volume. If the doctor warns about containers from
another checkout, ask whether this checkout should share that data (then the
old admin password applies) or start clean. To start clean, set a distinct
project name — Compose reads it from `kiwi/.env`:

```bash
bash <skill-dir>/scripts/set-env.sh kiwi/.env COMPOSE_PROJECT_NAME kiwi-<something>
```

## Step 4 — Start the infrastructure

```bash
cd kiwi && docker compose up -d
```

Re-run the doctor until section 4 passes. Xberg's health check takes about a
minute after its container starts. `oss-init` shows as *exited* with code 0 —
that's correct; it's a one-shot job that creates the `kiwi` bucket and its
CORS policy. If a service fails, `docker compose logs <service>` (from `kiwi/`)
and [references/troubleshooting.md](references/troubleshooting.md).

## Step 5 — Backend

From `kiwi/` (with the Node prefix if needed):

```bash
npm install                 # also runs `prisma generate`
npx prisma migrate deploy
npx prisma db seed
```

**Capture the seed's admin banner** — the last lines, starting `Admin login`.
It shows the email (default `admin@example.com`) and either:

- a generated password marked *shown once* — give it to the person and tell
  them to save it; it is not stored anywhere readable;
- `from SEED_ADMIN_PASSWORD` — the one they chose;
- `unchanged (already set)` — the database already had an admin (an earlier
  install, or a shared volume from another checkout). If the person doesn't
  know that password, set `SEED_ADMIN_PASSWORD` and run the seed again; that
  resets it and nothing else.

Then start the dev server in the background (see *Running commands as an
agent*): `npm run start:dev`. It is ready when the log shows
`Nest application successfully started`, or when the doctor reports the
backend up. `GET /health` also works: it reports whether the backend can reach
its database.

## Step 6 — Frontend

From `kiwi-ui/`:

```bash
cp .env.example .env        # only if it doesn't exist yet; defaults work locally
npm install
npm run dev                 # background; serves http://localhost:3001
```

`VITE_*` values are read when the dev server starts, so restart it after
editing `kiwi-ui/.env`.

## Step 7 — Confirm and hand over

Run the doctor; everything should pass (warnings are fine to mention and move
past). Then give the person a short, plain summary:

- Open **http://localhost:3001** and sign in with **admin@example.com** and
  the password from step 5.
- What's running and how to stop/start it later (below).
- Offer to walk them through first use — creating a class, uploading a PDF,
  chatting as a student. Follow [references/using-kiwi.md](references/using-kiwi.md).
  If you have browser tools, offer to drive it while they watch.

## Stopping and starting later

From the repository root:

| To | Run |
|---|---|
| Stop the dev servers | stop the background processes (or Ctrl-C in their terminals) |
| Stop the infrastructure, keeping all data | `cd kiwi && docker compose stop` |
| Start again | `cd kiwi && docker compose up -d`, then `npm run start:dev` in `kiwi/` and `npm run dev` in `kiwi-ui/` |
| See what's up | `bash <skill-dir>/scripts/doctor.sh` |

After pulling new code: `npm install` in both apps and
`npx prisma migrate deploy` in `kiwi/` before starting.

## Where to go next

- **Something is broken** → [references/troubleshooting.md](references/troubleshooting.md)
- **Google sign-in, branding, Qwen, other LLM providers, other ports,
  Unstructured parser, email** → [references/configuration.md](references/configuration.md)
- **Using Kiwi: classes, materials, students, roles** → [references/using-kiwi.md](references/using-kiwi.md)
- **Deeper docs** — `docs/README.md` indexes them (administration, prompts,
  embeddings, parsers, object storage, MCP, Kiwi Apps). Prefer them over
  guessing; they are checked against the code.
