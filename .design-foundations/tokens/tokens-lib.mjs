// tokens-lib.mjs — shared resolver for the Kiwi UI DTCG source (kiwi-ui.tokens.json).
// Used by build-tokens.mjs (the reference emitter) and check-tokens.mjs (the gate checks).
// Spec: kiwi-ui/DESIGN.md § Design system › Generation spec.
import { readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

/** Repository-relative locations: the tokens directory is <repo>/.design-foundations/tokens. */
export const TOKENS_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolvePath(TOKENS_DIR, "..", "..");

export const STATES = ["default", "hover", "focus", "active", "disabled", "loading", "error", "success"];
export const COMPONENTS = ["button", "icon-button", "chip", "switch", "field", "checkbox", "tabs", "sidebar-item", "panel", "dialog", "alert", "toast", "table", "data-grid", "kpi-tile", "empty-state", "display-menu", "launcher", "tutor-message", "pdf-toolbar"];
/** Three orthogonal axes: colour (data-theme), density (data-density) and pointer (@media (pointer: coarse)). */
export const CONTEXTS = {
  light: { color: "light", density: "comfortable", pointer: "fine" },
  dark: { color: "dark", density: "comfortable", pointer: "fine" },
  compact: { color: "light", density: "compact", pointer: "fine" },
  "dark-compact": { color: "dark", density: "compact", pointer: "fine" },
  coarse: { color: "light", density: "comfortable", pointer: "coarse" },
  "coarse-compact": { color: "light", density: "compact", pointer: "coarse" },
};

export const loadTokens = (file) => JSON.parse(readFileSync(file, "utf8"));
export const isToken = (n) => n && typeof n === "object" && !Array.isArray(n) && "$value" in n;
const isMeta = (k) => k.startsWith("$");

/** Visit every token: fn(path, token). */
export function walk(tree, fn, path = []) {
  for (const [k, v] of Object.entries(tree)) {
    if (isMeta(k) || v === null || typeof v !== "object") continue;
    const p = [...path, k];
    if (isToken(v)) fn(p.join("."), v);
    else walk(v, fn, p);
  }
}
/** Visit every group (non-token object): fn(path, group). */
export function walkGroups(tree, fn, path = []) {
  for (const [k, v] of Object.entries(tree)) {
    if (isMeta(k) || v === null || typeof v !== "object" || Array.isArray(v)) continue;
    const p = [...path, k];
    if (!isToken(v)) { fn(p.join("."), v); walkGroups(v, fn, p); }
  }
}
export function getNode(tree, path) {
  return path.split(".").reduce((n, k) => (n && typeof n === "object" ? n[k] : undefined), tree);
}
export const getToken = (tree, path) => { const n = getNode(tree, path); return isToken(n) ? n : undefined; };

const REF = /^\{([^{}]+)\}$/;
export const refOf = (v) => (typeof v === "string" && REF.test(v) ? v.match(REF)[1] : null);

/** The raw (unresolved) value of a token in a context: mode override, else $value. */
export function rawValue(token, ctx) {
  const m = token.$extensions?.mode;
  if (m) {
    if (ctx.pointer && ctx.pointer in m) return m[ctx.pointer]; // a coarse pointer wins over density (a hit area is 44 whatever the density)
    if (ctx.color in m) return m[ctx.color];
    if (ctx.density in m) return m[ctx.density];
  }
  return token.$value;
}

/** Deep-resolve a token's value in a context. References re-resolve in the same context. */
export function resolve(tree, path, ctx, stack = []) {
  const tok = getToken(tree, path);
  if (!tok) throw new Error(`unresolved reference {${path}} (from ${stack.join(" → ") || "root"})`);
  if (stack.includes(path)) throw new Error(`reference cycle: ${[...stack, path].join(" → ")}`);
  const deep = (v) => {
    if (typeof v === "string") {
      const r = refOf(v);
      if (r) return resolve(tree, r, ctx, [...stack, path]);
      return v.replace(/\{([^{}]+)\}/g, (_, p) => String(resolve(tree, p, ctx, [...stack, path])));
    }
    if (Array.isArray(v)) return v.map(deep);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)]));
    return v;
  };
  return deep(rawValue(tok, ctx));
}

/** All token paths a token references, transitively, in a context. */
export function dependencies(tree, path, ctx, acc = new Set(), stack = []) {
  const tok = getToken(tree, path);
  if (!tok || stack.includes(path)) return acc;
  const scan = (v) => {
    if (typeof v === "string") for (const m of v.matchAll(/\{([^{}]+)\}/g)) { if (!acc.has(m[1])) { acc.add(m[1]); dependencies(tree, m[1], ctx, acc, [...stack, path]); } }
    else if (Array.isArray(v)) v.forEach(scan);
    else if (v && typeof v === "object") Object.values(v).forEach(scan);
  };
  scan(rawValue(tok, ctx));
  return acc;
}

/** Does this token's resolved value depend on the given axis (color | density), transitively? */
export function variesWith(tree, path, axis) {
  const tok = getToken(tree, path);
  const own = (t) => { const m = t.$extensions?.mode || {}; return axis === "color" ? "dark" in m || "light" in m : axis === "pointer" ? "coarse" in m || "fine" in m : "compact" in m || "comfortable" in m; };
  if (own(tok)) return true;
  for (const d of dependencies(tree, path, CONTEXTS.light)) { const t = getToken(tree, d); if (t && own(t)) return true; }
  return false;
}

/** CSS custom-property name for a token path (the generation spec's naming rule). null = not emitted. */
export function cssNameFor(tree, path) {
  const tok = getToken(tree, path);
  const e = tok?.$extensions?.["org.kiwi"];
  if (e?.emit === false) return null;
  if (e?.css) return e.css;
  const p = path.split(".");
  const tier = p[0];
  if (tier === "global") return null; // globals are emitted only under their locked names ($extensions["org.kiwi"].css)
  if (tier === "semantic") {
    const [, group, ...rest] = p;
    if (group === "color") return "--" + rest.join("-"); // carried aliases keep their locked names; additions: --status-error-surface, --selection-bg, …
    if (group === "easing") return "--motion-ease-" + rest.join("-");
    if (group === "border") return "--border-width-" + rest.join("-");
    if (group === "radius") return null; // pass-through of the locked --radius-* globals; not re-emitted
    return "--" + [group, ...rest].join("-"); // --editor-bg, --syntax-keyword, --console-fg, --shadow-1, --space-inset-x, --size-control, --type-body, --motion-micro, --z-launcher, --opacity-paper-dim
  }
  if (tier === "component") {
    // component.button.primary.state.hover.fill → --button-primary-hover-fill; "state" and "default" are dropped; "variant" is kept.
    const parts = p.slice(1).filter((s, i, a) => !(s === "state") && !(s === "default" && a[i - 1] === "state"));
    return "--" + parts.join("-");
  }
  return null; // chart.* and companion.* are reserved for later phases
}

// ---------- colour maths (WCAG 2.x) ----------
export function hexToRgb(hex) {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6); // alpha ignored for contrast (only opaque pairs are asserted)
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`not an opaque hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
export const luminance = (rgb) => { const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export function contrast(a, b) { const [x, y] = [luminance(hexToRgb(a)), luminance(hexToRgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
export const isHex = (v) => typeof v === "string" && /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(v.trim());
export function hex8ToRgba(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`;
}
/** An opaque hex colour at an alpha (0–1) as rgba(): how the emitter composes shadows and the backdrop from --shadow-ink. */
export function withAlpha(hex, alpha) {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.round(c * 255));
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
}
/** The alpha a token carries in $extensions["org.kiwi"].alpha for a context: a number, or per colour mode { light, dark }. */
export function alphaOf(token, ctx) {
  const a = token?.$extensions?.["org.kiwi"]?.alpha;
  if (a == null || Array.isArray(a)) return null;
  return typeof a === "object" ? (a[ctx.color] ?? null) : a;
}

// ---------- CSS value rendering ----------
export function cssValue(type, value) {
  if (value === null || value === undefined) return "";
  switch (type) {
    case "fontFamily": return (Array.isArray(value) ? value : [value]).map((f) => (/^[a-z-]+$/.test(f) ? f : `"${f}"`)).join(", ");
    case "cubicBezier": return `cubic-bezier(${value.join(", ")})`;
    case "shadow": return (Array.isArray(value) ? value : [value]).map((s) => `${s.offsetX} ${s.offsetY} ${s.blur} ${s.spread} ${isHex(s.color) ? hex8ToRgba(s.color) : s.color}`).join(", ");
    case "color": return isHex(value) && value.length === 9 ? hex8ToRgba(value) : value;
    default: return Array.isArray(value) ? value.join(" ") : typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}
/** Fields of a typography composite → CSS property suffixes. */
export const TYPO_FIELDS = { fontFamily: "family", fontSize: "size", lineHeight: "leading", fontWeight: "weight", letterSpacing: "tracking", fontVariantNumeric: "numeric" };
