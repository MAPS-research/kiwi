# Kiwi

Kiwi is an open-source AI learning assistant for university courses. Students ask
questions against their own course materials; instructors manage classes, upload
materials, and see how their cohort is doing. Retrieval runs over pgvector with
pluggable embedding providers, and third-party **Kiwi Apps** can be embedded in
the UI through a sandboxed postMessage bridge.

## Repository layout

| Directory | What it is | License |
|---|---|---|
| [`kiwi/`](kiwi) | Backend — NestJS + Prisma (PostgreSQL/pgvector), BullMQ, MCP server | MIT |
| [`kiwi-ui/`](kiwi-ui) | Frontend — React 19 + TypeScript, Vite, MUI, Tailwind | MIT |
| [`kiwi-app-sdk/`](kiwi-app-sdk) | SDK for building embedded Kiwi Apps | MIT |
| [`kiwi-app-developer-guide-example/`](kiwi-app-developer-guide-example) | Zero-build reference app + developer guide | MIT |
| [`docs/`](docs) | Project documentation | CC BY 4.0 |

Code is MIT licensed (see [LICENSE](LICENSE)). The `docs/` directory is licensed
CC BY 4.0 (see [docs/LICENSE](docs/LICENSE)).

## Quick start

Requires Docker and Node.js 24 (`kiwi/.nvmrc` and `kiwi-ui/.nvmrc` both pin
24.21.0).

```bash
# 1. Infrastructure: PostgreSQL/pgvector, Redis, RustFS, Adminer, and the
#    Xberg document parser (see docs/parsers.md for Unstructured instead)
cd kiwi
cp .env.example .env          # then set LLM_API_KEY (Google sign-in is optional)
docker compose up -d

# 2. Backend
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed            # creates the admin account and prints its password
npm run start:dev             # http://localhost:3000  (Swagger at /docs)

# 3. Frontend, in another shell
cd ../kiwi-ui
cp .env.example .env
npm install
npm run dev                   # http://localhost:3001
```

Log in at http://localhost:3001 with the admin email and password printed by
`npx prisma db seed`. To choose the password yourself, set `SEED_ADMIN_PASSWORD`
before seeding; re-running the seed never changes an existing password unless
it is set. Further accounts are created from **Admin → User Management**.

Password login is the default. Google sign-in is opt-in: set `GOOGLE_CLIENT_ID`
and `GOOGLE_CLIENT_SECRET` in `kiwi/.env` and `VITE_ENABLE_GOOGLE_LOGIN=true` in
`kiwi-ui/.env`.

See [`kiwi/README.md`](kiwi/README.md) and [`kiwi-ui/README.md`](kiwi-ui/README.md)
for the full setup.

## Documentation

The [documentation index](docs/README.md) covers administration and a
production checklist, [how prompts work](docs/prompts.md), learning
experiments, the MCP server, building Kiwi Apps, and backend development.

## Configuring Kiwi for your institution

Kiwi ships unbranded. Institution name, logo, support address, SSO email domain
and consent document are supplied through `VITE_*` environment variables — see
[`kiwi-ui/.env.example`](kiwi-ui/.env.example) and
[Administration](docs/administration.md#branding). Course-specific guidance for
the assistant is set per class; see [How prompts work](docs/prompts.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues should be reported
privately — see [SECURITY.md](SECURITY.md), not the public issue tracker.

Kiwi was built at NYU Shanghai; the people who wrote it are credited in
[AUTHORS.md](AUTHORS.md).

## AI assistance

Parts of this codebase were written with the help of AI coding agents, primarily
**Claude** and **Codex**. All contributions were reviewed by human maintainers
before merging.
