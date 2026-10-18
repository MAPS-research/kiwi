// The words of the Phase 7 mocks, taken by id from the Phase 5 revision index (copy/generated/revisions.json), from a
// route's "kept as is" list, or from a page spec's as-is strings, never typed freely. Every call records the string
// and its source in MANIFEST, which the generator writes beside the renders and the audit reads back (DW-7.7).
// Content (people, classes, files, the student's question, the tutor's answer, code) goes through data(); the frame
// strip's labels through spec(), which accepts only words of kiwi-ui/DESIGN.md § Companion.
import { readFileSync } from "node:fs";
import { REVISIONS, DESIGN_MD, JOURNEY_MD, REPO } from "./paths.mjs";
import { join } from "node:path";

const revisions = JSON.parse(readFileSync(REVISIONS, "utf8"));
const ROWS = new Map();
const KEPT = new Map();
for (const g of revisions.groups) {
  KEPT.set(g.id, g.kept || []);
  for (const r of g.rows) ROWS.set(r.id, r);
}
const DESIGN = readFileSync(DESIGN_MD, "utf8");
const JOURNEY = readFileSync(JOURNEY_MD, "utf8");
const BRANDING = readFileSync(join(REPO, "kiwi-ui", "src", "config", "branding.ts"), "utf8");
const WORDMARK = readFileSync(join(REPO, "kiwi-ui", "src", "components", "Brand", "KiwiWordmark.tsx"), "utf8");
const COMPANION = DESIGN.slice(DESIGN.indexOf("\n## Companion"), DESIGN.indexOf("\n## Voice and tone"));

export const MANIFEST = new Map(); // text -> [{ kind, ref }]
const record = (text, kind, ref) => {
  if (!text) throw new Error(`empty string from ${kind} ${ref}`);
  const list = MANIFEST.get(text) || [];
  if (!list.some((e) => e.kind === kind && e.ref === ref)) list.push({ kind, ref });
  MANIFEST.set(text, list);
  return text;
};

// the count helper of § Dates, times and numbers: the singular at exactly 1, else the plural on the phrase's last word
const fmt = (n) => Number(n).toLocaleString("en-US");
const plural = (w) => (/(s|x|z|ch|sh)$/.test(w) ? w + "es" : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + "ies" : w + "s");
export const count = (n, phrase) => {
  const words = phrase.trim().split(/\s+/);
  if (Number(n) !== 1) words[words.length - 1] = plural(words[words.length - 1]);
  return `${fmt(n)} ${words.join(" ")}`;
};
const fill = (s, slots, id) =>
  s.replace(/\{(\w+)(?::\s*count\s+([^}]+))?\}/g, (_, name, noun) => {
    if (!(name in slots)) throw new Error(`${id}: no value for {${name}}`);
    return noun ? count(slots[name], noun) : String(slots[name]);
  });

/** A revised string by its index id, slots filled ({n: count user} by the count helper). */
export function t(id, slots = {}) {
  const r = ROWS.get(id);
  if (!r) throw new Error(`no revision-index row ${id}`);
  if (r.new === "(removed)") throw new Error(`${id} is removed text`);
  return record(fill(r.new, slots, id), "index", id);
}
/** A Companion row whose New is a quoted string ("Paused while you're offline"): the words inside the quotes. */
export function q(id) {
  const r = ROWS.get(id);
  const m = r && /^"(.*)"$/.exec(r.new.trim());
  if (!m) throw new Error(`${id} is not a quoted string`);
  return record(m[1], "index", id);
}
/** A string the route's Copy bullet keeps as is ("Kept as is, because it already follows the guide: …"). */
export function kept(group, text, slots) {
  const list = KEPT.get(group) || [];
  const ok = list.some((entry) => {
    const bare = entry.replace(/\s+\([^)]*\)$/, "");
    return entry === text || bare === text || bare.split(/,\s+/).includes(text);
  });
  if (!ok) throw new Error(`"${text}" is not in ${group}'s kept list: ${JSON.stringify(list)}`);
  return record(slots ? fill(text, slots, group) : text, "kept", group);
}
/** An as-is string quoted in a page spec section of JOURNEY.md and not revised (e.g. SR-6's "Flag this answer").
 *  slots fill {name} slots; literal maps a placeholder letter of the as-is pattern ("[Page N]": { N: 3 }). */
export function asis(section, text, slots = {}, literal = null) {
  const start = JOURNEY.indexOf(`\n### ${section} ·`);
  if (start < 0) throw new Error(`no JOURNEY section ${section}`);
  const end = JOURNEY.indexOf("\n### ", start + 5);
  const body = JOURNEY.slice(start, end < 0 ? undefined : end);
  if (!body.includes(`"${text}"`) && !body.includes(`“${text}”`)) throw new Error(`"${text}" is not quoted in JOURNEY ${section}`);
  let out = fill(text, slots, section);
  if (literal) for (const [k, v] of Object.entries(literal)) out = out.split(k).join(String(v));
  return record(out, "as-is", section);
}
/** A numeral of the clip table (a drawing's cell index), shown on the frame strip. */
export function cellNo(n) {
  if (!Number.isInteger(n) || n < 0 || n > 23) throw new Error(`no cell ${n}`);
  return record(String(n), "annotation", "DESIGN.md § Companion clip table (cell index)");
}
/** A word the shared-strings table names inside its row (DS.03 "the others are Light and Dark"; DS.08 its visible label "Stop"). */
export function doc(id, text) {
  const line = DESIGN.split("\n").find((l) => l.includes(`\`${id}\``));
  if (!line || !line.includes(text)) throw new Error(`"${text}" is not in DESIGN.md's ${id} row`);
  return record(text, "design", id);
}
/** The branding default (src/config/branding.ts) or the wordmark's own text (KiwiWordmark.tsx). */
export function brand(key) {
  if (key === "INSTITUTION_NAME") {
    if (!/VITE_INSTITUTION_NAME \|\| "Kiwi"/.test(BRANDING)) throw new Error("branding default changed");
    return record("Kiwi", "branding", "INSTITUTION_NAME default");
  }
  if (key === "wordmark") {
    if (!/>\s*Kiwi\s*</.test(WORDMARK)) throw new Error("KiwiWordmark text changed");
    return record("Kiwi", "branding", "KiwiWordmark");
  }
  throw new Error(`unknown brand key ${key}`);
}
/** Demo content: fictional people, classes, files, questions, answers and code. Not interface copy. */
export function data(text) {
  return record(String(text), "content", "demo data");
}
/** A label of the frame strip, quoted from kiwi-ui/DESIGN.md § Companion only (annotation, not product UI). */
export function spec(text) {
  if (!COMPANION.includes(text)) throw new Error(`"${text}" is not in DESIGN.md § Companion`);
  return record(text, "annotation", "DESIGN.md § Companion");
}
export const manifestJson = () =>
  [...MANIFEST].map(([text, sources]) => ({ text, sources })).sort((a, b) => a.text.localeCompare(b.text));
