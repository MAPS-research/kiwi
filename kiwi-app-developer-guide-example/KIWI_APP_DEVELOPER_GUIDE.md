# Kiwi App Developer Guide

> How to build an **external app** and plug it into Kiwi.
>
> This guide is written against the actual code on the `kiwi-apps-development`
> branch. File references point at the source of truth so you can verify every
> claim. If the code changes, update this doc.

---

## 1. Overview

Kiwi is a learning platform. A **Kiwi App** is a *separate web application you
build and host yourself* that Kiwi embeds inside its UI and grants controlled
access to its data and AI.

Think of it like an app store:

- **Kiwi** = the platform (the site students and instructors use).
- **Your app** = a third‑party app that wants to appear inside it.
- **Admin** = the store reviewer + device admin.
- **You (developer)** = the app author.

Your app does **not** live inside Kiwi's codebase. It runs at its own URL (e.g.
`http://localhost:8000`). Kiwi embeds it in an **`<iframe>`** and the two talk
over **`window.postMessage`**. With a scoped token your app can additionally
call Kiwi's **REST API** and **MCP** server.

### Three kinds of "app" in this repo — don't confuse them

| Kind | What it is | This guide? |
| --- | --- | --- |
| **External app** | Independent web app, embedded via iframe, registered through the backend | ✅ **Yes** |
| **Built‑in app** | React code bundled inside `kiwi-ui` (`src/apps/builtins/*`), uses the in‑page `window.kiwiApp` bridge | See `kiwi-ui/KIWI-APPS.md` |
| **MCP client** | A service that talks to Kiwi purely over MCP/JSON‑RPC | See `docs/MCP_DEVELOPER_GUIDE.md` |

---

## 2. How it works

```
                         Kiwi UI (kiwi-ui, :3001)
  ┌──────────────────────────────────────────────────────────┐
  │  Class page ▸ "My App" tab                                │
  │  ┌────────────────────────────────────────────────────┐  │
  │  │  <iframe src="https://your-app/?classId=..&..">     │  │
  │  │                                                     │  │
  │  │     YOUR APP  (you host this, e.g. :8000)           │  │
  │  │                                                     │  │
  │  │   ── postMessage ──▶  kiwi:ready / kiwi:askAI / ... │  │
  │  │   ◀── postMessage ──  kiwi:context / kiwi:appToken  │  │
  │  └────────────────────────────────────────────────────┘  │
  └───────────────┬──────────────────────────────────────────┘
                  │  (host proxies AI;  app uses token directly)
                  ▼
            Kiwi backend (kiwi, :3000)
        /api/kiwi-apps/*   /mcp/rpc   /chat/stream   /analytics/*
```

The render path in code:

- Route `:classID/app/:appSlug` → `kiwi-ui/src/pages/ClassAppPage.tsx`
- `ClassAppPage` looks up the enabled app + its `class-tab` UI, then renders
  `kiwi-ui/src/pages/ClassAppView.tsx`, which is the iframe host and the
  postMessage hub.

---

## 3. Quick Start (a minimal app in ~40 lines)

A Kiwi App is just a web page that does the handshake. The smallest possible app:

```html
<!doctype html>
<html>
  <body>
    <h1>Hello Kiwi</h1>
    <pre id="ctx">waiting for context…</pre>

    <script>
      // 1) Tell Kiwi we are ready (parent origin unknown yet → "*")
      window.parent.postMessage({ type: 'kiwi:ready', payload: {} }, '*');

      // 2) Receive context and tokens from Kiwi
      window.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};
        if (type === 'kiwi:context') {
          document.getElementById('ctx').textContent =
            JSON.stringify(payload, null, 2);
        }
      });
    </script>
  </body>
</html>
```

Host it anywhere reachable by the browser, register it (section 4), enable it in
a class (section 4.3), open the class — your page now appears as a tab and prints
the live class/user context.

A **full‑featured reference app** that exercises *every* capability below lives at
[`examples/hello-kiwi-app/`](../examples/hello-kiwi-app/). Copy it as your starting point.

> 💡 **Try it with zero setup.** Open `examples/hello-kiwi-app/index.html`
> directly in a browser. With no Kiwi embedding it, the page turns on a built‑in
> **Simulator** that fakes every Kiwi reply (context, token, streaming AI, MCP
> results) so you can click through the whole protocol and read the code before
> standing up a backend. The top‑bar pill toggles Simulator ⇄ Live.

---

## 4. Registration

Registration has a strict order. **An admin must whitelist your app before you
can register it.**

```
Admin: add to whitelist (approved) ──▶ You: POST /register ──▶ Admin/Instructor: enable in a class
```

### 4.1 Admin — whitelist the app

`POST /api/kiwi-apps/whitelist` (Admin only) — see
`src/kiwi-app/kiwi-app.controller.ts:67`.

```jsonc
{
  "slug": "demo",                       // unique app id
  "registrationSecret": "dev-secret",   // stored bcrypt-hashed; you need the plaintext to register
  "baseUrl": "http://localhost:8000",   // optional, advisory
  "status": "approved",                 // MUST be "approved" before you can register
  "description": "Demo reference app",
  "maxScopes": ["user:profile:read", "class:info:read", "class:enrollments:read"]
}
```

- `registrationSecret` is hashed with bcrypt before storage
  (`kiwi-app.service.ts:64`). The admin shares the **plaintext** with you out of band.
- `maxScopes` is the **ceiling** of permissions this app may ever request. See
  section 6 for which scope strings are actually enforced.

### 4.2 Developer — register your app

`POST /api/kiwi-apps/register` — **public endpoint** (no login), but it validates
the whitelist + secret. See `kiwi-app.controller.ts:119` and
`kiwi-app.service.ts:176`.

```jsonc
{
  "slug": "demo",
  "registrationSecret": "dev-secret",        // must match the whitelist entry
  "name": "Demo Reference App",
  "description": "Shows every Kiwi App capability",
  "baseUrl": "http://localhost:8000",
  "appType": "frontend_only",                // or "full" (also exposes an MCP server)
  "capabilities": ["ai", "mcp"],             // "mcp" => Kiwi auto-sends an app token on ready
  "mcpServerUrl": "http://localhost:8000/mcp", // only for appType "full"
  "uis": [
    {
      "uiSlug": "student",
      "uiName": "Demo (Student)",
      "uiUrl": "http://localhost:8000",
      "placement": "class-tab",              // class-tab | admin-panel | modal | dashboard-widget
      "allowedRoles": ["student", "ta", "instructor", "admin"],
      "tabOrder": 0
    }
  ],
  "prompts": [
    {
      "promptId": "hint",
      "name": "Coding Hint",
      "systemPrompt": "You are a tutor. Give a hint without revealing the answer.",
      "maxTokens": 500,
      "temperature": 0.7
    }
  ]
}
```

Notes:
- Re‑registering with the same `slug` **updates** the existing app (idempotent),
  so apps can self‑register on every startup (`kiwi-app.service.ts:200`).
- `prompts` you register are **inactive until an admin approves them**
  (`POST /api/kiwi-apps/:slug/prompts/:promptId/approve`). Until then the
  `llm:prompt:<id>` scope won't resolve.
- DTO definitions: `src/kiwi-app/dto/register-app.dto.ts`.

### 4.3 Admin/Instructor — enable the app in a class

`POST /api/classes/:classId/apps` — see `kiwi-app.controller.ts:350`.

```jsonc
{
  "appId": "<KiwiApp.id>",
  "tabLabel": "Demo",
  "enabledScopes": ["user:profile:read", "class:info:read"]  // subset of maxScopes
}
```

> ⚠️ **Known gap:** the per‑class enable/disable/reorder handlers are not yet
> role‑guarded — see the `// TODO: Check if user is professor/admin` comments in
> `kiwi-app.controller.ts:360,374,388,400`. Treat these endpoints as
> "trusted caller only" until fixed.

Once enabled, the app shows up for that class via
`GET /api/classes/:classId/apps?placement=class-tab&userRole=student`
(`kiwi-app.service.ts:417`), filtered by `placement` and the viewer's role.

---

## 5. The Bridge Protocol (postMessage)

This is the heart of an external app and the single source of truth is
`kiwi-ui/src/pages/ClassAppView.tsx`. All messages are
`{ type: string, payload: object }`.

### Security model
- **Incoming (host → app):** the host posts to your iframe using **your app's
  origin** as `targetOrigin`. You should verify `event.origin` equals Kiwi's
  origin before trusting a message.
- **Outgoing (app → host):** the host only accepts messages whose
  `event.origin` matches your registered app URL (`ClassAppView.tsx:259`).
- The iframe is sandboxed:
  `allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox`
  (`ClassAppView.tsx:436`).

### Context params on the iframe URL
Kiwi appends these query params when loading your iframe (`ClassAppView.tsx:243`):
`?classId=<id>&appId=<id>&userId=<id>&uiSlug=<slug>`.

### App → Host

| `type` | `payload` | When / effect |
| --- | --- | --- |
| `kiwi:ready` | `{ preferredChatMode? }` | Send once on load. Triggers `kiwi:context`; if app has `mcp` capability, also triggers `kiwi:appToken`. `preferredChatMode` ∈ `modal \| sidepanel \| snap \| fullscreen`. |
| `kiwi:askAI` | `{ prompt, requestId }` | Ask Kiwi's AI. Host streams the answer back as `kiwi:aiChunk*` then `kiwi:aiComplete`. `requestId` correlates the stream. |
| `kiwi:updateContext` | `{ context }` | Set the text context that future `kiwi:askAI` calls (and the global chat) are grounded in. |
| `kiwi:requestToken` | _none_ | Explicitly (re)request an app token, e.g. after expiry. Works even without `mcp` capability (`ClassAppView.tsx:343`). |
| `kiwi:navigate` | `{ action?: 'back'\|'forward', path? }` | Ask Kiwi to navigate. `path` is restricted to the current class scope. |
| `kiwi:setChatDisplayMode` | `{ mode, requestId? }` | Change Kiwi's chat panel layout (and open it). Same enum as `preferredChatMode`. Include `requestId` to get a `kiwi:ack`. |

### Host → App

| `type` | `payload` | Meaning |
| --- | --- | --- |
| `kiwi:context` | `{ classId, className, userId, username, userRole, appId, appSlug, uiSlug, capabilities }` | The runtime context. Sent in response to `kiwi:ready` (`ClassAppView.tsx:268`). |
| `kiwi:appToken` | `{ accessToken, scopes, expiresIn, appSlug }` | A scoped JWT (1h) to call Kiwi's API/MCP. See section 6. |
| `kiwi:aiChunk` | `{ requestId, chunk }` | A streaming token/segment of the AI answer. |
| `kiwi:aiComplete` | `{ requestId }` | The AI stream finished. |
| `kiwi:aiError` | `{ requestId, error }` | The AI request failed. |
| `kiwi:ack` | `{ requestId, ok, error?: { code, message } }` | Result of an acked fire‑and‑forget message (`kiwi:navigate`, `kiwi:setChatDisplayMode`). Only sent when the app included a `requestId`. Codes: `blocked_out_of_scope`, `invalid_mode`, `invalid_request`. |

> **Why `kiwi:ack` exists.** `kiwi:navigate` and `kiwi:setChatDisplayMode` used to
> be send‑and‑hope: a path outside the class was refused, and a display‑mode
> request was dropped whenever the user had ever chosen a layout themselves — both
> looked *identical to success* from the app. Include a `requestId` and await the
> ack. The SDK does this for you: `await kiwi.navigate({...})` and
> `await kiwi.setChatDisplayMode(mode)` resolve with `{ ok, error? }` (they never
> reject, so ignoring the promise is safe).

> Unknown message types are ignored by the host (`ClassAppView.tsx:360`), so you
> may use your own `type` values for app‑internal messaging without collisions.

---

## 6. Permissions & Tokens

### Two locks
Accessing Kiwi data requires **both**:

1. **App scope** — your app token must carry the required scope. Scopes are
   computed as the **intersection** of whitelist `maxScopes` and the class's
   `enabledScopes`, plus active prompt scopes (`kiwi-app.service.ts:742`).
2. **User identity** — the token is issued **on behalf of the logged‑in user**
   (`payload.sub`). Many endpoints additionally check the *user's* role. Example:
   class analytics requires the user to be admin / class professor / assigned
   instructor (`src/mcp/resources/analytics.resource.ts`), regardless of scope.

So a student using your app cannot pull another student's data even if the app
has the scope — the user identity gate stops it.

### Getting a token
- If your app declared `capabilities: ["mcp"]`, Kiwi sends `kiwi:appToken`
  automatically right after `kiwi:ready` (`ClassAppView.tsx:308`).
- Otherwise (or after expiry) send `kiwi:requestToken`.
- Under the hood the host calls `POST /api/kiwi-apps/:slug/token` with the
  current `classId` (`kiwi-app.service.ts:800`). Token payload:
  `{ sub: userId, type: 'app_token', appSlug, classId, scopes }`, `expiresIn: 3600`.

### Using a token
Send it as `Authorization: Bearer <accessToken>` to Kiwi. The guard detects
`type === 'app_token'`, attaches `request.appContext = { appSlug, classId,
scopes, userId }`, and skips session checks (`src/auth/auth.guard.ts:609`).

### Which scopes are actually enforced today
`maxScopes` is a free‑form string array, but only these are currently checked via
`requireScope()` (`src/mcp/utils/scope-check.ts`, grep `requireScope`):

| Scope | Gates (resource URI) |
| --- | --- |
| `user:profile:read` | MCP resource `kiwi://users/{userId}` (`user.resource.ts:45`) |
| `class:info:read` | MCP resource `kiwi://users/{userId}/role/{classId}` (`user.resource.ts:130`) |
| `class:enrollments:read` | MCP resource `kiwi://users/{userId}/enrollments` (`user.resource.ts:205`) |
| `llm:prompt:<promptId>` | MCP tool `kiwi_app_chat` for an approved prompt (`kiwi-app-chat.tool.ts:87`) |
| `class:materials:chunks:read` | App API `GET /api/kiwi-apps/classes/:classId/document-chunks` — parsed document text chunks (`app-data.controller.ts`) |
| `context:student_learning:read` | App API `POST /api/kiwi-apps/:slug/contextual-chat` — host-mediated LLM over student context; needs **both** this **and** `llm:prompt:<id>` (`app-data.controller.ts`) |

> ⚠️ **These scope checks run on the *full* MCP server, not `POST /mcp/rpc`.**
> Kiwi exposes **two MCP surfaces** (see §8.3). The scope‑enforced resources/tools
> above (`user.resource.ts`, `analytics.resource.ts`, `kiwi_app_chat`) are served
> by the `@rekog/mcp-nest` server at `/mcp` · `/mcp/sse` · `/mcp/streamable-http`
> and require a real MCP client handshake. The simple `POST /mcp/rpc` endpoint
> only serves a small built‑in set and gates on **user identity only** (no scope
> check) — convenient, but don't mistake it for the enforcement boundary.

Wildcards are supported (`class:*` matches `class:info:read`) — see
`scope-check.ts:25`. Other endpoints (analytics, permissions) gate on **user
role**, not scope. See section 11 for the known scope‑naming inconsistency.

---

## 7. Capability Catalog (scope ↔ how to call it)

MCP entries are tagged **[rpc]** (the simple `POST /mcp/rpc` surface, callable
with one `fetch` + your app token) or **[full]** (the `@rekog/mcp-nest` server,
needs an MCP client handshake). See §8.3 for the difference.

| You want… | Gate | How to call it |
| --- | --- | --- |
| Current user's role in a class | _(none; public)_ | REST `GET /api/permissions/class-role?userId&classId` |
| Current authenticated user (id/email/role) | app token | **[rpc]** `tools/call get_authenticated_user` |
| User's enrolled classes | app token | **[rpc]** `resources/read kiwi://classes` |
| Documents for a class | enrolled in class | **[rpc]** `resources/read kiwi://class/{classId}/documents` |
| Use Kiwi's AI (streaming) | _(none; host‑proxied)_ | bridge `kiwi:askAI` |
| Use Kiwi's AI (one shot, with token) | app token | **[rpc]** `tools/call chat { input }` |
| User profile | `user:profile:read` | **[full]** resource `kiwi://users/{userId}` |
| User's class role/info | `class:info:read` | **[full]** resource `kiwi://users/{userId}/role/{classId}` |
| User enrollments | `class:enrollments:read` | **[full]** resource `kiwi://users/{userId}/enrollments` |
| Class analytics / engagement | user is admin/prof/instructor | **[full]** resource `kiwi://analytics/class/{classId}` |
| Run an approved app prompt | `llm:prompt:<id>` | **[full]** tool `kiwi_app_chat` |
| Parsed text **chunks** of class documents (for flashcards, podcasts, summaries) | `class:materials:chunks:read` | REST `GET /api/kiwi-apps/classes/:classId/document-chunks` (§8.3b) |
| **Contextual** LLM over the student's private learning context (host assembles it, returns only the output) | `llm:prompt:<id>` + `context:student_learning:read` | REST `POST /api/kiwi-apps/:slug/contextual-chat` (§8.3b) |
| Class roster / add users | role‑gated | **[full]** tools `get_class_roster`, `add_users_to_class` |
| Upload / fetch documents | role‑gated | **[full]** tools `upload_document`, `get_document_signed_url` |

> The REST analytics endpoints (`GET /analytics/all`, `POST /analytics/user`)
> are **session + admin‑only** (`AnalyticsAdminGuard` reads `request.session`), so
> an **app token cannot call them** — use the `kiwi://analytics/*` MCP resources
> on the full server instead, which gate on the user's role.

Full MCP tool/resource/prompt reference + JSON‑RPC examples:
`docs/MCP_DEVELOPER_GUIDE.md`.

---

## 8. Calling Kiwi

### 8.1 AI via the bridge (simplest — no token, no CORS)
```js
const requestId = crypto.randomUUID();
window.parent.postMessage({ type: 'kiwi:askAI', payload: { prompt, requestId } }, KIWI_ORIGIN);
// collect kiwi:aiChunk by requestId, finish on kiwi:aiComplete
```
The host proxies this to a Kiwi chat endpoint using the *user's* session, so your
app needs neither a token nor CORS for AI (`ClassAppView.tsx:106`).

> ⚠️ **Host‑wiring caveat (this branch).** `ClassAppView.tsx:129` currently posts
> to `${basePath}/chat/stream`, but the only matching route is the admin‑guarded
> `ChatController` (`src/common/chat/chat.controller.ts:39`, body `{ input, image }`),
> not the student agent (`POST /student/chat/v2`, body `UnifiedChatRequest`). So
> `kiwi:askAI` may 401/403 for non‑admins until the host proxy is pointed at the
> student endpoint. Your app code stays the same regardless — and you can always
> use the token‑based MCP `chat` tool (§8.3) as a fallback, which the reference
> app demonstrates.

### 8.2 REST with the app token
```js
const res = await fetch(`${KIWI_ORIGIN}/api/permissions/class-role?userId=${userId}&classId=${classId}`, {
  headers: { Authorization: `Bearer ${appToken}` },
});
```

### 8.3 MCP — two surfaces, pick the right one

Kiwi exposes MCP **twice**. Know which you're calling:

| | Simple — `POST /mcp/rpc` | Full — `@rekog/mcp-nest` |
| --- | --- | --- |
| Endpoint | `POST /mcp/rpc` (+ `GET /mcp/capabilities`) | `/mcp` · `/mcp/sse` · `/mcp/streamable-http` |
| How to call | one `fetch`, app token in `Authorization` | a real MCP client (initialize handshake, session) |
| Auth gate | **user identity only** (no scope check) | **scope‑enforced** via `requireScope()` |
| Tools | `get_authenticated_user`, `chat` | full catalog: `get_class_roster`, `upload_document`, `kiwi_app_chat`, … |
| Resources | `kiwi://classes`, `kiwi://class/{id}/documents` | full catalog: `kiwi://users/{id}`, `kiwi://analytics/class/{id}`, … |
| Source | `src/mcp/mcp.controller.ts` → `mcp-server-impl.service.ts` | `src/mcp/mcp.module.ts` + `resources/*`, `tools/*` |

For an **iframe app**, the simple endpoint is usually all you need — it's one
request and works with the app token you already have:

```js
const res = await fetch(`${KIWI_ORIGIN}/mcp/rpc`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${appToken}` },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
});
// Useful calls on /mcp/rpc:
//   { method: 'tools/call',     params: { name: 'get_authenticated_user', arguments: {} } }
//   { method: 'tools/call',     params: { name: 'chat', arguments: { input: 'hello' } } }
//   { method: 'resources/read', params: { uri: 'kiwi://classes' } }
```

To reach the **full** catalog (user profile, analytics, roster, uploads) with
proper scope enforcement, talk to the `@rekog/mcp-nest` server with an MCP
client — that's the "MCP client" path documented in `docs/MCP_DEVELOPER_GUIDE.md`.

### 8.3b Content & coaching — the App API (REST), not MCP

Two content/LLM capabilities are exposed for apps as **plain REST under
`/api/kiwi-apps`** — one authenticated `fetch` each, no MCP client, no session
handshake. They use the same app-token + scope model as the rest of §8.2; an app
should reach them this way rather than over MCP.

- **`GET /api/kiwi-apps/classes/:classId/document-chunks`** (`#218`) —
  paginated parsed text chunks of the class's documents. Query
  `?documentIds=a,b&cursor=…&limit=50`; returns
  `{ classId, documents:[{ documentId, fileName, totalChunks, chunks:[{ chunkId, index, pageNumber, type, text }] }], nextCursor, hasMore }`.
  Deterministic order; page with `nextCursor` until `hasMore` is false.
  Image/table chunks return only their **text description**, never raw image
  bytes. App token needs scope `class:materials:chunks:read` (and can only read
  the class the token was issued for); a class member with a user JWT + session
  may also call it.

  ```js
  const r = await fetch(
    `${KIWI_ORIGIN}/api/kiwi-apps/classes/${classId}/document-chunks?limit=50`,
    { headers: { Authorization: `Bearer ${appToken}` } });
  const { documents, nextCursor, hasMore } = await r.json();
  ```

- **`POST /api/kiwi-apps/:slug/contextual-chat`** (`#217`) — host‑mediated LLM.
  Body `{ promptId, userMessage?, contextRequest:{ kind, scope, timeWindowDays?, include[], retrievalQuery? }, outputSchema? }`.
  Kiwi assembles the student's *private* learning context server‑side (recent
  questions, weak concepts, materials) and returns **only** the model output:
  `{ output, promptId, promptName, contextIncluded, contextOmitted }`. **App‑token
  only** — the target user & class come from the token, never the body. Needs
  **both** `llm:prompt:<promptId>` **and** `context:student_learning:read`.
  Optional `outputSchema` constrains `output` to a JSON instance. Personal
  `recent_questions` are dropped for a student who hasn't consented (reported in
  `contextOmitted`).

  ```js
  const r = await fetch(`${KIWI_ORIGIN}/api/kiwi-apps/${appSlug}/contextual-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${appToken}` },
    body: JSON.stringify({ promptId: 'weekly-summary', contextRequest: {
      kind: 'student_learning_context', scope: 'current_user_current_class',
      include: ['recent_questions', 'weak_concepts', 'relevant_materials'] } }),
  });
  const { output, contextIncluded, contextOmitted } = await r.json();
  ```

The reference app's **"Class content & coaching"** cards reach exactly these two
endpoints, but they do **not** call them directly — they go through the window
bridge as host-proxied ops (`kiwi.documentChunks(…)` / `kiwi.contextualChat(…)`).
Kiwi makes the real request with the app token, so a frontend-only app needs
**no CORS entry and never handles a token**.

The raw HTTP above is what you use if your app has its own backend, or mints an
app token itself. That path is a REST call like any in §8.2, so it does need
your origin in the backend's `FRONTEND_URL` (CORS) — but nothing more: no
`exposedHeaders`, no MCP handshake.

> These two also exist as MCP tools (`get_class_document_chunks`,
> `kiwi_app_contextual_chat`) on the full `@rekog` server for genuine MCP
> *clients* / agents. **Apps should use the REST endpoints above** — the full
> MCP server is stateful and not practically callable from a browser iframe (see
> §11, note 8).

### 8.4 Expose your own MCP server (appType `full`)
Register with `appType: "full"` and `mcpServerUrl`. Kiwi's agent can then call
*your* tools (reverse direction). Implement the MCP server in your app.

---

## 9. Lifecycle & Ops

| Action | Endpoint | Notes |
| --- | --- | --- |
| Heartbeat | `POST /api/kiwi-apps/:slug/heartbeat` (public) | Updates `lastSeenAt`. Call periodically. `kiwi-app.controller.ts:211` |
| Re‑register / update | `POST /api/kiwi-apps/register` | Idempotent by slug. |
| Report user action (audit) | `POST /api/kiwi-apps/:slug/audit/context-update` | Writes `KiwiAppAuditLog` for accountability. `kiwi-app.controller.ts:283` |
| Inspect scopes | `GET /api/kiwi-apps/:slug/scopes`, `GET /api/kiwi-apps/:slug/scopes/:classId` | Debug what your app can do. |

---

## 10. Local Dev & Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| REST/MCP call from the iframe blocked by CORS | Backend only allows `FRONTEND_URL` origins (`app.module.ts:84`). Default is just `http://localhost:3001`. | Add your app origin: `FRONTEND_URL="http://localhost:3001,http://localhost:8000"` in `kiwi/.env`, restart backend. |
| `App "x" is not in the whitelist` / `not approved` | No whitelist row, or `status != approved`. | Admin adds/approves it (4.1). |
| `Invalid registration secret` | Plaintext ≠ stored bcrypt hash. | Use the exact secret the admin set. |
| App never appears as a tab | Not enabled for the class, or no `class-tab` UI matching the viewer's role. | Enable (4.3); check `placement`/`allowedRoles`. |
| `kiwi:context` never arrives | `event.origin` mismatch — your `uiUrl` origin ≠ where the iframe is actually served. | Register the exact origin you serve from. |
| `Missing required scope: …` | App token lacks the scope. | Add to `maxScopes` (whitelist) **and** `enabledScopes` (class). |
| AI works but data calls 401/403 | AI is proxied (user session); data calls need the **app token** + the user's role. | Request a token; ensure the user has rights. |
| Iframe blank / refused to connect | Your app server sends `X-Frame-Options: DENY` or restrictive CSP. | Allow framing from Kiwi's origin. |

---

## 11. Reference & Known Issues

### Source of truth
- Bridge & iframe host: `kiwi-ui/src/pages/ClassAppView.tsx`
- Route/lookup: `kiwi-ui/src/pages/ClassAppPage.tsx`
- Backend controller: `kiwi/src/kiwi-app/kiwi-app.controller.ts`
- Backend service: `kiwi/src/kiwi-app/kiwi-app.service.ts`
- DTOs: `kiwi/src/kiwi-app/dto/*`
- Data model: `kiwi/prisma/schema.prisma` (`KiwiApp*`, `ClassKiwiApp`, `WidgetState`, `KiwiAppAuditLog`)
- Scope enforcement: `kiwi/src/mcp/utils/scope-check.ts`
- MCP server: `kiwi/src/mcp/*`

### Known issues worth fixing (DX / security)
1. **No JS SDK for external apps** — every app hand‑rolls the postMessage
   handshake, token handling and AI streaming. A thin `@kiwi/app-sdk`
   (`kiwi.ready()`, `kiwi.onContext()`, `kiwi.askAI()`, `kiwi.getToken()`) would
   remove most boilerplate.
2. **Scope naming is inconsistent.** Enforced scopes use the colon form
   (`class:info:read`), but MCP resource *names* and many whitelist examples use
   hyphen form (`class-analytics`, `user-profile`). A developer cannot guess the
   right string. Standardize on one convention and publish a canonical list.
3. **Analytics gates on role, not scope** — so `maxScopes` for analytics is
   advisory only. Either enforce a scope (`class:analytics:read`) or document
   clearly that role is the gate.
4. **Per‑class app management is unguarded** — `// TODO` role checks in
   `ClassKiwiAppController` (enable/disable/update/reorder). Security gap.
5. **Secret distribution is manual/undocumented** — define how the registration
   secret reaches the developer.
6. **Two MCP surfaces are easy to confuse.** `POST /mcp/rpc` (simple, app‑token,
   no scope check, small built‑in set) and the `@rekog/mcp-nest` server (full
   catalog, scope‑enforced, needs a handshake) overlap in name. An app developer
   who reads "MCP resource `kiwi://users/{id}`" will reasonably try it on
   `/mcp/rpc` and get *Resource not found*. Consider serving the full catalog
   over a single app‑friendly endpoint, or documenting the split prominently
   (done in §8.3).
7. **AI bridge proxy target is mismatched.** `ClassAppView.tsx:129` posts
   `kiwi:askAI` to `/chat/stream` (admin‑guarded, `{ input, image }`) instead of
   the student agent (`POST /student/chat/v2`, `UnifiedChatRequest`). Point the
   host proxy at the student endpoint so `kiwi:askAI` works for non‑admins. See §8.1.
8. **The full `/mcp` server isn't practically callable from a browser iframe** —
   which is *why* apps use the App API (REST) for data/LLM, not MCP. It's stateful
   and returns the session id in the `Mcp-Session-Id` response header, but the
   backend CORS (`app.module.ts`) doesn't set `exposedHeaders`, so a browser can't
   read it and the follow‑up `tools/call` 400s. Rather than paper over that with
   `exposedHeaders`/`statelessMode`, the content & LLM features are served as
   plain REST (§8.3b): `GET /api/kiwi-apps/classes/:classId/document-chunks` and
   `POST /api/kiwi-apps/:slug/contextual-chat`. MCP is reserved for genuine MCP
   clients / agents. (Corollary of note 6: the "simple" `/mcp/rpc` surface is also
   unregistered dead code on the current backend — don't rely on it.)
