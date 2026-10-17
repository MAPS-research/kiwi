# Design: Ruled Folio
**Date:** 2026-10-16 · **Status:** locked (2026-10-16). Confirmed by the user on the swatch sheet ("色彩页我同意"; `.design-foundations/mocks/swatch-sheet.html`), and the Phase 2 review passed in round 4 (0 Critical, 0 Major). Any change from here needs the user's re-confirmation on a re-rendered sheet.
**Archetype:** Sage primary, Caregiver secondary · **Register:** calm structure · expressive at: sign-in, empty and not-found states, the chat companion
**Grounding:** LaTeX's `article` class's hierarchy by size and vertical space alone + the Kindle Paperwhite page's measure-locked column with one hairline progress rule
**DNA:** Editorial Minimalism + type voice from Warm Editorial (a humanist sans body in place of the serif) · **Dominant axis:** composition (the ruled reading column)
**Composition:** dealt, not chosen: Editorial Minimalism × Editorial Spread, variance 7; signature `baseline-ruler`; seed `kiwi-ui|2026-10-16|0|pin:chroma=muted,hue=156`, hand 2, from `scripts/dealer.mjs`; ledger `.design-foundations/used-dna.json`
**Pins:** `hue=156` (mascot forest `#234631`, measured OKLCH H 156.0) · `chroma=muted` (dealer pins, user law). Picked as dealt, no swaps (user, 2026-10-16: "用细线书页"). Type constraints ride the TYPE line, not the deal: one humanist sans, Source Sans 3; Montserrat only inside `KiwiWordmark` (G6); the G7 CJK stack.

**Plan:** `.design-foundations/plans/2026-10-16-kiwi-ui-stage-1.md`, Phase 2 · **Brief:** `.design-foundations/research/2026-10-16-kiwi-ui-visual-refresh.md` (G1–G15) · **Page specs:** `kiwi-ui/JOURNEY.md` · **Evidence:** the swatch sheet `.design-foundations/mocks/swatch-sheet.html` and its screenshots `.design-foundations/mocks/screenshots/swatch-sheet.1440x900.png`, `swatch-sheet.1440.full.png`, `swatch-sheet.1280x800.png` (the sheet recomputes every contrast pair from its own token block and asserts the dark ruler and shadow colours live)

Lock scope (plan): this file's token block and the sections below are read-only after the lock. Later phases append `## Design system`, `## Companion`, `## Voice and tone` and `## Chart tokens`, and register tokens only in the `semantic.*`, `chart.*` and `companion.*` namespaces. Changing any global value means re-running the regeneration procedure and re-confirming the lock.

## Direction

A quiet academic shell with one living companion. Students read long tutor answers that mix prose, math, code and citations; instructors and admins work in dense tables and forms. The shell behaves like a well-set page: hierarchy comes from type size, weight and vertical space, not from containers or colour; surfaces are warm paper with lighter sheets on it (a well-lit library) and, in dark mode, warm-tinted darks with lighter sheets (a reading lamp at night). Colour carries meaning only: forest is the interactive colour in light mode and sage in dark mode, status colours live on status surfaces with an icon and a label, and nothing else is coloured. The Sage archetype sets the structure register (measured, precise, no decoration); the Caregiver secondary inflects one dimension, legibility and warmth, through the humanist sans, the cream canvas and the mascot. The companion is the one expressive element and it is still while the student reads.

The collision behind it: a LaTeX `article` page gives a student a surface they already trust from course PDFs (size and space as the only hierarchy), and the Kindle page adds the one rule the eye needs (a measure-locked column with a single hairline). Everything in this file is the product of those two references under the pins.

## Signature move

**A visible baseline ruler runs down one edge, and content demonstrably sits on it.**

- Where: the left edge of the chat panel's **message region** in all four panel modes, and of the reading columns Kiwi draws itself: the sign-in panel's text column, the not-found page's text column, the empty-state copy. Never on tool chrome: the panel header, the session bar, the composer, toolbars, the top bar. Never on admin tables or on paper (PDF pages, email previews, Kiwi App iframes).
- The rule: a 1 px vertical line in `--border-strong`, the full height of the region, drawn as the region's CSS background (`linear-gradient(var(--border-strong), var(--border-strong)) 0 0 / 1px 100% no-repeat`). No DOM node.
- The ticks: 6 px wide, 1 px tall, one per line of every text block, drawn as that block's `::before` strip (generated content, not a DOM node): `background: linear-gradient(var(--border-strong) 0 1px, transparent 1px) 0 0 / 6px 1lh repeat-y`, positioned at the region's left edge. The tile is one line-height tall, so **each block ticks its own lines**: a Latin paragraph at 24 px every 24 px, a CJK-dominant paragraph at 28 px every 28 px, a heading at its own leading, a code block at 24 px. The phase starts at each block's top; text blocks carry no vertical padding (rhythm is margin), so the ticks stop with the last line. There is no shared baseline grid and no pad-back rule.
- Tick position: the **line-box top** of every line (the first tick is the block's top edge). It is font-independent, so Latin and CJK blocks, and fallback fonts, read alike.
- Distance from the ruler: in single-column reading surfaces (sign-in, not-found, empty states) the text sits 24 px right of the ruler (12 px at 390 px). In the chat panel the message region's padding is 24 px, and a **tutor row's text begins 68 px right of the ruler**: the 32 px avatar and its 12 px gap sit between them as marginalia, so the ruler marks the region's edge and the ticks mark the lines. A **student row is right-aligned**, as today (JOURNEY SR-6 user rows): its lines are ticked from the ruler but do not sit against it, and its distance varies with line length. These are the two message kinds; neither is flush-left against the ruler, and the spec does not claim it.
- Support floor: the `lh` unit needs Chrome and Edge 109, Safari 16.4, Firefox 120 (all 2023). Below the floor (`@supports not (background-size: 1lh)`) the rule stays and the ticks are not drawn. The implementation feature-tests; it never falls back to a fixed 24 px tile, which would be wrong on CJK blocks.
- Both modes: `--border-strong` is `#adaba1` on the light canvas and `#636057` on the dark canvas. It is a decorative rule (2.0:1 / 2.8:1) and is never the only cue for anything. The hard-stop gradient syntax above is the only gradient syntax this system permits (`§ Space, shape, depth`).
- Implementation note (Phase 3): a gradient, a shadow, or any composite value that references a mode token resolves where the custom property is declared, not where it is used. A root-scope `--ruler-rule` built from `var(--border-strong)` would paint the light `#adaba1` inside a `[data-theme="dark"]` subtree, and a root-scope `--shadow-1`/`--shadow-2` built from `var(--shadow-ink)` would cast the light forest ink under dark surfaces. Declare every such composite per mode (in both the `:root` and the `[data-theme="dark"]` blocks) or write it at the use site; never emit one as a root-only custom property, and have the generation spec's test fail on a root-only composite that references a mode token. The swatch sheet asserts this live for both: the dark message region's rule and tick strips must compute to the dark `--border-strong`, and the dark subtree's `--shadow-2` must embed the dark `--shadow-ink`.

## Expressive moments

Everything holds the structure register (hairlines, tonal steps, the 24 px rhythm, one filled control per region). The dial turns up, modestly (a product surface), in exactly three places:

1. **Sign-in.** The only place the `--text-4xl` display line exists (36/44, Source Sans 3 600, `letter-spacing: -0.01em`), beside the mascot's still pose, on the ruled column. Display type otherwise means `--text-3xl` (the course-list header, large empty states); nothing else goes above `--text-2xl`. The `KiwiWordmark` (Montserrat 800 italic) stays here and nowhere else (G6).
2. **Empty and not-found states.** The mascot's still pose at the `companion.slot.*` size Phase 4 registers, a `--text-2xl` line and caption-rank copy on the ruled column; no illustration, no card, no gradient. Includes the class-card image fallback (a mascot pose replaces the grey wordmark).
3. **The chat companion.** The 32 px avatar on every tutor row is the mascot; its states and motion are Phase 4. It is the only thing on a reading surface that ever moves, and it is still while text is on screen.

## Type

- **Display:** Source Sans 3, weight 600 (`"Source Sans 3", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`). The same family as body: one humanist sans (G6, G15).
- **Body:** Source Sans 3, weight 400, true italic 400 (same stack). Why this face: Adobe's humanist sans drawn for UI and editorial text; large x-height and open apertures sit beside PingFang SC and Microsoft YaHei without a texture jump; authentic italics; tabular, proportional, lining and oldstyle figures (`tnum`, `pnum`, `lnum`, `onum`); OFL; **production self-hosts it** from `@fontsource-variable/source-sans-3` (two variable files per subset, upright and italic, weights 200–900; both are loaded, so 400, 600 and the italic cost no extra files). The review swatch sheet loads the face from Google Fonts for its render only; the product never does (mainland networks make third-party CDNs unreliable, brief Constraints). Its sibling Source Han Sans is Noto Sans CJK SC, the stack's fourth font, so the Latin and CJK fallback were designed as a pair. Not on the plugin's overused list.
- **No synthesis, and CJK emphasis:** `font-synthesis: none` is set at the root, so no browser ever synthesises a bold or an italic for a face that lacks one. CJK has no italic: an `em` or `*…*` run inside a CJK-dominant block renders **upright at weight 600** (`font-style: normal; font-weight: 600`), never slanted and never in the accent colour (that is the link colour); Latin `em` renders in the true italic 400. The typography test asserts `font-synthesis: none` and the upright rule on a CJK emphasis sample.
- **Wordmark:** Montserrat 800 italic, only inside `KiwiWordmark` (G6). It is not a UI face and has no token here.
- **Code:** `ui-monospace, "SF Mono", Menlo, Consolas, "PingFang SC", "Microsoft YaHei", monospace` (`--font-mono`); editor and syntax themes are Phase 3 (brief OQ3).
- **Scale** (`--text-*`, rem at a 16 px root; px and line-height):

  | Token | Size | Leading | Use |
  |---|---|---|---|
  | `--text-xs` | 0.75 rem / 12 px | 16 px | labels, table captions, timestamps, session label (sentence case, never CSS capitals) |
  | `--text-sm` | 0.875 rem / 14 px | 20 px | tool chrome, compact-density body, table cells, buttons |
  | `--text-base` | 1 rem / 16 px | 24 px (Latin) · 28 px (CJK-dominant) | reading surfaces: chat answers, forms at comfortable density, prose |
  | `--text-lg` | 1.125 rem / 18 px | 28 px (Latin) · 32 px (CJK-dominant) | decks, lead paragraphs, the student's question in the panel |
  | `--text-xl` | 1.25 rem / 20 px | 28 px | section headings in panels and dialogs, the chat panel title |
  | `--text-2xl` | 1.5 rem / 24 px | 32 px | page headings (H1 in admin and student pages), empty-state line |
  | `--text-3xl` | 1.875 rem / 30 px | 36 px | course-list header, large empty states |
  | `--text-4xl` | 2.25 rem / 36 px | 44 px | sign-in display line only |

  Steps grow by 1.11–1.25 (12, 14, 16, 18, 20, 24, 30, 36 px). The admin H1 (`2xl`, 24 px) and H2 (`xl`, 20 px) are one full step apart where today's headings differ by 2 px; if that 4 px step reads too close in Phase 3's component specs, H2 drops to weight 400 and the scale does not change. Headings are weight 600; `2xl` and above take `letter-spacing: -0.01em`. The scale does not change between densities; Phase 3's density deltas pick which step a role uses (compact chrome `sm`, comfortable reading `base`).
- **Leading:** Latin body 1.5 (24 px on 16); headings 1.2–1.4 as tabled; tool chrome 1.43 (`sm`) and 1.33 (`xs`). **CJK-dominant blocks 1.75** (28 px on 16; 32 px on 18), decided per block (paragraph or list item) because generated content carries no `lang` tag: a block is CJK-dominant when more than half of its non-space characters are CJK. There is no shared baseline grid: the ruler ticks each block at its own leading (`§ Signature move`), so Latin and CJK blocks need no pad-back and may sit next to each other at 24 and 28 px. Blocks inside a message are separated by `--space-3` (12 px); messages by `--space-5` (24 px).
- **Measure:** 60–75 Latin characters where the width allows (`--measure-prose: 68ch`), 35–40 for CJK-dominant blocks (`--measure-cjk: 36em`); in the 420 px chat panel 45–75 is accepted (Bringhurst; mock-checkpoint note), and the modal caps at 75 instead of running ~110.
- **Numerals:** `font-variant-numeric: tabular-nums` on tables, counters, dates and times; proportional (the default) in prose.
- **Weights:** 400 and 600 only, plus italic 400 for Latin. No faux bold or faux italic: `font-synthesis: none` at the root, the upright and the italic variable files are both loaded, and the typography test asserts that both families resolve. 700 is unused.
- **Alignment:** flush left, ragged right; never justified; sentence case everywhere (capitals are never applied by CSS).

## Color tokens

### Regeneration procedure (three runs, one splice, per-mode aliases)

"Re-run `palette.mjs`" means all three runs, then the splice and the alias overrides below. Script: `${CLAUDE_PLUGIN_ROOT}/scripts/palette.mjs` (design-for-ai 4.2.0), run with `node`.

| Run | Command | Supplies to the block |
|---|---|---|
| A | `node palette.mjs --seed 156 --chroma muted --harmony mono` | `--accent-1..12`; its `--accent-on-solid` (`#06100a`) is the dark-mode `--accent-on-solid` |
| B | `node palette.mjs --seed 95 --chroma muted --harmony mono` | `--neutral-1..12` (cream/tan-tinted neutrals; 95° is the mean of cream 102.8° and tan 88.1°, the plan's h≈90–105 constraint) and `--paper-1..4` = run B's `--accent-1..4` (the canvas steps) |
| C | `node palette.mjs --seed 156 --chroma balanced --harmony mono` | `--error/success/warning/info-3/9/11` (G1: functional colours at balanced chroma, the accent at muted) |

Why three: `palette.mjs` tints its neutral ramp with the seed hue and caps neutral chroma at 0.018, so the pinned run alone gives forest-tinted, near-white neutrals; and it builds functional ramps at the accent's chroma multiplier, so the main run alone cannot make success more chromatic than primary. Each run exits 0 (reports below).

**Splice rule:** copy the named ramps verbatim from each run's output into one `:root` and one `[data-theme="dark"]` block. Nothing is hand-edited; every hex below appears in one of the three outputs.

**Alias overrides (per mode).** `palette.mjs` emits one alias set for both modes. This lock re-points seven of them (in at least one mode each), for two measured reasons: (1) the canvas is the paper ramp, not `--neutral-1/2`; (2) run A's solid `--accent-9` (`#84ca9e`, L 0.78 in both modes) measures 1.70:1 against the light canvas, below the brief's 3:1 boundary rule, so the light-mode filled control is forest (`--accent-12`) and the dark-mode one is sage (`--accent-9`). The overrides are part of the locked block and Phase 3 carries them byte-equal.

| Alias | palette.mjs default | Light (locked) | Dark (locked) |
|---|---|---|---|
| `--background` | `neutral-1` | `var(--paper-3)` | `var(--paper-2)` |
| `--surface` | `neutral-2` | `var(--paper-2)` | `var(--paper-3)` |
| `--surface-hover` | `neutral-3` | `var(--neutral-3)` (kept) | `var(--neutral-4)` |
| `--surface-active` | `neutral-4` | `var(--neutral-4)` (kept) | `var(--neutral-5)` |
| `--accent-solid` | `accent-9` | `var(--accent-12)` | `var(--accent-9)` (kept) |
| `--accent-solid-hover` | `accent-10` | `var(--accent-11)` | `var(--accent-10)` (kept) |
| `--accent-on-solid` | run A literal `#06100a` | `var(--neutral-1)` | `#06100a` (kept) |

Kept byte-equal in both modes: `--border-subtle` (6), `--border` (7), `--border-strong` (8), `--text-secondary` (11), `--text` (12), `--accent-bg-subtle` (accent-3), `--accent-text` (accent-11). Named by this lock (plan Decision Log, item 4): `--border-interactive` (`neutral-11`, the ≥3:1 boundary of every control: inputs, unchecked controls, unselected filter chips, draggable grips), `--focus-ring` (`accent-11` light, `accent-9` dark), `--shadow-ink` (`accent-12` light; dark `#06100a`, run A's `--accent-on-solid` value, the darkest green-black the runs produce: C 0.020, a slight shift toward forest, near-neutral in practice).

**Ramp order.** Step 9 of every ramp is the hue's chroma cusp, the solid, not a lightness mid-step, so 8 → 9 → 10 is not monotonic (light accent-8 `#82ba96` is darker than accent-9 `#84ca9e`; light neutral-9 `#bbb7ab` is lighter than neutral-8 `#adaba1` and neutral-10 `#a8a599` is darker again; dark neutral-8 `#636057` jumps to neutral-9 `#bbb7ab`, and neutral-10 `#cecbbe` is lighter than neutral-11 `#b9b7b0`). The roles never read a ramp by position: `--neutral-9` and `--neutral-10` are unused by any role and are **not published as role tokens** (Phase 3 keeps them out of `public/kiwi-design-tokens.css`); `--accent-9` is used only through `--accent-solid` in dark mode.

### The locked block

```css
/* Kiwi UI — Ruled Folio · generated by design-for-ai palette.mjs (runs A, B, C above), spliced per the regeneration procedure */
:root {
  /* run B · seed 95 muted · neutral ramp (cream/tan-tinted) */
  --neutral-1: #fdfdfc; --neutral-2: #f9f9f7; --neutral-3: #f1f0ed; --neutral-4: #e9e8e4;
  --neutral-5: #dfded8; --neutral-6: #d4d2cb; --neutral-7: #c6c3bb; --neutral-8: #adaba1;
  --neutral-9: #bbb7ab; --neutral-10: #a8a599; --neutral-11: #65635c; --neutral-12: #2f2e2a;
  /* run A · seed 156 muted · accent ramp */
  --accent-1: #fafefb; --accent-2: #f4fbf6; --accent-3: #e6f5eb; --accent-4: #d9eee0;
  --accent-5: #c9e7d3; --accent-6: #b7ddc4; --accent-7: #a2d1b2; --accent-8: #82ba96;
  --accent-9: #84ca9e; --accent-10: #74b68d; --accent-11: #486d56; --accent-12: #203327;
  /* run B · accent steps 1–4 · the paper (canvas) ramp */
  --paper-1: #fefdf9; --paper-2: #faf9f3; --paper-3: #f4f1e4; --paper-4: #ede8d5;
  /* run C · seed 156 balanced · functional 3/9/11 */
  --error-3: #ffebe9;   --error-9: #e1524f;   --error-11: #974843;
  --success-3: #e0f8e0; --success-9: #5ad664; --success-11: #337437;
  --warning-3: #f9f0dd; --warning-9: #dbb155; --warning-11: #76602f;
  --info-3: #e3f3ff;    --info-9: #5baee5;    --info-11: #3d6886;
  /* semantic aliases (palette.mjs set; per-mode overrides marked) */
  --background: var(--paper-3);            /* override: the cream canvas */
  --surface: var(--paper-2);               /* override: sheets are the lighter step */
  --surface-hover: var(--neutral-3);
  --surface-active: var(--neutral-4);
  --border-subtle: var(--neutral-6);
  --border: var(--neutral-7);
  --border-strong: var(--neutral-8);
  --text-secondary: var(--neutral-11);
  --text: var(--neutral-12);
  --accent-bg-subtle: var(--accent-3);
  --accent-solid: var(--accent-12);        /* override: forest-led light (accent-9 is 1.70:1 on the canvas) */
  --accent-solid-hover: var(--accent-11);  /* override */
  --accent-on-solid: var(--neutral-1);     /* override: the label on a forest solid */
  --accent-text: var(--accent-11);
  /* named by the lock */
  --border-interactive: var(--neutral-11);
  --focus-ring: var(--accent-11);
  --shadow-ink: var(--accent-12);
}

[data-theme="dark"] {
  /* run B · neutral ramp */
  --neutral-1: #131312; --neutral-2: #1a1918; --neutral-3: #232220; --neutral-4: #2b2a27;
  --neutral-5: #33322e; --neutral-6: #3d3c36; --neutral-7: #4b4942; --neutral-8: #636057;
  --neutral-9: #bbb7ab; --neutral-10: #cecbbe; --neutral-11: #b9b7b0; --neutral-12: #e9e8e3;
  /* run A · accent ramp */
  --accent-1: #111312; --accent-2: #161b18; --accent-3: #1a251e; --accent-4: #1e2f24;
  --accent-5: #203929; --accent-6: #234430; --accent-7: #29533a; --accent-8: #386e4e;
  --accent-9: #84ca9e; --accent-10: #9addb2; --accent-11: #9bc3a8; --accent-12: #d7efdf;
  /* run B · accent steps 1–4 · paper */
  --paper-1: #131310; --paper-2: #1b1915; --paper-3: #252218; --paper-4: #2e2a1b;
  /* run C · functional */
  --error-3: #331a18;   --error-9: #e1524f;   --error-11: #f49c95;
  --success-3: #152715; --success-9: #5ad664; --success-11: #88cb8a;
  --warning-3: #282113; --warning-9: #dbb155; --warning-11: #cdb482;
  --info-3: #17242d;    --info-9: #5baee5;    --info-11: #90bedf;
  /* semantic aliases */
  --background: var(--paper-2);            /* override: warm dark canvas, outside #0a0a0a–#1a1a1a */
  --surface: var(--paper-3);               /* override: sheets are the lighter step */
  --surface-hover: var(--neutral-4);       /* override: one step above the paper-3 sheet */
  --surface-active: var(--neutral-5);      /* override */
  --border-subtle: var(--neutral-6);
  --border: var(--neutral-7);
  --border-strong: var(--neutral-8);
  --text-secondary: var(--neutral-11);
  --text: var(--neutral-12);
  --accent-bg-subtle: var(--accent-3);
  --accent-solid: var(--accent-9);         /* sage-led dark (palette.mjs default, kept) */
  --accent-solid-hover: var(--accent-10);
  --accent-on-solid: #06100a;              /* run A's value, kept: the label on a sage solid */
  --accent-text: var(--accent-11);
  /* named by the lock */
  --border-interactive: var(--neutral-11);
  --focus-ring: var(--accent-9);
  --shadow-ink: #06100a;                   /* run A accent-on-solid: the darkest green-black the runs produce (C 0.020) */
  color-scheme: dark;
}
```

### Roles per mode

| Role | Light | Dark | Rule |
|---|---|---|---|
| Canvas (page) | `--background` = paper-3 `#f4f1e4` | paper-2 `#1b1915` | the only full-bleed colour; warm in both modes |
| Sheet (panels, dialogs, inputs, the chat panel) | `--surface` = paper-2 `#faf9f3` | paper-3 `#252218` | always the lighter step; one tonal step, never a card inside a card |
| Hover / active rows | `--surface-hover` / `--surface-active` | same aliases | tonal, no colour transition |
| Body text / secondary | `--text` / `--text-secondary` | same | ink is warm near-black, never `#000`; dark text is off-white, never `#fff` |
| Links, accent text, icons that carry the accent | `--accent-text` = accent-11 | accent-11 | links in prose are also underlined (WCAG 1.4.1) |
| The one filled control per region | `--accent-solid` = accent-12 forest, label `--accent-on-solid` = neutral-1 | accent-9 sage, label `#06100a` | hover `--accent-solid-hover`; one per page, dialog or panel |
| Secondary / tertiary controls | outline `--border-interactive`, text `--accent-text` / text only | same | tint on hover `--accent-bg-subtle` |
| Selection, current nav item | `--accent-bg-subtle` + `--accent-text`, a 2 px `--accent-solid` marker | same | no filled chips for state |
| Interactive boundary (inputs, unchecked boxes, grips, unselected chips) | `--border-interactive` = neutral-11 | neutral-11 | ≥ 3:1 by measurement (5.31:1 light, 8.74:1 dark on the canvas); hairlines (`--border-subtle`, `--border`) are dividers only and never a control's only signifier |
| Filter and selection chips | unselected: `--surface` fill, `--border-interactive` border, `--text` label; selected: `--accent-bg-subtle` fill, `--accent-text` border and label (600) | same | role and label chips (not controls) are `--surface-active` with `--text` and no border |
| Focus | `--focus-ring`: 2 px solid, 2 px offset, `:focus-visible` | same | never removed; the ring is the only focus signal and it never animates |
| Status surfaces (alerts, chips, inline status) | `--{error,success,warning,info}-3` background, `-11` for the text **and a shape icon** (check, triangle, cross, i) | same | icon + label always (G1); `-9` only as a dot or small fill beside a label where an icon has no room; in-progress is neutral (`--surface-active` + `--text-secondary` + a ring icon), never primary; alerts carry no coloured left border |
| Shadows | `--shadow-ink` mixes (`§ Space, shape, depth`) | same | forest-tinted in light (C 0.033); green-black, near-neutral, in dark (C 0.020); never pure black |
| Institution logo | neutral black on light surfaces, neutral white on dark surfaces (follows the surface, not the mode; G2) | | never the accent, never the tinted ink |
| Mascot art | its own flat palette (`#234631 #92ae70 #f5f4e8 #ccbd99`), unchanged (G11) | on a light circular backing (Phase 4 registers `companion.backing`) | |

`--accent-9` is not a fill in light mode. If a sage tint is ever needed on a light surface, text on it is `--text` or `--accent-12`.

### Contrast

**palette.mjs reports (verbatim).** Run A (seed 156, muted): PASS [light] neutral-11 on neutral-2 5.65:1 (4.5) · neutral-12 on neutral-2 12.88:1 (7) · neutral-12 on neutral-3 11.98:1 (4.5) · accent-11 on neutral-2 5.52:1 (4.5) · accent-11 on accent-2 5.54:1 (4.5) · accent-on-solid on accent-9 10.05:1 (4.5); PASS [dark] 8.79 · 14.28 · 12.96 · 8.96 · 8.94 · 10.05. Run B (seed 95, muted): PASS [light] 5.68 · 12.91 · 11.99 · 5.67 · 5.67 · 9.73; PASS [dark] 8.76 · 14.26 · 12.95 · 8.78 · 8.77 · 9.73. Run C (seed 156, balanced): PASS [light] 5.65 · 12.88 · 11.98 · 5.44 · 5.46 · 10.26; PASS [dark] 8.79 · 14.28 · 12.96 · 9.07 · 9.04 · 10.26. All three runs exit 0.

**Explicit pairs on the locked roles** (WCAG 2.x, computed from the hex values above; reproduced live on the swatch sheet). 76 pairs, 0 failures (the two "filter chip, unselected" rows were added in review fix round 1; the eight rendered pairs marked "fix round 2", hover labels and secondary text on the hover, active and tint surfaces, in round 2). Text targets: 7:1 for body on canvas and sheet (AAA by construction), 4.5:1 elsewhere; non-text 3:1.

| Mode | Pair (role) | Values | Ratio | Target | Result |
|---|---|---|---|---|---|
| light | text on background | `neutral-12` #2f2e2a on `paper-3` #f4f1e4 | 12.01:1 | ≥ 7 | PASS |
| light | text on surface | `neutral-12` #2f2e2a on `paper-2` #faf9f3 | 12.89:1 | ≥ 7 | PASS |
| light | text on surface-hover | `neutral-12` #2f2e2a on `neutral-3` #f1f0ed | 11.93:1 | ≥ 4.5 | PASS |
| light | text on surface-active | `neutral-12` #2f2e2a on `neutral-4` #e9e8e4 | 11.09:1 | ≥ 4.5 | PASS |
| light | text-secondary on background | `neutral-11` #65635c on `paper-3` #f4f1e4 | 5.31:1 | ≥ 4.5 | PASS |
| light | text-secondary on surface | `neutral-11` #65635c on `paper-2` #faf9f3 | 5.70:1 | ≥ 4.5 | PASS |
| light | text-secondary on surface-hover | `neutral-11` #65635c on `neutral-3` #f1f0ed | 5.28:1 | ≥ 4.5 | PASS · fix round 2 |
| light | text-secondary on surface-active (neutral status chip) | `neutral-11` #65635c on `neutral-4` #e9e8e4 | 4.90:1 | ≥ 4.5 | PASS · fix round 2 |
| light | text-secondary on accent-bg-subtle | `neutral-11` #65635c on `accent-3` #e6f5eb | 5.33:1 | ≥ 4.5 | PASS · fix round 2 |
| light | accent-text (links) on background | `accent-11` #486d56 on `paper-3` #f4f1e4 | 5.16:1 | ≥ 4.5 | PASS |
| light | accent-text (links) on surface | `accent-11` #486d56 on `paper-2` #faf9f3 | 5.53:1 | ≥ 4.5 | PASS |
| light | accent-text on accent-bg-subtle | `accent-11` #486d56 on `accent-3` #e6f5eb | 5.18:1 | ≥ 4.5 | PASS |
| light | accent-on-solid on accent-solid (button label) | `neutral-1` #fdfdfc on `accent-12` #203327 | 13.19:1 | ≥ 4.5 | PASS |
| light | accent-on-solid on accent-solid-hover (hover label) | `neutral-1` #fdfdfc on `accent-11` #486d56 | 5.74:1 | ≥ 4.5 | PASS · fix round 2 |
| light | accent-solid boundary vs background (non-text) | `accent-12` #203327 on `paper-3` #f4f1e4 | 11.86:1 | ≥ 3 | PASS |
| light | accent-solid boundary vs surface (non-text) | `accent-12` #203327 on `paper-2` #faf9f3 | 12.73:1 | ≥ 3 | PASS |
| light | accent-solid-hover boundary vs surface (non-text) | `accent-11` #486d56 on `paper-2` #faf9f3 | 5.53:1 | ≥ 3 | PASS |
| light | border-interactive vs background (non-text) | `neutral-11` #65635c on `paper-3` #f4f1e4 | 5.31:1 | ≥ 3 | PASS |
| light | border-interactive vs surface (non-text) | `neutral-11` #65635c on `paper-2` #faf9f3 | 5.70:1 | ≥ 3 | PASS |
| light | filter chip, unselected: border-interactive boundary vs background (non-text) | `neutral-11` #65635c on `paper-3` #f4f1e4 | 5.31:1 | ≥ 3 | PASS · fix round 1 |
| light | focus-ring vs background (non-text) | `accent-11` #486d56 on `paper-3` #f4f1e4 | 5.16:1 | ≥ 3 | PASS |
| light | focus-ring vs surface (non-text) | `accent-11` #486d56 on `paper-2` #faf9f3 | 5.53:1 | ≥ 3 | PASS |
| light | error-11 on neutral-2 | `error-11` #974843 on `neutral-2` #f9f9f7 | 5.99:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| light | error-11 on error-3 | `error-11` #974843 on `error-3` #ffebe9 | 5.51:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| light | error-11 on background | `error-11` #974843 on `paper-3` #f4f1e4 | 5.58:1 | ≥ 4.5 | PASS |
| light | error-11 on surface | `error-11` #974843 on `paper-2` #faf9f3 | 5.99:1 | ≥ 4.5 | PASS |
| light | success-11 on neutral-2 | `success-11` #337437 on `neutral-2` #f9f9f7 | 5.39:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| light | success-11 on success-3 | `success-11` #337437 on `success-3` #e0f8e0 | 5.05:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| light | success-11 on background | `success-11` #337437 on `paper-3` #f4f1e4 | 5.02:1 | ≥ 4.5 | PASS |
| light | success-11 on surface | `success-11` #337437 on `paper-2` #faf9f3 | 5.39:1 | ≥ 4.5 | PASS |
| light | warning-11 on neutral-2 | `warning-11` #76602f on `neutral-2` #f9f9f7 | 5.72:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| light | warning-11 on warning-3 | `warning-11` #76602f on `warning-3` #f9f0dd | 5.32:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| light | warning-11 on background | `warning-11` #76602f on `paper-3` #f4f1e4 | 5.32:1 | ≥ 4.5 | PASS |
| light | warning-11 on surface | `warning-11` #76602f on `paper-2` #faf9f3 | 5.71:1 | ≥ 4.5 | PASS |
| light | info-11 on neutral-2 | `info-11` #3d6886 on `neutral-2` #f9f9f7 | 5.65:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| light | info-11 on info-3 | `info-11` #3d6886 on `info-3` #e3f3ff | 5.26:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| light | info-11 on background | `info-11` #3d6886 on `paper-3` #f4f1e4 | 5.27:1 | ≥ 4.5 | PASS |
| light | info-11 on surface | `info-11` #3d6886 on `paper-2` #faf9f3 | 5.65:1 | ≥ 4.5 | PASS |
| dark | text on background | `neutral-12` #e9e8e3 on `paper-2` #1b1915 | 14.31:1 | ≥ 7 | PASS |
| dark | text on surface | `neutral-12` #e9e8e3 on `paper-3` #252218 | 12.96:1 | ≥ 7 | PASS |
| dark | text on surface-hover | `neutral-12` #e9e8e3 on `neutral-4` #2b2a27 | 11.70:1 | ≥ 4.5 | PASS |
| dark | text on surface-active | `neutral-12` #e9e8e3 on `neutral-5` #33322e | 10.46:1 | ≥ 4.5 | PASS |
| dark | text-secondary on background | `neutral-11` #b9b7b0 on `paper-2` #1b1915 | 8.74:1 | ≥ 4.5 | PASS |
| dark | text-secondary on surface | `neutral-11` #b9b7b0 on `paper-3` #252218 | 7.92:1 | ≥ 4.5 | PASS |
| dark | text-secondary on surface-hover | `neutral-11` #b9b7b0 on `neutral-4` #2b2a27 | 7.15:1 | ≥ 4.5 | PASS · fix round 2 |
| dark | text-secondary on surface-active (neutral status chip) | `neutral-11` #b9b7b0 on `neutral-5` #33322e | 6.39:1 | ≥ 4.5 | PASS · fix round 2 |
| dark | text-secondary on accent-bg-subtle | `neutral-11` #b9b7b0 on `accent-3` #1a251e | 7.88:1 | ≥ 4.5 | PASS · fix round 2 |
| dark | accent-text (links) on background | `accent-11` #9bc3a8 on `paper-2` #1b1915 | 9.00:1 | ≥ 4.5 | PASS |
| dark | accent-text (links) on surface | `accent-11` #9bc3a8 on `paper-3` #252218 | 8.15:1 | ≥ 4.5 | PASS |
| dark | accent-text on accent-bg-subtle | `accent-11` #9bc3a8 on `accent-3` #1a251e | 8.11:1 | ≥ 4.5 | PASS |
| dark | accent-on-solid on accent-solid (button label) | `#06100a` on `accent-9` #84ca9e | 10.06:1 | ≥ 4.5 | PASS |
| dark | accent-on-solid on accent-solid-hover (hover label) | `#06100a` on `accent-10` #9addb2 | 12.30:1 | ≥ 4.5 | PASS · fix round 2 |
| dark | accent-solid boundary vs background (non-text) | `accent-9` #84ca9e on `paper-2` #1b1915 | 9.13:1 | ≥ 3 | PASS |
| dark | accent-solid boundary vs surface (non-text) | `accent-9` #84ca9e on `paper-3` #252218 | 8.27:1 | ≥ 3 | PASS |
| dark | accent-solid-hover boundary vs surface (non-text) | `accent-10` #9addb2 on `paper-3` #252218 | 10.12:1 | ≥ 3 | PASS |
| dark | border-interactive vs background (non-text) | `neutral-11` #b9b7b0 on `paper-2` #1b1915 | 8.74:1 | ≥ 3 | PASS |
| dark | border-interactive vs surface (non-text) | `neutral-11` #b9b7b0 on `paper-3` #252218 | 7.92:1 | ≥ 3 | PASS |
| dark | filter chip, unselected: border-interactive boundary vs background (non-text) | `neutral-11` #b9b7b0 on `paper-2` #1b1915 | 8.74:1 | ≥ 3 | PASS · fix round 1 |
| dark | focus-ring vs background (non-text) | `accent-9` #84ca9e on `paper-2` #1b1915 | 9.13:1 | ≥ 3 | PASS |
| dark | focus-ring vs surface (non-text) | `accent-9` #84ca9e on `paper-3` #252218 | 8.27:1 | ≥ 3 | PASS |
| dark | error-11 on neutral-2 | `error-11` #f49c95 on `neutral-2` #1a1918 | 8.39:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| dark | error-11 on error-3 | `error-11` #f49c95 on `error-3` #331a18 | 7.71:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| dark | error-11 on background | `error-11` #f49c95 on `paper-2` #1b1915 | 8.39:1 | ≥ 4.5 | PASS |
| dark | error-11 on surface | `error-11` #f49c95 on `paper-3` #252218 | 7.60:1 | ≥ 4.5 | PASS |
| dark | success-11 on neutral-2 | `success-11` #88cb8a on `neutral-2` #1a1918 | 9.16:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| dark | success-11 on success-3 | `success-11` #88cb8a on `success-3` #152715 | 8.22:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| dark | success-11 on background | `success-11` #88cb8a on `paper-2` #1b1915 | 9.16:1 | ≥ 4.5 | PASS |
| dark | success-11 on surface | `success-11` #88cb8a on `paper-3` #252218 | 8.30:1 | ≥ 4.5 | PASS |
| dark | warning-11 on neutral-2 | `warning-11` #cdb482 on `neutral-2` #1a1918 | 8.73:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| dark | warning-11 on warning-3 | `warning-11` #cdb482 on `warning-3` #282113 | 7.93:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| dark | warning-11 on background | `warning-11` #cdb482 on `paper-2` #1b1915 | 8.73:1 | ≥ 4.5 | PASS |
| dark | warning-11 on surface | `warning-11` #cdb482 on `paper-3` #252218 | 7.91:1 | ≥ 4.5 | PASS |
| dark | info-11 on neutral-2 | `info-11` #90bedf on `neutral-2` #1a1918 | 8.88:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| dark | info-11 on info-3 | `info-11` #90bedf on `info-3` #17242d | 8.00:1 | ≥ 4.5 | PASS · DW-2.3 explicit |
| dark | info-11 on background | `info-11` #90bedf on `paper-2` #1b1915 | 8.87:1 | ≥ 4.5 | PASS |
| dark | info-11 on surface | `info-11` #90bedf on `paper-3` #252218 | 8.04:1 | ≥ 4.5 | PASS |

**Informational (measured, and the reason for a rule).** Light `accent-9` as a boundary on the canvas 1.70:1 (hence the forest solid in light). Hairlines `neutral-7` 1.56:1 light / 1.95:1 dark against the canvas (dividers only, never an interactive boundary). Light functional `-9` solids against the canvas: error 3.36 PASS, success 1.65, warning 1.78, info 2.15 (a `-9` is a fill or a dot beside an icon and a label, never a lone boundary; `-11` is the text and icon colour). Dark `-9` solids: 4.61–9.39, all pass.

### G1: success stays green, separated by chroma and form

`--success-9 #5ad664` is OKLCH L 0.781 **C 0.190** H 144.9. The dark filled control `--accent-9 #84ca9e` is L 0.780 C 0.095 H 155.9 (success has 2.0× its chroma); the light filled control `--accent-12 #203327` is C 0.033 (5.8×). Hue offset, measured on the tokens: 155.9° (accent-9) − 144.9° (success-9) = **11.0°**, the same in both modes because `palette.mjs` fixes the functional hue at 145° and the accent at the pin (the pin itself is 156.0°; the rendered solid sits at 155.9°). Form separates them further: primary appears only on interactive controls (filled, outlined, text, focus, selection); success appears only on status surfaces, always with an icon and a label; in-progress is neutral text plus a small progress indicator, never primary or success.

### Functional colour usage

- `-3`: the surface of an alert, chip or inline status; `-11`: its text **and its shape icon** (check for success, triangle for warning, cross for error, i for info; ≥ 4.5:1 on `-3`, on `neutral-2`, on the canvas and on the sheet in both modes, measured above); `-9`: a dot or a small fill beside a label where an icon has no room (a sidebar presence dot, a progress dot), never alone. Alerts carry no coloured left border (`§ Space, shape, depth`): the `-3` surface, the icon and the label carry the status.
- Never the only signal (G1; color ch08): every status carries an icon and a label; red/green are never the sole differentiator.
- Red (`--error-*`) is for errors and destructive confirmation only; it never appears in analytical views (color ch09; Phase 6).
- Blue (`--info-*`) is the information colour; blue text that is not a link is never body text.
- Chart colours are Phase 6 (`chart.*`); the purple → pink → red → orange → grey series of today is retired with the rest of the purple.

## Space, shape, depth

- **Spacing scale** (4 px base): `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-5: 24px`, `--space-6: 32px`, `--space-7: 48px`, `--space-8: 64px`. Reading columns separate blocks with `--space-3` inside a message and `--space-5` between messages, as margins (never vertical padding on text blocks, so the ruler's ticks stop with the last line); tool chrome uses 8 and 12 inside controls, 16 between groups, 24 and 32 between sections. Tight within a group, generous between groups; the same value is never used everywhere. Density deltas (comfortable and compact) are Phase 3 semantic tokens and change the step a role uses, not the scale.
- **Radius:** `--radius-control: 2px` (buttons, inputs, chips, menus), `--radius-sheet: 2px` (panels, dialogs, the chat panel), `0` on tables and hairline-framed regions, `50%` only on status dots and the mascot's dark-mode backing circle. No pills except where a control is a true toggle group (Phase 3 decides). The mascot tile keeps its own 24 % corner (artwork).
- **Borders:** hairlines first. `--border-subtle` for row dividers and section rules, `--border` for panel edges, `--border-strong` for the ruler and emphasis rules; all three are decorative (below 3:1 by design) and never a control's only signifier. `--border-interactive` is the only border that identifies a control, and every control that is identified by a border uses it: inputs, the composer field, unchecked checkboxes and radios, unselected filter chips, resize grips. Rules are 1 px; the ruler's ticks are 1 px × 6 px. No coloured left borders on alerts or cards (status is the `-3` surface + icon + label; a selected row's 2 px `--accent-solid` marker is the one inset edge), no boxes around display math (the mock checkpoint's `nested-cards` false positive): display math renders bare, centred, with overflow scroll.
- **Controls are not cards.** A control's `--border-interactive` boundary inside a sheet (an input or the composer field inside the chat panel) is a signifier, not a container, and sheet-on-canvas is one tonal step; neither is a card inside a card. The Phase 3 lint and the review detector configuration must whitelist control boundaries inside sheets and flag only container-in-container nesting.
- **Gradient syntax:** hard-stop `linear-gradient` and `repeating-linear-gradient` are permitted only to draw 1 px rules and the ruler's ticks, and the skeleton shimmer's highlight is the one permitted moving gradient (a loading state, not a fill). No visible gradient fill exists anywhere.
- **Depth order:** tonal step → hairline → shadow. Docked and inline surfaces (snap-mode chat, side rails, tables) never cast a shadow. Only floating surfaces do:
  - `--shadow-1: 0 1px 2px color-mix(in oklab, var(--shadow-ink) 14%, transparent)` for menus, popovers, the slash-command menu, tooltips;
  - `--shadow-2: 0 1px 2px color-mix(in oklab, var(--shadow-ink) 8%, transparent), 0 12px 32px -12px color-mix(in oklab, var(--shadow-ink) 26%, transparent)` for the chat panel in modal and side modes, dialogs, the floating launcher.
  Both are declared in the `:root` block and again in the `[data-theme="dark"]` block, because they embed `--shadow-ink` (`§ Signature move`, implementation note). Two depths, two different alphas (no uniform 0.1-opacity shadows). `--shadow-ink` is forest `#203327` (C 0.033, a visible shift toward the accent) in light and the green-black `#06100a` (C 0.020) in dark: a slight shift, near-neutral in practice, because a dark canvas leaves a shadow little room to show hue; never pure black. The implementation may precompute the mixes as `rgba()` for MUI.
- **No pure black, no pure white.** The darkest value in the system is `#06100a` (the label on a sage solid, dark mode); the lightest is `#fefdf9` (`--paper-1`). Ink is `#2f2e2a`, dark-mode text `#e9e8e3`. The institution logo is the one exception by rule (neutral black or white, G2), and the mascot's cream `#f5f4e8` is artwork.
- **Paper stays paper (G5):** PDF pages, templated-email previews and Kiwi App iframes keep their own rendering in dark mode; their frames and toolbars follow the mode. In dark mode the page may be dimmed to no less than 92 % (`opacity: .92` on the page canvas, which lets the dark frame show through) to cut glare; content is never inverted, tinted or recoloured. Code editors, code blocks and output consoles are not paper and follow the mode.
- **Backdrops:** dialog and modal backdrops are `--shadow-ink` at 40 % (light) / 60 % (dark), never a neutral grey wash; no blur.
- **Elevation of the launcher:** `--shadow-2`, 56 px, `--accent-solid` fill with `--accent-on-solid` icon; its resting offset is a Phase 3 token and its position stays Stage 2.

## Motion

Non-mascot budget. The mascot's states and motion are Phase 4 and must respect everything here.

- **Timing:** micro 150 ms (hover and press feedback where a transform is involved, toggle thumb travel, focus-visible appearance is instant), standard 220 ms (menus and popovers opening, the chat panel opening and closing in any mode, dialogs, toasts entering), orchestration none (no staggered list reveals, no page or route transitions, no scroll-driven effects). Exits are 20 % shorter than entries.
- **Easing character:** quick departure, soft arrival. Entries `cubic-bezier(.16, 1, .3, 1)` (ease-out-expo); exits `cubic-bezier(.7, 0, .84, 0)` (ease-in-expo); toggles and position swaps `cubic-bezier(.65, 0, .35, 1)`. Never bounce or elastic; no curve overshoots 1.
- **What moves:** only `opacity` and `transform`, with one sanctioned exception: a collapse (an accordion, an expandable section, the agent-step chain) animates `grid-template-rows: 0fr → 1fr` on its grid wrapper, never `height`. The chat panel fades and translates 8 px (side and modal modes) or scales 0.98 → 1 (fullscreen); menus fade and translate 4 px; toasts translate 8 px from the bottom edge; the toggle thumb translates; pressed buttons scale 0.98 for 150 ms; the loading indicator is the existing text dots (no spinner) and skeletons may shimmer with a 1.6 s `translateX` sweep.
- **What never moves:** reading surfaces (answers, materials lists, PDF pages, the not-found and empty-state copy: no entrance animation, ever); streamed text (it appears as it arrives, unanimated); tables and rows; the ruler; the top bar; backgrounds (there are no gradient fills; the skeleton shimmer is the one permitted moving gradient, on skeletons only); colour changes (hover, selection and state tints switch instantly rather than tween); focus rings (appear instantly); `width`, `height`, `margin`, `padding`, `top`, `left` (never animated; collapses use `grid-template-rows: 0fr → 1fr`).
- **Hierarchy:** one moving thing per view at a time; while an answer streams nothing else animates in the panel (Phase 4's one-mover rule extends to chrome).
- **prefers-reduced-motion:** `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }` on every surface; the shimmer becomes a static placeholder; the panel appears in place. The Display menu's animation switch (G4) governs the mascot, not this budget; this budget is small enough to leave on.

## Never (this project's tells at risk)

- **Nested cards.** No card inside a card, no panel inside a panel with its own border and radius. Hierarchy comes from one tonal step (`--surface` on `--background`) and hairlines. This is the dominant Fable 5 default and the first thing a review checks. Controls are not cards: an input's or the composer field's `--border-interactive` boundary inside a sheet is a control signifier and is not a nesting violation (`§ Space, shape, depth`); the lint flags container-in-container only.
- **The purple triplet and the old purple.** `#6366F1`, `#8B5CF6`, `#A855F7`, Material Design 2014 purple (`#6a1b9a`, `#7b1fa2`, `#5C3B6E`) and purple or pink chart series: nowhere, including the outgoing email templates and charts. Purple is banned everywhere.
- **The dark + acid-green cluster.** The dark canvas stays warm `--paper-2 #1b1915` (never `#0a0a0a`–`#1a1a1a` flat near-black); the accent stays muted sage (C 0.095) and never a neon or acid green; no glow shadows.
- **Decorative gradients, glows and glass.** No visible gradient fill anywhere (the course-list hero's rotating gradient and the Experiment Assistant's purple → dark header go), no gradient text, no `backdrop-filter`, no translucent panels, no colored glows. The only permitted gradient syntax is the hard-stop `linear-gradient` that draws 1 px rules and the ruler's ticks, and the skeleton shimmer's highlight.
- **Sparkle-as-AI icons.** No sparkles, stars or "magic" glyphs to signal AI; the mascot is the AI's face and progress is stated in words.
- **Cream + serif + terracotta.** This DNA sits one serif away from that cluster: no serif anywhere (not for headings, not for answer prose), no terracotta, clay or orange tint on any surface; `--warning-*` is a status colour only, never a decorative accent.
- **A second accent hue.** Forest/sage is the only accent; blue is `--info-*` on status surfaces and links are green, not blue; functional colours never style controls (no green switches, no purple chips).
- **Pure black and pure white** as UI colours (`#000`, `#fff`); the darkest UI value is `#06100a`, the lightest `#fefdf9`.
- **The safe sans.** Inter, Roboto, Open Sans, Lato, Arial, Helvetica, Space Grotesk, Instrument Sans as UI faces; Montserrat outside the wordmark; system-ui as the primary face.
- **Faux typography.** No faux bold or italic (`font-synthesis: none` at the root; CJK emphasis is upright weight 600, never an obliqued PingFang or YaHei), no stretched type, no CSS capitals (`text-transform: uppercase`) on labels or buttons, no justified text, no more than two sizes of radius.
- **Everything in filled chips.** Status is `-3` surface + `-11` text + icon; role chips are neutral; at most one filled primary per region; no filled control for in-progress or success.
- **Motion tells.** No bounce or elastic easing, no fade-in-from-below on reading surfaces, no hover effects on everything, no scroll-triggered reveals, no animated width/height.
- **Copy tells** (Phase 5 owns the words; the tokens never carry them): no exclamation marks, no three-beat slogans, no "Kiwi Platform", no "whitelist".

## Open questions

- **Paper dimming value in dark mode** (G5 detail): 92 % proposed; confirmed on the Phase 7 dark mocks of the materials page.
- **The ruler at 390 px:** the column padding drops to 12 px and the ticks stay; verified on the Phase 7 phone-width chat render (DW-7.3), not here.
- **The ruler below the `lh` support floor:** the rule is drawn and the ticks are not (Chrome/Edge < 109, Safari < 16.4, Firefox < 120). Phase 7 renders the chat mock with a Latin and a CJK-dominant block in a current Chrome and Safari to confirm the ticks follow each block's leading; the implementation feature-tests `background-size: 1lh`. Owner: Phase 7 for the check, the implementation plan for the test.
- **Dark canvas tint:** `--paper-2 #1b1915` has chroma 0.008 and may read as near-black on some displays, with the warmth carried by the `#252218` sheet. The user judges it at confirmation. If it reads as black, the fix is a re-run of run B with a different seed or chroma, never a hand-edited value.
- **`tnum` in the self-hosted file:** Source Sans 3 ships `tnum`; the implementation's typography test should assert the feature is present in the subset it serves (the `@fontsource-variable` latin files keep it).
- **Public token names** for the paper ramp and the per-mode aliases in `public/kiwi-design-tokens.css` (light-only in Stage 1, names kept): Phase 3's generation spec maps them; the deprecation list covers the purple-era values.
- **Editor and syntax themes (brief OQ3) and the icon policy (OQ4):** Phase 3, from these tokens.
- **Shadow mixes for MUI:** `color-mix` is a spec convenience; Phase 3 may precompute `rgba()` values from `--shadow-ink`.

## Reserved for later phases

Appended, never edited into the sections above: `## Design system` (Phase 3: DTCG tiers, `semantic.*`, components, density, generation spec, governance), `## Companion` (Phase 4: `companion.slot.*`, `companion.backing`, states, placements), `## Voice and tone` (Phase 5), `## Chart tokens` (Phase 6: `chart.*`).
