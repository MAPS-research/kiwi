#!/usr/bin/env node
// derive-chart.mjs — derives the five chart series and the neutral (kiwi-ui/DESIGN.md § Chart tokens) and writes them into the
// reserved `chart` group of kiwi-ui.tokens.json, with every parameter recorded, so that check-tokens.mjs § 16 can re-render and
// re-assert them. Deterministic: a seeded generator drives the search, so the same source gives the same result.
//
//   node derive-chart.mjs            # search, print the result, write the chart group (the three tiers are never touched)
//   node derive-chart.mjs --dry      # search and print only
//
// Procedure (the plan's five-series requirement inside the lock, see § Chart tokens › Derivation):
//   fixed: series 1 is the pinned accent hue (156); the plot surfaces are the locked --surface, --background and --surface-hover
//          of each mode; the admissible hue arc excludes purple and violet (the Never list), pink and magenta (the brief) and red
//          (the lock: never in analytical views); chroma stays at or below 0.14 (muted: between the accent and the functional colours).
//   searched: four hues on the arc; one lightness and one chroma per series per mode, the lightnesses held within ± 0.06 of one
//          target per mode (the measured tolerance of "matched lightness": at one exact lightness five series cannot clear the
//          colour-blind gate at muted chroma, see the discovery).
//   objective: the minimum pairwise OKLab distance under protanopia and deuteranopia (Machado 2009), all pairs, both modes,
//          then the minimum under normal vision; the gates are 8 and 15 (the dataviz colour formula).
//   order: slots 2–5 take the permutation that maximises the minimum ADJACENT distance (stacks, bars, lines meet only neighbours).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadTokens, resolve, CONTEXTS, TOKENS_DIR } from "./tokens-lib.mjs";
import { GATES, toGamut, hexOfLin, renderHex, oklchOfHex, assertSeries, pairwise, views, dE, contrastLin, linOfHex, inArc } from "./chart-lib.mjs";

const DRY = process.argv.includes("--dry");
const SRC = join(TOKENS_DIR, "kiwi-ui.tokens.json");
const tree = loadTokens(SRC);
const S = (p, ctx) => resolve(tree, `semantic.color.${p}`, ctx);
const SURFACES = {
  light: [S("surface", CONTEXTS.light), S("background", CONTEXTS.light), S("surface-hover", CONTEXTS.light)],
  dark: [S("surface", CONTEXTS.dark), S("background", CONTEXTS.dark), S("surface-hover", CONTEXTS.dark)],
};
const NEUTRAL_HUE = oklchOfHex(resolve(tree, "global.color.neutral.11", CONTEXTS.light)).H; // the neutral ramp's hue (seed 95)
const NEUTRAL_C = 0.012; // the neutral ramp's chroma level

// ---------- a seeded generator (mulberry32) ----------
const SEED = 20261018;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(SEED);
const rnd = (a, b) => a + rand() * (b - a);

// ---------- the search ----------
const MODES = ["light", "dark"];
const LRANGE = { light: [0.44, 0.66], dark: [0.56, 0.82] };
function render(state, mode) { return state.h.map((h, i) => renderHex(state[mode].L[i], state[mode].C[i], h)); }
// The objective is the margin above the two distinguishability gates on the RENDERED hexes (what the checker asserts), the smaller
// of the two in both modes, with every other gate as a penalty. The search keeps 1° inside the arc and 0.002 inside the band so
// that 8-bit rounding cannot push a result over an edge.
const ARC_IN = [GATES.arc[0] + 1, GATES.arc[1] - 1], BAND_IN = GATES.band - 0.002;
function score(state) {
  let worst = Infinity;
  for (const mode of MODES) {
    const hexes = render(state, mode);
    const r = assertSeries(hexes, SURFACES[mode], { requireArc: false });
    let s = Math.min(r.measures.cvd - GATES.cvdMin, (r.measures.normal - GATES.normalMin) * (GATES.cvdMin / GATES.normalMin));
    if (r.measures.minContrast < GATES.contrast) s -= (GATES.contrast - r.measures.minContrast) * 20;
    if (r.measures.spread > 2 * BAND_IN) s -= (r.measures.spread - 2 * BAND_IN) * 100;
    r.measures.oklch.forEach((o, i) => { if (o.C < GATES.chromaMin) s -= (GATES.chromaMin - o.C) * 40; if (i > 0 && !inArc(o.H, ARC_IN)) s -= 1; });
    worst = Math.min(worst, s);
  }
  return worst;
}
function search(restarts = 48, iters = 12000) {
  let best = null;
  for (let r = 0; r < restarts; r++) {
    const st = { h: [GATES.anchorHue, rnd(ARC_IN[0], 120), rnd(90, 190), rnd(180, 235), rnd(225, ARC_IN[1])], light: { L: Array.from({ length: 5 }, () => rnd(0.52, 0.62)), C: Array.from({ length: 5 }, () => rnd(0.10, GATES.chromaMax)) }, dark: { L: Array.from({ length: 5 }, () => rnd(0.62, 0.74)), C: Array.from({ length: 5 }, () => rnd(0.10, GATES.chromaMax)) } };
    let cur = score(st);
    for (let it = 0; it < iters; it++) {
      const t = 1 - it / iters, cand = JSON.parse(JSON.stringify(st)), k = Math.floor(rand() * 3);
      if (k === 0) { const i = 1 + Math.floor(rand() * 4); cand.h[i] = Math.min(ARC_IN[1], Math.max(ARC_IN[0], cand.h[i] + rnd(-25, 25) * t)); }
      else { const mode = rand() < 0.5 ? "light" : "dark", i = Math.floor(rand() * 5); if (k === 1) cand[mode].L[i] = Math.min(LRANGE[mode][1], Math.max(LRANGE[mode][0], cand[mode].L[i] + rnd(-0.06, 0.06) * t)); else cand[mode].C[i] = Math.min(GATES.chromaMax, Math.max(GATES.chromaMin, cand[mode].C[i] + rnd(-0.04, 0.04) * t)); }
      const v = score(cand);
      if (v > cur || rand() < 0.02 * t) { Object.assign(st, cand); cur = v; }
    }
    if (!best || cur > best.score) best = { score: cur, st: JSON.parse(JSON.stringify(st)) };
  }
  return best;
}
const found = search();
// Round the parameters to what a reader can re-type (1° hue, 0.005 L, 0.005 C), then polish greedily on the same grid against the
// full gates on the rendered hexes (arc and band included), so the recorded parameters are exactly what the checker re-renders.
const round = (x, q) => Math.round(x / q) * q;
const st = JSON.parse(JSON.stringify(found.st));
st.h = st.h.map((h, i) => (i === 0 ? GATES.anchorHue : round(h, 1)));
for (const m of MODES) { st[m].L = st[m].L.map((x) => +round(x, 0.005).toFixed(3)); st[m].C = st[m].C.map((x) => +round(x, 0.005).toFixed(3)); }
function margin(state) {
  let worst = Infinity;
  for (const mode of MODES) {
    const r = assertSeries(render(state, mode), SURFACES[mode]);
    let s = Math.min(r.measures.cvd - GATES.cvdMin, (r.measures.normal - GATES.normalMin) * (GATES.cvdMin / GATES.normalMin));
    if (!r.ok) s -= 100 * r.failures.length;
    worst = Math.min(worst, s);
  }
  return worst;
}
{
  let cur = margin(st), improved = true, rounds = 0;
  while (improved && rounds < 60) {
    improved = false; rounds++;
    const moves = [];
    for (let i = 1; i < 5; i++) for (const d of [-1, 1]) moves.push((c) => { c.h[i] = Math.min(ARC_IN[1], Math.max(ARC_IN[0], c.h[i] + d)); });
    for (const m of MODES) for (let i = 0; i < 5; i++) for (const d of [-0.005, 0.005]) { moves.push((c) => { c[m].L[i] = +Math.min(LRANGE[m][1], Math.max(LRANGE[m][0], c[m].L[i] + d)).toFixed(3); }); moves.push((c) => { c[m].C[i] = +Math.min(GATES.chromaMax, Math.max(GATES.chromaMin, c[m].C[i] + d)).toFixed(3); }); }
    for (const mv of moves) { const c = JSON.parse(JSON.stringify(st)); mv(c); const v = margin(c); if (v > cur + 1e-9) { Object.assign(st, c); cur = v; improved = true; } }
  }
  console.log(`polish: ${rounds} rounds, margin above the gates ${cur.toFixed(3)} (in units of the colour-blind gate)`);
}

// ---------- the fixed order (slot 1 = the accent hue; slots 2–5 by the best minimum adjacent distance in both modes) ----------
const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
let order = null;
for (const p of perms([1, 2, 3, 4])) {
  const idx = [0, ...p];
  const m = Math.min(...MODES.map((mode) => pairwise(idx.map((i) => render(st, mode)[i])).adjacentCvd));
  const tie = Math.min(...MODES.map((mode) => { const hx = idx.map((i) => render(st, mode)[i]); const v = hx.map(views); return Math.min(dE(v[0].deutan, v[4].deutan), dE(v[0].protan, v[4].protan)); }));
  if (!order || m > order.m + 1e-9 || (Math.abs(m - order.m) < 1e-9 && tie > order.tie)) order = { idx, m, tie };
}
const ordered = { h: order.idx.map((i) => st.h[i]), light: { L: order.idx.map((i) => st.light.L[i]), C: order.idx.map((i) => st.light.C[i]) }, dark: { L: order.idx.map((i) => st.dark.L[i]), C: order.idx.map((i) => st.dark.C[i]) } };

// ---------- the result, asserted ----------
const result = {};
for (const mode of MODES) {
  const hexes = render(ordered, mode);
  const r = assertSeries(hexes, SURFACES[mode]);
  r.measures.targetRounded = +round(r.measures.target, 0.005).toFixed(3); // the neutral is rendered from the recorded (rounded) target, so record and re-render agree
  const neutralHex = renderHex(r.measures.targetRounded, NEUTRAL_C, NEUTRAL_HUE);
  const nv = views(neutralHex), sv = hexes.map(views);
  const neutralDist = Math.min(...sv.map((v) => Math.min(dE(v.protan, nv.protan), dE(v.deutan, nv.deutan))));
  const neutralContrast = Math.min(...SURFACES[mode].map((s) => contrastLin(linOfHex(neutralHex), linOfHex(s))));
  result[mode] = { hexes, neutralHex, neutralDist, neutralContrast, ...r };
}
const allOk = MODES.every((m) => result[m].ok);
const hueNames = (H) => (H < 70 ? "amber" : H < 125 ? "olive" : H < 175 ? "green" : H < 225 ? "teal" : "blue");
console.log(`derive-chart.mjs · seed ${SEED} · search score ${found.score.toFixed(2)} · order ${order.idx.map((i) => i + 1).join(" → ")} (min adjacent dE ${order.m.toFixed(2)})`);
for (const mode of MODES) {
  const r = result[mode];
  console.log(`\n[${mode}] target L ${r.measures.target.toFixed(3)} (spread ${r.measures.spread.toFixed(3)}, band ±${GATES.band}) · min contrast ${r.measures.minContrast.toFixed(2)}:1 · min dE protan/deutan ${r.measures.cvd.toFixed(2)} (${r.measures.cvdKind}, series ${r.measures.cvdPair.map((i) => i + 1).join(" vs ")}) · adjacent ${r.measures.adjacentCvd.toFixed(2)} · normal ${r.measures.normal.toFixed(2)} (series ${r.measures.normalPair.map((i) => i + 1).join(" vs ")}) · ${r.ok ? "PASS" : "FAIL: " + r.failures.join("; ")}`);
  r.hexes.forEach((hx, i) => { const o = r.measures.oklch[i]; console.log(`  --chart-${i + 1} ${hx}  hue ${ordered.h[i]}° (${hueNames(ordered.h[i])})  L ${o.L.toFixed(3)} C ${o.C.toFixed(3)}  from (L ${ordered[mode].L[i]}, C ${ordered[mode].C[i]})  contrast ${r.measures.contrast[i].map((c) => c.toFixed(2)).join(" / ")}`); });
  console.log(`  --chart-other ${r.neutralHex}  neutral hue ${NEUTRAL_HUE.toFixed(1)}° C ${NEUTRAL_C} at the target L · contrast ${r.neutralContrast.toFixed(2)}:1 · min dE to a series under simulation ${r.neutralDist.toFixed(2)} (informational: Other is de-emphasis with a label)`);
}
if (!allOk) { console.error("\nthe derived set does not clear every gate"); process.exit(1); }
if (DRY) process.exit(0);

// ---------- write the chart group ----------
const desc = (i, name) => `Categorical series ${i}${i === 1 ? ", the accent hue (156°): every single-series chart draws in it, so one accent per view holds with the brand hue while --accent-solid stays the control colour" : ` (${name})`}. A literal derived by derive-chart.mjs from the recorded OKLCH parameters (hue, L, C per mode; gamut-mapped, rounded to 8 bits); check § 16 re-renders them and re-asserts the gates. A mark colour only: never text, never a status surface, never outside a plot.`;
const series = {};
ordered.h.forEach((H, i) => {
  series[String(i + 1)] = {
    $type: "color", $value: result.light.hexes[i], $description: desc(i + 1, hueNames(H)),
    $extensions: { mode: { dark: result.dark.hexes[i] }, "org.kiwi": { css: `--chart-${i + 1}`, derived: { hue: H, light: { L: ordered.light.L[i], C: ordered.light.C[i] }, dark: { L: ordered.dark.L[i], C: ordered.dark.C[i] } } } },
  };
});
const chart = {
  $description: `Phase 6 (2026-10-18), the data colours (kiwi-ui/DESIGN.md § Chart tokens): five categorical series at one target lightness per mode (± ${GATES.band}), the neutral for Other and Unknown, and the chart chrome roles as references. Registered under the reserved namespace and never edited into the three tiers; every token names its CSS property, so the resolver's naming rule is untouched. The series and the neutral are literals derived by derive-chart.mjs from recorded OKLCH parameters (§ 5 admits a chart.* literal that carries \`derived\`; § 16 re-renders and re-asserts it), replacing the interim palette.chart stand-ins of Phase 3.`,
  $extensions: { "org.kiwi": { derivation: {
    script: ".design-foundations/tokens/derive-chart.mjs", seed: SEED, model: "Machado, Oliveira & Fernandes (2009) at severity 1.0, in linear sRGB; distances are Euclidean in OKLab × 100",
    gates: { contrast: GATES.contrast, band: GATES.band, chromaMax: GATES.chromaMax, chromaMin: GATES.chromaMin, arc: GATES.arc, cvdMin: GATES.cvdMin, normalMin: GATES.normalMin, anchorHue: GATES.anchorHue },
    surfaces: SURFACES, order: `slot 1 is the accent hue; slots 2–5 maximise the minimum adjacent distance (${order.m.toFixed(2)})`,
    measured: Object.fromEntries(MODES.map((m) => [m, { target: +result[m].measures.target.toFixed(3), spread: +result[m].measures.spread.toFixed(3), minContrast: +result[m].measures.minContrast.toFixed(2), minCvd: +result[m].measures.cvd.toFixed(2), minCvdKind: result[m].measures.cvdKind, minCvdPair: result[m].measures.cvdPair.map((i) => i + 1), minAdjacentCvd: +result[m].measures.adjacentCvd.toFixed(2), minNormal: +result[m].measures.normal.toFixed(2), minNormalPair: result[m].measures.normalPair.map((i) => i + 1), neutral: { minCvdToSeries: +result[m].neutralDist.toFixed(2), minContrast: +result[m].neutralContrast.toFixed(2) } }])),
    note: `At one exact lightness per mode five hue-separated series cannot clear the colour-blind gate at muted chroma (best 6.3 at C <= 0.14; 8.2 only at C 0.22, with a normal-vision minimum of 8.7): lightness is the channel dichromats keep. At ± 0.06 the gate still fails at C <= 0.14 (7.9) and passes at C 0.15 by 0.09 only; ± ${GATES.band} at C <= ${GATES.chromaMax} is the smallest band, in steps of 0.01, that clears both gates with a margin (DESIGN.md § Chart tokens › Matched lightness, as measured).`,
  } } },
  series,
  other: {
    $type: "color", $value: result.light.neutralHex, $description: "The neutral series for Other and Unknown: the neutral ramp's hue and chroma at the mode's target lightness, so it carries the same weight as the five and reads as de-emphasis (always with its label; never the only category).",
    $extensions: { mode: { dark: result.dark.neutralHex }, "org.kiwi": { css: "--chart-other", derived: { hue: +NEUTRAL_HUE.toFixed(1), light: { L: result.light.measures.targetRounded, C: NEUTRAL_C }, dark: { L: result.dark.measures.targetRounded, C: NEUTRAL_C } } } },
  },
  grid: { $type: "color", $value: "{semantic.color.border-subtle}", $description: "Gridlines: solid hairlines one step off the surface, never dashed (figure/ground: data is figure, the grid is ground).", $extensions: { "org.kiwi": { css: "--chart-grid" } } },
  baseline: { $type: "color", $value: "{semantic.color.border-strong}", $description: "The zero line and the axis rule, a 1 px hairline; bars grow from it.", $extensions: { "org.kiwi": { css: "--chart-baseline" } } },
  track: { $type: "color", $value: "{semantic.color.surface-active}", $description: "The unfilled track behind an inline bar (the topic frequency bars) and the progress bar's track.", $extensions: { "org.kiwi": { css: "--chart-track" } } },
  "tick-text": { $type: "color", $value: "{semantic.color.text-secondary}", $description: "Axis ticks, legend text and direct labels: text wears text tokens, never a series colour.", $extensions: { "org.kiwi": { css: "--chart-tick-text" } } },
  plot: { $type: "color", $value: "{semantic.color.surface}", $description: "The plot background: the sheet the chart sits on. Every series clears 3:1 on it, on the canvas and on the hover row.", $extensions: { "org.kiwi": { css: "--chart-plot" } } },
};
tree.chart = chart;
const meta = tree.$extensions["org.kiwi"];
delete meta.interimChart;
if (meta.reserved && meta.reserved["chart.*"]) meta.reserved["chart.*"] = "Phase 6 registered chart.series.1-5, chart.other and the chart chrome roles here (2026-10-18), replacing the interim palette.chart stand-ins; the MUI theme's palette.chart now reads them.";
writeFileSync(SRC, JSON.stringify(tree, null, 2) + "\n");
console.log(`\nwrote the chart group into ${SRC.replace(/.*\/\.design-foundations\//, ".design-foundations/")} (interimChart removed)`);
