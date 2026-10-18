# Kiwi UI refresh — Stage 1 brief

**Summary:** Give `kiwi-ui` its own brand system built from the Kiwi mascot's hue family (forest, sage, cream, tan), retire the Material Design 2014 purple, deliver light and dark modes, make the mascot the tutor's animated face in chat, and review all interface copy — without moving page regions, adding routes or changing navigation.

- **Date:** 2026-10-16
- **Status:** confirmed — grilled (G1–G15). Every cold-read finding is folded in or decided by the user. A second cold read of the revised text was not run.
- **Stage:** 1 of a staged redesign. Stage 1 is the visual and verbal layer: tokens, type, modes, mascot, copy. Stage 2+ reworks layout, navigation and the chat learning flow, one step at a time.
- **Process:** this brief feeds `/design-for-ai:plan`. Order of work: plan (phases) → design-DNA step (candidates, then tokens) → mock → **user sign-off gate** → build, phase by phase.

## Glossary

- **The plugin** — `design-for-ai` v4.2.0, a Claude Code plugin (source `github.com/ryanthedev/design-for-ai`). Its workflow is research → plan → mock → build. Its doctrine files and scripts (`scripts/palette.mjs`, `scripts/detect.mjs`, `scripts/dealer.mjs`) are cited below.
- **Dealer pins** — axes fixed before the plugin's seeded design-DNA dealer (`scripts/dealer.mjs`) deals candidate directions; the dealer only varies what is not pinned. See [Taste signals](#taste-signals).
- **Primary** — the interactive brand colour (forest-led in light mode). Not to be confused with **ink**.
- **Ink** — the main text colour on light surfaces (near-black, may be tinted toward the hue family).
- **Neutral black / white** — true achromatic `#000000`-like and `#ffffff`-like values; used where something must not be tinted (institution logos, G2).
- **Paper** — embedded content whose own rendering is preserved in dark mode (G5).
- **Running** — the mascot's `walk` state. "Never runs while the student is reading" means no `walk` while answer text is on screen and streaming.
- **Route area** — student (`/`, `/:classID/*`), auth (`/login`, `/register`, `/logout`, `/auth/callback`, `/authorize`, `/consent`), admin (`/admin/*`). Full list in [Appendix A](#appendix-a--route-inventory).

## Open questions

**Raised by the cold read, now decided:**

- ~~R1 — Verification devices and viewports~~ — resolved, see G13.
- ~~R2 — Running experiments~~ — resolved, see G14.
- ~~R3 — Sans or serif for the UI family~~ — resolved, see G15.

**Decided later, with an owner:**

1. **UI typeface (Latin face)** — design-DNA step, confirmed at the mock gate. Constraints:
   - a humanist sans-serif (G15);
   - one family for headings and body (G6);
   - sits well beside PingFang SC and Microsoft YaHei (G7);
   - self-hostable, and licensed for redistribution through the public tokens;
   - not Montserrat, and not on the plugin's overused list.
2. **Chart palette** — design-DNA step, using the dataviz method. Today `palette.chart` is purple → pink → red → orange → grey, and `src/components/ClassAnalytics/tokens.ts` holds its own colours. Needs a five-series set derived from the new system: colour-blind safe, data marks and essential lines ≥ 3:1 against the plot background, in both modes.
3. **Editor and code themes** — design-DNA step. Code editors (Ace) and code blocks (`react-syntax-highlighter`) follow the mode; they are not paper (G5). Each needs a light and a dark theme matching the palette.
4. **Icon system** — design-DNA step, confirmed at the mock gate. The ported `KiwiIcons` set has 24 feature icons (`currentColor`); the app uses many Material icons. Whether KiwiIcons replace Material icons where they overlap, and how the two sets are reconciled in stroke weight, is open.
5. **Rest of the design DNA** — radius scale, elevation versus borders, focus style, motion for non-mascot UI. Design-DNA step.

**Assumptions to confirm:** the UI stays English (G12); students mostly use laptops (G13 keeps phones working on student routes either way).

## What

Kiwi is an AI learning companion embedded in university courses: students chat with an AI tutor grounded in course materials, read PDFs, run Python/R in the browser, and use embedded Kiwi Apps. Instructors and admins manage classes, materials, experiments, analytics, email, MCP servers and apps.

### Stage 1 boundary

**In:** colour, typography, measure (line length) and spacing density inside existing containers, radius, elevation, borders, focus states, the mascot, interface copy, outgoing email templates' colours and copy.

**Allowed element changes inside existing regions:**
- the mascot avatar on tutor messages, and its peek at the composer edge (G9);
- mascot illustrations in empty states, including the class-card image fallback (G9);
- restyled content of the existing catch-all not-found route (`path: "*"`);
- one Display-menu button in the top bar's existing icon group (G4).

**Out:** moving or resizing page regions, adding or removing navigation items, adding routes, changing flows. Those are Stage 2+.

## Release gates and done-when

**Light release** happens when items 1–10 below hold in light mode. **Dark release** (setting `VITE_ENABLE_DARK_MODE`, G3) happens when they also hold in dark mode. Stage 1 is done at the dark release.

Mascot motion is verified with `VITE_ENABLE_MASCOT_MOTION` on. Each deployment decides when to switch it on (G14).

1. **No raw colour values in components.** A test scans `src/**/*.{ts,tsx,js,jsx,css}` (excluding generated `src/services/`) the way `src/typography.test.ts` scans for fonts. It fails on:
   - hex colours;
   - `rgb()`, `rgba()`, `hsl()`, `hsla()`, `oklch()`, `oklab()`, `lab()`, `lch()` and `color-mix()` literals;
   - CSS named colours other than `transparent`, `currentColor` and `inherit`;
   - imports of palette objects (`@mui/material/colors`, `src/theme/material-design-2014.json`) outside the token source.

   Allowlisted files state their reason: the token source; mascot artwork with its own flat palette; outgoing HTML email templates (email clients need inline literal colours — their values still come from the new palette). `ClassAnalytics/tokens.ts` is merged into the token source, not allowlisted.
2. **WCAG AA in each released mode on every route.** Text 4.5:1 (3:1 for large text); interactive boundaries, focus indicators and meaning-carrying icons 3:1; chart data marks and essential lines 3:1 against the plot background. Method: an automated axe-core contrast pass per route × role × mode at the verification viewports (G13), with empty / loaded / error states where the page has them; plus a manual pass for what automation can't reach (hover, focus, charts, mascot backing).
3. **One token source for values.** A single token module holds every colour, type, spacing, radius and elevation value. The MUI theme and `public/kiwi-design-tokens.css` are generated from it, and a test fails if either drifts.
4. **Storybook catalog updated.** `.storybook/design-system/catalog.json` documents the new foundations (colour, type, density, modes), the ported mascot and icon components, and the Display menu.
5. **Mock sign-off on a named screen set**, each in light and dark:
   - sign-in;
   - course list;
   - chat, showing every mascot state;
   - code page;
   - one admin table page;
   - one admin form page.

   The test: seen beside the mascot, it reads as one product.
6. **Copy reviewed.** Every user-facing string under `src/` (outside `src/services/`), and the outgoing email templates, is checked against the voice-and-tone guide (G12). A per-route checklist records each route as reviewed.
7. **Mascot behaviour.**
   - The G9 state map is implemented, with unit tests for each chat event → state transition.
   - Only the newest tutor message's avatar animates.
   - Reduced motion and the animation switch are honoured.
   - Asset budget (proposed, to confirm in plan): no 256 px atlas is loaded for a 32 px avatar, and a chat page loads at most 300 KB of mascot images before the first answer completes.
8. **Display menu.**
   - The theme choice (when the dark flag is on) and the animation switch work.
   - Both persist per device.
   - Sign-in and register pages honour them.
9. **Type.**
   - The new family and the CJK stack are applied.
   - Mixed English–Chinese lines are checked in the mock.
   - `src/typography.test.ts`, `README.md` and `KIWI-APPS.md` state the new rule.
10. **Public tokens.** The value change in `public/kiwi-design-tokens.css` is recorded in `CHANGELOG.md` for Kiwi App developers.

## Who

- **Students** — the main audience. Long sessions reading AI answers that mix prose, math (KaTeX), code and citations; switching between chat, materials and the code page. Mostly on laptops (assumed); phones work today on student routes and must keep working (G13).
- **Instructors and admins** — table- and form-heavy work under `/admin`: class settings, materials upload, analytics dashboards (Recharts), user management (MUI X DataGrid), experiments. Instructors see their own classes ("My Classes"); some admin pages are admin-only.
- **Kiwi App developers** — consume `public/kiwi-design-tokens.css` so external apps match Kiwi.
- **Researchers running experiments** — instructors comparing chat variants; they need conditions held steady (G14).

Jobs-to-be-done and journeys are Stage 2 inputs: Stage 1 changes no flows, so its inventory is every existing route as it stands ([Appendix A](#appendix-a--route-inventory)).

## Feel

**A quiet academic shell with one living companion.**

**The shell — quiet.**
- Colour carries meaning, not decoration. Surfaces are low-chroma.
- At most one filled primary control per view region (a page, a dialog, a panel): the next step. Other interactive elements use primary only as text, outline or tint.
- No gradients, glows or glass effects.
- Hierarchy comes from type weight, size and spacing. Elevation is minimal: tonal surfaces and borders before shadows.

**The shell — academic.**
- Reading comes first. Prose runs at a comfortable measure (about 60–75 Latin characters, about 35–40 for Chinese) with generous leading.
- Math, code and citations are typeset with care.
- The type is a humanist sans (G15): the academic feel comes from typesetting, not from serifs.

**Light mode — "a well-lit library".** A cream-family canvas, with content surfaces in a lighter warm near-white from the same family. Exact values are set in the DNA step.

**Dark mode — "a reading lamp at night".**
- Warm, hue-family-tinted dark surfaces, not pure black.
- Body text is off-white, not pure white.
- Sage leads the accents.

**The companion.** The Kiwi mascot is the one expressive element. It lives mostly in chat as the tutor's face and reacts to what is happening (G9). It is still while the student reads.

**Not this:**
- Duolingo-style gamified intensity. Duolingo is cited in G1 for colour semantics only.
- Marketing-site scroll theatrics; the website's mascot journey stays on the website.
- The AI-template look: purple gradients, glowing dark mode, uniform card grids.

## Problems the user named

- Looks dated / template-like (MD2014 purple, default Material components).
- Weak brand: the mascot speaks forest green and cream; the interface speaks purple.
- Hard to find things (Stage 2 — navigation and IA).
- Chat learning experience (Stage 2 for flow and layout; Stage 1 already brings reading comfort through typography, and the mascot's chat states).

## Density

- **Comfortable** — student and auth route areas, and every reading surface (chat answers, PDF pages, materials). MUI default ("standard") sizes and spacing; reading-first measure and leading.
- **Compact** — the admin route area (`/admin/*`), and tool chrome anywhere (IDE toolbar, PDF toolbar, table toolbars). MUI small sizes, DataGrid `density="compact"`, tighter form spacing.

## Constraints

- **Frontend-only.** No backend or API changes in Stage 1. Every mechanism below is chosen so it works from the UI alone. For example:
  - the like trigger reuses the existing thumbs-up in `src/components/Feedback/Feedback.tsx`;
  - offline comes from browser online/offline events and failed requests;
  - preferences live in `localStorage`;
  - rollout timing around running experiments is handled by a build-time switch, not by the student UI detecting experiments (G14).
- **Network and hosting.** Deployments include NYU Shanghai, in mainland China, where third-party CDNs (Google Fonts among them) are unreliable.
  - Every font, icon and image is self-hosted.
  - Fonts must be licensed for self-hosting and for redistribution through the public tokens (e.g. SIL OFL).
  - Slow networks are expected; see the asset budget in done-when 7.
- **One lever, many leaks.** `src/Theme.ts` (MUI v9) is the main control, but outside it there are ~230 hex literals across ~40 files, 58 `rgb()/rgba()` literals and 61 literal `white`/`black`/`#fff`/`#000` values (~350 in all). Hotspots:
  - `PDFViewerForStudent.tsx`, `Chat/PDFComponent.tsx`, `Chat/ChatCore.tsx`
  - `ClassAnalytics/tokens.ts`, `Analytics/UserLogin.tsx`, `Analytics/SessionDaily.tsx`
  - `Email/TemplatedEmailForm.tsx`, `EmailAudit.tsx`
  - `AnnotateDocument.tsx`, `experiments/ExperimentAssistant.tsx`
  - `CodeInterpreter/IDE.css`, `Register/register.css`
- **Sources of truth, split by kind.**
  - **Values:** the single token module (done-when 3). The MUI theme and `public/kiwi-design-tokens.css` are generated from it; the public CSS is what Kiwi Apps and, later, the website consume (G10).
  - **Contracts and documentation:** `.storybook/design-system/catalog.json` names the tokens and their rules and references the token module, but holds no values.
- **Two token sources already drift.** `public/kiwi-design-tokens.css` says primary is `#7b1fa2` (purple.700); `src/Theme.ts` uses `#6a1b9a` (purple.800). Done-when 3 ends this.
- **Branding is configurable.** Institution name, logos and support details come from `src/config/branding.ts`; nothing institution-specific is hardcoded.
- **Docs drift.** `kiwi-ui/CLAUDE.md` mentions Tailwind CSS 4 and shadcn primitives in `src/components/ui/`; neither is present. The refresh stays on MUI + Emotion.
- **Accessibility.** WCAG AA in each released mode (done-when 2). Links inside prose are underlined, so they are not told apart from body text by colour alone (WCAG 1.4.1).

## Existing brand assets

- **Mascot artwork:** `public/favicon.svg` and the app icons, with their own flat palette:
  - forest `#234631`
  - sage `#92ae70`
  - cream `#f5f4e8`
  - tan `#ccbd99`
- **`KiwiWordmark`:** Montserrat 800 italic "Kiwi". Used by `Login` and `AuthLayout`, and as the grey placeholder in `ClassCard` when a class has no image.
- **Top bar:** shows the institution logo when one is configured. Otherwise it shows `kiwi-mark.svg` beside a plain "Kiwi" label (`InstitutionLogo`).
- **Mascot library to port:** see G9.

## Taste signals

Carried into the design-DNA step as dealer pins.

- **Hue family (pinned), not exact values (G11):** the mascot family — forest `#234631`, sage `#92ae70`, cream `#f5f4e8`, tan `#ccbd99`. UI tokens are OKLCH ramps derived from these hues; roles are assigned per mode (forest-led in light, sage-led in dark is the expected outcome).
- **Banned:** Material Design 2014 purple anywhere in the UI or emails; purple/pink chart series.
- **Brand type (pinned):** Montserrat, only inside the `KiwiWordmark` component (G6).
- **UI type (class pinned, face open):** one humanist sans family for headings and body (G6, G15); reading-first; pairs with the CJK stack.
- **Feel (pinned):** a quiet academic shell with one living companion — see [Feel](#feel) for what that means on screen.
- **Modes (pinned):** light and dark are both Stage 1 deliverables; dark is released behind a build switch (G3).
- **Density (pinned):** comfortable for student, auth and reading surfaces; compact for admin and tool chrome.

## References

- **Kiwi website** — the user's local `kiwi-website` project (a sibling folder of this repository). It is buildless; preview it with `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist` and open `http://127.0.0.1:4173`. It already uses the mascot family:
  - colours: paper `#f6f5ed`, ink `#263d2b`, green `#31573b`, lime `#e5f1b8`, line `#dfe3d8`, muted `#667065`;
  - type: DM Sans (body; headings at weight 500 with tight tracking) and Instrument Serif (italic accents);
  - wordmark: brand-icon tile + lowercase "kiwi" with a green full stop (`#78934c`);
  - motion: a scroll-driven mascot journey under the app gallery, on the same drawn-frame atlases.

  **It is a reference, not a source** (G10): the product leads, and the website aligns later.
- **Mascot library** — `NYUSH-ML/kiwi-ui`, branch `kiwi-icon`, commit `fbb4db8` ("feat: Add Kiwi icon and drawn-frame motion library"). See G9.
- **Current-state tour** — [`2026-10-16-kiwi-ui-tour.md`](2026-10-16-kiwi-ui-tour.md): the live UI page by page (student and admin sides), plus three bugs found on the way.

## Grill decisions

### G1 — Success stays green, separated by chroma and form, in both modes

Measured in OKLCH, forest `#234631` sits at hue 156° and the current success green.800 `#2e7d32` at 144° — 12° apart, the same hue family. In light mode they also differ in lightness (0.36 vs 0.52) and chroma (0.055 vs 0.135). In dark mode the lightness order flips: the sage-led primary (`#92ae70`: L 0.71, C 0.09, H 128°) is lighter than a typical success green. So lightness cannot be the separator.

- **Primary** is used only on interactive controls: buttons, links, focus, selection — within the one-filled-control rule in [Feel](#feel).
- **Success** is used only on status surfaces: alerts, chips, status dots, check icons. It is never the only signal: every success state carries an icon and a text label.
- **In both modes,** success has clearly higher chroma than primary, and the two keep a hue offset. The design-DNA step verifies both modes.
- **"In progress" is neutral, not primary.** Today `src/components/Chat/ToolStatusIndicator.tsx` shows a running tool in `primary.main` and a finished one in `success.*`. The inline status becomes neutral text plus a small progress indicator. The avatar's `walk` (G9) runs alongside it; the two do not conflict.
- **Rationale:** green brand + green success coexist in GitHub and Duolingo. The confusion risk is only where primary and success encode *different* states side by side, and the rules above remove it.

### G2 — Institution logos are neutral black or white, never Kiwi's colour

`src/components/Brand/InstitutionLogo.tsx` renders `VITE_LOGO_LIGHT_URL` as a CSS mask filled with `color`, which defaults to `primary.main`. Today that tints the NYU Shanghai logo purple `#6a1b9a` (not NYU Violet `#57068c`); after the refresh it would tint it forest green.

- NYU school-level brand guides allow the logo only in NYU Violet, black or white, and forbid recolouring it (NYU Abu Dhabi guidelines, 2023; NYU Law visual identity, 2013). Most institutions have a similar rule.
- **Decision:** the logo is neutral black on light surfaces and neutral white on dark surfaces. The rule follows the surface behind the logo, not the mode: the auth panel's dark image area already passes `common.white`.
- The logo never takes the Kiwi primary, and never the hue-tinted ink.
- Kiwi's own marks (`KiwiWordmark`, the "Kiwi" label in the no-logo fallback, the mascot) may use the brand palette.

### G3 — Dark mode is a Stage 1 deliverable, released behind a build switch

There are ~350 raw colour values outside the theme. They are concentrated in admin pages (analytics, email, webhooks, annotation), with a student-side cluster in the PDF viewer, chat and IDE. A dark page with dark-on-dark text is worse than no dark mode.

- **Dark mode stays in Stage 1 scope.** Stage 1 is not done until every route passes in both modes.
- **Release is decoupled.** Dark mode is exposed only when the build-time flag `VITE_ENABLE_DARK_MODE` is `"true"`, read through `src/config/branding.ts` like the other deployment switches. Light releases at the light gate ([Release gates](#release-gates-and-done-when)). Because done-when 1 requires every raw colour to be migrated first, the light release never mixes old and new palettes.
- **Rejected:** the backend feature-flag system. Its flag names are a backend enum (`FeatureResponseFeatureNameEnum`), so using it would pull a backend change into a frontend-only stage.

### G4 — A Display menu: mode follows the OS, animation can be switched off

- **Default mode:** follow the operating system (`prefers-color-scheme`).
- **The Display menu:** one icon button in the top bar's right-hand icon group, next to Logout (`src/components/TopNav/TopNav.tsx`; there is no user menu to put it in). It has two groups:
  - **Theme:** System / Light / Dark — shown only when `VITE_ENABLE_DARK_MODE` is on;
  - **Kiwi animation:** on / off — shown only when `VITE_ENABLE_MASCOT_MOTION` is on (G9, G14).

  The button is shown when either group is. Before the dark release the app is always light.
- **Persistence:** both choices are stored in the browser (`localStorage`), per device. Sign-in and register pages, which have no top bar, honour them.
- **Rejected:** storing preferences on the account. It needs a backend field, and Stage 1 is frontend-only.

### G5 — "Paper stays paper": embedded content keeps its own rendering in dark mode

- **Paper (kept light in dark mode):**
  - **PDF pages and templated-email previews** — for fidelity: figures, scans and highlights are authored on white, and an email preview should show what the recipient's client will show.
  - **Kiwi App iframes** — because no channel carries the mode to them today. The SDK's `KiwiContext` (`kiwi-app-sdk/src/types.ts`) has no theme field. The in-page widget bridge has one and declares a `theme_changed` event, but the event is never emitted and, per `kiwi-ui/KIWI-APPS.md`, its provider is not mounted.

  Their frames and toolbars follow the mode; the content surface does not. Dimming the paper slightly in dark mode, to cut glare, is a design-DNA detail.
- **Content:** user-uploaded images and plots produced by the Python/R runtimes are never inverted or recoloured.
- **Not paper (follows the mode):** code editors, code blocks, output consoles and every Kiwi-drawn UI surface.
- **Public tokens:** `kiwi-design-tokens.css` keeps its variable names and takes the new palette values, so existing apps re-skin without code changes. It stays light-only in Stage 1 (it has no dark section; its `-dark` tokens are darker shades, not a dark mode). The value change is recorded in `CHANGELOG.md` (done-when 10).
- **Deferred:** a `theme` field and a mode-change message in the SDK, plus a dark section in the public tokens. That is a contract change for third-party developers (SDK release, example-app update) and belongs to a later stage.

### G6 — Montserrat is the wordmark, not the heading font

The Kiwi wordmark is live text in Montserrat 800 italic (`src/components/Brand/KiwiWordmark.tsx`), so Montserrat carries brand recognition. But it is a wide, geometric face drawn from street signage — loud for a quiet, academic product when used on every heading — and the plugin's AI-tell detector lists it among overused fonts (`scripts/detect.mjs`, `OVERUSED_FONTS`).

- **Montserrat** appears only inside the `KiwiWordmark` component, which stays on sign-in (`Login`, `AuthLayout`). The class-card image fallback stops using the wordmark and shows a mascot pose (G9). That leaves the wordmark a genuinely rare brand moment.
- **Headings and body** use one quieter family, with hierarchy from weight and size. One Latin family also means one CJK pairing to tune.
- **Existing contract to rewrite** (done-when 9): "Montserrat is the only UI font" is enforced by `src/typography.test.ts`, documented in `README.md` ("Typography: Montserrat only") and `KIWI-APPS.md`, published as `--kiwi-font-family` in `public/kiwi-design-tokens.css`, and loaded from `src/fonts/montserrat.css`.

### G7 — Chinese text uses the system CJK fonts

UI copy is English, but students often read and write Chinese in chat; today Chinese falls back to whatever the OS picks.

- **No CJK webfont is shipped.** After the Latin face, the stack names the system CJK fonts explicitly, in this order:
  1. `"PingFang SC"`
  2. `"Hiragino Sans GB"`
  3. `"Microsoft YaHei"`
  4. `"Noto Sans CJK SC"`
  5. the generic `sans-serif`
- **The Latin face is chosen to sit well beside PingFang SC and Microsoft YaHei** (x-height and stroke weight). Mixed-script lines are checked in the mock.
- **Chinese-dominant blocks get more leading.** This is decided per block (paragraph or list item), because generated content carries no `lang` tag; the detection method is set in plan.
- **Rejected:** self-hosting Noto Sans SC. It renders identically everywhere, but each weight costs a few hundred KB on first load, and slow networks would show a flash of the system font anyway.

### G8 — Hard, test-guarded completion criteria

Visual sign-off alone was rejected: new code would quietly reintroduce raw colours and dark mode would decay. The criteria are in [Release gates and done-when](#release-gates-and-done-when).

### G9 — The mascot is the tutor's face, and it reacts to the conversation

The user chose a livelier mascot than "quiet" first implied: it is the AI tutor's avatar in the student–tutor chat, and it changes state with what is happening. The restraint moves from *whether* it moves to *when*: it is still while the student reads.

**Source.** `NYUSH-ML/kiwi-ui` branch `kiwi-icon`, commit `fbb4db8`, already contains:
- `src/components/KiwiMascot/`
  - a drawn-frame player (`KiwiMascot`), plus `KiwiLoader` and `KiwiStamp` (peek launcher);
  - 19 states in `states.ts`, drawn from 8 atlases (a state is a sequence over an atlas, not an atlas of its own);
  - reduced-motion, pause and interrupted-reversal handling.
- `src/components/KiwiIcons/` — `KiwiIcon` and 24 feature icons drawn with `currentColor`.
- Integrations:
  - chat, in `ChatMessages.tsx`: `assistantState()` maps to thinking / speaking / error / idle;
  - the floating launcher, in `GlobalChatButton.tsx`;
  - `Loader.tsx`.
- Storybook stories and catalog entries.

That branch sits on an older base of a different repository layout, so the library is **ported** into `kiwi-ui/`, not merged. The branch's `assistantState()` mapping is replaced by the state map below; its `thinking` state is not used in chat.

**State map (agreed).** It uses 9 of the 19 states.

| Moment | State | Notes |
|---|---|---|
| Student is typing | `peek` at the composer edge, `retract` shortly after typing stops | Not on message avatars |
| Waiting for the first token, or a tool / agent step running | `walk` | Nothing to read yet |
| Answer text is streaming | `speaking` | Low amplitude (eyes and beak only); no `walk` while text is on screen |
| Answer complete | `hop` once (~0.7 s: small jump, short wing flap) | One-shot, then `idle` |
| Student likes the answer (existing thumbs-up in `Feedback.tsx`) | `heart` | One-shot |
| Error / offline | `error` / `offline` | |
| Resting | `idle` | Holds still; an occasional blink at most |

**Rules.**
- **One mover:** only the newest tutor message's avatar animates. Older avatars hold a still pose.
- **Never the only signal:** progress and state are always also given in text ("Thinking…", "Running ⟨tool⟩…", error messages). The mascot is decorative to assistive technology (`aria-hidden`).
- **Motion controls:**
  - the deployment switch `VITE_ENABLE_MASCOT_MOTION` (G14);
  - `prefers-reduced-motion`;
  - the Display menu's animation switch (G4).

  With motion off at any of these levels, each state shows its still pose.
- **Visible in both modes:** the mascot keeps its exact colours (G11). In dark mode it sits on a light circular backing, so its forest outline (1.7:1 on a dark surface) stays clearly visible.

**Placement beyond chat.**
- Brand positions:
  - the top-bar mark when no institution logo is configured (the existing rule);
  - sign-in.
- Empty states:
  - no classes;
  - no conversation yet;
  - the class-card image fallback.
- Error and not-found pages.

**Asset budget.** The branch's `public/kiwi-mascot` is 61 MB (v2 and v3 sources plus per-frame PNGs). Runtime needs only the 8 active v3 WebP atlases (~4.4 MB, 256 px cells).
- Port runtime assets only.
- Generate downscaled atlases for the 32 px avatar.
- Load atlases lazily per state.

Budget numbers are in done-when 7.

### G10 — The product leads the brand; the website follows later

The user's `kiwi-website` already has a mascot-family design language (see [References](#references)). The user chose **not** to inherit it: the product gets its own system, designed on purpose for an AI learning product, and the website will later align to the product.

- **The product's token module is the brand's source of values.** Its generated public CSS is what the website will consume.
- **The website is a reference, not a constraint.** Where it shows something that works, the DNA step may borrow it.
  - Its measured contrast is mostly sound: ink 10.8:1 on paper, muted 4.7:1, white on green 8.2:1, focus ring 3.8:1.
  - Its hairline `#dfe3d8` (1.2:1) is too faint for input boundaries.
- **Every palette choice must be justified for this use:**
  - long reading sessions;
  - low glare;
  - attention cues that don't compete with content;
  - clear semantic states;
  - colour-blind safety;
  - parity between light and dark.

### G11 — Pin the mascot's hue family, not its exact values

No single mascot colour can hold the same role in both modes:

| Colour | On cream `#f5f4e8` | On a dark surface `#121614` |
|---|---|---|
| forest `#234631` | 9.5:1 | 1.7:1 |
| sage `#92ae70` | 2.2:1 | 7.4:1 |
| tan `#ccbd99` | 1.7:1 | 9.8:1 |

- **The mascot artwork keeps its exact colours.**
- **UI tokens are derived:** OKLCH ramps generated from the four hues, with roles assigned per mode and per contrast need (for example forest leads in light mode, sage in dark). Exact values are set, with stated reasons, in the design-DNA step.

### G12 — Stage 1 includes a full UX-copy review

The user widened Stage 1 from "only copy attached to new visuals" to every route.

- **Scope:**
  - buttons, labels, helper text, errors, empty states, confirmations, toasts and page titles on every route (Appendix A);
  - the new copy: Display menu, mascot empty states, not-found page;
  - the outgoing email templates that `src/components/Email/TemplatedEmailForm.tsx` builds in the browser. Their header is purple `#5C3B6E` today, so their colours change too.
- **Method:** the plugin's content-design doctrine, written down first as a short voice-and-tone guide that every change cites. Starting points for the guide:
  - **To students:** plain, specific and calm; say what happens next; no hype, no exclamation marks, no claims about AI the product can't back.
  - **To instructors and admins:** operational and exact; nouns match what is on screen; destructive actions state their consequence first.
  - **A known failing example:** the sign-in tagline in `src/components/AuthLayout/AuthLayout.tsx`, "Learn deeply. Ask freely. Grow with AI." It is a three-beat slogan with vague verbs, and "Grow with AI" says nothing about what Kiwi does.
- **Cost to plan for:** there is no i18n layer, so strings live inline in components; and 78 test files hold ~529 text-based queries (`*ByText`, `*ByRole` with `name`, `*ByLabelText`). Copy changes and test updates land together.
- **Language (assumed, not discussed):** the UI stays English; translating it is out of scope.

### G13 — Desktop-first verification; student routes must not regress on phones

The UI already carries responsive code (179 breakpoint / `useMediaQuery` uses across 45 files, including chat, top bar and sign-in), so phones work today on student routes.

- **Every route** is verified at 1280×800 and 1440×900, in each released mode.
- **Student and auth routes** are also verified at 390×844, as a no-regression check. Contrast passes, and the mascot and its composer peek render correctly. The phone layout is not redesigned; that is Stage 2.
- **Admin routes** are desktop-only.

### G14 — Running experiments: uniform rollout, plus a deployment switch for mascot motion

Chat A/B experiments run one per class. Their variants differ in model engine and system prompt (`kiwi-ui/docs/experiments.md`). The student UI cannot tell whether its class has an active experiment: assignment happens on the server, the experiments API is for managing experiments, and experiment mode in `ChatCore.tsx` is an instructor/admin preview. A per-class freeze would therefore need backend work, which Stage 1 does not do.

- **Uniform rollout.** Every variant group always sees the same interface, so comparisons between groups stay valid.
- **Announced.** The release date goes into `CHANGELOG.md`, and instructors with an active experiment are told before the deploy, so an experiment that spans it can treat it as a period effect or be scheduled around it.
- **Deployment switch.** The build-time flag `VITE_ENABLE_MASCOT_MOTION`, read through `src/config/branding.ts` like G3's dark-mode flag, gates mascot motion in chat. With it off:
  - the tutor avatar is the still mascot portrait;
  - there is no peek, walk, speaking, hop or heart;
  - the Display menu hides the animation switch.

  A deployment with experiments running can ship the rest of Stage 1 and switch motion on later.
- **Rejected:** a per-class freeze (needs backend), and doing nothing.

### G15 — The UI family is a humanist sans-serif

"Academic" could have meant a serif journal look. It was decided against:

- **CJK consistency.** The CJK stack is sans (黑体, G7). A Latin serif beside it mixes styles on every mixed-script line. Switching the CJK stack to a serif (宋体) would land Windows users on SimSun, which renders poorly at interface sizes.
- **Density.** Admin pages are dense tables and forms, where a sans holds up better at small sizes.
- **Where the academic feel comes from instead:** typesetting — measure, leading, hierarchy, and careful math, code and citations (see [Feel](#feel)).
- **Rejected:** a serif for AI-answer prose only. It would add a second family (against G6), and mixed-script answers would still clash.

## Cold read log

Cold read 1 (a fresh subagent with no context) returned 20 findings. Where each went:

- **Folded into the brief:**
  - light release gate → [Release gates](#release-gates-and-done-when);
  - one-filled-control rule → [Feel](#feel);
  - G1 in dark mode;
  - Stage 1 boundary → [What](#what);
  - route inventory → [Appendix A](#appendix-a--route-inventory);
  - JTBD deferred → [Who](#who);
  - inline status vs `walk` → G1, G9;
  - Display menu groups → G4;
  - checkable done-when items and methods;
  - actionable feel and anti-references;
  - stillness rules → G9;
  - neutral logo colours and the ink/primary naming → G2, [Glossary](#glossary);
  - paper rationale and list → G5;
  - mascot dark backing → G9;
  - raw-colour test scope → done-when 1;
  - frontend-only and network constraints → [Constraints](#constraints);
  - density areas → [Density](#density);
  - sources of truth → [Constraints](#constraints);
  - voice seeds and email templates → G12;
  - open-question owners → [Open questions](#open-questions);
  - G9 leftovers (one mover, state vs atlas counts, `thinking`);
  - wordmark rarity → G6;
  - glossary terms;
  - CJK leading trigger → G7.
- **Taken back to the user and decided:**
  - R1 → G13 (desktop-first; student routes don't regress on phones);
  - R2 → G14 (uniform rollout plus a mascot-motion deployment switch);
  - R3 → G15 (humanist sans).

Every finding is now folded or decided. A second cold read of this revised text has not been run.

## Appendix A — Route inventory

From `kiwi-ui/src/App.tsx`. Roles: S = student, I = instructor, A = admin. Roles are the intended access model (see the end of this appendix), not today's guards. "Admin-only" means intended for admins only; today only four of those pages sit behind `AdminProtectedRoute`, and it also admits instructors.

**Student and auth areas (comfortable)**

| Route | Page | Roles |
|---|---|---|
| `/` | Course list (`Courses`) | S, I, A |
| `/:classID` | Class chat (`ClassChat`) | S, I, A |
| `/:classID/code` | Code page (`ClassIDE`) | S, I, A |
| `/:classID/app/:appSlug` | Kiwi App (`ClassAppPage`) | S, I, A |
| `/login`, `/register`, `/logout`, `/auth/callback` | Sign-in, register, sign-out, Google callback | all |
| `/authorize` | MCP OAuth authorize (`MCPAuthorize`) | per route guard |
| `/consent` | Consent gate | per route guard |
| `*` | Not found | all |

**Admin area (compact)** — under `/admin`, which admits admins and instructors.

| Route | Page | Roles |
|---|---|---|
| `/admin/classes` | Classes / My Classes | I, A |
| `/admin/analytics` | Analytics | A (admin-only) |
| `/admin/email` | Email | A (admin-only) |
| `/admin/email-audit` | Email audit | A (admin-only) |
| `/admin/feature-flags` | System-wide feature flags | A (admin-only) |
| `/admin/new-class` | New class | A (admin-only) |
| `/admin/webhooks`, `/admin/webhooks/approvals` | Webhooks, approvals | A (admin-only) |
| `/admin/mcp-servers` | MCP servers | A (admin-only) |
| `/admin/kiwi-apps` | Kiwi Apps | A (admin-only) |
| `/admin/app/:appSlug`, `/admin/app/:appSlug/class/:classId` | Admin app view | I, A |
| `/admin/user-management` | User management | A (admin-only) |
| `/admin/class/:classID` (and `edit-metadata`) | Class settings (`ClassEdit`) | I, A |
| `/admin/class/:classID/manage-materials` | Materials | I, A |
| `/admin/class/:classID/feature-flags` | Class feature flags | A (admin-only) |
| `/admin/class/:classID/enroll-students` | Enrolment | I (instructors of this class), A |
| `/admin/class/:classID/send-emails` | Class email | I (instructors of this class), A |
| `/admin/class/:classID/professor-analytics` | Class analytics | I, A |
| `/admin/class/:classID/experiments` (+ `new`, `:id/edit`, `:id`) | Experiments | I, A |
| `/admin/class/:classID/mcp-settings` | Class MCP settings | A (admin-only) |
| `/admin/class/:classID/kiwi-apps` | Class Kiwi Apps | I, A |
| `/admin/class/:classID/app/:appSlug` | Class app (admin view) | I, A |
| `/admin/class/:classID/:materialID/:documentID` (+ `/annotation`) | PDF annotation (`AnnotateDocument`) | I, A |

**Intended access model (stated by the user, 2026-10-16):** student accounts cannot enter the teacher/admin interface (`/admin/*`); instructors and admins can enter the student interface. The roles in the tables above follow this model, and so does the plan's verification matrix.

**Instructors in the admin area (decided by the user, 2026-10-16, "按建议" to the recommendation below):**
- System-level pages are admin-only: Analytics, Email, Email audit, System-wide feature flags, MCP servers, Kiwi Apps, Webhooks, Webhook approvals, User management.
- Creating a class (New class) is admin-only. This is the coordinator's default, matching today's backend (`POST /class/add` is admin-only) and the Classes page, which hides the create control from instructors. The user may overrule it before Phase 1 is committed.
- On a class's pages, the instructors of that class may use Enrolment and Class email. Class feature flags and Class MCP settings are admin-only. The other class pages stay I, A.
- An instructor who reaches an admin-only page should see a no-permission state: not be signed out, and not be sent back with a browser `alert()`. The admin sidebar shows an instructor only the entries they may use.
- On the student pages, instructors and admins get two controls that students do not: the top bar's view switch and the chat panel's Experiment row (confirmed by the user on same-scale screenshots).

Where today's route guards differ, the difference is a defect, recorded as such and not verified as a supported row:
- **B1:** the `/admin` layout route has no role guard, so students can reach some admin pages.
- **AdminProtectedRoute admits instructors** on pages listed here as admin-only.
- **An instructor on an admin-only page is signed out or bounced:** the backend refuses with 401, which the frontend treats as an expired session (B2); Analytics instead shows an `alert()` and redirects to the class list.
- **Instructors of a class are refused on Enrolment and Class email:** `ProfGuard` needs a professor enrolment, which assigning an instructor does not create.

The exact per-page outcome under today's guards is recorded next to the matrix as evidence for the fix.
