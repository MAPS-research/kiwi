# Hello Kiwi — Reference App

A single-file **external Kiwi App** built on [`@kiwi/app-sdk`](../kiwi-app-sdk/),
demonstrating the app protocol in [`../KIWI_APP_DEVELOPER_GUIDE.md`](../KIWI_APP_DEVELOPER_GUIDE.md).
Copy [`index.html`](./index.html) (and the SDK) as the starting point for your own app.

The app talks to Kiwi **only through the window bridge**, wrapped by the SDK. It
never calls the Kiwi backend directly: data/LLM **ops** (`kiwi.documentChunks`,
`kiwi.contextualChat`) are **proxied by the host** (kiwi-ui), which makes the real
backend call with the app token. So the app needs **no token, no CORS, and no
backend URL**.

## Two ways to run it

The page loads the SDK from `../kiwi-app-sdk/kiwi-app-sdk.js`, so serve the **repo
root** (one level up), not just this folder.

### A) Standalone — learn the protocol offline (no backend)

```bash
# from the repo root:
python3 -m http.server 8000
# then open http://localhost:8000/hello-kiwi-app/
```

Nothing is embedding it, so the SDK switches on a built-in **Simulator**: every
Kiwi reply (context, streaming AI, and op responses) is faked locally and marked
`✦ sim`. Click around, watch the **Event Log**, read the code. The mode pill in
the top bar toggles Simulator ⇄ Live.

### B) Live — embedded in a real Kiwi class

```bash
# Serve the repo root (so /hello-kiwi-app/ and /kiwi-app-sdk/ are both reachable)
python3 -m http.server 8000
```

Then enable the app (below) and open the class in Kiwi — a **Hello Kiwi** tab
appears and the same code runs for real. The op calls (`documentChunks`,
`contextualChat`) are proxied by the host over the bridge, so **you do not need
to add the app origin to CORS** for them — the host makes the call.

## Enabling the app — what actually has to exist

Five records must exist before the tab shows up and the ops work. Missing any one
of them is the usual cause of "no tab" or a 403:

| # | Record | Why |
| --- | --- | --- |
| 1 | `KiwiAppWhitelist` — `status:'approved'`, `maxScopes` | ceiling of scopes the app may ever get |
| 2 | `KiwiApp` — the registered app (`slug`) | the app itself |
| 3 | `KiwiAppUI` — `placement:'class-tab'`, `isEnabled`, `uiUrl` | **without this there is no tab** |
| 4 | `KiwiAppPrompt` — `isActive:true` (admin-approved) | `llm:prompt:<id>` won't resolve otherwise → `contextualChat` 403s |
| 5 | `ClassKiwiApp` — `isEnabled:true` for the class | binds the app to that class |

### Route A — the admin API (`register.sh`)

```bash
ADMIN_TOKEN=eyJ... CLASS_ID=<classId> APP_URL=http://localhost:8000/hello-kiwi-app/ ./register.sh
```

> ⚠️ The admin-only steps (whitelist, class-enable, prompt approve) are guarded by
> the global auth guard, which for non-`/mcp` routes requires a **server-side
> session** — a bare minted JWT is not enough. In practice that means driving
> them as an admin who is actually logged into kiwi-ui. For scripted local setup,
> use Route B.

### Route B — seed it directly (local dev)

What was used to enable this app locally. Idempotent; adjust `SLUG`, `CLASS_ID`
and `APP_URL`, run from the `kiwi` backend repo (it loads `.env` for the DB URL):

```js
// hello-kiwi-enable.cjs — run: node hello-kiwi-enable.cjs
require('dotenv').config({ path: '/path/to/kiwi/.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();

const SLUG = 'demo';
const CLASS_ID = '<classId>';
const APP_URL = 'http://localhost:8000/hello-kiwi-app/';   // EXACT served URL
const PROMPT_ID = 'weekly-summary';
const ADMIN = '<an existing systemRole:admin userId>';
const MAX_SCOPES = ['class:materials:chunks:read', 'context:student_learning:read',
                    'llm:prompt:*', 'user:profile:read', 'class:info:read'];

(async () => {
  await db.kiwiAppWhitelist.upsert({ where: { slug: SLUG },
    update: { status: 'approved', maxScopes: MAX_SCOPES, approvedBy: ADMIN, baseUrl: APP_URL },
    create: { slug: SLUG, registrationSecret: await bcrypt.hash('dev-secret', 10),
      status: 'approved', maxScopes: MAX_SCOPES, approvedBy: ADMIN, baseUrl: APP_URL } });

  const app = await db.kiwiApp.upsert({ where: { slug: SLUG },
    update: { isActive: true, name: 'Hello Kiwi', baseUrl: APP_URL, appType: 'frontend_only', capabilities: ['ai'] },
    create: { slug: SLUG, name: 'Hello Kiwi', baseUrl: APP_URL, appType: 'frontend_only', capabilities: ['ai'], isActive: true } });

  await db.kiwiAppUI.upsert({ where: { appId_uiSlug: { appId: app.id, uiSlug: 'student' } },
    update: { uiUrl: APP_URL, placement: 'class-tab', isEnabled: true },
    create: { appId: app.id, uiSlug: 'student', uiName: 'Hello Kiwi', uiUrl: APP_URL,
      placement: 'class-tab', allowedRoles: ['student','ta','instructor','admin'], tabOrder: 0, isEnabled: true } });

  await db.kiwiAppPrompt.upsert({ where: { appId_promptId: { appId: app.id, promptId: PROMPT_ID } },
    update: { isActive: true, approvedBy: ADMIN, approvedAt: new Date() },
    create: { appId: app.id, promptId: PROMPT_ID, name: 'Weekly Study Summary',
      systemPrompt: 'You are a supportive study coach…', isActive: true,
      approvedBy: ADMIN, approvedAt: new Date(), maxTokens: 600, temperature: 0.4 } });

  await db.classKiwiApp.upsert({ where: { classId_appId: { classId: CLASS_ID, appId: app.id } },
    update: { isEnabled: true, enabledScopes: [], tabLabel: 'Hello Kiwi' },
    create: { classId: CLASS_ID, appId: app.id, isEnabled: true, enabledScopes: [],
      enabledBy: ADMIN, tabLabel: 'Hello Kiwi' } });

  await db.$disconnect();
})();
```

### Gotchas that actually bite

- **`uiUrl` must exactly match where you serve the app** (origin *and* path). The
  host pins `event.origin` to that URL's origin and drops mismatched messages —
  the classic "`kiwi:context` never arrives" symptom.
- **The prompt must be admin-approved** (`isActive:true`). Registering it is not
  enough; until approved, `llm:prompt:<id>` is not in the token and
  `contextualChat` fails the scope check.
- **`enabledScopes: []` means "all `maxScopes`"** — an intentional permissive
  default while app development is in-house. Set it explicitly to narrow.
- **No `FRONTEND_URL`/CORS entry is needed** for the proxied ops — the host makes
  the backend call. The app only has to be reachable and frameable.
- **The logged-in user needs a role in the class** (enrolled/instructor, or a
  `systemRole:admin`), or the token mint 403s with "User does not have access to
  this class".

## What it demonstrates

| Section | Capability | SDK call → bridge | Needs |
| --- | --- | --- | --- |
| 1 Connect | Handshake & live context | `kiwi.ready()` → `kiwi:context` | — |
| 2 AI | Ask the AI (streaming) | `kiwi.askAI(prompt, {onChunk})` | host proxy |
| 2 AI | Ground the AI | `kiwi.updateContext(text)` | — |
| 3 Ops | Class document chunks | `kiwi.documentChunks({limit})` (op `documentChunks`) | host proxy + scope |
| 3 Ops | Contextual study coach | `kiwi.contextualChat({promptId, contextRequest})` (op `contextualChat`) | host proxy + scope |
| 4 UI | Navigate / chat layout | `kiwi.navigate(…)`, `kiwi.setChatDisplayMode(mode)` | — |

## Good to know

- **The app makes no direct backend calls.** Everything goes through the SDK →
  window bridge. `askAI` is proxied via the user's session; the data/LLM **ops**
  are proxied by the host with the **app token** (so scope enforcement is intact
  and the token never touches this app). No CORS, no base URL here.
- **Ops are scope-gated.** `documentChunks` needs `class:materials:chunks:read`;
  `contextualChat` needs `context:student_learning:read` + `llm:prompt:<id>`
  (`register.sh` requests these scopes and approves a `weekly-summary` prompt).
  The host injects `classId`/`appSlug` from trusted context — the app can't
  address another class or app.
- **Access is the user's, narrowed by the app's scopes.** The app token is minted
  for the logged-in user in the current class, so an app can never read data the
  user couldn't already see.
- The same capabilities also exist as backend REST (`/api/kiwi-apps/...`) for
  apps with their own backend, and as MCP tools for genuine MCP *clients* /
  agents. Frontend-only apps should use the SDK/bridge proxy shown here. See
  guide §8.3b.
