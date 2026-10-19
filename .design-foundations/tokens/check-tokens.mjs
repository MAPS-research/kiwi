#!/usr/bin/env node
// check-tokens.mjs — the gate checks of the generation spec (kiwi-ui/DESIGN.md § Design system).
// Exits 1 on any failure. Writes ./generated/contrast-report.md.
//   1. Alias equality: every token of the locked block (kiwi-ui/DESIGN.md) resolves byte-equal from the DTCG source, both modes (DW-3.1).
//   2. Structure: the 20 listed components (tokens-lib COMPONENTS) each carry state groups with exactly the eight states (DW-3.2).
//   3. Contrast: every per-state assertion holds in both modes (text ≥ 4.5, non-text ≥ 3) (DW-3.3).
//   4. Closure: in the emitted CSS, every property depending on a mode (density) token is redeclared in the dark (compact) block (DESIGN.md implementation note).
//   5. Literal policy: colour literals only in the global tier and the allowlisted semantic composites; no banned (purple-era) hex anywhere (DW-3.6).
//   6. Public coverage: every --kiwi-* name of today's public CSS is mapped; deprecated entries name a replacement and a removal version (DW-3.4).
//   7. Density: the comfortable → compact deltas exist for space, control height, type size and row height (DW-3.9).
//   8. Tier rule: component tokens reference semantic tokens only (never a global, never another component).
//   9. Deprecation schedule: every deprecated public name is removed no earlier than two MAJOR versions after the deprecating release.
//  10. Coarse pointer: the @media (pointer: coarse) block redeclares every property that depends on a pointer-varying token, in each density block.
//  11. Density-invariant components (launcher, display-menu) carry no density-dependent token.
//  12. Component-tier literals: a component token's value is a semantic reference unless it is marked $extensions["org.kiwi"].literal with a reason; the marked ones are listed.
//  13. Public classes and keyframes: every v1 class selector and keyframe is present in the generated public CSS; the deprecated ones are marked and scheduled like the tokens.
//  14. Selection and pressed cues: every toggle-like variant carries a non-colour cue ($extensions["org.kiwi.cue"]) and a marker or glyph cue clears 3:1 against the selected fill and the unselected surfaces, in both modes (WCAG 1.4.1 / 1.4.11).
//  16. Chart series (Phase 6, DW-6.1): chart.series.1-5 and chart.other are registered for both modes; every series clears 3:1 on --surface, --background and --surface-hover;
//      the five sit within ± 0.07 OKLCH L of one target per mode (the measured reading of "matched lightness"), inside the admissible hue arc, at chroma 0.08-0.14; their minimum
//      pairwise OKLab distance under protanopia and deuteranopia (Machado 2009) is >= 8 and under normal vision >= 15 (chart-lib.mjs GATES); every recorded hex is what its
//      recorded OKLCH parameters render (derived, never typed); the chrome roles reference semantic tokens; and the MUI preview's palette.chart reads the tokens, not the interim stand-ins.
//  15. Frozen literals: every literal that names a source in $extensions["org.kiwi"].frozen still equals that source resolved in the named context (the on-paper marks against the light globals), so a palette.mjs re-run cannot leave them behind.
//  17. Editor selection: the selection tint is visible on --editor-bg (≥ 1.1:1) and differs from the active line, its 1 px outline clears 3:1 against --editor-bg and the active line, and every syntax colour keeps 4.5:1 on the selection, both modes; the generated Ace rule carries both.
//  18. Public reduced motion: every selector of the public CSS that runs an animation or a transition is listed inside one scoped @media (prefers-reduced-motion: reduce) block, and that block holds no universal selector and no !important.
//  19. MUI grey: the preview's palette.grey is the locked neutral ramp per mode (every key, both schemes) and palette.common is the G2 logo pair, so a stray grey.NN in the code cannot keep MUI's default greys.
//  20. Companion backing (Phase 4, DW-4.4): the mascot's forest outline (companion.$extensions["org.kiwi"].artwork.outline, metadata, not a token) clears 3:1 on companion.backing in dark and on every light surface the transparent light backing exposes; § 5 admits a companion.* literal only when it is frozen to a light source, and § 15 reads a frozen literal held in a mode block (frozen.at). Also pixel-sampled: the lightest forest-class pixel of every shipped asset (mocks/assets/mascot/inventory.json, written by export-mascot.py) clears 3:1 on the dark backing and on light --surface-active (review A-5).
//  21. Provenance (the 2026-10-18 re-lock): every global colour step records its source per mode ($extensions["org.kiwi"].source): a reference value taken as given (with the selector it comes from),
//      an OKLCH derivation [L, C, H] with its reason, re-rendered here and failed on any drift, or a value kept from the 2026-10-16 lock; and the neutral, accent and paper ramps are monotonic in OKLCH lightness per mode.
//  22. The dialog against its scrim (re-lock review, fix round 1): the backdrop is composited over the canvas at its mode's alpha; in dark, where the
//      sheet stands only about 1.2:1 clear of the near-black scrim, the dialog's edge must clear 3:1 against it; in light the sheet's own tonal step
//      carries the separation and the pairs are reported.
//  23. Public states (re-lock review, fix round 1): every stateful rule of the public CSS that paints a button, a field, a chip or a step resolves, in
//      both colour modes, to the hex of the component spec's part for that state, through the public map; the emitted (light-only) literal equals the
//      light hex; and two planted defects (the re-lock's regression: the secondary's hover on --kiwi-bg-selected) must be caught.
//  24. One frame on focus (the user's decision of 2026-10-19): a control that has a border shows focus on that border, never a second ring: its focus
//      state's border and ring are --focus-ring in both modes, and the 2 px focused frame clears 3:1 against the control's fill (every variant's
//      fill too) and against the surfaces it sits on, in both modes; in the public CSS, every :focus-visible rule of a bordered class recolours the
//      border and draws no visible outline outside it.
// Writes ./generated/check-summary.json with every count the DESIGN.md evidence quotes, so the evidence paragraph is generated, not typed.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTokens, walk, walkGroups, getToken, getNode, resolve, refOf, cssNameFor, contrast, isHex, hexToRgb, alphaOf, dependencies, CONTEXTS, STATES, COMPONENTS, variesWith, TOKENS_DIR, REPO_ROOT } from "./tokens-lib.mjs";
import { GATES as CHART_GATES, assertSeries, renderHex, oklchOfHex, views, dE, inArc } from "./chart-lib.mjs";

const here = TOKENS_DIR; // relative to this script; nothing machine-specific
const ROOT = REPO_ROOT;
const tree = loadTokens(join(here, "kiwi-ui.tokens.json"));
const meta = tree.$extensions["org.kiwi"];
const failures = [];
const fail = (s) => failures.push(s);
const out = [];
const log = (s = "") => out.push(s);
const L = CONTEXTS.light, D = CONTEXTS.dark;

// ---------- 1. alias equality against the locked block ----------
const design = readFileSync(join(ROOT, "kiwi-ui/DESIGN.md"), "utf8");
const lockedSection = design.split("### The locked block")[1].split("\n### ")[0];
const fence = lockedSection.match(/```css\n([\s\S]*?)```/)[1];
function parseBlock(selector) {
  const i = fence.indexOf(selector); const body = fence.slice(fence.indexOf("{", i) + 1, fence.indexOf("\n}", i));
  const m = new Map();
  for (const line of body.replace(/\/\*[\s\S]*?\*\//g, "").split("\n")) for (const d of line.split(";")) { const mm = d.match(/(--[a-z0-9-]+)\s*:\s*(.+)/); if (mm) m.set(mm[1], mm[2].trim()); }
  return m;
}
const lockedLight = parseBlock(":root"), lockedDark = parseBlock('[data-theme="dark"]');
const resolveLocked = (map, fallback, v, depth = 0) => { const r = v.match(/^var\((--[a-z0-9-]+)\)$/); if (!r) return v.toLowerCase(); const next = map.get(r[1]) ?? fallback.get(r[1]); return resolveLocked(map, fallback, next, depth + 1); };
const nameToPath = new Map();
walk(tree, (p) => { const n = cssNameFor(tree, p); if (n) nameToPath.set(n, p); });
let aliasOk = 0, aliasBad = 0; const aliasRows = [];
for (const [mode, locked, ctx] of [["light", lockedLight, L], ["dark", lockedDark, D]]) {
  for (const [name, raw] of locked) {
    if (name === "color-scheme") continue;
    const want = resolveLocked(locked, lockedLight, raw);
    const path = nameToPath.get(name);
    if (!path) { fail(`locked ${name} has no DTCG token`); aliasBad++; continue; }
    const got = String(resolve(tree, path, ctx)).toLowerCase();
    const ok = got === want; ok ? aliasOk++ : aliasBad++;
    if (!ok) fail(`alias mismatch ${mode} ${name}: locked ${want}, DTCG ${got} (${path})`);
    if (name.startsWith("--") && !/^--(neutral|accent|paper|error|success|warning|info)-\d+$/.test(name)) aliasRows.push([mode, name, path, want, got, ok ? "PASS" : "FAIL"]);
  }
}
log(`## 1. Alias equality against the locked block\n\n${aliasOk} locked declarations compared (both modes), ${aliasBad} mismatches. The 20 palette.mjs aliases + the 3 lock-named aliases:\n`);
log("| Mode | Locked name | DTCG token | Locked value | DTCG value | |\n|---|---|---|---|---|---|");
for (const r of aliasRows) log(`| ${r.join(" | ")} |`);

// ---------- 2. structure ----------
const stateGroups = [];
walkGroups(tree, (p, g) => { if (p.startsWith("component.") && p.split(".").at(-1) === "state") stateGroups.push([p, g]); });
for (const c of COMPONENTS) {
  if (!getNode(tree, `component.${c}`)) fail(`missing component group component.${c}`);
  if (!stateGroups.some(([p]) => p.startsWith(`component.${c}.`))) fail(`component.${c} has no state group`);
}
for (const [p, g] of stateGroups) {
  const keys = Object.keys(g).filter((k) => !k.startsWith("$"));
  const missing = STATES.filter((s) => !keys.includes(s)); const extra = keys.filter((k) => !STATES.includes(k));
  if (missing.length || extra.length) fail(`${p}: states missing [${missing}] extra [${extra}]`);
}
const extraComponents = Object.keys(tree.component).filter((k) => !k.startsWith("$") && !COMPONENTS.includes(k));
log(`\n## 2. Structure\n\n${COMPONENTS.length} listed components present: ${COMPONENTS.every((c) => getNode(tree, `component.${c}`)) ? "yes" : "NO"}; ${stateGroups.length} state groups, each with exactly the eight states (${stateGroups.length * 8} state specifications)${extraComponents.length ? `; geometry-only groups with no states (one look, the small-popup contract applied): ${extraComponents.join(", ")}` : ""}.`);

// ---------- 3. contrast assertions ----------
const rows = []; let pass = 0, failN = 0, exempt = 0;
walkGroups(tree, (p, g) => {
  const asserts = g.$extensions?.["org.kiwi.contrast"]; if (!asserts) return;
  const comp = p.split(".").slice(1, p.split(".").indexOf("state") > 0 ? p.split(".").indexOf("state") : undefined).join(".");
  const st = p.includes(".state.") ? p.split(".state.")[1] : p.includes(".variant.") ? `variant:${p.split(".variant.")[1]}` : "";
  for (const a of asserts) {
    const part = (x) => (refOf(x) ? refOf(x) : `${p}.${x}`);
    const res = {};
    for (const [mode, ctx] of [["light", L], ["dark", D]]) {
      let fg, bg;
      try { fg = resolve(tree, part(a.fg), ctx); bg = resolve(tree, part(a.bg), ctx); } catch (e) { fail(`${p}: ${e.message}`); continue; }
      if (fg === "transparent" || bg === "transparent" || !isHex(fg) || !isHex(bg)) { fail(`${p}: assertion ${a.fg} on ${a.bg} is not an opaque pair in ${mode} (${fg} / ${bg})`); continue; }
      res[mode] = { fg, bg, r: contrast(fg, bg) };
    }
    if (!res.light || !res.dark) continue;
    const ok = res.light.r >= a.min && res.dark.r >= a.min;
    const soft = a.exempt || a.decorative;
    if (soft) exempt++; else ok ? pass++ : failN++;
    if (!ok && !soft) fail(`contrast ${p}: ${a.fg} on ${a.bg} light ${res.light.r.toFixed(2)} dark ${res.dark.r.toFixed(2)} < ${a.min}`);
    rows.push({ comp, st, fg: a.fg, bg: a.bg, kind: a.kind || "text", min: a.min, light: res.light, dark: res.dark, ok, soft, why: a.why || "" });
  }
});
log(`\n## 3. Per-state contrast (both modes, from the alias values)\n\nTargets: text ≥ 4.5:1, non-text (boundaries, icons, markers, rings) ≥ 3:1. ${pass + failN} required assertions: ${pass} pass, ${failN} fail. ${exempt} informational rows (inactive controls, WCAG 1.4.3/1.4.11 exemption, or decorative hairlines by lock) are reported, not required.\n`);
log("| Component | State | Pair | Kind | Min | Light | Dark | Result |\n|---|---|---|---|---|---|---|---|");
for (const r of rows) log(`| ${r.comp} | ${r.st} | ${r.fg} on ${r.bg.replace(/^\{semantic\.color\./, "{").replace(/\}$/, "}")} | ${r.kind} | ${r.min} | ${r.light.r.toFixed(2)} (${r.light.fg} / ${r.light.bg}) | ${r.dark.r.toFixed(2)} (${r.dark.fg} / ${r.dark.bg}) | ${r.soft ? (r.ok ? "info: clears" : "info: below") + (r.why ? ` · ${r.why}` : "") : r.ok ? "PASS" : "FAIL"} |`);

// ---------- 4. closure of the emitted CSS ----------
const cssFile = join(here, "generated/kiwi-ui.tokens.css");
if (!existsSync(cssFile)) fail("generated/kiwi-ui.tokens.css missing: run build-tokens.mjs first");
else {
  const css = readFileSync(cssFile, "utf8");
  const blockDecls = (sel) => { const i = css.indexOf(`${sel} {`); const body = css.slice(i + sel.length + 2, css.indexOf("\n}", i)); const m = new Map(); for (const d of body.split("\n")) { const mm = d.match(/^\s*(--[a-z0-9-]+)\s*:\s*(.+);/); if (mm) m.set(mm[1], mm[2]); } return m; };
  const root = blockDecls(":root"), dark = blockDecls('[data-theme="dark"]'), compact = blockDecls('[data-density="compact"]');
  const deps = (v) => [...v.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
  const closureCheck = (axisBlock, label) => {
    const varying = new Set(axisBlock.keys()); let changed = true;
    while (changed) { changed = false; for (const [n, v] of root) if (!varying.has(n) && deps(v).some((d) => varying.has(d))) { varying.add(n); changed = true; } }
    const missing = [...varying].filter((n) => !axisBlock.has(n));
    if (missing.length) fail(`${label}: ${missing.length} root-only properties depend on a varying token: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`);
    return { varying: varying.size, declared: axisBlock.size, missing: missing.length };
  };
  const cd = closureCheck(dark, "dark closure"), cc = closureCheck(compact, "compact closure");
  const rootOnlyLiteralComposite = [...root].filter(([n, v]) => /rgba?\(|color-mix\(/.test(v) && !dark.has(n) && variesWith(tree, nameToPath.get(n) || "", "color"));
  if (rootOnlyLiteralComposite.length) fail(`root-only composites embedding a mode colour: ${rootOnlyLiteralComposite.map(([n]) => n).join(", ")}`);
  log(`\n## 4. Per-mode closure of the emitted CSS\n\n:root declares ${root.size} properties. Dark: ${cd.varying} depend on a mode token (transitively), ${cd.declared} are redeclared in [data-theme="dark"], ${cd.missing} missing. Compact: ${cc.varying} depend on a density token, ${cc.declared} redeclared in [data-density="compact"], ${cc.missing} missing. Root-only composites that embed a mode colour (shadows, backdrop): ${rootOnlyLiteralComposite.length}.`);
  // 10. coarse-pointer closure: the media block's :root and both density blocks
  const mediaStart = css.indexOf("@media (pointer: coarse) {"); const media = mediaStart >= 0 ? css.slice(mediaStart, css.indexOf("\n}\n", mediaStart) + 3) : "";
  const mediaDecls = (sel) => { const i = media.indexOf(`  ${sel} {`); if (i < 0) return new Map(); const body = media.slice(i, media.indexOf("\n  }", i)); const m = new Map(); for (const d of body.split("\n")) { const mm = d.match(/^\s*(--[a-z0-9-]+)\s*:\s*(.+);/); if (mm) m.set(mm[1], mm[2]); } return m; };
  const coarseRoot = mediaDecls(":root"), coarseComf = mediaDecls('[data-density="comfortable"]'), coarseCompact = mediaDecls('[data-density="compact"]');
  const pointerVarying = new Set(); walk(tree, (p) => { const n = cssNameFor(tree, p); if (n && variesWith(tree, p, "pointer")) pointerVarying.add(n); });
  let changed = true; while (changed) { changed = false; for (const [n, val] of root) if (!pointerVarying.has(n) && deps(val).some((d) => pointerVarying.has(d))) { pointerVarying.add(n); changed = true; } }
  const coarseMissing = [...pointerVarying].filter((n) => !coarseRoot.has(n) || !coarseComf.has(n) || !coarseCompact.has(n));
  if (!media) fail("no @media (pointer: coarse) block in the emitted CSS"); else if (coarseMissing.length) fail(`coarse closure: ${coarseMissing.length} pointer-dependent properties missing from the media block: ${coarseMissing.slice(0, 8).join(", ")}`);
  const targetMinUsed = [...coarseRoot.values()].some((val) => val.includes("--size-target-min")) || [...root].some(([n, val]) => pointerVarying.has(n) && val.includes("--size-target-min"));
  if (!targetMinUsed) fail("--size-target-min is consumed by no coarse-pointer property");
  log(`\n## 10. Coarse pointer\n\n${pointerVarying.size} properties depend on a pointer-varying token; the @media (pointer: coarse) block redeclares ${coarseRoot.size} on :root and ${coarseComf.size} / ${coarseCompact.size} in the density blocks; ${coarseMissing.length} missing; --size-target-min consumed: ${targetMinUsed ? "yes" : "NO"}.`);
}
// ---------- 8. tier rule: component → semantic only ----------
const tierBad = [];
walk(tree, (p, t) => { if (!p.startsWith("component.")) return; const scan = (val) => { if (typeof val === "string") for (const m of val.matchAll(/\{([^{}]+)\}/g)) { if (!m[1].startsWith("semantic.")) tierBad.push(`${p} → {${m[1]}}`); } else if (Array.isArray(val)) val.forEach(scan); else if (val && typeof val === "object") Object.values(val).forEach(scan); }; scan(t.$value); if (t.$extensions?.mode) Object.values(t.$extensions.mode).forEach(scan); });
if (tierBad.length) fail(`tier rule: ${tierBad.length} component tokens reference outside the semantic tier: ${tierBad.slice(0, 6).join("; ")}${tierBad.length > 6 ? "…" : ""}`);
let compRefs = 0; walk(tree, (p, t) => { if (p.startsWith("component.")) compRefs += (JSON.stringify(t.$value).match(/\{semantic\./g) || []).length; });
log(`\n## 8. Tier rule\n\n${compRefs} component-tier references, ${tierBad.length} outside the semantic tier (the rule: component tokens reference semantic tokens only, never a global, never another component).`);
// ---------- 12. component-tier literals: only the marked, component-specific ones ----------
const compLiterals = [], compLiteralUnmarked = [];
walk(tree, (p, t) => {
  if (!p.startsWith("component.")) return;
  const isLit = (v) => (typeof v === "string" && !/^\{[^{}]+\}$/.test(v)) || typeof v === "number";
  const vals = [t.$value, ...Object.values(t.$extensions?.mode || {})];
  if (!vals.some(isLit)) return;
  const why = t.$extensions?.["org.kiwi"]?.literal;
  (why ? compLiterals : compLiteralUnmarked).push(`\`${p}\` = ${JSON.stringify(t.$value)}${why ? ` — ${why}` : ""}`);
});
if (compLiteralUnmarked.length) fail(`component-tier literals without a marked reason: ${compLiteralUnmarked.join("; ")}`);
log(`\n## 12. Component-tier literals\n\n${compLiterals.length} marked component-specific literals (allowed, each with its reason), ${compLiteralUnmarked.length} unmarked (every other component value is a semantic reference; the transparent fill is the role \`semantic.color.fill-none\`).\n\n${compLiterals.map((s) => `- ${s}`).join("\n")}`);
// ---------- 11. density-invariant components ----------
const invariantBad = [];
for (const comp of ["launcher", "display-menu"]) walk(tree.component[comp], (p, t) => { if (variesWith(tree, `component.${comp}.${p}`, "density")) invariantBad.push(`component.${comp}.${p}`); }, []);
if (invariantBad.length) fail(`density-invariant components carry density-dependent tokens: ${invariantBad.join(", ")}`);
log(`\n## 11. Density-invariant components\n\nlauncher and display-menu: ${invariantBad.length} density-dependent tokens (their geometry is fixed; the menu item grows only on coarse pointers).`);

// ---------- 5. literal policy and banned hex ----------
const literalAllow = [/^semantic\.color\.logo\./, /^semantic\.color\.on-paper\./, /^global\./]; // backdrop and shadows reference --shadow-ink (alphas composed by the emitter), so they carry no literal
const literalBad = [];
walk(tree, (p, t) => {
  // Phase 6: a chart.* colour literal is admitted only when it carries its derivation (hue, L and C per mode); § 16 re-renders it and fails on any drift
  const scan = (v) => { if (typeof v === "string") { if (isHex(v) || /\b(rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/.test(v)) { if (!literalAllow.some((re) => re.test(p)) && !(p.startsWith("companion.") && t.$extensions?.["org.kiwi"]?.frozen) && !(p.startsWith("chart.") && t.$extensions?.["org.kiwi"]?.derived)) literalBad.push(`${p}: ${v}`); } } else if (Array.isArray(v)) v.forEach(scan); else if (v && typeof v === "object") Object.values(v).forEach(scan); };
  scan(t.$value); if (t.$extensions?.mode) Object.values(t.$extensions.mode).forEach(scan);
});
if (literalBad.length) fail(`colour literals outside the global tier / allowlisted composites: ${literalBad.join("; ")}`);
const texts = [["kiwi-ui.tokens.json", JSON.stringify(tree)], ...["kiwi-ui.tokens.css", "kiwi-design-tokens.public.css", "mui-theme.json"].map((f) => [f, existsSync(join(here, "generated", f)) ? readFileSync(join(here, "generated", f), "utf8") : ""])];
const bannedHits = [];
for (const [f, txt] of texts) for (const b of meta.banned) { const re = new RegExp(b.replace("#", "#?"), "gi"); const hits = txt.match(re); if (hits) bannedHits.push(`${f}: ${b} ×${hits.length}`); }
// the JSON names the banned hexes in its own ban list; discount those occurrences
const bannedReal = bannedHits.filter((h) => !h.startsWith("kiwi-ui.tokens.json"));
if (bannedReal.length) fail(`banned hex in generated outputs: ${bannedReal.join("; ")}`);
log(`\n## 5. Literal policy\n\nColour literals outside the global tier: ${literalBad.length} (allowed: the G2 logo black/white, the mode-frozen on-paper marks, a mode-frozen companion.* literal that names its light source (Phase 4: the dark backing), and a chart.* literal that carries its derivation and that § 16 re-renders (Phase 6: the five series and the neutral); the backdrop and the shadows reference --shadow-ink and carry alphas, composed by the emitter). Banned purple-era hex in the generated CSS, public CSS and MUI preview: ${bannedReal.length}.`);

// ---------- 6. public coverage ----------
const todayCss = readFileSync(join(ROOT, "kiwi-ui/public/kiwi-design-tokens.css"), "utf8");
const todayNames = [...new Set([...todayCss.matchAll(/^\s*(--kiwi-[a-zA-Z0-9-]+)\s*:/gm)].map((m) => m[1]))];
const pub = meta.public; const pinned = meta.publicV1Names || [];
if (pinned.length !== 143) fail(`publicV1Names pins ${pinned.length} names, expected 143`);
const unmapped = pinned.filter((n) => !pub[n]); if (unmapped.length) fail(`pinned v1 names without a mapping: ${unmapped.join(", ")}`);
const notPinned = todayNames.filter((n) => !pinned.includes(n)); // informational: the pinned list is the contract, the file on disk is what the build overwrites
const pubCss = existsSync(join(here, "generated/kiwi-design-tokens.public.css")) ? readFileSync(join(here, "generated/kiwi-design-tokens.public.css"), "utf8") : "";
const notEmitted = Object.keys(pub).filter((n) => !new RegExp(`^\\s*${n.replace(/[-]/g, "\\-")}\\s*:`, "m").test(pubCss)); if (pubCss && notEmitted.length) fail(`public names not emitted: ${notEmitted.join(", ")}`);
const counts = {}; for (const e of Object.values(pub)) counts[e.status] = (counts[e.status] || 0) + 1;
const sinceMajor = parseInt(meta.version.split(".")[0], 10); let depBad = 0;
for (const [n, e] of Object.entries(pub)) {
  if (e.status === "deprecated") { if (!e.replacement || !e.removeIn) { fail(`${n}: deprecated without replacement/removeIn`); depBad++; } else if (parseInt(e.removeIn.split(".")[0], 10) < sinceMajor + 2) { fail(`${n}: removed in ${e.removeIn}, before two MAJOR versions after ${meta.version}`); depBad++; } }
  if (!e.literal && !e.composite && refOf(e.token)) try { resolve(tree, refOf(e.token), L); } catch (err) { fail(`${n}: ${err.message}`); }
}
// ---------- 13. public classes and keyframes: every v1 selector present; deprecated ones marked and scheduled ----------
const v1Classes = meta.publicV1Classes || [], v1Keyframes = meta.publicV1Keyframes || [];
const genClasses = new Set([...pubCss.matchAll(/\.(kiwi-[a-z0-9-]+)/g)].map((m) => "." + m[1])), genKeyframes = new Set([...pubCss.matchAll(/@keyframes\s+([a-z0-9-]+)/g)].map((m) => m[1]));
const missingClasses = v1Classes.filter((c) => !genClasses.has(c)), missingKeyframes = v1Keyframes.filter((k) => !genKeyframes.has(k));
if (pubCss && (missingClasses.length || missingKeyframes.length)) fail(`v1 public classes / keyframes missing from the generated CSS: ${[...missingClasses, ...missingKeyframes.map((k) => "@keyframes " + k)].join(", ")}`);
let classDeprecated = 0, classDepBad = 0;
for (const [sel, e] of Object.entries(meta.publicClasses || {})) {
  if (e.status !== "deprecated") continue; classDeprecated++;
  if (!e.replacement || !e.removeIn || parseInt(e.removeIn.split(".")[0], 10) < sinceMajor + 2) { fail(`${sel}: deprecated class/keyframe without a replacement or removed before two MAJOR versions`); classDepBad++; }
  const name = sel.replace(/^@keyframes\s+/, "").replace(/^\./, "");
  const marked = pubCss.split("\n").some((line) => (sel.startsWith("@keyframes") ? line.includes(`@keyframes ${name}`) : new RegExp(`\\.${name.replace(/-/g, "\\-")}(?![a-z0-9-])`).test(line)) && line.includes("@deprecated"));
  if (pubCss && !marked) { fail(`${sel}: deprecated in the map but not marked @deprecated in the generated CSS`); classDepBad++; }
}
log(`\n## 6. Public CSS coverage\n\n${pinned.length} v1 names pinned in the source, ${unmapped.length} unmapped, ${notEmitted.length} not emitted; the public file on disk has ${todayNames.length} names, ${notPinned.length} of them not pinned. Mapping: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")} (${Object.keys(pub).length} total).\n\n## 13. Public classes and keyframes\n\n${v1Classes.length} v1 class selectors and ${v1Keyframes.length} keyframes pinned; ${missingClasses.length} classes and ${missingKeyframes.length} keyframes missing from the generated CSS (${genClasses.size} classes and ${genKeyframes.size} keyframes emitted); ${classDeprecated} deprecated with a replacement and the ${sinceMajor + 2}.0.0 schedule, ${classDepBad} violations.\n\n## 9. Deprecation schedule\n\nPolicy: ${meta.deprecationPolicy} ${counts.deprecated} deprecated names and ${classDeprecated} deprecated classes / keyframes, every one removed in a MAJOR ≥ ${sinceMajor + 2}.0.0 (${depBad + classDepBad} violations).`);

// ---------- 14. selection and pressed cues: a toggle is never colour alone ----------
const TOGGLES = ["component.icon-button.variant.selected", "component.button.tertiary.variant.pressed", "component.tutor-message.variant.thumb-chosen", "component.chip.filter.variant.selected", "component.tabs.variant.selected", "component.sidebar-item.variant.current", "component.table.variant.selected", "component.switch.variant.on", "component.checkbox.variant.checked", "component.checkbox.variant.indeterminate", "component.checkbox.variant.radio-checked", "component.display-menu.state.default"];
const cueRows = []; let cueN = 0, cueBad = 0;
for (const path of TOGGLES) {
  const g = getNode(tree, path); const cue = g?.$extensions?.["org.kiwi.cue"];
  if (!g) { fail(`cue: ${path} does not exist`); cueBad++; continue; }
  if (!cue) { fail(`cue: ${path} carries no non-colour cue ($extensions["org.kiwi.cue"])`); cueBad++; continue; }
  const partPath = `${path}.${cue.part}`;
  if (!getToken(tree, partPath)) { fail(`cue: ${path} names a part that does not exist (${cue.part})`); cueBad++; continue; }
  if (cue.kind === "marker" || cue.kind === "glyph" || cue.kind === "position") {
    for (const against of cue.against || []) {
      const bgPath = refOf(against) ? refOf(against) : `${path}.${against}`;
      const res = {};
      for (const [mode, ctx] of [["light", L], ["dark", D]]) {
        const fg = resolve(tree, partPath, ctx), bg = resolve(tree, bgPath, ctx);
        if (!isHex(fg) || !isHex(bg) || fg === "transparent" || bg === "transparent") { fail(`cue ${path}: ${cue.part} on ${against} is not an opaque pair in ${mode}`); cueBad++; continue; }
        res[mode] = contrast(fg, bg);
      }
      if (!res.light || !res.dark) continue;
      cueN++; const ok = res.light >= (cue.min || 3) && res.dark >= (cue.min || 3); if (!ok) { fail(`cue ${path}: ${cue.part} on ${against} light ${res.light.toFixed(2)} dark ${res.dark.toFixed(2)} < ${cue.min || 3}`); cueBad++; }
      cueRows.push([path.replace(/^component\./, ""), cue.kind, `${cue.part} on ${against.replace(/^\{semantic\.color\./, "{")}`, res.light.toFixed(2), res.dark.toFixed(2), ok ? "PASS" : "FAIL"]);
    }
  } else if (cue.kind === "weight") {
    const v = resolve(tree, partPath, L), def = resolve(tree, refOf(cue.default) || cue.default, L);
    cueN++; const ok = String(v) !== String(def); if (!ok) { fail(`cue ${path}: weight ${v} equals the default ${def}`); cueBad++; }
    cueRows.push([path.replace(/^component\./, ""), "weight", `${v} vs ${def}`, "—", "—", ok ? "PASS" : "FAIL"]);
  } else { fail(`cue ${path}: unknown cue kind ${cue.kind}`); cueBad++; }
}
log(`\n## 14. Selection and pressed cues (a toggle is never colour alone)\n\n${TOGGLES.length} toggle-like variants must carry a non-colour cue (a 2 px marker, a filled or check glyph, the thumb's position, or weight 600 against 400); marker, glyph and position cues must clear 3:1 against the selected fill and the unselected surfaces in both modes. ${cueN} cue assertions, ${cueBad} failures.\n`);
log("| Variant | Cue | Pair | Light | Dark | Result |\n|---|---|---|---|---|---|");
for (const r of cueRows) log(`| ${r.join(" | ")} |`);
// ---------- 15. frozen literals equal their named source ----------
let frozenN = 0, frozenBad = 0; const frozenRows = [];
walk(tree, (p, tk) => {
  const f = tk.$extensions?.["org.kiwi"]?.frozen; if (!f) return; frozenN++;
  const ctx = f.context === "dark" ? D : L; let want;
  try { want = String(resolve(tree, refOf(f.source) || f.source, ctx)).toLowerCase(); } catch (e) { fail(`frozen ${p}: ${e.message}`); frozenBad++; return; }
  if (f.alpha != null) want = want.slice(0, 7) + Math.round(f.alpha * 255).toString(16).padStart(2, "0");
  const got = String(f.at ? tk.$extensions?.mode?.[f.at] : tk.$value).toLowerCase(); const ok = got === want; if (!ok) { fail(`frozen literal ${p} = ${got} no longer equals ${f.source} (${f.context}${f.alpha != null ? ` at ${f.alpha}` : ""}) = ${want}`); frozenBad++; }
  frozenRows.push([`${p}${f.at ? ` (mode.${f.at})` : ""}`, got, `${f.source} (${f.context}${f.alpha != null ? `, α ${f.alpha}` : ""})`, want, ok ? "PASS" : "FAIL"]);
});
log(`\n## 15. Frozen literals\n\n${frozenN} literals name their source in $extensions["org.kiwi"].frozen; ${frozenBad} drifted.\n`);
log("| Token | Literal | Source | Resolved | Result |\n|---|---|---|---|---|");
for (const r of frozenRows) log(`| ${r.join(" | ")} |`);

// ---------- 16. the chart series (Phase 6, DW-6.1; kiwi-ui/DESIGN.md § Chart tokens) ----------
// The gates are chart-lib.mjs GATES: the series are asserted on their rendered hex values in both modes, and every recorded hex must be
// what its recorded OKLCH parameters render, so the palette is reproducible from its record as the locked block is from its three runs.
let chartN = 0, chartBad = 0; const chartRows = [], chartPairRows = [], chartMeasured = {}, chartChromeRows = [];
{
  const ids = ["1", "2", "3", "4", "5"];
  const chartFail = (s) => { fail(`chart: ${s}`); chartBad++; };
  for (const i of ids) if (!getToken(tree, `chart.series.${i}`)) chartFail(`chart.series.${i} is not registered`);
  const SC = (p, ctx) => resolve(tree, `semantic.color.${p}`, ctx);
  const muiPath = join(here, "generated/mui-theme.json"); const mui = existsSync(muiPath) ? JSON.parse(readFileSync(muiPath, "utf8")) : null;
  for (const [mode, ctx] of [["light", L], ["dark", D]]) {
    const hexes = ids.map((i) => (getToken(tree, `chart.series.${i}`) ? String(resolve(tree, `chart.series.${i}`, ctx)).toLowerCase() : null));
    if (hexes.some((h) => !h || !isHex(h))) { chartFail(`${mode}: a series does not resolve to an opaque hex`); continue; }
    const surfaces = [SC("surface", ctx), SC("background", ctx), SC("surface-hover", ctx)];
    const r = assertSeries(hexes, surfaces, { gates: CHART_GATES });
    chartN += hexes.length;
    for (const f of r.failures) chartFail(`${mode}: ${f}`);
    ids.forEach((i, k) => {
      const t = getToken(tree, `chart.series.${i}`), d = t.$extensions?.["org.kiwi"]?.derived, css = t.$extensions?.["org.kiwi"]?.css;
      if (css !== `--chart-${i}`) chartFail(`chart.series.${i} does not name --chart-${i}`);
      if (!d || !d[mode]) chartFail(`chart.series.${i} carries no derivation for ${mode}`);
      else { const want = renderHex(d[mode].L, d[mode].C, d.hue); if (want !== hexes[k]) chartFail(`chart.series.${i} ${mode} ${hexes[k]} is not what its recorded parameters render (${want})`); if (k === 0 && d.hue !== CHART_GATES.anchorHue) chartFail(`chart.series.1 hue ${d.hue} is not the accent hue ${CHART_GATES.anchorHue}`); }
      const o = r.measures.oklch[k];
      chartRows.push([mode, `--chart-${i}`, hexes[k], `${o.H.toFixed(1)}°`, o.L.toFixed(3), o.C.toFixed(3), ...r.measures.contrast[k].map((c) => c.toFixed(2)), r.failures.some((f) => f.startsWith(`series ${k + 1} `)) ? "FAIL" : "PASS"]);
    });
    for (const p of r.measures.pairs) chartPairRows.push([mode, `${p.i + 1} vs ${p.j + 1}`, p.protan.toFixed(2), p.deutan.toFixed(2), p.normal.toFixed(2), Math.min(p.protan, p.deutan) >= CHART_GATES.cvdMin && p.normal >= CHART_GATES.normalMin ? "PASS" : "FAIL"]);
    // the neutral for Other: at the band's target, ≥ 3:1, derived like the series (its distance to the series is informational: Other is de-emphasis with a label)
    const other = getToken(tree, "chart.other");
    let otherRow = null;
    if (!other) chartFail("chart.other is not registered");
    else {
      const oh = String(resolve(tree, "chart.other", ctx)).toLowerCase(), d = other.$extensions?.["org.kiwi"]?.derived;
      const cr = Math.min(...surfaces.map((s) => contrast(oh, s)));
      if (cr < CHART_GATES.contrast) chartFail(`${mode}: chart.other ${oh} measures ${cr.toFixed(2)}:1`);
      if (other.$extensions?.["org.kiwi"]?.css !== "--chart-other") chartFail("chart.other does not name --chart-other");
      if (!d || !d[mode]) chartFail(`chart.other carries no derivation for ${mode}`);
      else { const want = renderHex(d[mode].L, d[mode].C, d.hue); if (want !== oh) chartFail(`chart.other ${mode} ${oh} is not what its recorded parameters render (${want})`); if (Math.abs(d[mode].L - r.measures.target) > 0.0051) chartFail(`chart.other ${mode} L ${d[mode].L} is not the band's target ${r.measures.target.toFixed(3)}`); }
      const nv = views(oh), sv = hexes.map(views);
      otherRow = { hex: oh, contrast: cr, minCvd: Math.min(...sv.map((v) => Math.min(dE(v.protan, nv.protan), dE(v.deutan, nv.deutan)))), oklch: oklchOfHex(oh) };
      chartRows.push([mode, "--chart-other", oh, `${otherRow.oklch.H.toFixed(1)}°`, otherRow.oklch.L.toFixed(3), otherRow.oklch.C.toFixed(3), ...surfaces.map((s) => contrast(oh, s).toFixed(2)), cr >= CHART_GATES.contrast ? "PASS" : "FAIL"]);
    }
    // the MUI preview reads the tokens, not the interim stand-ins
    if (mui) {
      const pc = mui.colorSchemes?.[mode]?.palette?.chart || {};
      if (pc._interim) chartFail(`mui-theme.json ${mode} palette.chart is still marked _interim`);
      ids.forEach((i, k) => { if (String(pc[`series${i}`] || "").toLowerCase() !== hexes[k]) chartFail(`mui-theme.json ${mode} palette.chart.series${i} (${pc[`series${i}`]}) is not chart.series.${i} (${hexes[k]})`); });
      if (otherRow && String(pc.other || "").toLowerCase() !== otherRow.hex) chartFail(`mui-theme.json ${mode} palette.chart.other (${pc.other}) is not chart.other (${otherRow.hex})`);
    } else chartFail("generated/mui-theme.json is missing: run build-tokens.mjs");
    chartMeasured[mode] = { target: +r.measures.target.toFixed(3), spread: +r.measures.spread.toFixed(3), minContrast: +r.measures.minContrast.toFixed(2), minCvd: +r.measures.cvd.toFixed(2), minCvdKind: r.measures.cvdKind, minCvdPair: r.measures.cvdPair.map((i) => i + 1), minAdjacentCvd: +r.measures.adjacentCvd.toFixed(2), minNormal: +r.measures.normal.toFixed(2), minNormalPair: r.measures.normalPair.map((i) => i + 1), other: otherRow ? { hex: otherRow.hex, minContrast: +otherRow.contrast.toFixed(2), minCvdToSeries: +otherRow.minCvd.toFixed(2) } : null };
  }
  // the chrome roles are references to semantic tokens and name their CSS property
  for (const [n, want] of [["grid", "semantic.color.border-subtle"], ["baseline", "semantic.color.border-strong"], ["tick-text", "semantic.color.text-secondary"], ["plot", "semantic.color.surface"]]) {
    const t = getToken(tree, `chart.${n}`);
    if (!t) { chartFail(`chart.${n} is not registered`); continue; }
    const ok = refOf(t.$value) === want && t.$extensions?.["org.kiwi"]?.css === `--chart-${n}`;
    if (!ok) chartFail(`chart.${n} must reference {${want}} and name --chart-${n}`);
    chartChromeRows.push([`--chart-${n}`, `{${want}}`, resolve(tree, `chart.${n}`, L), resolve(tree, `chart.${n}`, D), ok ? "PASS" : "FAIL"]);
  }
  if (meta.interimChart) chartFail("$extensions[\"org.kiwi\"].interimChart is still present: the interim mapping was replaced by chart.*");
  // review round 2 (F8): every surface a data mark can sit on is asserted. The series are asserted on the plot, the canvas and the hover row above; the topic bars'
  // track was retired by the Phase 6 follow-up (the bars grow from a common zero with no track), so no chart surface is left unasserted. A chart.* entry outside the
  // known roles fails, and a re-registered track (a future meter) is asserted here at once: every series at >= 3:1 on it in both modes.
  {
    const KNOWN = new Set(["series", "other", "grid", "baseline", "tick-text", "plot", "track"]);
    for (const k of Object.keys(tree.chart || {})) if (!k.startsWith("$") && !KNOWN.has(k)) chartFail(`chart.${k} is not a known chart role: register a surface a mark sits on with its 3:1 assertion here`);
    if (getToken(tree, "chart.track")) for (const [mode, ctx] of [["light", L], ["dark", D]]) {
      const tr = String(resolve(tree, "chart.track", ctx)).toLowerCase();
      for (const i of ["1", "2", "3", "4", "5"]) { const h = String(resolve(tree, `chart.series.${i}`, ctx)).toLowerCase(), cr = contrast(h, tr); if (cr < CHART_GATES.contrast) chartFail(`${mode}: --chart-${i} ${h} on --chart-track ${tr} measures ${cr.toFixed(2)}:1`); }
    }
  }
}
log(`\n## 16. Chart series (Phase 6)\n\n${chartN} series values (five per mode) and the neutral, ${chartBad} failures. Gates: ≥ ${CHART_GATES.contrast}:1 on --surface, --background and --surface-hover; OKLCH L within ± ${CHART_GATES.band} of one target per mode; chroma ${CHART_GATES.chromaMin}–${CHART_GATES.chromaMax}; hue inside ${CHART_GATES.arc.join("°–")}°; minimum pairwise OKLab distance (× 100) ≥ ${CHART_GATES.cvdMin} under protanopia and deuteranopia (Machado 2009, severity 1.0) and ≥ ${CHART_GATES.normalMin} under normal vision, all pairs; every hex equal to its recorded parameters re-rendered.\n`);
for (const [mode, m] of Object.entries(chartMeasured)) log(`- ${mode}: target L ${m.target}, spread ${m.spread}; min contrast ${m.minContrast}:1; min distance under ${m.minCvdKind} ${m.minCvd} (series ${m.minCvdPair.join(" vs ")}), adjacent ${m.minAdjacentCvd}; min distance under normal vision ${m.minNormal} (series ${m.minNormalPair.join(" vs ")}); Other ${m.other?.hex} at ${m.other?.minContrast}:1, ${m.other?.minCvdToSeries} from the nearest series under simulation (informational).`);
log("\n| Mode | Token | Hex | Hue | L | C | on --surface | on --background | on --surface-hover | |\n|---|---|---|---|---|---|---|---|---|---|");
for (const r of chartRows) log(`| ${r.join(" | ")} |`);
log("\n| Mode | Pair | Protanopia | Deuteranopia | Normal | |\n|---|---|---|---|---|---|");
for (const r of chartPairRows) log(`| ${r.join(" | ")} |`);
log("\n| Chrome role | References | Light | Dark | |\n|---|---|---|---|---|");
for (const r of chartChromeRows) log(`| ${r.join(" | ")} |`);

// ---------- 17. the editor selection (Major 2 of review round 5) ----------
let selN = 0, selBad = 0; const selRows = [];
{
  const selAssert = (label, ok, light, dark) => { selN++; if (!ok) { selBad++; fail(`editor selection: ${label} light ${light} dark ${dark}`); } selRows.push([label, light, dark, ok ? "PASS" : "FAIL"]); };
  const per = (fn) => ({ light: fn(L), dark: fn(D) });
  const bg = per((c) => resolve(tree, "semantic.editor.bg", c)), al = per((c) => resolve(tree, "semantic.editor.active-line", c)), sel = per((c) => resolve(tree, "semantic.editor.selection", c)), ring = per((c) => resolve(tree, "semantic.editor.selection-outline", c));
  const r = (a, b) => ({ light: contrast(a.light, b.light), dark: contrast(a.dark, b.dark) });
  const selBg = r(sel, bg), selAl = r(sel, al), ringBg = r(ring, bg), ringAl = r(ring, al);
  selAssert("selection tint on --editor-bg ≥ 1.1:1 (a visible tint, not 1:1)", selBg.light >= 1.1 && selBg.dark >= 1.1, selBg.light.toFixed(2), selBg.dark.toFixed(2));
  selAssert("selection differs from the active line", sel.light.toLowerCase() !== al.light.toLowerCase() && sel.dark.toLowerCase() !== al.dark.toLowerCase(), `${sel.light} vs ${al.light}`, `${sel.dark} vs ${al.dark}`);
  selAssert("selection outline on --editor-bg ≥ 3:1", ringBg.light >= 3 && ringBg.dark >= 3, ringBg.light.toFixed(2), ringBg.dark.toFixed(2));
  selAssert("selection outline on the active line ≥ 3:1", ringAl.light >= 3 && ringAl.dark >= 3, ringAl.light.toFixed(2), ringAl.dark.toFixed(2));
  selAssert("selection on the active line (tint alone, informational: the outline carries it)", true, selAl.light.toFixed(2), selAl.dark.toFixed(2));
  for (const [k, tk] of Object.entries(tree.semantic.syntax)) { if (k.startsWith("$") || !tk.$type) continue; const c = per((ctx) => contrast(resolve(tree, `semantic.syntax.${k}`, ctx), sel[ctx.color])); selAssert(`syntax.${k} on the selection ≥ 4.5:1`, c.light >= 4.5 && c.dark >= 4.5, c.light.toFixed(2), c.dark.toFixed(2)); }
  const aceSel = (meta.codeThemes.ace.rules.find(([sels]) => sels.includes(".ace_marker-layer .ace_selection")) || [])[1];
  selAssert("the Ace selection rule carries the tint and the outline", !!aceSel && aceSel.background === "semantic.editor.selection" && aceSel.ring === "semantic.editor.selection-outline", JSON.stringify(aceSel), "—");
  for (const mode of ["light", "dark"]) { const f = join(here, `generated/code-themes/ace-kiwi-${mode}.css`); const css = existsSync(f) ? readFileSync(f, "utf8") : ""; const line = css.split("\n").find((l) => l.includes(".ace_marker-layer .ace_selection")) || ""; selAssert(`ace-kiwi-${mode}.css: the selection rule has the resolved tint and a 1 px outline`, line.includes(`background-color: ${sel[mode]}`) && line.includes(`outline: 1px solid ${ring[mode]}`) && line.includes("outline-offset: -1px"), line.slice(0, 120) || "(no rule)", "—"); }
}
log(`\n## 17. Editor selection\n\n${selN} assertions, ${selBad} failures: the selection is a visible tint on --editor-bg, differs from the active line, carries a 1 px --editor-selection-outline that clears 3:1 against the surface and the active line, and keeps every syntax colour at 4.5:1.\n`);
log("| Assertion | Light | Dark | Result |\n|---|---|---|---|");
for (const row of selRows) log(`| ${row.join(" | ")} |`);

// ---------- 18. the public CSS's reduced-motion guard ----------
let motionAnimated = 0, motionGuarded = 0; const motionBad = [];
{
  const guardStart = pubCss.indexOf("@media (prefers-reduced-motion: reduce)");
  const outside = guardStart >= 0 ? pubCss.slice(0, guardStart) : pubCss; const guard = guardStart >= 0 ? pubCss.slice(guardStart) : "";
  const ruleRe = /^([^@{\n][^{\n]*?)\s*\{([^}]*)\}/gm; const moving = [];
  for (const m of outside.matchAll(ruleRe)) { const [, sel, body] = m; if (/\banimation:(?!\s*none\b)[^;]*;/.test(body) || /\btransition:(?!\s*none\b)[^;]*;/.test(body)) moving.push(sel.trim()); }
  motionAnimated = moving.length;
  const guardSelectors = [...guard.matchAll(/^\s*([^@{\n][^{\n]*?)\s*\{\s*(animation|transition): none;/gm)].flatMap((m) => m[1].split(",").map((s) => s.trim()));
  for (const sel of moving) { if (guardSelectors.includes(sel)) motionGuarded++; else motionBad.push(sel); }
  if (pubCss && !guard) fail("public CSS: no @media (prefers-reduced-motion: reduce) block");
  if (motionBad.length) fail(`public CSS: animated or transitioned selectors outside the reduced-motion guard: ${motionBad.join(", ")}`);
  if (/^\s*\*/m.test(guard) || /!important/.test(guard)) fail("public CSS: the reduced-motion guard must be scoped (no universal selector, no !important)");
}
log(`\n## 18. Public reduced-motion guard\n\n${motionAnimated} selectors of the public CSS run an animation or a transition; ${motionGuarded} of them are stilled inside the scoped @media (prefers-reduced-motion: reduce) block (${motionBad.length} missing); the block carries no universal selector and no !important.`);

// ---------- 19. the MUI grey override (review round 6, F1) ----------
let greyN = 0, greyBad = 0;
{
  const muiFile = join(here, "generated/mui-theme.json");
  const GREY_MAP = { 50: 1, 100: 2, 200: 3, 300: 5, 400: 7, 500: 8, 600: 10, 700: 11, 800: 12, 900: 12, A100: 3, A200: 5, A400: 8, A700: 11 }; // stated here on purpose: the checker is the oracle the emitter must match
  if (!existsSync(muiFile)) fail("generated/mui-theme.json missing");
  else {
    const mui = JSON.parse(readFileSync(muiFile, "utf8"));
    for (const [mode, ctx] of [["light", L], ["dark", D]]) {
      const pal = mui.colorSchemes?.[mode]?.palette || {};
      for (const [k, n] of Object.entries(GREY_MAP)) { greyN++; const want = String(resolve(tree, `global.color.neutral.${n}`, ctx)).toLowerCase(); const got = String(pal.grey?.[k] ?? "").toLowerCase(); if (got !== want) { greyBad++; fail(`mui grey ${mode} ${k}: ${got || "(missing)"} ≠ neutral-${n} ${want}`); } }
      for (const [k, role] of [["black", "semantic.color.logo.on-light"], ["white", "semantic.color.logo.on-dark"]]) { greyN++; const want = String(resolve(tree, role, ctx)).toLowerCase(); const got = String(pal.common?.[k] ?? "").toLowerCase(); if (got !== want) { greyBad++; fail(`mui common ${mode} ${k}: ${got || "(missing)"} ≠ ${role} ${want}`); } }
    }
  }
}
log(`\n## 19. MUI grey and common\n\n${greyN} palette keys checked (grey 50–900 and A100–A700 against the neutral ramp, common black/white against the G2 logo roles, both schemes), ${greyBad} mismatches.`);

// ---------- 7. density deltas ----------
const deltas = [];
walk(tree, (p, t) => { if (!/^semantic\.(space|size|type)\./.test(p)) return; const a = resolve(tree, p, L), b = resolve(tree, p, CONTEXTS.compact); if (JSON.stringify(a) !== JSON.stringify(b)) deltas.push([p, a, b]); });
const has = (re) => deltas.some(([p]) => re.test(p));
if (!has(/^semantic\.space\./)) fail("no space delta"); if (!has(/^semantic\.size\.control$/)) fail("no control-height delta"); if (!has(/^semantic\.type\./)) fail("no type-size delta"); if (!has(/^semantic\.size\.row$/)) fail("no row-height delta");
log(`\n## 7. Density deltas (comfortable → compact), identical in both colour modes\n\n| Token | Comfortable | Compact |\n|---|---|---|`);
for (const [p, a, b] of deltas) log(`| ${p} | ${typeof a === "object" ? `${a.fontSize} / ${a.lineHeight}` : a} | ${typeof b === "object" ? `${b.fontSize} / ${b.lineHeight}` : b} |`);

// ---------- 20. companion backing (Phase 4, DW-4.4) ----------
// The mascot's outline is artwork (its flat palette is allowlisted, G11), not a token: the checker reads it from the companion
// group's metadata and asserts it clears 3:1 (WCAG 1.4.11) on the dark backing and, in light, on every surface the transparent
// light backing exposes. Informational rows: the backing disc's own edge on the dark canvas and sheet, and the tan bill.
let compN = 0, compBad = 0; const compRows = [];
{
  const art = tree.companion?.$extensions?.["org.kiwi"]?.artwork;
  const backing = getToken(tree, "companion.backing");
  if (!art?.outline || !backing) fail("companion: no artwork outline metadata or no companion.backing token");
  else {
    const check = (label, bg, mode, min = 3) => { const r = contrast(art.outline, bg); compN++; if (r < min) { compBad++; fail(`companion backing ${mode}: outline ${art.outline} on ${label} ${bg} ${r.toFixed(2)} < ${min}`); } compRows.push([mode, `outline on ${label}`, bg, r.toFixed(2), r >= min ? "PASS" : "FAIL"]); };
    const darkBacking = String(resolve(tree, "companion.backing", D)), lightBacking = String(resolve(tree, "companion.backing", L));
    check("companion.backing", darkBacking, "dark");
    if (lightBacking !== "transparent") check("companion.backing", lightBacking, "light");
    for (const s of ["surface", "background", "surface-hover", "surface-active", "accent-bg-subtle", "status.error.surface"]) check(`--${s.replace(/\./g, "-")} (light backing transparent)`, String(resolve(tree, `semantic.color.${s}`, L)), "light");
    for (const s of ["background", "surface"]) { const bg = String(resolve(tree, `semantic.color.${s}`, D)); compRows.push(["dark", `backing disc on --${s}`, bg, contrast(darkBacking, bg).toFixed(2), "informational"]); }
    if (art.bill) compRows.push(["dark", "tan bill on companion.backing (not the outline)", darkBacking, contrast(art.bill, darkBacking).toFixed(2), "informational"]);
  }
}
// pixel-sampled (review A-5): the export writes, for every shipped asset, the lightest forest-class pixel it contains (alpha ≥ 128, the
// source's own mask rule); that pixel must still clear 3:1 on the dark backing and on the lowest light surface, so resampling can never
// hide an outline that fails. Every still and every shipped atlas inventory.json lists (since the 2026-10-18 amendment: 17 stills, one per drawing at
// the sizes it is exported, and the 4 shipped atlases). A still's files are named by its `stem` (its `state` key only repeats the stem).
let pixN = 0, pixBad = 0; const pixRows = [];
{
  const invFile = join(ROOT, ".design-foundations/mocks/assets/mascot/inventory.json");
  if (!existsSync(invFile)) fail("companion: .design-foundations/mocks/assets/mascot/inventory.json missing (run export-mascot.py)");
  else {
    const inv = JSON.parse(readFileSync(invFile, "utf8"));
    const darkBacking = String(resolve(tree, "companion.backing", D)); const lightLowest = String(resolve(tree, "semantic.color.surface-active", L));
    const assets = [...inv.atlases.filter((a) => a.pixels).map((a) => [a.file, a.pixels]), ...inv.stills.flatMap((s) => { if (!s.stem) fail(`companion pixels: a still in inventory.json has no stem (re-run export-mascot.py)`); return Object.entries(s.pixels).map(([n, px]) => [`stills/${s.stem}.${n}.webp`, px]); })];
    for (const [file, px] of assets) {
      pixN++;
      if (!px.forestLightest) { pixBad++; fail(`companion pixels ${file}: no forest-class pixel sampled`); continue; }
      const onDark = contrast(px.forestLightest, darkBacking), onLight = contrast(px.forestLightest, lightLowest);
      const ok = onDark >= 3 && onLight >= 3; if (!ok) { pixBad++; fail(`companion pixels ${file}: lightest forest pixel ${px.forestLightest} measures ${onDark.toFixed(2)} on the dark backing / ${onLight.toFixed(2)} on light --surface-active`); }
      pixRows.push([file, px.forestPixels.toLocaleString("en-US"), px.forestLightest, onDark.toFixed(2), onLight.toFixed(2), px.tanLightest ? contrast(px.tanLightest, darkBacking).toFixed(2) : "—", ok ? "PASS" : "FAIL"]);
    }
  }
}
log(`\n## 20. Companion backing (Phase 4)\n\n${compN} required token pairs (the forest outline ≥ 3:1 on the dark backing and on the light surfaces behind the transparent light backing), ${compBad} below; ${pixN} shipped assets pixel-sampled (the lightest forest-class pixel of each on the dark backing and on light --surface-active), ${pixBad} below 3.\n`);
log("| Mode | Pair | Value | Ratio | |\n|---|---|---|---|---|");
for (const r of compRows) log(`| ${r.join(" | ")} |`);
log("\n| Asset (pixel-sampled) | Forest px | Lightest forest | on dark backing | on light surface-active | tan lightest on backing (info) | |\n|---|---:|---|---|---|---|---|");
for (const r of pixRows) log(`| ${r.join(" | ")} |`);

// ---------- 21. global provenance (the 2026-10-18 re-lock; kiwi-ui/DESIGN.md § Color tokens, the regeneration procedure) ----------
// A derived step is reproducible from its record as the chart series are (§ 16): its recorded OKLCH parameters, gamut-mapped by chroma as
// palette.mjs does (chart-lib.mjs renderHex), must render its hex. A given step names the reference selector it was taken from; a kept step
// names the lock it was kept from. The three UI ramps must be monotonic in OKLCH L (light: step 1 lightest; dark: step 1 darkest).
let provN = 0, provBad = 0; const provKinds = { given: 0, oklch: 0, kept: 0 }; const provRows = [], monoRows = [];
{
  const provFail = (s) => { fail(`provenance: ${s}`); provBad++; };
  walk(tree.global.color, (p, tk) => {
    const path = `global.color.${p}`, srcs = tk.$extensions?.["org.kiwi"]?.source || {};
    for (const [mode, ctx] of [["light", L], ["dark", D]]) {
      if (mode === "dark" && !tk.$extensions?.mode?.dark && !srcs.dark) continue; // a mode-less global records one source for both modes
      provN++;
      const hex = String(resolve(tree, path, ctx)).toLowerCase(), s = srcs[mode];
      if (!s) { provFail(`${path} ${mode} records no source`); continue; }
      const kind = s.oklch ? "oklch" : s.given ? "given" : s.kept ? "kept" : null;
      if (!kind) { provFail(`${path} ${mode}: the source is neither given, oklch nor kept`); continue; }
      provKinds[kind]++;
      let ok = true;
      if (kind === "oklch") { const want = renderHex(...s.oklch); ok = want === hex; if (!ok) provFail(`${path} ${mode} ${hex} is not what its recorded oklch(${s.oklch.join(" ")}) renders (${want})`); }
      provRows.push([mode, `--${p.replace(/\./g, "-")}`, hex, kind === "oklch" ? `derived oklch(${s.oklch.join(" ")}): ${s.why || ""}` : kind === "given" ? `given: ${s.given}` : `kept: ${s.kept}`, ok ? "PASS" : "FAIL"]);
    }
  });
  for (const r of ["neutral", "accent", "paper"]) for (const [mode, ctx] of [["light", L], ["dark", D]]) {
    const steps = Object.keys(tree.global.color[r]).filter((k) => !k.startsWith("$")).sort((a, b) => +a - +b);
    const Ls = steps.map((k) => oklchOfHex(String(resolve(tree, `global.color.${r}.${k}`, ctx))).L);
    const bad = []; for (let i = 1; i < Ls.length; i++) if (!(mode === "light" ? Ls[i] < Ls[i - 1] : Ls[i] > Ls[i - 1])) bad.push(`${steps[i - 1]} → ${steps[i]}`);
    if (bad.length) provFail(`${r} ${mode} is not monotonic in OKLCH L at ${bad.join(", ")}`);
    monoRows.push([r, mode, Ls.map((x) => x.toFixed(3)).join(" → "), bad.length ? "FAIL" : "PASS"]);
  }
}
log(`\n## 21. Global provenance (2026-10-18 re-lock)\n\n${provN} global colour values (per mode): ${provKinds.given} taken as given from the reference, ${provKinds.oklch} OKLCH derivations re-rendered from their recorded parameters, ${provKinds.kept} kept from the 2026-10-16 lock; ${provBad} failures. The neutral, accent and paper ramps are monotonic in OKLCH lightness in both modes.\n`);
log("| Ramp | Mode | OKLCH L, step 1 → last | |\n|---|---|---|---|");
for (const r of monoRows) log(`| ${r.join(" | ")} |`);
log("\n| Mode | Global | Value | Source | |\n|---|---|---|---|---|");
for (const r of provRows) log(`| ${r.join(" | ")} |`);

// ---------- 22. the dialog against its scrim ----------
let scrimN = 0, scrimBad = 0; const scrimRows = [];
{
  const comp = (fg, a, bg) => { const f = hexToRgb(fg), b = hexToRgb(bg); return "#" + f.map((x, i) => Math.round((x * a + b[i] * (1 - a)) * 255).toString(16).padStart(2, "0")).join(""); };
  for (const [mode, ctx] of [["light", L], ["dark", D]]) {
    const ink = String(resolve(tree, "semantic.color.backdrop", ctx)), a = alphaOf(getToken(tree, "semantic.color.backdrop"), ctx), canvas = String(resolve(tree, "semantic.color.background", ctx));
    if (a == null) { fail(`scrim: semantic.color.backdrop carries no alpha for ${mode}`); scrimBad++; continue; }
    const scrim = comp(ink, a, canvas), sheet = String(resolve(tree, "component.dialog.state.default.fill", ctx)), edge = String(resolve(tree, "component.dialog.state.default.border", ctx));
    const rSheet = contrast(sheet, scrim), rEdge = contrast(edge, scrim);
    if (mode === "dark") { scrimN++; if (rEdge < 3) { scrimBad++; fail(`scrim dark: the dialog's edge ${edge} measures ${rEdge.toFixed(2)}:1 against its scrim ${scrim}`); } }
    scrimRows.push([mode, scrim, `sheet ${sheet} ${rSheet.toFixed(2)}`, `edge ${edge} ${rEdge.toFixed(2)}`, mode === "dark" ? (rEdge >= 3 ? "PASS (edge ≥ 3)" : "FAIL") : "informational (the sheet's tonal step)"]);
  }
}
log(`\n## 22. The dialog against its scrim\n\nThe backdrop (--shadow-ink at its mode's alpha) composited over the canvas. ${scrimN} required assertion (dark: the dialog's edge ≥ 3:1 against the scrim), ${scrimBad} failures.\n`);
log("| Mode | Scrim | Sheet against it | Edge against it | |\n|---|---|---|---|---|");
for (const r of scrimRows) log(`| ${r.join(" | ")} |`);

// ---------- 23. public states against the component spec (re-lock review, fix round 1) ----------
// A public name points at a semantic role; the component spec points the same state's part at a role too. When the two are different roles that
// happen to share a value, an alias move splits them silently: the re-lock moved --selection-bg to accent-4, so the secondary's hover, mapped to
// --kiwi-bg-selected, painted the selected fill instead of the --accent-bg-subtle hover tint (DESIGN.md § Color tokens, the secondary row). Every
// stateful public rule that paints a button, a field, a chip or a step is held here to the spec's part, in both modes (the public file is light-only,
// G5: its emitted literal is held to the light hex, the mapping to both). The public CSS has no row class; the step indicator's current state stands
// for the selection role (the roles table's "Selection, current nav item"). The steps, outside the twenty components, are held to the roles they name.
const PUBLIC_STATES = [
  [".kiwi-btn-primary", "background-color", "component.button.primary.state.default.fill"],
  [".kiwi-btn-primary", "color", "component.button.primary.state.default.text"],
  [".kiwi-btn-primary", "border-color", "component.button.primary.state.default.border"],
  ['.kiwi-btn-primary:hover:not(:disabled):not([aria-disabled="true"])', "background-color", "component.button.primary.state.hover.fill"],
  ['.kiwi-btn-primary:active:not(:disabled):not([aria-disabled="true"])', "background-color", "component.button.primary.state.active.fill"],
  [".kiwi-btn:focus-visible", "border-color", "component.button.primary.state.focus.border"],
  [".kiwi-btn:focus-visible", "border-color", "component.button.secondary.state.focus.border"],
  [".kiwi-btn:focus-visible", "box-shadow", "component.button.primary.state.focus.ring"],
  ['.kiwi-btn-primary[aria-disabled="true"], .kiwi-btn-primary:disabled', "background-color", "component.button.primary.state.disabled.fill"],
  ['.kiwi-btn-primary[aria-disabled="true"], .kiwi-btn-primary:disabled', "border-color", "component.button.primary.state.disabled.border"],
  ['.kiwi-btn[aria-disabled="true"], .kiwi-btn:disabled', "color", "component.button.primary.state.disabled.text"],
  ['.kiwi-btn[aria-disabled="true"], .kiwi-btn:disabled', "color", "component.button.secondary.state.disabled.text"],
  ['.kiwi-btn[aria-disabled="true"], .kiwi-btn:disabled', "background-color", "component.button.secondary.state.disabled.fill"],
  ['.kiwi-btn[aria-disabled="true"], .kiwi-btn:disabled', "border-color", "component.button.secondary.state.disabled.border"],
  [".kiwi-btn-secondary", "background-color", "component.button.secondary.state.default.fill"],
  [".kiwi-btn-secondary", "color", "component.button.secondary.state.default.text"],
  [".kiwi-btn-secondary", "border-color", "component.button.secondary.state.default.border"],
  ['.kiwi-btn-secondary:hover:not(:disabled):not([aria-disabled="true"])', "background-color", "component.button.secondary.state.hover.fill"],
  ['.kiwi-btn-secondary:active:not(:disabled):not([aria-disabled="true"])', "background-color", "component.button.secondary.state.active.fill"],
  ['.kiwi-btn-secondary:active:not(:disabled):not([aria-disabled="true"])', "border-color", "component.button.secondary.state.active.border"],
  [".kiwi-input", "background-color", "component.field.state.default.fill"],
  [".kiwi-input", "color", "component.field.state.default.text"],
  [".kiwi-input", "border-color", "component.field.state.default.border"],
  [".kiwi-input:hover", "border-color", "component.field.state.hover.border"],
  [".kiwi-input:focus-visible", "border-color", "component.field.state.focus.border"],
  [".kiwi-input:focus-visible", "box-shadow", "component.field.state.focus.ring"],
  ['.kiwi-input[aria-invalid="true"]:focus-visible', "border-color", "component.field.state.error.border"],
  ['.kiwi-input[aria-invalid="true"]', "border-color", "component.field.state.error.border"],
  ['.kiwi-input[aria-disabled="true"], .kiwi-input:disabled', "background-color", "component.field.state.disabled.fill"],
  ['.kiwi-input[aria-disabled="true"], .kiwi-input:disabled', "color", "component.field.state.disabled.text"],
  ['.kiwi-input[aria-disabled="true"], .kiwi-input:disabled', "border-color", "component.field.state.disabled.border"],
  ['.kiwi-input[aria-busy="true"]', "border-color", "component.field.state.loading.border"],
  ['.kiwi-input[data-state="success"]', "border-color", "component.field.state.success.border"],
  [".kiwi-chip", "background-color", "component.chip.role.state.default.fill"],
  [".kiwi-chip", "color", "component.chip.role.state.default.text"],
  [".kiwi-chip-primary", "background-color", "component.chip.filter.variant.selected.fill"],
  [".kiwi-chip-primary", "color", "component.chip.filter.variant.selected.text"],
  [".kiwi-chip-primary", "border-color", "component.chip.filter.variant.selected.border"],
  ...["success", "warning", "error", "info"].flatMap((s) => [[`.kiwi-chip-status-${s}`, "background-color", `component.chip.status.variant.${s}.fill`], [`.kiwi-chip-status-${s}`, "color", `component.chip.status.variant.${s}.text`]]),
  ...['.kiwi-step-indicator[aria-current="step"]', ".kiwi-step-active .kiwi-step-indicator"].flatMap((h) => [[h, "background-color", "semantic.color.selection.bg"], [h, "border-color", "semantic.color.selection.text"], [h, "color", "semantic.color.selection.text"]]),
  [".kiwi-step-indicator[data-done]", "background-color", "semantic.color.status.success.surface"],
  [".kiwi-step-indicator[data-done]", "color", "semantic.color.status.success.text"],
  ['.kiwi-step-indicator[aria-invalid="true"]', "background-color", "semantic.color.status.error.surface"],
  ['.kiwi-step-indicator[aria-invalid="true"]', "color", "semantic.color.status.error.text"],
];
const PROP_NAMES = { "background-color": ["background-color", "background"], "border-color": ["border-color", "border"], color: ["color"], outline: ["outline", "outline-color"], "box-shadow": ["box-shadow"] };
function publicStates(css, map) {
  const rows = [], bad = [], link = { sameRole: 0, sharedRole: 0, valueOnly: 0 };
  const rootStart = css.indexOf(":root {"), root = rootStart >= 0 ? css.slice(rootStart, css.indexOf("\n}", rootStart)) : "";
  for (const [head, prop, spec] of PUBLIC_STATES) {
    const where = `${head} { ${prop} }`;
    const at = css.indexOf("\n" + head + " {");
    if (at < 0) { bad.push(`${where}: the rule is not in the public CSS`); continue; }
    const body = css.slice(at + head.length + 3, css.indexOf("}", at));
    const decls = body.split(";").map((s) => s.trim()).filter(Boolean).map((s) => [s.slice(0, s.indexOf(":")).trim(), s.slice(s.indexOf(":") + 1).trim()]);
    const decl = PROP_NAMES[prop].map((n) => decls.find(([k]) => k === n)).find(Boolean);
    if (!decl) { bad.push(`${where}: no ${PROP_NAMES[prop].join(" / ")} declaration`); continue; }
    const colourVars = [...decl[1].matchAll(/var\((--kiwi-[a-z0-9-]+)\)/g)].map((m) => m[1]).filter((n) => { const e = map[n]; return e && refOf(e.token) && isHex(String(resolve(tree, refOf(e.token), L))); });
    if (colourVars.length !== 1) { bad.push(`${where}: ${colourVars.length} colour variables in "${decl[1]}" (one expected)`); continue; }
    const name = colourVars[0], pubPath = refOf(map[name].token);
    const got = { light: String(resolve(tree, pubPath, L)).toLowerCase(), dark: String(resolve(tree, pubPath, D)).toLowerCase() };
    const want = { light: String(resolve(tree, spec, L)).toLowerCase(), dark: String(resolve(tree, spec, D)).toLowerCase() };
    const lit = (root.match(new RegExp(`^\\s*${name.replace(/-/g, "\\-")}\\s*:\\s*(#[0-9a-fA-F]{6})`, "m")) || [])[1];
    const emitted = lit ? lit.toLowerCase() : null;
    const okModes = got.light === want.light && got.dark === want.dark, okLit = emitted === want.light;
    const specChain = new Set([spec, ...dependencies(tree, spec, L), ...dependencies(tree, spec, D)]), pubChain = new Set([pubPath, ...dependencies(tree, pubPath, L), ...dependencies(tree, pubPath, D)]);
    const relation = specChain.has(pubPath) || pubChain.has(spec) ? "sameRole" : [...specChain].some((x) => x.startsWith("semantic.") && pubChain.has(x)) ? "sharedRole" : "valueOnly";
    if (okModes && okLit) link[relation]++;
    if (!okModes) bad.push(`${where}: ${name} → ${pubPath} paints ${got.light} / ${got.dark}, the spec's ${spec} is ${want.light} / ${want.dark} (light / dark)`);
    else if (!okLit) bad.push(`${where}: ${name} is emitted as ${emitted} in the public :root, the spec's light value is ${want.light}`);
    rows.push([head.length > 58 ? head.slice(0, 55) + "…" : head, prop, `\`${name}\` → ${pubPath.replace(/^semantic\./, "")}`, spec.replace(/^component\./, "").replace(/^semantic\./, ""), `${got.light} / ${want.light}`, `${got.dark} / ${want.dark}`, okModes && okLit ? (relation === "sameRole" ? "PASS" : relation === "sharedRole" ? "PASS (a shared role)" : "PASS (value only: an alias move would split them)") : "FAIL"]);
  }
  return { rows, bad, link };
}
const pubStates = publicStates(pubCss, pub);
for (const b of pubStates.bad) fail(`public states: ${b}`);
// planted defects: the re-lock's regression put back in the emitted CSS, and the same through the map; both must be caught
const pubPlants = [];
{
  const re = /(\n\.kiwi-btn-secondary:hover[^{]*\{[^}]*?)var\(--kiwi-bg-tint\)/;
  const css1 = pubCss.replace(re, "$1var(--kiwi-bg-selected)");
  const map2 = { ...pub, "--kiwi-bg-tint": { ...pub["--kiwi-bg-tint"], token: "{semantic.color.selection.bg}" } };
  for (const [label, css, map, applied] of [["the secondary's hover on --kiwi-bg-selected (the re-lock's regression, in the CSS)", css1, pub, css1 !== pubCss], ["--kiwi-bg-tint re-pointed at --selection-bg (the same, through the map)", pubCss, map2, !!pub["--kiwi-bg-tint"]]]) {
    if (!applied) { fail(`public states: the planted defect "${label}" could not be applied, so the check is unproven`); pubPlants.push({ label, caught: false }); continue; }
    const r = publicStates(css, map); const caught = r.bad.some((b) => b.startsWith('.kiwi-btn-secondary:hover'));
    pubPlants.push({ label, caught, found: r.bad.length });
    if (!caught) fail(`public states: the planted defect "${label}" was not caught`);
  }
}
log(`\n## 23. Public states against the component spec\n\n${PUBLIC_STATES.length} stateful public rules (buttons, the field, chips, the steps; the public CSS has no row class) held to the spec's part in both modes, and their emitted light literal: ${PUBLIC_STATES.length - pubStates.bad.length} pass, ${pubStates.bad.length} fail. Linked by the same role ${pubStates.link.sameRole}, by a shared role ${pubStates.link.sharedRole}, by value only ${pubStates.link.valueOnly}. Planted defects: ${pubPlants.filter((p) => p.caught).length} of ${pubPlants.length} caught (${pubPlants.map((p) => p.label).join("; ")}).\n`);
log("| Rule | Property | Public name → role | Spec part | Light (public / spec) | Dark (public / spec) | |\n|---|---|---|---|---|---|---|");
for (const r of pubStates.rows) log(`| ${r.map((x) => String(x).replace(/\|/g, "\\|")).join(" | ")} |`);

// ---------- 24. one frame on focus (the user's decision of 2026-10-19) ----------
// A control that has a border shows focus by recolouring that border to --focus-ring at 2 px (the extra pixel inward), never by a second ring outside
// it. Held from the source: every component whose focus state draws a border is a bordered control; its focus border and ring are --focus-ring in both
// modes, so the frame is recoloured, not stacked; and the 2 px frame clears 3:1 against the control's fill (a transparent control's fill is the surface
// behind it), against every variant fill of the control (selected, checked, on: they can be focused too) and against the canvas and the sheet. The
// borderless controls keep their ring (their only frame) and its existing assertions. In the public CSS, every :focus-visible rule of a bordered class
// sets the border to the focus colour and draws no visible outline outside the border box.
let frameN = 0, frameBad = 0; const frameRows = [];
{
  const ffail = (s) => { fail(`one frame: ${s}`); frameBad++; };
  const FRp = "semantic.color.focus-ring", grounds = ["semantic.color.surface", "semantic.color.background"];
  const hex = (p, ctx) => String(resolve(tree, p, ctx)).toLowerCase();
  walkGroups(tree, (p, g) => {
    if (!p.startsWith("component.") || !g.state || !g.state.focus || !g.state.focus.border) return;
    const f = g.state.focus, base = `${p}.state.focus`;
    if (f.$extensions?.["org.kiwi"]?.focusOn) { frameRows.push([p.replace("component.", ""), "both", "focus is on a control inside", f.$extensions["org.kiwi"].focusOn.split(":")[0], "", "n/a (the sheet's edge never changes)"]); return; }
    const fills = [["focus fill", f.fill ? `${base}.fill` : null], ...Object.entries(g.variant || {}).filter(([k, v]) => !k.startsWith("$") && v && v.fill).map(([k]) => [`variant ${k} fill`, `${p}.variant.${k}.fill`])];
    for (const [mode, ctx] of [["light", L], ["dark", D]]) {
      const ring = hex(FRp, ctx);
      frameN++; if (hex(`${base}.border`, ctx) !== ring) ffail(`${base}.border is ${hex(`${base}.border`, ctx)} in ${mode}, not the focus ring ${ring}: the frame must be recoloured, not stacked`);
      if (f.ring) { frameN++; if (hex(`${base}.ring`, ctx) !== ring) ffail(`${base}.ring is not the focus ring in ${mode}`); }
      const against = [...fills.filter(([, fp]) => fp).map(([lab, fp]) => [lab, fp]), ...grounds.map((gp) => [gp.replace("semantic.color.", ""), gp])];
      for (const [lab, gp] of against) {
        const v = String(resolve(tree, gp, ctx)); if (!isHex(v) || /^#[0-9a-f]{6}00$/i.test(v)) continue; // a transparent fill shows the ground behind it, held by the grounds
        const r = contrast(ring, v); frameN++;
        if (r < 3) ffail(`${p}: the focused frame ${ring} is ${r.toFixed(2)}:1 against ${lab} ${v} in ${mode}`);
        frameRows.push([p.replace("component.", ""), mode, lab, v, r.toFixed(2), r >= 3 ? "PASS" : "FAIL"]);
      }
    }
  });
  // the public CSS: a bordered class recolours its border on focus and draws no outline outside it
  for (const head of [".kiwi-btn:focus-visible", ".kiwi-input:focus-visible"]) {
    const at = pubCss.indexOf("\n" + head + " {"); frameN++;
    if (at < 0) { ffail(`${head}: no rule in the public CSS`); continue; }
    const body = pubCss.slice(at, pubCss.indexOf("}", at));
    const decl = (n) => (body.match(new RegExp(`(?:^|[;{\\s])${n}\\s*:\\s*([^;]+)`)) || [])[1]?.trim();
    const outline = decl("outline") || "", offset = parseFloat(decl("outline-offset") || "0"), width = parseFloat((outline.match(/([0-9.]+)px/) || [])[1] || "0");
    const visibleOutside = outline && !/\bnone\b/.test(outline) && !/transparent/.test(outline) && width > 0 && offset > -width;
    if (visibleOutside) ffail(`${head} draws a visible outline outside the border ("outline: ${outline}; outline-offset: ${offset}px")`);
    if (!/var\(--kiwi-border-focus\)/.test(decl("border-color") || "")) ffail(`${head} does not recolour the border to --kiwi-border-focus`);
  }
}
log(`\n## 24. One frame on focus\n\n${frameN} assertions, ${frameBad} failures: every control that has a border shows focus on that border (its focus border and ring are --focus-ring in both modes), the 2 px frame clears 3:1 against the control's fill, its variant fills and the canvas and the sheet, and the public CSS recolours the border of .kiwi-btn and .kiwi-input on focus with no visible outline outside it.\n`);
log("| Control | Mode | Against | Value | Ratio | |\n|---|---|---|---|---|---|");
for (const r of frameRows) log(`| ${r.join(" | ")} |`);

// ---------- report ----------
// the run's identity is derived: the clock, the source's version and content hash, and the commit (null when uncommitted or outside git)
const today = new Date().toISOString().slice(0, 10);
const srcSha = createHash("sha256").update(readFileSync(join(here, "kiwi-ui.tokens.json"))).digest("hex").slice(0, 12);
let commit = null; try { commit = execSync("git rev-parse --short HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || null; } catch { commit = null; }
const summary = `# Kiwi UI token checks — ${today} · source v${meta.version} (sha256 ${srcSha}) · ${commit ? `at ${commit}` : "uncommitted tree"}\n\nSource: \`.design-foundations/tokens/kiwi-ui.tokens.json\` · Locked block: \`kiwi-ui/DESIGN.md\` · Result: **${failures.length ? `FAIL (${failures.length})` : "PASS"}**\n\n${failures.length ? "Failures:\n" + failures.map((f) => `- ${f}`).join("\n") + "\n" : ""}`;
writeFileSync(join(here, "generated/contrast-report.md"), summary + out.join("\n") + "\n");
// the machine-readable summary the DESIGN.md evidence paragraph is assembled from
let descN = 0, tokenN = 0; walk(tree, (p, tk) => { if (!/^(global|semantic|component)\./.test(p)) return; tokenN++; if (tk.$description) descN++; });
let groupN = 0, groupDescN = 0; walkGroups(tree, (p, g) => { if (!/^(semantic|component)\./.test(p)) return; groupN++; if (g.$description) groupDescN++; });
writeFileSync(join(here, "generated/check-summary.json"), JSON.stringify({ date: today, source: { version: meta.version, sha256: srcSha, commit }, result: failures.length ? "FAIL" : "PASS", failures: failures.length, components: COMPONENTS.length, aliasOk, aliasBad, stateGroups: stateGroups.length, stateSpecs: stateGroups.length * 8, contrast: { pass, fail: failN, informational: exempt }, tier: { refs: compRefs, violations: tierBad.length }, literals: { marked: compLiterals.length, unmarked: compLiteralUnmarked.length, outsideGlobal: literalBad.length, banned: bannedReal.length }, public: { pinned: pinned.length, unmapped: unmapped.length, notEmitted: notEmitted.length, counts, classes: { pinned: v1Classes.length, missing: missingClasses.length, emitted: genClasses.size }, keyframes: { pinned: v1Keyframes.length, missing: missingKeyframes.length, emitted: genKeyframes.size }, deprecatedClasses: classDeprecated, deprecationViolations: depBad + classDepBad }, cues: { variants: TOGGLES.length, assertions: cueN, failures: cueBad }, frozen: { n: frozenN, drifted: frozenBad }, chart: { series: chartN, failures: chartBad, measured: chartMeasured }, editorSelection: { assertions: selN, failures: selBad }, motionGuard: { moving: motionAnimated, guarded: motionGuarded }, muiGrey: { keys: greyN, mismatches: greyBad }, companionBacking: { assertions: compN, failures: compBad, pixelAssets: pixN, pixelFailures: pixBad }, provenance: { values: provN, given: provKinds.given, derived: provKinds.oklch, kept: provKinds.kept, failures: provBad }, scrim: { assertions: scrimN, failures: scrimBad }, oneFrame: { assertions: frameN, failures: frameBad }, publicStates: { rules: PUBLIC_STATES.length, failures: pubStates.bad.length, sameRole: pubStates.link.sameRole, sharedRole: pubStates.link.sharedRole, valueOnly: pubStates.link.valueOnly, plantsCaught: pubPlants.filter((p) => p.caught).length, plants: pubPlants.length }, densityDeltas: deltas.length, descriptions: { tokens: tokenN, described: descN, groups: groupN, groupsDescribed: groupDescN } }, null, 1) + "\n");
console.log(summary.trim());
console.log(`alias equalities ${aliasOk}/${aliasOk + aliasBad} · state groups ${stateGroups.length} · contrast required ${pass} pass / ${failN} fail, ${exempt} informational · literals outside global ${literalBad.length} · banned ${bannedReal.length} · public unmapped ${unmapped.length} · v1 classes missing ${missingClasses.length}/${v1Classes.length}, keyframes missing ${missingKeyframes.length}/${v1Keyframes.length} · tier violations ${tierBad.length} · component literals ${compLiterals.length} marked / ${compLiteralUnmarked.length} unmarked · deprecation violations ${depBad + classDepBad} (${counts.deprecated} names, ${classDeprecated} classes/keyframes) · density deltas ${deltas.length} · cues ${cueN} assertions / ${cueBad} failures · frozen literals ${frozenN} / ${frozenBad} drifted · chart ${chartN} series values / ${chartBad} failures · editor selection ${selN} assertions / ${selBad} failures · public motion guard ${motionGuarded}/${motionAnimated} · MUI grey ${greyN - greyBad}/${greyN} · companion backing ${compN - compBad}/${compN} pairs, ${pixN - pixBad}/${pixN} assets pixel-sampled · provenance ${provN - provBad}/${provN} (${provKinds.given} given, ${provKinds.oklch} derived, ${provKinds.kept} kept) · dialog scrim ${scrimN - scrimBad}/${scrimN} · public states ${PUBLIC_STATES.length - pubStates.bad.length}/${PUBLIC_STATES.length} (planted defects caught ${pubPlants.filter((p) => p.caught).length}/${pubPlants.length}) · one frame ${frameN - frameBad}/${frameN}`);
process.exit(failures.length ? 1 : 0);
