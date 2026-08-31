# Contributing to Kiwi

Thanks for your interest. Kiwi is a monorepo — backend, frontend, SDK, example
app, and docs live together and are versioned together.

## Branches

- **`development`** — the default branch and where the next release is built.
  Open pull requests against this.
- **`master`** — stable; what production deployments track.

## Getting set up

See the [quick start](README.md#quick-start). In short: `docker compose up -d`
in `kiwi/` for infrastructure, then `npm install` in `kiwi/` and `kiwi-ui/`.

## Before opening a pull request

Run the checks for whatever you touched:

```bash
cd kiwi      && npm test && npx tsc --noEmit && npm run build
cd kiwi-ui   && npm run test:run && npm run build
cd kiwi-app-sdk && npm run typecheck && npm run build
```

If you change the backend's system prompts, the prompt snapshots will fail —
review the diff carefully, then update them with `npm test -- -u`.

If you change the SDK, rebuild it and re-vendor the single-file build into both
consumers: `kiwi-ui/public/sdk/v1/kiwi-app-sdk.js` and
`kiwi-app-developer-guide-example/kiwi-app-sdk/kiwi-app-sdk.js`. They must stay
byte-identical.

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
