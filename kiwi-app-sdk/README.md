# @maps-research/kiwi-app-sdk

SDK for **external Kiwi Apps** — pages Kiwi embeds in an `<iframe>`.

Your app talks to Kiwi **only through the window/postMessage bridge**, which this
SDK wraps. It never calls the Kiwi backend directly: data/LLM **ops** are
**proxied by the host** (kiwi-ui), which makes the real call with the app token.

So your app needs **no token, no CORS entry, and no backend URL** — and the app
token never touches it. Access is always the signed-in user's, narrowed by the
scopes your app was granted: an app can never widen a user's access.

Works standalone via a built-in **Simulator**, so you can build offline.

```ts
import { createKiwiApp } from '@maps-research/kiwi-app-sdk';

const kiwi = createKiwiApp({ appSlug: 'demo' });
kiwi.onContext((ctx) => console.log('class', ctx.classId, 'role', ctx.userRole));
await kiwi.ready();

// Host-proxied App API ops — fully typed
const { documents, nextCursor, hasMore } = await kiwi.documentChunks({ limit: 50 });

const coaching = await kiwi.contextualChat({
  promptId: 'weekly-summary',
  contextRequest: {
    kind: 'student_learning_context',
    scope: 'current_user_current_class',
    include: ['recent_questions', 'weak_concepts'],
  },
});
```

## Install

```bash
npm install @maps-research/kiwi-app-sdk
```

No registry configuration or auth token is needed.

To build against a local checkout of this monorepo instead, point your app at
the workspace copy:

```bash
npm install /path/to/kiwi/kiwi-app-sdk
```

### Zero-build apps (`<script>` tag)

If your app has no bundler, load the single-file build. kiwi-ui serves a
version-pinned copy so an embedded app always matches the host's bridge:

```html
<script src="https://<your-kiwi-ui-host>/sdk/v1/kiwi-app-sdk.js"
        integrity="sha384-<hash-for-this-release>"
        crossorigin="anonymous"></script>
<script>
  const kiwi = KiwiApp.create({ appSlug: 'demo' });
</script>
```

The same file ships in the package at `dist/kiwi-app-sdk.global.js`.

> **Pin it.** You're loading executable code cross-origin from the host, so add
> Subresource Integrity. The hash changes every release — compute it from the
> exact file you're pinning:
>
> ```bash
> openssl dgst -sha384 -binary dist/kiwi-app-sdk.global.js | openssl base64 -A
> ```
>
> Omit `integrity` only if you vendor the file into your own origin instead.

## API

| Call | Purpose |
| --- | --- |
| `ready()` | Post `kiwi:ready`; resolves with the first `context`. |
| `onContext(cb)` / `onToken(cb)` / `onStatus(cb)` | Subscribe to host events. |
| `askAI(prompt, { onChunk, onDone, onError })` | Streaming AI via the user's session — no token, no CORS. Resolves with the full answer. |
| `updateContext(text)` | Ground Kiwi's AI in what the user is doing in your app. |
| `documentChunks(params)` | **Op** — parsed text chunks of the class's documents. Page with `nextCursor`. |
| `contextualChat(params)` | **Op** — run an approved prompt over the student's private learning context; you get only the model output. |
| `call(op, params)` | Escape hatch for ops without a typed wrapper. |
| `navigate({ action \| path })` | Acked — resolves `{ ok, error? }`. |
| `setChatDisplayMode(mode)` | Acked — resolves `{ ok, error? }`. |
| `context` / `mode` / `ops()` | Current context, `'live' \| 'sim'`, available op names. |

### Errors

Ops **reject** with an `Error` carrying `code` and `status`:
`unknown_op`, `op_not_granted` (your app lacks the scope), `invalid_params`,
`not_ready`, `token_error`, `backend_error`, `network_error`, `timeout`.

`navigate` / `setChatDisplayMode` **resolve** with `{ ok, error? }` and never
reject — they're often called fire-and-forget, and rejecting would produce
unhandled rejections for callers that don't await. Codes:
`blocked_out_of_scope`, `invalid_mode`, `invalid_request`, `timeout`.

> These two are acked precisely because they used to be send-and-hope: a path
> outside the class was refused, and a display-mode request was dropped whenever
> the user had ever chosen a layout themselves — both looked identical to
> success. Await them if you care whether they happened.

## Simulator

Standalone (not embedded), the SDK fakes every host reply — context, token, the
AI stream, and op responses — so you can develop without a backend. Override any
fixture:

```ts
const kiwi = createKiwiApp({
  mode: 'auto',            // 'auto' (default) | 'live' | 'sim'
  simulator: {
    context: { classId: 'c1', userId: 'u1', userRole: 'student' },
    ops: { documentChunks: (p) => ({ classId: 'c1', documents: [], nextCursor: null, hasMore: false }) },
  },
});
```

The default `documentChunks` fixture is a real two-page cursor walk, so paging
loops terminate offline exactly as they would live.

## Scopes an op needs

| Op | Scopes |
| --- | --- |
| `documentChunks` | `class:materials:chunks:read` |
| `contextualChat` | `context:student_learning:read` + `llm:prompt:<promptId>` (prompt must be admin-approved) |

The host injects `classId` / `appSlug` from trusted context — your app cannot
address another class or app.

## Development

```bash
npm install
npm run typecheck
npm run build      # dist/: ESM + CJS + .d.ts + single-file IIFE
```

Publishing to npm is done by a maintainer from a tagged release.

### Roadmap

The op wrappers, their param/result types, and the Simulator fixtures are
hand-written today. They will be emitted by `generate-bridge` from the Kiwi
backend's OpenAPI `x-kiwi-bridge-op` extensions, so op params, response types,
and required scopes can never drift from the real endpoints.
