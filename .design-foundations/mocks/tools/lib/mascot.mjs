// The companion in the Phase 7 mocks: the Phase 4 drawings only (assets/mascot/), placed with the library's framing rule
// exactly as the companion sheet places them, and the clip table of kiwi-ui/DESIGN.md § Companion › The nine states
// (a 24 Hz clock; whole drawings swapped, nothing tweened), as amended on 2026-10-18 (plan Decision Log, the two
// companion rows of that day): the tutor avatar keeps one small, full-body framing. It runs from the send until the
// answer is complete, as one loop with no restart at the first token, then hops and flies once, and otherwise stands.
// The amendment's numbers (the shared framing, the standing still) are read from inventory.json, not restated here.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ASSETS } from "./paths.mjs";

const INVENTORY = JSON.parse(readFileSync(join(ASSETS, "mascot", "inventory.json"), "utf8"));
const AVATAR = INVENTORY.avatar; // the 2026-10-18 amendment: the avatar's atlases, its shared framing, its states
const stem = (s) => { if (!s.stem) throw new Error(`inventory.json still without a stem: ${s.file}`); return s.stem; }; // still-<stem>.png, stills/<stem>.<px>.webp
if (!AVATAR || !AVATAR.sharedFraming || !Array.isArray(AVATAR.atlases) || !INVENTORY.stills.some((s) => stem(s) === "stand")) {
  throw new Error("mascot/inventory.json has no 2026-10-18 avatar amendment (avatar.atlases, avatar.sharedFraming, the stand still)");
}
export const FPS = 24, COLS = 6, ROWS = 4;
/** Each atlas's own union-circle framing (framing.ts), for every placement that is not a full-body avatar drawing. */
export const FRAMING = Object.fromEntries(Object.entries(INVENTORY.framing).map(([k, v]) => [k, { cx: v.cx, cy: v.cy, s: v.scale }]));
/** The full-body atlases share one framing (framing.ts's rule over all their drawings), so the figure never changes size. */
export const AVATAR_ATLASES = [...AVATAR.atlases];
const SHARED = AVATAR.sharedFraming;
export const PEEK_WALL_LEFT = INVENTORY.peekWall.frameLeftPercent; // the drawn wall on the slot's right edge (review A-3)

/** Every still export: its name, the atlas and cell it was cut from, its ink box (slot fractions) and its sized files.
 *  `stand` (full-hop-flight 23) is the avatar's; idle, error and walk are the page placements'; wave, peek and retract
 *  are inspection stills. */
export const STILLS = Object.fromEntries(INVENTORY.stills.map((s) => [stem(s), { atlas: s.atlas, cell: s.cell, ink: s.ink.slotFractions, sized: s.sized, file: s.file, placement: s.placement || null }]));

const span = (a, b) => { const n = Math.abs(b - a) + 1, s = Math.sign(b - a) || 1; return Array.from({ length: n }, (_, i) => a + i * s); };
const hold = (c, n) => Array(n).fill(c);
const expose = (fr, t = 2) => fr.flatMap((f) => hold(f, t));
const peekSeq = [...hold(0, 4), ...expose(span(0, 23), 2), ...hold(23, 4)];
const runSeq = expose(span(0, 23), 2);
/**
 * The states: atlas, sequence in ticks, loop, and the still the state rests on (by name; whenever motion is off at any
 * level, the still is all that shows). `speaking` is the walk loop continuing: the player keeps the running loop rather
 * than restarting it at the first token. `error`, `offline` and `idle` play nothing and stand; their text twins carry them.
 */
export const CLIPS = {
  peek: { atlas: "stamp-peek", seq: peekSeq, loop: false, still: "peek" },
  retract: { atlas: "stamp-peek", seq: [...peekSeq].reverse(), loop: false, still: "retract" },
  walk: { atlas: "full-walk", seq: runSeq, loop: true, still: "stand" },
  speaking: { atlas: "full-walk", seq: runSeq, loop: true, still: "stand", continues: "walk" },
  hop: { atlas: "full-hop-flight", seq: [...expose(span(0, 23), 1), ...hold(23, 4)], loop: false, still: "stand" },
  wave: { atlas: "full-wave-bow", seq: [...expose(span(0, 14), 3), ...hold(14, 6)], loop: false, still: "stand" },
  error: { atlas: null, seq: [], loop: false, still: "stand" },
  offline: { atlas: null, seq: [], loop: false, still: "stand" },
  idle: { atlas: null, seq: [], loop: false, still: "stand" },
};
export const STATES = ["peek", "retract", "walk", "speaking", "hop", "wave", "error", "offline", "idle"];
/** The resting drawing as the player draws it once `full-hop-flight` is loaded: the atlas cell the hop lands on, through
 *  the same background path as the run and the flight, so the landing hand-over is no cut at all. The `stand` still is
 *  used only before any atlas has loaded (a page load with history) and whenever motion is off. */
export const REST = { atlas: STILLS.stand.atlas, cell: STILLS.stand.cell };
/** The tutor avatar's still per state (a name in STILLS). */
export const AVATAR_STILL = Object.fromEntries(STATES.map((s) => [s, CLIPS[s].still]));
/** The atlas each still was cut from (its framing places it). */
export const STILL_ATLAS = Object.fromEntries(Object.entries(STILLS).map(([k, v]) => [k, v.atlas]));
export const seconds = (state) => CLIPS[state].seq.length / FPS;
/** The distinct drawings of a clip in order (holds collapsed), thinned to at most `max` for a frame strip. */
export function drawings(state, max = 8) {
  const seq = CLIPS[state].seq; const out = [];
  for (const c of seq) if (out[out.length - 1] !== c) out.push(c);
  if (out.length <= max) return out;
  const step = (out.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => out[Math.round(i * step)]);
}

const pct = (x) => `${+x.toFixed(4)}%`;
/** Where the 256 px camera cell sits in a slot (percent of the slot): the shared full-body framing, an atlas's own
 *  union-circle framing, or the peek's wall. */
export function frameGeometry(atlas) {
  if (atlas === "stamp-peek") return { left: `${PEEK_WALL_LEFT}%`, top: "0%", width: "100%", height: "100%" };
  if (AVATAR_ATLASES.includes(atlas)) return { left: pct(SHARED.leftPercent), top: pct(SHARED.topPercent), width: pct(SHARED.sizePercent), height: pct(SHARED.sizePercent) };
  const f = FRAMING[atlas]; const size = f.s * 100;
  return { left: pct(50 - (f.cx / 256) * size), top: pct(50 - (f.cy / 256) * size), width: pct(size), height: pct(size) };
}
/** The geometry of every atlas a placement can use, for the preview's player. */
export const GEOMETRY = Object.fromEntries(Object.keys(INVENTORY.framing).map((a) => [a, frameGeometry(a)]));
const stillSize = (slot) => (slot <= 32 ? 64 : slot <= 64 ? 128 : 192);
const geo = (g) => `left:${g.left};top:${g.top};width:${g.width};height:${g.height}`;

/**
 * A still pose (the 2x WebP of the slot), decorative to assistive technology.
 * name: a key of STILLS. opts.as: the state it stands for (data-state; default the name).
 * opts.ink: in light mode a still in a reading column is placed by its ink box (DESIGN.md § Companion › Framing).
 * opts.url: maps "mascot/…" to the page's URL for it (a relative path, or a data URI in the preview).
 */
export function still(name, slot, opts = {}) {
  const s = STILLS[name]; if (!s) throw new Error(`no still named ${name}`);
  const px = stillSize(slot); if (!s.sized[px]) throw new Error(`still ${name} has no ${px} px export`);
  const url = opts.url || ((p) => `../assets/${p}`);
  const file = `mascot/stills/${name}.${px}.webp`;
  const cls = ["kiwi", opts.cls, opts.ink ? "ink-aligned" : ""].filter(Boolean).join(" ");
  const style = `--slot:${opts.slotVar || `${slot}px`}${opts.ink ? `;--ink-left:${s.ink.left}` : ""}`;
  return `<span class="${cls}" style="${style}" data-mascot="still" data-state="${opts.as || name}" data-still="${name}" data-cell="${s.cell}" aria-hidden="true"><span class="kiwi-frame" style="${geo(frameGeometry(s.atlas))};background-image:url('${url(file)}');background-size:100% 100%"></span></span>`;
}
/** One drawing of an atlas (a 6 × 4 sprite of `cellPx` cells) at `slot` px. */
export function cell(atlas, index, slot, cellPx, opts = {}) {
  const url = opts.url || ((p) => `../assets/${p}`);
  const col = index % COLS, row = Math.floor(index / COLS);
  const pos = `${+(col / (COLS - 1) * 100).toFixed(3)}% ${+(row / (ROWS - 1) * 100).toFixed(3)}%`;
  const cls = ["kiwi", opts.cls].filter(Boolean).join(" ");
  return `<span class="${cls}" style="--slot:${slot}px" data-mascot="cell" data-atlas="${atlas}" data-cell="${index}" aria-hidden="true"><span class="kiwi-frame" style="${geo(frameGeometry(atlas))};background-image:url('${url(`mascot/atlas/${atlas}.${cellPx}.webp`)}');background-size:${COLS * 100}% ${ROWS * 100}%;background-position:${pos}"></span></span>`;
}
/** Every Phase 4 file these helpers can reference (the audit's allowlist for DW-7.7's "mascot frames"). */
export function phase4Files() {
  const files = INVENTORY.atlases.map((a) => `mascot/${a.file}`);
  for (const [name, s] of Object.entries(STILLS)) { files.push(`mascot/${s.file}`); for (const z of Object.keys(s.sized)) files.push(`mascot/stills/${name}.${z}.webp`); }
  files.push("mascot/launcher-glyph.svg");
  return files;
}
/** The byte size the inventory records for each sized still and atlas (the audit compares the files against it). */
export function inventoryBytes() {
  return Object.fromEntries([
    ...INVENTORY.atlases.map((x) => [`mascot/${x.file}`, x.bytes]),
    ...Object.entries(STILLS).flatMap(([name, s]) => Object.entries(s.sized).map(([z, b]) => [`mascot/stills/${name}.${z}.webp`, b])),
  ]);
}
