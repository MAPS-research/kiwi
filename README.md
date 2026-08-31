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
| [`kiwi-ui/`](kiwi-ui) | Frontend — React 19 + TypeScript, Vite, MUI | MIT |
| [`kiwi-app-sdk/`](kiwi-app-sdk) | SDK for building embedded Kiwi Apps | MIT |
| [`kiwi-app-developer-guide-example/`](kiwi-app-developer-guide-example) | Zero-build reference app + developer guide | MIT |
| [`docs/`](docs) | Project documentation | CC BY 4.0 |

Code is MIT licensed (see [LICENSE](LICENSE)). The `docs/` directory is licensed
CC BY 4.0 (see [docs/LICENSE](docs/LICENSE)).

## Quick start

Requires Node.js 20 (see `kiwi/.nvmrc`) and Docker.

```bash
# 1. Infrastructure: PostgreSQL/pgvector, Redis, MinIO
cd kiwi
cp .env.example .env          # then fill in LLM_API_KEY, Google OAuth, etc.
docker compose up -d

# 2. Backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev             # http://localhost:3000  (Swagger at /docs)

# 3. Frontend, in another shell
cd ../kiwi-ui
cp .env.example .env
npm install
npm run dev                   # http://localhost:3001
```

See [`kiwi/README.md`](kiwi/README.md) and [`kiwi-ui/README.md`](kiwi-ui/README.md)
for the full setup, and [`docs/`](docs) for deeper topics — retrieval and
embeddings, webhooks, JWT configuration, and the MCP developer guide.

## Configuring Kiwi for your institution

Kiwi ships unbranded. Institution name, logo, support address, SSO email domain
and consent document are all supplied through `VITE_*` environment variables —
see [`kiwi-ui/src/config/branding.ts`](kiwi-ui/src/config/branding.ts) and
`kiwi-ui/.env.example`. Nothing institution-specific is hardcoded.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues should be reported
privately — see [SECURITY.md](SECURITY.md), not the public issue tracker.

Kiwi was built at NYU Shanghai; the people who wrote it are credited in
[AUTHORS.md](AUTHORS.md).

## AI assistance

Parts of this codebase were written with the help of AI coding agents, primarily
**Claude** and **Codex**. All contributions were reviewed by human maintainers
before merging.
