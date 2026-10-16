# Plan: Kiwi UI refresh — Stage 1 (visual and verbal layer)
**Created:** 2026-10-16
**Status:** ready
**Current Phase:** —
**Complexity:** complex (Full track)
**Research:** `.design-foundations/research/2026-10-16-kiwi-ui-visual-refresh.md` (confirmed brief, G1–G15) · `.design-foundations/research/2026-10-16-kiwi-ui-tour.md` (current-state tour)
**Entry stage:** Discover — no `DESIGN.md` or `JOURNEY.md` exists yet. Discover here covers **as-is page specs only**; JTBD, IA and flow redesign belong to Stage 2.

---

## Context

**Problem:** Design Stage 1 of the `kiwi-ui` redesign — the visual and verbal layer. That means:
- a brand design system derived from the Kiwi mascot's hue family, in light and dark;
- the tutor mascot's states and motion;
- a voice-and-tone guide and a route-by-route copy review.

Students should read long AI answers comfortably and focus, and the product should be recognisable as Kiwi at a glance. Page structure, routes and navigation do not change.

**Success:**
- `kiwi-ui/DESIGN.md` is locked with light and dark OKLCH ramps; every text/background pair passes WCAG AA, interactive boundaries pass 3:1, and functional colours stay separate from primary (G1).
- The type scale, two density modes and component specs exist.
- The mascot's state machine, motion budget, placements and asset budget are specified.
- The voice guide, per-route copy revisions and email templates are written.
- The chart palette and encoding rules are written.
- The six named screens are mocked in light and dark, review finds no Critical issues, and the user signs off.

**This plan produces design artifacts only:**
- `kiwi-ui/DESIGN.md`;
- `kiwi-ui/JOURNEY.md`;
- component, companion, copy and chart specs;
- mocks under `.design-foundations/mocks/`.

It does not change `kiwi-ui` code. Implementing the result is a separate implementation plan after `build`: the token module, migrating ~350 raw colour values, porting the mascot library, and tests.

## Constraints

From the confirmed brief; G-numbers point to its Grill decisions.

- **Hue family pinned, values not (G11):**
  - the mascot family — forest `#234631`, sage `#92ae70`, cream `#f5f4e8`, tan `#ccbd99`;
  - Material Design 2014 purple is retired everywhere, including emails and charts.
- **Type:**
  - Montserrat only inside `KiwiWordmark` (G6);
  - one humanist sans family for headings and body (G15);
  - system CJK stack, in order: `"PingFang SC"`, `"Hiragino Sans GB"`, `"Microsoft YaHei"`, `"Noto Sans CJK SC"`, `sans-serif` (G7).
- **Modes:**
  - light and dark are both deliverables; dark ships behind `VITE_ENABLE_DARK_MODE` (G3), mascot motion behind `VITE_ENABLE_MASCOT_MOTION` (G14);
  - paper (PDF pages, email previews, Kiwi App iframes) stays light in dark mode (G5).
- **Semantics:**
  - primary only on interactive controls; success only on status surfaces, always with an icon and a label; in-progress states are neutral (G1);
  - institution logos are neutral black or white by surface (G2).
- **Density and width:**
  - comfortable for student, auth and reading surfaces; compact for `/admin/*` and tool chrome;
  - verified at 1280×800 and 1440×900; student and auth routes also at 390×844 as a no-regression check (G13).
- **Platform:**
  - frontend-only;
  - every asset self-hosted (mainland-China networks);
  - MUI + Emotion stays;
  - nothing institution-specific is hardcoded (`src/config/branding.ts`).
- **Brand ownership:** the product leads the brand; `kiwi-website` is a reference, not a source (G10).
- **Boundary:** no moving page regions, no navigation changes, no new routes. Allowed element changes are listed in the brief's "Stage 1 boundary".

## Chosen Approach

Seven phases, one gating artifact each:
1. **Phase 1** writes as-is page specs and the verification matrix into `kiwi-ui/JOURNEY.md`. Stage 1 changes no flows, so Discover documents rather than redesigns.
2. **Phase 2** runs the DNA pipeline inside the brief's pins and locks `kiwi-ui/DESIGN.md`. Type and colour are part of the lock, not a later phase.
3. **Phase 3** turns the DNA into the token machine and component specs.
4. **Phases 4, 5 and 6**, in that order, specify the companion, the words and the data surfaces. Words come after the companion so that every user-facing string passes one voice, including the companion's state text and the chart summaries.
5. **Phase 7** composes the six named screens for sign-off.

**User decisions inside `build`.** The build agent cannot prompt the user. Phase 2 (pick and lock) and Phase 7 (sign-off) each make one expected round-trip:
1. The agent returns `UPDATE_PLAN` with the candidates (or the mocks).
2. The orchestrator presents them to the user.
3. It records the decision in the Decision Log (and, for Phase 2, in `DESIGN.md`'s Pins line).
4. It re-dispatches with the decision as a constraint.

### Artifact root (splice into every BUILD, REVIEW and mock dispatch)

The plugin's agents and the `prototype` skill default to the project root. This plan overrides that:

| Plugin default | This plan |
|---|---|
| `DESIGN.md` | `kiwi-ui/DESIGN.md` |
| `JOURNEY.md` | `kiwi-ui/JOURNEY.md` |
| `mocks/<page>.html` | `.design-foundations/mocks/<page>.html` |
| `./used-dna.json` (dealer ledger) | `.design-foundations/used-dna.json` |

**How the orchestrator applies the override:**
- In both the BUILD and the REVIEW dispatch templates, it replaces the line "DESIGN.md / JOURNEY.md at the project root if present" with the two `kiwi-ui/` paths.
- Each BUILD dispatch's Produces names `.design-foundations/mocks/<page>.html`. The `prototype` skill has no output-directory parameter; its default write path `mocks/` resolves there through the root `mocks` link (setup step 0 below).

**Styled mocks:** from the Phase 2 lock on, mocks are styled. A wireframe fallback in Phase 7, or in any later styled-mock dispatch, is a gate failure.

**The pre-build mock:** the `/design-for-ai:mock` checkpoint is a wireframe with a generic page skeleton by design. Neither `DESIGN.md` nor `JOURNEY.md` exists yet, so both "missing gate" flags are expected.

**Pixel sign-offs:** the Phase 2 lock, made on a rendered swatch sheet, and Phase 7.

**Reading "missing at root" results.** `build`'s final VERIFY and any standalone `/design-for-ai:mock` run look at the repository root. Before the links exist (the pre-build mock), "missing at root" is expected. After them, a "missing at root" result means the link setup failed.

**Required setup by the orchestrator: root symlinks.** The build agent's own protocol and the `prototype` skill also hardcode the project root, so splicing the dispatch templates alone is not enough. Create the links in whichever checkout runs the step; `build` itself runs in a worktree.

0. Before the pre-build mock run: `mkdir -p .design-foundations/mocks`, then link `mocks → .design-foundations/mocks`. The target exists from the start, so no timing gate applies. `prototype`'s default path and `build`'s VERIFY (`mocks/<page>.html`) then both resolve into `.design-foundations/mocks/`.
1. After Phase 1 completes, create `JOURNEY.md → kiwi-ui/JOURNEY.md`.
2. After the Phase 2 lock, create `DESIGN.md → kiwi-ui/DESIGN.md`.
3. Add `mocks`, `JOURNEY.md` and `DESIGN.md` to `.git/info/exclude` (not `.gitignore`), so `build`'s `git add .` never commits them. The exclude file lives in the common git dir, so one entry covers every worktree.
4. Delete all three links after `build`.

Never create a link before its target exists: a dangling link would read as "present".

**After `build`,** a separate implementation plan carries the result into code: the token module, the ~350 raw colours, porting the mascot, the copy and its tests, and the axe-core and contrast checks from the brief's done-when list.

## Rejected Approaches

- **A separate "type + colour" phase after DNA.** It would rewrite a locked `DESIGN.md`. The pins already narrow the choice enough to lock both together.
- **Full Discover (JTBD, IA, flows) now.** That is Stage 2. Doing it here would invite layout changes Stage 1 rules out.
- **Implementation phases inside this plan.** The plugin's `build` produces design artifacts. Code needs an engineering plan with tests.
- **Inheriting the `kiwi-website` tokens.** The user chose product-led branding (G10).
- **Mocking every route.** Six representative screens plus the page specs carry the system. Mocking ~35 pages would cost far more without changing the decisions.
- **Pinning an aesthetic family.** Only hue and chroma are user law. The family is dealt and critiqued, so the model doesn't drift to its default.

## Assumptions

- The UI stays English (brief G12).
- Students mostly use laptops; phones are a no-regression check (G13).
- The preview stack (this repo's UI on :3002 against the older `ics-kiwi-app` backend) is good enough for visual reference. It is not a target.
- The `kiwi-icon` mascot assets can be ported. They belong to the user's organisation, and the branch records their provenance.
- An OFL-licensed humanist sans exists that meets the Phase 2 type constraints.
- `build` runs in a worktree or feature branch (a plugin invariant). The working tree currently holds untracked design files.
- The build can clone `NYUSH-ML/kiwi-ui` to export the mascot stills. It is not a remote of this repository, whose origin is `MAPS-research/kiwi`. Otherwise the user fetches the `kiwi-icon` branch (commit `fbb4db8`) before Phase 4.

## Decision Log

| Decision | Reason |
|---|---|
| User approved the plan as presented (2026-10-16): "就先这样看看效果" — proceed to the pre-build mock checkpoint | Approval at PRESENT; Status set to `ready` |
| Mock checkpoint approved by the user (2026-10-16): "批准，开始 build" | Wireframe review PASS (0 Critical, 1 Major carried to Phases 3/5); swap-an-axis not applicable at wireframe fidelity |
| DNA, type and colour are one phase | Avoids changing `DESIGN.md` after it is locked; the pins leave little open |
| JOURNEY.md is as-is only | No flows change in Stage 1; JTBD and IA would be theatre without Stage 2 research |
| Companion is its own phase, after the design system | It needs the avatar surface and the Display menu from Phase 3, and its doctrine (ai-native, motion, behavioral) differs |
| Words run after the companion (Phase 5 depends on Phases 1–4; Phase 6 on Phases 1, 2, 3, 5) | New copy covers the Phase 3 Display menu and the Phase 4 mascot surfaces. Phase 5 also revises Phase 4's state text in place, and Phase 6's chart summaries follow the voice guide, so every user-facing string passes one voice (CHECK 2, F1) |
| User decisions go through the orchestrator | The build agent can't prompt; Phases 2 and 7 each make one expected `UPDATE_PLAN` round-trip (CHECK 2, F2) |
| Phase 4 is Full and runs on fable | Its review covers ethics, ai-native and two-mode contrast across a new cross-surface seam; a haiku reviewer is too weak (CHECK 2, F4) |
| Later token sections register into reserved namespaces | `chart.*` and `companion.*` keep the one-source machine whole without editing the locked `## Design system` (CHECK 2, F5) |
| Email colour mapping belongs to Phase 3 | It is where the allowlist is written; Phase 5 keeps only the email copy (CHECK 2, F6) |
| The Phase 2 lock is made on a rendered swatch sheet | A law-once-locked artifact should be confirmed on pixels (both ramps, functional colours, a type specimen with CJK), not on hex lists (CHECK 3, F7) |
| Phase 2 also loads `motion` | The UI-wide, non-mascot motion budget is set and locked here (CHECK 3, F1) |
| Functional colours come from a second `palette.mjs` run with `--chroma balanced` | `palette.mjs` builds functional ramps with the same chroma multiplier as the accent (muted = 0.45×), so the main run can never make success more chromatic than primary (G1). Its contrast report also omits functional pairs, which are therefore checked on the swatch sheet (CHECK 4, F1) |
| Phase 4 exports the mascot stills | The source commit is not reachable from this repository, and porting is implementation work; the mocks still need real frames (CHECK 4, F2) |
| `palette.mjs`'s semantic aliases are carried into the DTCG tier byte-equal; new semantic tokens go to `semantic.*` | The aliases are part of the locked block, so Phase 3 re-expresses rather than re-resolves them (CHECK 4, F3) |
| Phase 6 is Full; Phase 5 stays Standard | Phase 6 registers a new token namespace consumed by Phase 7 (a new seam). Phase 5 adds no tokens, and its copy is re-checked in context by Phase 7 (CHECK 4, F5) |
| Dealer runs with `--project kiwi-ui --date 2026-10-16 --used .design-foundations/used-dna.json` | The deal is a pure function of project, date, reroll and pins; fixing them makes it reproducible, and the ledger stays out of the repository root (CHECK 4, F6) |
| Brief OQ2 → Phase 6, OQ3 and OQ4 → Phase 3 | The brief said "design-DNA step"; each question moved to the phase whose doctrine owns it (CHECK 4, note) |
| Mascot slot sizes are `companion.slot.*` tokens registered by Phase 4 | G9 fixes only the 32 px avatar. Phase 3 references the slots by name and fixes the surrounding surface, so Phase 4 can size them without editing the locked `## Design system` (CHECK 5, F2) |
| Phase bodies exceed the template's ~250 words | Full track: each body carries brief-specific constraints the dispatched agents need verbatim; trimming them would move law into prose the agents never receive (CHECK 5, F6) |
| Phase 6 runs on fable; Phase 5 stays on sonnet | Phase 6's review judges colour-blind distinguishability and should run on sonnet, not haiku. Phase 5's review checks copy against an explicit voice guide and revision index, and Phase 7's review re-checks all copy in context (DW-7.7), so a haiku review there is accepted (CHECK 3, F10) |
| Dealer pins are `hue=156` and `chroma=muted` | Measured OKLCH hue of mascot forest; "quiet" maps to muted chroma |
| Raw-colour policy is phrased as token coverage | The plugin's done-when vocabulary is design-side; the enforcing check belongs to the implementation plan |
| The test impact of copy changes is an edge case, not a done-when | It is an implementation concern; the revision index is the design-side hand-off |
| Compact-width done-when is checked at 1280 px; ~960 px is design intent | G13 fixed the verification viewports; a done-when must be observable at a rendered width (CHECK finding 2) |
| Phase 3 owns the KPI tile and table components; Phase 6 owns data encoding only | Tables as a UI pattern belong to usability; data-viz stays with encoding, so a Phase 6 review can't contradict a committed Phase 3 spec (CHECK finding 3) |
| Phase 4 also loads `deceptive-patterns` | Its no-confirmshaming / no-nagging constraint is that doctrine's territory (CHECK finding 1) |
| Phase 7 runs on fable | REVIEW drops one tier below BUILD; the sign-off review should run on sonnet, not haiku (CHECK finding 5) |
| Artifacts stay in `kiwi-ui/`, with an explicit Artifact-root override | The user chose `kiwi-ui/`; the plugin's root default is overridden in every dispatch rather than relocating the files (CHECK finding 4) |

## Implementation Phases

### Phase 1: As-is page specs and verification matrix
**Stage:** Discover
**Model:** sonnet
**Doctrine:** journey, usability
**Gate:** Standard

**Goal:** Record every existing route as it stands, plus the matrix that later phases and the implementation verify against.

**Scope:**
- IN:
  - one page spec per route in `kiwi-ui/src/App.tsx` (~40 routes, ~35 pages), in the journey page-spec format: purpose, entry points, content blocks in order, states (empty / loading / error / success), primary CTA, exit;
  - per page: roles (from the route guards), density (comfortable / compact), and paper surfaces (G5);
  - the current route map, recorded as-is;
  - tour defects that fall inside the Stage 1 boundary.
- OUT:
  - JTBD, journey map, IA validation, flow redesign (Stage 2);
  - the content of embedded Kiwi Apps (only the host frame is specified).

**Constraints:**
- The JOURNEY.md sections Job, Journey, IA and Flows each state "deferred to Stage 2" and why.
- IA holds the current route map, flagged unvalidated: a sitemap is not an IA (Rosenfeld/Morville).
- No journey map is drawn without an owner and a research basis (journey-map theater).

**Edge cases:**
- Redirect-only routes (`/admin` → `classes`, `batch-upload` → `manage-materials`, `/logout`) are listed as redirects, not pages.
- States the demo data cannot show (empty webhook approvals, errors) are taken from source code and marked "not observed live".
- B1 (`/admin/*` admits any signed-in user) is recorded as the guard behaviour today. It is flagged, not designed around.

**Produces:** `kiwi-ui/JOURNEY.md` — `## Page specs` (as-is) and `## Verification matrix`
**Depends on:** research docs | **Unlocks:** Phases 2, 3, 4, 5, 6, 7

**Done when:**
- [ ] DW-1.1: `kiwi-ui/JOURNEY.md` exists, and `## Page specs` has a complete entry (purpose, entry points, content blocks, states, primary CTA, exit) for every route in the brief's Appendix A. Redirect-only routes are listed as redirects.
- [ ] DW-1.2: Every page entry names its roles (as Appendix A records them), its density and its paper surfaces.
- [ ] DW-1.3: `## Verification matrix` enumerates route × role × state × mode × viewport per G13: 1280 and 1440 for every route; 390 for student and auth routes.
- [ ] DW-1.4: Job, Journey, IA and Flows each carry a "deferred to Stage 2" note. IA records the current route map, marked unvalidated.
- [ ] DW-1.5: Each tour defect inside the Stage 1 boundary is attached to its page entry, with its Nielsen heuristic and a 0–4 severity.
- [ ] DW-1.6: The design-review-agent cross-pillar synthesis returns no Critical findings; Major findings are resolved or explicitly accepted.

### Phase 2: Design DNA and light/dark tokens
**Stage:** Design
**Model:** fable
**Doctrine:** design-dna, archetypes, foundations, color, fonts, motion, ai-tells
**Gate:** Full

**Goal:** Run ground → diverge → critique → converge inside the pins, then lock `kiwi-ui/DESIGN.md` with the light and dark token block, the type scale and the motion budget.

**Scope:**
- IN:
  - five candidates (dealer hands);
  - the user's pick or synthesis;
  - OKLCH ramps for both modes via `palette.mjs`;
  - functional colours;
  - the UI type family and scale;
  - space, shape and depth;
  - the non-mascot motion budget;
  - the signature move;
  - the "Never" list.
- OUT: component specs (Phase 3), mascot motion (Phase 4), the chart palette (Phase 6).

**Constraints:**
- **Taste signals, verbatim from the brief:**
  - Hue family (pinned), not exact values (G11): the mascot family — forest `#234631`, sage `#92ae70`, cream `#f5f4e8`, tan `#ccbd99`. UI tokens are OKLCH ramps derived from these hues; roles are assigned per mode (forest-led in light, sage-led in dark is the expected outcome).
  - Banned: Material Design 2014 purple anywhere in the UI or emails; purple/pink chart series.
  - Brand type (pinned): Montserrat, only inside the `KiwiWordmark` component (G6).
  - UI type (class pinned, face open): one humanist sans family for headings and body (G6, G15); reading-first; pairs with the CJK stack.
  - Feel (pinned): a quiet academic shell with one living companion.
  - Modes (pinned): light and dark are both Stage 1 deliverables; dark is released behind a build switch (G3).
  - Density (pinned): comfortable for student, auth and reading surfaces; compact for admin and tool chrome.
- **Dealer call:** `--project kiwi-ui --date 2026-10-16 --used .design-foundations/used-dna.json --pin hue=156 --pin chroma=muted`. Hue 156 is mascot forest measured in OKLCH. Re-deals change only `--reroll`.
- **Functional colours:** the main `palette.mjs` run builds functional ramps at the same muted chroma as the accent, so it cannot meet G1. A second run (same `--seed`, `--chroma balanced`) supplies `--error/success/warning/info-3/9/11`, spliced into the block. Both commands are recorded in `## Color tokens` as the regeneration procedure: "re-run `palette.mjs`" means re-running both.
- **Archetype:** Sage primary, Caregiver secondary.
- **Register:** the structure register is calm. The expressive moments are the companion in chat, sign-in, and empty or not-found states.
- **Neutrals** are tinted toward cream/tan (h≈90–105), not toward forest.
- **The UI face** has authentic weights and italics and tabular numerals, is self-hostable under OFL, and is not on the plugin's overused list.
- **The pick and the lock are the user's.** The agent returns `UPDATE_PLAN` with the five spec blocks and their critique verdicts. The orchestrator presents them, records the pick and any converge-time swaps, and re-dispatches with the pick as a constraint.

**Edge cases:**
- A dealt family that cannot serve the pinned feel is re-dealt on the record (`--reroll`), never overridden.
- `palette.mjs` exit 2 means a pair fails: read its stdout and fix the pair; never lock a failing one.
- Dark mode must not slide into the dark + acid-green cluster: surfaces are warm-tinted, not `#0a0a0a`–`#1a1a1a`, and sage stays muted.
- A cream canvas must not form the cream + serif + terracotta cluster.

**Produces:** `kiwi-ui/DESIGN.md` (locked); the swatch sheet `.design-foundations/mocks/swatch-sheet.html`
**Depends on:** Phase 1 | **Unlocks:** Phases 3, 4, 5, 6, 7

**Done when:**
- [ ] DW-2.1: Five candidates are presented, each with its GROUNDING (two references; ten distinct across the set), its dealer hand and a critique verdict. The user picks or synthesizes.
- [ ] DW-2.2: `kiwi-ui/DESIGN.md` is locked: the token block is present for light and dark, and the user has confirmed the direction on a rendered swatch sheet, not on hex values alone. The sheet is a self-contained `.html` under `.design-foundations/mocks/` showing both ramps, the functional colours, and a type specimen with the CJK stack.
- [ ] DW-2.3: All text/background pairs pass WCAG AA (≥4.5:1 body, ≥3:1 large), and interactive elements pass AA non-text (≥3:1). Dark and light ramps both pass, verified via `palette.mjs`. Functional text pairs (each `--{error|success|warning|info}-11` on `--neutral-2` and on its own `-3`) are absent from `palette.mjs`'s report; they are computed explicitly and shown on the swatch sheet.
- [ ] DW-2.4: Functional colours (`--error/success/warning/info-*`) are defined at the 3/9/11 ramp levels. `--success-9` has higher OKLCH chroma than `--accent-9` in both modes (G1), with the values and the hue offset recorded.
- [ ] DW-2.5: The type scale `--text-xs`…`--text-4xl` is present. It names one humanist sans and the leading for Latin and for CJK-dominant blocks, and includes the G7 CJK stack.
- [ ] DW-2.6: "Never" lists this DNA's at-risk tells: nested cards, the purple triplet, the dark + acid-green cluster, decorative gradients, and sparkle-as-AI icons.
- [ ] DW-2.7: The design-review-agent cross-pillar synthesis returns no Critical findings; Major findings are resolved or explicitly accepted.
- [ ] DW-2.8: `kiwi-ui/DESIGN.md` carries every design-dna template section, filled and with no placeholders:
  - Direction: Sage primary / Caregiver secondary, the calm structure register, the three expressive moments;
  - Signature move;
  - Space, shape and depth: hue-shifted shadows, no pure black;
  - Motion: the non-mascot budget — timing range, easing character, what moves and what never moves.

### Phase 3: Design system
**Stage:** Design
**Model:** fable
**Doctrine:** design-systems, usability, interaction, responsive
**Gate:** Full

**Goal:** Turn the locked DNA into a token machine for MUI and the public CSS, and specify every shared component in both densities and both modes.

**Scope:**
- IN:
  - **Token tiers:** global (from `palette.mjs`) → semantic → component, in W3C DTCG format.
  - **Generation spec:** one source → the MUI theme (light/dark × comfortable/compact) and `public/kiwi-design-tokens.css` (light, names kept, G5).
  - **Density map:** which route area uses which density, per JOURNEY.md.
  - **Component specs:**
    - buttons (primary / secondary / tertiary / destructive) and icon buttons;
    - chips (status / filter / role);
    - switches; inputs, selects and textareas;
    - tabs; sidebar items; panels (no nested cards); dialogs; alerts and toasts;
    - tables and DataGrid; KPI tiles;
    - the empty-state frame;
    - the Display menu;
    - the floating chat launcher (size, elevation, resting offset);
    - the tutor-message surface.
  - **Code surfaces:** Ace and syntax-highlight themes (brief OQ3).
  - **Icon policy:** KiwiIcons vs Material (brief OQ4).
  - **Raw-colour guard rules and allowlist,** including the token mapping for allowlisted surfaces: the outgoing email templates' literal colours, with no purple.
  - **Governance:** owner; contribution through a PR plus an update to `kiwi-ui/.storybook/design-system/catalog.json`; versioning; deprecation.
- OUT: mascot behaviour (Phase 4), copy (Phase 5), chart tokens (Phase 6).

**Constraints:**
- Extend, never replace: global values change only by re-running `palette.mjs`.
- At most one filled primary per view region.
- Switches, chips and KPI icons each follow one colour rule.
- Status green appears only on status surfaces (G1).
- Focus is `:focus-visible`, 2px or more, ≥3:1, with a 2px offset.
- Compact density has no multi-line buttons and no three-line cells at the 1280 verification viewport (G13). Holding down to ~960 px is design intent, met with container queries and truncation rules, never by moving regions.
- Touch targets are 44×44 on coarse pointers for student routes.
- This phase owns the KPI tile and table components: states, tokens, minimum column widths, truncation and button wrapping. Phase 6 applies them and owns only data encoding.
- `palette.mjs`'s semantic aliases are part of the locked block. This phase carries them into the DTCG semantic tier unchanged; it does not re-resolve them.
- The DTCG source reserves three namespaces as extension points:
  - `semantic.*` — new semantic tokens added by this phase (density deltas, focus ring, …);
  - `chart.*` and `companion.*` — tokens that Phases 4 and 6 register, without editing `## Design system`.
- **Mascot slots:** the message avatar is 32 px (G9). The launcher, composer-peek, sign-in, empty-state and not-found slots are sized by `companion.slot.*` tokens. This phase references them by name and Phase 4 registers them; this phase fixes only the surrounding surface (elevation, offset, padding).

**Edge cases:**
- Third-party surfaces get explicit token mappings: Ace, the react-pdf toolbar, DataGrid.
- Disabled controls state why they are disabled.
- Public-CSS tokens from the purple era are deprecated, not deleted.
- Inputs are `kiwi-ui/DESIGN.md` (locked) and `kiwi-ui/JOURNEY.md`. A discovery or review that reports them absent at the repository root is a gate violation (see Artifact root), not a missing prerequisite.

**Produces:** `kiwi-ui/DESIGN.md` — `## Design system`
**Depends on:** Phases 1, 2 | **Unlocks:** Phases 4, 5, 6, 7

**Done when:**
- [ ] DW-3.1: In both modes:
  - the `palette.mjs` semantic aliases in the locked block (`--background`, `--surface`, `--text`, `--accent-solid`, …) are carried into the DTCG semantic tier with identical values;
  - additional semantic tokens are registered under `semantic.*`;
  - component tokens exist for every listed component.
- [ ] DW-3.2: Every listed component specifies all 8 states (default, hover, focus, active, disabled, loading, error, success) in both densities and both modes.
- [ ] DW-3.3: In every component state, text pairs pass WCAG AA and interactive elements pass AA non-text (≥3:1), in both modes, verified via `palette.mjs` alias inspection.
- [ ] DW-3.4: The generation spec maps one DTCG source to the MUI theme and to `public/kiwi-design-tokens.css`, including the deprecation list.
- [ ] DW-3.5: Editor and syntax themes are specified for both modes from the same tokens, and the icon policy decides KiwiIcons vs Material per use.
- [ ] DW-3.6: The token-coverage rules name the colour forms allowed only inside the token source, and each allowlisted surface with its reason (mascot art, email templates). The email templates' literal colours are mapped to tokens, with no purple.
- [ ] DW-3.7: Governance names an owner, a contribution path, versioning and deprecation.
- [ ] DW-3.8: The design-review-agent cross-pillar synthesis returns no Critical findings; Major findings are resolved or explicitly accepted.
- [ ] DW-3.9: Both density modes are defined as semantic-tier token deltas (space scale, control height, type size, row height) in both colour modes. The density map assigns every JOURNEY.md route area to exactly one density, consistent with DW-1.2.

### Phase 4: Companion — the tutor mascot
**Stage:** Design
**Model:** fable
**Doctrine:** ai-native, motion, behavioral, deceptive-patterns, usability
**Gate:** Full

**Goal:** Specify the tutor companion as an honest, calm reflection of system state: its states, motion rules, placements, controls and asset budget.

**Scope:**
- IN:
  - **State machine:** the 9 chat states from G9, each with trigger, exit, duration, interruption/reversal rule and text equivalent.
  - **Rules:** one mover; still poses; dark-mode backing.
  - **Placements:** tutor avatar, composer peek, sign-in, empty states (including the class-card fallback), not-found and error pages.
  - **Motion-control precedence.**
  - **Asset budget and port inventory** (runtime assets only, from `NYUSH-ML/kiwi-ui@fbb4db8`).
  - **Stills export:** one still frame per G9 state, plus the measured byte sizes of the 8 runtime atlases. Exported from `NYUSH-ML/kiwi-ui@fbb4db8` into `.design-foundations/mocks/assets/mascot/`, with a provenance note (repo, commit, source path).
- OUT: building the components (implementation plan); chat layout changes (Stage 2).

**Constraints:**
- A clip ships only if it communicates a state change.
- No `walk` while answer text is on screen.
- Celebrations are one-shot and limited to completion (`hop`) and a like (`heart`).
- No streaks, nagging or "sad when you leave" states: engagement, not compulsion (behavioral; confirmshaming is a deceptive pattern).
- The companion never signals more confidence than the system has (ai-native: calibrate).
- Mascot art keeps its exact colours (G11).
- Rollout follows G14.

**Edge cases:**
- Generation stopped by the student → back to `idle`, no `hop`.
- Error mid-stream → `error`, no `hop`.
- Rapid consecutive answers → hops do not stack.
- Flapping offline signal → hysteresis before switching to `offline`.
- Student typing while an answer streams → peek suppressed (one mover).
- 390 px → sizes per placement.
- Screen readers → the mascot is `aria-hidden`; text carries state.
- The state text equivalents written here are drafts. Phase 5 revises them in place for voice (see Lock scope).
- Inputs are `kiwi-ui/DESIGN.md` (locked) and `kiwi-ui/JOURNEY.md`. A discovery or review that reports them absent at the repository root is a gate violation (see Artifact root), not a missing prerequisite.

**Produces:** `kiwi-ui/DESIGN.md` — `## Companion`, registering `companion.slot.*` and `companion.backing`; mascot placements annotated in `kiwi-ui/JOURNEY.md` page specs; stills and provenance in `.design-foundations/mocks/assets/mascot/`
**Depends on:** Phases 1, 2, 3 | **Unlocks:** Phases 5, 7

**Done when:**
- [ ] DW-4.1: The state table covers all 9 chat states with trigger, exit, duration, interruption rule and text equivalent.
- [ ] DW-4.2: Every page where the mascot appears lists the placement and size in its JOURNEY.md page spec.
- [ ] DW-4.3: The motion precedence (deployment flag > `prefers-reduced-motion` > Display-menu switch) is specified, and so is the still pose for every state. So is the one-mover rule: only the newest tutor message's avatar animates, older avatars hold their still pose, and the composer peek is suppressed while an answer streams.
- [ ] DW-4.4: The mascot outline passes AA non-text (≥3:1) against its backing in both modes; the backing token is registered per the Phase 3 extension rule. The mascot is decorative to assistive technology and never the only signal.
- [ ] DW-4.5: The asset budget gives the atlas cell size per placement, which atlases are present at each state, and ≤300 KB of mascot images before the first answer completes.
  - The port inventory lists only runtime assets, with sizes measured from the source.
  - One still per state exists in `.design-foundations/mocks/assets/mascot/` with its provenance note.
- [ ] DW-4.6: Principle-derived claims are marked (ai-native has no settled canon). An ethics pass finds no confirmshaming, nagging or false-urgency mechanic (Brignull categories), and states each reaction's honest purpose.
- [ ] DW-4.7: The design-review-agent cross-pillar synthesis returns no Critical findings; Major findings are resolved or explicitly accepted.

### Phase 5: Words
**Stage:** Design
**Model:** sonnet
**Doctrine:** content-design, usability
**Gate:** Standard

**Goal:** Write the voice-and-tone system and the microcopy rules, then apply them to every route, the new copy and the outgoing email templates.

**Scope:**
- IN:
  - **Voice:** 3–5 voice attributes per audience (students; instructors and admins), each with in-range and out-of-range examples.
  - **Tone map:** error, success, empty, waiting, sign-in, destructive confirmation.
  - **Microcopy rules:**
    - sentence case for headings and buttons; no all-caps buttons;
    - the error formula;
    - one English date/time format;
    - a terminology list: sidebar label = page title; "allowlist", not "whitelist"; "Kiwi", not "Kiwi Platform".
  - **Per-route revisions** in JOURNEY.md page specs.
  - **New copy:** Display menu, mascot empty states, not-found page, sign-in tagline.
  - **Companion state text:** the Phase 4 text equivalents, revised in place.
  - **Email templates:** copy only (their colours are mapped in Phase 3).
- OUT:
  - the tutor's generated answers and class instructions;
  - translation (the UI stays English);
  - code changes.

**Constraints:**
- Errors state what happened → why → how to fix. They never blame the user and never dead-end (Yifrah).
- Plain language, key information first (Redish).
- Voice stays stable; tone follows context (Podmajersky).
- No hype, no exclamation marks, no claims about AI the product can't back.
- Destructive actions state their consequence first.
- Institution names come only from branding config.

**Edge cases:**
- ~529 text-based test queries rely on today's strings. The revision index lets the implementation plan change copy and tests together.
- Raw backend messages shown to users get a wrapping rule.
- Dates ignore the browser locale.
- Copy inside embedded apps is out of scope.
- Inputs are `kiwi-ui/DESIGN.md` (locked) and `kiwi-ui/JOURNEY.md`. A discovery or review that reports them absent at the repository root is a gate violation (see Artifact root), not a missing prerequisite.

**Produces:** `kiwi-ui/DESIGN.md` — `## Voice and tone` and the revised text-equivalent column of `## Companion`; revised microcopy and a revision index in `kiwi-ui/JOURNEY.md`
**Depends on:** Phases 1, 2, 3, 4 | **Unlocks:** Phases 6, 7

**Done when:**
- [ ] DW-5.1: `## Voice and tone` defines the voice attributes, with in-range and out-of-range examples, for both audiences, plus the tone map for all six moments.
- [ ] DW-5.2: Every route's page spec carries its revised microcopy (old → new, a one-line rationale citing the principle), or "no change" with a reason.
- [ ] DW-5.3: The case, button, date-format and terminology rules are written and applied in every page spec.
- [ ] DW-5.4: Every error message in the page specs follows what happened → why → how to fix.
- [ ] DW-5.5: New copy exists for the Display menu, mascot empty states, not-found page and sign-in. The companion's state text and the email templates carry revised copy.
- [ ] DW-5.6: The revision index lists every changed string by route, old text and new text.
- [ ] DW-5.7: The design-review-agent cross-pillar synthesis returns no Critical findings; Major findings are resolved or explicitly accepted.

### Phase 6: Data surfaces
**Stage:** Design
**Model:** fable
**Doctrine:** data-viz, usability
**Gate:** Full

**Goal:** Specify how Kiwi's analytics and admin data surfaces encode data truthfully in the new system: the chart palette, the encoding rules, and how the Phase 3 KPI tile and table components are applied to data.

**Scope:**
- IN:
  - **Chart palette:** five categorical series (plus sequential if a view needs it), derived from the tokens, for both modes (brief OQ2).
  - **Encoding rules.**
  - **Applying the Phase 3 components:**
    - the KPI tile on Class Analytics and System Analytics;
    - the table component on every admin table — numeric formatting, units, which columns truncate.
  - **Analytics colour unification:** Class Analytics intent/topic views; System Analytics.
  - **A text summary** for each chart.
- OUT:
  - the KPI tile and table components themselves (Phase 3);
  - new charts or metrics;
  - layout changes to dashboards (Stage 2).

**Constraints:**
- Maximise data-ink (Tufte).
- One preattentive attribute per encoding (Knaflic).
- Colour is never the only encoding (colour-blind safety).
- Position on a common scale is preferred (Cleveland & McGill).
- Every KPI carries a baseline or trend, or states that it has none (Few).
- Bar axes start at zero, and the time range is stated (Cairo).
- Chart text summaries follow `## Voice and tone` (Phase 5).
- Chart tokens are registered under `chart.*` per the Phase 3 extension rule.

**Edge cases:**
- Counts of people use integer ticks.
- Daily series render as bars or unsmoothed lines, never smoothed curves with gradient fills (the tour's System Analytics finding).
- Empty or near-empty data in demo classes renders the empty state, not a flat chart.
- Dark mode keeps the categorical order and the contrast.
- Inputs are `kiwi-ui/DESIGN.md` (locked) and `kiwi-ui/JOURNEY.md`. A discovery or review that reports them absent at the repository root is a gate violation (see Artifact root), not a missing prerequisite.

**Produces:** a `## Chart tokens` section appended to `kiwi-ui/DESIGN.md`; chart and table specs in `kiwi-ui/JOURNEY.md` page specs; new strings (chart summaries, table units) appended to the Phase 5 revision index; the CVD swatch strip, which also goes into the Phase 7 sign-off materials
**Depends on:** Phases 1, 2, 3, 5 | **Unlocks:** Phase 7

**Done when:**
- [ ] DW-6.1: `--chart-1`…`--chart-5` are defined for both modes at matched OKLCH lightness and registered per the Phase 3 extension rule, and every data mark is ≥3:1 against the plot background. Under deuteranopia and protanopia simulation (Coblis or Viz Palette) they stay distinguishable; the simulated swatch strip is included in the review report.
- [ ] DW-6.2: The encoding rules (integer ticks for counts, no smoothing or gradient fills, zero-based bars, units on axes, a stated time range) are applied in every chart spec.
- [ ] DW-6.3: The Phase 3 KPI tile is applied on Class Analytics and System Analytics, each with label, value, and a baseline or trend (or "none").
- [ ] DW-6.4: Categorical colour appears only for categories, and each analytics view uses one accent otherwise.
- [ ] DW-6.5: The Phase 3 table component is applied to every admin table in the page specs: right-aligned tabular numerals, units, and truncated cells that show the full text on hover and focus.
- [ ] DW-6.6: Every chart has a text summary specified.
- [ ] DW-6.7: The design-review-agent cross-pillar synthesis returns no Critical findings; Major findings are resolved or explicitly accepted.

### Phase 7: Final mocks and sign-off
**Stage:** Design
**Model:** fable
**Doctrine:** checklists, ai-tells, usability, responsive, content-design
**Gate:** Full

**Goal:** Compose the six named screens in light and dark from every spec, run dual-blind review, and get the user's sign-off that the interface and the mascot read as one product.

**Scope:**
- IN:
  - **Screens:** sign-in; course list; chat (every companion state, plus the Display menu); code page; one admin table page (Enroll Students); one admin form page (Edit Class).
  - **Renders:** each in light and dark (12 mocks), plus the four student/auth screens at 390×844 in light mode (dark ships behind the G3 flag).
  - **Review and sign-off:** screenshots, dual-blind review, the user's sign-off. The sign-off materials also include the Phase 2 swatch sheet and the Phase 6 chart swatch strip, because the six screens contain no analytics view.
- OUT: mocks for every other route (the implementation applies the system); interactive prototypes beyond the states shown.

**Constraints:**
- Mocks are self-contained `.html`, and every colour comes from the `kiwi-ui/DESIGN.md` token block.
- Copy is the Phase 5 copy, never placeholder text. Charts and tables follow Phase 6. Mascot frames are the stills Phase 4 exported to `.design-foundations/mocks/assets/mascot/`.
- "Self-contained" means no network dependencies. Sibling asset files under `.design-foundations/mocks/` are allowed.
- Montserrat appears only in the wordmark.
- Paper stays light in dark mode.
- Institution logos are neutral (G2).
- **The sign-off is the user's.** The agent returns `UPDATE_PLAN` with the mock and screenshot paths and the review report. The orchestrator presents them, records the sign-off (or the requested changes) in the Decision Log, and re-dispatches if changes are needed.

**Edge cases:**
- Motion can't be judged in a still. The chat mock shows each companion state as a frame strip, with the one-mover rule visible.
- Detector hits on deliberate choices are accepted only with a written rationale.
- The prototype step looks for `DESIGN.md` at the project root and falls back to greyscale wireframes when it finds none. It must be handed `kiwi-ui/DESIGN.md` explicitly (see Artifact root); a wireframe render fails DW-7.2.

**Produces:** `.design-foundations/mocks/` — 12 mocks + 4 phone-width renders, screenshots, review report
**Depends on:** Phases 1, 2, 3, 4, 5, 6 | **Unlocks:** the implementation plan

**Done when:**
- [ ] DW-7.1: The 12 mocks render as self-contained `.html` with no missing dependencies, and screenshots are captured.
- [ ] DW-7.2: No hard-coded hex appears in any of the 16 renders (12 mocks + 4 phone-width); every colour resolves to a `kiwi-ui/DESIGN.md` token.
- [ ] DW-7.3: The student/auth screens render at 390×844 with no horizontal scroll and ≥44px touch targets.
- [ ] DW-7.4: The chat mock shows every companion state from DW-4.1 and both groups of the Display menu.
- [ ] DW-7.5: The design-review-agent dual-blind synthesis (cross-pillar critique + `detect.mjs`) returns no Critical findings; Major findings are resolved or explicitly accepted.
- [ ] DW-7.6: The user signs off that, seen beside the mascot, the screens read as one product.
- [ ] DW-7.7: Across all 16 renders:
  - every string is either the as-is string from its page spec or its revised form in the revision index (no placeholder text);
  - Montserrat is set only inside the wordmark;
  - paper surfaces stay light in the dark mocks;
  - institution logos are neutral;
  - mascot frames are the stills Phase 4 exported.

**DAG:** the spine is 1 → 2 → 3 → 4 → 5 → 6 → 7, with additional edges 1 → {3, 4, 5, 6, 7}, 2 → {4, 5, 6, 7}, 3 → {5, 6, 7}, 4 → 7 and 5 → 7. Every phase's Depends on / Unlocks fields list its direct edges: artifact inputs, plus the Discover → Design ordering edge 1 → 2. Build runs one phase at a time, in order 1 → 7.
**Gates:**
- `kiwi-ui/JOURNEY.md` page specs (Phase 1) before any page-level design work.
- `kiwi-ui/DESIGN.md` locked before the later token and system work. Phase 2 generates the global token block and the `palette.mjs` semantic aliases. The lock comes before:
  - the DTCG re-expression, the additional semantic tokens and the component tier (Phase 3);
  - the design system;
  - styled mocks.
- **Lock scope:**
  - After the Phase 2 lock, the token block and the locked sections are read-only. Later phases only append new sections (`## Design system`, `## Companion`, `## Voice and tone`, `## Chart tokens`), and register tokens only in the `semantic.*`, `chart.*` and `companion.*` namespaces.
  - Carve-out 1: Phase 5 may revise the text-equivalent column of `## Companion`, and every such change lands in the revision index.
  - Carve-out 2: the Phase 2 swatch sheet is the lock's evidence — a token specimen, not a page mock — and is the one styled render permitted before the lock.
  - Changing a global value means re-running `palette.mjs` and re-confirming the lock.

## Verification Plan

**Verification level:** design execution evidence, as the plugin defines it:
- contrast via `palette.mjs`;
- render via `prototype`;
- token coverage;
- the heuristic pass (dual-blind review);
- the user's sign-off at the Phase 2 lock and at Phase 7.

| Phase | Done-when items | Evidence | Dirty / boundary case to exercise |
|---|---|---|---|
| 1 | DW-1.1 – 1.6 | Every route in Appendix A and in `kiwi-ui/src/App.tsx` (cross-check) maps to a page spec; matrix rows counted against G13; review report | A route missing from the specs fails DW-1.1; B1's guard behaviour is recorded as-is, not "fixed" in the spec |
| 2 | DW-2.1 – 2.8 | Dealer JSON (pins visible); `palette.mjs` contrast report for both modes; swatch sheet; user lock | `palette.mjs` exit 2 → the failing pair is fixed before lock; a dealt family that can't serve "quiet academic" is re-dealt on the record |
| 3 | DW-3.1 – 3.9 | Alias table; per-state contrast for each component in both modes; density deltas and map | A component state below 3:1 → token rejected; a nested panel in any spec is flagged |
| 4 | DW-4.1 – 4.7 | State table; precedence table; backing contrast; asset sizes | `walk` while text streams is a violation; with reduced motion, every state shows its still pose |
| 5 | DW-5.1 – 5.7 | Voice and tone section; per-route revisions; revision index | An error message without a fix is rejected; a changed string missing from the index fails DW-5.6 |
| 6 | DW-6.1 – 6.7 | Chart tokens with CVD simulation; chart and table specs | A data mark below 3:1 or indistinguishable under simulation → palette rejected; a smoothed daily series fails DW-6.2 |
| 7 | DW-7.1 – 7.7 | 12 mocks + 4 phone renders; detector output; review report; sign-off | A mock using a raw hex fails DW-7.2; horizontal scroll at 390 fails DW-7.3 |

**Gate checks across phases:**
- No Design page work starts before `kiwi-ui/JOURNEY.md` has page specs.
- No DTCG, additional-semantic or component token work, no system work and no styled mocks start before `kiwi-ui/DESIGN.md` is locked.
- A dispatch that looks for either file at the repository root, instead of `kiwi-ui/`, is a gate violation.

## Mock checkpoint findings (carry forward)

From the pre-build `/design-for-ai:mock` on 2026-10-16.
- **Fidelity:** wireframe (no `DESIGN.md`, no `JOURNEY.md`).
- **Pages:** student class page with chat (snap mode); admin Enroll Students.
- **Review:** PASS, 0 Critical. Report: `.design-foundations/build/2026-10-16-kiwi-ui-stage-1-mock-review.md`.
- **What it does not show:** this mock says nothing about colour or type. The first styled surfaces (the Phase 2 swatch sheet and Phase 7) must pass the full distinctiveness check.

| Finding | Severity | Carried to |
|---|---|---|
| "Remove Selected" looks identical to "Email Selected" and sits 8 px from it; the destructive style equals the secondary style | Major | Phase 3 (a distinct destructive variant, placement, undo or confirm); Phase 5 (consequence-first label) |
| Input borders, the unchecked-checkbox border and pressed/current fills fall below 3:1 with greyscale defaults; textarea and search remove the focus outline | Minor | Phase 3 (DW-3.2, DW-3.3) |
| Chat answers in snap mode measure ≈47 characters per line (420 px panel). The modal overshoots 75. Panel width is layout (Stage 2) | Note | Phase 2/3: accept 45–75 (Bringhurst) in narrow panels, aim for 60–75 where width allows, cap the modal measure |
| Admin toolbar wrapping and the launcher covering the table appear only below ~1120 px (the admin container is 900 px), not at 1280/1440 | Note | Phase 3 container-query intent (~960 px); no done-when change (G13) |
| Undrawn states: streaming with Stop, empty roster, no search results, zero selected, invalid email | Minor | Phase 1 page specs (states); Phase 7 chat mock |
| "Students" vs "Users"; enrol-form label, helper and placeholder repeat each other; all-caps "ENROLL USERS" / "CURRENT SESSION" | Minor | Phase 5 |
| Admin H1/H2 only 2 px apart; class tabs at 12 px are the smallest text | Minor | Phase 2 type scale, Phase 3 tabs |
| Pagination "Previous" enabled on page 1; "Regenerate" disabled with no reason; five icon-only chat-header buttons | Minor | Phase 3 states; Phase 4/5 for the chat header |
| Display math drawn inside a box (detector `nested-cards`, a false positive otherwise) | Note | Phase 3: math renders without a container |

## Execution Log

_Filled by `build`._
