# @maps-research/kiwi-app-sdk

A TypeScript SDK for building Kiwi Apps: web pages that Kiwi shows in an
`<iframe>`. The SDK handles all messaging between your app and the Kiwi page
that embeds it (the *host*). That messaging is called the *bridge*. This README
covers the SDK's API. For concepts and app registration, read the
[Kiwi App developer guide](../kiwi-app-developer-guide-example/KIWI_APP_DEVELOPER_GUIDE.md).

Your app never calls the Kiwi backend itself. To get data, it asks for an *op*
over the bridge, and the host makes the backend call with an app token that
stays inside the host. So your app needs no token, no CORS entry and no backend
URL.

Apps receive the user's opaque ID, never their name or email.

The SDK has a built-in Simulator, so you can develop your app without a Kiwi
backend.

```ts
import { createKiwiApp } from '@maps-research/kiwi-app-sdk';

const kiwi = createKiwiApp({ appSlug: 'my-app' });
kiwi.onContext((ctx) => console.log('class', ctx.classId, 'role', ctx.userRole));
await kiwi.ready();

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

The package isn't on npm yet. Until it is, install it from a local copy of this
repository:

```bash
npm install /path/to/kiwi/kiwi-app-sdk
```

Once it's published, install it with:

```bash
npm install @maps-research/kiwi-app-sdk
```

### Apps without a build step

If your app has no bundler, load the SDK as a single file with a `<script>` tag.
The file defines a global `KiwiApp` object:

```html
<script src="https://kiwi.example.edu/sdk/v1/kiwi-app-sdk.js"
        integrity="sha384-<hash of the exact file>"
        crossorigin="anonymous"></script>
<script>
  const kiwi = KiwiApp.create({ appSlug: 'my-app' });
</script>
```

You can get this file from three places:

- the Kiwi UI serves it at `/sdk/v1/kiwi-app-sdk.js`;
- this package builds it as `dist/kiwi-app-sdk.global.js`, also exported as
  `@maps-research/kiwi-app-sdk/browser`;
- the example app keeps a copy in
  `kiwi-app-developer-guide-example/kiwi-app-sdk/`.

If you load the file from another origin, set `integrity`. The hash changes with
every build, so compute it from the exact file you use:

```bash
openssl dgst -sha384 -binary dist/kiwi-app-sdk.global.js | openssl base64 -A
```

If you host a copy on your own origin, you don't need `integrity`.

## API

### `createKiwiApp(options)`

Creates a client. `KiwiApp.create` is the same function in the single-file build.

| Option | Default | Meaning |
| --- | --- | --- |
| `appSlug` | `''` | Your app's slug. |
| `mode` | `'auto'` | `'auto'` connects to Kiwi when the page is embedded, and uses the Simulator otherwise. `'live'` and `'sim'` force one mode. |
| `timeoutMs` | `30000` | How long to wait before giving up, in milliseconds. Applies to ops and to `askAI`. For ops, the SDK waits at least 5 seconds longer than the op's own time limit (see [BRIDGE-OPS.md](./BRIDGE-OPS.md)). |
| `liveFallbackMs` | `1500` | In `'auto'` mode, if the page is embedded but Kiwi hasn't sent `kiwi:context` within this many milliseconds, the SDK switches to the Simulator. `0` turns this off. |
| `readyPayload` | `{ preferredChatMode: 'sidepanel' }` | The payload the SDK sends with `kiwi:ready`. |
| `onEvent` | none | Debugging hook, called as `(direction, type, data)` for every message. `direction` is `'out'`, `'in'`, `'sim'` or `'err'`. |
| `simulator` | `{}` | Replacement Simulator data (see [Simulator](#simulator)). |

### Client

| Member | What it does |
| --- | --- |
| `ready()` | Sends `kiwi:ready`. The returned promise resolves with the first context Kiwi sends, and later calls return that same first context. Calling `ready()` again still makes Kiwi send a fresh context, which arrives through `onContext` and `context`. |
| `onContext(cb)` | Calls `cb` with each context Kiwi sends. If a context has already arrived, `cb` is called with it immediately. |
| `onToken(cb)` | Calls `cb` with each `kiwi:appToken` the app receives. |
| `onStatus(cb)` | Calls `cb` whenever the connection status changes: `'connecting'`, `'live'` or `'sim'`. |
| `askAI(prompt, { onChunk, onDone, onError })` | Asks Kiwi's AI a question. The request runs under the signed-in user's session. The promise resolves with the complete answer. `onChunk(delta, full)` is called as the answer streams in. `full` is the whole answer so far, and it can get shorter between calls, so display `full`. |
| `updateContext(text)` | Tells Kiwi's AI what the user is currently doing in your app. Sends only `context`. |
| `documentChunks(params?)` | Op: returns the parsed text of the class's documents, in pages. Pass `nextCursor` as `cursor` to get the next page. |
| `contextualChat(params)` | Op: runs an admin-approved prompt over the student's learning data. Only the model's output comes back to your app. |
| `call(op, params)` | Runs any op by name. Use it for ops that have no method of their own. |
| `ops()` | Lists the names of the available ops. |
| `navigate({ action } \| { path })` | Moves the Kiwi page: `action` is `'back'` or `'forward'`, and `path` must be inside the current class. Resolves with `{ ok, error? }`. |
| `setChatDisplayMode(mode)` | Changes the chat layout: `'modal'`, `'sidepanel'`, `'snap'` or `'fullscreen'`. Resolves with `{ ok, error? }`. |
| `requestToken()` | Asks Kiwi to send the raw app token, which arrives through `onToken`. Use this only if your app calls a backend directly. Never store the token or write it to logs. |
| `setMode(mode)` | Switches between `'live'` and `'sim'`, and then sends `kiwi:ready` again. |
| `context` | The most recent context, or `null` if none has arrived. |
| `mode` | The current mode: `'live'` or `'sim'`. |

The context has this shape:
`{ classId, className?, userId, userRole?, appId?, appSlug?, uiSlug?, capabilities? }`.
`userId` is an opaque ID. The context never includes the user's name or email.

The SDK doesn't handle some messages:

- `kiwi:requestContext`
- `tutoringMode` in `kiwi:updateContext`
- the admin-panel messages (`kiwi:error`, `kiwi:adminNavigation`,
  `kiwi:adminNavigate`)

To use these, send or listen for the messages yourself. The
[developer guide](../kiwi-app-developer-guide-example/KIWI_APP_DEVELOPER_GUIDE.md#bridge-protocol)
describes their formats.

### Errors

When an op fails, its promise rejects with an `Error` that has two extra
properties: `code`, and `status` (the HTTP status). Possible codes:

| Code | Meaning |
| --- | --- |
| `op_not_granted` | Your app lacks a scope this op needs. The message lists the missing scopes. |
| `token_error` | The host couldn't get an app token, for example because the user isn't in the class or the app isn't enabled there. |
| `backend_error` | The backend returned an error. `status` holds its HTTP status. |
| `network_error` | The request didn't complete. |
| `timeout` | The op didn't finish in time. The host or the SDK can report this. |
| `not_ready` | The host doesn't know the class yet. |
| `unknown_op` | The host, or the Simulator, doesn't know this op. |

If you pass `call()` an op name the SDK doesn't recognize, the promise rejects
with an `Error` that has no `code`.

If `askAI` fails, its promise rejects with the host's error message. If it runs
out of time, it rejects with code `timeout`.

`navigate` and `setChatDisplayMode` never reject. They resolve with
`{ ok, error? }`, so calling them without `await` is safe. Possible error codes:

| Code | Meaning |
| --- | --- |
| `blocked_out_of_scope` | The path is outside the current class. |
| `invalid_mode` | The chat layout name isn't one of the four supported values. |
| `invalid_request` | The call had neither `action` nor `path` (`navigate`), or no `mode` (`setChatDisplayMode`). |
| `timeout` | The host didn't confirm within 5 seconds. This always happens in admin panels, because their host doesn't confirm navigation. |

## Simulator

When your page isn't embedded in Kiwi, the SDK makes up every reply the host
would send: the context, an app token, streamed AI answers, op results and
confirmations. You can replace any of this data:

```ts
const kiwi = createKiwiApp({
  mode: 'auto',
  simulator: {
    context: { classId: 'c1', userId: 'u1', userRole: 'student' },
    token: null,                       // null: send no simulated token
    ai: (prompt) => `echo: ${prompt}`,
    ops: {
      documentChunks: () => ({ classId: 'c1', documents: [], nextCursor: null, hasMore: false }),
    },
  },
});
```

The default `documentChunks` data has two pages. A loop that follows
`nextCursor` ends offline just as it would against a real backend. The simulated
`navigate` follows the host's rules for which paths are allowed.

## Ops

[BRIDGE-OPS.md](./BRIDGE-OPS.md) is the op reference. For each op it lists the
endpoint, the scopes needed, the parameters your app can send, the parameters
the host fills in, and the time limit.

The host always sets `classId` and `appSlug` itself, so an app can't send a
request for another class or another app.

## Development

```bash
npm install
npm run typecheck
npm run build      # dist/: ESM + CJS + .d.ts + dist/kiwi-app-sdk.global.js
```

After building, copy `dist/kiwi-app-sdk.global.js` to both of these places, so
the three copies stay identical:

- `kiwi-ui/public/sdk/v1/kiwi-app-sdk.js`
- `kiwi-app-developer-guide-example/kiwi-app-sdk/kiwi-app-sdk.js`

### Regenerating the op layer

These files are generated. Don't edit them by hand:

- `src/ops.generated.ts`
- `BRIDGE-OPS.md`
- the host's `kiwi-ui/src/apps/classApps/bridgeOps.generated.ts`

The generator, `scripts/generate-bridge.mjs`, reads the backend's OpenAPI spec.
In that spec, every endpoint that apps can reach over the bridge is marked with
an `x-kiwi-bridge-op` extension. The extension comes from the `@BridgeOp()`
decorator in the backend code.

To regenerate, start the backend at `localhost:3000`, then run:

```bash
# SDK types and BRIDGE-OPS.md (from kiwi-app-sdk/)
npm run generate-bridge            # KIWI_SPEC=<url or file> to use another spec

# Host dispatch table (from kiwi-ui/, after `npm run generate-openapi`)
node ../kiwi-app-sdk/scripts/generate-bridge.mjs \
  --spec http://localhost:3000/docs-json --host-out src/apps/classApps
```

`--spec` accepts a URL or a file path. The script writes only the outputs you
name with `--sdk-out`, `--host-out` or `--docs-out`.

## License

MIT
