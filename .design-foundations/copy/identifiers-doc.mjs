// identifiers-doc.mjs: the text of the generated lookups block in DESIGN.md (§ Terminology › Labels for ids and codes). One function, used by
// build-copy.mjs to write the block and by check-copy.mjs (F21) to prove the block in the file is the one the data produces.
import { esc } from "./copy-lib.mjs";

const short = (file) => file.split("/").pop();

export function lookupsBlockText(identifiers, resolved) {
  const out = [];
  // lookups, one table each
  for (const [key, lk] of Object.entries(identifiers.lookups)) {
    if (lk.dynamic || lk.table === false) continue;
    const ids = resolved.filter((r) => !r.keep && (r.lk === key)).map((r) => r.id);
    const uses = resolved.filter((r) => !r.keep && r.uses && r.uses.includes(key)).map((r) => r.id);
    out.push(`**${lk.title}.** ${lk.intro}`, "");
    const hasWhat = lk.values.some((v) => v.what);
    out.push(hasWhat ? "| Value | Shown as | What it does |" : "| Value | Shown as |", hasWhat ? "|---|---|---|" : "|---|---|");
    for (const v of lk.values) out.push(hasWhat ? `| \`${v.raw}\` | ${esc(v.label)} | ${esc(v.what || "")} |` : `| \`${v.raw}\` | ${esc(v.label)} |`);
    const where = [...ids, ...uses];
    out.push("", `Rows: ${where.length ? where.map((i) => `\`${i}\``).join(", ") : "none"}.`, "");
  }
  // ids that are resolved to a name at run time
  const dyn = Object.entries(identifiers.lookups).filter(([, lk]) => lk.dynamic);
  out.push("**Ids shown by name.** A UUID is never drawn as text. A select, a chip, a table cell or a sentence that names a class, a user or a webhook draws its name, read as the code already reads it elsewhere; while the name is loading the place waits (a skeleton, never the id), and when it cannot be read the fallback below stands in.", "");
  out.push("| An id of | Shown as | When it cannot be read | Rows |", "|---|---|---|---|");
  for (const [key, lk] of dyn) {
    const ids = resolved.filter((r) => !r.keep && (r.lk === key || (r.uses && r.uses.includes(key)))).map((r) => r.id);
    out.push(`| ${esc(lk.title.replace(/^A /, ""))} | ${esc(lk.shown)} | "${esc(lk.fallback)}" | ${ids.map((i) => `\`${i}\``).join(", ") || "none"} |`);
  }
  out.push("");
  // identifiers drawn as they are, with the reason
  const byReason = new Map();
  for (const e of identifiers.exempt) {
    if (!byReason.has(e.reason)) byReason.set(e.reason, []);
    for (const s of e.sites) byReason.get(e.reason).push(`${short(e.file)}:${s.line}`);
  }
  out.push("**Identifiers drawn as they are.** A few places draw an id or a code on purpose. Each is listed with its reason; `check-copy.mjs` (H11) fails on any other.", "");
  out.push("| Why it stays | Sites |", "|---|---|");
  for (const [reason, sites] of byReason) out.push(`| ${esc(identifiers.reasons[reason])} | ${esc([...new Set(sites)].join(", "))} |`);
  return out.join("\n");
}
