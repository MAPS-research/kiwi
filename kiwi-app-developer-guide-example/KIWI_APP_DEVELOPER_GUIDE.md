# Kiwi App developer guide

A Kiwi App is a web page you host yourself. Kiwi shows it in an iframe inside a
class or in the admin area. This guide is for developers who build those apps.
It covers how an app is registered, the messages it exchanges with Kiwi, and how
permissions work.

Related references:

- [SDK README](../kiwi-app-sdk/README.md): the full `@maps-research/kiwi-app-sdk` API.
- [BRIDGE-OPS.md](../kiwi-app-sdk/BRIDGE-OPS.md): the data operations an app can call, generated from the backend.
- [hello-kiwi-app](./hello-kiwi-app/): a working example app with no build step.
- [MCP server](../docs/mcp.md): for full MCP clients, which are not iframe apps.

## Concepts

**The host and the bridge.** The host is the Kiwi web UI (`kiwi-ui`). It loads
your app in an `<iframe>`, and the two talk by sending `window.postMessage`
messages. This channel is the *bridge*. The app never has to call the Kiwi
backend itself.

**How an app reads data.** An app reads Kiwi data by sending a named *op* over
the bridge, for example `documentChunks`. The host calls the backend with an app
token that it keeps to itself, and then posts the result back. Because of this,
the app needs no token, no CORS entry and no backend URL.

**What an app can access.** An app token belongs to the signed-in user and is
limited to one class. It carries only the scopes the app was granted. An app
can never read something the user couldn't read themselves.

**What apps don't learn about users.** Apps get opaque user IDs and nothing
more. No message, op or token gives an app a person's name or email, whether
for the current user or anyone else. If your app has to tell people apart, for
example in a grading view, show a shortened ID or a label your app assigns.
Don't try to look up names. This is a deliberate boundary, not a missing
feature.

**Placements.** An app registers one or more UIs, and each UI has a `placement`
that says where it appears:

| Placement | Where it appears |
| --- | --- |
| `class-tab` | A tab on the class page, at `/:classID/app/:appSlug`. |
| `admin-panel` | An entry in the admin sidebar, at `/admin/app/:appSlug` (no class) and `/admin/app/:appSlug/class/:classId`. |
| `class-admin-panel` | A card on a class's admin page, at `/admin/class/:classID/app/:appSlug`. If the app also has an `admin-panel` UI, the host opens that one instead. |
| `modal`, `dashboard-widget` | Accepted by the backend but not shown by the host yet. |

Class tabs get the full set of bridge messages. Admin panels get a smaller set
(see [Admin panels](#admin-panels)).

## Quick start

The example app, `hello-kiwi-app`, demonstrates every class-tab feature. You can
run it on its own or inside Kiwi.

### On its own (no backend)

When the page isn't embedded in Kiwi, the SDK starts a built-in Simulator that
fakes every reply from the host. From the repository root:

```bash
cd kiwi-app-developer-guide-example
python3 -m http.server 8000
# open http://localhost:8000/hello-kiwi-app/
```

Start the server in `kiwi-app-developer-guide-example/` itself, not in
`hello-kiwi-app/`, because the page loads the SDK from
`../kiwi-app-sdk/kiwi-app-sdk.js`.

### Inside Kiwi

You need the Kiwi backend and UI running, plus an admin account.

1. On a fresh database, run `npx prisma db seed` in `kiwi/`. This creates the
   admin account `admin@example.com` and the class `seed-class-001`. It prints
   the admin password, unless you set one with `SEED_ADMIN_PASSWORD`.
2. Register the app:

   ```bash
   cd kiwi-app-developer-guide-example/hello-kiwi-app
   ADMIN_PASSWORD=... CLASS_ID=seed-class-001 ./register.sh
   ```

   The script runs all four [registration](#registration) steps. `APP_URL`
   (default `http://localhost:8000/hello-kiwi-app/`) must be the exact origin
   and path you serve the page from. The script's header lists the other
   settings you can override.
3. Keep the static server from the previous section running, and open the class
   in Kiwi.

A **Hello Kiwi** tab appears. When it loads, the app connects to Kiwi and the
document-chunks card returns data.

### A minimal app

This page loads the SDK from the Kiwi UI and shows the context it receives:

```html
<!doctype html>
<html>
  <body>
    <pre id="out">connecting…</pre>
    <script src="http://localhost:3001/sdk/v1/kiwi-app-sdk.js"></script>
    <script>
      const kiwi = KiwiApp.create({ appSlug: 'my-app' });
      kiwi.ready().then((ctx) => {
        document.getElementById('out').textContent = JSON.stringify(ctx, null, 2);
      });
    </script>
  </body>
</html>
```

## Registration

An app has to go through four steps, in this order, before it appears in a
class:

1. **Whitelist:** an admin approves the app's slug.
2. **Register:** the app sends its details.
3. **Approve prompts:** an admin approves the app's prompts, if it has any.
4. **Enable:** a class manager turns the app on in a class.

Admins do steps 1 and 3 on the **App Registry** page (`/admin/kiwi-apps`).

Admin endpoints need both a bearer token and a signed-in session cookie; a token
by itself is rejected. `register.sh` shows how to handle this. It logs in with
`POST /auth/login`, keeps the session cookie, and sends both the cookie and the
token on every admin call.

### 1. Whitelist (admin)

`POST /api/kiwi-apps/whitelist`

```json
{
  "slug": "my-app",
  "registrationSecret": "at-least-32-characters-shared-out-of-band",
  "baseUrl": "https://apps.example.edu/my-app/",
  "status": "approved",
  "description": "What the app is for",
  "maxScopes": ["class:materials:chunks:read", "llm:prompt:weekly-summary"]
}
```

- **`registrationSecret`** must be at least 32 characters. Kiwi stores only a
  bcrypt hash of it. The admin gives the developer the plain secret separately,
  not through Kiwi.
- **`status`** defaults to `pending`. Registration fails until it is `approved`.
- **`maxScopes`** is the most this app can ever be granted, in any class. See
  [Scopes and tokens](#scopes-and-tokens).
- **Changing an entry:** calling this endpoint again for the same slug returns
  409. Use `PATCH /api/kiwi-apps/whitelist/:slug` instead.

### 2. Register (app)

`POST /api/kiwi-apps/register`

This endpoint doesn't need a login. Instead, it checks that the slug is
whitelisted and that the secret matches.

```json
{
  "slug": "my-app",
  "registrationSecret": "at-least-32-characters-shared-out-of-band",
  "name": "My App",
  "baseUrl": "https://apps.example.edu/my-app/",
  "appType": "frontend_only",
  "capabilities": ["ai"],
  "config": { "tutoringMode": "guidance" },
  "uis": [
    {
      "uiSlug": "student",
      "uiName": "My App",
      "uiUrl": "https://apps.example.edu/my-app/",
      "placement": "class-tab",
      "allowedRoles": ["student", "ta", "instructor", "admin"],
      "tabOrder": 0
    }
  ],
  "prompts": [
    {
      "promptId": "weekly-summary",
      "name": "Weekly Study Summary",
      "systemPrompt": "You are a supportive study coach…",
      "maxTokens": 600,
      "temperature": 0.4
    }
  ]
}
```

- **Registering again** with the same slug updates the app. It also creates or
  updates the UIs and prompts you list, so an app can safely register every
  time it starts. If a prompt's `systemPrompt` text has changed, Kiwi turns that
  prompt off until an admin approves it again.
- **`uiUrl`** is the page the host loads in the iframe. The host accepts
  messages only from this URL's origin. If an app has no enabled `class-tab`
  UI, the class tab loads the app's `baseUrl` instead.
- **`capabilities`** is mostly informational. The host acts on one value only:
  `mcp`, which makes the class tab send the app its token (see
  [When the app gets the token](#when-the-app-gets-the-token)).
- **`config.tutoringMode`** sets how the AI tutors in your app's AI requests. A
  class's own `config` can override it.
- **`allowedRoles`** only controls whether an `admin-panel` entry appears in the
  admin sidebar. It is not access control, and the class tab doesn't use it.
- **`appType: "full"` and `mcpServerUrl`** are saved, but nothing uses them yet:
  Kiwi doesn't call MCP servers that apps provide.

### 3. Approve prompts (admin)

Kiwi saves every new prompt as inactive. An admin manages prompts with two
endpoints:

- `POST /api/kiwi-apps/:slug/prompts/:promptId/approve` turns a prompt on.
- `POST /api/kiwi-apps/:slug/prompts/:promptId/revoke` turns it off.

An app token includes `llm:prompt:<promptId>` only when both of these are true:

- the prompt is active;
- the whitelist `maxScopes` contains that exact scope or `llm:prompt:*`.

### 4. Enable in a class (class manager)

`POST /api/classes/:classId/apps`

```json
{
  "appId": "<KiwiApp.id returned by register>",
  "tabLabel": "My App",
  "tabOrder": 0,
  "enabledScopes": ["class:materials:chunks:read"],
  "config": {}
}
```

Related endpoints:

| Endpoint | Purpose |
| --- | --- |
| `PATCH /api/classes/:classId/apps/:appId` | Changes `tabOrder`, `tabLabel`, `config`, `enabledScopes` or `isEnabled`. |
| `DELETE /api/classes/:classId/apps/:appId` | Turns the app off in the class. |
| `PUT /api/classes/:classId/apps/order` | Reorders the class's app tabs. |
| `GET /api/classes/:classId/apps` | Lists the class's enabled apps. Any signed-in user can call it. |

Only three kinds of user can make the write calls:

- an admin;
- a professor enrolled in that class;
- an instructor assigned to that class.

In the UI, these settings are on the **Class Apps** page
(`/admin/class/:classID/kiwi-apps`). The class admin menu hides that page from
users whose class role is `instructor`, so those users have to use the API.

### Other app endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /api/kiwi-apps/:slug/heartbeat` | Records that the app is alive (updates `lastSeenAt`). Needs no login. |
| `GET /api/kiwi-apps/:slug/scopes` | Shows the app's `maxScopes` and its active prompt scopes. |
| `GET /api/kiwi-apps/:slug/scopes/:classId` | Shows the class's `enabledScopes` and the resulting effective scopes. |
| `POST /api/kiwi-apps/:slug/audit/context-update` | Adds an entry to the app's audit log. |

## Bridge protocol

Every bridge message has the form `{ type, payload }`. The SDK sends and parses
these messages for you. This section is for debugging and for apps that don't
use the SDK.

### Security

**Host side.** The host accepts a message only if it comes from the origin of
the UI's `uiUrl`. On a class tab with no enabled `class-tab` UI, the host checks
against the app's `baseUrl` instead. Admin panels also check that the message
came from their own iframe (`event.source`). The host sends replies only to that
same origin.

**App side.** Before trusting a message, check that
`event.source === window.parent`, and accept only one origin. The SDK does this
by locking onto the origin of the first `kiwi:` message it receives from its
parent window.

**Iframe URL.** The host adds context to your page's query string:

- Class tabs add `classId`, `appId`, `userId` and `uiSlug`.
- Admin panels add `appId`, `userId` and `placement=admin-panel`, plus `classId`
  and `uiSlug` when they exist.

**Sandbox.** The iframe's `sandbox` attribute allows `allow-scripts
allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox`.
Admin panels also allow `allow-downloads`.

### Messages (class tab)

In this table, "app → host" means your app sends the message and "host → app"
means Kiwi sends it.

| Direction | Type | Payload | What happens |
| --- | --- | --- | --- |
| app → host | `kiwi:ready` | `{ preferredChatMode? }` | The host replies with `kiwi:context` and then `kiwi:requestContext`. If the app declares the `mcp` capability, the host also sends `kiwi:appToken`. `preferredChatMode` is one of `modal`, `sidepanel`, `snap` or `fullscreen`. It only applies if the user hasn't chosen a chat layout themselves. |
| host → app | `kiwi:context` | `{ classId, className, userId, userRole, appId, appSlug, uiSlug, capabilities }` | Tells the app where it is running and who is viewing. `userId` is an opaque ID. `userRole` is the viewer's role in the class, for example `student`, `ta`, `professor` or `admin`. |
| host → app | `kiwi:requestContext` | none | Asks the app for its current AI context (see `kiwi:updateContext`). Apps can ignore it. |
| app → host | `kiwi:contextResponse` | `{ context, tutoringMode? }` | The app's answer to `kiwi:requestContext`. Works the same as `kiwi:updateContext`. |
| app → host | `kiwi:updateContext` | `{ context, tutoringMode? }` | Gives Kiwi a description of what the user is doing in the app. Kiwi's AI uses it in the app's AI requests and in the Kiwi chat. No reply. For `tutoringMode`, see [AI requests](#ai-requests). |
| app → host | `kiwi:askAI` | `{ prompt, requestId }` | Asks Kiwi's AI a question. The answer streams back in the next three messages. |
| host → app | `kiwi:aiChunk` | `{ requestId, chunk, full }` | Part of the answer. `full` is the whole answer so far and can get shorter between messages, so display `full` rather than joining the `chunk`s. |
| host → app | `kiwi:aiComplete` | `{ requestId }` | The answer is complete. |
| host → app | `kiwi:aiError` | `{ requestId, error }` | The request failed. `error` is a string. |
| app → host | `kiwi:apiRequest` | `{ op, params, requestId }` | Runs a data op (see [BRIDGE-OPS.md](../kiwi-app-sdk/BRIDGE-OPS.md)). The host adds `classId` and `appSlug` itself. |
| host → app | `kiwi:apiResponse` | Success: `{ requestId, ok: true, status, data }`. Failure: `{ requestId, ok: false, status, error: { code, message } }`. | The result of a data op. The host sends exactly one per request. |
| app → host | `kiwi:navigate` | `{ action?: 'back' \| 'forward', path?, requestId? }` | Moves the Kiwi page. `path` must stay inside the current class. A relative path, or `/`, is resolved within the class. |
| app → host | `kiwi:setChatDisplayMode` | `{ mode, requestId? }` | Changes the chat layout and opens the chat panel. |
| host → app | `kiwi:ack` | `{ requestId, ok, error? }` | Confirms whether a `kiwi:navigate` or `kiwi:setChatDisplayMode` worked. Sent only for those two messages, and only if the request included a `requestId`. Error codes: `blocked_out_of_scope`, `invalid_mode`, `invalid_request`. |
| app → host | `kiwi:requestToken` | none | Asks for the app token. The host replies with `kiwi:appToken`. If the host can't get a token, the class tab sends nothing back. |
| host → app | `kiwi:appToken` | `{ accessToken, scopes, expiresIn, appSlug }` | The app token itself. |

The host ignores any other message type, so an app can use its own message types
without conflicts.

`kiwi:apiResponse` can report these error codes:

| Code | Meaning |
| --- | --- |
| `unknown_op` | The host doesn't have an op with that name. |
| `not_ready` | The host doesn't know the class yet. |
| `token_error` | The host couldn't get an app token, for example because the user isn't in the class or the app isn't enabled there. |
| `op_not_granted` | The token is missing a scope the op needs. The message lists the missing scopes. |
| `backend_error` | The backend returned an error. `status` holds the HTTP status code. |
| `network_error` | The request didn't reach the backend or didn't finish. |
| `timeout` | The op took longer than its time limit (listed in BRIDGE-OPS.md). |

### Admin panels

Admin panels support fewer messages than class tabs:

| Direction | Type | What happens |
| --- | --- | --- |
| app → host | `kiwi:ready` | The host replies with `kiwi:context` and then `kiwi:appToken`. The context is `{ classId?, userId, userRole, appId, appSlug, uiSlug, placement: 'admin-panel', isAdmin }`. |
| app → host | `kiwi:requestToken` | Payload: `{ reason? }`. The host replies with `kiwi:appToken`. With `reason: 'expired'`, it gets a new token instead of reusing its cached one. |
| host → app | `kiwi:error` | Sent instead of `kiwi:appToken` when the host can't get a token. Its shape is `{ type: 'kiwi:error', message }`: `message` is at the top level, not inside `payload`. |
| app → host | `kiwi:adminNavigation` | Payload: `{ items: [{ id, label, path }], activePath? }`. The host adds up to 20 of these items to its admin sidebar. Each `path` must start with `/`. |
| host → app | `kiwi:adminNavigate` | Payload: `{ path }`. Sent when the user clicks one of those sidebar items. |
| app → host | `kiwi:navigate` | The host accepts this but does nothing and sends no `kiwi:ack`. |

Admin panels don't support `kiwi:askAI`, `kiwi:apiRequest`,
`kiwi:updateContext` or `kiwi:setChatDisplayMode`.

Admin panels always receive the app token, and use it to call their own backend
(see [Calling the backend directly](#calling-the-backend-directly)).

On `/admin/app/:appSlug`, which has no class, only system admins can get a token.
That token has `classId: null`, and the data ops reject it because they need a
class.

### AI requests

`kiwi:askAI` is sent as an ordinary Kiwi chat message (`POST /student/chat/v2`)
under the signed-in user's own session. The message includes the app's slug,
its context text and its tutoring mode.

- **App Mode.** The backend applies the app's details only if the app is enabled
  in the class. It then answers in App Mode, or in the tutoring mode the app
  registered.
- **Context text.** The model receives the app's context text as information
  from an untrusted source, not as instructions.
- **Access.** `kiwi:askAI` needs no token and no scope. It lets the app do
  nothing beyond what the Kiwi chat already lets the user do.

Kiwi picks the tutoring mode as follows:

1. If the app's registration sets a mode, Kiwi uses it. The registered mode is
   the app's `config.tutoringMode`, or the class's own `config` if that sets
   one.
2. If no mode is registered, Kiwi accepts a `tutoringMode` sent by the app, but
   only the value `guidance`. In `guidance` mode the AI gives hints and never
   the full solution.
3. On a recitation worksheet, Kiwi always uses recitation mode, whatever the app
   asks for.

## Scopes and tokens

### How Kiwi works out a token's scopes

The host asks for an app token by calling `POST /api/kiwi-apps/:slug/token` with
`{ classId }`. Kiwi then builds the token's scope list in two steps:

1. **Class scopes.** Kiwi takes the scopes that are in both `maxScopes` and the
   class's `enabledScopes`. If `enabledScopes` is empty, Kiwi uses all of
   `maxScopes`.
2. **Prompt scopes.** For each active prompt, Kiwi adds `llm:prompt:<id>`, but
   only if `maxScopes` contains `llm:prompt:*` or that exact scope.
   `enabledScopes` has no effect on this step.

Wildcards are copied into the token as they are. A scope ending in `:*` matches
every scope that starts with the same prefix. For example, `llm:prompt:*`
matches `llm:prompt:weekly-summary`. A wildcard doesn't unlock unapproved
prompts, because the backend won't run a prompt that isn't active.

Kiwi refuses to issue a token (403) if the user has no role in the class or the
app isn't enabled there.

### Scopes the App API checks

| Scope | What it allows |
| --- | --- |
| `class:materials:chunks:read` | The `documentChunks` op, which returns the parsed text of the class's documents. |
| `context:student_learning:read` | The `contextualChat` op. This op also needs the scope of the prompt it runs. |
| `llm:prompt:<promptId>` | Running that approved prompt. |

[BRIDGE-OPS.md](../kiwi-app-sdk/BRIDGE-OPS.md) lists each op with its parameters
and the scopes it needs. The MCP server has its own scope checks; see
[docs/mcp.md](../docs/mcp.md).

Scopes can only narrow what the user is already allowed to do. Every endpoint
also checks the user's own access, so a student using an app can't read another
student's data.

### Token contents and lifetime

- **Payload:** `{ sub: <userId>, type: 'app_token', appSlug, classId,
  tokenScope, scopes }`. For a token issued without a class (admin panels only),
  `classId` is `null` and `tokenScope` is `'admin'`. For all other tokens,
  `tokenScope` is `'class'`.
- **Lifetime:** `APP_TOKEN_TTL_SECONDS` seconds, 3600 by default. The host keeps
  the token and gets a new one about a minute before it expires.
- **Only the host can create tokens.** If the token endpoint is called with an
  app token, it returns 403. New tokens always come from the host, through the
  user's session.
- **Sessions:** endpoints that accept app tokens don't need a session cookie.
  Endpoints that need a session, such as the admin and class-management
  endpoints, reject app tokens.

### When the app gets the token

On a class tab, the host normally keeps the token to itself. It sends the token
to the app in two cases only:

- the app declares the `mcp` capability, in which case the host sends
  `kiwi:appToken` after `kiwi:ready`;
- the app sends `kiwi:requestToken`, which is what the SDK's `requestToken()`
  does.

Admin panels always receive the token.

Request the token only if your app calls a backend directly. Never store the
token or write it to logs.

### Calling the backend directly

Admin panels, and apps with their own backend, can call the App API themselves.
Send the token in the header `Authorization: Bearer <accessToken>`.

For class endpoints, such as
`GET /api/kiwi-apps/classes/:classId/document-chunks`, the `classId` must be the
class the token was issued for.

If a browser page calls the backend from its own origin, add that origin to the
backend's `FRONTEND_URL` setting, a comma-separated list of origins allowed
through CORS.

Don't call `GET /api/permissions/class-role` from an app. The viewer's role is
already in `kiwi:context`, in the `userRole` field.

Full MCP clients connect to the MCP server described in
[docs/mcp.md](../docs/mcp.md). Apps running in an iframe should use bridge ops
instead.

## SDK usage

The SDK, `@maps-research/kiwi-app-sdk`, handles the bridge messages for you. The
[SDK README](../kiwi-app-sdk/README.md) documents its complete API.

### With a bundler

The package isn't published to npm yet, so install it from a local copy of this
repository:

```bash
npm install /path/to/kiwi/kiwi-app-sdk
```

Once it's published, use `npm install @maps-research/kiwi-app-sdk`.

```ts
import { createKiwiApp } from '@maps-research/kiwi-app-sdk';

const kiwi = createKiwiApp({ appSlug: 'my-app' });
const ctx = await kiwi.ready();            // { classId, userId, userRole, ... }

const answer = await kiwi.askAI('Explain recursion briefly', {
  onChunk: (_delta, full) => render(full),
});

let cursor: string | undefined;
do {
  const page = await kiwi.documentChunks({ limit: 50, cursor });
  page.documents.forEach(addDocument);
  cursor = page.nextCursor ?? undefined;
} while (cursor);

const { ok, error } = await kiwi.navigate({ path: 'materials' });
```

### Without a bundler

Load the single-file build with a `<script>` tag, and then call
`KiwiApp.create({...})`. The Kiwi UI serves this file at
`/sdk/v1/kiwi-app-sdk.js`. You can also keep a copy next to your app, as
`hello-kiwi-app` does.

### What the SDK doesn't handle

- **`kiwi:requestContext`.** The SDK ignores this message. To answer it, add
  your own `message` listener and reply with `kiwi:contextResponse`.
- **Sending `tutoringMode`.** `updateContext(text)` sends only the context text.
  To send `tutoringMode` from the app, post `kiwi:updateContext` yourself. You
  don't need to if the mode is already set in the app's registration.
- **Admin-panel messages.** The SDK doesn't handle `kiwi:error`,
  `kiwi:adminNavigation` or `kiwi:adminNavigate`. In an admin panel,
  `navigate()` always resolves with a `timeout` error.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| No tab appears in the class. | The app isn't enabled in the class, or the app is inactive. | Enable it (step 4), and check its status on the App Registry page. |
| The tab is blank or says "refused to connect". | Your server sends an `X-Frame-Options` header, or a CSP `frame-ancestors` rule, that stops Kiwi from embedding the page. | Allow the Kiwi UI's origin to embed your app. |
| `kiwi:context` never arrives, and the SDK switches to the Simulator. | The page's origin doesn't match the origin of the registered `uiUrl`. | Register again with the exact URL you serve the page from. |
| `Invalid registration secret` | The secret doesn't match the one in the whitelist entry. | Use the exact secret. An admin can set a new one with `PATCH /api/kiwi-apps/whitelist/:slug`. |
| `not in the whitelist` or `not approved` | Step 1 hasn't been done, or the whitelist entry's `status` isn't `approved`. | Ask an admin to create or approve the entry. |
| The whitelist call returns 400. | The secret is shorter than 32 characters. | Use a secret of at least 32 characters. |
| An admin call returns 401 even though you sent a token. | The call had no session cookie. | Log in with `POST /auth/login` and send the session cookie with each call, as `register.sh` does. |
| `token_error`, or "User does not have access to this class" | The signed-in user has no role in the class. | Enroll the user in the class, or assign them to it. |
| `op_not_granted` | The scope is missing from `maxScopes`, excluded by `enabledScopes`, or belongs to a prompt that isn't approved. | Check the effective scopes with `GET /api/kiwi-apps/:slug/scopes/:classId`. |
| A prompt stopped working after a redeploy. | Its `systemPrompt` text changed, so Kiwi turned the prompt off. | Ask an admin to approve the prompt again. |
| Scope changes have no effect. | The host is still using a token it saved earlier. It keeps a token for up to an hour. | Reload the class page. |
| `navigate()` resolves with a `timeout` error. | The app is running in an admin panel, where the host doesn't confirm navigation. | Use `kiwi:adminNavigation` instead. |
| `kiwi:askAI` fails. | The user's session has expired, or the answer stream broke. | Sign in again, and check the browser console on the Kiwi page for the error. |

## Known limitations

- **Tokens stay valid after access is removed.** If an app is disabled in a
  class or its prompts are revoked, tokens issued earlier keep working until
  they expire, which takes up to `APP_TOKEN_TTL_SECONDS`. This includes any
  token the app received in `kiwi:appToken`.
- **Scope changes need a page reload.** The host keeps its token for up to an
  hour, so users must reload the page before new scopes take effect.
- **`userRole` can be wrong on class tabs.** If the app sends `kiwi:ready`
  before the host has looked up the user's role, the context says `student`, and
  the host doesn't send a correction. Sending `kiwi:ready` again gets a fresh
  context.
- **Some registration fields have no effect yet:**
  - class tabs ignore `allowedRoles`;
  - the host doesn't show the `modal` and `dashboard-widget` placements;
  - Kiwi doesn't call MCP servers that apps provide (`appType: "full"`,
    `mcpServerUrl`).
