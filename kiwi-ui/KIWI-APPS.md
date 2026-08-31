# Kiwi Apps

"Kiwi Apps" covers two distinct layers in this repo. They share a name and a
directory but solve different problems, so read the split first.

| Layer | What it is | Status |
| --- | --- | --- |
| **External apps** | Separately hosted web apps, registered with the backend, embedded by Kiwi in an iframe and talked to over `window.postMessage` | In use — this is what "a Kiwi App" means to instructors and app developers |
| **In-page widget framework** | A client-side registry of app manifests, tools, and React widgets (`src/apps/{types,registry,bridge,host}`) | Wired into `App.tsx`, but ships **no built-in apps** (`builtinApps` is `[]`) |

---

## 1. External apps (iframe + postMessage)

An external app is registered and whitelisted on the backend, enabled per class,
and then rendered by Kiwi inside an iframe.

### Routes and components

| Route | Component | Context |
| --- | --- | --- |
| `/:classID/app/:appSlug` | `src/pages/ClassAppPage.tsx` → `ClassAppView.tsx` | Student/class placement |
| `/admin/app/:appSlug` and `/admin/app/:appSlug/class/:classId` | `src/pages/admin/AdminAppPage.tsx` → `AdminAppView.tsx` | Admin/faculty placement |
| `/admin/class/:classID/app/:appSlug` | `AdminAppPage.tsx` | App opened in a class admin context |

`ClassAppPage` resolves the slug to an app plus its UI record (apps may expose
several UIs, filtered by placement), then hands the resolved URL to `ClassAppView`,
which owns the iframe and the bridge.

Admin management pages:

- `/admin/kiwi-apps` — `KiwiAppsAdmin.tsx` (system-wide app registry, admin only)
- `/admin/class/:classID/kiwi-apps` — `ClassKiwiAppsSettings.tsx` (enable/order apps
  for one class)

### Bridge protocol

`ClassAppView` listens for messages from the iframe and posts replies back. The
message types currently handled:

| Direction | Message | Purpose |
| --- | --- | --- |
| app → host | `kiwi:ready` | App booted; host replies with `kiwi:context` |
| host → app | `kiwi:context` | Class, user, and placement context |
| host → app | `kiwi:ack` | Acknowledges a message that carried a `requestId`, so the app can tell "done" from "silently dropped" |
| host → app | `kiwi:requestContext` | Host pulls the app's current context; apps that don't implement it simply ignore it |
| app → host | `kiwi:contextResponse` | Reply to that pull |
| app → host | `kiwi:updateContext` | App pushes its context (also carries the tutoring-mode hint used for AI requests) |
| app → host | `kiwi:askAI` | Ask Kiwi's LLM; host streams back `kiwi:aiChunk`, then `kiwi:aiComplete` or `kiwi:aiError` |
| app → host | `kiwi:apiRequest` | Proxied backend call; host replies with exactly one `kiwi:apiResponse` correlated by `requestId` |
| app → host | `kiwi:requestToken` | Host replies `kiwi:appToken` |
| app → host | `kiwi:navigate`, `kiwi:setChatDisplayMode` | Drive host navigation and the chat panel |

Because `kiwi:askAI` travels through the iframe rather than a direct `fetch`, it
does not need a CORS entry. Direct REST/MCP calls from the app's own origin do —
that origin must be listed in the backend's `FRONTEND_URL`.

### Token and scope model

The app token is **held by the host** in `ClassAppView` and never handed to the
app for the `kiwi:apiRequest` path. Each proxied op is dispatched through
`src/apps/classApps/bridgeOps.generated.ts`, which maps an op name to a typed
`KiwiAppsApi` method along with its `requiredScopes`, `dynamicScopes`, and a
timeout. `classId` and `appSlug` are injected from trusted host context, never
taken from the app's message, so an app cannot address another class or app.

> `bridgeOps.generated.ts` is generated (its header names a
> `scripts/generate-bridge.mjs` generator and an `npm run generate-bridge`
> command). Neither the script nor the npm script is present in this repo today,
> so the file is effectively checked-in output — treat it as generated and
> regenerate it from wherever the generator lives rather than hand-editing.

### Class app configuration

`src/apps/classApps/` wraps `GET /api/classes/:classId/apps`:

- `ClassAppsContext.tsx` — `ClassAppsProvider` plus `useClassApps`, `useClassApp`,
  `useIsAppEnabled`, `useAppToken`
- `types.ts` — re-exports the generated DTOs (`ClassAppResponseDto` and friends)
  under friendlier aliases

The provider is exported from `src/apps` but is not currently mounted in the tree;
`ClassAppPage` and the admin pages call `classAppsApiClient` / `kiwiAppsApiClient`
directly.

### Matching Kiwi's look

`public/kiwi-design-tokens.css` is served from the Kiwi origin for embedded apps
to link. Its `--kiwi-font-family` names **Montserrat only** — the single typeface
Kiwi uses for ordinary UI (see [README.md](README.md#typography-montserrat-only)).

The token file carries no `@font-face`, so an embedded app has to load the font
itself or it will fall back to the iframe's default. Self-host it the way Kiwi
does: install `@fontsource-variable/montserrat`, then mirror the `@font-face`
aliases in `src/fonts/montserrat.css` so the package's files are exposed under
the family name `Montserrat`. Do not import the package's root stylesheet alone:
it names the family `Montserrat Variable`, which does not match the token. For a
build-less app, link Google Fonts and accept the third-party request. Keep
`--kiwi-font-family-mono` for code, commands, IDs, and JSON.

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
└── classApps/                  # External app config (see section 1)
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

Three suites cover this area: `AppRegistry.test.ts`, `KiwiAppBridge.test.ts`, and
`ToolExecutor.test.ts` (70 tests total). The external-app iframe path in
`ClassAppView` / `AdminAppView` has no unit tests yet.
