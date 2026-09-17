# Testing

Unit tests run on **Vitest** with **React Testing Library** and **jsdom**.

```bash
npm test              # watch mode
npm run test:run      # single run (CI mode)
npm run test:ui       # watch mode with the Vitest web UI
npm run test:coverage # v8 coverage report (text, JSON, HTML)

npx vitest run src/apps                       # one directory
npx vitest run src/pages/Login.test.tsx       # one file
```

## Where tests live

Tests sit next to the code they cover as `*.test.ts` / `*.test.tsx`, except under
`src/apps/`, which groups them in `__tests__/` directories:

- `src/components/**` — shared and feature components (chat, PDF viewer, code
  interpreter, MCP dialogs, navigation, form primitives)
- `src/pages/**` — route components, including `src/pages/admin/**`
- `src/apps/{registry,bridge,host}/__tests__/` — Kiwi Apps framework
- `src/redux/`, `src/utils/`, `src/agent/`, `src/context/` — store slices, helpers,
  agent observation, and global chat context

For a current inventory, run `npx vitest run --reporter=verbose` rather than
relying on a checked-in list.

## Configuration

Vitest is configured in the `test` block of `vite.config.ts`:

- `environment: 'jsdom'`, `globals: true`, `css: true`
- `setupFiles: ['./src/setupTests.ts']`
- Coverage reporters: `text`, `json`, `html`; excludes `src/services/`,
  `src/setupTests.ts`, config files, test files, `dist/`, `coverage/`, `public/`,
  and `*.d.ts`

## Global setup (`src/setupTests.ts`)

Every test file inherits this setup, so most suites do not need to repeat it:

- `@testing-library/jest-dom` matchers
- Browser stubs: `window.matchMedia`, `window.localStorage`, `window.location`,
  `window.navigation`, `Element.prototype.click`, `global.alert`
- `global.fetch` is stubbed to **reject** — a test that needs network data must
  provide its own `fetch` mock
- `vi.mock("./utils/api.ts")` supplies a large default API client mock, plus
  `mcpAdminApiClient` and `toolConfigApiClient`, and a `basePath` of
  `http://localhost:3000`
- The generated `src/services/` barrel, models, and runtime are mocked so tests
  never pull in the real generated client

> **Gotcha:** the global `utils/api.ts` mock only exports the clients listed in
> `setupTests.ts`. A component that imports a newer client (for example
> `classAppsApiClient`, `kiwiAppsApiClient`, or `permissionsApiClient`) receives
> `undefined` unless the test overrides the module mock with its own
> `vi.mock("../utils/api.ts", ...)` factory that includes it.

## Patterns

```typescript
// Rendering
render(<Component />);
expect(screen.getByText('Expected Text')).toBeInTheDocument();

// Events
const handleClick = vi.fn();
render(<Component onClick={handleClick} />);
fireEvent.click(screen.getByRole('button'));
expect(handleClick).toHaveBeenCalledTimes(1);

// Async loading — components that fetch on mount
await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument());
```

Conventions that recur across the suite:

- **Providers:** wrap in `ThemeProvider` for MUI components and a router
  (`MemoryRouter` / `BrowserRouter`) for anything that navigates. Components using
  auth or chat state need `AuthProvider` / `GlobalChatProvider` or a mocked context.
- **Form submission:** use `fireEvent.submit(form)`; clicking the submit button
  does not always fire `onSubmit` in jsdom.
- **MUI internals:** when a component exposes no ARIA role, fall back to
  `container.querySelector()`.
- **Environment variables:** sign-in, consent, and SSO settings in
  `src/config/branding.ts` are read when called, so a test can set them with
  `vi.stubEnv("VITE_ENABLE_GOOGLE_LOGIN", "true")` and undo it with
  `vi.unstubAllEnvs()`.
- **Per-test API behaviour:** import the mocked client and override a method with
  `vi.mocked(apiClient.someController).mockResolvedValue(...)` inside the test.
- **Heavy libraries** (react-slick, react-markdown, PDF viewer, Floating UI) are
  mocked per test file rather than globally.

## Scope

Tests cover rendering, props, user interaction, conditional states, and basic
accessibility. They deliberately do not cover internal component state,
third-party library behaviour, MUI internals, or real network calls.

There is no integration, end-to-end, or visual regression layer yet.

## Known failures

Nine tests currently fail: the chart palette test in `Theme.test.ts`, four in
`GoogleRedirectHandler.test.tsx`, two in `MCPServerDialog.test.tsx`, and two in
`BatchMaterialsUpload.test.tsx`. Because of them, CI runs the suite without
failing the build. Don't add new failures; see
[CONTRIBUTING.md](../CONTRIBUTING.md#known-the-test-suites-are-not-yet-a-ci-gate).

## Troubleshooting

- **Module resolution errors from `src/services/`** — the import path is probably
  not covered by the mocks in `setupTests.ts`; add a `vi.mock` for it.
- **`Fetch not available in test environment`** — the component calls `fetch`
  directly; stub it in the test.
- **Missing theme or router context** — wrap the render in the provider it needs.
- **Timing flakes** — prefer `await waitFor(...)`, or `vi.useFakeTimers()` for
  time-dependent logic.
- `screen.debug()` prints the rendered DOM; `--reporter=verbose` prints each test.
