# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` / `npm run dev` — Vite dev server on port 3001 (port set in `vite.config.ts`)
- `npm run build` — Production build into `dist/`
- `npm run preview` — Serve the built `dist/` locally
- `npm test` — Vitest watch mode; `npm run test:run` for a single CI run
- `npx vitest run src/path/Foo.test.tsx` — a single test file
- `npm run test:ui` / `npm run test:coverage` — Vitest UI / v8 coverage
- `npm run storybook` — Storybook on port 6006 (`npm run build-storybook` outputs to `.storybook/dist/`)
- `npm run generate-openapi` — Regenerate `src/services/` from the backend spec (backend must be running on localhost:3000)

## Architecture Overview

### Core Structure
- **React 19 + TypeScript SPA** built with Vite, using Material UI v7
- **Authentication**: Context-based auth (`src/auth/AuthContext.tsx`) with Google OAuth and username/password login
- **Routing**: React Router `createBrowserRouter`; the whole route table lives in `src/App.tsx`
- **State Management**: Redux Toolkit (interaction tracking, code panel) plus React context for auth, global chat, and the apps registry
- **API Layer**: Auto-generated TypeScript client from the backend's OpenAPI spec

### Key Architectural Patterns

**Route areas** (all defined in `src/App.tsx` under a shared `RootLayout`):
- Student: `/` (class list), `/:classID` → `StudentClassLayout` with `index` chat, `code`, and `app/:appSlug` children
- Admin/instructor: `/admin/*` under a persistent `AdminLayout`; class-scoped pages live under `/admin/class/:classID/*` inside `ClassLayout`
- Auth: `/login`, `/register`, `/logout`, `/auth/callback`, `/authorize`, `/consent`
- Guards: `ProtectedRoute`, `UnprotectedRoute`, `AdminProtectedRoute`. There is no `/professor/*` route area — instructor access is role-filtered inside `/admin/*`.

**Feature Flag System**: Feature availability controlled by `AvailableFeature[]` in AuthContext, checked via `src/utils/featureFlagChecker.ts`

**Auto-Generated API Services**: All API models and services in `src/services/` are generated from the OpenAPI spec. Never edit these files manually — use `npm run generate-openapi` instead.

**Critical API Response Structures**:
- `materialControllerAdd()` returns `{ classMaterialId: string }` (not `materialId`)
- `documentControllerUpload()` returns `{ message: string, document: { id: string, fileName: string } }` (not `documentId`)
- Always use the correct property names when accessing API responses

### Environment Setup
Only `VITE_`-prefixed variables reach browser code. The app reads exactly three:
```
VITE_BASE_PATH="http://localhost:3000"          # base URL for every generated API client (src/utils/api.ts)
VITE_BACKEND_URL="http://localhost:3000"        # backend origin for the Google OAuth redirect
VITE_DISABLE_PASSWORD_LOGIN=true                # hide username/password auth
```
`.env.example` also lists `VITE_GOOGLE_API_ID`, and CI passes it plus `VITE_ENV`, but no source file reads either today.

### Key Components Architecture

**Authentication Flow**:
- `src/auth/AuthContext.tsx` manages user state and available features
- `ProtectedRoute` / `UnprotectedRoute` / `AdminProtectedRoute` control access
- Supports both Google OAuth and username/password login

**Chat System** (`src/components/Chat/`):
- `ChatCore.tsx` is the main chat implementation (sessions, streaming, MCP tool auth, experiment mode)
- `ExperimentCompare.tsx` renders two variants side by side in experiment preview mode
- `src/context/GlobalChatContext.tsx` holds chat panel state (display mode, active class/tab/app) across routes; `src/components/GlobalChat/` renders it

**PDF System**:
- `PDFViewer.tsx` / `PDFViewerForStudent.tsx` for document display
- `AnnotateDocument.tsx` (admin) for PDF annotation; highlight storage and retrieval

**Code Interpreter** (`src/components/CodeInterpreter/`): Ace editor plus in-browser Python via Pyodide (`Pyodide.tsx`), surfaced at `/:classID/code`

**MCP** (`src/components/MCP/`, `src/pages/admin/MCPServerManagement.tsx`, `ClassMCPSettings.tsx`): register MCP servers, assign them per class, configure tools, and handle the OAuth authorize flow at `/authorize`

**Kiwi Apps** (`src/apps/`, `ClassAppView.tsx`, `AdminAppView.tsx`): external apps embedded in an iframe and driven over `window.postMessage`, plus an in-page widget/tool registry. See `KIWI-APPS.md`.

**Experiments** (`src/pages/admin/experiments/`, `src/utils/experimentApi.ts`): per-class chat A/B tests. See `docs/experiments.md`.

**Admin Tools**: class management and enrollment, user management, analytics, email (send + audit), webhooks, feature flags, MCP and Kiwi Apps settings, PDF annotation, and batch materials upload.

**Batch Materials Upload** (`src/pages/admin/BatchMaterialsUpload.tsx`):
- Multi-file PDF upload with batch configuration (material type, availability date)
- Pipeline: material creation → document upload → chunking → description → embedding
- Smart resume: skips already-completed steps when retrying files
- Progress tracked in localStorage (survives refresh), but `File` objects cannot be persisted across sessions — the UI flags files with missing data and offers "Reset All"

### Testing
Vitest + React Testing Library + jsdom, configured in the `test` block of `vite.config.ts`. Global setup in `src/setupTests.ts` mocks browser APIs and, importantly, `./utils/api.ts` — components importing a client not listed there need a per-test module mock. See `TESTING.md`.

### Design System — AI entry point
The design-system documentation lives in Storybook (`npm run storybook`, port 6006) and is split into a human layer and an AI layer by design:

- **Start at `.storybook/design-system/catalog.json`** — the machine-readable index and the **single source of truth for every contract list** (component contracts, foundation rules, quality checks, analytics rules). MDX pages and story docs render from it; never hand-edit a duplicated copy in MDX or stories, and update the catalog when a public contract changes.
- The catalog has two scopes: `storybookGuide` (how this Storybook itself is authored) and `kiwiDesignSystem` (product-facing design contracts: foundations, components, patterns, product guides, quality). Pick the scope, then open only the referenced `docSource` / `storySource` / `componentSource` files.
- Evidence priority when sources disagree: current product requirements → Storybook contract → component source and tests → adjacent established patterns → general UI heuristics. Surface contradictions instead of treating one surface as automatically authoritative.

### Code Style Notes
- Material UI theme in `src/Theme.ts` uses 2014 Material Design palettes, with Purple as the primary interaction color
- Shared admin page patterns live in `src/components/AdminPage/` (`AdminPage`, `AdminPageHeader`) and are documented as Storybook stories in `.storybook/stories/` — follow those rather than inventing new page headers
- Components follow feature-based organization
- TypeScript strict mode enabled
