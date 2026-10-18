// build-copy.mjs: resolve the revision data and write the generated parts of the words.
//
//   node build-copy.mjs          resolve, write generated/revisions.json, splice JOURNEY.md and DESIGN.md
//   node build-copy.mjs --dry    resolve and report only (no file is touched)
//
// Inputs: ./revisions/*.json (the data), the source files named in it (read-only), kiwi-ui/JOURNEY.md and
// kiwi-ui/DESIGN.md (the two places the generated blocks live, between <!-- copy:… --> markers).
// Nothing under kiwi-ui/src, kiwi-ui/public or kiwi/ is ever written.
import fs from "node:fs";
import path from "node:path";
import { DESIGN_MD, JOURNEY_MD, OUT_DIR, rowObject, esc, code, loadTestInventory, loadIdentifiers, reconcileTests, reconcileText } from "./copy-lib.mjs";
import { lookupsBlockText } from "./identifiers-doc.mjs";
import { resolveAll } from "./resolve.mjs";

const DRY = process.argv.includes("--dry");

const { groups, resolved, problems } = resolveAll();

// ------------------------------------------------------------------ render
const anchorText = (anchors) => anchors.map((a) => {
  if (a.at) return a.at;
  const shown = a.lines.slice(0, 5).join(",") + (a.lines.length > 5 ? `,+${a.lines.length - 5}` : "");
  return `${a.file}:${shown}`;
}).join("; ");
// Every test reference, untruncated, grouped by file: `3 · Login.test.tsx:113,140r; Register.test.tsx:74r`.
// A letter after a line number says how the line refers to the string: r = a regular-expression query on the old string,
// m = another line that quotes it, n = a query that already asks for the NEW text, k = a query for a part of the old string the row
// keeps; no letter = a string query on the old string (getByText("…"), getByRole(…, { name: "…" }), …).
const testsText = (t) => {
  if (!t.length) return "-";
  const byFile = new Map();
  for (const x of t) {
    if (!byFile.has(x.name)) byFile.set(x.name, []);
    byFile.get(x.name).push(x.line + (x.via === "regex" ? "r" : x.via === "text" ? "m" : x.via === "new" ? "n" : x.via === "kept" ? "k" : ""));
  }
  return `${t.length} · ` + [...byFile].map(([n, ls]) => `${n}:${ls.join(",")}`).join("; ");
};

function pageBlock(g) {
  // a kept row holds a position (so ids never move) and says nothing here: the string is already right
  const rows = g.rowsResolved.filter((r) => !r.keep);
  const head = [];
  if (!rows.length) {
    head.push(`- **Copy (Phase 5):** no change. ${g.noChange || "Nothing here carries copy."}`);
  } else {
    const used = [...new Set(rows.flatMap((r) => r.rules))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    const kept = g.kept && g.kept.length ? ` Kept as is, because it already follows the guide: ${g.kept.join("; ")}.` : "";
    head.push(`- **Copy (Phase 5):** ${rows.length} string${rows.length === 1 ? "" : "s"} revised (rules ${used.join(", ")}); every row is in the [Revision index](#revision-index).${kept}${g.note ? " " + g.note : ""}`);
    for (const r of rows) {
      const refs = r.refs ? ` [${r.refs.replace(/,/g, ", ")}]` : "";
      head.push(`  - \`${r.id}\` ${code(r.old)} → ${code(r.new)} · ${r.rules.join(", ")} · ${r.why}${refs}`);
    }
  }
  return head.join("\n");
}

function indexTable() {
  const lines = ["| ID | Route | Anchor | Old | New | Rules | Tests |", "|---|---|---|---|---|---|---|"];
  for (const g of groups) {
    for (const r of g.rowsResolved.filter((x) => !x.keep)) {
      const route = g.route ? `${g.id} \`${g.route}\`` : g.id;
      lines.push(`| \`${r.id}\` | ${esc(route)} | ${esc(anchorText(r.anchors))} | ${esc(code(r.old))} | ${esc(code(r.new))} | ${r.rules.join(", ")} | ${testsText(r.tests)} |`);
    }
  }
  return lines.join("\n");
}

function sharedTable() {
  const g = groups.find((x) => x.id === "DS");
  const lines = ["| ID | Where it shows | Supersedes (a Phase 3 placeholder, or the string the code shows today) | Final wording | Rules |", "|---|---|---|---|---|"];
  if (!g) return lines.join("\n");
  g.rowsResolved.forEach((r, i) => {
    const raw = rowObject(g.rows[i]);
    lines.push(`| \`${r.id}\` | ${esc(raw.w || "")} | ${r.keep ? "kept" : esc(code(r.old))} | ${esc(code(r.new))} | ${r.rules.join(", ")} |`);
  });
  return lines.join("\n");
}

// The native date, date-time and time inputs to replace: one table row per site, generated from the rows that carry a date mode.
function dateFieldsTable() {
  const lines = ["| Page | Anchor | Native input | Becomes |", "|---|---|---|---|"];
  const sites = new Set();
  for (const g of groups) {
    for (const r of g.rowsResolved.filter((x) => x.dt)) {
      const route = g.route ? `${g.id} \`${g.route}\`` : g.id;
      for (const a of r.anchors.filter((x) => x.file)) for (const l of a.lines) { lines.push(`| ${esc(route)} | ${a.file}:${l} | ${esc(code(r.old))} | ${esc(r.new)} |`); sites.add(`${a.file}:${l}`); }
    }
  }
  const files = new Set([...sites].map((x) => x.split(":")[0]));
  lines.push("", `${sites.size} controls in ${files.size} files. A control that two pages show (the class access form, \`AddClassFeature.tsx:144\`, on A-06 and A-15) is listed under each page and counted once.`);
  return lines.join("\n");
}

const byKind = {};
for (const r of resolved) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
const changed = resolved.filter((r) => !r.keep);
const summary = {
  groups: groups.length, rows: resolved.length, changed: changed.length,
  routes: groups.filter((g) => g.rowsResolved.length).length,
  byKind, errors: byKind.error || 0,
  anchored: changed.filter((r) => r.anchors.some((a) => a.file)).length,
  withTests: changed.filter((r) => r.tests.length).length,
  problems: problems.length,
};

console.log(JSON.stringify(summary));
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems.slice(0, 80)) console.error("  - " + p);
  if (problems.length > 80) console.error(`  … and ${problems.length - 80} more`);
  process.exitCode = 1;
}
if (DRY || problems.length) process.exit(process.exitCode || 0);

// ------------------------------------------------------------------ write
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "revisions.json"), JSON.stringify({ summary, groups: groups.map((g) => ({ id: g.id, name: g.name, route: g.route, noChange: g.noChange, kept: g.kept, rows: g.rowsResolved })) }, null, 1) + "\n");

const M = (name, which) => `<!-- copy:${name}:${which} -->`;
function replaceBetween(text, name, content) {
  const a = text.indexOf(M(name, "start")), b = text.indexOf(M(name, "end"));
  if (a < 0 || b < 0 || b < a) return null;
  return text.slice(0, a) + M(name, "start") + "\n" + content + "\n" + text.slice(b);
}

// ---- JOURNEY.md
let j = fs.readFileSync(JOURNEY_MD, "utf8");
const jOriginalLen = j.length;
for (const g of groups) {
  if (!/^(SR-\d|S-\d\d|A-\d\d)$/.test(g.id)) continue;
  const block = pageBlock(g);
  const replaced = replaceBetween(j, g.id, block);
  if (replaced !== null) { j = replaced; continue; }
  const headRe = new RegExp(`^### ${g.id.replace("-", "\\-")} · .*$`, "m");
  const h = headRe.exec(j);
  if (!h) { console.error(`no heading for ${g.id} in JOURNEY.md`); process.exit(1); }
  const after = j.slice(h.index + h[0].length);
  const next = after.search(/^### |^---$/m);
  const scope = next < 0 ? after : after.slice(0, next);
  const t = scope.search(/^- \*\*Tour defects \(in boundary\):\*\*/m);
  if (t < 0) { console.error(`no "Tour defects (in boundary)" bullet in ${g.id}`); process.exit(1); }
  const at = h.index + h[0].length + t;
  j = j.slice(0, at) + M(g.id, "start") + "\n" + block + "\n" + M(g.id, "end") + "\n" + j.slice(at);
}
// redirects R-1..R-5
const rGroups = groups.filter((g) => /^R-\d$/.test(g.id));
if (rGroups.length) {
  const content = rGroups.map((g) => `- **${g.id}:**\n  ${pageBlock(g).replace(/\n/g, "\n  ")}`).join("\n");
  const rep = replaceBetween(j, "R", content);
  if (rep !== null) j = rep;
  else {
    const at = j.indexOf("**Guard redirects** (behaviour of the wrappers");
    if (at < 0) { console.error("no Guard redirects paragraph in JOURNEY.md"); process.exit(1); }
    j = j.slice(0, at) + "**Copy (Phase 5) on the redirect rows**\n\n" + M("R", "start") + "\n" + content + "\n" + M("R", "end") + "\n\n" + j.slice(at);
  }
}
// revision index
const inv = loadTestInventory().stats;
const nPages = groups.filter((g) => /^(SR-\d|S-\d\d|A-\d\d|R-\d)$/.test(g.id)).length;
const c9Other = changed.filter((r) => r.kind !== "error" && r.rules.includes("C9")).map((r) => r.id);
const c9All = changed.filter((r) => r.rules.includes("C9")).length;
const indexIntro = [
  "## Revision index",
  "",
  `Every string Phase 5 changes, by route: the hand-off for the implementation plan (copy and the ${inv.queries} text queries and assertions in the ${inv.queryFiles} test files that have them, of ${inv.testFiles} test files in all, change together) and for Phase 6 and Phase 7 (a mock string is either the as-is string in its page spec or its revised form here). Generated from \`.design-foundations/copy/revisions/*.json\`, the same data that writes each \`Copy (Phase 5)\` bullet above and the shared-strings table in \`kiwi-ui/DESIGN.md § Voice and tone\`, so the three cannot disagree; \`node .design-foundations/copy/check-copy.mjs\` re-reads the source and fails if an old string is not at its anchor.`,
  "",
  `**${changed.length} rows** across ${summary.routes} routes and shared groups (${summary.errors} error messages, each citing C9; ${c9Other.length} other rows cite it too: ${c9Other.join(", ")}, the no-permission heading and the Companion's error twins; ${c9All} rows in all). **ID** is \`route.nn\`; \`DS\` rows are the design system's shared strings (they supersede Phase 3's placeholders, which sit in locked text), \`CP\` rows are the Companion's text twins (revised in place), \`EM\` rows the email templates. **Anchor** is \`file:line\` relative to \`kiwi-ui/\` (\`../kiwi/\` is the backend), resolved by the generator from the old text, never typed; a string used in several places lists each line. **Old** is the as-is string (a \`{slot}\` is a value filled at run time; \`(none)\` means there was no text, so the row is new copy); **New** is the string to ship (\`(removed)\` means the text is dropped and nothing replaces it: a client library's \`error.message\`, a claim the product cannot back). A string that the code builds with a conditional piece (the text S-07.03 replaces is \`Login failed.\` followed, when a support address is set, by \` Please contact {SUPPORT_EMAIL}.\`) is one row for each text it can draw, and the Old of a row is the whole text of one of them: S-07.03 is \`Login failed. Please contact {SUPPORT_EMAIL}.\` and S-07.05 is \`Login failed.\`; \`check-copy.mjs\` (A1, H13, E9) reads the source with the TypeScript compiler to find those texts and fails on a row that carries the Old of one for another, on a text with no row while another has one, and on a test that quotes a text no row has as its Old. A row whose Old is a code expression (a \`toLocaleString()\` call, \`format(date, "MMM d")\`, \`String(error)\`) shows the displayed example in New, for instance \`17 Oct 2026, 14:05\`; a row whose Old has a \`{slot}\` keeps the slot in New and, for a date or a number, names its formatter (\`{date: D MMM YYYY}\`; a count names its noun, \`{n: count student}\`, which reads 1 student or 2 students), and \`check-copy.mjs\` (D5) fails when New drops a slot that Old had unless the row's note says why. **Rules** are the C-numbers in \`DESIGN.md § Voice and tone\`. **Tests** lists every test reference to the old string, untruncated, as \`file:line\` grouped by file after a count (\`kiwi-ui/src/**/*.test.*\`): a string query (\`getByText("…")\`, \`getByRole(…, { name: "…" })\`, \`getByLabelText\`, \`toHaveTextContent\` and the like) matched by equality, or by containment when the query is a whole sentence of the old string or contains it (a query for a term that the old sentence merely contains, such as the tool name "Code Interpreter" inside A-22.31's sentence, where other elements draw the name and its badge, is not a reference to the sentence and is not listed); a **regular-expression query** run on the old string (\`r\` after the line number, as in \`140r\`); and any other test line that quotes it (\`m\`, as in \`88m\`; a literal that is a whole sentence of the old string counts from 12 characters, as a query does). Two more letters mark a test that does not query the old string: \`n\`, a query that already asks for the **New** text (it will match the new string, or match twice: \`AgentStepChain.test.tsx:80n\` asks for the header "Working…", which a step with no name would repeat), and \`k\`, a query for a part of the old string the row keeps (the dots of the loader in \`Loader.test.tsx\`, which stay in their own element). An equal literal counts at any length, a negative assertion (\`queryBy…\` with \`not.toBeInTheDocument()\`) and a fixture included; a test that would pass vacuously after the change says so in the row's note (S-05.08). A row anchored by section only (the design system's placeholders, the Companion's twins) or by a backend file shows \`-\`: no UI test can reach it, and where a component draws the string today the row is anchored to it (DS.12 is \`CopyButton.tsx\`). The inventory is complete for literal queries: ${inv.queries} queries and text assertions in ${inv.queryFiles} files (${inv.string} string literals, ${inv.regex} regular expressions in ${inv.regexFiles} files, ${inv.roleOnly} role queries with no name and ${inv.dynamic} with a variable or a function matcher, which no wording change breaks by itself). The research brief's "~529 queries" is the count of \`getByText\`, \`getByRole\`, \`getByLabelText\` and \`getAllByText\` alone (${inv.briefKinds} in ${inv.briefFiles} files), and its "78" is the number of test files, not the number that query text.`,
  "",
  reconcileText(reconcileTests(changed)),
  "",
].join("\n");
const indexBody = indexTable();
const appendedKeep = (() => {
  const a = j.indexOf(M("appended", "start")), b = j.indexOf(M("appended", "end"));
  return a >= 0 && b > a ? j.slice(a + M("appended", "start").length, b).trim() : "Later phases append their rows here, in the same columns, with the id prefix of their phase (Phase 6: chart summaries and table units, `P6-…`). Phase 5 rows above never change id.";
})();
const indexSection = `${M("index", "start")}\n${indexIntro}\n${indexBody}\n\n### Rows appended by later phases\n\n${M("appended", "start")}\n${appendedKeep}\n${M("appended", "end")}\n${M("index", "end")}`;
{
  const a = j.indexOf(M("index", "start")), b = j.indexOf(M("index", "end"));
  if (a >= 0 && b > a) j = j.slice(0, a) + indexSection + j.slice(b + M("index", "end").length);
  else {
    const at = j.indexOf("\n## Appendices");
    if (at < 0) { console.error("no ## Appendices heading in JOURNEY.md"); process.exit(1); }
    j = j.slice(0, at) + "\n" + indexSection + "\n\n---\n" + j.slice(at);
  }
}
fs.writeFileSync(JOURNEY_MD, j);

// ---- DESIGN.md (the shared-strings table only)
let d = fs.readFileSync(DESIGN_MD, "utf8");
const dRep = replaceBetween(d, "shared", sharedTable());
if (dRep === null) console.log("(DESIGN.md has no copy:shared markers yet; skipped)");
else d = dRep;
const dRep2 = replaceBetween(d, "datefields", dateFieldsTable());
if (dRep2 === null) console.log("(DESIGN.md has no copy:datefields markers yet; skipped)");
else d = dRep2;
const dRep3 = replaceBetween(d, "lookups", lookupsBlockText(loadIdentifiers(), resolved));
if (dRep3 === null) console.log("(DESIGN.md has no copy:lookups markers yet; skipped)");
else d = dRep3;
fs.writeFileSync(DESIGN_MD, d);

console.log(`wrote generated/revisions.json; JOURNEY.md ${jOriginalLen} -> ${j.length} chars; ${nPages} page groups`);
