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

## Design system

**Phase 3 (2026-10-16), appended under the lock; fix rounds 1 to 6 and the follow-up after review round 7 applied on 2026-10-16 and 2026-10-17.** This section turns the locked DNA into a token machine and specifies every shared component. It adds nothing to the sections above and changes no locked value or wording; it registers roles under `semantic.*` and component tokens under `component.*`, and `chart.*` (Phase 6) and `companion.*` (Phase 4) stay reserved. Plan: `.design-foundations/plans/2026-10-16-kiwi-ui-stage-1.md`, Phase 3 (DW-3.1 to DW-3.9). Doctrine applied: design-systems (three-tier tokens, Frost's composition model, Kholmatova's functional/perceptual lens, governance), usability (Nielsen 1, 4, 5, 8, 9; Fitts; recognition over recall), interaction (the eight states, `:focus-visible`, disabled-with-reason, destructive safety, roving tabindex), responsive (content-driven breakpoints, container queries, adapt-not-amputate, 44 px targets on coarse pointers).

**Where the machine lives.** Design-side artefacts; the implementation plan ports them into `kiwi-ui/src/theme/` and the test suite. Every path in the scripts is relative to the script or the repository root.

| Artefact | Path | Role |
|---|---|---|
| The DTCG source | `.design-foundations/tokens/kiwi-ui.tokens.json` | One file, three tiers (`global`, `semantic`, `component`) plus the reserved `chart` and `companion` groups; the public-CSS map with the pinned v1 name list, the allowlist, the banned-hex list and the deprecation policy in `$extensions["org.kiwi"]`. |
| The reference emitter | `.design-foundations/tokens/build-tokens.mjs` with `tokens-lib.mjs` | Emits `generated/kiwi-ui.tokens.css` (the internal CSS, 1287 custom properties on `:root`, redeclared per colour mode, per density and per pointer), `generated/kiwi-design-tokens.public.css` (the public contract preview: 161 names, every v1 class and keyframe), `generated/mui-theme.json` (the MUI theme preview, with the interim `palette.chart`) and `generated/code-themes/` (the Ace themes, the Prism style object and the console CSS). The generation spec below is what it implements. |
| The checks | `.design-foundations/tokens/check-tokens.mjs` → `generated/contrast-report.md` and `generated/check-summary.json`; beside it `coarse-audit.mjs` and `forced-audit.mjs` drive headless Chrome over the DevTools protocol (`tools/cdp.mjs`, Chrome from `$CHROME` or the usual install locations) and write `generated/coarse-audit.json` and `generated/forced-audit.json` | Alias equality against the locked block; structure (20 components, 8 states each); per-state contrast in both modes; the tier rule and the component-literal allowlist (only marked, component-specific literals); the deprecation schedule for names, classes and keyframes; the per-mode, per-density and coarse-pointer closure of the emitted CSS; literal policy and banned hex; public coverage against the pinned v1 names, classes and keyframes; density deltas; density-invariant components; the selection and pressed cues (every toggle-like variant carries a non-colour cue that clears 3:1 against the selected and the unselected fills); the frozen on-paper literals against their light sources; the interim chart series at 3:1 on the surface in both modes; the editor selection (a visible tint that differs from the active line, a 1 px outline at 3:1 against the surface and the active line, every syntax colour at 4.5:1 on the selection, the generated Ace rule carrying both); the public CSS's scoped reduced-motion guard (every animated or transitioned selector stilled, no universal selector, no `!important`); the MUI grey override (§ 19: `palette.grey` equals the neutral ramp per mode and `palette.common` the G2 pair, both schemes). Exit 0 on 2026-10-17; every count it reports is written to `generated/check-summary.json`, whose `source` names the token version, its content hash and the commit (derived at run time, never typed). |
| The render evidence | `.design-foundations/mocks/component-sheet.html`; `.design-foundations/mocks/screenshots/component-sheet.1440x900.png`, `component-sheet.1280x800.png`, `component-sheet.1440.full.png` | Every component in its eight states, light and dark, comfortable and compact, plus the coarse-pointer and forced-colours exhibits (918 exhibits in 23 sections). The sheet's first style block is the emitter's output pasted verbatim, and the page audits itself (`§ Evidence`). |

### Token tiers (W3C DTCG)

Three tiers in one DTCG file (W3C Design Tokens format, stable Oct 2025): `$type` and `$value` per token; `$description` on every group that carries a rule (components, their states and variants, the semantic role groups: 284 of 330 groups) and on 230 of the 1242 leaf tokens, since a ramp step or a part of a described state is named by its path (counted by `check-tokens.mjs`); dotted paths, curly-brace references. Three orthogonal axes ride the Cobalt/Terrazzo `$extensions.mode` convention, because the format has no native modes: `$value` is the light / comfortable / fine-pointer value; `$extensions.mode.dark`, `.compact` and `.coarse` hold the overrides. A colour token never has density or pointer modes, a dimension token never has colour modes, so a theme is resolved as the triple (colour mode, density, pointer) by `mode[pointer] ?? mode[colourMode] ?? mode[density] ?? $value` (a coarse pointer wins: a hit area is 44 px whatever the density), and every combination exists by construction. References re-resolve in the context that resolves them.

- **Tier 1, `global.*`:** the locked block, verbatim (the three recorded `palette.mjs` runs, spliced), plus the locked type scale, leading, weights, tracking, measures, space scale, radii and the motion budget. Values change only by re-running `palette.mjs` and re-confirming the lock (`§ Color tokens`). Globals are emitted only under their locked CSS names (`--neutral-1`, `--accent-12`, `--paper-3`, `--error-11`, `--text-xs`, `--space-5`, `--radius-control`, `--font-ui`, `--font-mono`, …; the lock's measured literal `#06100a` is `global.color.green-black` and is never emitted as a property of its own).
- **Tier 2, `semantic.*`:** roles. The `palette.mjs` aliases are carried as references to the globals they point at in the lock, so they are identical by construction and the checker proves it; the additions are registered here. Semantic tokens may reference semantic tokens (`in-progress.surface` = `surface-active` says what it means).
- **Tier 3, `component.*`:** one group per listed component plus the PDF viewer, with its geometry and elevation tokens and a `state` group of exactly eight states (`default`, `hover`, `focus`, `active`, `disabled`, `loading`, `error`, `success`), plus a `variant` group for persistent conditions (selected, current, on, checked, read-only, the status kinds, the paper marks). **Component tokens reference semantic tokens only**: never a global, never another component (design-systems foundations: a component → component reference cascades at theme time); `check-tokens.mjs` enforces it (923 component-tier references, 0 outside the semantic tier).
- **Reserved:** `chart.*` and `companion.*` are empty groups with a description; Phases 6 and 4 append to them and never edit the three tiers.

**CSS names (the generation spec's naming rule).** Carried aliases keep their locked names (`--background`, `--accent-solid`, `--border-interactive`, …). Semantic additions are `--<group>-<path>` with the `color` group elided: `--status-error-surface`, `--selection-bg`, `--destructive-text`, `--disabled-icon`, `--on-paper-pin`, `--editor-bg`, `--syntax-string`, `--console-stderr`, `--shadow-1`, `--space-inset-x`, `--size-control`, `--size-hit-icon`, `--type-body-size` (composites emit one property per field: `-family`, `-size`, `-leading`, `-weight`, `-tracking`, `-numeric`), `--type-weight-regular`, `--motion-standard`, `--motion-ease-enter`, `--z-launcher`, `--opacity-paper-dim`, `--border-width-focus`; pass-through roles that would collide with a locked name (`semantic.measure.*`, `semantic.radius.*`) are not re-emitted. Component tokens are `--<component>[-<variant>][-<state>]-<part>` with `default` elided and `variant` kept: `--button-primary-fill`, `--button-primary-hover-fill`, `--chip-status-variant-error-fill`, `--switch-variant-on-track`, `--launcher-shadow`, `--pdf-toolbar-variant-pin-visible-fill`.

#### Tier 2 — the carried aliases (identical to the locked block in both modes)

| Alias (CSS name) | Light → | Dark → | Role (as locked) |
|---|---|---|---|
| `--background` | `paper-3` | `paper-2` | the canvas |
| `--surface` | `paper-2` | `paper-3` | sheets: panels, dialogs, inputs, the chat panel |
| `--surface-hover` | `neutral-3` | `neutral-4` | hover rows and controls |
| `--surface-active` | `neutral-4` | `neutral-5` | pressed rows, role chips, disabled fills, the in-progress surface |
| `--border-subtle` | `neutral-6` | `neutral-6` | row dividers and section rules (decorative) |
| `--border` | `neutral-7` | `neutral-7` | panel edges (decorative) |
| `--border-strong` | `neutral-8` | `neutral-8` | the ruler and emphasis rules (decorative) |
| `--text-secondary` | `neutral-11` | `neutral-11` | secondary text, resting chrome icons, disabled labels |
| `--text` | `neutral-12` | `neutral-12` | ink |
| `--accent-bg-subtle` | `accent-3` | `accent-3` | selection tint, tertiary hover |
| `--accent-solid` | `accent-12` | `accent-9` | the one filled control per region |
| `--accent-solid-hover` | `accent-11` | `accent-10` | its hover |
| `--accent-on-solid` | `neutral-1` | `#06100a` | its label |
| `--accent-text` | `accent-11` | `accent-11` | links, accent text and icons, secondary and tertiary labels |
| `--border-interactive` | `neutral-11` | `neutral-11` | the ≥ 3:1 boundary of every control identified by a border |
| `--focus-ring` | `accent-11` | `accent-9` | 2 px solid, 2 px offset, `:focus-visible` |
| `--shadow-ink` | `accent-12` | `#06100a` | the shadow colour |

`check-tokens.mjs` resolves every declaration of the locked `:root` and `[data-theme="dark"]` blocks from the DTCG source and compares them hex for hex: **114 of 114 equal** (57 tokens per mode: the ramps and the aliases).

#### Tier 2 — the additions registered under `semantic.*`

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `semantic.color.link` | `accent-text` | same | links in prose (underlined, WCAG 1.4.1) and chrome |
| `semantic.color.accent-solid-active` | `green-black` `#06100a` (the system's darkest value) | `accent-12` | the pressed fill of filled controls (the primary, the launcher, the empty frame's CTA): one step beyond hover, away from the surface, so pressed is told from hovered by fill and not by the 0.98 scale alone; in dark the step is monotonic too (solid `accent-9` → hover `accent-10` → pressed `accent-12`, 1.30:1 against the hover), with `--accent-on-solid` at 15.9:1 on it |
| `semantic.color.accent-bg-subtle-active` | `accent-4` | `accent-4` | the pressed tint of secondary and tertiary controls, one step past the accent-3 hover tint (the functional ramps have no fourth step, so the outlined destructive keeps `error-3` on press) |
| `semantic.color.selection.{bg, text, marker}` | `accent-bg-subtle`, `accent-text`, `accent-solid` | same | the lock's selection rule: tint + accent text + a 2 px solid marker; also the on/checked state of switches, checkboxes and radios |
| `semantic.color.destructive.{text, bg-subtle}` | `error-11`, `error-3` | same | the outlined destructive control and its hover tint |
| `semantic.color.status.{error, success, warning, info}.{surface, text, dot}` | `-3`, `-11`, `-9` | same | status surfaces (G1): surface + text and shape icon; the dot only beside a label |
| `semantic.color.in-progress.{surface, text, bar, track}` | `surface-active`, `text-secondary`, `border-interactive`, `surface-active` | same | in progress is neutral (TD-29): static dashed-ring icon, text dots, a neutral progress bar |
| `semantic.color.disabled.{surface, text, border, icon}` | `surface-active`, `text-secondary`, `border`, `border-strong` | same | disabled controls (WCAG-exempt; a disabled *label* stays in `--disabled-text`, ≥ 4.5 by measurement; only icon-only glyphs drop to `--disabled-icon`) |
| `semantic.color.fill-none` | `transparent` | same | the transparent fill of text-only and canvas-level components (tertiary buttons, icon buttons, tabs, rows, the empty frame, the tutor row): a role, so the component tier carries no literal |
| `semantic.color.skeleton.{base, highlight}` | `surface-active`, `surface` | same | loading placeholders; the shimmer is the one permitted moving gradient |
| `semantic.color.icon.{default, hover, accent}` | `text-secondary`, `text`, `accent-text` | same | icons are `currentColor`; these are the resting, hover and accent colours in chrome |
| `semantic.color.paper-frame` | `border` | same | the frame around paper (PDF pages, email previews, app iframes), following the mode (G5, TD-08) |
| `semantic.color.on-paper.{page, pin, chunk, wash}` | `#ffffff`, `#203327`, `#65635c`, `#2033271f` | **same (frozen)** | marks drawn on the white PDF page, which keeps its rendering in dark mode (G5): the page itself (content, not a UI colour), comment pins and the selected chunk (light `--accent-12`, 13.9:1 on the page), chunk and drag boxes (light `--neutral-11`, 6.2:1), the selected chunk's 12 % wash. Literals by rule, beside the G2 logo (the only colour literals outside `global.*`). |
| `semantic.color.backdrop` | `--shadow-ink` at 40 % | `--shadow-ink` at 60 % | dialog and modal backdrops; the colour is a reference to `--shadow-ink`, the alphas live in `$extensions["org.kiwi"].alpha` and the emitter composes the `rgba()` per mode, so a change of ink cannot drift it; declared per mode because it depends on a mode token |
| `semantic.color.logo.{on-light, on-dark}` | `#000000`, `#ffffff` | same (follows the surface, not the mode) | institution logos (G2): the one permitted pure black / white in the UI |
| `semantic.editor.*` (12) | `bg` = `surface`, `gutter` = `surface-hover`, `gutter-text` = `text-secondary`, `gutter-text-active` = `text`, `active-line` = `surface-active`, `selection` = `accent-bg-subtle-active` (`accent-4`, 1.15:1 on `--editor-bg`; `accent-5` would drop strings to 4.41:1), `selection-outline` = `selection.marker` (the 1 px edge, 12.7:1), `cursor` = `text`, `border` = `border` (read-only viewers, the console), `border-editable` = `border-interactive` (the editable editor's host), `block-rule` = `border-strong`, `inline-bg` = `surface-hover` | same roles, except `selection` = `accent-6` (1.47:1 on `--editor-bg`, every syntax colour ≥ 5.17:1 on it; outline 8.3:1) | code editors, code blocks, inline code (`§ Code surfaces`); checker § 17 |
| `semantic.syntax.*` (15) | keyword, builtin, type, class = `text` (weight 600); function, variable = `text`; operator, punctuation, decorator (600), comment (italic) = `text-secondary`; string = `accent-text`; number, constant = `info-11`; error = `error-11`; warning = `warning-11` | same roles | the two-hue, weight-led syntax theme |
| `semantic.console.*` (8) | `bg` = `surface`, `header-bg` = `surface-hover`, `fg`/`stdout` = `text`, `stderr` = `error-11`, `stdin` = `info-11`, `prompt` = `accent-text`, `border` = `border` | same roles | output consoles |
| `semantic.shadow.{1, 2}` | layers reference `--shadow-ink`; the alphas 0.14 · 0.08 / 0.26 live in `$extensions["org.kiwi"].alpha` and the emitter composes the `rgba()` at build time | the dark ink, by reference | the two depths (`§ Space, shape, depth`); declared per mode; the floating components alias them (`component.{launcher, dialog}.shadow` → 2, `component.{toast, display-menu}.shadow` and the PDF viewer's search panel and banner → 1) |
| `semantic.space.*` (26) | the density deltas below, including the control paddings derived from `--size-control` and the line height (`control-pad-y` 11 / 7 around a 20 px label, `field-pad-y` 9 / 7 around the control text, each `(control − leading − 2) / 2`); the fixed reading rhythm (`block` 12, `message` 24, `reading-gutter` 24); the fixed roles the components consume instead of raw steps: `icon-gap` 8 (icon to label, chip padding and chip gap), `label-gap` 8 (label to control, control to helper), `popup-margin` 12 (a popup's distance from the viewport edge), `float-offset-x` 24 and `float-offset-y` 16 (toasts, the launcher), `edge-margin` 8 (rail margins, the launcher's edge), `tab-gap` 4, `frame-gap` 24 and `line-gap` 8 (the empty frame) | | spacing roles |
| `semantic.measure.{prose, cjk}` | the locked measures (68ch, 36em), as roles | | reading measures for the components (not re-emitted) |
| `semantic.size.*` (56) | the density deltas below; the fixed sizes (`target-min` 44, `top-bar` 52, `top-bar-button` 44, `toolbar-bar` 44, `launcher` 56, `avatar` 32, `icon-fixed` 24, `menu-item` 40, `status-dot` 8, `checkbox` 18, `switch-track` 36 × 20, `switch-thumb` 14, `focus-ring` 2, `focus-offset` 2, `marker` 2, `code-rule` 2, `toolbar-button-sm` 28 (the feedback toolbar's drawn button and line), `toolbar-divider` 18, `dialog-sm/md/lg` 480/640/900, `menu-min/max` 240/320 (`menu-max` also sizes the PDF search panel), `toast-max` 420, `sidebar` 220/56/260, `chat-side` 420, `kpi-min` 200); the content-derived column minimums (comfortable / compact): `col-min-text` 160 / 144, `col-min-date` 148 / 136, `col-min-num` 96 / 88, `col-min-status` 160 / 144, `col-min-check` 56 / 48; the hit areas and the pitch that grow on coarse pointers: `hit-icon` (= `control-icon` → 44), `hit-toolbar` 28 → 44, `pitch-toolbar` 30 → 44, `hit-chip` (= `chip` → 44), `hit-switch` (= `switch-track-h` → 44), `hit-checkbox` (= `checkbox` → 44), `menu-item` 40 → 44 | | control geometry |
| `semantic.type.*` (16 composites) | `body`, `body-cjk`, `control` step down in compact; `button` 14/20 600, `label` 14/20 600, `caption` 12/16, `page-title` 24/32 600 −0.01em, `section-title` 20/28 600, `group-title` 16/24 600, `deck` 18/28, `display-lg` 30/36 600, `display` 36/44 600, `kpi-value` 24/32 600 tabular, `code` 14/24 mono, `popup-title` 14/20 600, `popup-supporting` 12/16 | | type roles on the locked scale (the scale itself never changes) |
| `semantic.type-weight.{regular, emphasis}` | 400, 600 | | the system's two weights as roles, for the states that change weight (a disabled tertiary label or tab drops to 400 so disabled is never told apart by hue alone) |
| `semantic.motion.{micro, standard, exit, shimmer, press-scale}`, `semantic.easing.{enter, exit, toggle}` | 150, 220, 176, 1600 ms; `press-scale` 0.98; the locked curves | | component motion references; `press-scale` is the one shared active transform (buttons, icon buttons, filter chips, the launcher, text actions) |
| `semantic.z.*` | top-bar 1000, sidebar-drawer 1200, launcher 1200, assistant 1250, chat-panel 1300, modal 1300, menu 1300, toast 1400, tooltip 1500 | | layer order (today's values kept; MUI defaults for the rest) |
| `semantic.opacity.paper-dim` | 1 | 0.92 | paper may be dimmed to no less than 92 % in dark mode (G5); consumed by `--pdf-toolbar-paper-dim` on the PDF page and its thumbnails |
| `semantic.border.{hairline, interactive, marker, focus, underline, underline-hover}` | 1, 1, 2, 2, 1, 2 px | | border and underline widths; a control's weight comes from colour, not thickness; text actions and links are underlined 1 px at rest and 2 px on hover and press |

### Density

Two densities, defined as semantic-tier deltas (DW-3.9): the step a role uses changes, the scale never does. Comfortable serves the student and auth areas and every reading surface; compact serves `/admin/*` and tool chrome. Both resolve in both colour modes (the axes are orthogonal), and the checker lists the deltas from the source (30):

| Role | Comfortable | Compact |
|---|---|---|
| `--size-control` (inputs, selects, buttons) | 44 px | 36 px |
| `--size-control-icon` (icon buttons) | 44 px | 36 px |
| `--size-row` (table and DataGrid rows, header and footer) | 52 px | 36 px |
| `--size-tab` | 44 px | 36 px |
| `--size-nav-item` (sidebar) | 44 px | 36 px |
| `--size-chip` | 32 px | 28 px |
| `--size-icon` | 24 px | 20 px |
| `--size-col-min-{text, date, num, status, check}` | 160, 148, 96, 160, 56 px | 144, 136, 88, 144, 48 px |
| `--type-body` / `--type-control` | `--text-base` 16/24 (CJK-dominant blocks 28) | `--text-sm` 14/20 (CJK 24) |
| `--type-label`, `--type-caption`, headings | unchanged | unchanged |
| `--space-inset-x` / `-y` (inside controls; alert and toast padding) | 16 / 12 | 12 / 8 |
| `--space-control-pad-y` (a button's vertical padding around its 20 px label: `(control − 20 − 2) / 2`) | 11 | 7 |
| `--space-field-pad-y` (a field's vertical padding around its control text: `(control − leading − 2) / 2`) | 9 | 7 |
| `--space-inline` (controls in a row; icon gaps in alerts and the rail) | 12 | 8 |
| `--space-stack` (between fields, list items) | 24 | 16 |
| `--space-section` | 48 | 32 |
| `--space-gutter` (page padding) | 32 | 24 |
| `--space-cell-x` / `-y` (table cells) | 16 / 12 | 12 / 8 |
| `--space-panel` (sheet padding; the PDF canvas) | 24 | 16 |

Fixed regardless of density:

- the type scale and `--space-*`;
- the top bar: 52 px, 44 px icon buttons on both areas, so the view switch never jumps;
- the PDF viewer toolbar: a 44 px bar holding compact buttons on both areas;
- the launcher: a 56 px disc with a 24 px glyph (`--size-icon-fixed`); the tutor avatar: 32 px (G9);
- the reading rhythm: 12 px between blocks, 24 px between messages, 24 px from the ruler (the narrow-viewport gutter is the lock's open question, decided on Phase 7's 390 × 844 renders as a container rule on the reading column; nothing implements it here, so nothing claims it);
- the Display menu: the small-popup contract, items 40 px, 44 on coarse pointers;
- the chat panel's chrome (header, session bar, model select, composer): compact tool chrome on every route, student pages included (36 px icon buttons, a 36 px composer field and Send, 44 px hit areas on coarse pointers), while its message region is a comfortable reading surface (SR-6, the brief's "tool chrome anywhere").

The checker asserts that `launcher.*` and `display-menu.*` carry no density-dependent token.

**Coarse pointers (the third axis).** `--size-target-min` = 44 px. On a coarse pointer every control of the student and auth routes, and every fixed-geometry control that appears there (the top bar, the PDF bar, the chat chrome, the Display menu), offers a 44 × 44 px hit area without changing its drawn size. The emitted CSS carries an `@media (pointer: coarse)` block that re-points the hit and pitch roles to `--size-target-min` and redeclares their dependents on `:root` and inside both density blocks (34 properties):

| Role (fine → coarse) | Dependents | Controls |
|---|---|---|
| `--size-hit-icon` (the drawn 44 / 36 → 44) | `--icon-button-hit`, `--pdf-toolbar-button-hit` | icon buttons: chat header, top bar, PDF bar, row actions |
| `--size-hit-toolbar` (28 → 44), `--size-pitch-toolbar` (30 → 44) | `--tutor-message-toolbar-hit`, `--tutor-message-toolbar-pitch`, `--tutor-message-copy-hit` | the feedback toolbar's five 28 px buttons (5 × 44 = 220 px fits the 420 px panel and a 390 px phone; the glyphs stay on the 28 px line, so the row still ticks the ruler once) and the code block's Copy button (`--tutor-message-copy-button` 28 px) |
| `--size-hit-chip` (32 / 28 → 44) | `--chip-hit` | filter chips |
| `--size-hit-switch` (20 → 44), `--size-hit-checkbox` (18 → 44) | `--switch-hit`, `--checkbox-hit` | switches, checkboxes and radios |
| `--size-hit-text-action` (the line box → 44) | `--alert-action-hit`, `--toast-action-hit`, `--pdf-toolbar-banner-action-hit`, `--tutor-message-citation-hit` | the text actions (Retry, Dismiss, Undo, Read, Change range) and the citations |
| `--size-hit-control` (44 / 36 → 44) | `--button-hit`, `--field-hit`, `--pdf-toolbar-field-hit`, `--pdf-toolbar-drawer-row-hit` | the compact tool chrome of student routes: the composer's Send and Stop, the PDF bar's text buttons, the search panel's Find and Next match, the language select, the page and search fields; the S-02 drawer's file rows (full-width pseudo-element) |
| `--size-hit-tab` (44 / 36 → 44) | `--tabs-hit` | the file and output tab bars (S-03) |
| `--size-hit-pin` (24 → 44) | `--pdf-toolbar-pin-hit` | the comment pins on the paper |
| `--size-menu-item` (40 → 44) | `--display-menu-item-height` | the Display menu's items |
| `--space-icon-row-gap` (4 → 8), `--space-hit-row-gap` (0 → 8) | `--icon-button-row-gap`, `--pdf-toolbar-drawer-row-gap` | rows of icon buttons (the chat header, the PDF bar, the pager) and the drawer's file rows open their gap so 36 px controls sit on a 44 px pitch and their hit areas never overlap (the chips above the drawer rows keep their own 44 px) |

Each control extends its hit area with a pseudo-element **sized to the hit token and centred on the control** (`left: 50%; top: 50%; width: var(--…-hit); height: var(--…-hit); transform: translate(-50%, -50%)`, with `max(100%, hit)` for the width of a wide control), so a 1 px or 1.5 px border never shrinks the area below 44 px (an `inset` formula on the padding box would); hit areas may overlap neighbouring prose but never another control. The comfortable 44 px controls need no extension. Checker: the coarse closure and that `--size-target-min` is consumed.

**The exceptions, stated:**

- admin-only chrome, which appears on admin routes only (G13 verifies touch on the student routes; 36 px clears WCAG 2.5.8's 24 px): the admin sidebar's rows (36 px in the compact rail, the 36 px child rows in both densities), the admin tables' and DataGrid's compact rows with the row and header checkboxes a 36 px row clips to its height, and the admin tables' name-link cells (a link is text in its 52 or 36 px cell);
- links inside running text, on any route (a page reference inside a tutor message): WCAG 2.5.8's inline exception; the citations are not prose links and carry their own 44 px hit areas.

Every other control on a student route reaches 44 × 44 px, the compact tool chrome, the S-02 drawer's file rows and the comment pins included.

**Evidence.** Headless desktop Chrome reports a fine pointer, so the sheet emulates the media block under `.emu-coarse` with the identical declarations and draws the hit areas dashed; its audit measures the emulated pitch (44 px) and hit (44 px). Under real emulation (`(pointer: coarse)` and `(hover: none)` set over the DevTools protocol, touch emulation on, every control's hit extent measured with `elementFromPoint` pixel by pixel along both axes through its centre, so a control passes only when the area that really hit-tests to it spans at least 44 px each way): 1778 of 2120 controls hit-test to 44 × 44 px: every one of the 29 passing classes (icon button · comfortable; icon button · compact; feedback toolbar button · comfortable; filter chip · comfortable; filter chip · compact; switch · comfortable; switch · compact; checkbox / radio · comfortable; checkbox / radio · compact; table checkbox (in a row or the header) · comfortable; menu item · comfortable; menu item · compact; text action (alert, toast, banner) · comfortable; text action (alert, toast, banner) · compact; citation · comfortable; button · comfortable; button · compact; tab · comfortable; tab · compact; drawer file row (S-02) · compact; comment pin (on the paper) · comfortable; comment pin (on the paper) · compact; table row · comfortable; launcher · comfortable; launcher · compact; field · comfortable; field · compact; page / search field · comfortable; page / search field · compact); the 342 that do not are exactly the stated exceptions: 318 admin-only (48 of the 48 table row and header checkboxes, compact; 4 of the 64 admin sidebar rows, comfortable; 62 of the 64 admin sidebar rows, compact; 92 of the 92 table rows, compact; 56 of the 56 admin table name-link cells, comfortable; 56 of the 56 admin table name-link cells, compact: a compact 36 px row clips its checkbox's hit area to the row, the comfortable sidebar misses are the 36 px child rows, and a name link is text in a 36 or 52 px cell) and 24 links in running prose (24 of the 24 links in running prose, comfortable), which WCAG 2.5.8's inline exception covers; the sum of those misses is 342; the compact tool chrome of student routes passes (compact tab (Materials) 80 × 45, Find (Find) 65 × 45, Next match (Next match) 81 × 45, Send (Send) 65 × 45, search field (Search PDF) 81 × 45, drawer file row (Lecture 3 · Regression.pdf) 81 × 44, comment pin (Comment, visible to students) 45 × 45, hidden comment pin (Comment, hidden from students) 45 × 45); the feedback toolbar's pitch measures 44 px under the media block; pressed (scaled) exhibits are skipped because a pressed control is already under the finger.

**Safe areas.** Fixed surfaces measure their offsets from the safe area, never the viewport edge: the launcher `right: calc(var(--launcher-offset-x) + env(safe-area-inset-right, 0px))`, `bottom: calc(var(--launcher-offset-y) + env(safe-area-inset-bottom, 0px))` (mirrored on app tabs); toasts `bottom: calc(var(--toast-offset-y) + env(safe-area-inset-bottom, 0px))`; the full-screen chat panel and the top bar pad by `env(safe-area-inset-top)`, `-left` and `-right`; the keyboard-avoiding composer sits above `env(safe-area-inset-bottom)`. The tokens stay plain dimensions (a DTCG dimension cannot hold `env()`); the `calc()` lives in the component rules, which Phase 7's 390 × 844 renders exercise. Dialogs are relative on phones: `width: min(100% - 2 * var(--space-popup-margin), var(--dialog-width-sm|md|lg))`, `max-height: 80vh` with a scrolling body, so the sheet keeps a 12 px margin and never exceeds the viewport.

**Mechanism.** Colour mode switches on `data-theme="light|dark"` (the locked selector), density on `data-density="comfortable|compact"`, pointer on the media query; the emitter redeclares every dependent property inside both attribute blocks and the media block, so a nested region re-resolves exactly like a nested theme. The route area sets the attribute on its layout root; override regions set it on their subtree. The System theme choice is resolved by the app from `prefers-color-scheme` into the attribute (one selector for MUI and the tokens).

**Compact holds to about 960 px by adapting, never by moving regions** (responsive doctrine; G13 verifies at 1280): buttons are `white-space: nowrap` and never multi-line; table cells are one line with an ellipsis and the full text in a tooltip on hover and on focus (the truncated span is focusable), except designated wrap columns clamped at two lines; the minimum column widths are derived from the widest expected content plus `2 × --space-cell-x` and rounded up to the 4 px scale, per density (`--size-col-min-*` above: a fixed-format date-time, the widest status chip with its icon, a six-digit count, a checkbox cell), so a date, a count or a chip never truncates at 1440 or 1280; below the sum of minimums the table scrolls inside its own container, never the page; the toolbar is a container-query root and below a 1120 px container its labelled buttons collapse to icon + count with a tooltip and an `aria-label` (TD-34). `AdminPageHeader` actions wrap as today; `AdminFormSection` collapses to one column below `md` as today.

#### Density map (every JOURNEY.md route area, exactly one density; consistent with DW-1.2)

| Area | Routes (JOURNEY entries) | Density | Override regions inside |
|---|---|---|---|
| Student | S-01 Course list `/`; S-02 Materials `/:classID`; S-03 Code space `/:classID/code`; S-04 Kiwi App host `/:classID/app/:appSlug` | comfortable | tool chrome is compact: S-02 icon rail, "Class Materials" drawer, the 44 px PDF viewer toolbar and summary banner; S-03 file-tab bar, upload row, language select, editor overlay buttons, output tab strip; the Kiwi App iframe sets its own |
| Auth and fallback | S-05 Sign-in `/login`; S-06 Register `/register`; S-07 Google callback `/auth/callback`; S-08 MCP authorize `/authorize`; S-09 Consent `/consent`; S-10 Not found `*` | comfortable | S-09's PDF toolbar is compact |
| Admin, system | A-01 Classes; A-02 New class; A-03 System analytics; A-04 System email; A-05 Email audit; A-06 System flags; A-07 MCP server registry; A-08 App registry; A-09 Webhooks; A-10 Webhook approvals; A-11 User management; A-12 Admin app view (three routes) | compact | reading surfaces are comfortable: A-04 templated-email preview (paper) and the 12- and 8-row message inputs; A-10 JSON payload and metadata blocks; the empty-state frame on A-01 (no classes); the message region of the chat panel wherever it opens; A-12's iframe sets its own |
| Admin, class | A-13 Class settings (index and `edit-metadata`); A-14 Materials; A-15 Class flags; A-16 Enroll students; A-17 Class email; A-18 Class analytics; A-19 Experiments; A-20 Experiment form (`new`, `:id/edit`); A-21 Experiment detail; A-22 Class MCP and tools; A-23 Class apps; A-24 PDF annotation (and `/annotation`) | compact | reading surfaces are comfortable: A-16 email preview and announcement message; A-17 message inputs; A-18 question text, stored answers and PDF pages (paper); A-20 system-prompt textareas; A-21 prompt boxes and description; A-24 PDF page, chunk text and summary text; the empty-state frame on A-19 (no experiments); the chat panel's message region |
| Redirects | R-1 `/admin` → classes; R-2 `batch-upload` → materials; R-3 `/logout`; R-4, R-5 | inherit the target | |
| Shared regions | SR-1 top bar: fixed geometry on both areas. SR-2 student layout: comfortable. SR-3 admin shell and SR-4 page frame: compact. SR-5 auth layout: comfortable. SR-6 Kiwi Chat: on every route; the message region is a reading surface (comfortable), the header, session bar, model select and composer are compact; the launcher is fixed. SR-7 Experiment Assistant: compact. The Display menu (SR-1) has fixed geometry on both areas. | | |

Counts: 10 student/auth routes comfortable, 24 admin routes compact (34 of 34, one each), matching the Density field of every JOURNEY.md entry. The four components that appear on both areas with a fixed or overridden density are specified and rendered in both densities: the Display menu and the launcher are identical in both; the empty-state frame and the chat panel's message region are comfortable regions inside compact pages (`data-density="comfortable"` on their subtree), while the chat panel's chrome is compact tool chrome on every route (SR-6), so the panel renders identically on student and admin pages.

### Components

Rules shared by every component (interaction doctrine; usability: Nielsen 1, 4, 5, 8, 9):

- **Focus** is `:focus-visible`, `--border-width-focus` 2 px solid `--focus-ring` at `--size-focus-offset` 2 px, inset by 2 px inside clipped rails, tab bars, rows and menus; never removed, never animated; the one focus signal system-wide (5.16:1 light / 9.13:1 dark against the canvas by the lock). Composite widgets (tabs, toolbars, radio groups, menus, the DataGrid) are one tab stop with a roving tabindex (`§ Keyboard and focus contract`).
- **Hover** switches colour instantly (tonal: `--surface-hover`; tint: `--accent-bg-subtle` or `--destructive-bg-subtle`); **active** is a fill step of its own, distinct from hover, plus `scale(0.98)` for `--motion-micro` where a transform is involved: filled controls press to `--accent-solid-active` (light: the system's green-black; dark: `accent-12`, one step beyond the `accent-10` hover), tinted controls to `--accent-bg-subtle-active` (`accent-4`), tonal controls to `--surface-active`; nothing else moves. **Known limitation, lock-bound:** on the light canvas a row's tonal hover (`--surface-hover`, neutral-3 on paper-3) is a hue step of about 1.01:1, not a lightness step, so a deuteranope sees no hover on canvas rows (not a WCAG requirement); pressed (`--surface-active`, 1.08:1), every sheet-bound hover (1.08:1 on `--surface`) and dark mode (1.22:1) read. The lock binds hover rows to `--surface-hover` and the tertiary hover tint to `--accent-bg-subtle` (`§ Roles per mode`), so the fix is a lock amendment this section proposes rather than applies: rows that sit on the canvas hover to `--surface` (1.07:1, the lock's own tonal step; `--text` 12.9:1 and `--text-secondary` 5.7:1 on it) and press to `--surface-active`; the tertiary tint stays accent-3 (accent-4 as hover would push its pressed step to accent-5, where `--accent-text` falls to 4.41:1).
- **Disabled** is `--disabled-surface` + `--disabled-text` + `--disabled-border` (icon-only controls: `--disabled-icon`; a tertiary button or a tab drops to weight 400 because it has no fill to grey).
  - **One mechanism:** a disabled control is rendered with `aria-disabled="true"` on the control itself, never the native `disabled` attribute, so it stays in the tab order and in the roving order of its composite, exposes its state to assistive technology and keeps its `aria-describedby`; its handlers ignore activation. The native attribute would drop the control from the tab order, so keyboard users could never reach the reason, and MUI's Tooltip refuses a natively disabled child; `aria-disabled` needs no wrapper; every `aria-disabled` control and what it contains shows `cursor: not-allowed` (the sheet's audit checks the computed cursor on 156 of them).
  - **Every disabled or inert control states its own true reason:** visible helper text, or a toggletip on the control itself (`component.toggletip`: one line of `--type-caption` on `--surface` with a 1 px `--border` and `--toggletip-shadow`, at most `--toggletip-max-width` wide, `--toggletip-offset` from the control) that opens on hover, focus and tap, closes on Escape without moving focus, can be hovered and stays until dismissed (WCAG 1.4.13), with the helper shown inline under `(hover: none)`, so keyboard and touch users reach it; the reason is linked by `aria-describedby` so it is read with the control, it is specific to that control (never a page label or a placeholder glyph), and only the controls that are really unavailable in a state are disabled (page 1 disables Previous, not Next).
  - A busy control (`aria-busy`) is inert with its label as the reason ("Saving…").
  - A disabled tab carries a second cue beyond weight 400: the 16 px lock glyph in `--disabled-icon` before its label (`--tabs-disabled-glyph`), so the state is a shape, not weight or colour alone.
  - A control that does not exist for the role is hidden, not disabled (JOURNEY D-4): the empty frame shows no call to action to a student with no classes (variant `no-action`), and its disabled CTA appears only where the role has the action and a precondition is unmet ("Add a system prompt in Class settings before you create an experiment").
  - The sheet's exhibits use exactly this DOM (`aria-disabled` + `aria-describedby`, no `disabled`, no wrapper) and its audit scans every disabled, `aria-disabled` or busy control in every state exhibit and fails one without a specific stated reason.
- **Text actions** (Retry, Dismiss, Undo, Read, Change range inside alerts, toasts and the banner) are one pattern, drawn the same everywhere: underlined at rest (`--border-width-underline` 1 px), weight 600, in the container's text colour (`--link` on a neutral toast); hover thickens the underline to 2 px (`--border-width-underline-hover`); focus is the ring; pressed is the 2 px underline with the shared press scale (`--motion-press-scale`). The affordance is visible at rest, so it does not depend on hover.
- **Hit areas**: on coarse pointers every control on the student and auth routes, their compact tool chrome included, every fixed-geometry control and every text action offers at least `--size-target-min` 44 × 44 px through a centred hit-area pseudo-element; the drawn size never changes; the stated exceptions are the admin-only sidebar rows, table rows and table name-link cells, and links inside running prose (WCAG 2.5.8's inline exception) (`§ Density › Coarse pointers`).
- **Loading** keeps width and label, sets `aria-busy`, disables the control and shows the text dots (three frames, 500 ms, in a fixed 3ch slot); regions use skeletons of the final shape; the only spinner-like glyph is the static dashed ring in `--in-progress-text`, always beside words (G9). A busy control keeps its `--border-interactive` boundary: busy is not disabled. Under `prefers-reduced-motion` the dots rest as the static ellipsis (`animation: none` with the full "…" as content, the keyframes' last frame), never a frozen empty frame: the lock's universal 0.01 ms rule shortens the animation, and the scoped rule in `MuiCssBaseline` picks the resting frame; the public `.kiwi-in-progress::after` does the same inside its guard.
- **Error** is inline: `aria-invalid` + `aria-describedby` on fields, whose boundary takes `--status-error-text` beside the cross icon and the message (the one control that recolours, and never colour alone); an alert with the cross icon and what happened, why and how to fix (Phase 5 words) for regions; a button that failed returns to its default and is never recoloured (the failure is the adjacent alert).
- **Success** is icon + label for at least 2 s: a label swap for idempotent actions, a status chip or helper in place, a toast for submits.
- **Selection and pressed cues** (WCAG 1.4.1, 1.4.11; the lock's selection rule: tint + accent text + a 2 px marker): a selected or pressed state is never carried by colour alone, because the selection tint is about 1:1 against the surface and the accent glyph's hue shift about 1:1 for a deuteranope. Per component:

  | Component (state attribute) | Cue beside the tint | Under `forced-colors: active` |
  |---|---|---|
  | icon-button toggles: the chat-mode buttons (`aria-pressed`) | a 2 px `--selection-marker` bar along the bottom edge (`--icon-button-marker`, `box-shadow: inset`) | a 2 px `Highlight` outline, `outline-offset: -2px` |
  | tertiary toggles: the PDF bar's Search and Thumbnails (`aria-pressed`) | the tertiary pressed variant: the tint, `--selection-text` and the same 2 px bar (`--button-marker`) | the `Highlight` outline |
  | the feedback thumbs (`aria-pressed`) | the chosen one is a **filled glyph** in `--selection-text`, the other an outline | the filled glyph survives (system colours) |
  | filter chips (`aria-pressed`) | weight 600 (unselected 400) beside the accent boundary | weight survives |
  | tabs (`aria-selected`), sidebar and drawer rows (`aria-current`), table rows (`aria-selected`) | the 2 px marker | the `Highlight` outline |
  | switches (`aria-checked`) | the thumb's position | the thumb gets a 1 px `CanvasText` border; its position survives |
  | checkboxes and radios (`aria-checked`) | the check, the dash or the dot | the check glyph survives; the dash and the dot (backgrounds forced colours erase) take `CanvasText` |
  | menu items (`aria-checked`) | the check glyph | survives |
  | the current sidebar child | the 6 px `--selection-marker` dot | `CanvasText` |
  | the in-context page and thumbnail (`aria-current`) | the 2 px `--border-interactive` outline plus the neutral "In context" chip | the outline survives |

  Not toggles: the launcher (it opens the panel and hides while it is open) and the PDF bar's Fullscreen (an action whose state is the viewport). **Forced colours** (Windows High Contrast): the browser drops `box-shadow`, so an `@media (forced-colors: active)` block in the component CSS redraws each marker as the outline above and gives the background-drawn cues system colours; the paper and the marks on it (pins, chunk boxes, the in-context outline, the thumbnails) are content, not chrome, `forced-color-adjust: none` on the page as react-pdf's rendered bitmap would behave, so they keep their fixed G5 colours, whose contrasts the token assertions hold (forced colours do not recolour an SVG glyph, so a `--on-paper-page` glyph on a Canvas-forced disc would otherwise vanish). The sheet carries a forced-colours exhibit (box-shadow dropped by class, the same declarations) and the evidence a real `(forced-colors: active)` emulation. `check-tokens.mjs` § 14 asserts that each toggle-like variant carries its cue and that a marker or glyph cue clears 3:1 against the selected fill and the unselected surfaces in both modes; the sheet's audit fails any `aria-pressed`, `aria-selected`, `aria-current` or `aria-checked` control without a non-colour cue.
- **One filled primary per view region** (a page, a dialog, a panel); the floating layer (launcher, toasts) is its own region. Destructive actions are outlined in `--destructive-text` and **placed apart**: in a toolbar the destructive action is left-aligned at the start with a flexible spacer between it and the other actions (Remove selected · spacer · Email selected · Enroll students, in the labelled and the collapsed variant alike); in a dialog it is the confirming action beside a tertiary Cancel (D4). Switches, checkboxes and radios are selection controls (tint + `--selection-text`), status chips are the only tinted chips, KPI icons are always `--icon-default` (the status glyph in an error tile is a separate part), table figures are `--text` with tabular numerals (blue is `--info-*` on status surfaces and code numerals only), in progress is neutral. A status mark is never colour alone: a tab whose panel failed shows the 16 px cross with hidden text, never an 8 px dot. No pills, no stadiums. `--radius-round` (50 %) draws dot-like marks and convention-bound circles only: the status dots and the mascot's backing circle the lock names, and, within the lock's intent as the plan's Decision Log records ("`radius.round` (50%) interpretation", 2026-10-17), the launcher disc, its 20 px count badge (`--launcher-badge-size`, `--launcher-badge-radius`; 9+ above nine), radio buttons (a radio is a circle as a checkbox is a square) and the comment pins on the paper. Everything else takes `--radius-control` 2 px, the switch track and thumb included (`--switch-radius`, `--switch-thumb-radius`; 50 % on a 36 × 20 box drew an oval). Stage 1 has no toggle group.

Variants are persistent conditions and are specified beside the states; the eight states are transient. Where a state does not change the component's own pixels the table says so and names where the state lives.

#### Buttons (primary, secondary, tertiary, destructive)

Buttons. One filled primary per view region (a page, a dialog, a panel; the floating layer is its own region). Labels are sentence case, --type-button 14/20 600, never multi-line (white-space: nowrap). Loading keeps width and label and appends the text dots (no spinner). Success for idempotent actions is a 2 s label swap with the check icon; for submits it is a toast. A tertiary button used as a toggle (aria-pressed) draws its pressed state as the selection tint + --selection-text + a 2 px --selection-marker bar (the tertiary pressed variant); primary and secondary buttons are never toggles. Keyboard: Tab reaches each button, Enter and Space press; a loading button stays in the tab order (aria-busy) and ignores presses.

Geometry and tokens of the component (not per state): `--button-height` = size.control; `--button-padding-x` = space.inset-x; `--button-padding-y` = space.control-pad-y — Vertical padding that lands the 20 px label at 44 / 36 with the 1 px border: the semantic control-pad-y delta; `--button-radius` = radius.control; `--button-gap` = space.icon-gap — icon to label; `--button-icon-size` = size.icon-sm — 16 px glyphs inside buttons; `--button-min-width` = 64px — A label shorter than 64 px still makes a target; `--button-hit` = size.hit-control — The hit area: the drawn height with a fine pointer, 44 px with a coarse one, through a centred pseudo-element; `--button-press-scale` = motion.press-scale — active: the shared press scale for --motion-micro; the only transform a button animates; `--button-marker` = size.marker — The 2 px --selection-marker bar along the bottom edge of a pressed tertiary toggle (aria-pressed="true").

States — primary:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Filled. | fill → accent-solid, text → accent-on-solid |
| hover | Fill steps to --accent-solid-hover, instantly. | fill → accent-solid-hover, text → accent-on-solid |
| focus | :focus-visible 2 px --focus-ring at 2 px offset. | fill → accent-solid, text → accent-on-solid, ring → focus-ring |
| active | Pressed: the fill steps past hover to --accent-solid-active (light: the system's green-black; dark: accent-12) with scale 0.98 for 150 ms, so pressed is told from hovered by fill, not by the scale alone. | fill → accent-solid-active, text → accent-on-solid |
| disabled | Disabled: --disabled-surface fill, --disabled-text label, --disabled-border hairline; the reason is stated in adjacent helper text, or in a toggletip on the control itself, which stays focusable (aria-disabled="true", never the native disabled attribute) and opens it on hover, focus and tap, showing the text inline under (hover: none); either way it is linked by aria-describedby so keyboard and touch users read it too. Never a bare grey control. | fill → disabled.surface, text → disabled.text, border → disabled.border |
| loading | aria-busy; label stays, trailing text dots cycle (3 frames, 500 ms) in a fixed 3ch slot; width fixed; the control is disabled while busy. | fill → accent-solid, text → accent-on-solid |
| error | The button returns to default; the failure is an adjacent inline alert (role=alert) which receives focus. The button itself is never recoloured. | fill → accent-solid, text → accent-on-solid |
| success | Idempotent actions (Copy): label swaps to the past tense with the check icon for 2 s, then reverts. Submits: a success toast; the button returns to default. | fill → accent-solid, text → accent-on-solid, icon → accent-on-solid |

States — secondary:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Outlined: --surface fill, --border-interactive boundary, --accent-text label. | fill → surface, text → accent-text, border → border-interactive |
| hover | Tint hover. | fill → accent-bg-subtle, text → accent-text, border → border-interactive |
| focus | Ring; the boundary does not change colour. | fill → surface, text → accent-text, border → border-interactive, ring → focus-ring |
| active | Pressed: the tint steps to --accent-bg-subtle-active (accent-4, past the accent-3 hover) + scale 0.98. | fill → accent-bg-subtle-active, text → accent-text, border → border-interactive |
| disabled | Disabled: --disabled-surface fill, --disabled-text label, --disabled-border hairline; the reason is stated in adjacent helper text, or in a toggletip on the control itself, which stays focusable (aria-disabled="true", never the native disabled attribute) and opens it on hover, focus and tap, showing the text inline under (hover: none); either way it is linked by aria-describedby so keyboard and touch users read it too. Never a bare grey control. | fill → disabled.surface, text → disabled.text, border → disabled.border |
| loading | As primary loading. | fill → surface, text → accent-text, border → border-interactive |
| error | As primary error (adjacent alert). | fill → surface, text → accent-text, border → border-interactive |
| success | As primary success. | fill → surface, text → accent-text, border → border-interactive, icon → accent-text |

States — tertiary:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Text only on a transparent fill; --accent-text label. | fill → fill-none, text → accent-text |
| hover | Tint hover: --accent-bg-subtle behind the label. | fill → accent-bg-subtle, text → accent-text |
| focus | Ring on the transparent control. | fill → fill-none, text → accent-text, ring → focus-ring |
| active | Pressed: the tint steps to --accent-bg-subtle-active (accent-4, past the accent-3 hover) + scale 0.98. | fill → accent-bg-subtle-active, text → accent-text |
| disabled | Disabled tertiary: there is no fill to grey, so the label drops to --disabled-text at weight 400 (enabled tertiary labels are 600) and the reason sits beside it in helper text or a toggletip on the control itself (aria-disabled, aria-describedby; shown inline under (hover: none)). Disabled is told apart by weight and the stated reason, never by hue alone. | fill → fill-none, text → disabled.text, weight → type-weight.regular |
| loading | As primary loading. | fill → fill-none, text → accent-text |
| error | As primary error. | fill → fill-none, text → accent-text |
| success | As primary success. | fill → fill-none, text → accent-text, icon → accent-text |

Variants — tertiary:

- **pressed**: Variant: a tertiary toggle while pressed (aria-pressed="true": the PDF bar's Search and Thumbnails): the selection tint fill, the --selection-text label at 600 and a 2 px --selection-marker bar along the bottom edge (box-shadow inset), the same second cue as tabs and the selected icon button; hover and press follow the tertiary rules on the tint. (fill → selection.bg, text → selection.text, marker → selection.marker)

States — destructive:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Outlined: --destructive-text boundary and label on --surface; trash icon optional. | fill → surface, text → destructive.text, border → destructive.text, icon → destructive.text |
| hover | Tint hover: --destructive-bg-subtle; label and boundary unchanged. | fill → destructive.bg-subtle, text → destructive.text, border → destructive.text |
| focus | The standard --focus-ring: one focus signal system-wide. | fill → surface, text → destructive.text, border → destructive.text, ring → focus-ring |
| active | Pressed: the error-3 tint (the functional ramp has no fourth step) + scale 0.98; the hue, icon and label already set it apart. | fill → destructive.bg-subtle, text → destructive.text, border → destructive.text |
| disabled | Disabled: --disabled-surface fill, --disabled-text label, --disabled-border hairline; the reason is stated in adjacent helper text, or in a toggletip on the control itself, which stays focusable (aria-disabled="true", never the native disabled attribute) and opens it on hover, focus and tap, showing the text inline under (hover: none); either way it is linked by aria-describedby so keyboard and touch users read it too. Never a bare grey control. A destructive button is disabled while nothing is selected ("Select students to remove"). | fill → disabled.surface, text → disabled.text, border → disabled.border |
| loading | Label + dots; the dialog's other controls disable; close stays enabled unless the request cannot be cancelled. | fill → surface, text → destructive.text, border → destructive.text |
| error | Returns to default; the failure is an inline error alert above the actions. | fill → surface, text → destructive.text, border → destructive.text |
| success | The dialog closes; a toast confirms with the count ("3 students removed") and, where reversible, Undo beside Dismiss; the toast is the next tab stop after the trigger and stays until dismissed (or at least 10 s, paused on hover, focus-within and window blur), so the undo is reachable by keyboard. | fill → surface, text → destructive.text, border → destructive.text |

Contrast (both modes, from `check-tokens.mjs`): 56 required pairs, lowest 4.80:1 light / 7.24:1 dark; 5 informational pairs (inactive controls, decorative hairlines).

#### Icon buttons

Icon-only buttons (chat header, top bar, feedback toolbar, row actions). Neutral: --icon-default glyph on a transparent fill; hover/pressed tint tonally; a selected icon button (the current chat mode, TD-09; aria-pressed="true") is the selection tint + --accent-text glyph + a 2 px --selection-marker bar along its bottom edge, never a purple icon and never colour alone. Every icon button has an aria-label and a tooltip; a disabled one keeps focus (aria-disabled) and carries its reason in a toggletip on the control itself (hover, focus and tap; inline helper under (hover: none)), wired with aria-describedby ("Not available yet"). Keyboard: as buttons; a toggled icon button exposes aria-pressed; inside a toolbar it joins the toolbar's roving tabindex.

Geometry and tokens of the component (not per state): `--icon-button-size` = size.control-icon; `--icon-button-icon-size` = size.icon; `--icon-button-radius` = radius.control; `--icon-button-hit` = size.hit-icon — the hit area: the drawn size with a fine pointer, 44 px with a coarse one, extended by a centred pseudo-element; `--icon-button-row-gap` = space.icon-row-gap — The gap between icon buttons in a row: 4 px, 8 px on coarse pointers (a 44 px pitch for 36 px buttons); `--icon-button-marker` = size.marker — The 2 px --selection-marker bar along the bottom edge of a selected icon button (aria-pressed="true"): the non-colour cue beside the tint and the accent glyph; `--icon-button-press-scale` = motion.press-scale — active: the shared press scale for --motion-micro.

Variants:

- **selected**: Variant: the current mode / toggled on (aria-pressed="true"): the selection tint, the --selection-text glyph and a 2 px --selection-marker bar along the bottom edge (box-shadow inset), so the state is never colour alone: the tint is about 1:1 against the surface and the glyph hue shift about 1:1 for a deuteranope, the marker clears 3:1 against both the selected and the unselected fill. (fill → selection.bg, icon → selection.text, marker → selection.marker)

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Neutral glyph (--icon-default) on a transparent fill. | fill → fill-none, icon → icon.default |
| hover | Tonal fill (--surface-hover); the glyph darkens to --icon-hover. | fill → surface-hover, icon → icon.hover |
| focus | Ring. | fill → fill-none, icon → icon.default, ring → focus-ring |
| active | Pressed: tonal + scale 0.98. | fill → surface-active, icon → icon.hover |
| disabled | Disabled icon: --disabled-icon (border-strong); the reason opens as a toggletip on hover, focus and tap and is read with the control (Regenerate, Share: "Not available yet"). | fill → fill-none, icon → disabled.icon |
| loading | The glyph is replaced by the static dashed ring in --in-progress-text, aria-busy and inert; the progress is stated in adjacent text that the control is described by ("Copying…", G9). | fill → fill-none, icon → in-progress.text |
| error | The glyph swaps to the cross in --status-error-text for 2 s with the tooltip / aria-live text saying what failed. | fill → fill-none, icon → status.error.text |
| success | The glyph swaps to the check in --status-success-text for 2 s with the label ("Copied"); then reverts. | fill → fill-none, icon → status.success.text |

Contrast (both modes, from `check-tokens.mjs`): 18 required pairs, lowest 5.02:1 light / 7.60:1 dark; 2 informational pairs (inactive controls, decorative hairlines).

#### Chips (status, filter, role)

Chips. Three kinds with one colour rule each (TD-35, TD-40): status chips are the only tinted chips (-3 surface, -11 icon + label); filter chips are controls (--border-interactive boundary; selected = selection tint + --accent-text 600); role chips are labels (--surface-active, --text, no border). A row never carries two saturated fills. Keyboard: filter chips are toggle buttons (one tab stop each, Space or Enter toggles, aria-pressed); status and role chips are not in the tab order.

Geometry and tokens of the component (not per state): `--chip-height` = size.chip; `--chip-padding-x` = space.icon-gap; `--chip-radius` = radius.control; `--chip-icon-size` = size.icon-sm; `--chip-gap` = space.icon-gap — icon to label: the shared icon gap; `--chip-hit` = size.hit-chip — filter chips: 44 px hit area on coarse pointers; `--chip-press-scale` = motion.press-scale — active (filter chips): the shared press scale for --motion-micro.

Variants — status:

- **error**: error: -3 surface, -11 text and shape icon; no border. (fill → status.error.surface, text → status.error.text, icon → status.error.text)
- **success**: success: -3 surface, -11 text and shape icon; no border. (fill → status.success.surface, text → status.success.text, icon → status.success.text)
- **warning**: warning: -3 surface, -11 text and shape icon; no border. (fill → status.warning.surface, text → status.warning.text, icon → status.warning.text)
- **info**: info: -3 surface, -11 text and shape icon; no border. (fill → status.info.surface, text → status.info.text, icon → status.info.text)
- **neutral**: In progress / neutral: static dashed-ring icon + label; the text dots carry the motion. (fill → in-progress.surface, text → in-progress.text, icon → in-progress.text)

States — status:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | The status variant that applies (info shown). | fill → status.info.surface, text → status.info.text, icon → status.info.text |
| hover | No change: not interactive. | fill → status.info.surface, text → status.info.text |
| focus | Not focusable; no ring. | fill → status.info.surface, text → status.info.text |
| active | None: not pressable. | fill → status.info.surface, text → status.info.text |
| disabled | Never disabled: a status is a fact, not a control. | fill → status.info.surface, text → status.info.text |
| loading | The neutral variant with the ring icon and dots ("Importing…"). | fill → in-progress.surface, text → in-progress.text, icon → in-progress.text |
| error | The error variant (cross + label). | fill → status.error.surface, text → status.error.text, icon → status.error.text |
| success | The success variant (check + label). | fill → status.success.surface, text → status.success.text, icon → status.success.text |

Variants — filter:

- **selected**: Variant: selected (aria-pressed="true") = tint, --accent-text 600 label (unselected chips are 400: the non-colour cue), --accent-text boundary. (fill → selection.bg, text → selection.text, border → selection.text, weight → type-weight.emphasis)

States — filter:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Unselected: --border-interactive boundary, --text label, --surface fill (aria-pressed=false). | fill → surface, text → text, border → border-interactive |
| hover | Tonal fill. | fill → surface-hover, text → text, border → border-interactive |
| focus | Ring. | fill → surface, text → text, border → border-interactive, ring → focus-ring |
| active | Pressed. | fill → surface-active, text → text, border → border-interactive |
| disabled | Disabled: --disabled-surface fill, --disabled-text label, --disabled-border hairline; the reason is stated in adjacent helper text, or in a toggletip on the control itself, which stays focusable (aria-disabled="true", never the native disabled attribute) and opens it on hover, focus and tap, showing the text inline under (hover: none); either way it is linked by aria-describedby so keyboard and touch users read it too. Never a bare grey control. ("No recitations in this class"). | fill → disabled.surface, text → disabled.text, border → disabled.border |
| loading | While a filter applies asynchronously: the ring icon replaces the count; aria-busy. | fill → surface, text → text, border → border-interactive, icon → in-progress.text |
| error | Filters do not fail in place; a failed query is a toast and the chip returns to default. | fill → surface, text → text, border → border-interactive |
| success | None: applying a filter is its own feedback (the list changes). | fill → surface, text → text, border → border-interactive |

States — role:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | A label on --surface-active; no border, weight 400. | fill → surface-active, text → text |
| hover | No change. | fill → surface-active, text → text |
| focus | Not focusable. | fill → surface-active, text → text |
| active | None. | fill → surface-active, text → text |
| disabled | Never disabled. | fill → surface-active, text → text |
| loading | A skeleton pill of the same size while the roster loads. | fill → skeleton.base, text → skeleton.base |
| error | None of its own; an unknown role renders the label "Unknown role". | fill → surface-active, text → text |
| success | None. | fill → surface-active, text → text |

Contrast (both modes, from `check-tokens.mjs`): 41 required pairs, lowest 4.90:1 light / 6.39:1 dark; 1 informational pairs (inactive controls, decorative hairlines).

#### Switches

Switch: a selection control (D4, TD-22). Off = --surface track, --border-interactive boundary and thumb; On = selection tint track, --accent-text boundary and thumb. Status green never styles a switch. Thumb travel 150 ms with --easing-toggle; colours switch instantly. Label always visible; a saving switch shows the ring icon beside its label. Keyboard: Tab to the switch, Space toggles (role=switch, aria-checked); the visible label is the accessible name. Shape: track and thumb are rectangles at --radius-control (2 px): --radius-round is for dot-like marks and convention-bound circles only (the plan's Decision Log, radius.round interpretation) and the lock allows no pill, so the switch reads as a slider, never as an oval.

Geometry and tokens of the component (not per state): `--switch-track-width` = size.switch-track-w; `--switch-track-height` = size.switch-track-h; `--switch-thumb-size` = size.switch-thumb; `--switch-thumb-radius` = radius.control — The thumb's corners: --radius-control, like the track; the on/off cue is the thumb's position, not its shape; `--switch-radius` = radius.control — The track's corners: --radius-control (2 px). The lock reserves 50 % for dot-like marks and convention-bound circles (status dots, the mascot's backing; the plan's Decision Log reads the launcher disc, its badge, radios and the PDF pins as the same) and allows no pill, so the track is a rectangle; 50 % on a 36 × 20 box drew elliptical corners.; `--switch-hit` = size.hit-switch — 44 px hit area on coarse pointers.

Variants:

- **on**: Variant: on. (track → selection.bg, border → selection.text, thumb → selection.text)

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Off. | track → surface, border → border-interactive, thumb → border-interactive |
| hover | Track tints tonally; thumb darkens to --text. | track → surface-hover, border → border-interactive, thumb → text |
| focus | Ring around the track. | track → surface, border → border-interactive, thumb → border-interactive, ring → focus-ring |
| active | Pressed: the thumb starts its travel. | track → surface-active, border → border-interactive, thumb → text |
| disabled | Disabled: --disabled-surface fill, --disabled-text label, --disabled-border hairline; the reason is stated in adjacent helper text, or in a toggletip on the control itself, which stays focusable (aria-disabled="true", never the native disabled attribute) and opens it on hover, focus and tap, showing the text inline under (hover: none); either way it is linked by aria-describedby so keyboard and touch users read it too. Never a bare grey control. ("Only admins can change this"). | track → disabled.surface, border → disabled.border, thumb → disabled.icon |
| loading | Saving: the thumb already sits in the requested position, the ring icon beside the label and aria-busy say the change is pending, and the control is inert until the server answers. The boundary stays --border-interactive (a busy control is still a control, not a disabled one). | track → surface, border → border-interactive, thumb → border-interactive, icon → in-progress.text |
| error | The thumb reverts to the previous position; an inline helper (cross + what failed + how to retry) appears under the label. | track → surface, border → border-interactive, thumb → border-interactive, helper → status.error.text |
| success | The position holds; a success helper (check + label) appears only when the change needed a server round trip, for 2 s. | track → selection.bg, border → selection.text, thumb → selection.text, helper → status.success.text |

Contrast (both modes, from `check-tokens.mjs`): 18 required pairs, lowest 5.02:1 light / 7.60:1 dark; 1 informational pairs (inactive controls, decorative hairlines).

#### Inputs, selects and textareas

Text inputs, selects and textareas (one family). Visible label above (--type-label), control at --size-control with the --border-interactive boundary, helper text below (--type-caption). Placeholder is a format hint, never the label. Validate on blur, re-validate on keystroke after the first error; errors say what happened, why, how to fix (Phase 5 words). Selects keep 40 px right padding so the chevron clears the value (TD-13). Textareas: min 3 rows, resize vertical. Checkboxes and radios are their own component (§ Checkboxes and radios). Keyboard: Tab in document order; a select opens with Enter, Space or Down and closes with Escape.

Geometry and tokens of the component (not per state): `--field-height` = size.control; `--field-padding-x` = space.inset-x; `--field-padding-y` = space.field-pad-y — Lands 24 / 20 px text at 44 / 36 with the 1 px border: the semantic field-pad-y delta; `--field-radius` = radius.control; `--field-select-padding-right` = 40px — TD-13: the chevron clears the value; `--field-label-gap` = space.label-gap; `--field-helper-gap` = space.label-gap; `--field-hit` = size.hit-control — The control's hit area: 44 px on coarse pointers.

Variants:

- **read-only**: Read-only is inspectable, not a control: canvas fill, hairline, no focus ring unless focusable for copy. (fill → background, text → text, border → border)

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Resting: label above, --border-interactive boundary, placeholder as a format hint, helper below. | fill → surface, text → text, border → border-interactive, placeholder → text-secondary, label → text, helper → text-secondary |
| hover | Boundary darkens to --text. | fill → surface, text → text, border → text |
| focus | The ring is the only focus signal; the boundary does not change colour. | fill → surface, text → text, border → border-interactive, ring → focus-ring |
| active | Typing is the focus state; no separate pressed look. | fill → surface, text → text, border → border-interactive |
| disabled | Disabled: --disabled-surface fill, --disabled-text label, --disabled-border hairline; the reason is stated in adjacent helper text, or in a toggletip on the control itself, which stays focusable (aria-disabled="true", never the native disabled attribute) and opens it on hover, focus and tap, showing the text inline under (hover: none); either way it is linked by aria-describedby so keyboard and touch users read it too. Never a bare grey control. ("Set by your institution"). | fill → disabled.surface, text → disabled.text, border → disabled.border |
| loading | Async validation or options loading: trailing "Loading…" text in --in-progress-text with the ring icon; the control stays editable unless options are required. | fill → surface, text → text, border → border-interactive, adornment → in-progress.text |
| error | aria-invalid; boundary --status-error-text; helper = cross icon + message, linked by aria-describedby. | fill → surface, text → text, border → status.error.text, helper → status.error.text, icon → status.error.text |
| success | Only for server-confirmed values ("Email available"): helper = check icon + message; the boundary stays neutral. | fill → surface, text → text, border → border-interactive, helper → status.success.text, icon → status.success.text |

Contrast (both modes, from `check-tokens.mjs`): 25 required pairs, lowest 5.02:1 light / 7.60:1 dark; 1 informational pairs (inactive controls, decorative hairlines).

#### Checkboxes and radios

Checkboxes and radios: selection controls (D4), one family with one colour rule. An 18 px box (a radio: the same box with --radius-round and an 8 px dot) at --checkbox-size with the --border-interactive boundary on --surface; checked and indeterminate = the selection tint fill with the --selection-text glyph (the check, the dash, the dot), so the state is a shape change, never the hue alone; the label (--type-label at weight 400) is the accessible name and is clickable; a group has a group label and one helper line. A row checkbox in a table or DataGrid has no visible label, so its name is aria-label="Select {the row's first text cell}" ("Select Lin Yue"); the header checkbox is "Select all rows" and shows the dash (aria-checked="mixed") while some rows are selected. Keyboard: a checkbox is one tab stop and Space toggles it (aria-checked true / false / mixed); a radio group is one tab stop and Up/Down or Left/Right move the selection; a disabled box stays focusable (aria-disabled) with its reason in a toggletip and the helper.

Geometry and tokens of the component (not per state): `--checkbox-size` = size.checkbox — The 18 px box (a radio: the same size, round); `--checkbox-hit` = size.hit-checkbox — The hit area: the box with a fine pointer, 44 px with a coarse one; `--checkbox-radius` = radius.control — The box's corners; a radio uses --radius-round; `--checkbox-border-width` = border.interactive — The boundary is 1 px: a control's weight comes from colour, not thickness; `--checkbox-dot` = size.status-dot — The radio dot and the indeterminate dash's length (8 px); the dash is --size-marker thick; `--checkbox-label-gap` = space.label-gap — Box to label (8 px).

Variants:

- **checked**: Variant: checked (aria-checked="true"): the selection tint fill, the --selection-text boundary and the check glyph. (fill → selection.bg, border → selection.text, glyph → selection.text)
- **indeterminate**: Variant: indeterminate (aria-checked="mixed", a parent of a partly selected group): the tint, the --selection-text boundary and a dash (8 × 2 px) instead of the check. (fill → selection.bg, border → selection.text, glyph → selection.text)
- **radio-checked**: Variant: a radio, checked: the round box with the tint, the --selection-text boundary and the 8 px dot. (fill → selection.bg, border → selection.text, glyph → selection.text)

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Unchecked (a radio: unselected): --surface fill, --border-interactive boundary, no glyph; the label in --text at weight 400. | fill → surface, border → border-interactive, label → text |
| hover | The boundary darkens to --text (as a field's does); the fill does not change. | fill → surface, border → text |
| focus | The ring around the box (2 px --focus-ring at 2 px offset); the boundary does not change. | fill → surface, border → border-interactive, ring → focus-ring |
| active | Pressed: --surface-active fill with the --text boundary (the glyph appears on release). | fill → surface-active, border → text |
| disabled | Disabled: the disabled trio (--disabled-surface fill, --disabled-border boundary, a --disabled-icon glyph if checked) and the label in --disabled-text at weight 400, with the reason stated in the group's helper or the row's reason and linked by aria-describedby; the box stays focusable (aria-disabled); a row that cannot be acted on disables its checkbox this way ("Professors are removed by an admin"). | fill → disabled.surface, border → disabled.border, glyph → disabled.icon, label → disabled.text |
| loading | Saving a change that needs the server (a per-row permission): the box is inert (aria-busy) and keeps the requested state, the label gains the text dots ("Saving…"), and the ring icon sits beside it; the boundary stays --border-interactive. | fill → surface, border → border-interactive, icon → in-progress.text |
| error | A required box left unchecked at submit, or a group that failed to save: aria-invalid, the boundary --status-error-text, the cross icon + what happened and how to fix under the group (aria-describedby); the fill does not change. | fill → surface, border → status.error.text, helper → status.error.text, icon → status.error.text |
| success | Only for a server-confirmed change: the box checked (the checked variant) with a check + "Saved" helper for 2 s. | fill → selection.bg, border → selection.text, glyph → selection.text, helper → status.success.text, icon → status.success.text |

Contrast (both modes, from `check-tokens.mjs`): 23 required pairs, lowest 5.16:1 light / 7.60:1 dark; 1 informational pairs (inactive controls, decorative hairlines).

#### Tabs

Tabs (class tabs, admin page tabs, the IDE output tabs). --type-label 14/20 600 for every tab so selection does not reflow; unselected --text-secondary, selected --accent-text with a 2 px --selection-marker underline. Height per density. On overflow the list scrolls behind its own edges with chevron scroll buttons at the ends (MUI variant="scrollable", scrollButtons="auto", --icon-default) and no edge fade (the lock permits gradients only as hard stops); never wraps. Keyboard: the tab list is one tab stop with a roving tabindex: Left/Right move and select (automatic activation, MUI's default), Home/End jump to the first and last tab, Tab leaves to the panel; a disabled tab stays reachable by the arrows (aria-disabled) so its reason toggletip opens on focus, and Enter or Space do nothing on it.

Geometry and tokens of the component (not per state): `--tabs-height` = size.tab; `--tabs-padding-x` = space.inset-x; `--tabs-marker` = size.marker; `--tabs-gap` = space.tab-gap; `--tabs-hit` = size.hit-tab — The hit area of a tab: 44 px on coarse pointers; `--tabs-disabled-glyph` = size.icon-sm — The 16 px lock glyph before a disabled tab's label: a shape cue beside the weight, since --disabled-text and weight 400 alone would not tell it from a resting tab.

Variants:

- **selected**: Variant: selected (aria-selected). (fill → fill-none, text → selection.text, marker → selection.marker)

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Unselected. | fill → fill-none, text → text-secondary |
| hover | Tonal fill; the label darkens to --text. | fill → surface-hover, text → text |
| focus | Ring inset −2 px (the tab bar clips). | fill → fill-none, text → text-secondary, ring → focus-ring |
| active | Pressed. | fill → surface-active, text → text |
| disabled | Disabled tab: the label stays legible in --disabled-text (≥ 4.5), drops to weight 400 (every other tab label is 600) and carries the 16 px lock glyph in --disabled-icon before it (--tabs-disabled-glyph), so the state is a shape, not weight or colour alone; cursor: not-allowed; the reason ("No plots yet") is a toggletip that opens on hover, focus and tap, so the tab stays reachable by the arrow keys (aria-disabled, kept in the roving order) and cannot be activated. | fill → fill-none, text → disabled.text, icon → disabled.icon, weight → type-weight.regular |
| loading | The tab is unchanged; its panel shows a skeleton. | fill → fill-none, text → text-secondary |
| error | A tab whose panel failed shows the 16 px cross icon in --status-error-text after its label with a visually hidden "failed to load" for assistive tech: a shape and words, never colour alone (G1); the panel holds the error alert. | fill → fill-none, text → text-secondary, icon → status.error.text |
| success | None: tabs are navigation. | fill → fill-none, text → text-secondary |

Contrast (both modes, from `check-tokens.mjs`): 22 required pairs, lowest 5.16:1 light / 7.60:1 dark; 1 informational pairs (inactive controls, decorative hairlines).

#### Sidebar items

Admin sidebar items (220 / 56 px rail on --surface with a --border right hairline). Default --text label and --icon-default glyph; current = selection tint, --accent-text 600 label and glyph, 2 px --selection-marker inset left edge; a current child shows a 6 px --selection-marker dot. Collapsed, the rail is 56 px (--size-sidebar-collapsed) of icon-only rows the full rail width (no side margin), each named by aria-label with a tooltip, the current row keeping tint + marker. Items a role may not use are hidden, never disabled (JOURNEY D-4). Icons: KiwiIcons (feature identity). Keyboard: a navigation list, not a composite: Tab reaches each entry in order, Enter follows it; the collapse button toggles with Enter or Space and keeps focus.

Geometry and tokens of the component (not per state): `--sidebar-item-height` = size.nav-item; `--sidebar-item-padding-x` = space.inset-x; `--sidebar-item-icon-size` = size.icon; `--sidebar-item-gap` = space.inline; `--sidebar-item-radius` = radius.control; `--sidebar-item-margin-x` = space.edge-margin; `--sidebar-item-child-dot` = size.child-dot — The current child row's 6 px --selection-marker dot.

Variants:

- **current**: Variant: current page (aria-current). (fill → selection.bg, text → selection.text, icon → selection.text, marker → selection.marker)

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Resting entry: --text label, --icon-default glyph. | fill → fill-none, text → text, icon → icon.default |
| hover | Tonal fill; the glyph darkens to --icon-hover. | fill → surface-hover, text → text, icon → icon.hover |
| focus | Ring inset −2 px. | fill → fill-none, text → text, icon → icon.default, ring → focus-ring |
| active | Pressed. | fill → surface-active, text → text, icon → icon.hover |
| disabled | Does not occur: an entry the role may not use is hidden (D-4). Tokens exist so a temporarily unavailable entry (a Kiwi App whose registry failed) can show the reason in a toggletip. | fill → fill-none, text → disabled.text, icon → disabled.icon |
| loading | The skeleton sidebar (10 rows, aria-busy, "Loading admin navigation"). | fill → skeleton.base, text → skeleton.base |
| error | A failed role fetch renders an inline notice inside the rail instead of no sidebar (SR-3 error): the cross icon and the message wrap to as many lines as the 220 px rail needs (white-space normal, the item grows), and Retry is its own tertiary row below; nothing crosses the rail's hairline. | fill → fill-none, text → status.error.text, icon → status.error.text |
| success | None. | fill → fill-none, text → text, icon → icon.default |

Contrast (both modes, from `check-tokens.mjs`): 12 required pairs, lowest 5.18:1 light / 7.60:1 dark; 1 informational pairs (inactive controls, decorative hairlines).

#### Panels

Panels: a --surface sheet on the --background canvas, 1 px --border hairline, --radius-sheet, padding --space-panel. Sections inside are separated by --border-subtle rules and space, never by another panel (no nested cards). A control's --border-interactive boundary inside a panel is a signifier, not a container. Docked panels cast no shadow. Keyboard: a scrollable region is focusable (tabindex=0) and scrolls with the arrow keys; otherwise a panel has no keyboard behaviour of its own.

Geometry and tokens of the component (not per state): `--panel-padding` = space.panel; `--panel-radius` = radius.sheet; `--panel-border-width` = border.hairline.

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | A --surface sheet with a --border hairline on the canvas; sections divided by --border-subtle rules. | fill → surface, text → text, border → border, rule → border-subtle |
| hover | None: panels are not interactive. | fill → surface, text → text, border → border |
| focus | Only a keyboard-scrollable overflow region (tabindex=0) shows the ring, inset −2 px. | fill → surface, text → text, border → border, ring → focus-ring |
| active | None. | fill → surface, text → text, border → border |
| disabled | Never: a panel's controls disable individually; the panel never greys. | fill → surface, text → text, border → border |
| loading | A skeleton of its content shape inside (shimmer permitted); the frame and title stay. | fill → surface, text → text, border → border, skeleton → skeleton.base |
| error | An inline error alert at the top of the panel (role=alert); the panel itself is not recoloured. | fill → surface, text → text, border → border, alert → status.error.surface |
| success | An inline status (check + label) or a toast; no panel-level change. | fill → surface, text → text, border → border |

Contrast (both modes, from `check-tokens.mjs`): 9 required pairs, lowest 5.16:1 light / 9.13:1 dark; 1 informational pairs (inactive controls, decorative hairlines).

#### Dialogs

Dialogs: a --surface sheet with --shadow-2, 1 px --border, --radius-sheet, over the --backdrop (shadow-ink at 40 / 60 %). Width min(100% - 2 * var(--space-popup-margin), var(--dialog-width-sm|md|lg)) with height ≤ 80vh and a scrolling body, so a phone keeps a 12 px margin around it. Title --type-section-title, body at the page's density, body measure ≤ 75ch. Actions right-aligned: one filled primary (or the outlined destructive for confirmations) and a tertiary Cancel. Focus moves to the first focusable element, the background is inert, Escape closes, focus returns to the trigger. Enter: fade + 8 px translate, 220 ms; exit 176 ms. Keyboard: on open focus moves to the first focusable element (the title for confirmations), Tab and Shift+Tab cycle inside, Escape closes, focus returns to the trigger; the background is inert.

Geometry and tokens of the component (not per state): `--dialog-width-sm` = size.dialog-sm — The dialog's maximum width; the drawn width is min(100% - 2 * var(--space-popup-margin), var(--dialog-width-sm)), so on a phone the sheet keeps a 12 px margin and never exceeds the viewport; `--dialog-width-md` = size.dialog-md — The dialog's maximum width; the drawn width is min(100% - 2 * var(--space-popup-margin), var(--dialog-width-md)), so on a phone the sheet keeps a 12 px margin and never exceeds the viewport; `--dialog-width-lg` = size.dialog-lg — The dialog's maximum width; the drawn width is min(100% - 2 * var(--space-popup-margin), var(--dialog-width-lg)), so on a phone the sheet keeps a 12 px margin and never exceeds the viewport; `--dialog-max-height` = 80vh — The sheet never fills the viewport; its body scrolls; `--dialog-padding` = space.panel; `--dialog-radius` = radius.sheet; `--dialog-shadow` = shadow.2 — Elevation alias: --shadow-2.

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Open. | fill → surface, text → text, border → border, backdrop → backdrop, title → text |
| hover | None on the sheet; its controls hover. | fill → surface, text → text, border → border |
| focus | On open, focus lands on the first focusable element (or the title for confirmations); Tab cycles inside. | fill → surface, text → text, border → border, ring → focus-ring |
| active | None. | fill → surface, text → text, border → border |
| disabled | The primary is disabled while the form is invalid, with the reason under the invalid field; Cancel is never disabled. | fill → surface, text → text, border → border, primary → disabled.surface |
| loading | The primary shows label + dots; the other controls disable; close stays enabled unless the request cannot be cancelled. | fill → surface, text → text, border → border |
| error | An inline error alert above the actions receives focus; the dialog stays open with the entered values. | fill → surface, text → text, border → border, alert → status.error.surface, alert-text → status.error.text |
| success | The dialog closes; a toast confirms (check + label, 6 s). | fill → surface, text → text, border → border |

Contrast (both modes, from `check-tokens.mjs`): 11 required pairs, lowest 5.51:1 light / 7.71:1 dark.

#### Alerts

Alerts: the -3 surface with the -11 shape icon and text (check / triangle / cross / i); no coloured left border; --radius-control; padding 12/16. Title 600 + body. An optional action (Retry, Dismiss, Change range) is a text action in the status's -11 colour: underlined at rest (1 px, --border-width-underline), 600; hover thickens the underline to 2 px; focus is the ring; pressed is the 2 px underline with the shared press scale. The same pattern draws the toast's and the banner's actions, so a text action looks one way everywhere and its affordance does not depend on hover. The neutral variant is the in-progress notice (ring icon + dots). Keyboard: Tab reaches the text action and the dismiss button (the action is a link-styled button, so Enter and Space press it); an alert that appears after a failed submit (role=alert) receives focus.

Geometry and tokens of the component (not per state): `--alert-padding` = space.inset-y; `--alert-padding-x` = space.inset-x; `--alert-radius` = radius.control; `--alert-icon-size` = size.icon; `--alert-gap` = space.inline; `--alert-action-underline` = border.underline — the text action's underline at rest; `--alert-action-underline-hover` = border.underline-hover — the text action's underline on hover and while pressed; `--alert-action-hit` = size.hit-text-action — the text action's hit area: its line box with a fine pointer, 44 px on a coarse one (a centred pseudo-element).

Variants:

- **error**: Variant: error. (fill → status.error.surface, text → status.error.text, icon → status.error.text, action → status.error.text)
- **success**: Variant: success. (fill → status.success.surface, text → status.success.text, icon → status.success.text, action → status.success.text)
- **warning**: Variant: warning. (fill → status.warning.surface, text → status.warning.text, icon → status.warning.text, action → status.warning.text)
- **info**: Variant: info. (fill → status.info.surface, text → status.info.text, icon → status.info.text, action → status.info.text)
- **neutral**: Variant: in progress ("Analysing student questions…", TD-29) with the neutral progress bar. (fill → in-progress.surface, text → in-progress.text, icon → in-progress.text)

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | The variant that applies (info shown); its text action underlined at rest (1 px). | fill → status.info.surface, text → status.info.text, icon → status.info.text, action → status.info.text |
| hover | The hovered action's underline thickens to 2 px; the surface does not change. | fill → status.info.surface, text → status.info.text, action → status.info.text |
| focus | The ring on the focused action or dismiss button; an error alert with role=alert receives focus when it appears after a failed submit. | fill → status.info.surface, text → status.info.text, action → status.info.text, ring → focus-ring |
| active | Pressed action: the 2 px underline and the shared press scale (0.98 for --motion-micro). | fill → status.info.surface, text → status.info.text, action → status.info.text |
| disabled | Never: an alert is a message. | fill → status.info.surface, text → status.info.text |
| loading | The neutral variant: ring icon, dots, and the neutral LinearProgress (--in-progress-bar on --in-progress-track). | fill → in-progress.surface, text → in-progress.text, icon → in-progress.text, bar → in-progress.bar, track → in-progress.track |
| error | The error variant: what happened, why, how to fix; a Retry action where one exists. | fill → status.error.surface, text → status.error.text, icon → status.error.text |
| success | The success variant: check + label; stays until dismissed or the page changes. | fill → status.success.surface, text → status.success.text, icon → status.success.text |

Contrast (both modes, from `check-tokens.mjs`): 31 required pairs, lowest 4.90:1 light / 6.39:1 dark.

#### Toasts

Toasts (snackbars): a --surface sheet with --shadow-1 and a 1 px --border, width: min(100% - 2 × --toast-edge-offset, --toast-max-width) (at most 420 px; on a 390 px phone 342 px, the launcher's 24 px kept from both edges), entering from the bottom edge by 8 px in 220 ms. Neutral text, or a status icon + label in the status's -11. Bottom-right 24/16 px measured from the safe area (bottom: calc(var(--toast-offset-y) + env(safe-area-inset-bottom, 0px)); bottom-left on app tabs, beside the launcher); one at a time. Timing (WCAG 2.2.1): an info or success toast without an action auto-dismisses after 6 s, and its timer pauses while the pointer is over it, while anything inside it has focus (focus-within) and while the window has lost focus; a toast that carries an action (Undo after a removal) stays until dismissed, or at least 10 s under the same pause rules; error toasts persist until dismissed. Every toast carries Dismiss; an error toast adds Retry where a retry exists; an Undo toast shows Undo beside Dismiss. Keyboard path: the toast is rendered immediately after the control that raised it, so it is the next tab stop (one Tab from the trigger reaches Undo or Dismiss, Shift+Tab returns); the live region announces the message, and an error toast (role=alert) takes focus while an info or success toast (role=status) does not; Escape dismisses the focused toast. Queue: a new info or success toast replaces a visible info or success toast that carries no action; a toast with an action and an error toast are never replaced silently: they stay until dismissed and later toasts queue behind them (first in, first out, at most three queued; identical messages collapse into one with a count).

Geometry and tokens of the component (not per state): `--toast-max-width` = size.toast-max; `--toast-padding` = space.inset-y; `--toast-padding-x` = space.inset-x; `--toast-radius` = radius.control; `--toast-icon-size` = size.icon — The status icon (24 comfortable / 20 compact), like the alert's; `--toast-offset-x` = space.float-offset-x; `--toast-offset-y` = space.float-offset-y; `--toast-edge-offset` = space.float-offset-x — The distance a toast keeps from both viewport edges: width: min(100% - 2 × --toast-edge-offset, --toast-max-width), so a 390 px phone shows a 342 px toast and a wide viewport the 420 px maximum; `--toast-shadow` = shadow.1 — Elevation alias: --shadow-1; `--toast-action-underline` = border.underline — Dismiss / Retry / Undo: the text action's underline at rest; `--toast-action-underline-hover` = border.underline-hover — on hover and while pressed; `--toast-action-hit` = size.hit-text-action — Dismiss / Retry / Undo: the hit area, 44 px on coarse pointers.

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Neutral / info message: the i glyph in --icon-default (the toast's icon.default role), the text, and Dismiss as an underlined text action in --link (the one text-action pattern); 6 s unless paused. | fill → surface, text → text, border → border, icon → icon.default, action → link |
| hover | The auto-dismiss timer pauses (as it does on focus-within and on window blur); a hovered action thickens its underline to 2 px; the sheet itself does not change. | fill → surface, text → text, border → border, icon → icon.default, action → link |
| focus | Ring on Dismiss / the action. The toast is the next tab stop after the control that raised it; an error toast (role=alert) takes focus, an info or success toast (role=status) does not; Escape dismisses the focused toast. | fill → surface, text → text, border → border, icon → icon.default, action → link, ring → focus-ring |
| active | Pressed action: the 2 px underline and the shared press scale. | fill → surface, text → text, border → border, icon → icon.default, action → link |
| disabled | Never. | fill → surface, text → text, border → border |
| loading | In progress ("Exporting…"): ring icon + dots, no auto-dismiss, replaced by the outcome. | fill → surface, text → in-progress.text, border → border, icon → in-progress.text |
| error | Persistent until dismissed: cross + what failed, Retry where a retry exists and Dismiss always; later toasts queue behind it. | fill → surface, text → status.error.text, border → border, icon → status.error.text |
| success | Check + label ("3 students enrolled") with Dismiss, 6 s unless hovered, focused or the window loses focus; a success toast that carries Undo (after a removal) stays until dismissed or at least 10 s under the same pause rules and is never replaced by a later toast. | fill → surface, text → status.success.text, border → border, icon → status.success.text |

Contrast (both modes, from `check-tokens.mjs`): 15 required pairs, lowest 5.16:1 light / 7.60:1 dark.

#### Tables

Tables sit on the canvas as rules, not cards: outer --border rules top and bottom, --border-subtle row dividers, no fill. Header --type-label in --text-secondary; cells --type-body (compact 14/20); numbers right-aligned with tabular numerals; dates fixed-format. Cells are one line with ellipsis and the full text in a tooltip on hover and focus (the truncated span is focusable), except designated wrap columns clamped at two lines. Minimum column widths; below their sum the table scrolls in its own container, never the page. Toolbar buttons never wrap: below a 1120 px container they collapse to icon + count. In the toolbar the destructive action (Remove selected) is left-aligned at the start, a flexible spacer away from Email selected and the filled primary at the end, in the labelled and the collapsed variant alike (placed apart, D4). Selected rows: selection tint + 2 px inset marker. Keyboard: Tab moves between the focusable cells (links, truncated spans, row checkboxes) in reading order; Space toggles a row's checkbox; sortable headers are buttons.

Geometry and tokens of the component (not per state): `--table-row-height` = size.row; `--table-cell-x` = space.cell-x; `--table-cell-y` = space.cell-y; `--table-col-min-text` = size.col-min-text; `--table-col-min-date` = size.col-min-date; `--table-col-min-num` = size.col-min-num; `--table-col-min-status` = size.col-min-status; `--table-col-min-check` = size.col-min-check; `--table-toolbar-collapse` = 1120px — Container width below which labelled toolbar buttons become icon + count.

Variants:

- **selected**: Variant: selected row. (fill → selection.bg, text → text, marker → selection.marker)
- **header**: Header row. (fill → fill-none, text → text-secondary, rule → border)

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Rows on the canvas (or on a panel sheet). | fill → fill-none, text → text, rule → border-subtle, link → link |
| hover | Row hover: --surface-hover, instantly. | fill → surface-hover, text → text, secondary → text-secondary |
| focus | Ring inset −2 px on the focused row, cell or truncated span. | fill → fill-none, text → text, ring → focus-ring |
| active | Pressed row (selectable tables). | fill → surface-active, text → text |
| disabled | A row that cannot be acted on: --disabled-text with the reason in a toggletip (hover, focus and tap; inline under (hover: none), aria-describedby) ("Professors are removed by an admin"); its checkbox is disabled. | fill → fill-none, text → disabled.text |
| loading | Skeleton rows at the row height with the real header; shimmer permitted; aria-busy on the table. | fill → fill-none, text → text, skeleton → skeleton.base |
| error | The header stays; the body slot holds an error alert (cross + "Couldn't load students" + Retry). | fill → fill-none, text → text, alert → status.error.surface, alert-text → status.error.text |
| success | A row-level success is a status chip in the row; a bulk success is a toast. The empty variant renders the empty-state frame in the body slot. | fill → fill-none, text → text, chip → status.success.text |

Contrast (both modes, from `check-tokens.mjs`): 18 required pairs, lowest 5.16:1 light / 7.15:1 dark; 2 informational pairs (inactive controls, decorative hairlines).

#### DataGrid (MUI X) mapping

MUI X DataGrid, mapped to the table rules: density compact on admin pages (row and header 36), header text --text-secondary 600 on the canvas, row border --border-subtle, hover --surface-hover, selected --selection-bg, cell focus outline 2 px --focus-ring inset (replacing the 1 px primary outline), checkbox per the field spec, loading overlay = skeleton rows, no-rows overlay = the empty-state frame, errors as the table's error state (the alert with Retry in the body slot under the header; a failed refresh re-fetches on Retry, the grid does not keep stale rows). Footer (and TablePagination where a page uses it): a row at the grid's row height with a --border top rule, the row count ('1–10 of 42') in --type-caption --text-secondary tabular, 'Rows per page' with a compact select field, and first / previous / next / last as compact icon buttons, the unavailable ones disabled with the reason in their toggletip ('You're on the first page'). Sort icons are --icon-default, the sorted column's --icon-accent; column separators --border-subtle; the column menu and filter panel are small popups (surface, 1 px --border, --shadow-1, menu-item rules); the selected-row count in the footer is --text-secondary. Implemented through MuiDataGrid styleOverrides reading the CSS variables, so the theme and the grid cannot drift. Keyboard: MUI X's grid model: the grid is one tab stop, the arrow keys move between cells, Space selects the row, Enter activates a cell's action, Home/End and Page Up/Down as the grid defines; the footer's pagination buttons are ordinary tab stops.

Geometry and tokens of the component (not per state): `--data-grid-row-height` = size.row; `--data-grid-header-height` = size.row; `--data-grid-cell-x` = space.cell-x; `--data-grid-col-min-text` = size.col-min-text; `--data-grid-col-min-date` = size.col-min-date; `--data-grid-col-min-num` = size.col-min-num; `--data-grid-col-min-status` = size.col-min-status; `--data-grid-col-min-check` = size.col-min-check; `--data-grid-footer-height` = size.row — the footer row (row count, rows per page, pagination) at the grid's density.

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Rows on the canvas at the grid's density; header --text-secondary 600; row dividers --border-subtle. | fill → fill-none, text → text, header → text-secondary, rule → border-subtle |
| hover | Row hover: --surface-hover. | fill → surface-hover, text → text |
| focus | Cell focus: 2 px --focus-ring inset. | fill → fill-none, text → text, ring → focus-ring |
| active | Pressed row. | fill → surface-active, text → text |
| disabled | As the table. | fill → fill-none, text → disabled.text |
| loading | slots.loadingOverlay = skeleton rows. | fill → fill-none, text → text, skeleton → skeleton.base |
| error | The header stays and the body slot holds the error alert (cross + "Couldn't load students" + Retry), as the table does; a failed refresh re-fetches on Retry and the grid keeps no stale rows. | fill → fill-none, text → text, alert → status.error.surface, alert-text → status.error.text |
| success | A toast after a row action; selected rows clear. | fill → fill-none, text → text |

Contrast (both modes, from `check-tokens.mjs`): 11 required pairs, lowest 5.16:1 light / 7.71:1 dark; 2 informational pairs (inactive controls, decorative hairlines).

#### KPI tiles

KPI tiles (Class Analytics, System Analytics): a --surface sheet with a --border hairline; label --type-label in --text-secondary; value --type-kpi-value (24/32 600, tabular) in --text; icon always --icon-default (TD-27: one colour rule); a trend or baseline line in --type-caption with a direction glyph, or "no baseline" (Phase 6 applies). Minimum 200 px; the row wraps, the tile never shrinks its type. Keyboard: a tile is in the tab order only when it links (Enter follows).

Geometry and tokens of the component (not per state): `--kpi-tile-padding` = space.panel; `--kpi-tile-radius` = radius.sheet; `--kpi-tile-min-width` = size.kpi-min; `--kpi-tile-icon-size` = size.icon.

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Label (--text-secondary), value (--text, 24/32 600 tabular), icon (--icon-default), trend caption. | fill → surface, value → text, label → text-secondary, icon → icon.default, trend → text-secondary |
| hover | Only when the tile links to a detail (then it is a link: cursor, hover fill). | fill → surface-hover, value → text, label → text-secondary |
| focus | Ring when the tile is a link. | fill → surface, value → text, label → text-secondary, ring → focus-ring |
| active | Pressed link tile. | fill → surface-active, value → text, label → text-secondary |
| disabled | Never: an unavailable metric is the error state. | fill → surface, value → text, label → text-secondary |
| loading | The label stays; the value slot is a skeleton bar of the value's height (no layout shift). | fill → surface, label → text-secondary, skeleton → skeleton.base |
| error | The value slot shows the cross glyph (--status-error-text) + "Unavailable" and a Retry tertiary button; the header icon stays --icon-default (TD-27: one colour rule for KPI icons). | fill → surface, label → text-secondary, value → status.error.text, icon → icon.default, error-glyph → status.error.text |
| success | None: a metric has no success. | fill → surface, value → text, label → text-secondary |

Contrast (both modes, from `check-tokens.mjs`): 16 required pairs, lowest 5.16:1 light / 7.15:1 dark.

#### The empty-state frame

The empty-state frame (no classes, no conversation yet, no experiments, no results, not found): on the ruled reading column; the mascot still pose in the companion.slot.empty slot (Phase 4 sizes it; this phase fixes the surround: 24 px below the slot, 8 px between line and copy); a --type-page-title line (--type-display-lg for page-level empties); copy in --text-secondary at --type-body; at most one primary button. No illustration beyond the mascot, no card, no gradient. Never shown while loading (the skeleton holds the slot). Keyboard: the call to action is the frame's one tab stop; Enter or Space presses it. A role without the action (a student with no classes yet, an instructor without the create-class permission) sees no call to action at all: the no-action variant, hidden, never disabled (JOURNEY D-4). The disabled state is reserved for a role that has the action while a precondition is unmet, with the precondition stated in the copy.

Geometry and tokens of the component (not per state): `--empty-state-slot-gap` = space.frame-gap; `--empty-state-line-gap` = space.line-gap; `--empty-state-cta-gap` = space.frame-gap; `--empty-state-max-width` = measure.prose.

Variants:

- **no-action**: Variant: no action for this role (a student with no classes, an instructor without the permission): the frame carries the copy that says who acts and when, and no button, so the frame has no tab stop (hidden, never disabled; JOURNEY D-4). (fill → fill-none, title → text, copy → text-secondary, ruler → border-strong)

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | The frame: mascot slot, --type-page-title line, --text-secondary copy, at most one primary button, on the ruler; the role has the action (an instructor or admin), so the copy says what the first item does and the button creates it. | fill → fill-none, title → text, copy → text-secondary, ruler → border-strong |
| hover | None; the CTA hovers as a primary button. | fill → fill-none, title → text, copy → text-secondary |
| focus | Ring on the CTA. | fill → fill-none, title → text, copy → text-secondary, ring → focus-ring |
| active | Pressed CTA. | fill → fill-none, title → text, copy → text-secondary |
| disabled | The CTA disabled with its reason in the copy, only where the role has the action and a precondition is unmet ("Add a system prompt in Class settings before you create an experiment"); the copy is the button's aria-describedby. A role without the action gets the no-action variant, never a disabled button (JOURNEY D-4). | fill → fill-none, title → text, copy → text-secondary, cta → disabled.surface |
| loading | Not shown: a skeleton of the list holds the slot until the request settles, so an empty frame never flashes before content. | fill → fill-none, skeleton → skeleton.base |
| error | The same frame with the companion's error pose, the cross icon and the error copy (what happened, how to retry) and a Retry secondary button; not an empty state. | fill → fill-none, title → text, copy → status.error.text, icon → status.error.text |
| success | None: content replaces the frame. | fill → fill-none, title → text, copy → text-secondary |

Contrast (both modes, from `check-tokens.mjs`): 22 required pairs, lowest 5.16:1 light / 7.60:1 dark; 2 informational pairs (inactive controls, decorative hairlines).

#### The Display menu

The Display menu (G4): an icon button in the top bar's right-hand group ("Display settings", Material TuneOutlined), opening a small popup (catalog contract) with two labelled groups: Theme (System / Light / Dark radio items, check glyph on the current) when the dark flag is on, and Kiwi animation (a switch) when the motion flag is on; the button is hidden when neither group shows. Choices apply instantly and persist per device (localStorage); sign-in and register honour them. Keyboard: Enter, Space or Down opens the menu with focus on the current item; Up/Down move, Home/End jump, typing a letter jumps, Enter or Space chooses, Escape closes and returns focus to the button.

Geometry and tokens of the component (not per state): `--display-menu-min-width` = size.menu-min; `--display-menu-max-width` = size.menu-max; `--display-menu-item-height` = size.menu-item — 40 px; 44 on coarse pointers; `--display-menu-item-x` = space.menu-item-x; `--display-menu-radius` = radius.control; `--display-menu-viewport-margin` = space.popup-margin; `--display-menu-shadow` = shadow.1 — Elevation alias: --shadow-1.

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Open: --surface, --shadow-1, 1 px --border; items --type-popup-title 14/20; group labels --type-popup-supporting 12/16 600. | fill → surface, text → text, border → border, group-label → text-secondary, check → selection.text |
| hover | Item hover. | fill → surface-hover, text → text |
| focus | Ring inset on the item; arrow keys move, Escape closes and returns focus to the button. | fill → surface, text → text, ring → focus-ring |
| active | Pressed item. | fill → surface-active, text → text |
| disabled | A group whose flag is off is hidden, not disabled. The one inert item is the Kiwi animation switch while the device asks for reduced motion (precedence: deployment flag > prefers-reduced-motion > the switch, DW-4.3): drawn inert (aria-disabled) with its reason in the menu's caption ("Your device asks for reduced motion", Phase 5 words; aria-describedby). | fill → surface, text → disabled.text |
| loading | None: preferences are local. | fill → surface, text → text |
| error | If localStorage is unavailable the choice applies for the session and a caption reads "Not saved on this device". | fill → surface, text → text, caption → text-secondary |
| success | The check moves to the chosen item immediately (optimistic); the page re-themes with no transition. | fill → surface, text → text, check → selection.text |

Contrast (both modes, from `check-tokens.mjs`): 12 required pairs, lowest 5.53:1 light / 7.92:1 dark; 1 informational pairs (inactive controls, decorative hairlines).

#### The floating chat launcher

The floating chat launcher (locked: 56 px, --accent-solid fill, --accent-on-solid icon, --shadow-2). Resting offset 24 px from the side and 96 px above the bottom (bottom-left on app tabs), measured from the safe area (right: calc(var(--launcher-offset-x) + env(safe-area-inset-right, 0px)); bottom: calc(var(--launcher-offset-y) + env(safe-area-inset-bottom, 0px))), 8 px edge margin, draggable and snapping as today; position is Stage 2. Hidden while the panel is open (fade 176 ms). Its own region in the floating layer, so it does not count against the page's one filled primary. Keyboard: the launcher is the last tab stop of the page (a fixed surface after the main content); Enter or Space opens the panel; Escape inside the panel closes it and returns focus to the launcher.

Geometry and tokens of the component (not per state): `--launcher-size` = size.launcher; `--launcher-icon-size` = size.icon-fixed — 24 px in both densities: the launcher is a fixed surface; `--launcher-radius` = radius.round; `--launcher-offset-x` = space.float-offset-x; `--launcher-offset-y` = 96px — The locked resting offset above the bottom edge; `--launcher-edge-margin` = space.edge-margin; `--launcher-z` = z.launcher; `--launcher-shadow` = shadow.2 — Elevation alias: --shadow-2; `--launcher-press-scale` = motion.press-scale — active: the shared press scale; `--launcher-badge-size` = size.badge — The count badge: a 20 px disc; `--launcher-badge-radius` = radius.round — The badge is round (one of the three radii); never a pill.

Variants:

- **badge**: The count badge, if ever shown, is neutral (a count is not an error): a 20 px --launcher-badge-size disc (--launcher-badge-radius 50 %), --surface fill, the count in --text at --type-caption 600 on a 1 px --border; counts above 9 read 9+. The launcher itself is not a toggle: it opens the panel and hides while the panel is open, so it carries no selected state. (fill → surface, text → text, border → border)

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | Resting: --accent-solid fill, --accent-on-solid glyph, --shadow-2, 56 px round. | fill → accent-solid, icon → accent-on-solid |
| hover | Fill steps; the shadow does not grow (no glow). | fill → accent-solid-hover, icon → accent-on-solid |
| focus | Ring 2 px at 2 px offset. | fill → accent-solid, icon → accent-on-solid, ring → focus-ring |
| active | Pressed: the fill steps to --accent-solid-active (past hover) + scale 0.98. | fill → accent-solid-active, icon → accent-on-solid |
| disabled | Never disabled: hidden while the panel is open. | fill → disabled.surface, text → disabled.text, border → disabled.border |
| loading | Unchanged: progress lives in the panel. | fill → accent-solid, icon → accent-on-solid |
| error | Unchanged: errors live in the panel (no red dot; the launcher never alarms). | fill → accent-solid, icon → accent-on-solid |
| success | None. | fill → accent-solid, icon → accent-on-solid |

Contrast (both modes, from `check-tokens.mjs`): 13 required pairs, lowest 5.16:1 light / 8.27:1 dark.

#### The tutor-message surface

The tutor-message surface: a tutor row is a 32 px avatar slot (G9) + 12 px gap + the answer column, on the message region's ruler (text 68 px right of the rule). Answer text --type-body 16/24, CJK-dominant blocks 28, measure 68ch, blocks 12 px apart, messages 24 px apart. Links --link underlined. Code blocks: --type-code 14/24 on a transparent ground with a 2 px --editor-block-rule left rule and a Copy icon button (--tutor-message-copy-button 28 px with a 16 px glyph; hit area --tutor-message-copy-hit: 28 fine / 44 coarse); inline code on --editor-inline-bg; display math bare and centred with overflow scroll. Citations [Page N] are --link in --type-caption with a 44 px hit area on coarse pointers (--tutor-message-citation-hit). The feedback toolbar is a row of 28 px icon buttons (16 px glyphs, 44 px targets on coarse pointers) on a 28 px line so it ticks once; the two thumbs are toggles (aria-pressed) and the chosen one is drawn as a filled glyph in --selection-text, the other as an outline. The panel's chrome (header, session bar, model select, composer) is compact tool chrome on every route, student pages included (36 px icon buttons and a 36 px composer field and Send), while the message region is a comfortable reading surface (16/24); on coarse pointers the chrome's controls carry 44 px hit areas. While an answer streams the composer's Send becomes Stop (secondary) and the toolbar is hidden until the answer completes. Keyboard: the feedback toolbar is one tab stop with a roving tabindex (Left/Right between its five buttons, Enter or Space presses); citations are links; the Copy button is a tab stop inside its code block; Escape while the composer has focus stops a streaming answer.

Geometry and tokens of the component (not per state): `--tutor-message-avatar` = size.avatar; `--tutor-message-avatar-gap` = space.block; `--tutor-message-block-gap` = space.block; `--tutor-message-message-gap` = space.message; `--tutor-message-measure` = measure.prose; `--tutor-message-measure-cjk` = measure.cjk; `--tutor-message-code-rule-width` = size.code-rule; `--tutor-message-toolbar-button` = size.toolbar-button-sm — the drawn feedback-toolbar button: a 16 px glyph on a 28 px square; `--tutor-message-toolbar-line` = size.toolbar-button-sm — the toolbar row's line height, so the row ticks the ruler once; `--tutor-message-toolbar-hit` = size.hit-toolbar — the hit area: 28 with a fine pointer, 44 with a coarse one; `--tutor-message-toolbar-pitch` = size.pitch-toolbar — centre-to-centre pitch: 30 fine, 44 coarse; `--tutor-message-copy-button` = size.toolbar-button-sm — The code block's Copy icon button: a 16 px glyph on a 28 px square, like the feedback toolbar's buttons; `--tutor-message-copy-hit` = size.hit-toolbar — The Copy button's hit area: 28 with a fine pointer, 44 with a coarse one; `--tutor-message-citation-hit` = size.hit-text-action — A citation's hit area: its line box with a fine pointer, 44 px on a coarse one.

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | A complete answer on the panel sheet; the companion is idle (Phase 4). | fill → fill-none, text → text, link → link, code → text, code-rule → editor.block-rule, inline-code-bg → editor.inline-bg, citation → link, toolbar → icon.default |
| hover | Only the toolbar buttons and citations hover (icon-button rules); text never does. | fill → fill-none, text → text, toolbar → icon.hover, toolbar-fill → surface-hover |
| focus | Ring on toolbar buttons, citations and the Copy button. | fill → fill-none, text → text, ring → focus-ring |
| active | Pressed toolbar button. | fill → fill-none, text → text, toolbar → icon.hover, toolbar-fill → surface-active |
| disabled | Regenerate and Share: --disabled-icon glyphs with the reason "Not available yet" in a toggletip on the control itself (aria-disabled keeps it focusable; hover, focus and tap; inline under (hover: none)), wired with aria-describedby (SF-53); never a silent grey. | fill → fill-none, text → text, toolbar → disabled.icon |
| loading | Waiting: the text dots in --in-progress-text where the answer will start ("Thinking…" + dots, Phase 5 words) and the companion walks (Phase 4); the composer is disabled with its own stated reason ("Kiwi is answering; Stop interrupts", aria-describedby) and Send becomes Stop (secondary), which stays enabled. Streaming: text appears as it arrives, unanimated; Stop stays; the toolbar is hidden. | fill → fill-none, text → in-progress.text, stop → accent-text |
| error | An error row: cross icon + what happened and how to retry in --status-error-text on the --status-error-surface, with a Retry secondary button (not filled); the companion shows its error pose. | fill → status.error.surface, text → status.error.text, icon → status.error.text |
| success | Answer complete: the toolbar appears enabled, the composer re-enables and takes focus; the chosen thumb is drawn filled in --selection-text (aria-pressed="true") and the other stays an outline in --icon-default (today both grey out); the companion hops once (Phase 4). | fill → fill-none, text → text, toolbar → icon.default, thumb-chosen → selection.text |

Variants:

- **thumb-chosen**: Variant: the chosen feedback thumb (aria-pressed="true"): its glyph is drawn filled in --selection-text while the other thumb stays an outline in --icon-default (aria-pressed="false"), so the choice is a change of shape, not only of hue. (fill → fill-none, glyph → selection.text)

Contrast (both modes, from `check-tokens.mjs`): 15 required pairs, lowest 5.51:1 light / 7.71:1 dark; 1 informational pairs (inactive controls, decorative hairlines).

#### The PDF viewer (react-pdf): toolbar, canvas, paper, pins, search panel, banner

The PDF viewer (react-pdf): the toolbar and the surfaces around the paper, on S-02 (file name, previous / next, "n / N", zoom out, "100 %", zoom in, fullscreen), S-09 and A-24 (Search and Thumbnails as tertiary toggles whose pressed look is the tertiary pressed variant (aria-pressed), First, Previous, the page field "3 / 12", Next, Last, zoom, Fit width, Open / print, Fullscreen; the search panel; the thumbnail strip). The bar is tool chrome on both areas: 44 px, on --surface with a 1 px --border-subtle bottom rule, holding compact (36 px) icon buttons with --icon-default glyphs, the file name in --type-label, page and zoom labels in --type-caption tabular --text-secondary, 1 px × 18 px --border-subtle dividers, and the page field as a compact field (--border-interactive). The scroll area is the canvas (--background) with --space-panel padding; each page is paper on a 1 px --paper-frame hairline (no shadow: docked surfaces cast none), dimmed to 92 % in dark mode (--pdf-toolbar-paper-dim → --opacity-paper-dim) so the white paper does not glare; the page the chat has in context carries a 2 px --border-interactive outline and the bar shows the neutral "In context" chip, so the cue is not colour alone and no brand colour touches the paper's edge (TD-08). Marks drawn on the paper never follow the mode (G5): comment pins visible to students are --on-paper-pin discs with the 16 px speech-bubble glyph in --on-paper-page (the system's own SVG: an emoji ignores color, has no token and varies by platform); hidden-from-students pins (A-24) are --on-paper-page discs with a 2 px --on-paper-pin ring; chunk boxes are 1 px --on-paper-chunk, the selected chunk 2 px --on-paper-pin over the --on-paper-wash, the drag box dashed --on-paper-chunk. The search panel is a floating --surface sheet (1 px --border, --shadow-1) with a compact field, Find (secondary) and Next match (tertiary) and a status line; the thumbnail strip shows paper miniatures on hairline frames on the canvas, the current one outlined like the page, with --type-caption page numbers. The summary banner is an info alert (--status-info-surface, the i glyph and text in --status-info-text, Read as its action, an icon-button close) floating at the top of the viewer with --shadow-1; its re-show button is a neutral icon button with the neutral count badge. The student page's icon rail and "Class Materials" drawer are a panel with sidebar-item rows (the selected file: selection tint + check glyph) and two exclusive filter chips (Lecture / Recitation). Keyboard: the toolbar is one tab stop with a roving tabindex (Left/Right move between its buttons, Enter/Space press; the page field takes digits and Enter); Escape closes the search panel and returns focus to Search.

Geometry and tokens of the component (not per state): `--pdf-toolbar-height` = size.toolbar-bar; `--pdf-toolbar-button-size` = size.control-icon; `--pdf-toolbar-button-hit` = size.hit-icon; `--pdf-toolbar-icon-size` = size.icon; `--pdf-toolbar-field-width` = 56px — the page field: room for 'nn / nn'; `--pdf-toolbar-field-height` = size.control; `--pdf-toolbar-field-hit` = size.hit-control — The page field's hit area: 44 px on coarse pointers; `--pdf-toolbar-divider-height` = size.toolbar-divider — the 1 px dividers between button groups; `--pdf-toolbar-canvas-padding` = space.panel; `--pdf-toolbar-paper-dim` = opacity.paper-dim — The page's opacity: 1 in light, 0.92 in dark (G5: paper may be dimmed to no less than 92 % against glare); the marks on the page dim with it and keep their contrast to the page; `--pdf-toolbar-page-outline` = size.marker — the in-context outline; `--pdf-toolbar-pin` = size.pin — comment pin disc on the paper; `--pdf-toolbar-pin-glyph` = size.icon-sm — The 16 px speech-bubble glyph on a pin disc (the system's own SVG, never an emoji); `--pdf-toolbar-pin-hit` = size.hit-pin — The pin's hit area: 24 px with a fine pointer, 44 px on a coarse one (a centred pseudo-element), so a comment on the paper opens under a finger; `--pdf-toolbar-drawer-row-hit` = size.hit-control — The drawer's file rows (S-02): 36 px drawn in the compact drawer, a 44 px hit area on coarse pointers through a centred pseudo-element the row's full width; `--pdf-toolbar-drawer-row-gap` = space.hit-row-gap — The gap between the drawer's file rows: 0 with a fine pointer, 8 px on a coarse one, so the 36 px rows sit on a 44 px pitch and their hit areas never overlap; `--pdf-toolbar-search-panel-width` = size.menu-max — the small-popup maximum width; `--pdf-toolbar-search-panel-shadow` = shadow.1 — Elevation alias: --shadow-1; `--pdf-toolbar-banner-shadow` = shadow.1 — Elevation alias: --shadow-1; `--pdf-toolbar-banner-action-underline` = border.underline — the banner's Read action: the text-action pattern; `--pdf-toolbar-banner-action-underline-hover` = border.underline-hover; `--pdf-toolbar-banner-action-hit` = size.hit-text-action — Read: the banner action's hit area, 44 px on coarse pointers.

Variants:

- **page-current**: The page the chat has in context: a 2 px --border-interactive outline (neutral, ≥ 3:1 on the canvas) plus the "In context" chip in the bar. (outline → border-interactive, frame → paper-frame, canvas → background)
- **pin-visible**: A comment visible to students: a --on-paper-pin disc on the paper with the 16 px speech-bubble glyph in --on-paper-page, identical in both modes (G5); 24 px drawn, a 44 px hit area on coarse pointers (--pdf-toolbar-pin-hit). (fill → on-paper.pin, glyph → on-paper.page, page → on-paper.page)
- **pin-hidden**: A comment hidden from students (A-24): a --on-paper-page disc with a 2 px --on-paper-pin ring and the speech-bubble glyph in --on-paper-pin. (fill → on-paper.page, ring → on-paper.pin, glyph → on-paper.pin, page → on-paper.page)
- **chunk**: A-24 chunk boxes: 1 px --on-paper-chunk; the selected chunk 2 px --on-paper-pin over the --on-paper-wash; the drag box dashed --on-paper-chunk. (box → on-paper.chunk, selected → on-paper.pin, wash → on-paper.wash, page → on-paper.page)
- **thumbnails**: The thumbnail strip (A-24): paper miniatures on 1 px --paper-frame hairlines on the canvas, the current page outlined 2 px --border-interactive like the page in context, page numbers in --type-caption --text-secondary. (canvas → background, frame → paper-frame, outline → border-interactive, label → text-secondary, page → on-paper.page)
- **rail**: The student page's icon rail (48 px) and "Class Materials" drawer (248 px): a panel (--surface, 1 px --border) with icon buttons in the rail (the current one selected: tint + --selection-text glyph + the 2 px marker), the drawer's heading in --type-label --text-secondary, two exclusive filter chips (Lectures / Recitations) and sidebar-item rows for the files (the open file: selection tint + --selection-text check glyph; 36 px drawn, and on coarse pointers a 44 px hit area on a 44 px pitch through --pdf-toolbar-drawer-row-hit and --pdf-toolbar-drawer-row-gap, so the drawer is not one of the admin-only exceptions). (fill → surface, border → border, text → text, heading → text-secondary)
- **search-panel**: The search panel (open while the bar's Search toggle is pressed: aria-pressed="true" in the tertiary pressed look): a floating sheet with the field, Find and Next match, and the status line ("Searching…" in --in-progress-text; "No matches" in --text-secondary; "Search failed. Try again." in --status-error-text). (fill → surface, text → text, border → border, status → text-secondary)
- **banner**: The summary banner: an info alert floating at the top of the viewer ("Professor added 2 summaries" · Read · close). (fill → status.info.surface, text → status.info.text, icon → status.info.text, action → status.info.text)

States:

| State | Treatment | Tokens (part → role) |
|---|---|---|
| default | The bar on --surface with its bottom rule: file name, page and zoom labels, icon buttons and the page field; the canvas below holds the paper on its hairline frame. | fill → surface, rule → border-subtle, divider → border-subtle, title → text, label → text-secondary, icon → icon.default, canvas → background, frame → paper-frame, field-fill → surface, field-border → border-interactive, field-text → text |
| hover | A hovered button: tonal fill, glyph darkens (icon-button rules). | fill → surface, button-fill → surface-hover, icon → icon.hover, title → text, label → text-secondary |
| focus | Ring on the focused button or the page field; the toolbar is one tab stop (roving tabindex). | fill → surface, icon → icon.default, title → text, label → text-secondary, ring → focus-ring |
| active | Pressed button; the page field while a page number is typed. | fill → surface, button-fill → surface-active, icon → icon.hover, title → text, label → text-secondary |
| disabled | Only the control whose boundary is reached is disabled, each with its own reason as a toggletip and in the bar's helper line: Previous and First on page 1 ("You're on the first page"), Next and Last on the last page, Zoom out or Zoom in at the zoom clamp ("Smallest zoom"); every other button stays enabled, so today's silent clamp becomes a stated boundary. | fill → surface, icon → disabled.icon, title → text, label → text-secondary |
| loading | Loading: the page label shows the dots ("… / …") in --in-progress-text; the bar's buttons are inert (aria-disabled) and share one stated reason that names them ("Previous, Next, zoom and fullscreen are unavailable while the document loads", aria-describedby); the canvas holds a skeleton page of the paper's aspect ratio (no spinner); the library's per-page placeholder is styled the same. | fill → surface, label → in-progress.text, icon → disabled.icon, title → text, skeleton → skeleton.base, canvas → background |
| error | The canvas holds an error alert in place of the paper (cross icon + "Couldn't load this PDF. This can happen on a slow or unstable connection." + a Retry secondary button); the bar's buttons are inert with the stated reason "Previous, Next, zoom and fullscreen are unavailable until the PDF loads; use Retry" (aria-describedby); a failed search uses the panel's status line. | fill → surface, title → text, icon → disabled.icon, alert-fill → status.error.surface, alert-text → status.error.text, alert-icon → status.error.text, canvas → background |
| success | A completed action is confirmed in place: the search status reads "3 of 7 matches"; a page change shows the neutral "In context" chip; a saved comment or summary (A-24) shows a success toast (check + label). The bar itself does not change. | fill → surface, title → text, label → text-secondary, icon → icon.default, chip → in-progress.surface, chip-text → text-secondary |

Contrast (both modes, from `check-tokens.mjs`): 34 required pairs, lowest 4.90:1 light / 6.01:1 dark; 2 informational pairs (inactive controls, decorative hairlines).

### Keyboard and focus contract (per component, summarised; each component's description carries its line)

| Widget | Tab stops | Inside | Escape |
|---|---|---|---|
| Buttons, icon buttons, filter chips, the launcher, the CTA of an empty frame | one each (Tab) | Enter / Space press; a toggle exposes `aria-pressed`; a loading button ignores presses but stays in the order | — (the launcher's panel: Escape closes and focus returns to the launcher) |
| Switch, checkbox | one each | Space toggles (`role=switch` with `aria-checked`; the visible label is the name) | — |
| Radio group | one | arrows move the selection | — |
| Select | one | Enter / Space / Down open, arrows move, Enter chooses | closes |
| Tabs | one (roving tabindex) | Left/Right move and select (automatic activation, MUI's default), Home/End jump; Tab leaves to the panel; a disabled tab stays reachable by the arrows (`aria-disabled`) so its reason toggletip opens on focus, and Enter / Space do nothing on it | — |
| Feedback toolbar, PDF toolbar | one (roving tabindex) | Left/Right between buttons, Enter / Space press; the page field takes digits and Enter | the PDF search panel closes, focus returns to Search; Escape in the composer stops a streaming answer |
| Sidebar | one per entry (a navigation list, not a composite) | Enter follows; the collapse button toggles with Enter / Space and keeps focus | — |
| Table | the focusable cells in reading order (links, truncated spans, row checkboxes); sortable headers are buttons | Space toggles a row's checkbox | — |
| DataGrid | one (MUI X's grid model) | arrows move between cells, Space selects the row, Enter activates, Home/End, Page Up/Down; the footer's pagination buttons are ordinary tab stops | — |
| Display menu, column menu, any small popup | the trigger | Enter / Space / Down open with focus on the current item; Up/Down move, Home/End jump, type-ahead, Enter / Space choose | closes and returns focus to the trigger |
| Dialog | focus moves to the first focusable element (the title for confirmations); Tab and Shift+Tab cycle inside; the background is `inert` | | closes; focus returns to the trigger |
| Alert, toast, banner | their text actions (link-styled buttons: Enter / Space press) and dismiss button; a toast is rendered right after the control that raised it, so it is the next tab stop (one Tab reaches Undo or Dismiss, Shift+Tab returns) | an alert after a failed submit (`role=alert`) receives focus; an error toast (`role=alert`) receives focus, an info or success toast (`role=status`) is announced and never does; a toast's timer pauses on hover, on focus-within and on window blur, a toast with an action stays until dismissed (or at least 10 s) | dismisses the focused toast |
| Disabled control with a toggletip | the control itself (`aria-disabled="true"`, kept in the tab or roving order) | the reason opens on focus (and on hover or tap) and is read through `aria-describedby`; activation does nothing | closes the toggletip |
| Panel | a scrollable region is one tab stop (`tabindex=0`) and scrolls with the arrows | | — |

**Toast width.** `width: min(100% - 2 × var(--toast-edge-offset), var(--toast-max-width))`: at most 420 px (`--toast-max-width`), and on a narrow viewport the launcher's 24 px (`--toast-edge-offset` = `--space-float-offset-x`) kept from both edges, so a 390 px phone shows a 342 px toast; the sheet exhibits it in a 390 px frame and its audit measures 342 px.

**Toast timing and queue (WCAG 2.2.1).** An info or success toast without an action auto-dismisses after 6 s; its timer pauses while the pointer is over it, while anything inside it has focus and while the window has lost focus. A toast that carries an action (Undo after a removal) stays until dismissed, or at least 10 s under the same pause rules. Every toast carries Dismiss; an error toast adds Retry where a retry exists and persists until dismissed. One toast is visible at a time. A new info or success toast replaces a visible info or success toast that carries no action. A toast with an action and an error toast are never replaced silently: they stay until dismissed, and later toasts queue behind them (first in, first out, at most three queued; identical messages collapse into one with a count).

### Third-party and bespoke surfaces (plan edge case)

**The PDF viewer (react-pdf)** is a listed component above (`#### The PDF viewer`); its parts map as follows, on S-02 (`PDFViewerForStudent`), S-09 and A-24 (`PDFViewer`, `PdfSearch`, `AnnotateDocument`):

| Part (today) | Token |
|---|---|
| Toolbar bar (`#ffffff`, 44 px, bottom rule `#E5E1EB`) | `--surface`, `--size-toolbar-bar` 44, 1 px `--border-subtle`; tool chrome (`data-density="compact"`) on both areas |
| File name (13 px 600 `#2A2A30`) | `--type-label` 14/20 600 in `--text` |
| Page "n / N", zoom "100 %" (12 px `#55555E`) | `--type-caption` tabular in `--text-secondary`; while loading "… / …" in `--in-progress-text` |
| Icon buttons (previous, next, zoom out, zoom in, fullscreen; `#55555E`), text buttons (Search, Thumbnails, First, Last, Fit width, Open / print) | icon buttons at `--size-control-icon` with `--icon-default` glyphs (hover `--surface-hover` + `--icon-hover`; disabled `--disabled-icon` with the reason in a toggletip on the control itself (`aria-disabled`; hover, focus and tap; inline under `(hover: none)`): "You're on the first page"); the text buttons become icon buttons with tooltips where a glyph is conventional (first / last / fit width / fullscreen) and tertiary buttons otherwise (Search and Thumbnails are tertiary toggles with `aria-pressed`, pressed = the tertiary pressed variant: tint, `--selection-text` and the 2 px marker; Open / print) |
| Dividers (`#E5E1EB` 1 × 18) | 1 px `--border-subtle`, `--pdf-toolbar-divider-height` 18 px |
| The page field ("Page" + " / {n}") | a compact field: `--surface`, `--border-interactive`, `--text`, 56 px wide, `--type-caption` tabular |
| Scroll area (`#EDEBF1`, 20 px) | `--background` with `--space-panel` padding |
| Page wrapper (`#ffffff` + `0 1px 4px rgba(28,12,48,.14)`) | the paper (`--on-paper-page`) on a 1 px `--paper-frame` hairline; no shadow (docked surfaces cast none) |
| The page in the chat's context (2 px `primary.main` outline, TD-08) | a 2 px `--border-interactive` outline (neutral, ≥ 3:1 on the canvas) plus the neutral "In context" chip in the bar: no brand colour on the paper's edge, and never colour alone |
| Comment pins (24 px, `#1976d2`, the 💬 emoji; A-24 hidden pins white with a blue ring) | `--on-paper-pin` disc with the system's 16 px speech-bubble glyph (`--pdf-toolbar-pin-glyph`, SVG, `currentColor`) in `--on-paper-page`; hidden: `--on-paper-page` disc with a 2 px `--on-paper-pin` ring and the glyph in `--on-paper-pin`; fixed in both modes (G5); never an emoji (it ignores `color`, has no token and varies by platform) |
| Chunk boxes (`1px solid red`; selected `2px solid #1976d2` + `rgba(25,118,210,.1)`), the drag box (`rgb(203 213 225)` dashed) | 1 px `--on-paper-chunk`; selected 2 px `--on-paper-pin` over `--on-paper-wash`; dashed `--on-paper-chunk` |
| Search panel (`PdfSearch`: field, Find, Next match, status) | a floating sheet: `--surface`, 1 px `--border`, `--shadow-1`, 320 px; a compact field, Find (secondary), Next match (tertiary); the status line in `--text-secondary` ("No matches"), `--in-progress-text` ("Searching…") or `--status-error-text` ("Search failed. Try again.") |
| Thumbnail strip | paper miniatures on 1 px `--paper-frame` hairlines on the canvas; the current one outlined like the page; labels `--type-caption` (drawn: variant `thumbnails`) |
| Summary banner (floating Paper `#1976d2`, white "Read", close; `0 4px 20px rgba(25,118,210,.4)`) | an info alert (`--status-info-surface`, the i glyph and text in `--status-info-text`, Read as its action, an icon-button close) floating at the top of the viewer with `--shadow-1`; the re-show button (`#1976d2` disc with a red badge) is a neutral icon button with the neutral count badge |
| Icon rail (48 px, `#F3F1F7`), "Class Materials" drawer (248 px, `#FAF9FC`, `#EFE8F6` selected row, `#77777F` labels) | a panel (`--surface`, 1 px `--border`) with sidebar-item rows (hover `--surface-hover`, the selected file = selection tint + `--selection-text` check glyph) and two exclusive filter chips (Lecture / Recitation) (drawn: variant `rail`; the full S-09 / A-24 bar is drawn in 1280 px and 960 px frames) |
| Error panel (red text + filled Retry), "Loading your class lectures…" | the error alert with a Retry secondary button in the canvas; the empty-state frame for an empty class (SF-33); skeleton pages while loading (no spinner) |

**DataGrid (MUI X)** — mapped in `#### DataGrid` above: compact density on admin pages, header on the canvas in `--text-secondary` 600, row dividers `--border-subtle`, hover `--surface-hover`, selected `--selection-bg` + marker, cell focus 2 px `--focus-ring` inset, checkbox cells at `--size-col-min-check`, loading overlay = skeleton rows, no-rows overlay = the empty-state frame, errors as the table's error state (the alert with Retry in the body slot under the header; a failed refresh re-fetches on Retry and the grid keeps no stale rows); **footer and pagination** (`TablePagination` on A-05, A-09, A-10 and A-11; the grid footer on A-06, the one `DataGrid`): a row at `--size-row` with a 1 px `--border` top rule, the count ("1–10 of 42") in `--type-caption` tabular `--text-secondary`, "Rows per page" with a compact select field, first / previous / next / last as compact icon buttons with the unavailable ones disabled and their reason in a toggletip ("You're on the first page"); sort icons `--icon-default` (the sorted column `--icon-accent`); column separators `--border-subtle`; the column menu and filter panel are small popups (surface, 1 px `--border`, `--shadow-1`, menu-item rules); the footer's selected-row count is `--text-secondary`.

**Ace** — mapped in `§ Code surfaces` below and generated into the two theme files (the search box included, for when `ext-searchbox` is loaded), including the parts the IDE uses with Ace defaults today: `.ace_bracket` and `.ace_marker-layer .ace_bracket` (matched bracket: a 1 px `--border-interactive` outline, no fill), `.ace_selected-word` (`--editor-active-line`), `.ace_indent-guide` (a 1 px `--border-subtle` dotted guide), `.ace_fold-widget` (`--icon-default`, hover `--icon-hover`) and `.ace_fold` (`--editor-inline-bg`), `.ace_gutter-cell.ace_error` / `.ace_warning` (the status glyphs in `--syntax-error` / `--syntax-warning`, no fill), `.ace_search` (the search box: a `--surface` sheet with a 1 px `--border` and `--shadow-1`; `.ace_search_field` a compact field with the `--border-interactive` boundary; `.ace_searchbtn` and the option buttons in `--accent-text` on `--surface`, a checked option in the selection tint; the close button `--icon-default`), `.ace_print-margin` (`--border-subtle`); scrollbars stay native.

### Code surfaces (brief OQ3)

Code is not paper (G5): editors, code blocks and consoles follow the mode. One role set (`semantic.editor.*`, `semantic.syntax.*`, `semantic.console.*`) drives three outputs, generated from the token source by the emitter's fourth step (the mechanism and its inputs follow the table), in both modes:

| Output | Mapping |
|---|---|
| Ace: `ace/theme/kiwi-light` and `ace/theme/kiwi-dark` (`.ace-kiwi-light`, `.ace-kiwi-dark`), replacing `clouds` and `monokai` | `.ace_editor` background `--editor-bg`, colour `--text`, font `--type-code` 14/24; `.ace_gutter` `--editor-gutter` / `--editor-gutter-text`; `.ace_gutter-active-line` `--editor-gutter-text-active`; `.ace_marker-layer .ace_active-line` `--editor-active-line`; `.ace_marker-layer .ace_selection` `--editor-selection` with a 1 px `--editor-selection-outline` (`outline-offset: -1px`; the selection reads against the surface and the active line by its edge: checker § 17); `.ace_cursor` `--editor-cursor`; `.ace_print-margin` `--border-subtle`; `.ace_keyword`, `.ace_storage`, `.ace_support.ace_type`, `.ace_entity.ace_name.ace_type`, `.ace_support.ace_function` (builtins) → `--syntax-keyword` weight 600; `.ace_entity.ace_name.ace_function`, `.ace_variable` → `--text`; `.ace_string` → `--syntax-string`; `.ace_constant.ace_numeric`, `.ace_constant.ace_language` → `--syntax-number`; `.ace_comment` → `--syntax-comment` italic; `.ace_keyword.ace_operator`, `.ace_punctuation` → `--syntax-operator`; `.ace_invalid` → `--syntax-error` wavy underline, no fill; brackets, selected word, indent guides, folds, gutter diagnostics and the search box as listed in `§ Third-party and bespoke surfaces`. The editable editor's host is a control identified by its boundary: 1 px `--editor-border-editable` (`--border-interactive`, ≥ 3:1 on the canvas), `--radius-sheet`; read-only viewers (`ReadOnlyCodeViewer`) and the console keep the 1 px `--editor-border` hairline. |
| Prism (`react-syntax-highlighter`): one style object `kiwiPrism(mode)` replacing `tomorrow` and `prism` | `'code[class*="language-"]'` and `'pre[class*="language-"]'`: colour `--text`, background transparent in messages (the block carries a 2 px `--editor-block-rule` left rule, no box), `--editor-bg` with a 1 px `--editor-border` in `ReadOnlyCodeViewer`; `comment`, `prolog`, `doctype`, `cdata` → `--syntax-comment` italic; `punctuation`, `operator` → `--syntax-operator`; `keyword`, `builtin`, `class-name`, `tag` → `--syntax-keyword` 600; `function` → `--text`; `string`, `char`, `attr-value`, `inserted` → `--syntax-string`; `number`, `boolean`, `constant`, `symbol` → `--syntax-number`; `deleted`, `important` → `--syntax-error`; `regex` → `--syntax-string`. Line numbers `--editor-gutter-text`. Code numerals are the only blue text outside status surfaces and links; table figures are `--text`. |
| Console (IDE output, webhook logs) | container `--console-bg` with 1 px `--console-border`; header `--console-header-bg` with `--type-caption` 600 in `--text-secondary` (no decorative dot); stdout `--console-stdout`; stderr `--console-stderr`; stdin `--console-stdin`; prompt `--console-prompt`; an error line sits on `--status-error-surface`. |

**How they are generated.** The inputs are the role set above and the selector → role maps stored in the source as `$extensions["org.kiwi"].codeThemes`: for Ace, the selectors of the table (`.ace_keyword`, `.ace_string`, `.ace_marker-layer .ace_active-line`, the brackets, folds, indent guides, gutter diagnostics and the search box) each mapped to a role plus the weight (`semantic.type-weight.emphasis`), style (italic) or decoration (wavy underline) it carries; for Prism, the token classes (`comment`, `keyword`, `string`, `number`, …) mapped the same way with the two code selectors as the base; for the console, its classes mapped to `semantic.console.*`. `build-tokens.mjs` step 4 resolves them: `generated/code-themes/ace-kiwi-light.css` and `ace-kiwi-dark.css` carry literal values per mode (an Ace theme is injected as `cssText` and registered as `ace/theme/kiwi-light` / `kiwi-dark` with `{ cssClass, isDark, cssText }`); `prism-kiwi.json` holds one style object per mode for `kiwiPrism(mode)`; `console.css` holds `var()` rules because the console lives inside the themed DOM and follows `data-theme`. The implementation runs the same step in `kiwi-ui/scripts/` into `src/theme/code/`, deletes the hand-maintained `clouds`, `monokai`, `tomorrow` and `prism` imports, and a drift test regenerates the four files and diffs them like the other outputs. The sheet's code section renders the same roles through the custom properties.

Every syntax colour is a text pair on the editor surface and passes AA in both modes from the lock's measured pairs: `--text` 12.89 / 12.96, `--text-secondary` 5.70 / 7.92, `--accent-text` 5.53 / 8.15, `--info-11` 5.65 / 8.04, `--error-11` 5.99 / 7.60, `--warning-11` 5.71 / 7.91 (on `--surface`). Inline code in prose sits on `--editor-inline-bg` (one tonal step; text 11.93 / 11.70). Retired: `clouds`, `monokai`, `tomorrow`, `prism`, the literal `#1e1e1e` / `#f5f5f5` backgrounds, and the public CSS's VS Code dark palette (re-pointed, `§ Generation spec`).

### Icon policy (brief OQ4)

Two sets, decided per use. **KiwiIcons** (the 24 feature icons of `NYUSH-ML/kiwi-ui@fbb4db8`, `currentColor`) name *features*; **Material icons, Outlined style only**, name *actions and system affordances* (Jakob's law: users know them; recognition over recall). The set is not in this repository: the per-glyph table (which of the 24 serves which slot) is written when the set is ported, against this policy; the sheet's glyphs are stand-ins.

| Slot | Set | Rule |
|---|---|---|
| Admin sidebar entries (11 system, 9 class) and their collapsed rail | KiwiIcons | one glyph per feature, 20 px in the compact rail; the collapse chevron is Material |
| Class tabs (Materials, Scratchpad; a Kiwi App's default tab glyph) | KiwiIcons | |
| KPI tile icons | KiwiIcons | always `--icon-default` (TD-27) |
| Empty-state and not-found marks | the mascot (Phase 4), never an icon tile | |
| The Display menu's trigger and group glyphs | Material `TuneOutlined` (trigger); no glyphs on the groups | |
| Close, chevrons, first / last, back, menu, search, logout, upload, download, copy, edit, delete (trash), external link, visibility, refresh, flag, thumbs, share, zoom, fit width, fullscreen, the chat-mode glyphs, Send | Material Outlined | a KiwiIcon never replaces a conventional action glyph |
| Status icons (check, triangle, cross, i, the dashed ring, the page glyph of the in-context chip) | the system's own 16 px shape icons from `§ Functional colour usage` | drawn once as symbols; colour = the status `-11` |
| Comment pins on the paper (S-02, A-24) | the system's own 16 px speech-bubble glyph (SVG, `currentColor`; `--pdf-toolbar-pin-glyph`) | `--on-paper-page` on the visible pin's disc, `--on-paper-pin` on the hidden pin's disc, fixed across modes (G5); never an emoji: an emoji ignores `color`, has no token and renders differently on every platform |
| The launcher's glyph | the system's own chat-bubble shape icon (SVG, `currentColor`, `--size-icon-fixed` 24 px in `--accent-on-solid`) until Phase 4 registers the companion's launcher pose in `companion.slot.launcher` | the launcher is the companion's door, so its glyph is the companion's, never a Material chat bubble; the sheet's glyph is the stand-in |
| The S-02 icon rail (Materials, Chat, Progress) | KiwiIcons | one glyph per class tool, `--size-icon` on the rail's 36 px compact icon buttons; the current tool is the selected icon-button variant (tint + `--selection-text` glyph + the 2 px marker) |
| Sparkles, stars, "magic" glyphs | none | banned (`§ Never`); the Experiment Assistant's `AutoAwesome` goes |

Reconciliation: the 24 px grid for both sets (`--size-icon` 24 / 20, `--size-icon-sm` 16 inside chips, buttons and the feedback toolbar, `--size-icon-fixed` 24 for the launcher); KiwiIcons normalised to a 1.75–2 px stroke so they sit beside Material Outlined's ~2 px; icons are `currentColor` and take `--icon-default` at rest in chrome, `--icon-hover` on hover and current, `--icon-accent` only where the slot carries the accent (the current nav item, the selected chat mode); icon-only controls carry `aria-label` and a tooltip; decorative icons are `aria-hidden`.

### Generation spec (DW-3.4)

**One source, three outputs.** `kiwi-ui.tokens.json` → (1) the internal CSS custom properties, (2) the MUI theme, (3) `public/kiwi-design-tokens.css`. The reference emitter is `build-tokens.mjs`; a single web app consuming one token file does not earn Style Dictionary (governance doctrine, Mall's threshold), so the implementation ports this 397-line emitter into `kiwi-ui/scripts/` and keeps the source DTCG-compliant so Style Dictionary or Terrazzo can replace it later without renaming a token. The emitter and the checker resolve every path from their own location (`import.meta.url`) and the repository root; nothing in them is machine-specific, so they run in CI as they are.

**Resolution.** For a context (colour, density, pointer): a token's raw value is `$extensions.mode[pointer] ?? $extensions.mode[colour] ?? $extensions.mode[density] ?? $value`; `{references}` resolve recursively in the same context; a dangling reference or a cycle fails the build; a token that varied with both pointer and colour would fail the build (the coarse block cannot nest colour). Every colour, dimension, duration and weight in the three outputs is resolved from the source; the MUI preview's `components` block is illustrative prose (each entry names the custom properties the real `styleOverrides` read, marked `_illustrative` in the file) whose numbers are interpolated from the tokens at build time, so it cannot state a width the tokens do not hold.

**(1) Internal CSS, `kiwi-ui.tokens.css`.** `:root` holds every emitted token at light + comfortable + fine (references as `var(--name)` when the target is emitted, so the output reads like the locked block; composites as literals: shadows and the backdrop as `rgba()`, easings as `cubic-bezier()`, font stacks quoted). Then `[data-theme="light"]` and `[data-theme="dark"]` redeclare **every property that depends, directly or transitively, on a mode-varying token** (815 of 1287), with `color-scheme`; `[data-density="comfortable"]` and `[data-density="compact"]` redeclare every property that depends on a density-varying token (96); `@media (pointer: coarse)` redeclares every property that depends on a pointer-varying token (34) on `:root` and inside both density blocks. The rule exists because a custom property's `var()` references resolve where it is declared, not where it is used (the Phase 2 lesson): a root-only `--border-subtle: var(--neutral-6)` would stay light inside a dark subtree. The checker parses the emitted CSS, computes the dependency closure of each block and fails on any root-only dependent, on any root-only composite that embeds a mode colour, and on a coarse block that does not consume `--size-target-min`. The file ends with the locked `prefers-reduced-motion` block.

**(2) The MUI theme** (`createKiwiTheme()`, preview in `generated/mui-theme.json`). One theme, not four: `createTheme({ cssVariables: { colorSchemeSelector: 'data-theme' }, colorSchemes: { light, dark } })` so MUI's scheme switches on the same attribute as the token CSS, and `styleOverrides` read the density- and pointer-aware custom properties (`var(--size-control)`, `var(--space-inset-x)`, `var(--icon-button-hit)`, …) so `data-density` and the media query re-resolve them without a second theme instance. The preview's `components` block is prose, not code (`_illustrative`): the real overrides are written at port time from the tables below, and its numbers come from the tokens.

| MUI slot | Tokens |
|---|---|
| `palette.primary` | `main` `--accent-solid`, `dark` `--accent-solid-hover` (contained hover), `light` `--accent-text`, `contrastText` `--accent-on-solid`; text and outlined buttons and links are overridden to `--accent-text` |
| `palette.secondary` | neutral: `main` `--border-interactive`, `dark` `--text`, `light` `--text-secondary`, `contrastText` `neutral-1` (the Material grey secondary of `Theme.ts` and the pink `--kiwi-secondary` of the public CSS are both retired) |
| `palette.chart` (interim) | `series1` `accent-11`, `series2` `info-11`, `series3` `warning-11`, `series4` `neutral-11`, `series5` `accent-12`, marked `_interim` in the preview; each clears 3:1 on `--surface` in both modes (checker § 16), so the stand-ins meet the brief's chart-mark gate even before Phase 6. `Theme.ts` declares `Palette.chart.series1-5`, and `StandaloneUserActivity`, `StandaloneDailySessions`, `StandaloneUserEngine`, `StandaloneTopActions`, `StandaloneUserDuration` and `Theme.test.ts` read it, so the theme swap keeps the keys with these no-purple stand-ins from the locked ramps (no red in analytical views) and updates the test's expected values; Phase 6 registers `chart.*` (five categorical series per mode at ≥ 3:1 on the plot background) and replaces them |
| `palette.{error, success, warning, info}` | `main`/`dark` the status `-11`, `light` the `-3` surface, `contrastText` `neutral-1`; `MuiAlert` standard variants are overridden to `-3` + `-11` + the shape icon so MUI never derives a tint |
| `palette.text` | `primary` `--text`, `secondary` `--text-secondary`, `disabled` `--disabled-text` |
| `palette.background` | `default` `--background`, `paper` `--surface` |
| `palette.divider` | `--border-subtle`; `MuiPaper` outlined and `MuiCard` use `--border` |
| `palette.action` | `hover` `--surface-hover`, `selected` `--selection-bg`, `focus` transparent (focus is the outline ring), `active` `--icon-default`, `disabled` `--disabled-text`, `disabledBackground` `--disabled-surface` |
| `palette.common` | `black` `--logo-on-light`, `white` `--logo-on-dark`: read only by `InstitutionLogo` (G2), which picks the one its surface needs; the raw-colour guard allows `palette.common.*` and `"common.white"`/`"common.black"` in that file alone |
| `palette.grey` | overridden with the locked neutral ramp per mode (`50` neutral-1, `100` 2, `200` 3, `300` 5, `400` 7, `500` 8, `600` 10, `700` 11, `800` 12, `900` 12; `A100` 3, `A200` 5, `A400` 8, `A700` 11), so a stray `'grey.NN'` or `theme.palette.grey[...]` still flips with `data-theme` instead of keeping MUI's `#fafafa`-to-`#212121` greys; a safety net, never a role to write: the guard flags every such access, and the migration is by role, page canvas → `background.default`, sunken band or table head → `action.hover`, hairline → `divider`, wordmark fallback → the mascot (`§ Hand-off: MUI grey and common`); the generated `mui-theme.json` says so and checker § 19 holds the mapping |
| `shape.borderRadius` | 2 |
| `typography` | `fontFamily` `--font-ui`; `h1` display-lg 30/36 (course-list header, large empty states), `h2` page-title 24/32 (page headings; `AdminPageHeader` renders `component="h1" variant="h2"`), `h3` section-title 20/28, `h4` deck 18/28, `h5`/`subtitle1` group-title 16/24 600, `h6`/`subtitle2` label 14/20 600, `body1` body 16/24, `body2` 14/20, `button` 14/20 600 `textTransform: none`, `caption` 12/16, `overline` 12/16 600 with no uppercase; custom `display` 36/44 600 (sign-in only) |
| `MuiCssBaseline` | imports the token CSS; `font-synthesis: none`; `:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px }`; `[aria-disabled="true"], [aria-disabled="true"] * { cursor: not-allowed }`; after the locked reduced-motion block, `@media (prefers-reduced-motion: reduce) { [data-dots]::after { animation: none; content: "…" } }`, so the text dots rest as a static ellipsis, never a frozen frame |
| `MuiButton` | `disableElevation`; `minHeight var(--size-control)`, padding `0 var(--space-inset-x)`, `--radius-control`, `--type-button`, `white-space: nowrap`, `:active { transform: scale(0.98) }`; contained = primary (hover `--accent-solid-hover`); outlined = secondary (`--border-interactive`, `--surface`, hover `--accent-bg-subtle`); text = tertiary (disabled: weight `--type-weight-regular`); `color="error"` outlined = destructive (`--destructive-text`, hover `--destructive-bg-subtle`); contained error is not used; disabled = the disabled trio, rendered with `aria-disabled="true"` instead of the `disabled` prop (the click handler returns early; styled through `&[aria-disabled="true"]`) so it stays focusable and is the Tooltip's child itself; a tertiary toggle (`aria-pressed`) draws `&[aria-pressed="true"]` as `--selection-bg` + `--selection-text` + `box-shadow: inset 0 calc(-1 * var(--button-marker)) 0 var(--selection-marker)` |
| `MuiIconButton` | `var(--size-control-icon)` drawn, `var(--icon-button-hit)` hit area through a `::before` sized to the hit token and centred (`translate(-50%, -50%)`); `--icon-default`, hover `--surface-hover` + `--icon-hover`, `:active { transform: scale(var(--icon-button-press-scale)) }`, disabled `--disabled-icon` with `aria-disabled`, `[aria-pressed=true]` = selection tint + `--selection-text` + `box-shadow: inset 0 calc(-1 * var(--icon-button-marker)) 0 var(--selection-marker)` |
| `MuiOutlinedInput`, `MuiInputLabel`, `MuiFormHelperText` | `notched: false`, static label (as today); `minHeight var(--size-control)`, `--radius-control`, `--surface`; notched outline `--border-interactive`, hover `--text`, focus unchanged + the outline ring, error `--status-error-text`; `.MuiSelect-select` `padding-right: 40px` (TD-13); helper `--type-caption`, error helper `--status-error-text` with the cross icon; a disabled field's helper carries the reason |
| `MuiCheckbox`, `MuiRadio` | the checkbox component (`§ Checkboxes and radios`): box `var(--checkbox-size)` with a `var(--checkbox-border-width)` `--border-interactive` boundary on `--surface`, checked and indeterminate = `--selection-bg` + `--selection-text` glyph (`checkedIcon` / `indeterminateIcon` are the system's check and dash), hover boundary `--text`, pressed `--surface-active`, disabled = the disabled trio with `aria-disabled` and the reason, error boundary `--status-error-text` with `aria-invalid`; hit area `var(--checkbox-hit)` through the centred `::before` |
| `MuiSwitch` | the selection-control rules (`§ Switches`), hit area `var(--switch-hit)`; track and thumb corners `var(--switch-radius)` / `var(--switch-thumb-radius)` (`--radius-control` 2 px: a rectangle, no pill, no oval) |
| `MuiChip` | height `--size-chip`, `--radius-control`; status, filter (hit area `var(--chip-hit)`, `:active { transform: scale(var(--chip-press-scale)) }`, `[aria-pressed=true]` weight `--chip-filter-variant-selected-weight` 600) and role variants as specified; never `color="primary"` filled |
| `MuiTabs`, `MuiTab` | indicator `--size-marker` in `--selection-marker`; tab `minHeight var(--size-tab)`, label 600 for every tab (disabled: `--disabled-text` at weight `--type-weight-regular` with the 16 px lock glyph (`--tabs-disabled-glyph`, `--disabled-icon`) before the label and `cursor: not-allowed`, `aria-disabled` and kept in the roving order so its reason toggletip opens on focus; a failed panel's tab shows the 16 px cross in `--status-error-text` with visually hidden text), `--text-secondary` → selected `--selection-text`, hover `--surface-hover`, `textTransform: none`, `nowrap` |
| `MuiListItemButton` (sidebar) | `minHeight var(--size-nav-item)`, hover `--surface-hover`, selected = selection tint + 2 px inset marker; a notice row wraps (`white-space: normal`) inside the rail |
| `MuiPaper`, `MuiCard` | `elevation: 0`, `backgroundImage: none`; outlined = 1 px `--border`, `--radius-sheet`; a card is a panel and is never nested |
| `MuiDialog` | paper 1 px `--border`, `--radius-sheet`, `var(--dialog-shadow)`, `width: min(100% - 2 * var(--space-popup-margin), var(--dialog-width-sm|md|lg))` (the tokens are the maxima), `max-height: 80vh` with a scrolling body, `margin: var(--space-popup-margin)`; backdrop `--backdrop`, no blur |
| `MuiMenu`, `MuiMenuItem`, `MuiTooltip`, `MuiSnackbarContent` | surface + 1 px `--border` + `var(--display-menu-shadow)` / `var(--toast-shadow)`; menu items `var(--display-menu-item-height)` (44 on coarse pointers), `--type-popup-title`; tooltip `--type-caption` on `--surface` with the toggletip geometry (`--toggletip-max-width`, `--toggletip-padding-y` / `-x`, `--toggletip-radius`, `--toggletip-shadow`, `--toggletip-offset` from its control); snackbar content `width: min(100% - 2 * var(--toast-edge-offset), var(--toast-max-width))`; a disabled control's reason tooltip is a toggletip on the control itself (`aria-disabled`, `aria-describedby`; MUI's Tooltip takes it as its child because it is not natively disabled) that opens on hover, focus and tap (`enterTouchDelay: 0`, `leaveTouchDelay: 3000`), Escape closes it without moving focus, the pointer can move onto it and it stays until dismissed (WCAG 1.4.13: dismissible, hoverable, persistent), and under `(hover: none)` the same text renders inline as helper text |
| `MuiAlert`, `MuiSnackbarContent` actions | the text-action pattern on the status `-11` (`MuiAlert`) or `--link` (`MuiSnackbarContent`): weight 600, `text-decoration: underline var(--alert-action-underline)` / `var(--toast-action-underline)`, `&:hover` and `&:active` the `-hover` width (2 px), `&:active` also `transform: scale(var(--motion-press-scale))`, `&:focus-visible` the ring, a centred `::before` of `var(--alert-action-hit)` / `var(--toast-action-hit)` (44 px on coarse pointers); the banner (`pdf-toolbar`) reads `var(--pdf-toolbar-banner-action-underline*)` and `var(--pdf-toolbar-banner-action-hit)`. `MuiSnackbar` timing: `autoHideDuration` 6000 for an info or success toast without an action, `null` (persistent) for error toasts and toasts with an action (or at least 10 000); the timer pauses on hover (`onMouseEnter`), on focus-within and on window blur (the default `disableWindowBlurListener: false`); the Snackbar is rendered right after the control that raised it so it is the next tab stop; every toast renders Dismiss, errors add Retry, removals add Undo |
| `MuiTableCell`, `MuiTableRow`, `MuiTablePagination`, `MuiDataGrid` | the table rules with the `--size-col-min-*` minimums; pagination = the footer rules; DataGrid density compact on admin pages, header on the canvas in `--text-secondary` 600, cell focus 2 px `--focus-ring` inset, skeleton loading overlay, empty-state no-rows overlay, footer and column menu as mapped |
| `MuiSkeleton`, `MuiLinearProgress`, `MuiCircularProgress` | `--skeleton-base/-highlight`, 1.6 s; bar `--in-progress-bar` on `--in-progress-track`; the circular progress is avoided (progress is words + dots) |
| `MuiFab` (the launcher) | `--size-launcher`, `--accent-solid`, `--accent-on-solid`, `var(--launcher-shadow)`, glyph `--size-icon-fixed`, hover `--accent-solid-hover` with the shadow unchanged, `:active { transform: scale(var(--launcher-press-scale)) }`; offsets from the safe area (`§ Density › Safe areas`); the count badge `--launcher-badge-size` 20 px, `--launcher-badge-radius` 50 %, `--surface` / `--text` / 1 px `--border` |
| `MuiLink` | `--link`, `underline: always`, `text-underline-offset: 2px` |

**(3) The public contract, `public/kiwi-design-tokens.css`.** Light-only in Stage 1 (G5).

- **Every one of the 143 v1 custom properties, 89 class selectors and 3 keyframes is kept**, pinned in the source as `$extensions["org.kiwi"].publicV1Names`, `publicV1Classes` and `publicV1Keyframes`, so the check cannot become self-referential once the generated file replaces the hand-written one.
- The names are re-pointed to the semantic tier, as literal hex (the file loads alone in an external app); 18 names are added for roles apps need to pass the boundary and status rules (`--kiwi-primary-hover`, `--kiwi-border-interactive`, `--kiwi-link`, `--kiwi-{success,warning,error,info}-surface` and `-text`).
- The utility classes and component patterns are regenerated to the rules above (no `outline: none`, no shadow cards, no filled chips, no coloured alert borders, no purple); the classes the new system has no use for are kept as deprecated aliases restyled from the tokens; two patterns are added: `.kiwi-in-progress` (neutral in-progress text with the text dots, `@keyframes kiwi-dots`) and `.kiwi-chip-status-{success,warning,error,info}` (the one tinted chip).
- A scoped `@media (prefers-reduced-motion: reduce)` block, generated from the file's own rules, stills exactly the 4 selectors that animate or transition (`.kiwi-spinner`, `.kiwi-in-progress::after`, the indeterminate bar's fill; the determinate fill's width transition), never a universal `!important` reset that would leak into the host app; `@keyframes kiwi-pulse` is kept for the schedule and run by no generated selector.
- The app's disabled mechanism: `.kiwi-btn[aria-disabled="true"]` and `.kiwi-input[aria-disabled="true"]` take the disabled trio (`--kiwi-disabled-surface`, `-text`, `-border`, added) and `cursor: not-allowed`; `:disabled` is kept as an alias. `:active` presses the primary to `--kiwi-primary-active` and the secondary to `--kiwi-bg-pressed` (added) with `scale(0.98)`. `.kiwi-help` (added) is the reason or helper line under a control (`--kiwi-text-secondary`; `data-state="error"` / `"success"` in the status text), linked by `aria-describedby`; `.kiwi-input[aria-busy="true"]` keeps its boundary with `cursor: progress`, and `[data-state="success"]` keeps it too, the helper carrying the check. The dimensions come from the tokens: `--kiwi-size-control` 44 px, `--kiwi-size-chip` 32 px (the hand-written 28 px chip grows to the comfortable chip height, a value change for `CHANGELOG.md`) and the label gap `--kiwi-space-2` 8 px (snapped from 6).
- A step's state is an attribute (`.kiwi-step-indicator[aria-current="step"]`, `[data-done]`, `[aria-invalid="true"]`; `.kiwi-step-connector[data-done]`) and the determinate `.kiwi-progress-bar` stays, neutral.
- Status of the 143 names: 52 kept (same role), 50 re-pointed (name kept, new role or value), 41 deprecated; of the classes and keyframes, 18 are deprecated.
- The header comment states exactly that (names, classes and keyframes kept; the deprecated ones marked), rewrites the typography guidance (Source Sans 3, self-hosted; Montserrat is the wordmark only), and the value change is recorded in `CHANGELOG.md` (brief done-when 10).

**The deprecation list.** Every deprecated name, class or keyframe is marked `/* @deprecated since 2.0.0, removed in 4.0.0: use … */` in the file, keeps a safe value (a class keeps a token-driven look) until removal, and follows the governance rule: removal no earlier than two MAJOR versions after the deprecating release (4.0.0 after 2.0.0) and no earlier than six months after it, whichever is later. The checker asserts the removal major on every entry, that every v1 class and keyframe is present, and that every deprecated class or keyframe carries the marker on its rule.

| Deprecated | Replacement | Why |
|---|---|---|
| `--kiwi-secondary`, `-light`, `-dark`, `-contrast` | `--kiwi-text-secondary`, `--kiwi-text-primary`, `--kiwi-primary-contrast` | one accent hue; the pink secondary is retired |
| `--kiwi-primary-light`, `--kiwi-primary-dark` | `--kiwi-primary-hover`, `--kiwi-primary` | hover is the only second step of the filled control |
| `--kiwi-{success,warning,error,info}-light` | `--kiwi-{status}-surface` | the `-3` status surface |
| `--kiwi-{success,warning,error,info}-dark` | `--kiwi-{status}-text` | the `-11` text and icon colour |
| `--kiwi-gray-50` … `--kiwi-gray-900` (10) | the role tokens (`--kiwi-bg-*`, `--kiwi-text-*`, `--kiwi-border-*`) | MD greys, mapped meanwhile to the nearest cream/tan neutral |
| `--kiwi-text-disabled`, `--kiwi-text-hint` | `--kiwi-text-secondary` | disabled and hint text are secondary text |
| `--kiwi-bg-selected-hover` | `--kiwi-bg-selected` | a selected row does not change on hover |
| `--kiwi-font-weight-light`, `-medium`, `-bold` | `--kiwi-font-weight-regular`, `-semibold`, `-semibold` | 400 and 600 only; no faux bold |
| `--kiwi-letter-spacing-wide` | `--kiwi-letter-spacing-normal` | no tracked-out labels, no CSS capitals |
| `--kiwi-space-5`, `--kiwi-space-10`, `--kiwi-space-20` | the neighbouring steps | 20, 40 and 80 px are off the 4/8/12/16/24/32/48/64 scale |
| `--kiwi-radius-md`, `-lg`, `-xl`, `-2xl` | `--kiwi-radius-sm` | one control and sheet radius (2 px) |
| `--kiwi-shadow-md`, `--kiwi-shadow-xl` | `--kiwi-shadow-lg` | two depths only |
| `--kiwi-transition-slow` | `--kiwi-transition-default` | no orchestration in the motion budget |
| `.kiwi-step-pending`, `-active`, `-completed`, `-error` | `.kiwi-step-indicator` by attribute: its resting look, `[aria-current="step"]`, `[data-done]`, `[aria-invalid="true"]` | state by attribute, not by class; the current step is the selection tint with no glow, a completed step the success surface with the check, a failed step the error surface with the cross |
| `.kiwi-step-connector-active`, `-completed` | `.kiwi-step-connector[data-done]` | one neutral emphasis, never a brand fill |
| `.kiwi-progress-dots`, `.kiwi-progress-dot`, `-active` | `.kiwi-in-progress` | progress is neutral text with the text dots (G9); no pulsing dot |
| `.kiwi-progress-dot-completed`, `-error` | `.kiwi-chip-status-success`, `.kiwi-chip-status-error` | a finished or failed stage is a status chip |
| `.kiwi-progress-bar-indeterminate`, `@keyframes kiwi-progress-indeterminate`, `@keyframes kiwi-pulse` | `.kiwi-in-progress` (the determinate `.kiwi-progress-bar` and `-fill` stay, restyled neutral) | sweeps and pulses are outside the motion budget |
| `.kiwi-spinner`, `@keyframes kiwi-spin`, `.kiwi-text-disabled`, `.kiwi-bg-secondary` | `.kiwi-in-progress`, `.kiwi-text-secondary`, `.kiwi-bg-subtle` | no spinner; disabled labels are secondary text; one accent hue |

Kept and restyled classes: `.kiwi-step-connector` (a neutral hairline; `[data-done]` marks the span up to the current step), `.kiwi-progress-bar` and `.kiwi-progress-bar-fill` (the neutral determinate bar: `--kiwi-border-interactive` on `--kiwi-bg-hover`). Re-pointed with their names kept (not deprecated): `--kiwi-primary` (forest), `--kiwi-{status}` (`-11`), `--kiwi-bg-subtle` and `--kiwi-bg-hover` (`--surface-hover`, now opaque), `--kiwi-bg-selected` (the selection tint), `--kiwi-border-focus` (`--focus-ring`), `--kiwi-font-family` (Source Sans 3 + the CJK stack), `--kiwi-font-family-mono`, `--kiwi-letter-spacing-tight` (−0.01em), `--kiwi-radius-default` (2 px), `--kiwi-shadow-sm`/`-default` (`--shadow-1`) and `-lg` (`--shadow-2`), `--kiwi-focus-ring` (a 2 px gap + 2 px ring; prefer the outline), `--kiwi-transition-fast`/`-default` (150 ms toggle / 220 ms enter curves), the editor, syntax and console tokens (the light theme of `§ Code surfaces`). The full per-name map is `$extensions["org.kiwi"].public` in the source and the generated preview.

**Tests the implementation ports from `check-tokens.mjs`** (brief done-when 1 and 3):

- the alias equality against the locked block;
- the per-state contrast assertions carried in the source (`$extensions["org.kiwi.contrast"]`);
- the tier rule (component → semantic only) and the component-literal allowlist (a component value is a reference unless marked `$extensions["org.kiwi"].literal` with a reason; the checker lists the marked ones and fails on any other);
- the deprecation schedule for names, classes and keyframes, the presence of every v1 class and keyframe and the `@deprecated` marker on the deprecated ones;
- the per-mode, per-density and coarse-pointer closure of the emitted CSS, including the root-only-composite rule from `§ Signature move`;
- the selection and pressed cues (§ 14: every toggle-like variant carries a non-colour cue; a marker or glyph cue clears 3:1 against the selected fill and the unselected surfaces);
- the frozen on-paper literals against their light sources (§ 15);
- the editor selection (§ 17: a visible tint that differs from the active line, the 1 px outline at 3:1 against the surface and the active line, every syntax colour at 4.5:1 on the selection, the Ace rule carrying both);
- the public reduced-motion guard (§ 18: every animated or transitioned selector of the public CSS stilled inside one scoped block);
- the MUI grey override (§ 19: `palette.grey` equals the neutral ramp per mode and `palette.common` the G2 pair, both schemes);
- the pinned v1 name coverage and the banned-hex scan; the raw-colour lint below.

The MUI theme, the public CSS and the four code-theme files are generated in the build, and a test fails if any checked-in output drifts from the source. From the sheet's audit, the implementation's Storybook tests port the render checks:

- every control nested inside another component equals its canonical story (computed fill, text and border);
- every `aria-disabled` or busy control has a specific stated reason;
- every selected or pressed toggle carries a non-colour cue;
- every part a state assigns renders the colour of its token (the checkbox's label, helper and icon; the KPI tile's, toast's, empty frame's and alert's parts);
- every switch, checkbox and radio has an accessible name (`aria-label`, or `aria-labelledby` to its visible label);
- every cue survives `(forced-colors: active)` emulation (no `box-shadow` left to carry a state; outlines, glyphs, dots, weight or the thumb in its place);
- under `(pointer: coarse)` emulation, every control of the student routes hit-tests to 44 × 44 px, the stated exceptions apart.

### Raw-colour guard and allowlist (DW-3.6)

**Forms allowed only inside the token source and its generated outputs** (the lint fails on any hit outside the allowlist):

- hex colours; `rgb()`, `rgba()`, `hsl()`, `hsla()`, `hwb()`, `oklch()`, `oklab()`, `lab()`, `lch()`, `color()`, `color-mix()`, `light-dark()`;
- CSS named colours other than `transparent`, `currentColor` and `inherit`;
- imports of palette objects (`@mui/material/colors`, `src/theme/material-design-2014.json`);
- the MUI palette paths that bypass the roles: the strings `"grey.NN"` and `"common.white"` / `"common.black"` (in `sx`, `color`, `bgcolor`, `borderColor`), and the accesses `theme.palette.grey[...]`, `palette.grey.NN` and `palette.common.*`; `common` is allowed in `src/components/Brand/InstitutionLogo.tsx` only (G2), `grey` nowhere, because `palette.grey` is a safety net (`§ (2) The MUI theme`), not a role.

**Where it scans:** `src/**/*.{ts,tsx,js,jsx,css}` outside `src/services/`, plus `index.html`, `public/*.webmanifest`, `public/**/*.svg` (the mascot artwork allowlisted) and `.storybook/**`, the way `src/typography.test.ts` scans for fonts.

**Inside the source** the literal policy is tiered: hex only in `global.*`; `logo.on-light`/`on-dark` (G2) and the mode-frozen `on-paper.*` marks (G5) are the only colour literals outside it, because the backdrop and the shadows reference `--shadow-ink` and carry their alphas in `$extensions["org.kiwi"].alpha` for the emitter to compose; in the component tier every value is a reference to the semantic tier (the transparent fill is the role `semantic.color.fill-none`; the control paddings are the semantic deltas `control-pad-y` and `field-pad-y`) except 6 geometry literals that are truly component-specific and marked `$extensions["org.kiwi"].literal` with their reason (`button.min-width` 64, `field.select-padding-right` 40, `dialog.max-height` 80vh, `table.toolbar-collapse` 1120, `launcher.offset-y` 96, `pdf-toolbar.field-width` 56), which the checker lists and beyond which it fails; the checker enforces all of this and scans every output for the banned purple-era hexes (`#6a1b9a`, `#7b1fa2`, `#4a148c`, `#9c27b0`, `#5c3b6e`, `#4a3053`, `#4a2d5a`, the triplet `#6366f1 #8b5cf6 #a855f7`, the pinks `#c2185b #e91e63 #880e4f`).

**Allowlist, each with its reason:**

| Surface | Reason |
|---|---|
| The token source (`src/theme/tokens/*.json`), the generated MUI theme, `public/kiwi-design-tokens.css` | the only place colour literals may be written; every other file reads a token |
| Mascot artwork: `public/favicon.svg`, `public/assets/images/kiwi-mark.svg`, the app icons, the ported `KiwiMascot` atlases and stills | its own flat palette `#234631 #92ae70 #f5f4e8 #ccbd99`, unchanged (G11) |
| `src/components/Brand/InstitutionLogo.tsx` | the one reader of `palette.common` (G2): neutral black on light surfaces, neutral white on dark surfaces, chosen by the surface the logo sits on; no other file names `common.white`, `common.black` or `grey.NN` once the migration in `§ Hand-off` lands |
| Outgoing HTML email templates: `src/components/Email/TemplatedEmailForm.tsx` (the browser preview) and `../kiwi/src/email/email.templates.ts` (what recipients receive) | email clients need inline literals; the literals are the light-mode hexes of the mapped tokens below, the two copies are byte-identical, and a test compares both against the source |
| Browser chrome: `index.html` `<meta name="theme-color">` (two tags, `media="(prefers-color-scheme: light)"` and `dark`) and `public/manifest.webmanifest` `theme_color` / `background_color` | the browser reads them before any stylesheet loads, so they must be literals; they are `--surface` per scheme for the theme colour (`#faf9f3` light, `#252218` dark) and the light `--surface` / `--background` for the manifest (`#faf9f3` / `#f4f1e4`, the splash canvas; the manifest cannot switch schemes); today's `#3f7d58` (on no ramp) and `#ffffff` (pure white, `§ Never`) are retired, and the same test compares both files to the source |

Not allowlisted: `src/theme/material-design-2014.json` (deleted with its two importers), `src/components/ClassAnalytics/tokens.ts` (merged into the source; its intent encoding is Phase 6), `.storybook/stories/Theme.stories.tsx` (its literals are the retired MD2014 palette, the pink secondary and `#ffffff`; the story reads the generated theme and public CSS instead of restating values), `IDE.css`, `register.css`, the PDF viewer's lilac greys and literal blue (SF-32: `#FAF9FC #E5E1EB #EFE8F6 #F3F1F7 #EDEBF1 #77777F #55555E #2A2A30 #1976d2`), the rest of the ~350 literals the brief counts (migrated), `public/assets/images/bg-hero-1.svg`, `bg-hero-2.svg` and `bg-hero-3.svg` (gradient fills, bg-hero-3 violet `#7a5c9e` / `#3d2c52`: deleted with the carousel, `§ Hand-off`) and `public/assets/images/kiwi-logo.svg` (`#fff` / `#000`, the lock's forbidden pure white and black: re-exported as a one-colour `currentColor` wordmark).

**Email mapping (both copies; emails are paper, so light values only; no purple):**

| Today's literal | Where | Token | Light value |
|---|---|---|---|
| `#f5f5f5` page | `body` | `--background` | `#f4f1e4` |
| `#ffffff` card | `.container` | `--surface` | `#faf9f3` |
| `rgba(0, 0, 0, 0.1)` card shadow | `.container` | none: a 1 px `--border` instead (depth order: tonal step → hairline; clients render borders reliably) | `#c6c3bb` |
| `#5C3B6E` header band | `.header` | the filled band is retired: the header is `--surface` with the title in `--text` at 24/32 600, closed by a 1 px `--border-subtle` rule. The brand mark is a **text wordmark** "Kiwi" in the email stack at 600 (no image dependency); if a graphic mark is wanted it is a hosted 32 px PNG exported from the mark at 2× with `alt="Kiwi"`, never an SVG (Gmail and Outlook desktop drop SVG) | `#faf9f3` / rule `#d4d2cb` |
| `#ffffff` header text | `.header` | `--text` | `#2f2e2a` |
| `#333333` text | `body`, `.content` | `--text` | `#2f2e2a` |
| `#f8f9fa` footer | `.footer` | `--background` | `#f4f1e4` |
| `#666666` footer text | `.footer` | `--text-secondary` (5.31:1 on the canvas) | `#65635c` |
| `#e9ecef` footer rule | `.footer` | `--border-subtle` | `#d4d2cb` |
| `#5C3B6E` links | `a` | `--link`, underlined | `#486d56` |
| `#5C3B6E` title | `adminNotification` `h3` | `--text` | `#2f2e2a` |
| `#fff3cd` notice box | `adminNotification` | `--status-warning-surface` | `#f9f0dd` |
| `#ffeaa7` notice border | `adminNotification` | none: status surfaces carry no coloured border; the box opens with a "Notice" label (Phase 5 wording) | — |
| `#856404` notice text | `adminNotification` | `--status-warning-text` (5.32:1 on its surface) | `#76602f` |
| `#5C3B6E` button | `welcome .btn` | `--accent-solid`: the one filled element in an email | `#203327` |
| `#ffffff` button text | `.btn` | `--accent-on-solid` (13.19:1) | `#fdfdfc` |
| `#4a3053` / `#4a2d5a` button hover | `.btn:hover` | `--accent-solid-hover` | `#486d56` |
| `Arial, sans-serif` | `body` | the email stack `"Source Sans 3", -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif` (no webfont load; Arial last, as the client fallback) | — |
| radius 8 / 5 px; `line-height: 1.6` | `.container`, `.btn`, the box | `--radius-sheet` / `--radius-control` 2 px; 1.5 | — |

Phase 5 revises the templates' copy ("Kiwi Platform", "Happy Kiwi-ing!", the footer line) and leaves these colours. Applying the mapping to the backend copy is a one-file edit in `kiwi/`, scheduled by the implementation plan so recipients and the preview agree (flagged in the Phase 3 report; the brief's Stage 1 boundary includes the templates' colours).

### Governance (DW-3.7)

- **Owner.** The design system has one owner: the kiwi-ui design-system owner, who owns `src/theme/` (the DTCG source, the emitter, the generated outputs), `public/kiwi-design-tokens.css` and `.storybook/design-system/catalog.json`. Currently Akutagawa Nagi (the author of the Stage 1 design commits in `MAPS-research/kiwi`); the role transfers by a Decision Log entry in the plan or its successor, never silently. Centralized model (governance doctrine): one product, one small team; a federated model is a tax at this scale.
- **Contribution path.** A change lands by pull request against `development`. By tier: a **component token** needs a reviewer and the token checks green; a **semantic token** needs the owner's review; a **new component or variant** needs an RFC-sized PR description (the use, the alternatives considered, why it is canonical), a `catalog.json` entry (the catalog holds contracts and rules, never values), a Storybook story that shows all eight states in both modes and both densities, the contrast assertions in the source, and the checks green; a **global value** means re-running the three `palette.mjs` commands, re-confirming the lock on a re-rendered swatch sheet, and a full alias and component audit (`§ Color tokens`). A team that needs something before its RFC lands forks locally with a `TODO: migrate to the design system` comment, never silently.
- **Versioning.** The public tokens are a library and version by semver; this release is **2.0.0** (the values and the font family change for every consumer). MAJOR for a token rename or removal or a component API change; MINOR for a new token, variant or component; PATCH for a value fix or a documentation fix. The version is in the public file's header and in `CHANGELOG.md`, with the migration path for every breaking change (brief done-when 10).
- **Deprecation.** Mark in the source, in the public file (`@deprecated since …, removed in …: use …`) and in the changelog; keep the name with a safe value; add a lint warning on use; remove **no earlier than two MAJOR versions after the deprecating release and no earlier than six months after it, whichever is later**: the names deprecated in 2.0.0 are removed in 4.0.0 at the earliest. The checker asserts the removal major on every entry (`§ Generation spec` holds the list); never a silent removal.
- **Gates.** The token checks run in CI; Storybook's accessibility panel runs on every materially changed state (catalog quality contract); the raw-colour lint and the drift test are release gates (brief done-when 1 and 3).

### Evidence (2026-10-16 and 2026-10-17, fix rounds 1 to 6 and the follow-up)

The live sources are `generated/check-summary.json` (written by `check-tokens.mjs` on every run; every token count below sits under the key named) and the sheet's own audit (`html[data-audit]` and `#audit` in `component-sheet.html`); the numbers here are the 2026-10-17 run, read from those files at assembly time, never typed, and a re-run of the pipeline rewrites them.

| Check | Result (2026-10-17) | Source |
|---|---|---|
| Contrast via `palette.mjs` | runs A (seed 156 muted), B (seed 95 muted) and C (seed 156 balanced), re-run in the fix rounds: each exits 0, 12/12 PASS, byte-equal to the locked block; no global value changed in any round | the lock's `§ Regeneration procedure` |
| Alias equality | 114/114 locked declarations equal in both modes | `aliasOk` |
| Structure | 20 components; 25 state groups × 8 states (200 state specifications) | `components`, `stateGroups`, `stateSpecs` |
| Per-state contrast | **422 required assertions pass, 0 fail** in both modes (text ≥ 4.5, non-text ≥ 3); 24 informational rows (inactive controls, the lock's decorative hairlines) | `contrast` |
| Tier and literals | 923 component-tier references, 0 outside the semantic tier; 6 marked component-specific literals, 0 unmarked; 0 colour literals outside the global tier, the G2 logo and the on-paper marks (the shadows and the backdrop are references with alphas); 3/3 frozen on-paper literals equal their light source; 0 banned hexes in the generated outputs | `tier`, `literals`, `frozen` |
| Public contract | 143/143 pinned v1 names mapped and emitted; 89/89 v1 classes and 3/3 keyframes present; 41 deprecated names and 18 deprecated classes and keyframes, 0 schedule violations; the reduced-motion guard stills 4 of 4 animated or transitioned selectors (§ 18) | `public`, `motionGuard` |
| Closure and density | 815 properties redeclared in dark, 96 in compact, 34 in the coarse block, 0 missing; the launcher and the Display menu carry no density-dependent token; 30 density deltas; the four code-theme files regenerate byte-identically | `densityDeltas`; `check-tokens.mjs` § 4, § 10, § 11 |
| Cues, the editor selection, MUI grey | 20 selection-cue assertions over 12 toggle-like variants, 0 failures (§ 14); 23 editor-selection assertions, 0 failures (§ 17); 32 `palette.grey` and `palette.common` keys equal the ramp and the logo pair, 0 mismatches (§ 19) | `cues`, `editorSelection`, `muiGrey` |
| Render | 918 exhibits in 23 sections at 1440 × 900 and 1280 × 800; the full page 1440 × 102678, captured in 13 8000 px segments and stitched pixel-exact (a surface this tall exceeds Chrome's raster budget and paints blank below about 10,000 px); the sheet's first style block is the emitter's output and every exhibit colour comes from a component token through the generated `[data-c][data-v][data-s]` rules (the only literal hexes on the page are the mascot's four) | the three screenshots; the sheet's first `<style>` |
| The sheet's audit: colour | 6503 text nodes, 0 below AA (lowest 4.80:1); 454 control boundaries, 0 below 3:1 (lowest 4.90:1); 140 focus rings, 1502 icons and 140 markers, pins and outlines, 0 below 3:1; 80 exempt (inactive) text nodes, 0 below AA by design; the dark column's `--shadow-2` and `--backdrop` embed the dark ink | `html[data-audit]`: `text`, `boundary`, `ring`, `icon`, `marker`, `exempt`, `darkShadowOk`, `darkBackdropOk` |
| The sheet's audit: behaviour | 184 inert controls (disabled, `aria-disabled` or busy), 0 without a specific stated reason; 924 controls nested inside another component, 0 differing from their canonical exhibit; 260 selected or pressed toggles, 0 without a non-colour cue; 1076 rendered parts, 0 differing from the token their state assigns; 244 switches, checkboxes and radios, 0 without an accessible name; 156 `aria-disabled` controls, 0 without `cursor: not-allowed`; the 390 px toast frame measures 342 px; 24 controls in the forced-colours exhibit, 0 without a surviving cue; 1070 table cells, 0 truncating; 332 table figures, 0 not in ink; the emulated coarse block gives the feedback toolbar a 44 px pitch and 44 px hit areas (fine: 30 / 28); controls 44 / 36 px, rows 52 / 36 px, the launcher glyph 24 px in both densities; no horizontal scroll at 1440, 1280, 1024, 960, 768 or 390 | `html[data-audit]`: `disabled`, `nested`, `cue`, `parts`, `names`, `cursors`, `toastNarrow`, `forced`, `overflow`, `numerals`, `coarse`, `sizes`, `scrollWidth` |
| Real coarse emulation (the DevTools protocol) | 1778 of 2120 controls reach 44 × 44 px and the 342 that do not are the stated exceptions, 318 admin-only (48 of the 48 table row and header checkboxes, compact; 4 of the 64 admin sidebar rows, comfortable; 62 of the 64 admin sidebar rows, compact; 92 of the 92 table rows, compact; 56 of the 56 admin table name-link cells, comfortable; 56 of the 56 admin table name-link cells, compact) and 24 links in running prose (WCAG 2.5.8's inline exception); every other student-route control reaches 44, the compact tool chrome (tabs, Find, Next match, Send, the page and search fields), the S-02 drawer's file rows and the comment pins included | `.design-foundations/tokens/coarse-audit.mjs` → `generated/coarse-audit.json` |
| Real forced-colours emulation | 240 selected, pressed, current or checked controls keep a visible cue (box-shadow markers left on chrome: 0; 124 redrawn as a ≥ 2 px outline, the rest by a glyph, a CanvasText dot or dash, weight 600 or the thumb's border; the 4 marks on the paper are content opted out with forced-color-adjust: none and keep their fixed G5 colours) | `.design-foundations/tokens/forced-audit.mjs` → `generated/forced-audit.json` |
| Detector (informational; the gate is the independent review) | 232 findings: `nested-cards` 230, every one a control inside a sheet (outlined secondary and destructive buttons, the composer's buttons, the neutral "In context" chip, the page and search fields, the drawer's filter chips): the case the lock's "Controls are not cards" rule whitelists; `em-dash-overuse` 1 (the sheet's body holds no em-dash character; the rule counts the `--` of the token names quoted in the notes); `numbered-section-markers` 1 (the tables' dates and times) | `detect.mjs` |

### Hand-offs

- **Phase 4 (Companion):** register `companion.slot.*` (launcher, composer peek, sign-in, empty-state, not-found) and `companion.backing`; this section fixes the surround: the 32 px avatar slot with a 12 px gap in the tutor row, the empty frame's 24 px below the slot, the launcher's 56 px disc; the companion's error pose fills the error frame; the one-mover rule extends to the toolbar (nothing else animates while an answer streams).
- **Phase 5 (Words):** every string quoted in the component tables and on the sheet is a placeholder, including the disabled reasons ("Enter at least one email first", "You're on the first page", …), error messages, the Stop label, the Display menu's labels ("Display settings", "Theme", "Kiwi animation"), the in-context chip and the email copy; the templates' colours are fixed here.
- **Phase 6 (Data surfaces):** apply the KPI tile (label, value, icon, trend or "no baseline") and the table rules (right-aligned tabular numerals in `--text`, units, truncation, the column minimums) to the analytics and admin tables; register `chart.*` with the five series at ≥ 3:1 on `--surface` in both modes, hue-separated and colour-blind-checked, replacing the interim `-11` stand-ins; the in-progress alert replaces the warning-toned "Analysing…" note.
- **Phase 7 (Mocks):** mocks paste `generated/kiwi-ui.tokens.css` and set `data-theme` and `data-density` on their roots; the phone-width renders (390 × 844) match `(pointer: coarse)` so the 44 px hit areas apply; no hard-coded hex (DW-7.2).
- **Implementation plan:**
  - port the emitter and checks (the four code-theme files replace `clouds`/`monokai` and `tomorrow`/`prism`; `Theme.test.ts` expects the interim `palette.chart` stand-ins until Phase 6);
  - migrate the ~350 literals, the PDF viewer's lilac greys and blue among them, and the MUI grey and `common` accesses (`§ Hand-off: MUI grey and common` below); retire `material-design-2014.json`;
  - render every disabled control with `aria-disabled` and its toggletip (no wrapper);
  - re-point `index.html`'s theme-color metas (one per scheme) and the manifest's colours to the surface and canvas tokens;
  - add the checkbox component's states and the Ace search-box rules (`ext-searchbox`, if the IDE loads it);
  - add the Stop control, the neutral in-progress indicator, the disabled reasons with their `aria-describedby` wiring, the PDF toolbar's stated boundaries (Previous on page 1), the DataGrid footer rules, the hit-area pseudo-elements and the empty-state frame;
  - apply the email mapping to both copies;
  - the sign-in aside drops its photo dependency (TD-19): the aside is the ruled reading column on `--surface` with the wordmark in `--accent-solid` (12.7:1 light / 8.3:1 dark), so the gradient-over-missing-photo failure cannot recur; with the carousel go `public/assets/images/bg-hero-1.svg`, `bg-hero-2.svg` and `bg-hero-3.svg`.

#### Hand-off: MUI grey and `common` (review round 6, F1)

`palette.grey` is overridden with the neutral ramp (`§ (2) The MUI theme`) so nothing breaks before the migration, and the raw-colour guard flags every `'grey.NN'`, `theme.palette.grey[...]`, `common.white` and `common.black` outside `InstitutionLogo.tsx`. Today's code reaches colour through them 50 times on 45 lines in 22 files (26 `'grey.NN'` strings, 8 `theme.palette.grey[...]` reads, 16 `common.*`; the round-6 review counted 46 sites by line), by role:

| Role → the role to write | Sites (`kiwi-ui/src/…`) |
|---|---|
| Page canvas → `background.default` (`--background`) | `pages/admin/AdminLayout.tsx:656` and `components/AuthLayout/AuthLayout.tsx:26` (grey.50); `pages/Courses.tsx:45` and `pages/ClassLayout.tsx:359` (grey.100). Followed to the letter today these canvases keep MUI's `#fafafa` / `#f5f5f5` in light and stay near-white in dark |
| Sunken band, table head or inset panel → `action.hover` (`--surface-hover`) | `components/Email/EmailSelectedUsersDialog.tsx:236, 315`; `components/Email/TemplatedEmailForm.tsx:405`; `components/MCP/MCPTestResultDialog.tsx:161, 175, 195`; `pages/admin/KiwiAppsAdmin.tsx:908, 1111, 1433, 1447`; `pages/admin/WebhookEventApprovals.tsx:1016, 1119`; `pages/admin/ClassKiwiAppsSettings.tsx:698`; `pages/admin/AnnotateDocument.tsx:1447` and the table-head cells `:1564–1566`; the message bubble `components/RecitationDetail/AnnotatedChat.tsx:101` (grey[100] light / grey[800] dark → the tutor-message surface, one role for both modes) |
| Hairline → `divider` (`--border-subtle`); a control's boundary → `secondary.main` (`--border-interactive`), hover `--text` | `components/GoogleLoginButton/GoogleLoginButton.tsx:50` (grey.200 on the neutral variant: a control boundary, so `--border-interactive`) and `:56` (grey.300 on hover → `--text`); its `:55` hover fill grey.50 → `action.hover` |
| Cover placeholder → one tonal step, no gradient (`§ Never`); wordmark fallback → the mascot | `components/ClassCard/ClassCard.tsx:53` (the card's grey.100 fill → `background.paper`, a sheet on the canvas), `:85` and `:121` (the grey.100 → grey.300 gradients → a flat `--surface-hover` tile), `:107` (the fade overlay → removed), `:128` (the grey.500 wordmark placeholder → the mascot still pose, Phase 4's `companion.slot.*`) |
| Label on a filled control → `primary.contrastText` (`--accent-on-solid`) | `components/PrimaryButton/PrimaryButton.tsx:13`; `components/DateTimeRangePicker/DateTimeRangePicker.tsx:401` (the selected day on its filled cell) |
| Shadows → `--shadow-1` / `--shadow-2` (they reference `--shadow-ink`, never pure black) | `components/AdminPage/AdminFormActions.tsx:29`; `components/TopNav/ClassSwitcher.tsx:198` (two); `Theme.ts:204` |
| The sign-in hero and its glass card: retired with the carousel (TD-19); the aside is the ruled reading column on `--surface` with `--text`, the wordmark in `--accent-solid`, the form fields the standard field on `--surface` | `components/AuthLayout/AuthLayout.tsx:58, 77` (white text on the hero); `components/HeroCarousel/HeroCarousel.tsx:97`; `components/FormCard/FormCard.tsx:31` (white text on the glass card); `components/WhiteTextField/WhiteTextField.tsx:16, 19, 22, 25, 36` |
| `palette.common` stays, read by one file | `components/Brand/InstitutionLogo.tsx` picks black or white from the surface it sits on; `components/AuthLayout/AuthLayout.tsx:73` stops passing `color="common.white"` and passes the surface |

With the carousel go `public/assets/images/bg-hero-1.svg`, `bg-hero-2.svg` and `bg-hero-3.svg` (gradient fills; bg-hero-3 violet `#7a5c9e` / `#3d2c52`), and `public/assets/images/kiwi-logo.svg` is re-exported as a one-colour `currentColor` wordmark (its `#fff` / `#000` are the lock's forbidden pure white and black).

## Companion

**Phase 4 (2026-10-17), appended under the lock; fix round 1 applied the same day** (the user's decisions on the rendered sheet: `hop` about 1 s, `speaking` keeps the shallow dip, the like reaction is `wave`; and the review's findings F1 to F10 and N5). The tutor companion as an honest, calm reflection of system state: nine chat states, the one-mover rule, the still poses, the motion controls, the placements, the backing, the asset budget and the ethics pass. It changes no locked value and no Phase 3 wording; it registers `companion.slot.*` and `companion.backing` in the DTCG source's reserved namespace, and the emitter and checker outputs follow (`§ Registration`). Plan: `.design-foundations/plans/2026-10-16-kiwi-ui-stage-1.md`, Phase 4 (DW-4.1 to DW-4.7); brief G9, G9b ("分时刻、读字时安静": react at moments, stay quiet while the student reads), G11, G14. Doctrine applied: motion (a clip ships only if it communicates a state change; whole drawings are swapped, nothing is tweened; reduced motion honoured at the source), ai-native (calibrate; every state has a text twin; the canon gap is marked), behavioral (Norman's levels; Fogg's prompt timing; peak-end), deceptive-patterns (the nine Brignull categories; symmetric controls; no streak, nag or guilt), usability (Nielsen #1, #3, #4, #9; Fitts; recognition over recall). `md` below is the MUI `md` breakpoint, a 900 px viewport, as JOURNEY uses it.

**Canon gap.** ai-native design has no settled canon. Claims marked `[principle-derived]` rest on practitioner sources (Dibia's agent-UX principles; Wilson, *Age of Invisible Machines*, 2022; Smashing, "Designing for AI Beyond Conversational", 2024) or on the designer's own inference, as stated; weight them accordingly. Everything else cites established doctrine (Nielsen 1994, Norman 1988/2013, Kahneman, Brignull 2023, WCAG 2.2).

**Source and assets.** The drawings are `NYUSH-ML/kiwi-ui` branch `kiwi-icon`, commit `fbb4db85f90aeda3a1250c8e9c8aa2d7473e2e11` ("feat: Add Kiwi icon and drawn-frame motion library"): eight registered atlases of 24 drawings each (6 × 4 cells of 256 px, a 24 Hz timeline clock with explicit exposure holds, no crossfade or pose warping), played by a frame player that honours reduced motion, hidden tabs, offscreen elements and interrupted reversal. The library is **ported**, not merged (G9); its chat mapping (`assistantState()`: thinking / speaking / error / idle) and its launcher peek are replaced by the table below, and its `KiwiLoader` is not used (a walk across a track toward an end that means nothing is a manufactured goal-gradient). Exported here, with a provenance note: `.design-foundations/mocks/assets/mascot/` (`still-<state>.png` × 9, pixel-exact; `stills/` the 2× WebPs at 192, 128 and 64 px; `atlas/` resampled playback atlases; `launcher-glyph.svg`; `provenance.md`; `export-mascot.py`, which regenerates all of it from `--source <checkout>`). Evidence: `.design-foundations/mocks/companion-sheet.html` and `.design-foundations/mocks/screenshots/companion-*` (`§ Evidence`).

### Principles

1. **React at moments, quiet while reading (G9b, `§ Direction`).** Motion belongs to the five moments the user named (typing, generating, arriving, liking, failing) and to the two system conditions (error, offline). Between them the companion holds a still. `idle` is a still, not a blink loop, whenever answer text is on screen: the lock's "still while text is on screen" applied to G9's "an occasional blink at most" (zero is within "at most"). `[principle-derived: designer's inference from G9b and the lock]`
2. **A clip ships only if it communicates a state change** (motion doctrine), with the two visceral exceptions the brief names (G9): the composer peek, which signals presence while the student composes and nothing else, and the like reaction, which acknowledges the student's own act. Loops are allowed only where the state itself is ongoing and otherwise invisible (waiting: `walk`; text arriving: `speaking`); every other clip is one-shot and rests on its still or ends in `idle`. Not used: the library's `heart` (drawn as a bow; the user chose `wave` for the like), `bow`, `sleep`, `notification`, `curious`, `thinking`, `listening`, `fly`, `success`, `pop`: none has an honest trigger in chat.
3. **One mover.** Only the newest tutor message's avatar animates; older avatars hold their still. The composer peek is lower than the avatar: it shows only while the newest avatar is still, it is **cut, with no retract, the moment a send starts** (`walk` has priority), and it is removed, not stilled, when motion is off; reversal (`retract` from the drawing on screen) is for blur and for the typing flag's 1.5 s expiry only. The lock's chrome rule holds: while an answer streams nothing else in the panel animates. A like on an older message fills that thumb and plays no clip. In experiment compare mode only the avatar of the most recently started answer animates (ties: column A); the other column's avatar holds its still and its text twins carry its state, so the rule holds without exception.
4. **Never the only signal** (G9; WCAG 1.4.1). Every state has a text twin (the table's last column); the mascot is `aria-hidden="true"` everywhere and carries no `role`, `title` or label. Progress is stated in words, never implied by the drawing.
5. **Calibrated.** The companion never signals more than the system knows `[principle-derived: Dibia, Smashing]`: `hop` fires once per real completion and never per token; `walk` runs in place (no progress bar, no journey); `offline` means "cannot answer now", not "you did something wrong"; `error` is apologetic, not alarming, and sits beside Retry (Nielsen #9).
6. **Transitions are cuts.** The library draws whole registered drawings and forbids interpolation; a state change is a hard cut, which is also the most honest "something changed" signal `[principle-derived: designer's inference from the library's no-interpolation rule and motion doctrine]`. The one exception the library implements: `peek` ↔ `retract` reverse from the drawing on screen, on blur or on the typing expiry (never on send).
7. **The artwork keeps its colours (G11).** The four flat colours are artwork, allowlisted in `§ Raw-colour guard`; no token recolours a drawing, and the backing is a UI token, not the mascot's cream. The launcher's glyph is an icon in `currentColor` (`§ Icon policy`), not mascot art.

### Registration

Registered in `.design-foundations/tokens/kiwi-ui.tokens.json` under the reserved `companion` group (never edited into the three tiers); each token names its CSS property explicitly, so the resolver's naming rule is untouched; the emitter writes them into `generated/kiwi-ui.tokens.css` (`:root`, and `--companion-backing` again in both colour blocks). Dimensions are literals like `semantic.size`'s fixed sizes; the avatar references Phase 3's `semantic.size.avatar` (G9).

| Token | CSS | Light | Dark | Use |
|---|---|---|---|---|
| `companion.slot.avatar` | `--companion-slot-avatar` | `{semantic.size.avatar}` = 32 px | same | the tutor avatar on every tutor row (G9); the one animated placement in the message region |
| `companion.slot.peek` | `--companion-slot-peek` | 48 px | same | the composer peek, anchored to the composer field's top-right corner: its right edge on the field's right edge and its bottom edge on the field's top edge, inside the 48 px lane formed by the message region's 24 px bottom padding and the composer's 24 px top padding (raised from 12 px for the lane); shown only at scroll end, once per focus session (`§ The nine states`) |
| `companion.slot.launcher` | `--companion-slot-launcher` | 28 px | same | the launcher's glyph box: the companion's portrait silhouette with a filled speech bubble (`launcher-glyph.svg`, `currentColor`) in `--accent-on-solid` on the locked 56 px `--accent-solid` disc; 28 and not the Phase 3 stand-in's 24 (`--launcher-icon-size`), decided on the sheet's 1× recognition check (review F6): the 24 px silhouette is a ghost (the eye cut-outs vanish), at 28 the beak reads but the eyes still do not, and the filled bubble restores the chat signifier (Nielsen #4; recognition over recall) while the head keeps "Kiwi"; the dotted bubbles fell below one pixel. The 14 px margin keeps the disc and its 44 px target unchanged. Chrome: never animated, no backing |
| `companion.slot.signin` | `--companion-slot-signin` | 96 px | same | S-05, S-06: the idle still above the display line on the ruled column, from `md` |
| `companion.slot.empty` | `--companion-slot-empty` | 96 px | same | page-level empty states (S-01, A-01, A-19) and the page-level error frame, from `md` |
| `companion.slot.not-found` | `--companion-slot-not-found` | 96 px | same | S-10: the walk still (the standing bird), from `md` |
| `companion.slot.inline` | `--companion-slot-inline` | 64 px | same | the chat panel's empty conversation, the class-card fallback (S-01, A-01, A-02, A-13), S-08's centred card, and every 96 px slot below `md` (390 px) |
| `companion.backing` | `--companion-backing` | `{semantic.color.fill-none}` (transparent) | `#faf9f3`, frozen to light `global.color.paper.2` | the disc behind the drawn mascot, `--radius-round` at the slot size (the lock's dark-mode backing circle); under the avatar, the peek and every still; never under the launcher glyph |

**The dark backing is a frozen literal.** A light value cannot be referenced from the dark context in this resolver, so the dark value is a literal held to its source exactly as the on-paper marks are: `$extensions["org.kiwi"].frozen = { source: "{global.color.paper.2}", context: "light", at: "dark" }`. `check-tokens.mjs` gained the two checks that follow from the registration and nothing else: § 5 admits a `companion.*` colour literal only when it is frozen to a named light source, and § 15 reads a frozen literal held in a mode block (`frozen.at`); § 20 asserts the backing contrast (`§ Backing and contrast`). The MUI theme preview and the public CSS are unchanged (the companion is not a public token in Stage 1).

**Framing.** Every slot draws its atlas cell with the library's per-atlas circle framing (`framing.ts`: one union centre and scale per atlas, computed over all 24 drawings), in both modes, so the drawing keeps one size and position whether or not the backing disc is visible and never leaves the disc while airborne. Switching atlases (a full-bird clip after a portrait clip) is a cut between two framings; the library forbids recentring at runtime.

### The nine states

Timeline: a 24 Hz clock; a drawing may occupy several ticks (an exposure hold). Durations are computed from the sequences below (`ticks / 24`). "Still" is the atlas cell shown whenever motion is off at any level (`§ Motion controls`) and the drawing a one-shot clip rests on. Triggers name the chat signals in code today (JOURNEY SR-6) and, in brackets, the ones the implementation plan adds (frontend-only, brief Constraints). Text twins are **drafts**: Phase 5 revises them in place (plan carve-out 1) and every change lands in the revision index.

| State | Moment · trigger | Atlas · sequence (ticks) · duration | Exit | Interruption / reversal | Still (cell) | Text twin (draft) · honest purpose |
|---|---|---|---|---|---|---|
| `peek` | The first keystroke of a **focus session**: the student focused the composer by pointer or keyboard (the focus the app hands back after an answer starts no session), `botAnswering` is false, the newest avatar is still and the message region is at scroll end [adds a per-session typing flag with a 1.5 s expiry and scroll-end detection] | `stamp-peek` · hold 0 × 4, 0→23 at 2 each, hold 23 × 4 (56) · **2.33 s**, one-shot, rests fully out while typing continues; once per focus session | `retract` 1.5 s after the last keystroke (the flag's expiry) or on blur; **cut on send** (the slot empties at once, no retract: `walk` has priority); cut when the slash-command menu opens in its lane (N5) | Suppressed while the newest avatar is mid-clip or the region is scrolled up (and cut if either begins while it shows); after it has retracted or been cut it does not return until the student focuses the composer anew: the expiry never re-arms it, and an answer never re-arms it | 23 (fully out) | none: the student's own typing is the state · presence while composing (Norman, visceral; the brief's named exception); never a prompt to act |
| `retract` | The typing flag expired (1.5 s) or the composer blurred | `stamp-peek` · the exact reverse of `peek` from the drawing on screen (56 from fully out) · **2.33 s**, one-shot, ends hidden | the slot is empty (removed from layout once cell 0 is reached) until the next focus session | A send mid-retract cuts it (no reversal on send); new typing in the same session does not reverse it back (once per session) | 0 (a beak tip at the edge) | none · the companion steps back when attention moves |
| `walk` | Waiting for the first token, or a tool or agent step **before any text of the turn**: `botAnswering` true and the newest tutor message has `streaming === "null"`, `toolExecution.status === "running"` or a running agent step | `full-walk` · 0→23 at 2 each (48) · **2.0 s loop**, in place | first token → `speaking`; Stop → `idle`; error → `error`; offline → `offline` | Looping: cut at any exit; never shown while any answer text of this turn is on screen (plan constraint): a tool step that starts after narration text keeps `idle` | 0 (standing) | "Thinking…" with the text dots, "Running ⟨tool⟩…" for a tool step (today's "Working…"; Phase 3 loading state; Phase 5 words) · visibility of system status (Nielsen #1) while nothing can be read |
| `speaking` | Answer text is streaming: the newest message's `streaming` is mid-stream (`null`) and its text is growing [adds `isStreaming`] | `portrait-nod-sleep` · hold 0 × 60, 0→2 at 3 each, hold 2 × 9, 1→0 at 3 each (84) · **3.5 s loop** with about 0.6 s of movement (a shallow dip of head and beak, the smallest excursion the atlas offers; kept by the user) | completion → `hop`; Stop → `idle`; error → `error`; offline → `offline` | Looping: cut at any exit | 0 (the attentive portrait; the same drawing family as `idle`, the text carries the state) | the arriving text; the composer reads "Kiwi is answering; Stop interrupts" (Phase 3) · "text is arriving", low amplitude so the eye stays on the words (G9) |
| `hop` | Answer complete: `streaming` becomes `"stop"` with no error and no Stop [adds a user-abort flag] | `full-hop-flight` · 0→23 at **1 tick each**, hold 23 × 4 (28) · **1.17 s**, one-shot → `idle`. All 24 drawings remain (crouch 0-3, take-off 4-8, flight 9-16, landing 17-23); dropping alternate drawings at 2 ticks would remove half the wing beats | `idle` when the clip ends | Cut by a new send (`walk`), an error or offline; consecutive completions never stack (a hop in progress is finished or cut, never queued); the welcome row and older messages never hop; a like during the hop fills the thumb and plays no `wave` | 23 (landed) | one polite live-region announcement "Kiwi finished answering.", then the focus move to the composer; visibly, the toolbar appears (Phase 3) · closure once per real completion (peak-end; Zeigarnik), identical every time, never a count |
| `wave` | The student likes the newest answer: Thumbs up in `Feedback.tsx` (`aria-pressed` turns true) | `full-wave-bow` · 0→14 at 3 each (the library's `wave` exposure), hold 14 × 6 (51) · **2.13 s**, one-shot → `idle` (the user's choice over the library's `heart`, a bow) | `idle` when the clip ends | Cut by a new send; a like while another answer streams or hops plays nothing (the thumb still fills, never queued); thumbs-down plays nothing and gets the same neutral acknowledgement (no sad clip, no guilt) | 8 (the wing at its highest; the notch between wing and body survives at 32 px on both grounds, checked on the sheet) | the pressed thumb ("Thumbs up, pressed", the filled glyph) and one polite live-region announcement "Feedback saved." (no toast, Phase 3) · acknowledges the student's own action (Nielsen #1; the brief's named exception); never solicits a like |
| `error` | The newest message's `error` is set, or a stream error, or an error snackbar path ("Server error", "out of tokens", "not allowed") | `portrait-nod-sleep` · 0→8 at 3 each, hold 8 × 36 (63) · **2.63 s**, one-shot, rests on 8 | Retry or a new send → `walk`; otherwise the still holds with the error row | An error mid-stream cuts `speaking` here and no `hop` follows; a second error restarts nothing (the still holds) | 8 (head lowered) | the error row, `role="alert"`: "Something went wrong while answering. Try again." + Retry (secondary) (Phase 3; Phase 5 words) · an honest failure with a way out (Nielsen #9), apologetic not alarming |
| `offline` | The browser reports `navigator.onLine === false` (the `offline` event), or the chat library has been reconnecting ("Connection lost") for more than 2 s [adds online status] | `portrait-doze` · 0→23 at 3 each (72) · **3.0 s** falling asleep, one-shot, rests on 23; on reconnect 23→0 at 2 each (48) · **2.0 s** waking, then the pending state | `online` event plus one successful request or reconnect, held 2 s | Hysteresis both ways (2 s) so a flapping connection never flickers; entering offline cuts any clip and no `hop` follows a stream that died | 23 (asleep) | the composer's status line, `role="status"`, written once after the hysteresis: "You're offline. Kiwi will try again when the connection returns."; the field is disabled with that reason (`aria-describedby`); while an answer was pending Send has already become Stop (Phase 3) and Stop stays enabled · calibrated: "cannot answer now" |
| `idle` | Everything else: after `hop`, `wave`, the error droop or the wake, after Stop, a tool step after narration text, and on every older message and the welcome row | `portrait-blink` cell 0 · **no sequence** (a still while answer text is on screen; `portrait-blink` is used for this still only) | a new send → `walk`; the first keystroke of a focus session → the composer peek (not the avatar) | none | 0 (the resting portrait) | none: the composer placeholder is the resting prompt · present and quiet (G9b) |

**The user's decisions (2026-10-17, on the rendered sheet).** `hop` lasts about 1 s: every drawing at 1 tick of the clock plus a 4-tick settle, 1.17 s (the gallery plays 3 ticks per drawing, 3.5 s; the brief's "~0.7 s" was a stale constant the library overwrites at load). `speaking` keeps the shallow dip. The like reaction is `wave` (2.13 s) instead of the library's `heart`, drawn as a bow (2.42 s as first specified). The companion sheet renders each beside what it replaced.

**Collisions (one clause each).** A tool or agent step that starts after narration text has streamed in the same turn: `idle` (text is on screen, so `walk` is forbidden; the step chain's "Running ⟨tool⟩…" carries the state). A like during `hop`: the thumb fills and the live region speaks; the hop finishes; `wave` does not play and is never queued. Motion off and a one-shot: `hop` and `wave`, which end in `idle`, are not shown at all (the avatar goes straight to the idle still; a one-second cut between two stills would be a flicker); `error` and `offline` show their still at once and hold it as long as the state lasts. An atlas not yet loaded when its state is entered: the avatar shows the state's 64 px still (or holds the previous still until that arrives); the clip is never played late once the atlas lands, and a `hop` whose atlas was missing at completion is skipped, never queued. The 32 px idle avatar (older rows, the newest at rest, the welcome row once a message exists) loads `stills/idle.64.webp` (2,998 B), the 2× still; the other states the avatar can rest on with motion off load their 64 px stills (`walk` 1,982, `speaking` 2,750, `error` 2,262, `offline` 2,614 B).

**Compare mode (instructors and admins).** `ExperimentCompare` renders two message regions. One mover: only the avatar of the most recently started answer animates (the column whose first token arrived last; ties, as when one send starts both, go to column A); the other column's avatar holds its still and its text twins ("Thinking…", the arriving text) carry its state. No exception to the rule.

### Motion controls

Motion plays only when all three levels allow it; a higher level cannot be overridden by a lower one. With motion off at any level, every state the avatar rests on shows its still (the table's Still column; `hop` and `wave` are skipped, `§ Collisions`) and the composer peek is not shown at all (its still would be an element popping in and out beside the composer: motion by another name, and G14 already says "there is no peek" for the flag). State changes still read as cuts between stills, so a student with reduced motion sees the state change without animation.

| Level | Control | Scope | Off means |
|---|---|---|---|
| 1 | `VITE_ENABLE_MASCOT_MOTION` (build-time, read through `src/config/branding.ts`; G14) | the deployment | the avatar is the idle still on every row; no peek, walk, speaking, hop or wave; the Display menu **hides** the Kiwi animation switch; no atlas is ever fetched (stills only) |
| 2 | `prefers-reduced-motion: reduce` (the OS) | the device | stills; no peek; the Display menu draws the switch **inert**: `aria-disabled="true"`, focusable, with the reason "Your device asks for reduced motion" as its `aria-describedby` (Phase 3, `§ The Display menu`), never a native `disabled`; a stored choice is kept and applies again when the preference clears |
| 3 | The Display menu's **Kiwi animation** switch (G4; `localStorage`, per device; default on) | the device | stills; no peek; sign-in and register honour it (there is no top bar there) |

Also paused, at every level: a hidden tab and an offscreen avatar (the library's `useKiwiMotion`), so a long conversation scrolled past its newest message animates nothing. The non-mascot motion budget (`§ Motion`) is unaffected by these controls.

### Placements

Every placement names its slot token, size from `md` and below `md` (390 px, G13), pose and backing; the same list is annotated on each page spec in `kiwi-ui/JOURNEY.md` (`Companion (Phase 4)` bullets). Only the two chat placements animate; every other slot loads one still (the 2× WebP of its size), never an atlas.

| Where (JOURNEY) | Slot | Size ≥ md / < md | Pose | Backing | Notes |
|---|---|---|---|---|---|
| SR-6 tutor rows: the avatar | `avatar` | 32 / 32 | the state table (newest message); `idle` still on older rows and the welcome row | `--companion-backing` disc | 12 px gap to the answer column; text 68 px right of the ruler (`§ The tutor-message surface`); the error row shows the `error` pose at 32 |
| SR-6 composer: the peek | `peek` | 48 / 48 | `peek` / `retract` (the composer's states, not the avatar's) | disc (the head slides in from the slot's right edge) | in the 48 px lane above the field (the region's 24 px bottom padding + the composer's 24 px top padding); shown only at scroll end, so it never overlaps text; once per focus session; cut on send and when the slash-command menu opens; absent when motion is off; absent in the signed-out panel |
| SR-6 empty conversation (the welcome row) | `inline` | 64 / 64 | `idle` still | disc | the empty-state frame's inline variant with the welcome line (Phase 5 words); once a message exists the welcome row is an ordinary tutor row with the 32 px idle still |
| SR-6 launcher (every signed-in route) | `launcher` | 28 / 28 glyph on the 56 px disc | `launcher-glyph.svg` (the silhouette with a speech bubble) in `--accent-on-solid` | none (an icon on the solid) | never animates; the stand-in chat bubble of the Phase 3 sheet is retired |
| S-05, S-06 sign-in and register | `signin` / `inline` | 96 / 64 | `idle` still | disc | above the `--text-4xl` display line at the column's left edge, 24 px right of the ruler (12 at 390), 24 px above the line; not in the aside (the wordmark stays there, G6) |
| S-08 MCP authorize (centred card) | `inline` | 64 / 64 | `idle` still; view A (invalid request) the `error` still | disc | above the card's heading |
| S-01 course list: no classes | `empty` / `inline` | 96 / 64 | `idle` still | disc | the empty-state frame, no-action variant for students (JOURNEY D-4) |
| S-01, A-01, A-02, A-13 class-card image fallback | `inline` | 64 / 64 | `idle` still | disc | centred on the card's 152 px cover, a flat `--surface-hover` tile (`§ Hand-off: MUI grey and common`); replaces the grey wordmark (TD-04) |
| S-01, A-01 page-level load error | `empty` / `inline` | 96 / 64 | `error` still | disc | the empty-state frame's error state: cross icon, the error copy (`role="alert"`), Retry (secondary) |
| A-01 classes: none / none assigned | `empty` / `inline` | 96 / 64 | `idle` still | disc | the frame with "Create first class" for admins; no-action variant for instructors |
| A-19 experiments: none | `empty` | 96 | `idle` still | disc | replaces the flask icon in the existing card; the Assistant's auto-open (TD-30) is Stage 2 |
| S-10 not found | `not-found` / `inline` | 96 / 64 | `walk` still (standing) | disc | on the ruled column with the `--text-2xl` line and the way back (Phase 5 copy) |
| SR-1 top bar, no institution configured | — | as today | the P2 app tile `kiwi-mark.svg` | — | not a companion state; recorded so the placement list is complete (G2 lets Kiwi's own marks keep the brand palette) |

At 390 px the chat panel is fullscreen; the avatar and the peek keep their sizes, the 96 px slots drop to `inline` (64) and the sign-in column's text sits 12 px right of the ruler (`§ Signature move`).

### Backing and contrast

The forest outline `#234631` (artwork) must clear 3:1 against whatever is behind it (WCAG 1.4.11; brief done-when 2 names the mascot backing in the manual pass). Measured on the tokens (WCAG 2.x; `check-tokens.mjs` § 20, 7 required pairs, 0 below; all seven reproduced live by the companion sheet from computed styles):

| Mode | Behind the outline | Value | Ratio | Result |
|---|---|---|---|---|
| dark | `--companion-backing` (light paper-2, frozen) | `#faf9f3` | 10.00:1 | PASS |
| light | `--surface` (the backing is transparent) | `#faf9f3` | 10.00:1 | PASS |
| light | `--background` | `#f4f1e4` | 9.31:1 | PASS |
| light | `--surface-hover` (the class-card cover tile) | `#f1f0ed` | 9.25:1 | PASS |
| light | `--surface-active` | `#e9e8e4` | 8.60:1 | PASS |
| light | `--accent-bg-subtle` | `#e6f5eb` | 9.35:1 | PASS |
| light | `--status-error-surface` (the error row) | `#ffebe9` | 9.19:1 | PASS |

Informational: the backing disc against the dark canvas 16.64:1 and the dark sheet 15.08:1 (a visible disc by design, the lock's backing circle; its glare in a long dark conversation is checked in Phase 7); the tan bill 1.76:1 on the backing (the bill is not the outline; the forest silhouette carries the shape); without a backing the outline would measure 1.22-1.66:1 on the dark surfaces, which is why the disc exists (G9). The launcher glyph is `--accent-on-solid` on `--accent-solid`: 13.19:1 light, 10.06:1 dark (`§ Contrast`).

**Assistive technology and announcements.** Every mascot element is `aria-hidden="true"` with no role, name or title; the mascot is never a control (the peek and the avatar take no pointer events; the launcher is the button and its glyph is decorative). The text twins are what is announced, each once per event: the error row is `role="alert"` (assertive, announced when inserted; focus does not move, and Retry is the next tab stop); the composer's offline line is `role="status"` (polite), written once after the 2 s hysteresis and cleared on reconnect without an announcement (the next state's own text carries it); completion is one polite live-region announcement ("Kiwi finished answering."), after which, on the next frame, focus moves to the composer (Phase 3), which announces only its own name — the composer's description never repeats the completion text, so nothing is spoken twice; a like is one polite announcement ("Feedback saved.") beside the pressed thumb (`aria-pressed="true"`). No region repeats for the same event, and the mascot never adds an utterance of its own.

### Asset budget and port inventory

**Runtime assets in the source** (`public/kiwi-mascot/frames-v3/`, measured at the pinned commit; SHA-256 in `provenance.md`): `full-hop-flight.webp` 564,972 B · `full-walk.webp` 571,354 B · `full-wave-bow.webp` 496,314 B · `portrait-blink.webp` 688,748 B · `portrait-doze.webp` 595,390 B · `portrait-nod-sleep.webp` 599,782 B · `portrait-turn.webp` 597,534 B · `stamp-peek.webp` 343,046 B; **4,457,140 B** in all, 256 px cells. Not ported: `frames-v2/`, the lossless PNG twins, the `*.source.png`, the per-frame PNG directories, the animated `kiwi-<state>.webp` previews, the v1 SVG rigs, `KiwiLoader`, `KiwiStamp` as the launcher. Ported for playback: six atlases (`portrait-turn` serves no G9 state; `portrait-blink` supplies the idle still only).

**Cell size per placement and what is present at each state.** No 256 px atlas is loaded for a 32 px avatar (brief done-when 7): the port generates the resampled atlases at build time (`export-mascot.py` is the reference; lossless WebP, Lanczos, 6 × 4 cells), measured below.

| Placement | Cell | Atlases present (state) | Bytes each |
|---|---|---|---|
| tutor avatar 32 px | 64 (2×) | `full-walk` (walk) 34,942 · `portrait-nod-sleep` (speaking, error) 50,852 · `full-hop-flight` (hop) 34,622 · `full-wave-bow` (wave) 34,430 · `portrait-doze` (offline) 53,610 | 208,456 B for the five; `idle` is a still and the peek is its own slot |
| composer peek 48 px | 96 (2×) | `stamp-peek` (peek, retract) | 60,786 B |
| every still slot (96 / 64 / the 32 px avatar at rest) | one still, 192 / 128 / 64 px WebP | `idle` 14,776 / 8,130 / 2,998 · `error` 11,988 / 6,326 / 2,262 · `walk` 10,028 / 5,140 / 1,982 · `speaking` — / — / 2,750 · `offline` — / — / 2,614 | 2-15 KB each; no atlas |
| launcher | SVG | `launcher-glyph.svg` | 1,748 B |

**Loading order (lazy, per state).** An atlas is fetched the first time its state is entered; stills are fetched where they render. A chat page therefore loads, before the first answer completes: the welcome row's idle still at 128 px (8,130 B), the newest row's idle still at 64 px (2,998 B), then `full-walk` + `portrait-nod-sleep` + `full-hop-flight` (120,416 B) = **131,544 B**; with `stamp-peek` at 96 px, if the student typed, **192,330 B**. **Budget: ≤ 300 KB** (brief done-when 7), met with a 108 KB margin. `full-wave-bow` and `portrait-doze` load only on a like or when offline. **The whole shipped set** is the five avatar atlases at 64 px (208,456 B) + `stamp-peek` at 96 px (60,786 B) + the stills the placements load (63,854 B: 64 px idle, walk, speaking, error, offline; 128 px idle, error; 192 px idle, walk, error) + the launcher glyph (1,748 B) = **334,844 B**. With motion off at level 1 nothing but stills and the glyph is ever fetched. The 128 px set in `atlas/` is the companion sheet's inspection size and is not shipped; 3× phones draw the 64 px cells at 1.5× (N7), accepted for a 32 px decorative drawing.

### Edge cases (plan)

- **Generation stopped by the student** (Stop, Phase 3): `walk` or `speaking` cuts to `idle`; no `hop`; the partial answer stays.
- **Error mid-stream:** `speaking` cuts to `error`; no `hop`; the error row (`role="alert"`) and Retry appear under the partial text.
- **Rapid consecutive answers:** a hop is finished or cut by the next `walk`, never queued; a completion that arrives while a hop plays (compare mode's other column) does not restart it.
- **Flapping offline signal:** 2 s hysteresis on entry and on exit; a reconnect under 2 s shows nothing and announces nothing.
- **Send while the peek shows:** the peek is cut, no retract (`walk` has priority); the focus session is consumed. Phase 3 disables the composer while Kiwi answers, so typing cannot start mid-stream; the flag's expiry never re-arms the peek, and the focus the app returns after the answer starts no session, so the peek does not return until the student focuses the composer again.
- **Scrolled up while typing:** the peek is suppressed (and cut if it was showing), so the lane's inner half is always the region's empty bottom padding; it never overlays text.
- **The slash-command menu** (a bare `/`) opens in the lane: the peek is cut and does not return in that session (N5).
- **390 px:** the placements table's second size column; the panel is fullscreen and the composer full width, the peek keeps 48 px.
- **Screen readers:** the mascot is `aria-hidden`; the announcements are listed under `§ Backing and contrast`, one per event.
- **Hidden tab or scrolled-away avatar:** playback pauses and resumes in phase (the library).
- **Compare mode:** one mover, the most recently started answer's avatar (`§ The nine states`).
- **Text twins are drafts:** Phase 5 revises them in place; this table is the list it revises.

### Ethics pass (deceptive-patterns, behavioral)

Walked against Brignull's nine categories (`dark-patterns.md`) and the six honest-use tests (`ethical-application.md`). Finding: **none present**.

| Category | Checked | Finding |
|---|---|---|
| 1 Urgency and false scarcity | no timer, countdown, "Kiwi is waiting", "last chance" | none: the companion never asks the student to hurry or return |
| 2 Misdirection | the mascot never sits beside a destructive or consequential control and never draws attention from Stop, Retry or the thumbs; it takes no pointer events; the peek yields to the slash menu | none |
| 3 Hidden information | nothing is disclosed through the mascot alone (never the only signal) | none |
| 4 Friction asymmetry | the Kiwi animation switch is one control, on and off alike, with the same neutral label in both positions; reduced motion is honoured without a setting | none (symmetry test: pass) |
| 5 Social manipulation | no activity counters, no "other students liked this", no fabricated reactions | none |
| 6 Default exploitation | the switch defaults to on for a decorative, reversible preference; the OS preference overrides it; nothing financial or privacy-related rides on it | none (user-beneficial default, transparent choice) |
| 7 Language manipulation | the switch reads "Kiwi animation: on / off"; no confirmshaming label on the decline; Phase 5 keeps every state text plain | none |
| 8 Addiction traps | no streak, no variable reward (every hop is identical and deterministic; the wave plays once per like and never for a dislike), no "come back" nudge, no dozing-when-ignored, no notification state; the peek shows once per focus session and never unprompted | none (internal-trigger test: the student's own question; reflective-level test: the student finished reading, nothing pulled them back) |
| 9 Pricing opacity | not applicable | none |

Each reaction's honest purpose is stated in the state table's last column; the test for every one of them is that it serves the student's own goal (reading and understanding the answer) and never the product's engagement metric (goal-alignment test: pass).

### Evidence

**Registration and checks.** `node build-tokens.mjs` emits the eight `--companion-*` properties on `:root` (`--companion-backing` redeclared in both colour blocks; `--companion-slot-launcher` now 28 px); `node check-tokens.mjs` exits 0 on 2026-10-17: alias equality 114/114 and every Phase 3 count unchanged, § 15 frozen literals 4/4 (the dark backing held to light `paper-2`), § 20 companion backing 7/7 (`generated/contrast-report.md`, `generated/check-summary.json`). The two checker touches that follow from the registration are the only script change (round 1): § 5's allowance for a frozen `companion.*` literal and § 15's `frozen.at`; the MUI theme preview and the public CSS are byte-identical to Phase 3's.

**Render.** `.design-foundations/mocks/companion-sheet.html` (fix round 1; the emitter's CSS verbatim; the mascot assets beside it; the evidence panes carry no border or shadow) by headless Google Chrome through `tokens/tools/cdp.mjs`: `screenshots/companion-sheet.1440x900.png`, `companion-sheet.1280x800.png`, `companion-sheet.1440.full.png` (1440 × 11946, three 4000 px segments stitched, no blank band), `companion-sheet.launcher-glyphs.png` (the F6 recognition check at 1×), `companion-sheet.1440x900.reduced-motion.png` and `companion-sheet.placements.reduced-motion.png` (Chrome emulating `prefers-reduced-motion: reduce`), and the page's self-audit `companion-sheet.audit.json`. The audit at 1440 (and 1280): 9 state cards with 9 text twins, the timelines computed live (`hop` 1.17 s over 24 drawings, `wave` 2.12 s, `speaking` 3.5 s, `peek` and `retract` 2.33 s, `error` 2.62 s, `offline` 3.0 s and a 2.0 s wake); 18 stills; 104 of 104 mascot elements `aria-hidden`; 48 placements measured, 44 at their registered slot size (the launcher glyph at 28) and the 4 peeks of the send and streaming exhibits suppressed as specified, 0 failing; the 32 px avatar's idle still loaded at 64 px; all 7 backing pairs reproduced live from computed styles (light lowest 8.6:1 on `--surface-active`, dark 10:1 on the backing, 0 below 3); the error rows carry `role="alert"` and the offline lines `role="status"` in the exhibits (2 and 2); the Kiwi animation switch is never natively disabled (`aria-disabled`, described by its reason); 0 duplicate ids; at most 1 mover per chat exhibit over 20 live samples of 14 exhibits; 23 of 23 assets loaded; Source Sans 3 loaded; no horizontal scroll at 1440 or 1280. Under emulated reduced motion: 0 elements playing, 0 peeks visible, the switch inert with its reason (true); with the deployment flag off: the switch hidden, 0 playing, 0 peeks; with the switch off: 0 playing, 0 peeks.

**Motion previews.** `screenshots/companion-<state>.gif` (nine files: light and dark side by side at 128 px, the specified timelines composed from the source cells; `companion-hop.gif` 1.17 s, `companion-wave.gif` 2.13 s) and `companion-states.strip.gif` (all nine on the dark sheet). The sheet's section 4 plays `hop` beside the gallery's timing, `speaking` beside the gallery's nod, and `wave` beside the bow it replaced.

**Detector.** `detect.mjs` on the sheet (`.design-foundations/build/2026-10-16-kiwi-ui-stage-1-phase-4-detect.json`): three rules fire, 32 findings. `nested-cards` 30 ×, every one the composer field or a Send, Stop or Retry button inside the chat panel sheet: controls inside a sheet, whitelisted by the lock ("Controls are not cards", `§ Space, shape, depth`) and accepted in Phase 3 (plan Decision Log, Minor F12); the round-1 hits on the panel, the launcher and the class-card body are gone because the evidence panes and the state cards' stages carry no border. `em-dash-overuse` 1 × and `numbered-section-markers` 1 × are the register-justified false positives accepted in Phase 3 (F13): the dashes are prose, the "sequence" is the tables' numbers.

### Hand-offs

- **Phase 5 (Words):** the text twins in the state table (drafts); the welcome frame's line; the offline line; the three live-region strings (completion, feedback, the offline status); the error row; the Display menu's inert-switch reason.
- **Phase 7 (Final mocks):** the chat mock shows every state from this table as a frame strip with the one-mover rule visible; mascot frames are the stills in `.design-foundations/mocks/assets/mascot/`; the companion sheet is the motion reference; the offline-while-pending frame (Stop enabled, the offline line) is the one to reuse.
- **Implementation plan:** port `src/components/KiwiMascot/` (player, framing, motion hooks) without `KiwiLoader` and without the launcher stamp; generate the 64 px and 96 px atlases and the 64 / 128 / 192 px stills at build time from the source atlases (`export-mascot.py` is the reference procedure); add the missing chat signals (a per-focus-session typing flag with a 1.5 s expiry, scroll-end detection on the message region, `isStreaming`, online status with 2 s hysteresis, a user-abort flag) in `ChatCore.tsx`; unit tests per chat event → state transition (brief done-when 7), including the send cut, the once-per-session peek and the compare-mode mover; `aria-hidden` on every mascot; `role="alert"` on the error row, `role="status"` on the offline line, the two polite live regions; the Display menu wiring per `§ The Display menu` (the switch `aria-disabled` + `aria-describedby` under reduced motion, hidden with the flag off); `VITE_ENABLE_MASCOT_MOTION` through `src/config/branding.ts` (G14); the launcher glyph at 28 px from `launcher-glyph.svg`.
