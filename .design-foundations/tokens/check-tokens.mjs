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
//  16. Interim chart: every interim palette.chart series clears 3:1 on --surface in both modes (the brief's release gate for chart marks), until Phase 6 registers chart.*.
//  15. Frozen literals: every literal that names a source in $extensions["org.kiwi"].frozen still equals that source resolved in the named context (the on-paper marks against the light globals), so a palette.mjs re-run cannot leave them behind.
//  17. Editor selection: the selection tint is visible on --editor-bg (≥ 1.1:1) and differs from the active line, its 1 px outline clears 3:1 against --editor-bg and the active line, and every syntax colour keeps 4.5:1 on the selection, both modes; the generated Ace rule carries both.
//  18. Public reduced motion: every selector of the public CSS that runs an animation or a transition is listed inside one scoped @media (prefers-reduced-motion: reduce) block, and that block holds no universal selector and no !important.
//  19. MUI grey: the preview's palette.grey is the locked neutral ramp per mode (every key, both schemes) and palette.common is the G2 logo pair, so a stray grey.NN in the code cannot keep MUI's default greys.
//  20. Companion backing (Phase 4, DW-4.4): the mascot's forest outline (companion.$extensions["org.kiwi"].artwork.outline, metadata, not a token) clears 3:1 on companion.backing in dark and on every light surface the transparent light backing exposes; § 5 admits a companion.* literal only when it is frozen to a light source, and § 15 reads a frozen literal held in a mode block (frozen.at).
// Writes ./generated/check-summary.json with every count the DESIGN.md evidence quotes, so the evidence paragraph is generated, not typed.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTokens, walk, walkGroups, getToken, getNode, resolve, refOf, cssNameFor, contrast, isHex, CONTEXTS, STATES, COMPONENTS, variesWith, TOKENS_DIR, REPO_ROOT } from "./tokens-lib.mjs";

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
  const scan = (v) => { if (typeof v === "string") { if (isHex(v) || /\b(rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/.test(v)) { if (!literalAllow.some((re) => re.test(p)) && !(p.startsWith("companion.") && t.$extensions?.["org.kiwi"]?.frozen)) literalBad.push(`${p}: ${v}`); } } else if (Array.isArray(v)) v.forEach(scan); else if (v && typeof v === "object") Object.values(v).forEach(scan); };
  scan(t.$value); if (t.$extensions?.mode) Object.values(t.$extensions.mode).forEach(scan);
});
if (literalBad.length) fail(`colour literals outside the global tier / allowlisted composites: ${literalBad.join("; ")}`);
const texts = [["kiwi-ui.tokens.json", JSON.stringify(tree)], ...["kiwi-ui.tokens.css", "kiwi-design-tokens.public.css", "mui-theme.json"].map((f) => [f, existsSync(join(here, "generated", f)) ? readFileSync(join(here, "generated", f), "utf8") : ""])];
const bannedHits = [];
for (const [f, txt] of texts) for (const b of meta.banned) { const re = new RegExp(b.replace("#", "#?"), "gi"); const hits = txt.match(re); if (hits) bannedHits.push(`${f}: ${b} ×${hits.length}`); }
// the JSON names the banned hexes in its own ban list; discount those occurrences
const bannedReal = bannedHits.filter((h) => !h.startsWith("kiwi-ui.tokens.json"));
if (bannedReal.length) fail(`banned hex in generated outputs: ${bannedReal.join("; ")}`);
log(`\n## 5. Literal policy\n\nColour literals outside the global tier: ${literalBad.length} (allowed: the G2 logo black/white, the mode-frozen on-paper marks and a mode-frozen companion.* literal that names its light source (Phase 4: the dark backing); the backdrop and the shadows reference --shadow-ink and carry alphas, composed by the emitter). Banned purple-era hex in the generated CSS, public CSS and MUI preview: ${bannedReal.length}.`);

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

// ---------- 16. the interim chart series ----------
let chartN = 0, chartBad = 0; const chartRows = [];
for (const [k, ref] of Object.entries(meta.interimChart?.series || {})) {
  const res = {};
  for (const [mode, ctx] of [["light", L], ["dark", D]]) { const fg = resolve(tree, refOf(ref), ctx), bg = resolve(tree, "semantic.color.surface", ctx); res[mode] = isHex(fg) && isHex(bg) ? contrast(fg, bg) : 0; }
  chartN++; const ok = res.light >= 3 && res.dark >= 3; if (!ok) { fail(`interim chart ${k} (${ref}) light ${res.light.toFixed(2)} dark ${res.dark.toFixed(2)} < 3 on --surface`); chartBad++; }
  chartRows.push([k, ref, res.light.toFixed(2), res.dark.toFixed(2), ok ? "PASS" : "FAIL"]);
}
log(`\n## 16. Interim chart series (until Phase 6)\n\n${chartN} series, ${chartBad} below 3:1 on --surface.\n`);
log("| Series | Token | Light | Dark | Result |\n|---|---|---|---|---|");
for (const r of chartRows) log(`| ${r.join(" | ")} |`);

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
log(`\n## 20. Companion backing (Phase 4)\n\n${compN} required pairs (the forest outline ≥ 3:1 on the dark backing and on the light surfaces behind the transparent light backing), ${compBad} below.\n`);
log("| Mode | Pair | Value | Ratio | |\n|---|---|---|---|---|");
for (const r of compRows) log(`| ${r.join(" | ")} |`);

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
writeFileSync(join(here, "generated/check-summary.json"), JSON.stringify({ date: today, source: { version: meta.version, sha256: srcSha, commit }, result: failures.length ? "FAIL" : "PASS", failures: failures.length, components: COMPONENTS.length, aliasOk, aliasBad, stateGroups: stateGroups.length, stateSpecs: stateGroups.length * 8, contrast: { pass, fail: failN, informational: exempt }, tier: { refs: compRefs, violations: tierBad.length }, literals: { marked: compLiterals.length, unmarked: compLiteralUnmarked.length, outsideGlobal: literalBad.length, banned: bannedReal.length }, public: { pinned: pinned.length, unmapped: unmapped.length, notEmitted: notEmitted.length, counts, classes: { pinned: v1Classes.length, missing: missingClasses.length, emitted: genClasses.size }, keyframes: { pinned: v1Keyframes.length, missing: missingKeyframes.length, emitted: genKeyframes.size }, deprecatedClasses: classDeprecated, deprecationViolations: depBad + classDepBad }, cues: { variants: TOGGLES.length, assertions: cueN, failures: cueBad }, frozen: { n: frozenN, drifted: frozenBad }, interimChart: { series: chartN, below: chartBad }, editorSelection: { assertions: selN, failures: selBad }, motionGuard: { moving: motionAnimated, guarded: motionGuarded }, muiGrey: { keys: greyN, mismatches: greyBad }, companionBacking: { assertions: compN, failures: compBad }, densityDeltas: deltas.length, descriptions: { tokens: tokenN, described: descN, groups: groupN, groupsDescribed: groupDescN } }, null, 1) + "\n");
console.log(summary.trim());
console.log(`alias equalities ${aliasOk}/${aliasOk + aliasBad} · state groups ${stateGroups.length} · contrast required ${pass} pass / ${failN} fail, ${exempt} informational · literals outside global ${literalBad.length} · banned ${bannedReal.length} · public unmapped ${unmapped.length} · v1 classes missing ${missingClasses.length}/${v1Classes.length}, keyframes missing ${missingKeyframes.length}/${v1Keyframes.length} · tier violations ${tierBad.length} · component literals ${compLiterals.length} marked / ${compLiteralUnmarked.length} unmarked · deprecation violations ${depBad + classDepBad} (${counts.deprecated} names, ${classDeprecated} classes/keyframes) · density deltas ${deltas.length} · cues ${cueN} assertions / ${cueBad} failures · frozen literals ${frozenN} / ${frozenBad} drifted · interim chart ${chartN} series / ${chartBad} below 3:1 · editor selection ${selN} assertions / ${selBad} failures · public motion guard ${motionGuarded}/${motionAnimated} · MUI grey ${greyN - greyBad}/${greyN} · companion backing ${compN - compBad}/${compN}`);
process.exit(failures.length ? 1 : 0);
