# Kiwi Apps

"Kiwi Apps" covers two distinct layers in this repo. They share a name and a
directory but solve different problems, so read the split first.

| Layer | What it is | Status |
| --- | --- | --- |
| **External apps** | Web apps hosted outside Kiwi. They are registered with the backend, shown in an iframe, and talk to Kiwi over `window.postMessage` | In use. This is what "a Kiwi App" means to instructors and app developers |
| **In-page widget framework** | A client-side registry of app manifests, tools, and React widgets (`src/apps/{types,registry,bridge,host}`) | Wired into `App.tsx`, but ships **no built-in apps** (`builtinApps` is `[]`) |

---

## 1. External apps (iframe + postMessage)

This section covers how kiwi-ui hosts external apps. The app-facing protocol,
registration and scope model are documented in the
[Kiwi App developer guide](../kiwi-app-developer-guide-example/KIWI_APP_DEVELOPER_GUIDE.md).
Keep the guide's message tables in sync when you change a handler here.

### Routes and components

| Route | Component | Placement used |
| --- | --- | --- |
| `/:classID/app/:appSlug` | `src/pages/ClassAppPage.tsx` → `ClassAppView.tsx` | `class-tab`. If the app has no enabled `class-tab` UI, the page uses the app's `baseUrl`. |
| `/admin/app/:appSlug` | `src/pages/admin/AdminAppPage.tsx` → `AdminAppView.tsx` | `admin-panel`, with no class context. |
| `/admin/app/:appSlug/class/:classId` | `AdminAppPage.tsx` | `admin-panel`, with a class context. |
| `/admin/class/:classID/app/:appSlug` | `AdminAppPage.tsx` | `admin-panel` if the app has one, otherwise `class-admin-panel`. |

In more detail:

- **Class tabs.** `ClassLayout` lists the class's enabled apps
  (`GET /api/classes/:classId/apps`, called without the `placement` or
  `userRole` filters) and shows each one as a tab. `ClassAppPage` finds the
  app's enabled `class-tab` UI and passes its URL to `ClassAppView`.
  `ClassAppView` owns the iframe and the bridge.
- **Admin sidebar.** `AdminLayout` adds sidebar entries for apps that have an
  enabled `admin-panel` UI. It uses `canRoleSeeAdminUI` to filter the entries
  by `allowedRoles`.
- **Class admin page.** `ClassManagement` shows a card for each enabled
  `class-admin-panel` UI.
- **Not rendered.** No host code renders the `modal` and `dashboard-widget`
  placements yet.

The two management pages:

- **App Registry** (`/admin/kiwi-apps`, `KiwiAppsAdmin.tsx`). Only admins can
  see it. It has **Whitelist** and **Registered Apps** tabs.
- **Class Apps** (`/admin/class/:classID/kiwi-apps`, `ClassKiwiAppsSettings.tsx`).
  Enables apps for one class and sets their order. The class admin menu in
  `ClassLayout.tsx` hides this page from users whose class role is
  `instructor`. The card on the class management page shows it only to
  admins. The backend lets any class manager make the underlying calls: an
  admin, a professor in that class, or an instructor assigned to it.

### Bridge handlers

**Origin checks.** Both views accept a message only when its `event.origin`
matches the origin of the iframe URL. `AdminAppView` also requires
`event.source` to be its own iframe. Both views send replies only to that same
origin.

**`ClassAppView` (class tab).** It handles these messages:

- `kiwi:ready` → sends `kiwi:context`, then `kiwi:requestContext`. It also
  sends `kiwi:appToken` if the app declares the `mcp` capability.
- `kiwi:updateContext` and `kiwi:contextResponse` → store the context text
  (older apps send it as `codeContext`, which is also accepted) and
  `tutoringMode` in `GlobalChatContext`.
- `kiwi:askAI` → streams the answer from `POST /student/chat/v2`, using the
  user's token and session cookie. The request carries the app's slug, context
  text and `tutoringMode`. The view relays the stream as `kiwi:aiChunk` (which
  includes the cumulative `full` text), then `kiwi:aiComplete` or
  `kiwi:aiError`.
- `kiwi:apiRequest` → runs the op and posts exactly one `kiwi:apiResponse`.
- `kiwi:navigate` → moves the page, but only to paths within the class.
- `kiwi:setChatDisplayMode` → changes the chat layout.
- `kiwi:requestToken` → sends `kiwi:appToken`. If minting the token fails, the
  view logs the error and sends nothing.

`kiwi:ack` is sent only for `kiwi:navigate` and `kiwi:setChatDisplayMode`, and
only when the request included a `requestId`. The view ignores message types it
doesn't know.

The context the view sends contains `classId`, `className`, `userId`,
`userRole`, `appId`, `appSlug`, `uiSlug` and `capabilities`. **It must never
include a username, name or email**, because apps get opaque IDs only.
`userRole` comes from `GET /api/permissions/class-role`, and the view falls back
to `student` if that lookup hasn't finished or fails.

**`AdminAppView` (admin panel).** It renders the iframe only after the user ID
and role are resolved. It handles these messages:

- `kiwi:ready` → sends `kiwi:context` (which adds `placement: 'admin-panel'` and
  `isAdmin`), then `kiwi:appToken`.
- `kiwi:requestToken` → sends `kiwi:appToken`. When the payload is
  `{ reason: 'expired' }`, the view skips its cached token. If minting fails, it
  sends `{ type: 'kiwi:error', message }`.
- `kiwi:adminNavigation` → validates the items with
  `parseAppAdminNavigation` in `src/apps/adminNavigation.ts` (at most 20 items,
  and every path must be internal). The items go into the admin sidebar, and
  clicking one sends `kiwi:adminNavigate` to the app.
- `kiwi:navigate` → logged only. The view does nothing and sends no ack.

The view doesn't handle `kiwi:askAI`, `kiwi:apiRequest` or
`kiwi:updateContext`.

### Token handling

**Token held by the class tab.** `ClassAppView` keeps its own app token for the
`kiwi:apiRequest` proxy. It mints the token with
`POST /api/kiwi-apps/:slug/token` and `{ classId }`, caches it, and fetches a
new one about 60 seconds before it expires. If the backend returns 401, the view
clears the cache. Concurrent requests share a single mint. This token never
leaves the host.

**Token sent to the app.** When the class tab sends `kiwi:appToken` (for the
`mcp` capability or `kiwi:requestToken`), it mints a separate token that
bypasses the cache.

**Admin panel tokens.** `AdminAppView` always gives the app a token. It caches
that token per class, and also shares a single mint between concurrent
requests. Without a class, it requests a token with no `classId`, which the
backend issues only to system admins.

**How the proxy runs an op.** Each op is looked up in
`src/apps/classApps/bridgeOps.generated.ts`. That file maps the op name to a
`KiwiAppsApi` method, its `requiredScopes` and `dynamicScopes`, and a time limit.
Before calling the method, the view checks the token's scopes against the
op's static scopes and its dynamic scopes resolved from the params (for
example, `llm:prompt:{promptId}`). If a scope is missing, it answers
`op_not_granted` without calling the backend. The backend still enforces the
scopes itself.

The host always takes `classId` and `appSlug` from its own state, never from
the app's message.

Proxied calls go through `bridgeKiwiAppsApiClient` in `src/utils/api.ts`. That
client has no auth middleware and doesn't send credentials, so an app-token call
never falls back to the user's token or cookie.

**Regenerating the op table.** `bridgeOps.generated.ts` is generated; don't
edit it by hand. Regenerate it from this directory with the backend running, after
`npm run generate-openapi`:

```bash
node ../kiwi-app-sdk/scripts/generate-bridge.mjs \
  --spec http://localhost:3000/docs-json --host-out src/apps/classApps
```

The SDK's `src/ops.generated.ts` and `BRIDGE-OPS.md` are generated from the same
spec (`npm run generate-bridge` in `kiwi-app-sdk/`). Regenerate all three
together.

### SDK copy served to apps

`public/sdk/v1/kiwi-app-sdk.js` is the SDK's single-file build
(`kiwi-app-sdk/dist/kiwi-app-sdk.global.js`). Kiwi serves it at
`/sdk/v1/kiwi-app-sdk.js`. Keep it byte-identical to the build. If a change
breaks compatibility with apps that already load this file, serve the new build
under a new version path instead of replacing it.

### Class app configuration

`src/apps/classApps/` wraps `GET /api/classes/:classId/apps`:

- `ClassAppsContext.tsx` — `ClassAppsProvider` plus `useClassApps`, `useClassApp`,
  `useIsAppEnabled`, `useAppToken`
- `types.ts` — re-exports the generated DTOs (`ClassAppResponseDto` and friends)
  under friendlier aliases

The provider is exported from `src/apps`, but nothing in the component tree
mounts it. `ClassLayout`, `ClassAppPage` and the admin pages call
`classAppsApiClient` and `kiwiAppsApiClient` directly.

### Matching Kiwi's look

`public/kiwi-design-tokens.css` is served from the Kiwi origin, and embedded apps
can link to it. Its `--kiwi-font-family` names **Montserrat only**, the single
typeface Kiwi uses for ordinary UI (see
[README.md](README.md#typography-montserrat-only)).

The token file has no `@font-face` rule, so an embedded app must load the font
itself. Otherwise the app falls back to the iframe's default font. Self-host the
font the way Kiwi does:

1. Install `@fontsource-variable/montserrat`.
2. Copy the `@font-face` aliases in `src/fonts/montserrat.css`, so the package's
   files are available under the family name `Montserrat`.

Don't import only the package's root stylesheet: it names the family
`Montserrat Variable`, which doesn't match the token.

An app with no build step can link Google Fonts instead, which means the
browser makes a request to Google.

Use `--kiwi-font-family-mono` for code, commands, IDs and JSON.

---

## 2. In-page widget framework

A registry for app manifests that bundle **tools** (executable actions) and
**widgets** (React components). `App.tsx` wraps the router in
`<AppRegistryProvider initialApps={builtinApps}>`.

### Directory map

```
src/apps/
├── index.ts                    # Public surface — types, registry, bridge, host, classApps
├── types/                      # app / tool / widget / bridge type definitions
├── registry/
│   ├── AppRegistry.ts          # Singleton registry
│   ├── AppRegistryContext.tsx  # React provider + hooks
│   └── __tests__/AppRegistry.test.ts
├── bridge/
│   ├── KiwiAppBridge.ts        # window.kiwiApp API
│   ├── BridgeProvider.tsx      # React context for widgets
│   ├── useKiwiApp.ts           # Widget-facing hooks
│   ├── usePersistedWidgetState.ts  # Widget state synced to WidgetsApi
│   └── __tests__/KiwiAppBridge.test.ts
├── host/
│   ├── ToolExecutor.ts         # local / backend / streaming execution
│   ├── AppHost.tsx             # Renders widgets for active apps
│   ├── WidgetContainer.tsx     # Widget wrapper
│   └── __tests__/ToolExecutor.test.ts
├── builtins/index.ts           # `builtinApps: KiwiAppManifest[]` — currently empty
├── adminNavigation.ts          # Admin-panel sidebar helpers for external apps (see section 1)
└── classApps/                  # External app config and bridge op table (see section 1)
```

### App manifest

```typescript
const manifest: KiwiAppManifest = {
  id: 'example',
  name: 'Example App',
  version: '1.0.0',
  description: 'What it does',
  tools: [...],
  widgets: [...],
};
```

### Tools

```typescript
const runCodeTool: KiwiToolDefinition = {
  name: 'run_code',
  description: 'Execute Python code locally',
  inputSchema: { ... },
  outputSchema: { ... },
  execution: {
    type: 'local',          // 'local' | 'backend' | 'streaming'
    handler: async (params) => { ... },
  },
};
```

| Execution type | Behaviour |
| --- | --- |
| `local` | Runs the tool's `handler` in the browser |
| `backend` | `fetch` against `${basePath}${execution.endpoint}`, with one retry path for auth refresh |
| `streaming` | SSE via `@microsoft/fetch-event-source` against `${basePath}${execution.endpoint}` |

`backend` and `streaming` tools must set `execution.endpoint`; without it
`executeTool` returns an error result rather than throwing.

### Widgets

```typescript
const exampleWidget: KiwiWidgetDefinition = {
  id: 'example',
  name: 'Example Widget',
  component: ExampleWidget,
  layout: { position: 'panel', size: { width: '100%', height: '100%' } },
  requiredTools: ['run_code'],
};
```

### Using the registry

```typescript
import { useAppRegistry, executeTool } from '../apps';

const { apps, activeApps, findTool } = useAppRegistry();

const result = await executeTool({
  toolName: 'run_code',
  params: { code: 'print("Hello")', language: 'python' },
  context: { classId: '...' },
});
```

`AppRegistry` exposes `register` / `unregister`, `getApp`, `getAllApps`,
`getActiveApps`, `hasApp`, `getToolsForApp`, `getWidgetsForApp`, `findTool`,
`findToolInContext`, and `getAllActiveTools`.

### Widget state persistence

`usePersistedWidgetState` (and `useUpdateWidgetState`, `useWidgetStates`,
`useDeleteWidgetState`) sync widget state through the generated `WidgetsApi`:

```typescript
await widgetsApi.widgetControllerSaveWidgetState({
  saveWidgetStateDto: {
    appId: 'example',
    widgetId: 'example-123',
    widgetState: { code: '...' },
    classId: 'class-789',
  },
});
```

### Debugging

In a development build the registry is exposed on the window:

```javascript
window.__KIWI_APP_REGISTRY__.getAllApps()
window.__KIWI_APP_REGISTRY__.getAllActiveTools()
window.__KIWI_APP_REGISTRY__.findTool('run_code')
```

Widgets running inside the bridge get `window.kiwiApp` (installed by
`installBridge`, removed by `uninstallBridge`).

---

## Testing

```bash
npx vitest run src/apps
```

This command runs four test suites:

- `AppRegistry.test.ts`
- `KiwiAppBridge.test.ts`
- `ToolExecutor.test.ts`
- `adminNavigation.test.ts`, which tests the admin sidebar parsing

The message handlers in `ClassAppView` and `AdminAppView` have no unit tests
yet.
