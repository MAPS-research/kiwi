// chart-lib.mjs — the colour maths and the gates of the chart series (kiwi-ui/DESIGN.md § Chart tokens).
// Shared by derive-chart.mjs (which searches and writes the chart group) and check-tokens.mjs § 16 (which re-renders
// the recorded parameters and re-asserts every gate). No dependency; nothing machine-specific.
//
// Colour: OKLab / OKLCH (Ottosson), the same formulas as design-for-ai's palette.mjs. Colour-vision deficiency: the
// Machado, Oliveira & Fernandes (2009) transforms at severity 1.0 in linear RGB, the model the dataviz colour formula
// calibrates its thresholds to. Distance: Euclidean distance in OKLab × 100 ("dE"). Contrast: WCAG 2.x.
import { hexToRgb } from "./tokens-lib.mjs";

// ---------- OKLCH <-> linear sRGB ----------
export function oklchToLin(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
export function oklabFromLin([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const lin2s = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(x, 0), 1 / 2.4) - 0.055);
const s2lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const inGamut = (rgb) => rgb.every((x) => x >= -1e-6 && x <= 1 + 1e-6);
/** Reduce chroma until the colour fits sRGB (deterministic bisection, as palette.mjs does). */
export function toGamut(L, C, H) {
  let lin = oklchToLin(L, C, H);
  if (inGamut(lin)) return { L, C, H, lin };
  let lo = 0, hi = C;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; lin = oklchToLin(L, mid, H); if (inGamut(lin)) lo = mid; else hi = mid; }
  return { L, C: lo, H, lin: oklchToLin(L, lo, H) };
}
export const hexOfLin = (lin) => "#" + lin.map((x) => Math.round(Math.min(1, Math.max(0, lin2s(x))) * 255).toString(16).padStart(2, "0")).join("");
export const linOfHex = (hex) => hexToRgb(hex).map(s2lin);
/** The hex a recorded (L, C, hue) renders to: gamut-mapped, then rounded to 8 bits. */
export const renderHex = (L, C, H) => hexOfLin(toGamut(L, C, H).lin);
export function oklchOfHex(hex) {
  const [L, a, b] = oklabFromLin(linOfHex(hex));
  return { L, C: Math.hypot(a, b), H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

// ---------- colour-vision deficiency (Machado et al. 2009, severity 1.0, linear RGB) ----------
export const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
};
const clamp01 = (c) => Math.max(0, Math.min(1, c));
export const simulate = ([r, g, b], M) => [clamp01(M[0][0] * r + M[0][1] * g + M[0][2] * b), clamp01(M[1][0] * r + M[1][1] * g + M[1][2] * b), clamp01(M[2][0] * r + M[2][1] * g + M[2][2] * b)];
export const simulateHex = (hex, kind) => hexOfLin(simulate(linOfHex(hex), MACHADO[kind]));
export const dE = (a, b) => 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export const contrastLin = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/** One colour's views: OKLab as seen normally and under each simulation. */
export function views(hex) {
  const lin = linOfHex(hex);
  return { hex, lin, lab: oklabFromLin(lin), protan: oklabFromLin(simulate(lin, MACHADO.protan)), deutan: oklabFromLin(simulate(lin, MACHADO.deutan)) };
}

// ---------- the gates (kiwi-ui/DESIGN.md § Chart tokens › Derivation) ----------
// The constants are the gates: the checker reads nothing else (no environment, no file), so a run cannot be loosened from outside.
export const GATES = {
  contrast: 3,            // every series on --surface, --background and --surface-hover, both modes (WCAG 1.4.11; the brief)
  band: 0.07,             // OKLCH L within ± band of one target per mode: the measured reading of "matched lightness". Measured on 2026-10-18: at ±0.06 the
                          // colour-blind gate fails at C ≤ 0.14 (7.9) and passes at C 0.15 by 0.09; ±0.07 passes at C ≤ 0.14 with a margin of 0.58 (DESIGN.md § Chart tokens)
  chromaMax: 0.14,        // muted: between the accent (0.095) and the balanced functional colours (0.11–0.19)
  chromaMin: 0.10,        // below it a hue reads as grey and stops doing identity work (the dataviz formula's floor)
  arc: [45, 255],         // admissible OKLCH hues: outside purple/violet (the Never list), pink/magenta (the brief) and red (the lock: never in analytical views)
  cvdMin: 8,              // min pairwise dE (all pairs) under protanopia and deuteranopia; the dataviz formula's target (6–8 is a floor legal only with secondary encoding)
  normalMin: 15,          // min pairwise dE (all pairs) under normal vision; the formula's full-colour floor
  anchorHue: 156,         // series 1 is the pinned accent hue
};

/** Pairwise distances of a set of hexes: the minimum under each simulation (all pairs and adjacent pairs) and under normal vision. */
export function pairwise(hexes) {
  const v = hexes.map(views);
  const out = { cvd: Infinity, cvdPair: null, cvdKind: null, normal: Infinity, normalPair: null, adjacentCvd: Infinity, adjacentCvdPair: null, pairs: [] };
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) {
    const p = dE(v[i].protan, v[j].protan), d = dE(v[i].deutan, v[j].deutan), n = dE(v[i].lab, v[j].lab), c = Math.min(p, d);
    out.pairs.push({ i, j, protan: p, deutan: d, normal: n });
    if (c < out.cvd) { out.cvd = c; out.cvdPair = [i, j]; out.cvdKind = p < d ? "protanopia" : "deuteranopia"; }
    if (n < out.normal) { out.normal = n; out.normalPair = [i, j]; }
    if (j === i + 1 && c < out.adjacentCvd) { out.adjacentCvd = c; out.adjacentCvdPair = [i, j]; }
  }
  return out;
}

/** Is the hue inside the admissible arc? */
export const inArc = (H, [lo, hi] = GATES.arc) => (lo <= hi ? H >= lo && H <= hi : H >= lo || H <= hi);

/**
 * Assert every gate on a set of series hexes for one mode. Returns { ok, failures[], measures } and never throws.
 * surfaces: the hexes the marks must clear (--surface, --background, --surface-hover of that mode).
 */
export function assertSeries(hexes, surfaces, { gates = GATES, requireArc = true } = {}) {
  const failures = [];
  const ok = hexes.map(oklchOfHex);
  const Ls = ok.map((o) => o.L), target = (Math.max(...Ls) + Math.min(...Ls)) / 2, spread = Math.max(...Ls) - Math.min(...Ls);
  if (spread > 2 * gates.band + 1e-9) failures.push(`lightness spread ${spread.toFixed(3)} exceeds the ±${gates.band} band`);
  ok.forEach((o, i) => {
    if (o.C > gates.chromaMax + 0.005) failures.push(`series ${i + 1} chroma ${o.C.toFixed(3)} above ${gates.chromaMax}`);
    if (o.C < gates.chromaMin - 0.005) failures.push(`series ${i + 1} chroma ${o.C.toFixed(3)} below ${gates.chromaMin} (reads grey)`);
    if (requireArc && !inArc(o.H)) failures.push(`series ${i + 1} hue ${o.H.toFixed(1)} outside the admissible arc ${gates.arc.join("–")}`);
  });
  const crs = hexes.map((h) => surfaces.map((s) => contrastLin(linOfHex(h), linOfHex(s))));
  crs.forEach((row, i) => row.forEach((cr, k) => { if (cr < gates.contrast) failures.push(`series ${i + 1} ${hexes[i]} measures ${cr.toFixed(2)}:1 on ${surfaces[k]}`); }));
  const pw = pairwise(hexes);
  if (pw.cvd < gates.cvdMin) failures.push(`min pairwise distance under ${pw.cvdKind} ${pw.cvd.toFixed(2)} (series ${pw.cvdPair[0] + 1} vs ${pw.cvdPair[1] + 1}) below ${gates.cvdMin}`);
  if (pw.normal < gates.normalMin) failures.push(`min pairwise distance under normal vision ${pw.normal.toFixed(2)} (series ${pw.normalPair[0] + 1} vs ${pw.normalPair[1] + 1}) below ${gates.normalMin}`);
  return { ok: failures.length === 0, failures, measures: { oklch: ok, target, spread, contrast: crs, minContrast: Math.min(...crs.flat()), ...pw } };
}
