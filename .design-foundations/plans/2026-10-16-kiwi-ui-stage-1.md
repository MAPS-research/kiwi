# Plan: Kiwi UI refresh — Stage 1 (visual and verbal layer)
**Created:** 2026-10-16
**Status:** in-progress
**Started:** 2026-10-16 05:52
**Current Phase:** 7
**Workspace:** feature branch `feature/kiwi-ui-stage-1-design` (in place, at the repository root); base commit `ef65c1d`
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
| Verification-matrix roles follow the intended access model, not today's guards (user, 2026-10-16) | The user stated the logic: students cannot enter the teacher/admin interface; instructors can enter the student interface. Phase 1 review round 2 (F-1) asked for student rows on admin pages because bug B1 lets students in today; those are a defect, recorded with per-page evidence, not rows to verify |
| Student pages keep three verified rows (S, I, A); the I and A rows carry two extra controls (user, 2026-10-16, after same-scale student vs admin screenshots of the course list and the chat panel): "admin和teacher账号可以在界面里随意切换为学生视角和instructor视角，并且可以进入experiment界面，学生不行" | Confirms JOURNEY.md SR-1 (the top bar's view switch: a shield icon for admins, a cap icon for instructors, absent for students) and SR-6e (the chat panel's Experiment row, absent for students) as intended behaviour, not defects |
| Instructors' access in the admin area (user, 2026-10-16, "按建议" to the recommendation presented at the Phase 1 escalation): system-level pages are admin-only; on a class's pages its instructors may use Enrolment and Class email, while Class feature flags and Class MCP settings are admin-only; an instructor who reaches an admin-only page sees a no-permission state instead of being signed out or bounced; the sidebar shows an instructor only the entries they may use | Resolves the Phase 1 escalation (review round 3, M-041). The instructor rows of the 11 admin-only pages become record-only defect rows, like B1's student rows; the instructor rows of Enrolment and Class email stay verified rows, with today's refusal recorded as a defect. Brief Appendix A updated to match. The answer authorises a fourth BUILD fix round and a fourth REVIEW |
| New class (A-02) is admin-only for instructors (coordinator's default, 2026-10-16; the user may overrule it before the Phase 1 commit) | The decision above did not cover A-02. Today the backend refuses an instructor's submit and the Classes page hides the create control from them, so admin-only matches the product as built; the instructor row becomes a record-only defect row |
| Security findings stay out of committed files until fixed (coordinator, 2026-10-16) | The repository `MAPS-research/kiwi` is public. JOURNEY.md keeps only a pointer and a severity for SEC-1; the details live in the private fix task. The build and review reports under `.design-foundations/build/` (gitignored, and they carry the details) stay local, so the Phase 1 commit does not force-add them |
| Phase 2 converge rules (coordinator, 2026-10-16, from the BUILD agent's UPDATE_PLAN items 1-5; the user may object) | 1. Three `palette.mjs` runs are the regeneration procedure: seed 156 muted (accent), seed 95 muted (cream/tan neutrals and the paper canvas steps), seed 156 balanced (functional 3/9/11). One hue-156 run would tint the neutrals forest, against the h≈90-105 constraint. 2. The cream canvas is run B's accent steps 1-4, spliced as `--paper-1..4` like the functional colours; sheets are always the lighter step. 3. The semantic aliases are re-pointed per mode, and the override is recorded in the regeneration procedure: `--accent-solid` is `--accent-12` (forest) in light and `--accent-9` (sage) in dark, with hover and on-solid to match. A byte-equal alias would give light mode a 1.7:1 fill on cream. 4. The lock names `--neutral-11` as the ≥3:1 interactive boundary, and the focus ring per mode (`--accent-11` light, `--accent-9` dark). Functional `-9` is a fill or dot beside icon + label; `-11` is the text/icon colour. 5. The per-hand re-deal reading stands: five unedited hands from two recorded deals |
| Phase 2 pick: candidate 1, Ruled Folio (deal 0, hand 2), as dealt with no swaps (user, 2026-10-16: "用细线书页") | The user chose from the five candidates rendered side by side: light chat, dark chat and type specimens. It was the recommended hand. It is a Sage-primary family that fits long-form reading, uses hairlines instead of cards, pairs Source Sans 3 with Noto Sans CJK SC by design, and has near-zero motion while the student reads. Re-dispatched to lock `kiwi-ui/DESIGN.md` and build the swatch sheet |
| Phase 2 review round 1 FAILED; coordinator's calls for the fix round (2026-10-16) | The blocker is Critical 1: unselected filter chips draw their boundary at 1.56:1 (light) / 1.95:1 (dark). Calls on the other findings: Major 2 is fixed as found: the ruler sits on the message region only, is drawn as a background, and its ticks meet the lines. Major 3 is decided as option (ii): ticks follow each block's own line height (the CSS `lh` unit, phase starting at each block's top), so Latin (24 px) and CJK-dominant (28 px) blocks both tick on their lines without a global 24 px grid. Minor 8a is accepted for the mock: the sheet loads Source Sans 3 from Google Fonts, the PNGs are the reference render, and production self-hosts the face. Minor 8b is accepted: the pick is made. Minor 8c: the re-dealt hands and their veto reasons are recorded in the next row. All other Minors are fixed in the same round |
| The five hands set aside at the deal (coordinator, from the candidate sheet; reviewer's row 8c) | Deal 0: Retro-Futurist x Monolith Center, Playful Geometric x Fractured Grid, Cinematic Dark x Poster Bleed. Deal 1 (`--reroll 1`): Cinematic Dark x Marginalia, Art Deco / Luxury x Frieze Bands. One test applied to all: a brand-only register, colour and type axes nullified by the pins, and layout or motion against the pinned Feel line. The five presented are unedited hands: deal 0 #2 and #3, deal 1 #2, #3 and #5 |
| Phase 2 review round 2 FAILED on 2 Majors, 0 Critical (2026-10-16); fix round 2 dispatched, the second of the three allowed | Major 1: the swatch sheet overflows horizontally (scrollWidth 1520 at 1440), so dark steps 11-12 and info-11 are cut in the PNG the user was shown; the fix is to reflow and re-capture at 1440 and 1280. Major 2: the CJK italic sample is a synthesised oblique; the fix adds `font-synthesis: none` and a DESIGN.md rule that CJK emphasis renders upright. Also fixed in this round: the Minors on contradictory FAIL labels, the ruler-to-text distance, and prose slips |
| Phase 2 review round 3 FAILED on 1 Major, 0 Critical (2026-10-16); escalated to the user under the Gate Failure Protocol, as the third failure | F1: on the swatch sheet the dark-mode ruler and ticks paint the light `--border-strong` (#adaba1, 6.90:1) instead of the dark one (#636057). The cause is that `--ruler-rule` and `--ruler-ticks` are declared once at `:root`, so `var(--border-strong)` resolves in light scope. The locked DESIGN.md is sound; the defect is in the sheet, so the dark interface PNG the user was shown overstates the ruler. The fix is to redeclare the two properties in dark scope (or inline them), re-capture, and check the pixel. Minors F2 (12 px gap after code) and F3 (error field uses the warning triangle; DESIGN.md maps the cross to error) are cheap and go into the same round. No fourth BUILD round without the user's answer |
| The user confirmed the swatch sheet and approved the last fix round (2026-10-16: "色彩页我同意") | DW-2.2 confirmation, given on the third rendered sheet after being told that its dark ruler overstated the design. The F1 fix (fix round 3) brings the render in line with the locked tokens. DESIGN.md is flipped to locked once the Phase 2 review passes |
| The user agreed the nine access rules and a second security round (2026-10-16: "权限规则我也同意修改") | The rules: a professor-enrolled user counts as that class's instructor; instructors use only the classes they are assigned to; TAs view the roster only; only admins remove professor enrolments; instructors see their own email logs; MCP enrolment and roster tools follow the web rules; the role cache, the no-alert 403 and the 403-for-missing-class-id stay as built; external webhooks keep 401. Outside this design plan: a dedicated English document records every non-UI logic change, and each logic-change commit describes the old bug, how to trigger it and what changed, in English |
| Phase 3 flags from the BUILD agent, recorded for the implementation plan (coordinator, 2026-10-16) | 1. The email colour mapping must reach the backend template copy (`kiwi/src/email/email.templates.ts`) as well as the browser preview, so recipients and the preview agree. It is a one-file backend edit in the implementation plan; Stage 1 specifies it but does not edit code. 2. The locked DESIGN.md overrules TD-05's "neutral launcher" note: the floating chat launcher uses `--accent-solid`. Recorded so a review does not reopen it |
| Phase 3 review round 1 FAILED (2026-10-16): 1 Critical, 7 Major; fix round 1 dispatched, the first of three | Critical F1: the react-pdf toolbar, a listed third-party surface, has no token mapping. Majors: F2 coarse-pointer target geometry; F3 disabled exhibits state no reason; F4 table figures painted in the syntax colour; F5 column minimums too small for their content; F6 component tokens that reference the global tier; F7 deprecation schedule against governance; F8 sidebar notice overflow. All are to be fixed, none accepted. DW-3.2 also needs compact density for the Display menu, empty state, launcher and tutor message. F16: the emitter and checker must hold no machine-specific paths, because they will be committed to a public repository |
| Phase 3 review round 2 FAILED (2026-10-17): 0 Critical, 3 Major; fix round 2 dispatched, the second of three | F1: disabled or inert controls without a stated reason in the PDF toolbar and composer exhibits; the sheet audit accepted any described-by target. F2: a custom-property leak (`--_border`) draws hairlines on every Dialog action and the PDF search panel's Next match. F3: the generated public CSS drops 15 v1 classes and 2 keyframes with no deprecation. All three are to be fixed. Minors fixed in the same round: F4, F5, F6, F7, F9 (`palette.chart`, an interim neutral mapping until Phase 6), F10 (the code-surface generation claim) and the density-delta and shadow-literal parts of F8 |
| Phase 3 Minors accepted without change (coordinator, 2026-10-17) | F8 remainder: `transparent` and fixed-geometry literals in the component tier are allowed. F11: the component sheet's long preamble is evidence-page hierarchy, not product UI. F12: `nested-cards` hits are controls inside sheets, whitelisted by "Controls are not cards". F13: the detector's em-dash and numbered-marker hits are false positives |
| Phase 3 review round 3 FAILED (2026-10-17): 0 Critical, 1 Major, 9 Minor; escalated to the user under the Gate Failure Protocol, as the third failure | M1: the selected state of icon-only toggles (chat display mode, the chosen thumb) and the pressed look of tertiary toggles (PDF Search) are carried by colour alone: a tint at 1.01-1.07:1 and a glyph hue shift at 1.03:1, with no marker, weight or shape cue. This contradicts WCAG 1.4.1 and the lock's selection rule (tint + accent text + 2 px marker). Proposed fix: a 2 px selection marker or a filled glyph, a stated pressed look, a checker assertion that the cue clears 3:1 against the unselected state, and `aria-pressed` in the exhibits. Minors m1-m9 are in the report. No fourth BUILD round without the user's answer |
| The user approved Phase 3 fix round 3 and set a standing rule (2026-10-17: "修，以后同类直接修") | From now on, when a review fails only on small findings with a clear, single fix, the coordinator dispatches further fix rounds without asking, even past the Gate Failure Protocol's three attempts, and records each round here. Design trade-offs, changes to locked values, accepting a finding instead of fixing it, and scope changes still go to the user |
| Phase 3 review round 4 FAILED (2026-10-17): 0 Critical, 1 Major, 10 Minor; fix round 4 dispatched under the user's standing rule | F1: auto-dismissing toasts pause on hover only, the Undo after a destructive action is not keyboard-reachable, and error toasts lack Dismiss. The ten Minors are fixed in the same round. One of them involved no taste call: tool chrome is compact (36 px) on every route, as the brief and JOURNEY say, with 44 px coarse hit areas on student routes |
| Phase 3 review round 5 FAILED (2026-10-17): 0 Critical, 2 Major, 9 Minor; fix round 5 dispatched under the user's standing rule | 1: two student-route controls miss the 44 px coarse target (the S-02 drawer file rows at 36 px; PDF comment pins at 25 x 24 px), and the exception counts are wrong. 2: the editor selection is a 1.01-1.07:1 tint; the fix is accent-6 in dark and accent-4 plus a 1 px marker in light. Minors 3-11 are fixed in the same round. The reviewer's tool could not write files, so the coordinator persisted the report at the review path |
| Phase 3 review round 6 FAILED (2026-10-17): 0 Critical, 1 Major, 9 Minor; fix round 6 dispatched under the user's standing rule | F1: MUI's grey scale and `palette.common` are neither mapped nor guarded. The code uses them at 46 sites, including four page canvases. The fix is a `palette.grey` override to the neutral ramp, a migration by role, guard forms for the MUI path strings and accesses, and a hand-off list for the implementation plan, with no token value change. F2 (the switch track drawn as an ellipse) is resolved inside the locked shape rules; `radius.round` is not changed |
| `radius.round` (50%) interpretation (coordinator, 2026-10-17, from the passing Phase 3 review's Minor 2; the user may object) | The lock reserves 50% for status dots and the mascot backing, and rules out pills. The design system also uses it for the launcher disc, its count badge, radio buttons and PDF comment pins. Read as within the lock's intent: they are dot-like markers or convention-bound circles (radio = circle, checkbox = square), not pills or rounded containers. No value changes |
| Companion timing and clip choices (user, 2026-10-17: "飞一下改为1s，轻点头可以，点赞可以改为挥手") | The user judged the GIF previews. `hop` (answer complete) is about 1 s: drop drawings to fit, with no new art. `speaking` keeps the shallow dip. The like reaction uses `wave` instead of the bow. These changes go into the next Phase 4 fix round together with the review's findings, and update the state table, the sheet's CLIPS table, the stills, the GIFs and the asset budget |
| Phase 4 review round 1 FAILED (2026-10-17): 0 Critical, 2 Major, 8 Minor; fix round 1 dispatched under the user's standing rule, together with the user's timing and clip choices | F1: the peek and avatar hand-off at send produces two movers. The fix cuts the peek on send, and the typing flag never re-arms it after an answer. F2: failure and offline get no live-region announcement; the fix is `role=alert` and `role=status`. F10(i) is decided without a taste call: compare mode animates one column only, so the one-mover rule holds with no exception. F6 (the launcher at 24 px reads as a ghost) is settled by a rendered side-by-side and recorded |
| Phase 5 review round 1 FAILED (2026-10-17): 1 Critical, 7 Major, 5 Minor; fix round 1 dispatched under the user's standing rule | C1: ten native date controls in eight components (`datetime-local` and `type="date"`) render in the browser's locale, against the edge case "dates ignore the browser locale". Coordinator's call (the user may overrule it): the edge case stands, so one fixed-format date and date-time picker with a calendar popover replaces all ten, as an implementation hand-off; no exception is recorded. M4: S-05.06 ("Your session has ended") is true only once defect B2 is fixed, so it ships with or after the `fix/access-control` merge, and refused permissions use the no-permission copy. M1-M3, M5-M7 and m1-m5 are fixed as the reviewer proposed: the bulk-reject dialog, the event-preview error, both webhook-token error branches, one source per email string, with- and without-address support variants, and a regex-aware test inventory. Notes N3-N6 and N10 are fixed in the same round. The reviewer's tool could not write files, so the coordinator persisted the report at the review path |
| Phase 5 review round 2 FAILED (2026-10-17): 0 Critical, 2 Major, 8 Minor; fix round 2 dispatched under the user's standing rule | M1: date-fns display labels (the A-03 range label; the range picker's calendar header, day and weekday labels) are outside the one-format rule and unindexed. M2: four index rows freeze a sample date where the old text had a slot. Both are fixed as the reviewer proposed, and the lint is extended to date-fns `format()`. Coordinator's calls (the user may overrule them): m2, a Kiwi App's admin-approved "prompt" keeps that word, because it is the SDK's term (`contextualChat` runs an admin-approved prompt), and "instructions" replaces "system prompt" only for the tutor's and the experiment form's instructions; N1, "destructive actions state their consequence first" is read as the confirmation body's first sentence, after a title that names the action and its object, per the doctrine's destructive-confirmation formula. m1 and m3-m8 are fixed as proposed. The Phase 4 intro's "every state has a text twin" is aligned with principle 4 |
| Phase 5 review round 3 FAILED (2026-10-17): 2 Critical, 1 Major, 7 Minor; fix round 3 dispatched under the user's standing rule | C-1: the raw feature-flag identifiers on A-06 and A-15 (QwenModel, TokenLimit, RLanguageClass) get a label lookup and rows. C-2: the bulk approve and reject partial-failure messages get an honest why. M-1: A-17.03 uses the count notation. Coordinator's calls, each following a rule the spec already has (the user may overrule them): m-1, "session" stays analytics-only, so the sign-in strings say "sign-in"; m-2, C5 states that confirmation titles and consent headings end in "?"; m-3, C2 gains a carve-out for conventional single-verb controls whose object is clear from context (Retry, Dismiss, Undo, Stop, Copy, Apply, Refresh). m-4 to m-7 and note N1 are fixed as proposed. The round also sweeps each finding's class (identifiers rendered to users, partial failures, alternations), so the next review does not meet more instances |
| Phase 5 review round 4 FAILED (2026-10-17): 1 Critical, 1 Major, 8 Minor; fix round 4 dispatched under the user's standing rule | C1: the A-14 failed-file state keeps "Processing failed" as its only text; it gets a closed-set error row, and the lints that ran on new strings only (error rows, alternations, counts, end marks) now also run over kept strings, which is where C1 and m7 escaped. M1: five unlisted test lines (S-05.08, A-22.25) are added, and the reach check counts negative assertions too. Coordinator's calls (the user may overrule them): m2, an invalid-JSON error names the location in plain words instead of quoting the parser, and an HTTP reason phrase always takes the status cause line; m5, the clipboard error states only what is known (the browser refused the copy). m1, m3, m4, m6 to m8 and notes n1 to n4 and n8 are fixed as proposed |
| Phase 5 review round 5 FAILED (2026-10-17): 0 Critical, 2 Major, 15 Minor; fix round 5 dispatched under the user's standing rule | Major 1: the walk state's words. "Thinking…" stays as the waiting text because it is the user's wording in the confirmed brief (Never the only signal) and in the committed Phase 3 loading row, so the loader gets an index row that shows it with the dots; an unclassified step reads "Working…", matching the chain header, and SR-6.49's rationale stops contradicting the concession; every running-step label is classified. Major 2: "No token" is the expired subtype, not retryable. The § Companion hand-off is committed Phase 4 text and the lock scope is append-only, so § Voice and tone supersedes that mapping explicitly, as `## Chart tokens` will supersede the interim chart mapping. The 15 Minors are fixed as proposed. The round also sweeps cross-section consistency: a string or mapping stated in two sections must agree |
| Phase 7 mocks self-host Source Sans 3 (user, 2026-10-17: "下载 Source Sans 3 字体文件") | The plan requires the mocks to be self-contained with no network dependencies, and no copy of the face was on the machine. `@fontsource-variable/source-sans-3` 5.3.1 (OFL-1.1) came from the npm registry. Only the four Latin and Latin Extended woff2 files (normal and italic, variable weight 200-900) were kept, in `.design-foundations/mocks/assets/fonts/`, with `OFL.txt` and `source-sans-3.css`. The family name matches `--font-ui`, and CJK falls back to the system faces in that stack. A headless Chrome test that opened a page from disk loaded the faces with no network access |
| Phase 5 edits to committed Phase 4 text beyond the twin column (coordinator, 2026-10-17; recorded on review round 6's m9) | Carve-out 1 covers the text-equivalent column. The coordinator also allowed four one-line edits that keep § Companion true to the final twins, and the copy checker's L1 pins exactly these: principle 4 now reads "every state that conveys information has a text twin", because peek, retract and idle have none (round 1, m5); the "Text twins are drafts" line and the Phase 5 hand-off's draft words now hold the final wording (round 1); and the Phase 4 intro's "every state has a text twin" is aligned with principle 4 (round 2). They are documentation alignments, not UI strings, so they are recorded here rather than in the revision index |
| Phase 5 review round 6 FAILED (2026-10-17): 0 Critical, 2 Major, 11 Minor; fix round 6 dispatched under the user's standing rule | Major 1: at least 19 strings write a bare {n} before a plural noun; they take the count helper, C4's own example is corrected, and the lint now flags a bare count. Major 2: the hand-off said the two native confirm dialogs keep their copy, contradicting the index; the index's New text ships on the native mechanism, and only the browser's own OK and Cancel stay until a flow change. m9 is answered by the row above. m11, the chart ticks' en-US formats, goes to Phase 6. The other Minors are fixed as proposed, with each product claim (m6, m7) and each kept-input claim (m8) verified against the code before it is written. The round also audits rule coverage: every rule either has a lint over new and kept strings or a stated manual sample |
| Phase 5 review round 7 FAILED (2026-10-17): 0 Critical, 1 Major, 5 Minor; fix round 7 dispatched under the user's standing rule | X1: the webhook "delete" only sets the webhook inactive (webhooks.service.ts:173-177), and the Inactive tab and Edit bring it back. Coordinator's call (the user may overrule it): the copy says what the product does, under C16, so the title, button, row action and toast say "Deactivate"; a real hard delete would be a product change, and the copy would change with it. The reviewer's DW-5.2 FAIL ("0 of 46 bullets contain an old → new pair") is contradicted by the artifact: 1,166 nested per-string sub-bullets carry old → new, rule and rationale. It is noted in the review file, and the next review re-verifies it. Coordinator's decision on N-3: an input error's rule-then-correction form meets DW-5.4, because the field's error state shows what happened, the rule is the why, and the correction is the fix, as § Errors defines. X2-X6 are fixed as proposed; X5 rewords the second "drafts" sentence in the § Companion state-table intro, the same documentation alignment as the four recorded above |
| Phase 5 copy follows the access model as built on `fix/access-control`; material delete keeps "Delete" (coordinator, 2026-10-17, after fix round 7) | Fix round 7 changed S-01.07 to "An administrator adds you to a class", from today's admin-only Enroll card. That contradicts the user's decision of 2026-10-16 (a class's instructors may use Enrolment and Class email), which `fix/access-control` builds (LC-7 shows Enroll Students, Class Email and Class Apps to assigned instructors). S-01.07 names the instructor again and ships with or after that merge, like S-05.06, and any claim about who can act follows the merged model. The material delete archives with no list or restore anywhere, so to the person it is a delete: "Delete" stays, and the body says so |
| Phase 5 review round 8 FAILED (2026-10-17): 0 Critical, 1 Major, 5 Minor; fix round 8 dispatched under the user's standing rule | The only Major: S-05.04, the refused sign-in alert, has no what-happened sentence; it gets "Couldn't sign you in." like its siblings. The checker's undocumented D1 exception for cause-first authentication rows is retired rather than written into § Errors, because every other such row already states what happened. The count lint (D3) widens to singular nouns and modifiers before a noun. The round-8 review re-verified DW-5.2 and found the nested sub-bullets (1,166), which settles round 7's misreading |
| Phase 5 review round 9 FAILED (2026-10-17): 0 Critical, 2 Major, 4 Minor; fix round 9 dispatched under the user's standing rule | MAJ-1: EM.21 dropped the instructor's name from the enrolment email; it is restored as a conditional. MAJ-2: committed copy rationale described a security gap, against the 2026-10-16 rule that security findings stay out of committed files until fixed. The coordinator's sweep found more passages of the same kind in DESIGN.md, JOURNEY.md and the copy data. All of them move to a private, git-ignored note; committed text keeps neutral rationales and severity-only pointers (a new SEC-2 row); and a guard that reads its phrase list from the private note fails if any detail returns. Minors: "Your classes" for both roles under C8; C3 lists every date variant; the CSS hand-off lists PrimaryButton.test.tsx:43; DS.29 states the cause |
| Phase 5 review round 10 FAILED (2026-10-18): 2 Critical, 1 Major, 4 Minor; fix round 10 dispatched under the user's standing rule | C-1: the DateTimeField errors DS.45-DS.49 gave only the rule and the correction. The round-7 ruling (N-3) accepts an input error whose first sentence states what is wrong ("MCP server name is required."), not one with no such sentence, so these five get a what's-wrong sentence and § Errors states the narrower form. This refines N-3 and does not reverse it. C-2: the Google sign-in errors S-07.04 and S-07.05 carried the with-address text as Old; the no-address branches get their own Old, and their two test lines are listed. Major: S-05.03's generic fallback stops pointing at the password. The four Minors are fixed as proposed. The checker closes its fragment and template-conditional gaps |
| Phase 5 review round 11 PASSED (2026-10-18): 0 Critical, 0 Major, 4 Minor | DW-5.1 to DW-5.7 and every edge case pass on evidence the reviewer re-derived. The four Minors go to a follow-up before Phase 6, as after Phases 3 and 4: a count that breaks verb agreement (A-16.55), a row pointed to by colour (A-14.03), a voice sample whose claim needs a code cite or a replacement, and the keyboard reach of clamped server text |
| Phase 6 BUILD: "matched OKLCH lightness" is met as a measured band of ±0.07 per mode, not strict equality (build agent, 2026-10-18; shown to the user for objection) | An exhaustive search found that five hue-separated series at one exact lightness cannot be colour-blind-safe at the locked muted chroma. The best result was 6.3 against the gate of 8, and reaching 8 needs vivid chroma 0.22, which breaks the muted pin. A band of ±0.06 fails at chroma 0.14 or below; ±0.07 at chroma 0.10-0.14 passes both gates with margin (minimum simulated distance 8.14 light, 8.16 dark; 15.26 and 15.37 under normal vision). The alternatives are a vivid set, which changes a locked pin, fewer series, which changes scope, or a tighter band, which fails DW-6.1's colour-vision clause. The chart sheet and colour-vision strips went to the user on 2026-10-18; the band stands unless the user objects |
| Phase 6 review round 1 FAILED (2026-10-18): 0 Critical, 4 Major, 9 Minor; fix round 1 dispatched under the user's standing rule | F1 (the table tooltip clipped and the id never truncating) and F2 (the chart SVGs scaled up, so bars, type and lines exceed the sheet's own rules) are fixed on the evidence page and re-shot. F4, the lightness band, was independently confirmed as the only admissible reading and stands unless the user objects. F3, near-empty data, goes to the user. Meanwhile the render is brought in line with today's written rule (two bars with their value labels). N7: the chart entrance animation follows the locked Motion budget, with no exception. F5-F11, F13, N3 and N5 are fixed as proposed. F12 (accent equals slot 1) is a Phase 7 call |
| Near-empty chart data draws sparse bars with their value labels (user, 2026-10-18: "数据很少时画稀疏柱子，柱顶标上数字") | Resolves Phase 6 review round 1, F3. It amends the Phase 6 edge case "Empty or near-empty data ... renders the empty state": empty data still renders the empty state, while one or two non-zero buckets draw as bars, each labelled with its value, never as a flat or zero-filled chart. This is the rule DESIGN.md § Chart tokens already states and the sheet now draws. The user gave this answer without objecting to the ±0.07 lightness band, so the band stands, as its row says |
| Every subagent runs on Opus from Phase 6 onward (user, 2026-10-18: "要改为所有阶段都用opus effort可以选择xhigh或者max") | It replaces the plan's model ladder (fable, sonnet, haiku, with the review one tier below the build) and the rows above that chose a model per phase. BUILD runs at effort max and REVIEW at effort xhigh, on the same model. The Phase 6 build so far ran on Fable. Its fix work from here goes to a fresh Opus build agent that reads the discovery file and the review reports. The interrupted round-2 review is re-run on Opus |
| Phase 6 review round 2 PASSED (2026-10-18, Opus at effort xhigh): 0 Critical, 0 Major, 13 Minor | DW-6.1 to DW-6.7 and every edge case pass on the reviewer's own render, measurements and colour-vision computation. The 13 Minors go to a follow-up on a fresh Opus build agent, as after earlier phases. The donut near-merge of slot 1 and Other under simulation joins F12 as a Phase 7 call |
| Phase 7 also delivers a clickable preview (user's request at the 2026-10-17 session restart) | The six screens are linked into one preview the user can open and click through. A preview frame switches screen, theme and width. Navigation and local view state work: the Display menu, the companion states in a scripted chat demo, likes, and tabs. Saves show their Phase 5 success line, and nothing is sent anywhere. Anything that would sign in, change who can access a class, or send email is drawn disabled, with the design system's stated-reason pattern. The preview ships as one self-contained file, with fonts and mascot frames inlined, so it opens anywhere. The plan's 12 mocks and 4 phone renders remain the gated artifacts |
| A second Phase 6 round-2 review (sonnet, run in the sibling fork-1 session) found one Major the Opus review missed (2026-10-18) | The A-09 Delivery History table (overlay 12) had no Phase 6 table spec, so DW-6.5 ("every admin table") was not met by 1bec5c2. The user handed the build to this session and stopped the sibling. The finding, and four Minors the Opus review did not list, join the Phase 6 follow-up. That follow-up also sweeps for other tables inside overlays, and gets a focused Opus re-review before it is committed. Its report is `.design-foundations/build/...-phase-6-review.round2-sonnet.md` (git-ignored) |
| Phase 6 follow-up re-review FAILED (2026-10-18, Opus at effort xhigh): 0 Critical, 2 Major, 5 Minor; fix round dispatched to the same Opus agent under the user's standing rule | DW-6.5 now passes: the reviewer's own enumeration found every admin table specified, including A-09's delivery history. M1: the table tooltip has an 8 px gap the pointer cannot cross (WCAG 1.4.13), so it gets a hover bridge, a 1 px pointer-path audit and an implementation note. M2: the A-18 Questions tile gave context, not a baseline. Coordinator's call (the user may overrule it): it shows a real prior-week trend with a direction glyph, from the weekly series the page already fetches (missing weeks count as 0), because Few and the plan prefer a comparison over "none" when the data exists. The five Minors are fixed as proposed |
| The tutor avatar keeps one small, full-body framing (user, 2026-10-18: "kiwi的图标不应该从变成跑步的样子然后变成半身图然后又变回跳一跳飞起来…最好应该一直是小小的，开始生成的时候才跑动，生成完了跳一下或者飞一下，不要有割裂感") | It amends Phase 4's state table. The avatar's states cut between the portrait clips (idle, speaking, error, offline) and the full-body clips (walk, hop, wave), which reads as disjointed. From now on the tutor avatar uses only full-body drawings: it runs when generation starts, hops or flies once when the answer is done, and otherwise stands still in the same small pose. The composer peek is a separate placement. One detail went back to the user: whether Kiwi keeps running or stands while the answer text streams. The locked DNA asks for near-zero motion while the student reads. `## Companion` is amended, and the companion sheet, its stills and its previews are re-rendered |
| Kiwi keeps running until the answer is complete, then flies once; the lock's "near-zero motion while the student reads" is relaxed for this (user, 2026-10-18: "Kiwi 一直跑到答完再飞一下，可以放宽读字时不动的规则。") | It settles the open detail of the full-body framing row above. The tutor avatar runs from the send through the whole streaming answer, as one continuous loop with no restart between waiting and streaming, then hops and flies once on completion and stands. The relaxation covers only this: the newest tutor avatar, still the one mover. Every other motion rule of the lock stands, and reduced motion and the Display switch still reduce the avatar to its still. It is recorded as a lock amendment, appended rather than edited into the locked text. `## Companion` is amended to match, with one shared framing for every full-body drawing so the figure never changes size |
| Phase 6 follow-up PASSED its second Opus re-review (2026-10-18): 0 Critical, 0 Major, 6 Minor; committed as 26652e2 | The tooltip pointer path, 23 specified admin tables and the Questions trend were all re-verified on the reviewer's own render. Five of the Minors go to a quick round: two evidence-page state bugs, largest-remainder shares, the audit re-running on a theme switch, and the A-08 count. The sixth, the donuts reusing slots, joins F12 for the user at Phase 7 sign-off |
| Phase 4 amendment PASSED review (2026-10-18, Opus at effort xhigh): 0 Critical, 0 Major, 5 Minor | One shared full-body framing, a run from send through streaming with no restart, one flight then stand, motion off reducing to the standing still, and one mover were all verified frame by frame on the reviewer's own renders. Committed. The five Minors go to a follow-up: the landing's sub-pixel shift, a clipped Retry in one exhibit, page-placement stills tagged with avatar state names, the Phase 3 "error pose" wording, and the peek stills under motion off |
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
- No `walk` while answer text is on screen. *(Superseded on 2026-10-18 by the user's decisions in the Decision Log: the tutor avatar keeps one small full-body framing, and runs until the answer is complete, then flies once. A lock amendment records it.)*
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
**Model:** opus (BUILD effort max, REVIEW effort xhigh; user, 2026-10-18)
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
**Model:** opus (BUILD effort max, REVIEW effort xhigh; user, 2026-10-18)
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

### Phase 1: As-is page specs and verification matrix (Gate: Standard)
- [x] BUILD: discovery + design + production, then fix rounds after each failed review
- [x] REVIEW: PASS on the fourth attempt. Rounds 1 to 3 failed: round 1 on M1-M3, round 2 on F-1 and F-2, round 3 on M-041. After round 3 the user decided which admin pages instructors may use. Round 4: no Critical, no Major, 7 Minor.
- [x] Committed
Commit: 387feb7 (follow-up for the 7 review Minors: 1019945)
Summary: `kiwi-ui/JOURNEY.md` records kiwi-ui as it stands today.
- It has 34 page entries and 7 shared regions, with roles taken from the brief's Appendix A, density and paper surfaces.
- Its verification matrix has 84 page rows and 5 redirect rows: 2,006 cells at 1280 and 1440, plus 390 for student and auth pages, in light and dark.
- Its defect register attaches the 37 in-boundary tour defects to their pages, with Nielsen heuristic and severity.
- Rows that today's guards allow but the access model does not grant are recorded as defects, not verified.
- Carried forward: the review's 7 Minor documentation items (follow-up commit), and the open severity-3 product defects. TD-19 is the sign-in wordmark contrast, which the Stage 1 tokens fix. B1, B2, B4 and B5 have separate fix tasks.

### Phase 2: Design DNA and light/dark tokens (Gate: Full)
- [x] BUILD:
  - discovery;
  - five dealt candidates from two recorded deals, and the user's pick (Ruled Folio);
  - the lock dispatch;
  - three fix rounds after failed reviews;
  - the pre-lock Minors.
- [x] REVIEW: PASS in round 4 (0 Critical, 0 Major, 8 Minor). Rounds 1 to 3 failed:
  - round 1: the filter-chip boundary at 1.56:1, the ruler off-spec, no CJK baseline mechanism;
  - round 2: horizontal overflow, faux italic on CJK;
  - round 3: the dark ruler painted in the light colour.
  - Before the lock: F1 (the sheet drifted from the locked scale), F2 (DESIGN.md wording) and a root-only shadow composite were fixed.
- [x] Committed
Commit: 4382715
Summary: `kiwi-ui/DESIGN.md` is locked as Ruled Folio.
- **Tokens:** forest-led light and sage-led dark OKLCH tokens from three recorded `palette.mjs` runs (accent at hue 156, cream/tan neutrals at hue 95, functional colours at balanced chroma), with per-mode alias overrides.
- **Type:** Source Sans 3 with the G7 CJK stack. Leading is 24 px for Latin and 28 px for CJK. CJK emphasis is upright 600, and `font-synthesis` is none.
- **Signature:** a per-block ruler on the message region, with ticks at line-box tops.
- **Contrast:** 76 explicit role pairs pass AA.
- **Carry into Phase 3:** declare per mode every composite that references a mode token (gradients, shadows).

### Phase 3: Design system (Gate: Full)
- [x] BUILD: discovery, design and production, then six fix rounds. The third failure was escalated, and the user then set the standing rule "修，以后同类直接修".
- [x] REVIEW: PASS in round 7 (0 Critical, 0 Major, 6 Minor). Earlier rounds failed, in order, on:
  - the react-pdf toolbar mapping;
  - disabled reasons, a part-variable leak, and dropped v1 classes;
  - colour-only selection;
  - toast timing;
  - coarse targets and editor selection;
  - MUI grey/common.
- [x] Committed
Commit: 53f518c
Summary: `kiwi-ui/DESIGN.md` `## Design system` specifies:
- DTCG tiers across colour, density and pointer;
- 20 components, each with 8 states;
- code surfaces and the icon policy;
- the generation spec for the MUI theme and the public CSS (v1 contract kept, 59 deprecations);
- the raw-colour guard and allowlist, the email mapping, and governance.

`.design-foundations/tokens/` holds the source, emitter, checker and generated outputs; 422 required contrast pairs pass. The six review Minors go to a follow-up commit before Phase 4.

### Phase 4: Companion — the tutor mascot (Gate: Full)
- [x] BUILD: discovery and production; the user picked timing and clips from GIF previews; one fix round.
- [x] REVIEW: PASS in round 2 (0 Critical, 0 Major, 13 Minor). Round 1 failed on the peek/avatar hand-off at send and on failure and offline announcements.
- [x] Committed
Commit: 3e00b35
Summary: `## Companion` specifies the tutor mascot:
- nine states with trigger, exit, duration, interruption, still and text twin;
- one mover, and the motion precedence flag > reduced motion > switch;
- placements, with JOURNEY bullets on 12 pages;
- the dark backing at 10:1;
- announcements;
- an asset budget of 131,544 B before the first answer;
- an ethics pass.

The user's choices: hop about 1 s, a shallow nod, a wave on like. Stills, atlases, the glyph, provenance and GIF previews are under `.design-foundations/mocks/`. Twelve review Minors go to a follow-up before Phase 5; A-7 (no reaction on dislike) waits for the user.

### Phase 5: Words (Gate: Standard)
- [x] BUILD: discovery, design and production, then ten fix rounds under the user's standing rule (no fix round was refused or deferred).
- [x] REVIEW: PASS in round 11 (0 Critical, 0 Major, 4 Minor). Rounds 1 to 10 failed, in order, on:
  - native date controls and nine copy gaps;
  - date-fns labels and frozen sample dates;
  - raw identifiers and partial failures;
  - a kept error state and unlisted test lines;
  - walk-state words and the "No token" mapping;
  - bare counts and the native-confirm hand-off;
  - the webhook's soft delete;
  - the refused sign-in sentence;
  - the enrolment email, and security-relevant detail in committed text (moved to a private, git-ignored note);
  - input errors and the Google sign-in branches.
- [x] Committed
Commit: b5a9cf9 (fonts for Phase 7: 6e06f91)
Summary: `kiwi-ui/DESIGN.md` `## Voice and tone` is the words law, and `kiwi-ui/JOURNEY.md` carries every revision.
- **Voice and tone:** one voice in two registers (students; instructors and admins), six tones and eighteen microcopy rules.
- **Formats and errors:** one English date format with the DateTimeField control, and the error anatomy with closed cause lines.
- **Vocabulary and strings:** the terminology table, page names, shared strings, the final companion twins and the email templates.
- **Revisions:** 1,261 changed strings with test references, per-route Copy bullets, and hand-offs. Gated copy ships with the `fix/access-control` merge.
- **Tooling:** `.design-foundations/copy/` holds the data, the generator and a 99-check read-only checker.
- **Carried into Phase 6:**
  - the chart ticks' en-US formats (`chartXAxis.ts:50`, `:80`, `:85`, `:91`) must follow § Dates;
  - chart summaries follow the voice guide;
  - new strings go through the copy pipeline;
  - security-relevant detail stays out of committed files (guard P2).

### Phase 6: Data surfaces (Gate: Full)
- [x] BUILD: discovery, design and production on Fable, then one fix round. From here on, the user's decision of 2026-10-18 puts every subagent on Opus.
- [x] REVIEW: PASS in round 2, on Opus at effort xhigh (0 Critical, 0 Major, 13 Minor). Round 1 (sonnet) failed on the evidence page: a clipped tooltip and scaled-up SVGs. Its near-empty finding went to the user, who chose sparse bars with value labels. The first round-2 attempt was cut off by an app restart.
- [x] Committed
Commit: 1bec5c2
Summary: `kiwi-ui/DESIGN.md` `## Chart tokens` gives the data surfaces their colours and rules.
- **Series:** five categorical series and a neutral "Other", for both modes.
  - They are derived in OKLCH off the purple, pink and red arcs.
  - Each is at least 3:1 on the plot and at least 8 apart under colour-vision simulation.
  - Lightness is matched as a ±0.07 band.
- **Encoding rules:** no entrance animation.
- **Applied:** the KPI tiles and table rules on A-03, A-18 and 13 admin tables, and 11 chart summaries through the copy pipeline.
- **Evidence:** the offline chart sheet with colour-vision strips.
- **Carried into Phase 7:**
  - F12: slot 1 equals the accent, so one green carries three meanings on A-03, and the donuts' Unknown slice needs a direct label. It goes to the user at sign-off.
  - The chart sheet and its colour-vision strip join the sign-off materials.
