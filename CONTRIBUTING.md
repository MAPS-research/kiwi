# Contributing to Kiwi

Thanks for your interest. Kiwi is a monorepo — backend, frontend, SDK, example
app, and docs live together and are versioned together.

## Branches

Work happens on **`development`**, the default branch. Open pull requests
against it.

## Getting set up

See the [quick start](README.md#quick-start). In short: `docker compose up -d`
in `kiwi/` for infrastructure, then `npm install` in `kiwi/` and `kiwi-ui/`.
[docs/development.md](docs/development.md) covers migrations, seeding, feature
flags and exploring the API.

## Before opening a pull request

Run the checks for whatever you touched:

```bash
# from the repository root
(cd kiwi         && npx prisma generate && npm test && npm run build)
(cd kiwi-ui      && npm run test:run && npm run build)
(cd kiwi-app-sdk && npm run typecheck && npm run build)
```

`npm run build` (Nest) is the backend's type gate; a bare `npx tsc --noEmit`
reports some pre-existing noise. The backend doesn't pass `npm run lint` yet,
so lint the files you change: `npx eslint --fix src/path/to/file.ts`.

If you change backend endpoints or DTOs, regenerate the frontend client with
`npm run generate-openapi` in `kiwi-ui/` while the backend is running.

If you change the backend's system prompts, the prompt snapshots will fail —
review the diff carefully, then update them with `npx jest -u` for that spec.
See [How prompts work](docs/prompts.md#changing-the-built-in-prompts).

If you change the SDK, rebuild it and re-vendor the single-file build into both
consumers: `kiwi-ui/public/sdk/v1/kiwi-app-sdk.js` and
`kiwi-app-developer-guide-example/kiwi-app-sdk/kiwi-app-sdk.js`. They must stay
byte-identical.

## Known: the test suites are not yet a CI gate

Both suites have failures that predate the open-source release, so CI currently
runs them as non-gating and only *builds* are required to pass:

- `kiwi-ui` — 9 failing tests (`Theme.test.ts` chart palette, 4 in
  `GoogleRedirectHandler.test.tsx`, 2 in `MCPServerDialog.test.tsx`, 2 in
  `BatchMaterialsUpload.test.tsx`)
- `kiwi` — 39 failing tests across 29 suites, several of which are TypeScript
  errors in the spec files themselves (e.g. `ConsentGuard` constructor arity,
  a missing `FeatureFlagsGuard` export)

Fixing these and making the suites gating is a good first contribution. Please
don't add new failures in the meantime — run the tests locally and compare.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
`fix(auth): reject expired app tokens`. Reference issues with `Closes #123`.

## Things to keep in mind

**Kiwi Apps never receive user identity.** Embedded apps see opaque user UUIDs
and nothing else. Do not add roster, class-member, or user-lookup endpoints to
the App API, and do not put name or email claims about *other* users into an app
token. Apps are external and increasingly third-party; handing one a class
roster hands it the students. See `kiwi/CLAUDE.md`.

**Keep the project institution-neutral.** Institution name, logo, support
address, SSO domain, and consent document are configuration
(`kiwi-ui/src/config/branding.ts`), not constants. Please don't hardcode
deployment-specific values.

## AI assistance

Contributions made with AI coding assistants are welcome. You are responsible
for reviewing and understanding anything you submit, and for it meeting the same
bar as hand-written code.
