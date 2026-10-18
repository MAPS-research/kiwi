// check-copy.mjs: the evidence for Phase 5 (Words). Exits 1 if any check fails.
//
//   node check-copy.mjs            run every check and print the report
//   node check-copy.mjs --write    also write generated/check-summary.json and the Evidence table in DESIGN.md
//
// Phase 6 (Data surfaces) added Q1 to Q6 (its rows, linted and placed apart from Phase 5's) and the lock checks L4 to L6 against the commit before Phase 6; L1 to L3 are unchanged.
// Reads (never writes, except with --write): ./revisions/*.json, the source files they name, kiwi-ui/JOURNEY.md, kiwi-ui/DESIGN.md,
// and `git diff` of those two files against the commit before Phase 5 (the lock check: HEAD holds Phase 5 since it was committed). No path in this file is machine-specific.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  ROOT, UI, DESIGN_MD, JOURNEY_MD, OUT_DIR, HERE, RULES, CAUSES, CAUSES_MCP, MCP_GROUPS, UI_REFS, lintString, lintSource, normText, PROPER, agreeCountHits, loadTestInventory, rowObject, readSource, lineOfOffset, loadIdentifiers, SINGLE_VERB_OK, EXIT_WORDS, CAUSE_STEMS, bareCountHits, NOT_NOUN, TWO_WORD_OK, NON_OBJECT, namesObject, SAFE_LINE, WRITE_VERBS, EXEMPT_VERBS, citesIn, anchorVerdict, oldKeys, readingKey, isTextReading, SCOPED_TERMS, scopedTermHits, AUDIT, codeHash, manualPopulation, reconcileTests, reconcileText,
} from "./copy-lib.mjs";
import { resolveAll } from "./resolve.mjs";
import { scanSources } from "./scan-ts.mjs";
import { lookupsBlockText } from "./identifiers-doc.mjs";
import { UNIT, E2E } from "./proofs.mjs";

const WRITE = process.argv.includes("--write");
const report = [];
const stats = {};
let failed = 0;
function check(id, name, ok, detail = "") {
  report.push({ id, name, ok, detail });
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${name}${detail ? "  -  " + detail : ""}`);
}
const ALL = process.argv.includes("--all");
const list = (a, n = 12) => (ALL ? a : a.slice(0, n)).join("\n        ") + (!ALL && a.length > n ? `\n        … and ${a.length - n} more` : "");

const { groups, resolved, problems } = resolveAll();
const rows = resolved.filter((r) => !r.keep && !r.phase6); // Phase 5's rows: every Phase 5 count, lint population and block below is computed from these
const rows6 = resolved.filter((r) => !r.keep && r.phase6); // Phase 6's rows (revisions/09-data-surfaces.json, `phase: 6`): linted and indexed apart (Q1 to Q6)
const groups6 = groups.filter((g) => g.phase === 6);
const journey = fs.readFileSync(JOURNEY_MD, "utf8");
const design = fs.readFileSync(DESIGN_MD, "utf8");
// The files and directories the source scan leaves out, each with its reason (moved up in the tenth review: A1 and E9 read the type scan too).
const OUT = [
  [/^src\/agent\//, "model-facing tool descriptions and tool-result messages"],
  [/^src\/apps\/(bridge|host|registry|types|classApps)\//, "app bridge, unmounted widget host, types"],
  [/^src\/setupTests/, "test setup"],
  [/^src\/utils\/(documentPipeline|validatePythonFile)/, "orphan: no importer (SF-09)"],
  [/^src\/components\/(RecitationDetail|ThumbnailViewer|Header|LectureCard)\//, "orphan: no importer (SF-09)"],
  [/^src\/components\/Analytics\/(UserLogin|SessionDaily|PDFType|CodeRelated|SinglePDFs|TopActions|UserTime)\.tsx/, "orphan: no importer (SF-09)"],
  [/^src\/components\/Register\/Register\.tsx/, "orphan: no importer (SF-09)"],
  [/^src\/components\/Chat\/ChatComponent\.tsx/, "dead code: only its IDEContext is imported (SF-54)"],
  [/^src\/components\/PanelHeader\//, "dead code: used only by the dead ChatComponent (SF-54)"],
  [/^src\/pages\/admin\/ClassManagement\.tsx/, "orphan: no importer (SF-09)"],
  [/^src\/components\/QuestionCard\//, "orphan: used only by the orphaned RecitationDetail"],
  [/^src\/utils\/(evaluationFieldMapper|timeUtils)\.ts$/, "orphan: used only by the orphaned RecitationDetail"],
  [/^src\/components\/Analytics\/chartXAxis\.ts$/, "chart axis ticks pin en-US already; compact chart formats are Phase 6's"],
  [/^src\/Theme\.ts$|^src\/theme\//, "theme tokens, not interface text"],
];
// the scans that read types (scan-ts.mjs) run once, here: the census of visible text, the conditionals and the templates feed A1, E9, H1 and H11 to H15
let tsScan = null, tsScanError = null;
try { tsScan = scanSources((rel) => OUT.some(([re]) => re.test(rel))); } catch (e) { tsScanError = e.message; }

// ---------------------------------------------------------------- 1. anchors
const srcAnchored = rows.filter((r) => r.anchors.some((a) => a.file));
// A1 also asks that the anchor is exact (m10): the cited line itself holds the old text (as a whole word or phrase, not inside an identifier), or a fragment of it
// when the text is split across expressions, or the row says why its anchor is a neighbouring line (`ax`) and the text is within 8 lines of it. A row that cites
// the handler a button runs, with the label on a later line, is drift: it was how A-11.59 cited :1308 for a label at :1315.
//
// The tenth review (C-2): a fragment is not enough where the line builds its text with a conditional piece (`Login failed.${support ? ` Please contact ${support}.` : ""}`
// draws "Login failed." or "Login failed. Please contact {x}."). S-07.04 and S-07.05 carried the longer text as their Old and passed on the fragment of it, while the code's other
// reading, the text the rows were written for, had no row. On such a line the Old must be a whole reading of the template (the type scan reads them: scan-ts.mjs `templates`), and
// a row that drops a slot which only the reading it names draws replaces another reading: it is the variant for the reading without the slot, so its Old is that reading.
const tplByFile = new Map();
for (const t of tsScan ? tsScan.templates : []) { if (!tplByFile.has(t.file)) tplByFile.set(t.file, []); tplByFile.get(t.file).push(t); }
// a template that draws more than one TEXT (not just a plural, a colour or a block of markup): single-line readings, at least one of two words or more
const isTextTemplate = (t) => t.spans.some((sp) => !sp.plural) && t.readings.every((x) => !/[\n<>;]/.test(x) && x.length <= 200 && !/#[0-9a-fA-F]{3,8}\b/.test(x)) && t.readings.some(isTextReading);
const templatesAt = (file, ln) => (tplByFile.get(file) || []).filter((t) => isTextTemplate(t) && ln >= t.line && ln <= t.endLine);
const slotCount = (x) => (normText(x).match(/\$?\{[^}]*\}/g) || []).length;
const shownReading = (x) => JSON.stringify(x.replace(/\{x\}/g, "{…}"));
const driftFails = []; const axStats = { exact: 0, fragment: 0, reading: 0, exempt: 0, stated: 0 }; const axUsed = new Set(); const axNeeded = new Set();
for (const r of rows) {
  if (!r.old) continue;
  for (const a of r.anchors.filter((x) => x.file && !x.file.startsWith(".."))) for (const ln of a.lines) {
    const v = anchorVerdict(a.file, ln, r);
    const tpls = ["exempt", "stated", "far", "missing"].includes(v.v) ? [] : templatesAt(a.file, ln);
    let verdict = v.v; const here = `${r.id}: ${a.file.split("/").pop()}:${ln}`;
    if (tpls.length) {
      const keys = oldKeys(r.old);
      const own = tpls.find((t) => t.readings.some((x) => keys.includes(readingKey(x))));
      if (verdict === "fragment") {
        if (own) verdict = "reading";
        else { driftFails.push(`${here} builds its text with a conditional (it draws ${tpls[0].readings.map(shownReading).join(" or ")}): the Old is none of those, and a fragment of one is not enough; give the Old of the reading this row replaces`); verdict = "template"; }
      }
      if (own && (verdict === "reading" || verdict === "exact")) {
        const oldN = slotCount(r.old), newN = slotCount(r.new);
        const better = newN < oldN ? own.readings.find((x) => !keys.includes(readingKey(x)) && slotCount(x) <= newN && slotCount(x) < oldN) : null;
        if (better) driftFails.push(`${here} drops a slot that only the text it names draws (${shownReading(own.readings.find((x) => keys.includes(readingKey(x))) || r.old)}), so it replaces the other reading of the same template: its Old should be ${shownReading(better)}`);
      }
    }
    if (verdict === "exact") axStats.exact++;
    else if (verdict === "fragment") axStats.fragment++;
    else if (verdict === "reading") axStats.reading++;
    else if (verdict === "template") { /* reported above */ }
    else if (verdict === "exempt") axStats.exempt++;
    else if (verdict === "stated") { axStats.stated++; axUsed.add(r.id); }
    else if (verdict === "far") driftFails.push(`${here} is more than 8 lines from "${normText(r.old).slice(0, 40)}", so its ax (${r.ax.slice(0, 50)}) does not hold`);
    else driftFails.push(`${here} does not hold "${normText(r.old).slice(0, 40)}"${v.near ? ` (it stands ${v.near > 0 ? "+" : ""}${v.near} lines away)` : ""}; anchor the line that holds it, or say why in ax`);
    if (verdict !== "stated") axNeeded.add(r.id);
  }
}
for (const r of rows) if (r.ax && !axUsed.has(r.id)) driftFails.push(`${r.id}: has an ax, but every anchored line holds its text or a fragment of it, so the ax says nothing true: remove it`);
stats.anchors = { ...axStats, axRows: axUsed.size };
check("A1", "every old string is found at its anchor in the source, and the anchor is exact: the cited line holds the text (or a fragment of a split sentence), or the row says why it cites a neighbouring line (ax); where the line builds its text with a conditional, the Old is a whole reading of it and a row that drops a slot replaces the reading without it", problems.length === 0 && driftFails.length === 0, problems.length || driftFails.length ? `\n        ${list([...problems, ...driftFails], 40)}` : `${srcAnchored.length} source-anchored rows, ${rows.length - srcAnchored.length} anchored by section (DESIGN.md or JOURNEY.md); ${axStats.exact + axStats.fragment + axStats.reading + axStats.exempt + axStats.stated} anchored lines: ${axStats.exact} hold the text, ${axStats.fragment} a fragment of it, ${axStats.reading} a whole reading of a text the code builds with a conditional, ${axStats.exempt} are lookups, code or slots, ${axStats.stated} cite a neighbour with a stated reason (${axUsed.size} rows)`);
stats.rows = rows.length; stats.keptShared = resolved.filter((r) => !r.phase6).length - rows.length; stats.sourceAnchored = srcAnchored.length;
const ids = new Set(); const dup = [];
for (const r of resolved) { if (ids.has(r.id)) dup.push(r.id); ids.add(r.id); }
check("A2", "revision ids are unique", dup.length === 0, dup.join(", "));

// ---------------------------------------------------------------- 2. lints on every new string
const lintFails = [];
for (const r of rows) {
  // a lookup row lists several labels joined by " · ": each is a string of its own
  const parts = r.lk && r.lkVals && r.lkVals.length ? r.new.split(" · ") : [r.new];
  const h = [...new Set(parts.flatMap((p) => lintString(p, r.kind, r.x)))];
  if (h.length) lintFails.push(`${r.id} [${r.kind}] ${r.new.slice(0, 90)} -> ${h.join(" | ")}`);
}
check("B1", "every new string passes the lints (case, marks, terms, person, plurals, dates)", lintFails.length === 0, lintFails.length ? `\n        ${list(lintFails)}` : `${rows.length} strings, ${rows.filter((r) => r.x.length).length} with a written exemption`);
stats.exempted = rows.filter((r) => r.x.length).length;
const badRules = rows.filter((r) => r.rules.some((c) => !RULES[c]));
check("B2", "every rule cited exists", badRules.length === 0, badRules.map((r) => r.id).join(", "));
const refMissing = [];
for (const r of rows) for (const ref of String(r.refs).split(/[,\s]+/).filter(Boolean)) if (!new RegExp(`\\b${ref}\\b`).test(journey)) refMissing.push(`${r.id}:${ref}`);
check("B3", "every TD-, SF- and B- reference exists in JOURNEY.md", refMissing.length === 0, refMissing.join(", "));
const blame = rows.filter((r) => /\byou (entered|typed|forgot|failed|must have|did not|didn't enter)\b|invalid input|your fault/i.test(r.new));
check("B4", "no blame wording", blame.length === 0, blame.map((r) => r.id).join(", "));

// ---------------------------------------------------------------- 3. error anatomy
const errs = rows.filter((r) => r.kind === "error");
const errFail = []; const byCause = {}; let emptyWhy = 0, inputRows = 0;
// the first sentence of an input error: no imperative verb (the closed list of the verbs a correction opens with), and a verb of state or a negation, or "No"
const IMPERATIVE_OPEN = /^(?:Please\s+)?(?:Add|Allow|Ask|Attach|Avoid|Change|Check|Choose|Click|Close|Complete|Confirm|Contact|Copy|Correct|Create|Describe|Do not|Don't|Edit|Enable|Enroll|Ensure|Enter|Fill|Fix|Give|Include|Insert|Keep|Look|Make|Never|Open|Paste|Pick|Provide|Re-enter|Reduce|Reenter|Reload|Remove|Replace|Reset|Retry|Review|Save|Select|Set|Shorten|Sign|Specify|Start|Supply|Tap|Try|Turn|Type|Update|Upload|Use|Verify|Wait|Write)\b/;
const STATES_WHAT = /\b(?:is|are|was|were|isn't|aren't|wasn't|weren't|has|have|had|hasn't|haven't|doesn't|don't|didn't|can't|cannot|couldn't|won't|needs?|requires?|must|looks?|required|invalid|missing|empty)\b|^No\b/i;
for (const r of errs) {
  const e = r.err || {};
  byCause[e.c] = (byCause[e.c] || 0) + 1;
  if (!e.what || !/^[A-Z{]/.test(e.what)) errFail.push(`${r.id}: no "what happened"`);
  if (!CAUSES[e.c]) errFail.push(`${r.id}: unknown cause ${e.c}`);
  const whyText = e.why ?? CAUSES[e.c]?.line;
  const fixText = e.fix ?? CAUSES[e.c]?.fix;
  if (!fixText || !String(fixText).trim()) errFail.push(`${r.id}: no "what to do"`);
  // The eighth review: D1 used to accept an empty why (`why: ""`) as an undocumented "authentication and permission pattern", which let S-05.04 open with its cause ("That email and
  // password don't match.") and say nothing about what happened. That exception is retired: every error row says what happened, then why, then what to do. Only the documented
  // input-error form (§ Errors: a statement of what is wrong, the rule applied to this field, then the correction) leaves the why out.
  // The tenth review (C-1) narrows that form. DS.45 to DS.49 opened with the correction ("Enter a date like 17 Oct 2026."), which says what to do and not what is wrong with what was
  // typed. The first sentence of an input error is a statement: it opens with no imperative verb and it carries a verb of state or a negation ("has no", "isn't", "is before"), or "No".
  if (e.c === "input") {
    const first = String(e.what || "");
    inputRows++;
    if (IMPERATIVE_OPEN.test(first)) errFail.push(`${r.id}: an input error opens with what is wrong, not with the correction ("${first.slice(0, 50)}" is an instruction): state the rule as it applies to this field, then give the correction`);
    else if (!STATES_WHAT.test(first)) errFail.push(`${r.id}: the first sentence of an input error states what is wrong ("${first.slice(0, 50)}" does not)`);
  }
  if (e.c !== "input" && String(whyText ?? "").trim() === "") errFail.push(`${r.id}: no "why" for cause ${e.c}: what happened comes first and the cause is a sentence of its own (only the input-error form leaves it out)`);
  // a count of failures is not a why: a partial result names the cause it narrows (the server did not respond as expected, returned an error, did not accept …)
  if (e.c === "partial" && !CAUSE_STEMS.test(String(whyText || ""))) errFail.push(`${r.id}: a partial result's why must be a cause ("The server didn't respond as expected for the other {m}."), not a count or a consequence: "${String(whyText).slice(0, 60)}"`);
  if (e.c === "input" && String(whyText ?? "").trim() === "") emptyWhy++;
  if (/^failed|\bfailed to\b|\boops\b/i.test(r.new)) errFail.push(`${r.id}: "Failed to" or "Oops"`);
  if (/\(\d{3}\)|\bHTTP \d{3}\b/.test(r.new) && !/\{status\}/.test(r.new)) errFail.push(`${r.id}: a status code stands in for words`);
}
check("D1", "every error row has what happened, why and what to do, and an input error opens with a statement of what is wrong (never an imperative), then the correction", errFail.length === 0, errFail.length ? `\n        ${list(errFail)}` : `${errs.length} errors; causes ${JSON.stringify(byCause)}; the ${inputRows} input-error rows each open with a statement of what is wrong (${emptyWhy} of them leave the cause to that statement and have no why of their own), then give the correction, and every other row says what happened, then why`);
stats.errors = errs.length; stats.byCause = byCause; stats.inputWhyless = emptyWhy; stats.inputRows = inputRows;
// D2: a string that says something could not be done is an error row, so the anatomy (what, why, what to do) applies to it.
const NEGATIVE = /\b(can't|cannot|couldn't|unable to|failed|didn't (?:go through|work)|doesn't work)\b/i;
const negFail = rows.filter((r) => ["label", "heading", "status", "body", "new", "empty"].includes(r.kind) && NEGATIVE.test(r.new) && !r.x.includes("not-an-error")).map((r) => `${r.id} [${r.kind}] ${r.new.slice(0, 80)}`);
check("D2", "a string that says something could not be done is an error row (what happened, why, what to do), never a label, heading or status", negFail.length === 0, negFail.length ? `\n        ${list(negFail)}` : `${rows.filter((r) => ["label", "heading", "status", "body", "new", "empty"].includes(r.kind)).length} label, heading, status, body and empty rows checked`);
// D3: no count slot stands bare before a plural noun ("{n} events" reads "1 events", C4): the helper writes the noun, `{n: count event}`, a noun phrase takes
// the plural on its last word. A note that gives the singular reading does not excuse the string, because an implementer copies the New text, so there is
// no note exception (rounds 1 to 5 had one, and 28 strings used it). Run over every New string here, over every kept string and row in H17, over every
// source line that shows a count in H10, and over the guide's own examples in F20.
const pluralFail = [];
for (const r of rows) for (const h of bareCountHits(r.new)) pluralFail.push(`${r.id}: "${h}" in "${r.new.slice(0, 70)}": write the count with the helper, {n: count noun}`);
// The follow-up to the eleventh review: the helper writes the noun by the count, and a verb that must agree with it cannot follow ("{n: count entry} don't look like email addresses" reads
// "1 entry don't"). A row may keep such a count only when it splits the singular: its note says which counts it is for ("n is 2 or more"), and a sibling row at the same anchor says the
// singular without the helper (A-16.18 beside A-16.55 was the pair). Otherwise the line is worded to read at every count ("Some entries don't look like email addresses").
const sameAnchor = (a, b) => a.anchors.some((x) => x.file && b.anchors.some((y) => y.file === x.file && x.lines.some((l) => y.lines.includes(l))));
let agreeRead = 0, agreeSplit = 0;
for (const r of rows) for (const h of agreeCountHits(r.new)) {
  agreeRead++;
  const ranged = /\b[a-z] is (?:2 or more|1)\b/.test(r.note);
  const sibling = rows.find((o) => o !== r && o.group === r.group && sameAnchor(o, r) && !agreeCountHits(o.new).length && !/\{[A-Za-z_][\w.]*:\s*count\b/.test(o.new));
  if (ranged && sibling) { agreeSplit++; continue; }
  pluralFail.push(`${r.id}: "${h}" in "${r.new.slice(0, 70)}": a verb that agrees with the count reads wrong at the other number ("1 entry don't"); word the line to read at every count ("Some entries don't…"), or split the singular into a row of its own and say in the note which counts this row is for ("n is 2 or more")`);
}
stats.agreeCounts = { read: agreeRead, split: agreeSplit };
check("D3", "no count slot stands bare before a plural noun in a new string (\"{n} events\" reads \"1 events\"): the helper writes the noun, {n: count event}, with or without a note (C4); and no verb that must agree follows the helper (\"{n: count entry} don't\" reads \"1 entry don't\") unless the row splits the singular", pluralFail.length === 0, pluralFail.length ? `\n        ${list(pluralFail, 40)}` : `${rows.length} new strings read; every count with a noun uses the helper, and ${agreeRead} counts are followed by a verb that agrees (${agreeSplit} of them in a row that splits the singular)`);
// D6: no New string holds an alternation of forms: not "student(s)", not "1 class, or {n} classes", not "{enabled or disabled}". A count writes its noun
// as `{n: count student}`; a value that alternates is one row per value, each saying when it shows (E7).
const altRes = [
  [/\w\((s|es|ies)\)/, "a (s) plural"],
  [/\{[^{}]*\bor\b[^{}]*\}/, "a slot that names two values"],
  [/\b1 \w+,? or [{\d]/, "a singular, then \"or\" and the plural"],
  [/\{(\w+)\}\s+(\w+)\s+or\s+\{\1\}\s+\2(s|es)\b/, "a count with both forms"],
  [/\b(\w{3,})\/\1(s|es)\b/, "a slash between the forms"],
];
const altFail = [];
for (const r of rows) for (const [re, what] of altRes) if (re.test(r.new)) altFail.push(`${r.id} [${r.kind}] ${r.new.slice(0, 80)} -> ${what}`);
// a name that holds both states ("Server is active or inactive") is an alternation too: the state that shows is one row, the other state the next
for (const r of rows) if (["label", "status", "heading", "tooltip", "aria"].includes(r.kind) && /\b(active or inactive|enabled or disabled|on or off)\b/i.test(r.new)) altFail.push(`${r.id} [${r.kind}] ${r.new.slice(0, 80)} -> two states in one name`);
check("D6", "no new string holds an alternation of forms (\"student(s)\", \"1 class, or {n} classes\", \"{enabled or disabled}\"): a count writes `{n: count student}`, and a value that alternates is one row per value", altFail.length === 0, altFail.length ? `\n        ${list(altFail)}` : `${rows.length} new strings read`);
// E7: rows of one page and one kind that share a source line and an old text (the all-succeeded form and the partial form, the with-address and the
// without-address form, the enabled and the disabled form, one event and several) each say when they show.
{
  const WHEN = /\b(when|if|only|once|while|in place of|instead|with|without|after|before)\b/i;
  const byKey = new Map();
  for (const r of rows) {
    if (!r.old) continue;
    const o = normText(r.old);
    for (const a of r.anchors.filter((x) => x.file)) for (const l of a.lines) { const k = `${r.group}|${r.kind}|${a.file}:${l}|${o}`; if (!byKey.has(k)) byKey.set(k, new Set()); byKey.get(k).add(r); }
  }
  const sharing = new Set(); const noWhen = new Set();
  for (const set of byKey.values()) if (set.size > 1) for (const r of set) { sharing.add(r.id); if (!WHEN.test(r.note)) noWhen.add(r.id); }
  check("E7", "rows that share a source line and an old text each say when they show (a note with \"when\", \"if\", \"only\" or the like)", noWhen.size === 0, noWhen.size ? `\n        ${list([...noWhen].map((id) => `${id}: no note that says when`), 40)}` : `${sharing.size} rows in shared-line groups, all with a "when" note`);
  stats.sharedLineRows = sharing.size;
}
// D8: the terms the guide scopes to pages (SCOPED_TERMS): "session" is the analytics word (one run of a user's activity); the two feature-flag pages say "flag", not
// "assignment"; the class and experiment pages say "instructions", not "prompt"; the chat says "answer", not "response"; students never meet "assistant" for Kiwi.
// This reads every New string; H17 reads every kept string and every source string no row touches.
const scopedFail = [];
for (const r of rows) for (const h of scopedTermHits(r.new, { group: r.group })) if (!r.x.some((x) => /session/i.test(x) && /session/.test(h))) scopedFail.push(`${r.id} [${r.kind}] ${r.new.slice(0, 80)} -> ${h}`);
check("D8", "a term the guide scopes to pages stays on its pages: \"session\" only on the analytics pages, \"assignment\" never on the feature-flag pages, \"prompt\" never on the class and experiment pages, \"response\" never in the chat, \"assistant\" never for Kiwi in a student page", scopedFail.length === 0, scopedFail.length ? `\n        ${list(scopedFail)}` : `${rows.length} new strings read against ${SCOPED_TERMS.length} scoped terms (${rows.filter((r) => /\bsessions?\b/i.test(r.new)).length} rows say session, all analytics)`);
// D10: a reason phrase is never quoted (§ Errors 3, the review's m2): no new string carries `{statusText}` (the response's reason phrase, "Internal Server Error"), a
// parser's text is never quoted ("The parser said"), and no server-message row says the status text is quoted as the server's words.
{
  const bad = [];
  for (const r of rows) {
    if (/\{(statusText|reason|statusMessage)\}/.test(r.new)) bad.push(`${r.id}: quotes a reason phrase: ${r.new.slice(0, 80)}`);
    if (/parser said/i.test(r.new)) bad.push(`${r.id}: quotes the parser: ${r.new.slice(0, 80)}`);
    if (r.br === "srv" && /else the status (reason phrase|text)/i.test(r.note)) bad.push(`${r.id}: its note quotes the status text as the server's words`);
  }
  check("D10", "a reason phrase is never quoted: no string carries {statusText} or quotes the JSON parser, and the helpers' status text is not the server's words (a status line or phrase takes the cause line of § Errors 3)", bad.length === 0, bad.length ? `\n        ${list(bad)}` : `${rows.filter((r) => r.br === "http").length} status-line rows replace a status with words; ${rows.filter((r) => r.br === "srv").length} server-message rows quote a body's text only`);
}
// D11: a failed write says whether the page keeps what was typed (the sixth review's m8). The class is every error row that opens "Couldn't" or "Can't" and a verb
// of WRITE_VERBS (save, create, update, send, change, add, upload, assign, enroll, register); every other opening verb is in EXEMPT_VERBS with its reason, so a new
// kind of failure has to be decided. A class row carries `safe` (what keeps the input, with the line that does) or `nosafe` (why the sentence is not used, with the line
// that decides it), never both; the one closed sentence is in New exactly when it is `safe`; every cite resolves to a range of a real file; a `safe` row's cited catch block
// calls nothing that clears or closes the form; and no other kind of row says the sentence.
{
  const writeRe = new RegExp(`^(?:Couldn't|Can't) (${WRITE_VERBS.join("|")})\\b`, "i");
  const anyRe = /^(?:Couldn't|Can't|Cannot|Unable to) (\w+)/i;
  const FORM_CHANGER = /\b(?:set(?!Error|Snackbar|Feedback|Toast|Message|Severity|Alert|Saving|Submitting|Sending|Loading|Busy|Uploading|Creating|Pending|Processing|Testing|Assigning|Enabling|Registering|Resetting|Warning|OpenSnackbar|IsSaving|ApiTokenCreating|RegistrationResult)[A-Z]\w*|reset\w*|clear\w*|navigate|onClose|onSuccess|handleClose\w*|handle\w*Close\w*|close\w*)\s*\(/;
  const bad = []; const byVerb = {}; const exemptSeen = {}; let nSafe = 0, nNo = 0, nCatch = 0, nCites = 0;
  for (const r of rows) {
    if (r.kind !== "error") { if (r.new.includes(SAFE_LINE)) bad.push(`${r.id}: ${r.kind} row says "${SAFE_LINE}", which only a failed-write error row may`); continue; }
    const e = r.err;
    const w = writeRe.exec(e.what);
    if (!w) {
      const m = anyRe.exec(e.what);
      if (m && !EXEMPT_VERBS[m[1].toLowerCase()]) bad.push(`${r.id}: "${m[1]}" is neither a write verb nor listed as exempt, so nobody decided whether the page keeps typed input`);
      if (m && EXEMPT_VERBS[m[1].toLowerCase()]) exemptSeen[m[1].toLowerCase()] = (exemptSeen[m[1].toLowerCase()] || 0) + 1;
      if (e.safe || e.nosafe) bad.push(`${r.id}: carries safe or nosafe but is not a failed write`);
      if (r.new.includes(SAFE_LINE)) bad.push(`${r.id}: says "${SAFE_LINE}" but is not a failed write`);
      continue;
    }
    byVerb[w[1].toLowerCase()] = (byVerb[w[1].toLowerCase()] || 0) + 1;
    if (!!e.safe === !!e.nosafe) { bad.push(`${r.id}: needs exactly one of safe (what keeps the input) and nosafe (why the sentence is not used)`); continue; }
    const text = e.safe || e.nosafe;
    if (String(text).length < 30) bad.push(`${r.id}: its safe or nosafe text is too short to say anything`);
    if (/\.$/.test(text)) bad.push(`${r.id}: its safe or nosafe text ends with a full stop (the generator adds it)`);
    if (e.safe) nSafe++; else nNo++;
    if (e.safe && !r.new.includes(SAFE_LINE)) bad.push(`${r.id}: safe, but New does not say "${SAFE_LINE}"`);
    if (e.nosafe && r.new.includes(SAFE_LINE)) bad.push(`${r.id}: nosafe, but New says "${SAFE_LINE}"`);
    const cites = citesIn(text);
    if (!cites.length) bad.push(`${r.id}: no file:line cite in its ${e.safe ? "safe" : "nosafe"} text`);
    nCites += cites.length;
    for (const c of cites) {
      if (c.error) { bad.push(`${r.id}: ${c.error}`); continue; }
      const L = fs.readFileSync(c.abs, "utf8").split("\n").slice(c.from - 1, c.to);
      const startsCatch = /\bcatch\b/.test(L[0] || "");
      if (e.safe && startsCatch) {
        nCatch++;
        const body = L.slice(1).join("\n");
        const m = FORM_CHANGER.exec(body);
        if (m) bad.push(`${r.id}: the catch at ${c.text} calls ${m[0].trim()}, which clears or closes the form; the row cannot say the input is kept`);
      } else if (e.safe && !/\bcatch\b/.test(text)) { /* a success-only line: nothing more to read */ }
      else if (e.safe && /\bthe catch\b/.test(text) && !cites.some((x) => !x.error && /\bcatch\b/.test(fs.readFileSync(x.abs, "utf8").split("\n")[x.from - 1] || ""))) bad.push(`${r.id}: its text names the catch, but no cite starts at a catch line`);
      if (e.safe && !startsCatch && /\b(closes|cleared|reset)\b/.test(text)) {
        const held = L.some((l) => /\b(set\w+\(|reset\w*\(|onClose\(|handle\w*Close\w*\(|close\w*\(|navigate\()/.test(l));
        if (!held && /only (after|when)/.test(text) && cites.length === 1 && c === cites[0]) bad.push(`${r.id}: ${c.text} holds no call that closes or clears anything`);
      }
    }
  }
  const total = nSafe + nNo;
  // the Errors section states the counts; they are read here, so the prose cannot drift from the data
  {
    const m = /Of the (\d+) failed-write rows, (\d+) carry it[^;]*; (\d+) leave it out/.exec(fs.readFileSync(DESIGN_MD, "utf8"));
    if (!m) bad.push("§ Errors › What is safe does not state the counts (\"Of the N failed-write rows, N carry it … N leave it out\")");
    else if (Number(m[1]) !== total || Number(m[2]) !== nSafe || Number(m[3]) !== nNo) bad.push(`§ Errors › What is safe says ${m[1]} rows, ${m[2]} with the sentence and ${m[3]} without; the data has ${total}, ${nSafe} and ${nNo}`);
  }
  stats.failedWrites = { total, safe: nSafe, nosafe: nNo, byVerb, exempt: exemptSeen, exemptRows: Object.values(exemptSeen).reduce((a, b) => a + b, 0), cites: nCites, catchBlocks: nCatch };
  check("D11", "every failed write (an error row for save, create, update, send, change, add, upload, assign, enroll or register) says whether the page keeps what was typed: the one sentence \"Your changes are still in the form.\" with the line that keeps it, or a reason it is left out with the line that decides it; the catch it cites calls nothing that clears the form; every other opening verb is listed as exempt with its reason", bad.length === 0, bad.length ? `\n        ${list(bad, 30)}` : `${total} failed-write rows (${Object.entries(byVerb).map(([k, v]) => `${k} ${v}`).join(", ")}): ${nSafe} keep the input and say so, ${nNo} say why not; ${nCites} cites resolve, ${nCatch} catch blocks read; ${stats.failedWrites.exemptRows} other failure rows have an exempt verb (${Object.keys(exemptSeen).length} verbs)`);
}
// D9: every error row cites C9, the rule that builds it (a quoted server message is C10 as well, never instead); the rows that cite C9 without being error rows are named.
{
  const noC9 = rows.filter((r) => r.kind === "error" && !r.rules.includes("C9")).map((r) => `${r.id} cites ${r.rules.join(",")}`);
  const c9Other = rows.filter((r) => r.kind !== "error" && r.rules.includes("C9")).map((r) => r.id);
  check("D9", "every error row cites C9 (what happened, why, what to do); the other rows that cite it are named", noC9.length === 0, noC9.length ? `\n        ${list(noC9)}` : `${rows.filter((r) => r.kind === "error").length} error rows all cite C9; ${c9Other.length} other rows cite it: ${c9Other.join(", ")}`);
  stats.c9Other = c9Other; stats.c9Total = rows.filter((r) => r.rules.includes("C9")).length;
}
// D4: a sentence that names the support address has a variant without it (SUPPORT_EMAIL defaults to "").
const supportFail = [];
for (const r of rows) {
  if (!/\{SUPPORT_EMAIL\}/.test(r.new)) continue;
  if (/(only when|omitted when|shown only|variant)/i.test(r.note) && (r.group === "EM" || /variant/i.test(r.note))) continue;
  supportFail.push(`${r.id}: ${r.new.slice(0, 80)}`);
}
for (const r of rows) {
  if (!/\{SUPPORT_EMAIL\}/.test(r.new) || r.group === "EM") continue;
  // the variant without the address: a row of the same group and kind at the same file whose New does not name it, and whose Old is the same string (the code has two places) or
  // another text the same template draws (the tenth review: S-07.04's Old is "Cannot get email from Google account.", the reading of the template without the address)
  const sameTemplate = (o) => r.anchors.some((b) => b.file && b.lines.some((ln) => templatesAt(b.file, ln).some((t) => t.readings.some((x) => oldKeys(o.old).includes(readingKey(x))) && t.readings.some((x) => oldKeys(r.old).includes(readingKey(x))))));
  const sibling = rows.find((o) => o !== r && o.group === r.group && !/\{SUPPORT_EMAIL\}/.test(o.new) && o.kind === r.kind && o.anchors.some((a) => r.anchors.some((b) => a.file && a.file === b.file)) && (o.old === r.old || sameTemplate(o)));
  if (!sibling) supportFail.push(`${r.id}: no sibling row for an empty SUPPORT_EMAIL`);
}
check("D4", "every sentence that names {SUPPORT_EMAIL} has a with-address row and a without-address row", [...new Set(supportFail)].length === 0, [...new Set(supportFail)].length ? `\n        ${list([...new Set(supportFail)])}` : `${rows.filter((r) => /\{SUPPORT_EMAIL\}/.test(r.new)).length} rows name the address`);
// D5: New keeps every {slot} that Old had (the old string had a run-time value, and New is the string to ship), unless the row says why.
// A slot may carry its formatter, "{date: D MMM YYYY}". A row whose Old is a code expression shows the displayed example instead.
const SLOT = /\{([A-Za-z_][\w.]*)(?::[^}]*)?\}/g;
const slotNames = (t) => new Set([...String(t).matchAll(SLOT)].map((m) => m[1]));
const slotFail = [];
for (const r of rows) {
  if (!r.old || r.kind === "remove") continue;
  const newS = slotNames(r.new);
  for (const name of slotNames(r.old)) if (!newS.has(name) && !r.note.includes(`{${name}}`) && !r.x.some((x) => String(x).includes(`{${name}}`))) slotFail.push(`${r.id}: {${name}} is in Old, not in New (keep it, or name it in the note)`);
}
check("D5", "a new string keeps every {slot} the old string had, and states the formatter of a date or number slot, unless its note says why", slotFail.length === 0, slotFail.length ? `\n        ${list(slotFail, 40)}` : `${rows.filter((r) => slotNames(r.old).size).length} rows have slots in Old; all are kept`);
stats.slotRows = rows.filter((r) => slotNames(r.old).size).length;

// ---------------------------------------------------------------- 4. JOURNEY coverage
const pageGroups = groups.filter((g) => /^(SR-\d|S-\d\d|A-\d\d)$/.test(g.id));
const rGroups = groups.filter((g) => /^R-\d$/.test(g.id));
const headIds = [...journey.matchAll(/^### (SR-\d|S-\d\d|A-\d\d) · /gm)].map((m) => m[1]);
const missingEntry = headIds.filter((id) => !groups.some((g) => g.id === id));
check("E1", "every page spec and shared region has a Copy (Phase 5) data group", missingEntry.length === 0 && headIds.length === 41, `${headIds.length} headings (7 shared regions + 34 pages)${missingEntry.length ? "; missing: " + missingEntry.join(", ") : ""}`);
const blockProblems = []; let noChangeBlocks = 0;
for (const g of pageGroups) {
  const a = journey.indexOf(`<!-- copy:${g.id}:start -->`), b = journey.indexOf(`<!-- copy:${g.id}:end -->`);
  if (a < 0 || b < a) { blockProblems.push(`${g.id}: no block`); continue; }
  const block = journey.slice(a, b);
  if (!g.rowsResolved.filter((x) => !x.keep).length) { noChangeBlocks++; if (!/no change\./.test(block) || g.noChange === undefined) blockProblems.push(`${g.id}: empty without a reason`); }
  for (const r of g.rowsResolved.filter((x) => !x.keep)) if (!block.includes(`\`${r.id}\``)) blockProblems.push(`${g.id}: ${r.id} missing from its bullet`);
  if (!/\*\*Copy \(Phase 5\):\*\*/.test(block)) blockProblems.push(`${g.id}: no Copy (Phase 5) bullet`);
}
const ra = journey.indexOf("<!-- copy:R:start -->"), rb = journey.indexOf("<!-- copy:R:end -->");
for (const g of rGroups) {
  if (ra < 0 || rb < ra || !journey.slice(ra, rb).includes(`**${g.id}:**`)) { blockProblems.push(`${g.id}: not in the redirect block`); continue; }
  if (!g.rowsResolved.length) noChangeBlocks++;
}
check("E2", "every entry's Copy (Phase 5) bullet is present and lists its rows or says no change with a reason", blockProblems.length === 0, blockProblems.length ? `\n        ${list(blockProblems)}` : `${pageGroups.length + rGroups.length} of ${pageGroups.length + rGroups.length} entries (46 expected); ${noChangeBlocks} say "no change"`);
stats.entries = pageGroups.length + rGroups.length; stats.noChange = noChangeBlocks;
const ia = journey.indexOf("<!-- copy:index:start -->"), ib = journey.indexOf("<!-- copy:index:end -->");
const indexText = ia >= 0 && ib > ia ? journey.slice(ia, ib) : "";
const indexIds = [...indexText.matchAll(/^\| `([A-Za-z0-9-]+\.\d+)` \|/gm)].map((m) => m[1]).filter((id) => !id.startsWith("P6-")); // the Phase 6 rows sit under "Rows appended by later phases" (Q3, Q6)
const wantIds = rows.map((r) => r.id);
const missIdx = wantIds.filter((i) => !indexIds.includes(i)), extraIdx = indexIds.filter((i) => !wantIds.includes(i));
check("E3", "the revision index lists every changed string once, and nothing else", missIdx.length === 0 && extraIdx.length === 0 && indexIds.length === wantIds.length, `${indexIds.length} index rows for ${wantIds.length} changed strings${missIdx.length ? "; missing " + missIdx.slice(0, 5).join(", ") : ""}${extraIdx.length ? "; extra " + extraIdx.slice(0, 5).join(", ") : ""}`);
// E6: a string is either kept or changed within one group, never both (a kept string with an annotation, "Close (the dialog's)", is compared without it)
const keptConflicts = [];
for (const g of groups) {
  const changedOld = new Map(g.rowsResolved.filter((r) => !r.keep && r.old).map((r) => [normText(r.old), r.id]));
  for (const k of g.kept || []) { const t = normText(k.replace(/\s+\([^)]* [^)]*\)\s*$/, "")); if (changedOld.has(t)) keptConflicts.push(`${g.id}: "${k}" is kept and changed by ${changedOld.get(t)}`); }
}
check("E6", "no string is both kept as it is and changed by a row in the same group", keptConflicts.length === 0, keptConflicts.length ? `\n        ${list(keptConflicts)}` : `${groups.reduce((n, g) => n + (g.kept || []).length, 0)} kept strings checked`);
check("E4", "the index has a marked block for rows later phases append", /<!-- copy:appended:start -->[\s\S]*<!-- copy:appended:end -->/.test(indexText));
const invStats = loadTestInventory().stats;
const withTests = rows.filter((r) => r.tests.length);
const testFilesAffected = new Set(withTests.flatMap((r) => r.tests.map((t) => t.name)));
const refTotal = withTests.reduce((n, r) => n + r.tests.length, 0);
stats.testsRows = withTests.length; stats.testFiles = testFilesAffected.size; stats.testRefs = refTotal; stats.inventory = invStats;
// the Tests cell lists every reference: its count equals the number of file:line entries, and the data agrees
const cellBad = [];
for (const line of indexText.split("\n")) {
  const id = (line.match(/^\| `([A-Za-z0-9-]+\.\d+)` \|/) || [])[1];
  if (!id) continue;
  const cell = (line.match(/\| (-|\d+ · [^|]*?) \|$/) || [])[1];
  const row = rows.find((r) => r.id === id) || rows6.find((r) => r.id === id); // a Phase 6 row (the appended block) keeps the same column rule
  if (!row || cell === undefined) { cellBad.push(`${id}: no Tests cell`); continue; }
  if (cell === "-") { if (row.tests.length) cellBad.push(`${id}: empty cell, ${row.tests.length} references`); continue; }
  const n = Number(cell.split(" · ")[0]);
  const entries = cell.split(" · ")[1].split("; ").reduce((k, g) => k + g.split(":")[1].split(",").length, 0);
  if (/…/.test(cell) || entries !== n || n !== row.tests.length) cellBad.push(`${id}: cell lists ${entries} of ${n} (${row.tests.length} in the data)`);
}
const s514 = rows.filter((r) => r.group === "S-05" && /No sign-in method is enabled/.test(r.old));
const regexAware = s514.length > 0 && s514.every((r) => r.tests.some((t) => t.name === "Login.test.tsx" && t.line === 140 && t.via === "regex"));
check("E5", "the Tests column is regex-aware and untruncated: every string, regular-expression and text reference is listed as file:line (the regex query Login.test.tsx:140 is on S-05.14)", cellBad.length === 0 && regexAware, cellBad.length ? `\n        ${list(cellBad)}` : `${withTests.length} of ${rows.filter((r) => r.old).length} rows with an old string are referenced ${refTotal} times in ${testFilesAffected.size} test files; inventory ${invStats.queries} queries and text assertions in ${invStats.queryFiles} of ${invStats.testFiles} test files (${invStats.string} string, ${invStats.regex} regex in ${invStats.regexFiles} files, ${invStats.roleOnly} role-only, ${invStats.dynamic} dynamic); the brief's 529 is ${invStats.briefKinds} in ${invStats.briefFiles} files`);

// E9: a second opinion on the Tests column, computed apart from `testRefs` the way a reviewer would: every test file's whole import closure (no depth limit,
// the `@/` and `src/` aliases included) and every quoted literal that equals a changed old string. A literal in a test that reaches a row's anchor file is in
// that row's Tests cell, whatever the query is (a negative assertion, getAllBy…, a fixture, a two-letter word).
{
  const testAbs = [];
  (function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!["node_modules", "dist"].includes(e.name)) w(p); } else if (/\.test\.(tsx?|jsx?)$/.test(e.name)) testAbs.push(p); } })(path.join(UI, "src"));
  const exts = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"];
  const srcRoot = path.join(UI, "src");
  const resolveSpec = (from, spec) => {
    let base;
    if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
    else if (spec.startsWith("@/")) base = path.join(srcRoot, spec.slice(2));
    else if (spec.startsWith("src/")) base = path.join(UI, spec);
    else return null;
    for (const e of exts) { const c = base + e; if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; }
    return null;
  };
  const impCache = new Map();
  const importsOf = (f) => {
    if (impCache.has(f)) return impCache.get(f);
    const t = fs.readFileSync(f, "utf8"); const out = []; const re = /(?:import\s+(?:[^'"]*?\s+from\s+)?|export\s+[^'"]*?\s+from\s+|import\(|require\()\s*['"]([^'"]+)['"]/g; let m;
    while ((m = re.exec(t))) { const r = resolveSpec(f, m[1]); if (r) out.push(r); }
    impCache.set(f, out); return out;
  };
  const closure = (start) => { const seen = new Set([start]); const st = [start]; while (st.length) { const f = st.pop(); for (const g of importsOf(f)) if (!seen.has(g)) { seen.add(g); st.push(g); } } return seen; };
  const oldMap2 = new Map();
  for (const r of rows) if (r.old && !r.old.includes("{") && r.anchors.some((a) => a.file && !a.file.startsWith(".."))) { if (!oldMap2.has(r.old)) oldMap2.set(r.old, []); oldMap2.get(r.old).push(r); }
  const cellRefs = new Map();
  for (const line of indexText.split("\n")) {
    const id = (line.match(/^\| `([A-Za-z0-9-]+\.\d+)` \|/) || [])[1]; if (!id) continue;
    const cell = (line.match(/\| (-|\d+ · [^|]*?) \|$/) || [])[1]; const refs = new Set();
    if (cell && cell !== "-") for (const grp of cell.split(" · ")[1].split("; ")) { const [file, nums] = [grp.slice(0, grp.indexOf(":")), grp.slice(grp.indexOf(":") + 1)]; for (const n of nums.split(",")) { const k = /^(\d+)/.exec(n.trim()); if (k) refs.add(`${file}:${k[1]}`); } }
    cellRefs.set(id, refs);
  }
  const litRe = /(['"`])((?:\\.|(?!\1)[^\\\n]){2,300}?)\1/g;
  let reached = 0, listed2 = 0, notReached = 0; const gaps = [];
  for (const tf of testAbs) {
    const cl = closure(tf); const base = path.basename(tf);
    fs.readFileSync(tf, "utf8").split("\n").forEach((line, idx) => {
      let m; litRe.lastIndex = 0;
      while ((m = litRe.exec(line))) {
        const raw = m[2].replace(/\\(.)/g, "$1");
        for (const r of oldMap2.get(raw) || []) {
          const reach = r.anchors.some((a) => a.file && !a.file.startsWith("..") && cl.has(path.join(UI, a.file)));
          if (!reach) { notReached++; continue; }
          reached++;
          if ((cellRefs.get(r.id) || new Set()).has(`${base}:${idx + 1}`)) listed2++; else gaps.push(`${r.id}: ${base}:${idx + 1} "${raw.slice(0, 40)}" reaches ${r.anchors.find((a) => a.file).file} and is not in the Tests cell`);
        }
      }
    });
  }
  // The tenth review (C-2): a literal that equals ONE text a conditional template draws (`alert('Login failed.')` against `Login failed.${support ? ` Please contact ${support}.` : ""}`)
  // is a reference to the row whose Old is that text. The count above compares a literal with a row's Old exactly, so a row written for the other reading never met it: the
  // two asserts at GoogleRedirectHandler.test.tsx:183 and :201 were in no cell. Every such literal, in a test that reaches the template's file, has a row for its text and is in
  // that row's cell. (These are counted apart: the reconciliation below is of the exact literals.)
  let readingRefs = 0;
  if (tsScan) {
    const rmap = new Map();
    for (const t of tsScan.templates) {
      if (!isTextTemplate(t)) continue;
      for (const x of t.readings) { if (/\{x\}/.test(x) || !isTextReading(x)) continue; const k = normText(x); if (!rmap.has(k)) rmap.set(k, []); rmap.get(k).push(t); }
    }
    for (const tf of testAbs) {
      const cl = closure(tf); const base = path.basename(tf);
      fs.readFileSync(tf, "utf8").split("\n").forEach((line, idx) => {
        let m; litRe.lastIndex = 0;
        while ((m = litRe.exec(line))) {
          const raw = normText(m[2].replace(/\\(.)/g, "$1"));
          for (const t of rmap.get(raw) || []) {
            if (!cl.has(path.join(UI, t.file))) continue;
            readingRefs++;
            const owners = rows.filter((r) => oldKeys(r.old).includes(readingKey(raw)) && r.anchors.some((a) => a.file === t.file && a.lines.some((l) => l >= t.line - 1 && l <= t.endLine + 1)));
            if (!owners.length) gaps.push(`${base}:${idx + 1} quotes "${raw.slice(0, 40)}", one text that ${t.file.split("/").pop()}:${t.line} builds with a conditional, and no row has that text as its Old (a test of one reading is a reference to that reading's row)`);
            else if (!owners.some((o) => (cellRefs.get(o.id) || new Set()).has(`${base}:${idx + 1}`))) gaps.push(`${owners[0].id}: ${base}:${idx + 1} quotes its Old, a text that ${t.file.split("/").pop()}:${t.line} builds with a conditional, and is not in the Tests cell`);
          }
        }
      });
    }
  }
  // A literal that is a whole sentence of a changed old string, from 12 characters (the bar a query has), is a reference to that row too. This is the sentences counted apart from the
  // generator: `alert('Login failed.')` was in S-07.05's cell by neither rule, and S-07.03's Old begins with that sentence.
  let sentenceRefs = 0;
  {
    const smap = new Map();
    for (const r of rows) {
      if (!r.old || !r.anchors.some((a) => a.file && !a.file.startsWith(".."))) continue;
      const full = normText(r.old);
      for (const sent of full.split(/(?<=[.?!\u2026])\s+/)) { if (sent === full || sent.length < 12 || !/\s/.test(sent) || /[{}]/.test(sent)) continue; if (!smap.has(sent)) smap.set(sent, []); smap.get(sent).push(r); }
    }
    for (const tf of testAbs) {
      const cl = closure(tf); const base = path.basename(tf);
      fs.readFileSync(tf, "utf8").split("\n").forEach((line, idx) => {
        let m; litRe.lastIndex = 0;
        while ((m = litRe.exec(line))) {
          const raw = normText(m[2].replace(/\\(.)/g, "$1"));
          for (const r of smap.get(raw) || []) {
            if (!r.anchors.some((a) => a.file && !a.file.startsWith("..") && cl.has(path.join(UI, a.file)))) continue;
            sentenceRefs++;
            if (!(cellRefs.get(r.id) || new Set()).has(`${base}:${idx + 1}`)) gaps.push(`${r.id}: ${base}:${idx + 1} quotes "${raw.slice(0, 40)}", a whole sentence of its Old, and is not in the Tests cell`);
          }
        }
      });
    }
  }
  check("E9", "the Tests column agrees with an independent count: every quoted literal in a test that equals a changed old string, or one text a conditional template draws, and reaches the row's anchor file (any query, a negative assertion or a fixture) is in the row's cell, a literal that is a whole sentence of a changed old string is too, and a literal that equals one text of a conditional template has a row for that text", gaps.length === 0,
    gaps.length ? `\n        ${list(gaps)}` : `${reached} literal references reach an anchor and all ${listed2} are listed; ${notReached} more quote an old string but never reach its file (a test of another page); ${readingRefs} quote one text of a conditional template, each with a row of its own and in its cell; ${sentenceRefs} quote a whole sentence of an old string, each in its cell`);
  stats.testReach = { reached, listed: listed2, notReached, readings: readingRefs, sentences: sentenceRefs };
  // E11: the other two letters of the Tests column. A test that already queries a row's NEW text (n) or a part of the old string the row keeps (k)
  // is listed too: found apart from the generator, from the query calls on each test line, with the same reach rule.
  {
    const queryLine = /\b(?:get|query|find)(?:All)?By(?:Text|Role|LabelText|PlaceholderText|DisplayValue|AltText|Title)\s*\(/;
    const lit1Re = /(['"`])((?:\\.|(?!\1)[^\\\n]){1,300}?)\1/g; // one character is enough here: the loader's dots are "."
    const newMap = new Map(), keptMap = new Map();
    for (const r of rows) {
      if (!r.anchors.some((a) => a.file && !a.file.startsWith(".."))) continue;
      const nn = normText(r.new);
      if (nn.length >= 4 && !/[{}]/.test(nn)) { if (!newMap.has(nn)) newMap.set(nn, []); newMap.get(nn).push(r); }
      for (const q of r.tq || []) { const k = normText(q); if (!keptMap.has(k)) keptMap.set(k, []); keptMap.get(k).push(r); }
    }
    let nReach = 0, kReach = 0, nListed = 0, kListed = 0; const gaps = [];
    for (const tf of testAbs) {
      const cl = closure(tf); const base = path.basename(tf);
      fs.readFileSync(tf, "utf8").split("\n").forEach((line, idx) => {
        if (!queryLine.test(line)) return;
        let m; lit1Re.lastIndex = 0;
        while ((m = lit1Re.exec(line))) {
          const raw = normText(m[2].replace(/\\(.)/g, "$1"));
          for (const [map, kind] of [[newMap, "n"], [keptMap, "k"]]) for (const r of map.get(raw) || []) {
            if (!r.anchors.some((a) => a.file && !a.file.startsWith("..") && cl.has(path.join(UI, a.file)))) continue;
            if (kind === "n") nReach++; else kReach++;
            if ((cellRefs.get(r.id) || new Set()).has(`${base}:${idx + 1}`)) { if (kind === "n") nListed++; else kListed++; } else gaps.push(`${r.id}: ${base}:${idx + 1} asks for "${raw.slice(0, 40)}" (${kind === "n" ? "the new text" : "a part the row keeps"}) and is not in the Tests cell`);
          }
        }
      });
    }
    const intro = /`\(removed\)` means the text is dropped and nothing replaces it/.test(indexText) && /`n`, a query that already asks for the \*\*New\*\* text/.test(indexText) && /`k`, a query for a part of the old string the row keeps/.test(indexText);
    if (!intro) gaps.push("the index's introduction does not define (removed), n and k");
    const fb = rows.find((r) => r.id === "SR-6.49");
    if (!fb || !fb.tests.some((t) => t.name === "AgentStepChain.test.tsx" && t.line === 80 && t.via === "new")) gaps.push("SR-6.49 does not list AgentStepChain.test.tsx:80 (the query for the header)");
    check("E11", "the Tests column also lists a test that already queries a row's New text (n) or a part of the old string the row keeps (k), AgentStepChain.test.tsx:80 on SR-6.49 among them, and the index defines (removed), n and k", gaps.length === 0, gaps.length ? `\n        ${list(gaps)}` : `${nReach} n references and ${kReach} k references reach an anchor and all ${nListed + kListed} are listed (AgentStepChain.test.tsx:80n is on SR-6.49)`);
    stats.nkRefs = { n: nListed, k: kListed };
  }
  // E12: how the column's references relate to an independent count (the seventh review's N-5). The index header states the numbers, and the column, the data and the
  // scan agree with them: the references that hold the old string as a quoted literal are the literals the scan finds at an anchor, and the rest are the kinds a scan for
  // literals cannot see.
  {
    const rec = reconcileTests(rows);
    const bad = [];
    if (!indexText.includes(reconcileText(rec))) bad.push("the index header does not state the reconciliation of the Tests column as the data gives it (node build-copy.mjs writes it)");
    if (rec.total !== refTotal) bad.push(`the data has ${refTotal} references and the reconciliation counts ${rec.total}`);
    if (rec.scanReached !== reached || rec.notReached !== notReached) bad.push(`the reconciliation's scan (${rec.scanReached} reach an anchor, ${rec.notReached} do not) is not E9's (${reached}, ${notReached})`);
    if (!rec.agree) bad.push(`the ${rec.equal} references that hold the old string as a literal are not the ${rec.scanReached} literals that reach an anchor`);
    if (rec.equal + rec.other !== rec.total || rec.regex + rec.asksNew + rec.asksKept + rec.otherString + rec.otherText !== rec.other) bad.push("the kinds do not add up to the references");
    check("E12", "the index header reconciles the Tests column with the independent scan: the references that hold the old string as a literal are the ones the scan finds at an anchor (its other pairs reach no anchor), and the rest are the regular-expression, new-text, kept-part and containment kinds a literal scan cannot see", bad.length === 0, bad.length ? `\n        ${list(bad)}` : `${rec.total} references = ${rec.equal} literals (the scan's ${rec.scanReached} that reach an anchor; ${rec.notReached} more reach none) + ${rec.other} others (${rec.regex} r, ${rec.asksNew} n, ${rec.asksKept} k, ${rec.otherString} sentence queries, ${rec.otherText} m)`);
    stats.testReconcile = rec;
  }
}
// ---------------------------------------------------------------- 5. the Voice and tone section
const vi = design.indexOf("\n## Voice and tone");
// the Voice section ends where the next top-level section begins (Phase 6 appended `## Chart tokens` after it), so `sect()` and the hand-off reads stay Phase 5's
const voiceEnd = vi >= 0 ? design.indexOf("\n## ", vi + 1) : -1;
const voice = vi >= 0 ? design.slice(vi, voiceEnd < 0 ? undefined : voiceEnd) : "";
check("F0", "DESIGN.md has a `## Voice and tone` section after `## Companion`", vi > design.indexOf("\n## Companion") && vi > 0);
const sect = (title) => { const a = voice.indexOf(`### ${title}`); if (a < 0) return ""; const rest = voice.slice(a + 4); const n = rest.search(/\n##+ /); return n < 0 ? rest : rest.slice(0, n); };
const tableRows = (text) => text.split("\n").filter((l) => /^\|/.test(l) && !/^\|[-| ]+\|$/.test(l)).slice(1);
const attrTables = voice.split("#### Students")[1]?.split("#### Instructors and admins") ?? [];
const studentRows = tableRows(attrTables[0] || "");
const staffRows = tableRows((attrTables[1] || "").split("### Tone map")[0]);
const attrOk = (rs) => rs.length >= 3 && rs.length <= 5 && rs.every((l) => { const c = l.split(" | "); return c.length >= 5 && c[2].trim().length > 4 && c[3].trim().length > 4; });
check("F1", "3 to 5 voice attributes per audience, each with in-range and out-of-range examples", attrOk(studentRows) && attrOk(staffRows), `students ${studentRows.length}, instructors and admins ${staffRows.length}`);
const tone = tableRows(sect("Tone map"));
const moments = ["Error", "Success", "Empty", "Waiting", "Sign-in", "Destructive confirmation"];
const missingMoments = moments.filter((m) => !tone.some((l) => l.includes(`**${m}**`)));
check("F2", "the tone map covers all six moments with a sample for each audience", missingMoments.length === 0 && tone.every((l) => l.split(" | ").length >= 6 && l.split(" | ").slice(3, 5).every((c) => c.trim().length > 3)), `${tone.length} moments${missingMoments.length ? "; missing " + missingMoments.join(", ") : ""}`);
const toneSamples = tone.flatMap((l) => l.split(" | ").slice(3, 5).join(" ").match(/"([^"]{6,})"/g) || []).map((q) => q.slice(1, -1)).filter((t) => !/^\{/.test(t));
const sampleFails = toneSamples.map((t) => [t, lintString(t, "body")]).filter(([, h]) => h.some((x) => !/capital|sentence has no end|one-clause/.test(x)));
check("F3", "the tone map's sample strings pass the lints", sampleFails.length === 0, sampleFails.map(([t, h]) => `${t.slice(0, 50)} -> ${h.join("|")}`).join("; "));
// F20: the section follows its own rules: the in-range examples of the voice attributes and the right-hand side of every wrong -> right pair
// pass the lints that a new string passes (the C17 example once said "courses" under a rule that bans it)
const quotedIn = (cell) => [...String(cell).matchAll(/"((?:[^"\\]|\\.)+)"/g)].map((m) => m[1].replace(/\\"/g, '"'));
const proseSamples = [];
for (const l of [...studentRows, ...staffRows]) proseSamples.push(...quotedIn(l.split(" | ")[2]).map((t) => ["attribute", t]));
for (const l of voice.split("\n")) {
  const m = l.match(/^\| `(C\d+)` \|/); if (!m) continue;
  const last = l.split(" | ").slice(-1)[0].replace(/\s*\|\s*$/, "");
  for (const pair of last.split(" · ")) { const i = pair.indexOf("\u2192"); if (i >= 0) proseSamples.push(...quotedIn(pair.slice(i + 1)).map((t) => [m[1], t])); }
}
const proseFails = proseSamples.filter(([, t]) => t.trim() && (lintSource(t, "jsx").length || bareCountHits(t).length)).map(([w, t]) => `${w}: ${t.slice(0, 60)} -> ${[...lintSource(t, "jsx"), ...bareCountHits(t).map((h) => `a bare count before a plural noun (${h})`)].join(" | ")}`);
stats.proseExamples = proseSamples.length;
check("F20", "the section's own examples (the in-range sample of each voice attribute, the right side of each wrong \u2192 right pair) pass the lints", proseFails.length === 0 && proseSamples.length > 30, proseFails.length ? `\n        ${list(proseFails)}` : `${proseSamples.length} examples read`);
const ruleIds = [...voice.matchAll(/^\| `(C\d+)` \|/gm)].map((m) => m[1]);
const wantRules = Object.keys(RULES);
check("F4", "all 18 rules are written once, with the ids the revisions cite", ruleIds.length === wantRules.length && wantRules.every((c) => ruleIds.filter((x) => x === c).length === 1), `${ruleIds.length} rules`);
const usedRules = new Set(rows.flatMap((r) => r.rules));
const errSect = sect("Errors");
const causeMiss = Object.keys(CAUSES).filter((c) => !errSect.includes("`" + c + "`"));
const causeLineMiss = [...Object.entries(CAUSES), ...Object.entries(CAUSES_MCP).map(([c, v]) => ["mcp " + c, v])].filter(([, v]) => v.line && !errSect.includes(v.line));
check("F5", "the error anatomy names every cause code and writes the closed cause lines verbatim, the MCP pages' variants included", causeMiss.length === 0 && causeLineMiss.length === 0, [...causeMiss, ...causeLineMiss.map(([c]) => c)].join(", "));
const dateSect = sect("Dates, times and numbers");
check("F6", "the date, time, count and file formats are written with an example each", ["17 Oct 2026", "17 Oct 2026, 14:05", "14:05", "1,234", "2026-10-17"].every((x) => dateSect.includes(x)));
const term = tableRows(sect("Terminology"));
const termNeed = ["sign in", "Kiwi", "allowlist", "instructor", "chat", "instructions", "model", "scratchpad", "assistant"];
check("F7", "the terminology table covers the plan's terms and the ones found in source", termNeed.every((t) => term.some((l) => l.toLowerCase().includes(t.toLowerCase()))) && /allowlist/.test(sect("Terminology")) && /Kiwi Platform/.test(sect("Terminology")), `${term.length} rows`);
const pageNames = [...sect("Page names").matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const sr3 = rows.filter((r) => r.group === "SR-3").map((r) => r.new);
const pnMiss = sr3.filter((l) => !pageNames.some((p) => p === l || p.startsWith(l + " ") || p.includes(l)));
const h1 = rows.filter((r) => /^A-\d\d$/.test(r.group) && r.kind === "heading" && r.refs.includes("TD-21")).map((r) => r.new);
const h1Miss = h1.filter((l) => !pageNames.some((p) => p === l || p.includes(l)));
check("F8", "the page-name table carries every sidebar label and every retitled page", pnMiss.length === 0 && h1Miss.length === 0, [...pnMiss, ...h1Miss].join(", "));
check("F9", "the sidebar label equals the page title for every retitled admin page (C7)", (() => { const bad = []; const label = new Set([...sr3, ...(groups.find((g) => g.id === "SR-3")?.kept || []).filter((k) => !/ /.test(k) || /^[A-Z][a-z]+( [a-z]+)?$/.test(k))]); for (const t of h1) if (!label.has(t) && !/^(Edit experiment|New experiment|Class analytics|Document annotation)$/.test(t)) bad.push(t); stats.c7bad = bad; return bad.length === 0; })(), (stats.c7bad || []).join(", "));
const dsRows = groups.find((g) => g.id === "DS")?.rowsResolved ?? [];
const sharedBlock = (voice.match(/<!-- copy:shared:start -->([\s\S]*?)<!-- copy:shared:end -->/) || [])[1] || "";
const sharedRowsInDoc = [...sharedBlock.matchAll(/^\| `(DS\.\d+)` \|/gm)].length;
check("F10", "the shared-strings table in DESIGN.md is generated from the data (one row per DS row)", sharedRowsInDoc === dsRows.length && dsRows.length > 20, `${sharedRowsInDoc} of ${dsRows.length} rows`);
const scopeOk = /### Scope/.test(voice) && /### Email templates/.test(voice) && /### Companion text/.test(voice) && /A-7/.test(voice) && /### Hand-offs/.test(voice);
check("F11", "scope, email, companion-text (with A-7), and hand-off subsections are present", scopeOk);
const emailT = sect("Email templates");
check("F12", "the email table carries the four templates and the footer reason", ["Class announcement", "Important notification", "Welcome", "Class enrollment"].every((t) => emailT.includes(t)) && /Reply-To/.test(emailT));

// F13: one source per email string (M5): the preview and the mail say the same words
{
  const emRows = resolved.filter((r) => r.group === "EM" && !r.keep);
  const heading = emRows.filter((r) => r.kind === "heading" && /^Welcome!$|^Welcome to \{institutionName or Kiwi\}!$/.test(r.old));
  const headingSame = heading.length === 2 && heading[0].new === heading[1].new && /\{brandLabel\}/.test(heading[0].new);
  const enrollMail = emRows.find((r) => /^You have been added to \{className\} on Kiwi\.$/.test(r.old));
  const enrollDialog = resolved.find((r) => r.group === "A-16" && /^You have been added to \{class\}\. You can now access/.test(r.old));
  // the dialog does not know the instructor's name, so its sentence is the mail's with the optional part ("{ ({professorName})}") left out
  const mailSentence = (t) => t.replace("{ ({professorName})}", "").replace("{className}", "{class}");
  const optionalKept = !!enrollMail && enrollMail.new.includes("{ ({professorName})}");
  const bodySame = !!enrollMail && optionalKept && !!enrollDialog && enrollDialog.new.startsWith(mailSentence(enrollMail.new)) && enrollDialog.new.includes(emRows.find((r) => /^It is already in your course list at/.test(r.old))?.new.replace("{url}", "{url}") ?? "§");
  const senderRows = emRows.filter((r) => /^Kiwi Platform( Support)?$/.test(r.old) && r.anchors.some((a) => /configuration\.ts$/.test(a.file || "")));
  const mixed = resolved.find((r) => r.group === "A-16" && /^You have been enrolled in/.test(r.old));
  const mixedSame = !!mixed && !!enrollMail && mixed.new === mailSentence(enrollMail.new);
  check("F13", "one source per email string: the welcome heading uses one rule in both copies, the dialog's enrollment message is the mail's words, the sender defaults are handed off, and the table names the rule", headingSame && bodySame && mixedSame && senderRows.length === 2 && /\{brandLabel\}/.test(emailT) && /One source per string/.test(emailT) && /docs\/email\.md/.test(emailT),
    [!headingSame && "the welcome heading differs between the preview and the mail", !optionalKept && "the mail's enrollment sentence does not keep the optional part ({ ({professorName})}) that the backend template writes when the instructor's name is set", !bodySame && "the dialog's active-user message is not the mail's enrollment words", !mixedSame && "the mixed-selection message is not the mail's first sentence", senderRows.length !== 2 && "the two sender defaults have no rows"].filter(Boolean).join("; ") || `welcome "${heading[0]?.new}" in both; enrollment "${enrollMail?.new}" in the mail and the dialog; ${senderRows.length} sender defaults`);
}
// F14: the date control is specified (C1), the native controls are listed from the rows (run after the source scan, which finds the sites)
function runF14() {
  const dateT = sect("Dates, times and numbers");
  const blk = (dateT.match(/<!-- copy:datefields:start -->([\s\S]*?)<!-- copy:datefields:end -->/) || [])[1] || "";
  const listed = new Set([...blk.matchAll(/\| (src\/[^ |]+:\d+) \|/g)].map((m) => m[1]));
  const siteKeys = new Set(dateSites.map((x) => `${x.file}:${x.line}`));
  const same = siteKeys.size > 0 && [...siteKeys].every((k) => listed.has(k)) && listed.size === siteKeys.size;
  const spec = ["DateTimeField", "D MMM YYYY, HH:mm", "HH:mm", "Calendar popover", "Keyboard", "Typing", "Local ({timeZone})", "Text-only variant", "never the native", "adds no token"].filter((x) => !dateT.includes(x === "never the native" ? "can neither reformat nor restyle it" : x));
  check("F14", "the date control is specified (DateTimeField: formats, calendar popover, keyboard, typed input, zone caption) and the native controls to replace are listed from the rows", spec.length === 0 && same, [spec.length && `missing: ${spec.join(", ")}`, !same && `the generated list has ${listed.size} sites, the source ${siteKeys.size}`].filter(Boolean).join("; ") || `${listed.size} native controls listed, one per site`);
}
// F15: the B2 dependency is written into the row and into the section (M4)
{
  const errT = sect("Errors");
  const s506 = resolved.find((r) => r.group === "S-05" && /^Your session has expired/.test(r.old));
  const ds29 = resolved.find((r) => r.group === "DS" && r.new === "Your account doesn't have access to this page");
  const ds33 = resolved.find((r) => r.group === "DS" && /^You do not have permission/.test(r.old));
  const ok = /fix\/access-control/.test(errT) && /DS\.29/.test(errT) && /with or after that merge/.test(errT) && !!s506 && /fix\/access-control/.test(s506.note) && /with or after/.test(s506.note) && /DS\.29/.test(s506.note) && /B2/.test(s506.refs)
    && !!ds29 && /NoPermission/.test(rawRowW("DS", ds29.id)) && !!ds33 && /fix\/access-control/.test(rawRowW("DS", ds33.id));
  check("F15", "S-05.06 and the Errors section record that the sign-in wording ships with or after the access-control merge (B2), that a refused permission uses the no-permission copy (DS.29, DS.30), and what the merge does to the 403 alert (DS.33)", ok);
}
function rawRowW(gid, id) { const g = groups.find((x) => x.id === gid); const i = g.rowsResolved.findIndex((r) => r.id === id); const raw = rowObject(g.rows[i]); return raw.w || ""; }
// F16: the terms the review asked for are written (N3, N4, M2)
{
  const termT = sect("Terminology");
  const ok = /session, in analytics only/.test(termT) && /Model names/.test(termT) && /\| `openai` \| ChatGPT \|/.test(termT) && /\| `qwen` \| Qwen \|/.test(termT) && /data \(of a webhook event\) \| payload/.test(termT);
  check("F16", "the terminology names analytics sessions as user activity (not chat), the webhook event's data (not payload) and the model-name lookup (ChatGPT, Qwen)", ok);
}
// F17: the calendar's labels and the range label are specified through the fixed table (M1)
{
  const dateT = sect("Dates, times and numbers");
  const need = ["| Calendar header | `MMMM YYYY` |", "| Calendar day (accessible name) | `D MMMM YYYY` |", "| Weekday heading |", "28 Dec 2025 – 3 Jan 2026", "one month grid", "the range picker's `locale` prop goes away", "`MMM`, `MMMM`, `EEE`"].filter((x) => !dateT.includes(x));
  const a03 = groups.find((g) => g.id === "A-03");
  const a03Rows = a03.rowsResolved.filter((r) => r.kind === "format" && /MMM d|MMMM yyyy|MMMM d, yyyy|EEEE|rangeLabel|Oct 1 – Oct 7/.test(r.old));
  const noteOk = !/this phase fixes only case, vocabulary and the formats below/.test(a03.note || "") && /A-03\.43/.test(a03.note || "");
  check("F17", "the range label and the calendar's header, day and weekday labels are specified through the fixed English table, indexed on A-03, and A-03's Copy bullet no longer claims more than it covers", need.length === 0 && a03Rows.length >= 6 && noteOk, [need.length && `missing: ${need.join(" | ")}`, a03Rows.length < 6 && `A-03 has ${a03Rows.length} calendar and range rows`, !noteOk && "A-03's note"].filter(Boolean).join("; ") || `${a03Rows.length} A-03 rows`);
}
// F18: a registered app's prompt keeps its SDK word; "instructions" is the tutor's and the experiment form's (m2)
{
  const termT = sect("Terminology");
  const a08 = groups.find((g) => g.id === "A-08").rowsResolved;
  const a0820 = a08.find((r) => /^Approve prompts to allow the app/.test(r.old));
  const a0819 = a08.find((r) => r.old === "System Prompt");
  const bad = [];
  if (!/\| instructions \(what staff write for Kiwi\) \| system prompt, prompts \|[^\n]*the tutor's instructions only/.test(termT)) bad.push("the instructions row does not say it is the tutor's only");
  if (!/\| prompt \(a registered app's admin-approved prompt\)[^\n]*kiwi-app-sdk\/README\.md:111/.test(termT)) bad.push("no row keeps \"prompt\" for the registered apps with its reason");
  if (!a0820 || !/kiwi-app-sdk\/README\.md:111/.test(a0820.note) || /instructions/i.test(a0820.new)) bad.push("A-08.20 contradicts the decision");
  if (!a0819 || a0819.new !== "System prompt") bad.push("A-08.19 changes the registered prompt's text label");
  check("F18", "the terminology keeps \"prompt\" for a registered app's admin-approved prompt (the SDK's word) and limits \"instructions\" to the tutor's and the experiment form's; A-08.19 and A-08.20 agree", bad.length === 0, bad.join("; ") || "A-08.17 to A-08.23 keep \"prompt\"; A-08.20 cites the SDK");
}
// F19: one rule for full stops on state lines (m6) and one line on "consequence first" (N1)
{
  const c5 = (voice.match(/^\| `C5` \|.*$/m) || [""])[0];
  const c11 = (voice.match(/^- \*\*Confirmation \(C11\)\.\*\*.*$/m) || [""])[0];
  const bad = [];
  if (!/an empty line that reports an absence in one clause of 8 words or fewer \("No classes yet"[^|]*as the empty-state heading does \(DS\.23\)/.test(c5) || !/"No materials yet\." → "No materials yet"/.test(c5)) bad.push("C5 does not state the state-line rule");
  if (!/"Consequence first" means the first sentence of the body: the title only names the action and its object/.test(c11)) bad.push("C11 does not say what consequence first means");
  const stray = rows.filter((r) => ["empty", "heading", "status", "label"].includes(r.kind) && /^(No|Nothing|None)\b[^.!?]*\.$/.test(r.new) && r.new.split(/\s+/).length <= 8).map((r) => r.id);
  if (stray.length) bad.push(`state lines with a full stop: ${stray.join(", ")}`);
  check("F19", "C5 states that a one-clause state line takes no full stop and every such row obeys it; C11 says that \"consequence first\" means the body's first sentence", bad.length === 0, bad.join("; ") || "C5, C11 and every empty-state row agree");
}
// G3: Companion principle 4 and the drafts line (m5); no unmeasured duration claim (m3)
{
  const compT = design.slice(design.indexOf("\n## Companion"), design.indexOf("\n## Voice and tone"));
  const claim = rows.filter((r) => /usually takes|takes under a minute/i.test(r.new)).map((r) => r.id);
  // every "draft" in the Companion section, with the markdown stripped (the seventh review: the old test read one spelling of one line and missed "Text twins are **drafts**"):
  // the only one left is the hand-off's history, "drafts when handed over, final since Phase 5"
  const plain = compT.replace(/[*`]/g, "");
  const draftClaims = [];
  for (const m of plain.matchAll(/\bdraft(?:s|ed)?\b/gi)) {
    const around = plain.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, " ");
    if (!/drafts when handed over, final since Phase 5/.test(around)) draftClaims.push(`"${around.trim()}"`);
  }
  const voiceDrafts = [...voice.replace(/[*`]/g, "").matchAll(/text twins? (?:are|is) drafts?\b/gi)].length;
  stats.twinDrafts = { companionMentions: [...plain.matchAll(/\bdraft(?:s|ed)?\b/gi)].length, allowed: [...plain.matchAll(/drafts when handed over, final since Phase 5/g)].length };
  check("G3", "Companion principle 4 reads \"every state that conveys information has a text twin\", no sentence of the Companion section or of the Voice section still calls the twins drafts (the one \"draft\" left is the hand-off's history, \"drafts when handed over, final since Phase 5\"); no new string claims a duration nobody measured", /Every state that conveys information has a text twin/.test(compT) && draftClaims.length === 0 && voiceDrafts === 0 && !/usually takes/.test(voice) && claim.length === 0, [...draftClaims, ...claim].join(", ") || `the Companion section says draft ${stats.twinDrafts.companionMentions} time (the hand-off's history)`);
}

// ---------------------------------------------------------------- 5b. DW-5.5: the new copy the plan names
const grp = (id) => groups.find((g) => g.id === id)?.rowsResolved ?? [];
const dsAt = (s) => grp("DS").filter((r) => r.anchors.some((a) => a.at && a.at.includes(s)));
const w55 = {
  "Display menu": dsAt("The Display menu").length >= 5,
  "mascot empty states": grp("S-01").filter((r) => /^No classes yet$/.test(r.new)).length === 1 && grp("SR-6").some((r) => /^Ask about your class materials or your code\.$/.test(r.new)) && grp("A-01").filter((r) => r.kind === "empty").length >= 3 && grp("A-19").some((r) => r.kind === "empty") && dsAt("The empty-state frame").length >= 5,
  "not-found page": grp("S-10").length >= 4,
  "sign-in": grp("SR-5").length >= 3 && grp("S-05").length >= 10 && grp("S-06").length >= 2,
  "companion state text": grp("CP").length >= 6,
  "email templates (both copies)": grp("EM").length >= 20 && grp("EM").filter((r) => r.anchors.filter((a) => a.file).length >= 2).length >= 10,
};
const w55bad = Object.entries(w55).filter(([, ok]) => !ok).map(([k]) => k);
check("I1", "DW-5.5: new copy exists for the Display menu, mascot empty states, not-found, sign-in, the companion's state text and the email templates", w55bad.length === 0, w55bad.length ? "missing: " + w55bad.join(", ") : `Display menu ${dsAt("The Display menu").length} rows; not found ${grp("S-10").length}; sign-in ${grp("SR-5").length + grp("S-05").length + grp("S-06").length}; Companion ${grp("CP").length}; email ${grp("EM").length}`);
stats.dw55 = { displayMenu: dsAt("The Display menu").length, notFound: grp("S-10").length, signIn: grp("SR-5").length + grp("S-05").length + grp("S-06").length, companion: grp("CP").length, email: grp("EM").length };
const tdMissing = ["TD-02", "TD-10", "TD-12", "TD-16", "TD-20", "TD-21", "TD-24", "TD-26", "TD-33", "TD-37", "TD-38"].filter((t) => !rows.some((r) => String(r.refs).split(/[,\s]+/).includes(t)));
check("I2", "every Phase 5 tour defect (TD-02, 10, 12, 16, 20, 21, 24, 26, 33, 37, 38) is resolved by at least one revision row, or is a CSS-capitals case the type tokens fix", tdMissing.every((t) => t === "TD-10" || t === "TD-26"), tdMissing.length ? `no row for ${tdMissing.join(", ")} (TD-10 and TD-26 are CSS capitals over strings that are already sentence case: no string changes)` : "all eleven have rows");

// ---------------------------------------------------------------- 6. Companion text twins
const cs = design.indexOf("### The nine states"), ce = design.indexOf("**The user's decisions (2026-10-17, on the rendered sheet).**");
const companion = normText(design.slice(cs, ce));
const cpRows = groups.find((g) => g.id === "CP")?.rowsResolved ?? [];
const cpMiss = cpRows.filter((r) => !companion.includes(normText(r.new)));
const cpOldGone = cpRows.filter((r) => r.old && companion.includes(normText(r.old)) && !companion.includes(normText(r.new)));
check("G1", "every Companion twin in the index occurs verbatim in § Companion, and the drafted wording is gone", cpMiss.length === 0 && cpOldGone.length === 0, cpMiss.map((r) => r.id).join(", ") || `${cpRows.length} of ${cpRows.length}`);
const a7 = /same words for either thumb/.test(design) && !/(wave|clip|animation)[^|\n]{0,40}\bdislike\b/i.test(sect("Companion text").split("Pending decision A-7")[0]);
check("G2", "the like and dislike text is neutral on A-7 and the dependency is noted", /Pending decision A-7/.test(voice) && /same words for either thumb/.test(design));

// ---------------------------------------------------------------- 6b. cross-section consistency (round 5)
// A string or a state-to-copy mapping that appears in more than one place must agree. K1 and K2 read every quoted word in the sections that
// state the words of a state (the Companion's twin cells, the Voice section's Companion text and Step labels, the tone map and the voice
// attributes' samples, and the committed lines that point at Phase 5) and resolve each to an index row, a kept string, a closed cause line or a
// declared non-product quote (doc-strings.json); K3 to K6 compare the mappings themselves.
const docStrings = JSON.parse(fs.readFileSync(path.join(HERE, "doc-strings.json"), "utf8")).strings;
const xq = (t) => normText(String(t).replace(/\\"/g, '"'));
const xstrip = (t) => xq(t).replace(/^"|"$/g, "").trim();
const xslotless = (t) => xq(t).replace(/\{dots\}/g, "…").replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim();
const xNew = new Map(), xOld = new Map(), xKept = new Map(), xTemplates = [], xRuns = [];
for (const r of resolved) {
  const n = xstrip(r.new);
  if (r.keep) { xKept.set(n, r.id); continue; }
  xNew.set(n, r.id); xNew.set(xslotless(n), r.id);
  if (/\{[^}]*\}/.test(n) && n.replace(/\{[^}]*\}/g, "").replace(/\s+/g, " ").trim().length >= 10) xTemplates.push([new RegExp("^" + n.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\?\{[^}]*\\?\}/g, ".+?") + "$"), r.id]);
  xRuns.push([xq(r.new), r.id]);
  if (r.old) xOld.set(xstrip(r.old), r.id);
}
for (const g of groups) for (const k of g.kept || []) xKept.set(normText(k.replace(/\s+\([^)]* [^)]*\)\s*$/, "")), `${g.id} kept`);
const xCause = new Set();
for (const v of [...Object.values(CAUSES), ...Object.values(CAUSES_MCP)]) for (const t of [v.line, v.fix]) if (t) { const x = normText(t); xCause.add(x); xCause.add(x.replace(/^Kiwi (couldn't|can't)/, "It $1").replace(/^Kiwi's server/, "Its server")); }
function resolveWord(S) {
  if (xNew.has(S) || xNew.has(xslotless(S))) return { how: "new", id: xNew.get(S) || xNew.get(xslotless(S)) };
  if (xKept.has(S)) return { how: "kept", id: xKept.get(S) };
  if (xCause.has(S)) return { how: "cause line", id: "§ Errors" };
  for (const [re, id] of xTemplates) if (re.test(S)) return { how: "template", id };
  for (const [n, id] of xRuns) {
    const i = n.indexOf(S);
    if (i >= 0 && (i === 0 || /[.?!…]\s$/.test(n.slice(0, i))) && (i + S.length === n.length || /^\s/.test(n.slice(i + S.length)))) return { how: "sentence", id };
  }
  for (const [n, id] of xRuns) if (n.includes('"' + S + '"') || n.includes('\\"' + S + '\\"')) return { how: "quoted in a row", id };
  if (xOld.has(S)) return { how: "old", id: xOld.get(S) };
  return null;
}
// the quoted words of a text: straight double quotes, code spans left out (`role="alert"` is code, not a string)
const xQuoted = (text) => {
  const t = text.replace(/`[^`]*`/g, " ").replace(/\\"/g, "\u0001");
  const out = []; const re = /"([^"\n]{1,260}?)"/g; let m;
  // a one-character quote ("…", "—") is a glyph, not a string: it is read so that the pairing of quotes holds, and left out of the list
  while ((m = re.exec(t))) { const w = normText(m[1].replace(/\u0001/g, '"')); if (w.length >= 2) out.push(w); }
  return out;
};
const xStatesTable = design.slice(design.indexOf("### The nine states"), design.indexOf("**The user's decisions (2026-10-17, on the rendered sheet).**"));
const xStateLines = xStatesTable.split("\n").filter((l) => /^\| `(peek|retract|walk|speaking|hop|wave|error|offline|idle)` /.test(l));
const xTwinCells = xStateLines.map((l) => l.split(" | ").slice(-1)[0]).join("\n");
const xToneSamples = tableRows(sect("Tone map")).map((l) => l.split(" | ").slice(3, 5).join("\n")).join("\n");
const xAttrIn = [...studentRows, ...staffRows].map((l) => l.split(" | ")[2]).join("\n");
const PRODUCT_KINDS = ["shape", "purpose", "path", "old", "rule", "composition", "code", "wrong", "dev", "excerpt"];
const SAMPLE_KINDS = [...PRODUCT_KINDS, "sample"];
const xUsed = new Set(); const xReport = {}; const xBad = [];
const xExamples = []; // the rows the guide's own examples quote (the tone map's samples and the voice attributes' in-range samples): R1 holds each to C16
function xRegion(name, text, kinds, collect) {
  const seen = [...new Set(xQuoted(text))];
  let viaRow = 0, declared = 0;
  for (const S of seen) {
    const r = resolveWord(S);
    if (r && r.how !== "old") { viaRow++; if (collect) collect.push({ S, how: r.how, id: r.id }); continue; }
    const d = docStrings.find((x) => normText(x.text) === S);
    if (d && kinds.includes(d.kind)) { xUsed.add(d.text); declared++; continue; }
    xBad.push(`${name}: "${S.slice(0, 100)}"${r ? ` is an old string of ${r.id}: quote it as history only, and declare it (kind "old")` : d ? ` is declared as "${d.kind}", which this place does not accept` : " has no row, is not kept and is not declared"}`);
  }
  xReport[name] = { read: seen.length, viaRow, declared };
}
xRegion("the Companion's twin cells", xTwinCells, PRODUCT_KINDS);
xRegion("Companion text", sect("Companion text"), PRODUCT_KINDS);
xRegion("Step labels", sect("Step labels"), PRODUCT_KINDS);
xRegion("Errors", sect("Errors"), PRODUCT_KINDS);
xRegion("Confirmations, empty states, progress and fields", sect("Confirmations, empty states, progress and fields"), PRODUCT_KINDS);
xRegion("Email templates", sect("Email templates"), PRODUCT_KINDS);
xRegion("the Voice section's hand-offs", sect("Hand-offs"), PRODUCT_KINDS);
// the seventh review found a rule that still quoted a title the webhook's Delete no longer has (C5's "Delete this webhook?"): the rules, the formats, the terminology
// table and the page names hold quoted words too, and each is a row, a kept string or a declared quote, so a quote cannot go stale
xRegion("Microcopy rules", sect("Microcopy rules"), PRODUCT_KINDS);
xRegion("Dates, times and numbers", sect("Dates, times and numbers"), PRODUCT_KINDS);
xRegion("Terminology", sect("Terminology"), PRODUCT_KINDS);
xRegion("Page names", sect("Page names"), PRODUCT_KINDS);
xRegion("the tone map's samples", xToneSamples, SAMPLE_KINDS, xExamples);
xRegion("the voice attributes' in-range samples", xAttrIn, SAMPLE_KINDS, xExamples);
const xCheck1Bad = xBad.length;
// K2: the committed lines that point at Phase 5 ("Phase 5 words", "Phase 5 copy", the list of placeholders): each word they quote is a row (its Old, a
// placeholder the row supersedes, counts here), a kept string, or declared
{
  const lines = design.slice(0, design.indexOf("\n## Voice and tone")).split("\n");
  let read = 0, viaRow = 0, declared = 0, scanned = 0;
  const compStart = design.slice(0, design.indexOf("### The nine states")).split("\n").length - 1;
  const compEnd = design.slice(0, design.indexOf("### Motion controls")).split("\n").length - 1;
  const hoStart = design.slice(0, design.indexOf("\n## Voice and tone")).lastIndexOf("### Hand-offs") >= 0 ? design.slice(0, design.slice(0, design.indexOf("\n## Voice and tone")).lastIndexOf("### Hand-offs")).split("\n").length - 1 : lines.length;
  lines.forEach((l, i) => {
    // the committed lines that point at Phase 5, and the Companion's state table, its collisions and compare-mode paragraphs and its hand-offs (the words a chat state is told in)
    if (!(/Phase 5/.test(l) || (i >= compStart && i < compEnd) || i >= hoStart)) return;
    scanned++;
    const text = /^\| `(peek|retract|walk|speaking|hop|wave|error|offline|idle)` /.test(l) ? l.split(" | ").slice(0, -1).join(" | ") : l;
    for (const S of [...new Set(xQuoted(text))]) {
      read++;
      if (resolveWord(S)) { viaRow++; continue; }
      const d = docStrings.find((x) => normText(x.text) === S);
      if (d && PRODUCT_KINDS.includes(d.kind)) { xUsed.add(d.text); declared++; continue; }
      xBad.push(`committed line ${i + 1}: "${S.slice(0, 100)}" has no row, is not kept and is not declared`);
    }
  });
  xReport["committed lines that name Phase 5"] = { read, viaRow, declared, lines: scanned };
}
const xStale = docStrings.filter((d) => !xUsed.has(d.text)).map((d) => `doc-strings.json: "${d.text.slice(0, 80)}" is no longer quoted in any place the check reads`);
const xKinds = docStrings.filter((d) => !SAMPLE_KINDS.includes(d.kind) || !d.why || !String(d.why).trim()).map((d) => `doc-strings.json: "${d.text.slice(0, 60)}" has no valid kind or no reason`);
check("K1", "every word quoted in the Companion's twin cells, the Companion text, the step labels, the Errors section, the confirmation, empty-state and field rules, the email templates, the Voice hand-offs, the microcopy rules, the date formats, the terminology table, the page names, the tone map and the voice samples is an index row, a kept string, a closed cause line or a declared non-product quote (a placeholder, a purpose, a path name, an old wording, a wrong example, developer text, an example), and no declaration is stale", xBad.filter((b) => !b.startsWith("committed")).length === 0 && xStale.length === 0 && xKinds.length === 0,
  [...xBad.filter((b) => !b.startsWith("committed")), ...xStale, ...xKinds].length ? `\n        ${list([...xBad.filter((b) => !b.startsWith("committed")), ...xStale, ...xKinds], 40)}` : Object.entries(xReport).filter(([k]) => !/committed/.test(k)).map(([k, v]) => `${k}: ${v.read} read, ${v.viaRow} rows or kept, ${v.declared} declared`).join("; "));
check("K2", "every word quoted on a committed line that points at Phase 5 (\"Phase 5 words\", \"Phase 5 copy\", the placeholders it lists), in the Companion's state table, its collisions and compare-mode paragraphs and its hand-offs is an index row, a placeholder a row supersedes, a kept string or declared", xBad.filter((b) => b.startsWith("committed")).length === 0,
  xBad.filter((b) => b.startsWith("committed")).length ? `\n        ${list(xBad.filter((b) => b.startsWith("committed")), 40)}` : `${xReport["committed lines that name Phase 5"].read} quoted words on ${xReport["committed lines that name Phase 5"].lines} committed lines: ${xReport["committed lines that name Phase 5"].viaRow} rows or kept, ${xReport["committed lines that name Phase 5"].declared} declared`);
stats.crossSection = { regions: xReport, declared: docStrings.length, byKind: Object.fromEntries(SAMPLE_KINDS.map((k) => [k, docStrings.filter((d) => d.kind === k).length])) };


// F25: the email table and the index agree to the letter (the ninth review's MAJ-1). F13 says that the table is the one source of the mail's words, but EM.21 had dropped the
// "({professorName})" that the table and the backend template keep, and K1 let it pass because K1 resolves a quoted sentence against a row's template, which is loose on purpose
// elsewhere. Here the match is exact, in both directions: every EM row that has a New text occurs word for word in the table, and every quoted string in a template row of the
// table is exactly an index row's New text or a kept string, never only the template of one.
{
  const bad = [];
  const emailT2 = sect("Email templates");
  const exactNew = new Set(resolved.filter((r) => !r.keep).map((r) => xstrip(r.new)));
  const emRows2 = resolved.filter((r) => r.group === "EM" && !r.keep && r.kind !== "remove");
  for (const r of emRows2) if (!emailT2.includes(r.new)) bad.push(`${r.id}: "${r.new.slice(0, 80)}" is not in the table, word for word`);
  const tplRows = emailT2.split("\n").filter((l) => /^\| (?:Class announcement|Important notification|Welcome|Class enrollment) \|/.test(l));
  let quotedWords = 0;
  for (const l of tplRows) for (const S of new Set(xQuoted(l))) {
    quotedWords++;
    if (!exactNew.has(S) && !xKept.has(S) && !docStrings.some((d) => normText(d.text) === S)) bad.push(`the table quotes "${S.slice(0, 80)}", which is not the New text of a row or a kept string${resolveWord(S) ? ` (it matches ${resolveWord(S).id} only as ${resolveWord(S).how})` : ""}`);
  }
  stats.emailTable = { rows: emRows2.length, templates: tplRows.length, quoted: quotedWords };
  check("F25", "the email table and the index agree to the letter: every EM row that has a New text occurs word for word in the table, and every quoted string in a template row of the table is exactly an index row's New text or a kept string", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : `${emRows2.length} EM rows are in the table word for word; the ${quotedWords} quoted strings of its ${tplRows.length} template rows are each a New text or a kept string`);
}
// K3: the walk state's words are one thing in every place. The labels the source can draw (AgentStepChain.tsx and the tool pill) are read, mapped
// through the rows to the words they will carry, and each must be in § Step labels under the kind its shape says; the twin cell, the Companion text
// and the SR-6 rows say the same; "Thinking…" is the wait and nothing else.
{
  const bad = [];
  const asc = fs.readFileSync(path.join(UI, "src/components/Chat/AgentStepChain.tsx"), "utf8");
  const tsi = fs.readFileSync(path.join(UI, "src/components/Chat/ToolStatusIndicator.tsx"), "utf8");
  const header = (asc.match(/running\s*\?\s*"([^"]+)"/) || [])[1];
  const srcLabels = [...asc.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  const sr6 = groups.find((g) => g.id === "SR-6").rowsResolved;
  const finalOf = (l) => { const r = sr6.find((x) => !x.keep && x.old === l && x.anchors.some((a) => /AgentStepChain/.test(a.file || ""))); return r ? r.new : l; };
  const shapeKind = (l) => /^(Checking|Looking up|Reading|Searching)\b/.test(l) ? "reading" : / for you$/.test(l) ? "acting" : /^(Running|Using)\b/.test(l) ? "tool" : l === "Working…" ? "no name" : null;
  const table = {};
  for (const l of tableRows(sect("Step labels"))) {
    const c = l.split(" | "); const kind = (c[0] || "").replace(/^\|\s*/, "").replace(/\*/g, "").trim().toLowerCase();
    table[kind] = { cell: c[3] || "", labels: [...(c[3] || "").matchAll(/"([^"]+)" \((SR-6\.\d+|kept)\)/g)].map((m) => ({ text: normText(m[1]), id: m[2] })), all: xQuoted(c[3] || "") };
  }
  const kinds = ["wait", "reading", "acting", "tool", "no name"];
  for (const k of kinds) if (!table[k]) bad.push(`§ Step labels has no ${k} row`);
  // each listed label is the New of the row it cites (or a kept string)
  for (const k of kinds) for (const { text, id } of (table[k]?.labels || [])) {
    if (id === "kept") { if (!xKept.has(text)) bad.push(`"${text}" is listed as kept and is not a kept string`); }
    else { const r = sr6.find((x) => x.id === id); if (!r || (r.new !== text && xslotless(r.new) !== xslotless(text))) bad.push(`"${text}" is not the New of ${id} ("${r?.new}")`); }
    const sk = shapeKind(text);
    if (k === "reading" && sk !== "reading") bad.push(`"${text}" is listed as reading but does not start with Checking, Looking up, Reading or Searching`);
    if (k === "acting" && sk !== "acting") bad.push(`"${text}" is listed as acting but does not end "for you"`);
    if (k === "tool" && / for you$/.test(text)) bad.push(`"${text}" is a tool label and ends "for you"`);
    if (k === "no name" && text !== "Working…") bad.push(`"${text}" is the no-name label and is not "Working…"`);
  }
  // every label the source can draw is classified, under the kind its shape says
  const drawn = [...srcLabels.map((l) => ["chain label", l, finalOf(l)]), ["chain header", header, header], ["tool pill", "Using ${displayName}...", "Using {displayName}…"]];
  for (const [what, src, fin] of drawn) {
    if (!fin) { bad.push(`${what} "${src}" has no final words`); continue; }
    const listed = kinds.filter((k) => (table[k]?.labels || []).some((x) => x.text === normText(fin) || xslotless(x.text) === xslotless(fin)));
    const sk = shapeKind(fin);
    if (listed.length !== 1) bad.push(`${what} "${src}" becomes "${fin}", which is listed under ${listed.length} kinds in § Step labels`);
    else if (sk && listed[0] !== sk) bad.push(`${what} "${fin}" is listed as ${listed[0]} and its shape says ${sk}`);
    else if (!sk && listed[0] !== "tool") bad.push(`${what} "${fin}" has no recognised shape and is not listed as a tool label`);
  }
  // the fallback and the header are one string, with the ellipsis
  const fb = sr6.find((r) => !r.keep && r.old === "Thinking" && r.anchors.some((a) => /AgentStepChain/.test(a.file || "")));
  if (!fb || fb.new !== header || header !== "Working…") bad.push(`the fallback step label (${fb?.id}: "${fb?.new}") and the chain's header ("${header}") are not one string`);
  if (fb && !/Thinking…[^.]*wait before the first step/.test(fb.note)) bad.push("the fallback row's note does not state the rule (\"Thinking…\" is the wait before the first step)");
  // the loader row exists and names every place that draws it
  const loader = sr6.find((r) => !r.keep && r.old === "{dots}" && r.anchors.some((a) => /Loader\.tsx$/.test(a.file || "")));
  const loaderSites = [];
  for (const f of walk(path.join(UI, "src"))) { const rl = path.relative(UI, f).split(path.sep).join("/"); fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/<Loader\b/.test(l) && !/^\s*(\/\/|\*|import)/.test(l)) loaderSites.push(`${path.basename(rl)}:${i + 1}`); }); }
  if (!loader) bad.push("no loader row (the wait has no words)");
  else {
    if (loader.new !== "Thinking{dots}") bad.push(`the loader row says "${loader.new}": the word, then the text dots as its ellipsis`);
    const missingSite = loaderSites.filter((s) => !loader.note.includes(s.replace(/^[^:]+:/, ":")) && !loader.note.includes(s));
    if (missingSite.length) bad.push(`the loader row's note does not name the place(s) that draw the loader: ${missingSite.join(", ")}`);
    if (!loader.tests.length || !loader.tests.every((t) => t.via === "kept")) bad.push("the loader row does not list the tests that query its dots");
  }
  // the twin cell says the same labels, by kind
  const walkCell = xStateLines.find((l) => /^\| `walk` /.test(l)).split(" | ").slice(-1)[0];
  const twin = xQuoted(walkCell);
  for (const k of ["reading", "acting"]) for (const { text } of table[k].labels) if (!twin.includes(text)) bad.push(`the walk twin does not list the ${k} label "${text}"`);
  for (const t of twin) { const sk = shapeKind(t); if ((sk === "reading" || sk === "acting") && !table[sk].labels.some((x) => x.text === t)) bad.push(`the walk twin lists "${t}", which § Step labels does not`); }
  for (const must of ["Thinking…", "Working…", "Running code"]) if (!twin.includes(must)) bad.push(`the walk twin does not say "${must}"`);
  if (!/\*\*tool\*\* step/.test(walkCell) || !/\*\*reading\*\* step/.test(walkCell) || !/\*\*acting\*\* step/.test(walkCell)) bad.push("the walk twin does not name the three kinds");
  const ctext = sect("Companion text");
  for (const must of ["Thinking…", "Working…", "Running code", "tool", "reading", "acting"]) if (!ctext.includes(must)) bad.push(`§ Companion text's walk twin bullet does not mention ${must}`);
  // "Thinking…" is the wait: every line that quotes it says so (or is the Phase 3 loading row, which says "+ dots")
  const thinkLines = design.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => l.includes('"Thinking…"'));
  const notWait = thinkLines.filter(([, l]) => !/\bwait|first step|first token|\+ dots|text twins|concession/i.test(l)).map(([n]) => n);
  if (notWait.length) bad.push(`"Thinking…" is quoted on line(s) ${notWait.join(", ")} without saying it is the wait before the first step`);
  // the SR-6 test line: the header's query is listed on the fallback row
  const t80 = fb && fb.tests.some((t) => t.name === "AgentStepChain.test.tsx" && t.via === "new");
  if (!t80) bad.push("the fallback row does not list the test that asks for the header (AgentStepChain.test.tsx, an n reference)");
  check("K3", "the walk state's words agree everywhere: every label the source can draw is classified (reading, acting, tool, no name) under the kind its shape says, the twin cell, the Companion text and the SR-6 rows list the same labels, the fallback step and the header are one string, \"Thinking…\" is only the wait, and the loader row names its sites and its dot tests", bad.length === 0,
    bad.length ? `\n        ${list(bad, 40)}` : `${drawn.length} drawn labels in ${kinds.length} kinds (${kinds.map((k) => `${k} ${(table[k].labels || []).length || (k === "wait" ? 1 : 0)}`).join(", ")}); the header and the fallback are "${header}"; ${thinkLines.length} lines quote "Thinking…", all as the wait; the loader is drawn at ${loaderSites.join(", ")}`);
  stats.stepLabels = { drawn: drawn.length, kinds: Object.fromEntries(kinds.map((k) => [k, (table[k]?.labels || []).length])), thinkingLines: thinkLines.length, loaderSites: loaderSites.length };
}

// K4: "No token" is the expired subtype, not the retryable one (the Companion hand-off, locked, says retryable; § Errors supersedes it). Nothing with
// the expired cause offers Retry, the twin and SR-6.13 say the same words, and the source still behaves the way the supersession says.
{
  const bad = [];
  const errT = sect("Errors"), ctext = sect("Companion text"), hand = sect("Hand-offs");
  const supersession = /supersedes it for those two paths/.test(errT) && /\*\*"No token"\*\*[^]*expired[^]*never offers Retry/.test(errT) && /\*\*"Token expired"\*\*[^]*not an error at all/.test(errT) && /renewal fails[^]*sign-in page/.test(errT);
  if (!supersession) bad.push("§ Errors has no supersession of the Phase 4 hand-off for \"No token\" and \"Token expired\"");
  if (!/expired \("Couldn't send your question\./.test(ctext)) bad.push("§ Companion text does not list the expired subtype");
  if (!/Implementation plan \(the chat's error paths\)[^]*`No token`[^]*expired cause[^]*without Retry/.test(hand)) bad.push("the hand-offs do not carry the supersession to the implementation plan");
  if (!/Token expired[^]*renewal[^]*never as an error row/.test(hand)) bad.push("the hand-offs do not say that \"Token expired\" is never an error row");
  const comp = design.slice(design.indexOf("\n## Companion"), design.indexOf("\n## Voice and tone"));
  const handLine = comp.split("\n").find((l) => /^- \*\*Implementation plan \(classification and sizes\):\*\*/.test(l)) || "";
  if (!/`No token`[^;]*→ retryable/.test(handLine) && !/`No token`, `Token expired`[^;]*retryable/.test(handLine)) bad.push("the Phase 4 hand-off line no longer has the mapping this section supersedes (it is locked: do not edit it)");
  const sr13 = resolved.find((r) => r.id === "SR-6.13"), sr14 = resolved.find((r) => r.id === "SR-6.14"), sr15 = resolved.find((r) => r.id === "SR-6.15");
  if (!sr13 || sr13.err?.c !== "expired") bad.push("SR-6.13 (\"No token\") is not the expired cause");
  if (!sr14 || sr14.kind !== "status" || !sr15 || sr15.kind !== "status") bad.push("SR-6.14 and SR-6.15 (the renewal) are not statuses");
  if (sr14 && !/sign-in page/.test(sr14.note)) bad.push("SR-6.14's note does not say what the student sees when the renewal fails");
  const expiredRows = rows.filter((r) => r.err?.c === "expired");
  for (const r of expiredRows) if (/\bRetry\b|\btry again\b/i.test(r.new)) bad.push(`${r.id} has the expired cause and offers Retry or "Try again": ${r.new.slice(0, 80)}`);
  for (const r of rows) if (r.err?.c !== "expired" && /sign-in has expired|signed you out|signed out\b/i.test(r.new) && /\bRetry\b|\btry again\b/i.test(r.new)) bad.push(`${r.id} says the sign-in has ended and offers Retry or "Try again": ${r.new.slice(0, 80)}`);
  const cp16 = cpRows.find((r) => /^expired → /.test(r.new));
  if (!cp16 || !sr13 || !cp16.new.includes(`"${sr13.new}"`)) bad.push("the Companion's expired twin is not SR-6.13's words");
  if (cp16 && /\bRetry\b|\btry again\b/i.test(cp16.new)) bad.push("the Companion's expired twin offers Retry");
  const errCell = xStateLines.find((l) => /^\| `error` /.test(l)).split(" | ").slice(-1)[0];
  if (!/none of the three with Retry/.test(errCell)) bad.push("the error twin does not say that quota, permission and expired offer no Retry");
  for (const r of cpRows) if (/^(quota|permission|expired)\b/.test(r.new) && /\bRetry\b/.test(r.new)) bad.push(`${r.id} offers Retry for a cause that cannot be retried`);
  // the source still does what the supersession says
  const login = fs.readFileSync(path.join(UI, "src/pages/Login.tsx"), "utf8");
  const chatCore = fs.readFileSync(path.join(UI, "src/components/Chat/ChatCore.tsx"), "utf8");
  if (!/get\("timeout"\)/.test(login) || /sessionExpired/.test(login)) bad.push("Login.tsx no longer reads only ?timeout=true: the supersession's account of the sign-in page is stale");
  if (!/\/login\?sessionExpired=true/.test(chatCore)) bad.push("ChatCore.tsx no longer sends ?sessionExpired=true: the supersession is stale");
  check("K4", "\"No token\" is the expired subtype: § Errors supersedes the locked Companion hand-off for it and for \"Token expired\" (the automatic renewal, never an error row), the twin, the hand-off and SR-6.13 agree, and no row or twin with the expired cause offers Retry", bad.length === 0,
    bad.length ? `\n        ${list(bad, 20)}` : `the supersession is in § Errors, § Companion text and the hand-offs; ${expiredRows.length} expired error rows and the twin offer no Retry; SR-6.13 is expired, SR-6.14 and SR-6.15 are statuses; the sign-in page reads only ?timeout=true and the chat sends ?sessionExpired=true`);
  stats.expired = { rows: expiredRows.length };
}

// K5: the name is said once: no new string has two sentences that open with Kiwi (a cause line that opens with it reads "It" after a sentence that names it)
{
  const bad = [];
  const twice = (t) => t.split(/(?<=[.?!…])\s+/).filter((s) => /^"?Kiwi(\b|')/.test(s.replace(/^[a-z]+ → "/, ""))).length >= 2;
  for (const r of rows) if (twice(r.new)) bad.push(`${r.id}: ${r.new.slice(0, 100)}`);
  for (const t of xQuoted(xTwinCells)) if (twice(t)) bad.push(`a twin cell: ${t.slice(0, 100)}`);
  if (!/\*\*Kiwi once\.\*\*/.test(sect("Errors"))) bad.push("§ Errors does not state the rule (Kiwi once)");
  check("K5", "no string says the name twice in a row (two sentences that open with Kiwi): a cause line that opens with it reads \"It\" after a sentence that names it", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : `${rows.length} new strings and the twin cells read; § Errors states the rule`);
}

// K6: every row id a text cites is a row in the index (a kept row has no index entry, so a cite of one points nowhere; the design system's table lists its kept rows)
{
  const ids = new Set(resolved.filter((r) => !r.keep || r.group === "DS").map((r) => r.id));
  const keptOnly = new Set(resolved.filter((r) => r.keep && r.group !== "DS").map((r) => r.id));
  const re = /\b((?:SR-\d|S-\d\d|A-\d\d|R-\d)\.\d{2}|CP\.\d{2}|DS\.\d{2}|EM\.\d{2})\b/g;
  const bad = [];
  const scan = (label, text) => { let m; re.lastIndex = 0; while ((m = re.exec(text))) { if (!ids.has(m[1])) bad.push(`${label}: ${m[1]} ${keptOnly.has(m[1]) ? "is a kept row with no index entry (cite the page's Copy bullet)" : "is not a row"}`); } };
  scan("DESIGN.md § Voice and tone", design.slice(design.indexOf("\n## Voice and tone")).replace(/<!-- copy:evidence:start -->[\s\S]*?<!-- copy:evidence:end -->/, ""));
  for (const r of resolved) scan(`the note of ${r.id}`, r.note || "");
  for (const g of groups) scan(`the note of ${g.id}`, g.note || "");
  const uniq = [...new Set(bad)];
  stats.cites = { ids: [...ids].filter((id) => !id.startsWith("P6-")).length, notes: resolved.filter((r) => !r.phase6).length + groups.filter((g) => g.phase !== 6).length }; // the Phase 5 figures; every id and note was validated above
  check("K6", "every row id that a text cites (the Voice section, every row's note, every page's note) is a row in the index", uniq.length === 0, uniq.length ? `\n        ${list(uniq, 20)}` : `${ids.size} ids; the cites in the Voice section and in ${resolved.length + groups.length} notes all resolve`);
}

// K7: a design-system row says what it supersedes, and the claim is true: a placeholder quoted in the committed Phase 3 text, or the string the code shows today
{
  const committed = normText(design.slice(0, design.indexOf("\n## Voice and tone")));
  const bad = []; let fromText = 0, fromSource = 0;
  const srcFiles = walk(path.join(UI, "src")).map((f) => path.relative(UI, f).split(path.sep).join("/"));
  for (const r of groups.find((g) => g.id === "DS").rowsResolved.filter((x) => !x.keep && x.old)) {
    const o = normText(r.old);
    if (committed.includes(o)) { fromText++; continue; }
    if (srcFiles.some((f) => (readSource(f)?.hay || "").includes(o))) { fromSource++; continue; }
    bad.push(`${r.id}: "${r.old.slice(0, 60)}" is neither quoted in the committed text nor in the source`);
  }
  if (!/Supersedes \(a Phase 3 placeholder, or the string the code shows today\)/.test(design)) bad.push("the shared-strings table's header does not say that a row can supersede the string the code shows today");
  check("K7", "every design-system row that supersedes a string names one that exists: a placeholder quoted in the committed Phase 3 text, or the string the code shows today (the two native alerts, DS.33 and DS.34)", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : `${fromText} placeholders are quoted in the committed text and ${fromSource} are strings the code shows today`);
  stats.supersedes = { text: fromText, source: fromSource };
}

// K8: a Companion twin that restates a row restates it word for word (the twin column is the text equivalent of the state; the row is what ships)
{
  const bad = [];
  const byId = (id) => resolved.find((r) => r.id === id);
  const pairs = [["CP.04", "DS.07", "the composer's reason while an answer streams"], ["CP.07", "SR-6.17", "the quota error"], ["CP.08", "SR-6.18", "the permission error"], ["CP.16", "SR-6.13", "the expired error"]];
  for (const [cp, other, what] of pairs) { const a = byId(cp), b = byId(other); if (!a || !b || !a.new.includes(`"${b.new}"`)) bad.push(`${cp} does not restate ${other} (${what}) word for word`); }
  const retry = byId("CP.06"), bubble = byId("SR-6.21");
  const tpl = ((retry?.new || "").match(/"(Kiwi couldn't finish answering\. \{cause line\} Try again\.)"/) || [])[1];
  if (!tpl || !bubble || tpl.replace("{cause line}", CAUSES.unknown.line) !== bubble.new) bad.push("CP.06's retryable template, with the generic cause line, is not the retryable bubble's message (SR-6.21)");
  check("K8", "every Companion twin that restates a row restates it word for word (the composer's reason, the quota, permission and expired errors, the retryable bubble with its generic cause line)", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : `${pairs.length + 1} twins agree with their rows`);
  stats.twinPairs = pairs.length + 1;
}

// F22: the round-5 minors that are statements: the touch control for clamped server text, user-safe backend messages, the terminology row for
// "assistant", the way-back controls on S-10, and no citation of a row that has no index entry (A-14.34)
{
  const bad = [];
  const termT = sect("Terminology"), errT = sect("Errors"), hand = sect("Hand-offs"), c5 = (voice.match(/^\| `C5` \|.*$/m) || [""])[0], c10 = (voice.match(/^\| `C10` \|.*$/m) || [""])[0];
  if (!/\| assistant \(the experiment assistant[^|]*\| AI assistant, design assistant, chat assistant; assistant for the tutor, who is Kiwi/.test(termT) || !/Teaching assistant/.test(termT)) bad.push("no terminology row for \"assistant\" (the experiment assistant, the role, and what it replaces)");
  const aiAsst = rows.filter((r) => /\b(AI|design|chat) assistant\b/i.test(r.new)).map((r) => r.id);
  if (aiAsst.length) bad.push(`a new string says "AI assistant", "design assistant" or "chat assistant": ${aiAsst.join(", ")}`);
  const ds = (n) => groups.find((g) => g.id === "DS").rowsResolved.find((r) => r.new === n);
  if (!ds("Show full message") || !ds("Hide full message")) bad.push("the design system has no rows for \"Show full message\" and \"Hide full message\"");
  if (!/"Show full message"[^.]*"Hide full message"/.test(errT) || !/touch screen/.test(errT)) bad.push("§ Errors does not specify the visible control for clamped server text on a touch screen");
  if (!/Show full message/.test(c10)) bad.push("C10 does not mention the touch control");
  if (!/\(6\) on a touch screen[^;]*"Show full message"[^;]*"Hide full message"/.test(hand)) bad.push("the messages hand-off does not specify the touch control");
  if (!/\(5\) the backend writes any message it returns in a response body for the person who reads it/.test(hand)) bad.push("the messages hand-off has no backend requirement for user-safe messages");
  // the follow-up to the eleventh review: the clamp is a focusable element, so a keyboard user and a screen reader reach what it hides; § Errors, C10 and the hand-off all say so
  if (!/The clamped element is focusable \(`tabindex="0"`\) and its accessible description is the full text/.test(errT)) bad.push("§ Errors does not say that the clamped element is focusable (tabindex=\"0\") and that its accessible description is the full text");
  if (!/the clamp a focusable element whose accessible description is the full text/.test(c10)) bad.push("C10 does not say that the clamp is a focusable element whose accessible description is the full text");
  if (!/\(2\) clamped server text \(C10\) is a focusable element \(`tabIndex=\{0\}`\) whose accessible description is the full text/.test(hand)) bad.push("the messages hand-off does not make the clamped server text a focusable element with the full text as its accessible description");
  if (!/Only a message the backend wrote for the person who reads it is quoted/.test(errT)) bad.push("§ Errors does not say that only a user-safe message is quoted");
  if (/A-14\.34/.test(voice)) bad.push("the hand-off still cites A-14.34, a kept row with no index entry");
  const s10 = groups.find((g) => g.id === "S-10");
  if (!/links to routes that already exist \(`\/` for a signed-in visitor, `\/login` for a signed-out one\), so they add no route and no region/.test(s10.note || "") || !/never-dead-end/.test(s10.note || "")) bad.push("S-10's Copy bullet does not say that the way-back controls link to existing routes under the never-dead-end constraint");
  const a01 = groups.find((g) => g.id === "A-01").rowsResolved, sr1 = groups.find((g) => g.id === "SR-1").rowsResolved;
  const empt = a01.find((r) => !r.keep && r.old === "No classes assigned"), sidebar = sr1.find((r) => !r.keep && r.old === "No assigned classes");
  // The tenth review: the sidebar's line says who acts, as C12's no-action form asks, so it is the heading's words and then one more sentence. The state keeps one name: the page's
  // heading (A-01) is the first sentence of the sidebar line (SR-1); the second says who acts, shorter than the page's body (A-01.14) because the list has no body line.
  const firstSentence = (t) => (t || "").split(/(?<=[.?!\u2026])\s+/)[0].replace(/\.$/, "");
  if (!empt || !sidebar || empt.new !== firstSentence(sidebar.new)) bad.push(`the instructor's empty heading (A-01) is not the first sentence of the sidebar line (SR-1) ("${empt?.new}" and "${sidebar?.new}")`);
  if (sidebar && !/\bAn administrator assigns\b/.test(sidebar.new)) bad.push("the sidebar line does not say who acts (C12: no action, so the copy says who acts)");
  const sr5 = groups.find((g) => g.id === "SR-5").rowsResolved[0], sr61 = groups.find((g) => g.id === "SR-6").rowsResolved[0];
  if (sr5.new !== sr61.new) bad.push(`the sign-in aside's line (SR-5.01 "${sr5.new}") and the chat's welcome line (SR-6.01 "${sr61.new}") do not say what Kiwi does in the same words`);
  if (!/Teaching assistant/.test(rows.map((r) => r.new).join("\n"))) bad.push("the role label \"Teaching assistant\" is gone from the rows");
  check("F22", "the statements the round-5 review asked for are written: the clamped server text is a focusable element with the full text as its accessible description (§ Errors, C10, the hand-off) and has the visible \"Show full message\" control on a touch screen, user-safe backend messages in the hand-off, a terminology row for \"assistant\", the way-back controls on existing routes, no cite of a kept row, one string for one state", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : "the focusable clamp and the touch control (DS.51, DS.52), the backend requirement, the assistant row, S-10's note, A-01 and SR-1 agree, SR-5.01 is SR-6.01");
}

// F23: the statements the seventh review asked for are written (X1 to X6, N-3, N-8). The webhook's Delete is a deactivate in every place that draws it; the guide says what
// the product does about it; the file delete names what it removes and says chats keep their answers; the offline line keeps what happened first and the tone rule
// allows it; the Companion's twins are final everywhere; the expired chat error says what happens to the question; the input error says why it has no sentence for what
// happened; the one step that fits two kinds is classified with its reason.
{
  const bad = [];
  const row = (id) => rows.find((r) => r.id === id);
  const want = (id, text) => { const r = row(id); if (!r || r.new !== text) bad.push(`${id} is ${JSON.stringify(r?.new)}, not ${JSON.stringify(text)}`); };
  const termT = sect("Terminology"), errT = sect("Errors"), stepT = sect("Step labels"), hand = sect("Hand-offs"), toneT = sect("Tone map"), companion = design.slice(design.indexOf("\n## Companion"), design.indexOf("\n## Voice and tone"));
  // X1
  want("A-09.08", "Deactivate this webhook?"); want("A-09.10", "Deactivate webhook"); want("A-09.73", "Deactivate webhook"); want("A-09.42", "Webhook deactivated");
  const a909 = row("A-09.09");
  if (!a909 || !/stops receiving events/.test(a909.new) || !/Inactive tab/.test(a909.new) || !/Edit webhook/.test(a909.new) || !/Status/.test(a909.new) || /can't be undone|permanent/i.test(a909.new)) bad.push("A-09.09 does not say that the webhook stops receiving events, which tab holds it and which control turns it on again, or still promises permanence");
  if (!/\| deactivate, for a webhook \(it stops receiving events and can be turned on again\) \| delete, remove, for the webhook \|/.test(termT)) bad.push("§ Terminology has no row for deactivate, for a webhook");
  if (!/the webhook's Delete is a soft delete: `webhooks\/webhooks\.service\.ts:173-177` only sets it inactive/.test(hand) || !/Decided under C16/.test(hand) || !/A hard delete would be a product change, and the copy would change with it/.test(hand)) bad.push("the hand-off does not record the decision on the webhook's soft delete (and what a hard delete would change)");
  if (/\bdeleted? (?:this |the |a )?webhook|\bwebhook deleted/i.test(rows.filter((r) => /^A-09\./.test(r.id)).map((r) => r.new).join("\n"))) bad.push("a new string on the webhook page still says a webhook is deleted");
  // X3
  const a1426 = row("A-14.26");
  if (!a1426 || !/its comments, its summaries, the search index Kiwi built from it and the stored file/.test(a1426.new) || !/Chats that cited it keep their answers/.test(a1426.new)) bad.push("A-14.26 does not name what the file delete removes and say that chats keep their answers");
  const a1424 = row("A-14.24");
  if (!a1424 || !/builds its search index again from the new file/i.test(a1424.new)) bad.push("A-14.24 does not agree with A-14.26 about the search index");
  // X4
  if (!/What happened comes first, as the error formula has it, and the tone follows in the same line/.test(toneT) || !/"You're offline\. Waiting for your connection\."/.test(toneT)) bad.push("the tone map does not say that what happened comes first and the tone follows in the same line, with the offline line as the example");
  if (/names the condition, then says that it will resolve/.test(toneT) === false) bad.push("the tone map's offline example does not say how the line meets the rule");
  // X5
  if (!/Text twins are final: Phase 5 revised them in place \(plan carve-out 1\); every change is in the revision index\./.test(companion)) bad.push("the Companion's state-table intro does not say that the twins are final");
  // X6
  want("SR-6.13", "Couldn't send your question. Your sign-in has expired. Your question isn't saved. Copy it, then reload the page to sign in again.");
  if (!/the question is never saved/.test(errT) || !/A reload reaches the sign-in page/.test(errT)) bad.push("§ Errors does not say what happens to the question or where a reload goes");
  if (!/leaves the answering state on/.test(hand)) bad.push("the hand-off does not record that the no-token branch leaves the loader and Stop on");
  // N-3
  // refined in the tenth review (C-1), not reversed: an input error opens with a sentence that states what is wrong, the rule applied to this field, and then gives the correction
  if (!/An input error opens with a sentence that states what is wrong/.test(errT) || !/It never opens with the correction/.test(errT)) bad.push("§ Errors does not say that an input error opens with a statement of what is wrong and never with the correction");
  // N-8
  if (!/\*\*One step, two kinds\.\*\* "Searching your class materials" \(SR-6\.48\)/.test(stepT) || !/Reading wins, because/.test(stepT) || !/the implementation matches the built-in tool's exact name/.test(stepT)) bad.push("§ Step labels does not classify SR-6.48 (the kind that wins, why, and the built-in tool it belongs to)");
  check("F23", "the statements the seventh review asked for are written: the webhook's Delete is a deactivate everywhere and its decision is recorded, the file delete names what it removes, the offline line keeps what happened first, the twins are final, the expired error says what happens to the question, the input error's anatomy and the one step of two kinds are explained", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : "X1 to X6, N-3 and N-8 are in the rows and the guide");
}

// F24: the statements the eighth review asked for. S-05.04, the refused sign-in, says what happened first like its siblings; D1 keeps no exception for a row that opens with its
// cause, and § Errors does not document one; the two counts use the helper; the webhook's state chip is two lookup rows; and the Tests column lists a part of a sentence only
// when the query is a whole sentence of it.
{
  const bad = [];
  const row = (id) => rows.find((r) => r.id === id);
  const want = (id, text) => { const r = row(id); if (!r || r.new !== text) bad.push(`${id} is ${JSON.stringify(r?.new)}, not ${JSON.stringify(text)}`); };
  want("S-05.04", "Couldn't sign you in. That email and password don't match. Check both and try again, or ask your administrator to reset your password.");
  for (const id of ["S-05.03", "S-05.04", "S-05.05", "S-05.16"]) { const r = row(id); if (!r || !/^Couldn't sign you in\. /.test(r.new)) bad.push(`${id} does not open with what happened (Couldn't sign you in.)`); }
  want("S-02.07", "Your instructor added {n: count summary}");
  want("A-04.40", "\u2026 and {n: count more pending user}");
  const act = rows.filter((r) => r.lk === "activity");
  if (act.length !== 2 || act.some((r) => (r.lkVals || []).length !== 1)) bad.push(`the webhook state chip is two lookup rows with one value each, and is ${act.length} rows with ${act.map((r) => (r.lkVals || []).length).join(" and ")} values`);
  if (/cause in the first clause|authentication and permission/i.test(sect("Errors"))) bad.push("§ Errors documents a cause-first exception: every error row says what happened, and only the input-error form leaves the why out");
  if (!/or by containment when the query is a whole sentence of the old string or contains it/.test(indexText)) bad.push("the index header does not say that a containment reference is a whole sentence of the old string");
  const a2231 = row("A-22.31");
  if (!a2231 || a2231.tests.some((t) => t.via === "string") || !/not references to it/.test(a2231.note)) bad.push("A-22.31 still lists a query for the term Code Interpreter as a reference to its sentence, or its note does not say why not");
  check("F24", "the statements the eighth review asked for are written: S-05.04 says what happened first like its siblings and D1 keeps no cause-first exception, the two counts use the helper, the webhook state chip is two lookup rows, and the Tests column lists a part of a sentence only when it is a whole sentence", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : "S-05.04 and its siblings open with what happened; S-02.07 and A-04.40 use the helper; A-09.04 and A-09.87 are one value each; A-22.31 lists only the query that reads its sentence");
}

// F26: the statements the ninth review asked for. (1) EM.21 keeps the optional part that the backend template writes ("{ ({professorName})}"), and the two template lines
// its note cites still write the name only when it is set; (2) the sidebar label and the title of the class list say "Your classes" for both roles (C8); (3) DS.29 states the
// cause; (4) C3 lists every variant that `§ Dates, times and numbers` gives, read from its table, so a variant added to the table with no word in C3 fails; (5) the Security
// finding table of JOURNEY.md carries, for every finding after SEC-1, a pointer and a severity and nothing more: the same scope and status as SEC-1 and no description.
{
  const bad = [];
  const row = (id) => rows.find((r) => r.id === id);
  const want = (id, text) => { const r = row(id); if (!r || r.new !== text) bad.push(`${id} is ${JSON.stringify(r?.new)}, not ${JSON.stringify(text)}`); };
  // (1) the enrollment sentence
  const em21 = row("EM.21");
  if (!em21 || !em21.new.includes("{ ({professorName})}")) bad.push("EM.21 does not keep the optional part ({ ({professorName})}) that the backend template writes when the instructor's name is set");
  const tplFile = path.join(ROOT, "kiwi", "src", "email", "email.templates.ts");
  const tplCite = /`email\.templates\.ts:(\d+)` and `:(\d+)`/.exec(em21?.note || "");
  if (!tplCite) bad.push("EM.21's note does not cite the two template lines that write the instructor's name");
  else if (!fs.existsSync(tplFile)) bad.push("the backend email template is not here to read");
  else { const tpl = fs.readFileSync(tplFile, "utf8").split("\n"); for (const n of [tplCite[1], tplCite[2]]) if (!/professorName \?/.test(tpl[Number(n) - 1] || "")) bad.push(`email.templates.ts:${n}, cited by EM.21, does not write the instructor's name only when it is set`); }
  // (2) the class list's name, for both roles
  want("SR-3.01", "Your classes"); want("A-01.02", "Your classes");
  // (3) the no-access heading
  want("DS.29", "Your account doesn't have access to this page");
  // (4) C3 against the table: every format of the first table, the seconds of an audit log and the weekday's full name
  const c3 = (voice.match(/^\| `C3` \|.*$/m) || [""])[0];
  const dl = sect("Dates, times and numbers").split("\n");
  const hi = dl.findIndex((l) => l.startsWith("| What | Format |"));
  const dateRows = [];
  for (let j = hi + 2; hi >= 0 && j < dl.length && dl[j].startsWith("|"); j++) dateRows.push(dl[j].split("|").slice(1, -1).map((c) => c.trim()));
  if (!c3 || !dateRows.length) bad.push("the C3 rule or the first table of § Dates, times and numbers is not where the check reads it");
  const formats = dateRows.filter((r) => /^`[^`]*(YYYY|HH|MMM)[^`]*`$/.test(r[1]));
  for (const r of formats) for (const part of r[1].slice(1, -1).split(", ")) if (!c3.includes("`" + part + "`")) bad.push(`C3 does not list the format of "${r[0]}" (${part}), which § Dates, times and numbers gives`);
  if (dateRows.some((r) => /`:ss`/.test(r[3] || "")) && !c3.includes("`:ss`")) bad.push("C3 does not list the seconds (:ss) that § Dates, times and numbers gives an audit log");
  if (dateRows.some((r) => /^Weekday/.test(r[0])) && !/weekday/i.test(c3)) bad.push("C3 does not list the weekday's full name that § Dates, times and numbers gives as an accessible name");
  stats.c3Variants = formats.length;
  // (5) the security finding table: a pointer and a severity, and nothing that describes a gap
  const secRows = journey.split("\n").filter((l) => /^\| SEC-\d+ \|/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  const sec1 = secRows.find((r) => r[0] === "SEC-1");
  if (!sec1) bad.push("the Security finding table has no SEC-1 row");
  else for (const r of secRows.filter((x) => x !== sec1)) {
    if (!/^A security finding, found from source on 20\d\d-\d\d-\d\d\.$/.test(r[1])) bad.push(`${r[0]}'s Finding cell says more than that it is a security finding found from source on a date`);
    if (!/^\*\*(High|Medium|Low)\*\*$/.test(r[2])) bad.push(`${r[0]}'s severity cell is not High, Medium or Low`);
    if (r[3] !== sec1[3] || r[4] !== sec1[4]) bad.push(`${r[0]}'s scope or status cell is not SEC-1's`);
  }
  stats.securityRows = secRows.length;
  check("F26", "the statements the ninth review asked for are written: EM.21 keeps the optional part of the mail's sentence and the template lines it cites write it only when the name is set, the class list is \"Your classes\" for both roles, DS.29 states the cause, C3 lists every variant that § Dates, times and numbers gives, and every finding after SEC-1 in the Security finding table is a pointer and a severity only", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : `EM.21 keeps the optional part; SR-3.01 and A-01.02 say "Your classes"; C3 lists the ${formats.length} formats of the table, the seconds and the weekday; ${secRows.length - 1} finding after SEC-1 is a pointer`);
}

// F27: the statements the tenth review asked for. (1) DS.45 to DS.49, the DateTimeField's field errors, each open with a statement of what is wrong and give the correction second
// (D1 holds the form of every input error; § Errors says it, F23 holds that sentence); (2) S-07.04 and S-07.05 carry the text of the reading without a support address as their Old,
// S-07.02 and S-07.03 the text with it, S-07.05's Tests cell lists the two asserts of "Login failed." and S-07.04's note is whole; (3) S-05.03, the generic sign-in fallback, does
// not point at the password (S-05.04, where the credentials are refused, keeps that hint) and keeps its dependency on the status mapping; (4) SR-1.10 says who acts; (5) the Voice
// section uses no archetype label (the content-design doctrine does not define one); (6) SR-5.02 and SR-5.03 cite a content principle first; (7) A-20.28 names the rules its setup
// can break.
{
  const bad = [];
  const row = (id) => rows.find((r) => r.id === id);
  const want = (id, text) => { const r = row(id); if (!r || r.new !== text) bad.push(`${id} is ${JSON.stringify(r?.new)}, not ${JSON.stringify(text)}`); };
  // (1)
  const dsFirst = { "DS.45": "That isn't a date Kiwi can read.", "DS.46": "That isn't a date and time Kiwi can read.", "DS.47": "That isn't a time Kiwi can read.", "DS.48": "That date is before {min}.", "DS.49": "That date is after {max}." };
  for (const [id, what] of Object.entries(dsFirst)) {
    const r = row(id);
    if (!r || r.err?.c !== "input" || r.err.what !== what) bad.push(`${id} does not open with ${JSON.stringify(what)}, a statement of what is wrong`);
    else if (!/^Enter a /.test(r.err.fix || "") || !/\bcalendar\b|24-hour clock/.test(r.err.fix)) bad.push(`${id} does not give the correction second, as an instruction that names the format or the calendar`);
  }
  // (2)
  const o = (id, text) => { const r = row(id); if (!r || r.old !== text) bad.push(`${id}'s Old is ${JSON.stringify(r?.old)}, not ${JSON.stringify(text)}`); };
  o("S-07.02", "Cannot get email from Google account. Please contact {SUPPORT_EMAIL}.");
  o("S-07.03", "Login failed. Please contact {SUPPORT_EMAIL}.");
  o("S-07.04", "Cannot get email from Google account.");
  o("S-07.05", "Login failed.");
  const cell5 = (row("S-07.05")?.tests || []).map((t) => `${t.name}:${t.line}`);
  for (const ref of ["GoogleRedirectHandler.test.tsx:183", "GoogleRedirectHandler.test.tsx:201"]) if (!cell5.includes(ref)) bad.push(`S-07.05's Tests cell does not list ${ref}, which asserts alert('Login failed.')`);
  if (!(row("S-07.04")?.tests || []).some((t) => t.name === "GoogleRedirectHandler.test.tsx" && t.line === 167)) bad.push("S-07.04's Tests cell does not list GoogleRedirectHandler.test.tsx:167");
  const n4 = row("S-07.04")?.note || "";
  if (!/GoogleRedirectHandler\.tsx:57/.test(n4) || !/`SUPPORT_EMAIL` is empty/.test(n4) || /When SUPPORT_EMAIL is empty \(/.test(n4)) bad.push("S-07.04's note does not say plainly when the row shows (SUPPORT_EMAIL empty, GoogleRedirectHandler.tsx:57), or still carries the garbled sentence");
  // (3)
  want("S-05.03", "Couldn't sign you in. The server didn't respond as expected. Try again, or ask your administrator if it keeps happening.");
  if (/password/i.test(row("S-05.03")?.new || "")) bad.push("S-05.03 points at the password: that hint stays in S-05.04, where the credentials are refused");
  if (!/Check both and try again, or ask your administrator to reset your password\./.test(row("S-05.04")?.new || "")) bad.push("S-05.04 no longer keeps the password hint");
  if (!/Ships with S-05\.03 and the rest of the status mapping/.test(row("S-05.04")?.note || "") || !/ships together with the status mapping/.test(row("S-05.03")?.note || "")) bad.push("S-05.03 or S-05.04 no longer says that the generic row ships with the status mapping");
  // (4)
  want("SR-1.10", "No classes assigned to you yet. An administrator assigns them.");
  // (5)
  if (/\b(?:Sage|Caregiver)\b/.test(voice)) bad.push("§ Voice and tone names an archetype (Sage or Caregiver): the content-design doctrine defines neither, so the registers are described in plain words");
  // (6)
  for (const id of ["SR-5.02", "SR-5.03"]) { const r = row(id); if (!r || r.rules[0] !== "C6" || !/Nielsen #4/.test(r.why)) bad.push(`${id} does not cite a content principle first (C6, with Nielsen #4)`); }
  // (7)
  const w28 = row("A-20.28")?.err || {};
  if (!/\bname\b/.test(w28.why || "") || !/\bkey\b/.test(w28.why || "") || !/1\.00/.test(w28.why || "")) bad.push("A-20.28 does not name the rules its setup can break (a name, a key for each variant, allocations that add up to 1.00)");
  check("F27", "the statements the tenth review asked for are written: the DateTimeField's field errors open with what is wrong, S-07.04 and S-07.05 have the Old of their own reading and S-07.05 lists its two asserts, S-05.03 does not point at the password, SR-1.10 says who acts, the Voice section names no archetype, SR-5.02 and SR-5.03 cite a content principle first, and A-20.28 names its rules", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : "DS.45 to DS.49, S-07.02 to S-07.05, S-05.03, SR-1.10, SR-5.02, SR-5.03 and A-20.28 are as the review asked; the Voice section names no archetype");
}

// F28: the statements the follow-up to the eleventh review asked for. (1) A-16.55 reads at every count, with no count helper before a verb that must agree (D3 holds the rule for every row);
// (2) A-14.03 points at the failed rows in words and its note says which row carries the text status, and C14 says that a line points in words, not by colour (C14-C holds it);
// (3) the Voice sample "Kiwi repeated this step. It may be stuck." has its cite beside it, and the cited lines hold the detection and the sentence; (4) the Voice section's intro names every
// touch the lock allows on an earlier section (L1 counts them); (5) the index header says that some New cells show what a control or a formatter displays.
{
  const bad = [];
  const row = (id) => rows.find((r) => r.id === id);
  const want = (id, text) => { const r = row(id); if (!r || r.new !== text) bad.push(`${id} is ${JSON.stringify(r?.new)}, not ${JSON.stringify(text)}`); };
  // (1) and (2)
  want("A-16.55", "Some entries don't look like email addresses: {list}. Correct them, then enroll.");
  want("A-14.03", "Uploaded {n} of {total: count file}. The server didn't accept the other {m}. Each failed row says why. Try those again.");
  const n3 = row("A-14.03")?.note || "";
  if (!/shows A-14\.06 under its file name/.test(n3) || !/cross icon and the message/.test(n3)) bad.push("A-14.03's note does not say which row carries the text status (the one that shows A-14.06 under its file name, with its cross icon)");
  const c14 = (voice.match(/^\| `C14` \|.*$/m) || [""])[0];
  if (!/A line that points at a place says where in words, never by a colour or a shape/.test(c14) || !/Each failed row says why\./.test(c14) || !/C14-C/.test(c14)) bad.push("C14 does not say that a line points at a place in words and not by colour (with its example), and that C14-C holds it");
  // (3)
  const candid = (voice.match(/^\| \*\*Candid about the AI\*\* \|.*$/m) || [""])[0];
  if (!/"Kiwi repeated this step\. It may be stuck\." \([^)]*`AgentStepChain\.tsx:206`[^)]*`AgentStepChain\.tsx:354-359`[^)]*\)/.test(candid)) bad.push("the Voice sample \"Kiwi repeated this step. It may be stuck.\" has no cite beside it (AgentStepChain.tsx:206 and :354-359)");
  const ac = readSource("src/components/Chat/AgentStepChain.tsx");
  if (!ac || !/repeats\s*>\s*2/.test(ac.lines[205] || "")) bad.push("AgentStepChain.tsx:206 does not hold the detection of a step that repeats more than twice");
  if (!ac || !/The same step repeated/.test(ac.lines.slice(353, 359).join(" "))) bad.push("AgentStepChain.tsx:354-359 does not draw the sentence the sample quotes (the Old of SR-6.52)");
  // (4)
  const introP = (voice.match(/^\*\*Phase 5 \(2026-10-17\), appended under the lock\.\*\*.*$/m) || [""])[0];
  for (const [re, what] of [[/text-twin column/, "the Companion's text-twin column"], [/principle 4's wording/, "principle 4's wording"], [/the line that called the twins drafts/, "the line that called the twins drafts"], [/draft wording of the Phase 5 hand-off/, "the draft wording of the Phase 5 hand-off"], [/one phrase of the Phase 4 intro/, "the one phrase of the Phase 4 intro"], [/one sentence of the state-table intro/, "the one sentence of the state-table intro"]]) if (!re.test(introP)) bad.push(`the Voice section's intro does not name a touch that the lock allows on an earlier section: ${what}`);
  // (5)
  const hdr = indexText.split("\n| ID | Route")[0];
  if (!/native control/.test(hdr) || !["A-10.43", "A-19.09", "A-14.18"].every((id) => hdr.includes(id))) bad.push("the index header does not say that some New cells show what a control or a formatter displays (A-14.18, A-10.43, A-19.09)");
  check("F28", "the statements the follow-up to the eleventh review asked for are written: A-16.55 reads at every count, A-14.03 points in words and says which row carries the text status, C14 bans a colour as a pointer, the Voice sample about a repeated step has its cite and the cited lines hold it, the Voice intro names every touch the lock allows, and the index header says that some New cells show a control's or formatter's output", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : "A-16.55, A-14.03, C14, the sample's cite (AgentStepChain.tsx:206 and :354-359), the intro's six touches and the index header are as the follow-up asked");
}

// ---------------------------------------------------------------- 7. the source scan
const EXEMPT = [
  [/^[MyYdDHhmsaE ,:\-/.]+$/, "date-fns format token"],
  [/^Bearer /, "protocol text, not interface text"],
  [/^\/[\w\-/?=&.]*$/, "a route path, not interface text"],
  [/^\$\{[^}]+\}\/[\w\-/.]+$/, "an endpoint URL, not interface text"],
  [/https?:\/\//, "an example URL in a placeholder: the path belongs to the other service"],
  [/^text\.\.\.$/, "a placeholder value in a request body, never drawn"],
  [/^(Stream error|Request failed)$/, "an internal thrown error, or a bridge reply to an embedded app: never drawn"],
  [/^scope\(s\)$/, "part of a bridge reply to an embedded app (developer-facing)"],
  [/^Client side error, stop the request$/, "an internal thrown error that stops the request: never drawn"],
  [/^Code executed successfully$/, "an R result string that nothing draws: IDE.tsx:191 takes stdoutLines, which is always an array (an empty array is truthy), so the results branch at IDE.tsx:194 never runs"],
  [/^(Range request failed|Probe failed)/, "an internal thrown error in the PDF range transport: the viewer shows its own load-error row (S-02.06)"],
  [/^Email,Status,/, "the header row of an exported CSV file: file content, not interface text"],
  [/^HTTP \$\{resp\.status\}$/, "an internal thrown error: caught and logged, never drawn"],
  [/^(Content-Type|Authorization|application\/)/, "protocol text, not interface text"],
  [/^(The file|Available files)/, "covered by S-03's rows"],
  [/^(new Set|void \| Promise|& Record)/, "type syntax picked up by the sweep, not interface text"],
  [/^OpenID Connect$/, "a proper noun: the standard's name"],
  [/^Error: \$\{/, "internal thrown error, never drawn"],
  [/^Failed to refresh token$/, "internal thrown error: the student sees the status messages instead"],
  [/^This is the modified filebuffer/, "a debug log argument"],
  [/^\{"name"/, "a JSON syntax example in a placeholder"],
  [/^(missing scope|unknown op|no class context|op timed out|path ".*" is outside|navigate needs|unknown chat display mode|setChatDisplayMode needs|click needs)/, "app-bridge reply to an embedded app (developer-facing)"],
  [/^Could not obtain an app token/, "sent to the embedded app, never drawn (A-12 page spec)"],
  [/^Open the New Experiment form pre-filled with the given experiment Config JSON/, "a tool description sent to the model (the experiment assistant's create_and_open_experiment_draft tool): model-facing, out of scope"],
  [/^\)\s*:\s*\(\s*\/\//, "a code comment after a conditional's parenthesis, picked up by the sweep: not text"],
];
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!["services", "node_modules", "fonts"].includes(e.name)) walk(p, out); }
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.(test|stories|d)\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}
const attr = /\b(label|placeholder|title|aria-label|helperText|alt|tooltip|subtitle|description|caption|emptyText|text|message|heading|content|primary|secondary)\s*[:=]\s*\{?\s*(["'`])((?:\\.|(?!\2).)*?)\2/g;
const calls = /\b(alert|confirm|prompt|showSnackbar|setSnackbar|showMessage|setError|setErrorMessage|setSuccessMessage|setSnackbarMessage|enqueueSnackbar|toast|setRosterError)\s*\(\s*(?:\{[^}]*?(?:message)\s*:\s*)?(["'`])((?:\\.|(?!\2).)*?)\2/g;
const jsxText = />\s*([^<>{}\n][^<>{}]*?)\s*</g;
const lits = /(["'`])((?:\\.|(?!\1).)*?)\1/g;
// Strings that are wrong whatever they are for are read from ANY string literal, even one word or not capitalised: the first
// sweep skipped "Removing..." because its single-word filter was not anchored (it dropped every word that starts with a capital).
const RISKY = /\.\.\.|\u2014|are you sure|\(s\)|\(es\)|\blogin\b|\blogout\b|whitelist|\bprofessors?\b|kiwi platform|system prompt|\bpayloads?\b/i;
// A phrase that is never right wherever it sits on a source line: a confirmation that asks "Are you sure", a "(s)" plural.
const PHRASE = /Are you sure(?:[^?{\n<]|\{[^}\n]*\})*\??|(?<![A-Za-z$_.])[a-z]{3,}\((?:s|es)\)(?!\s*=>)(?![\w.])/g;
// A truncation marker appended to text ("…" is the character; three full stops is not).
const TRUNC = /\+[^'"`\n]*["'`]\.\.\.["'`]/;
const candidates = []; const outCount = {};
const srcDir = path.join(UI, "src");
const messageSites = []; const messageExempt = {};
// A message branch: the code shows text taken from the failed call (the server's body, a thrown error's message, a status line).
const MSG = /\b(?:err|error|e|[A-Za-z]*Error|errorData|body)\??\.(?:response\??\.data\??\.|error\??\.)?message\b|\bstatusText\b|response\??\.data\??\.(?:message|error)\b|\bresult\??\.error\b/;
const MSG_EXEMPT = [
  [/\.message\??\.includes\(/, "tests the message; it is not shown"],
  [/^\s*(const|let)\s+msg\b|throw new Error\(\s*msg|message\??:\s*body/, "builds the Error whose message the pages show"],
  [/\$\{result\.email\},/, "a row of an exported CSV file: the same text as the results table"],
  [/\{result\.error\}|title=\{result\.error\}|\{result\.error && /, "displays the text a handler stored in the results table (A-11.38 to A-11.46)"],
];
const MSG_FILE_EXEMPT = [
  [/^src\/utils\/(experimentApi|classAnalyticsApi)\.ts$/, "builds the Error whose message the pages show; the page sites carry the rows"],
  [/^src\/components\/CodeInterpreter\/(IDE|WebR)\.tsx$/, "the student's own program output"],
  [/^src\/pages\/ClassAppView\.tsx$/, "the bridge reply to an embedded app (developer-facing; embedded app content is out of scope, G5)"],
];
for (const f of walk(srcDir)) {
  const rel = path.relative(UI, f).split(path.sep).join("/");
  const reason = OUT.find(([re]) => re.test(rel));
  const text = fs.readFileSync(f, "utf8");
  const lineOf = (i) => text.slice(0, i).split("\n").length;
  const lines = text.split("\n");
  const seen = new Set();
  const add = (idx, s, kind) => {
    const t = normText(s);
    if (!/[A-Za-z]{2}/.test(t) || t.length < 3) return;
    if (!/\s/.test(t) && /^([a-z]+[A-Z]\w*|[a-z-]+|[A-Z_]+|\.|\/|#|\d)$/.test(t)) return;
    const line = lineOf(idx); const src = (lines[line - 1] || "").trim();
    if (/console\.(log|error|warn|info|debug)/.test(src) || /^(\/\/|\*|\/\*)/.test(src) || /^import /.test(src)) return;
    const key = line + "|" + t; if (seen.has(key)) return; seen.add(key);
    if (reason) { outCount[reason[1]] = (outCount[reason[1]] || 0) + 1; return; }
    // a literal on a helperText line is a helper (a ternary lists several), whatever pattern found it
    const above = lines.slice(Math.max(0, line - 3), line).join(" ");
    const k2 = kind === "lit" && /helperText\s*=\s*\{/.test(above) ? "helperText" : kind;
    candidates.push({ file: rel, line, kind: k2, text: t, raw: s });
  };
  let m;
  while ((m = attr.exec(text))) add(m.index, m[3], m[1]);
  while ((m = calls.exec(text))) add(m.index, m[3], "call:" + m[1]);
  while ((m = jsxText.exec(text))) { const t = m[1]; if (/=>|&&|\|\||\?|;|\bconst\b|\breturn\b/.test(t)) continue; add(m.index, t, "jsx"); }
  while ((m = lits.exec(text))) {
    const t = m[2];
    const normal = /^[A-Z][^"'`]{6,}$/.test(t) && /\s/.test(t) && !/^(Mui|import|use |http|\.\/)/.test(t) && !/[{};=]/.test(t.replace(/\$\{[^}]*\}/g, ""));
    const risky = RISKY.test(t) && /[A-Za-z]{3}/.test(t) && !/^\s*[{\[]/.test(t);
    if (normal || risky) add(m.index, t, "lit");
  }
  lines.forEach((l, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(l) || /console\./.test(l)) return;
    if (TRUNC.test(l) && !reason) candidates.push({ file: rel, line: i + 1, kind: "trunc", text: "..." });
    if (!reason) for (const pm of l.matchAll(PHRASE)) candidates.push({ file: rel, line: i + 1, kind: "phrase", text: normText(pm[0]) });
    if (MSG.test(l)) {
      const ex = MSG_EXEMPT.find(([re]) => re.test(l)) || MSG_FILE_EXEMPT.find(([re]) => re.test(rel));
      if (reason) return;
      if (ex) { messageExempt[ex[1]] = (messageExempt[ex[1]] || 0) + 1; return; }
      messageSites.push({ file: rel, line: i + 1, text: l.trim().slice(0, 100) });
    }
  });
}
// The census of visible text (scan-ts.mjs) adds what the patterns above cannot see: a JSX sentence with an expression inside it ("“{fileName}” is
// swapped for the file you pick next…": the text is split at the braces) and a literal that starts with a quote mark or a slot. A census text
// enters the scan only when no candidate in its file already speaks for it (the same text, or most of it).
const flat = (s) => normText(s).replace(/\$\{[^}]*\}|\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
const censusAdded = [];
if (tsScan) {
  const have = new Map();
  for (const c of candidates) { if (!have.has(c.file)) have.set(c.file, []); have.get(c.file).push(flat(c.text)); }
  for (const x of tsScan.texts) {
    const t = normText(x.text);
    if (!/[A-Za-z]{2}/.test(t) || t.length < 3) continue;
    if (!/\s/.test(t) && /^([a-z]+[A-Z]\w*|[a-z-]+|[A-Z_]+|\.|\/|#|\d)$/.test(t)) continue;
    const src = ((readSource(x.file) || { lines: [] }).lines[x.line - 1] || "").trim();
    if (/console\.(log|error|warn|info|debug)/.test(src) || /^(\/\/|\*|\/\*)/.test(src)) continue;
    const f = flat(x.text);
    if (f.length < 3) continue;
    if ((have.get(x.file) || []).some((h) => h.length >= 3 && (h.includes(f) || (f.includes(h) && h.length >= 0.5 * f.length)))) continue;
    const c = { file: x.file, line: x.line, kind: x.ctx.startsWith("attr:") ? x.ctx.slice(5) : x.ctx, text: t, raw: x.text, census: true };
    candidates.push(c); censusAdded.push(c);
    if (!have.has(x.file)) have.set(x.file, []);
    have.get(x.file).push(f);
  }
}
if (process.argv.includes("--census")) for (const c of censusAdded) console.log(`CENSUS ${c.file}:${c.line} [${c.kind}] ${c.text.slice(0, 120)}`);
const strip = (s) => normText(s).replace(/\$\{[^}]*\}/g, "").replace(/\{[^}]*\}/g, "").replace(/\s+/g, " ").trim();
const rowsByFile = new Map();
for (const r of resolved) for (const a of r.anchors) if (a.file) { if (!rowsByFile.has(a.file)) rowsByFile.set(a.file, []); rowsByFile.get(a.file).push({ r, lines: a.lines }); }
const rawRows = [];
for (const g of groups) for (const r of g.rowsResolved) rawRows.push({ r, g });
const oldTexts = new Map();
for (const { r } of rawRows) for (const a of r.anchors) if (a.file) { if (!oldTexts.has(a.file)) oldTexts.set(a.file, []); oldTexts.get(a.file).push({ id: r.id, old: strip(r.old), slot: /\{[^}]*\}/.test(r.old) }); }
// A source string that carries a slot ("Failed to create API token: ${message}") is a branch of its own: only a row whose old
// text also carries a slot covers it, so the plain fallback row ("Failed to create API token") cannot stand in for it.
const keptTexts = [];
for (const g of groups) for (const k of g.kept || []) keptTexts.push(normText(k).toLowerCase());
function covered(c) {
  // a literal that wraps a sentence in markup ("<p>…</p>") is covered by the row for the sentence
  const t = strip(c.text.replace(/\$\{[^}]*$/, "")).replace(/<[^>]*>/g, "").trim();
  // a string the group lists as already right covers its own source candidate: an equal string only (a phrase that breaks a
  // rule is never "kept", and a short kept word such as "Selected" must not cover every sentence that contains it)
  if (c.kind !== "trunc" && c.kind !== "phrase" && !(c.hits || []).some((h) => h !== "error-channel string") && t.length >= 5 && keptTexts.some((k) => k === t.toLowerCase())) { c.by = "kept"; return "kept"; }
  const slotty = /\$\{[^}]+\}/.test(c.text);
  for (const e of oldTexts.get(c.file) || []) {
    if (slotty && !e.slot) continue;
    // the string is a part of a longer Old (a two-sentence Old covers each sentence), or an Old that is most of it; a short label
    // ("Client Secret") does not cover a sentence that merely contains it ("Client Secret is required")
    if (e.old.length >= 5 && t.length >= 5 && (e.old.includes(t) || (t.includes(e.old) && e.old.length >= 0.7 * t.length))) { c.by = "text"; return e.id; }
    if (e.old.length >= 3 && e.old === t) { c.by = "text"; return e.id; } // a short name ("Edit", "Test") covers an equal string only
  }
  if (c.kind === "trunc") {
    for (const { r, lines } of rowsByFile.get(c.file) || []) if (r.kind === "format" && lines.includes(c.line)) { c.by = "line"; return r.id; }
    return null;
  }
  if (c.kind === "phrase") {
    // a sentence is covered only when one old text carries all of its fixed parts (so "Are you sure you want to reject this event?"
    // cannot stand in for "Are you sure you want to reject {n} selected event(s)?"); a "word(s)" only by an old text that has it
    const parts = /^Are you sure/.test(c.text) ? c.text.split(/\$?\{[^}]*\}/).map((x) => normText(x)).filter((x) => x.length >= 6) : [c.text];
    for (const e of oldTexts.get(c.file) || []) if (parts.every((x) => e.old.includes(x))) { c.by = "text"; return e.id; }
    return null;
  }
  if (c.kind === "lit") return null; // a literal that breaks a rule on its own must be named by a row's old text
  // a row a few lines away covers a string only when it speaks for the line as a whole: a message branch (the code shows text taken
  // from the call), a format row, or a row whose Old is a code expression. A row for the heading beside it does not cover a description.
  for (const { r, lines } of rowsByFile.get(c.file) || []) {
    if (slotty && !/\{[^}]*\}/.test(r.old)) continue;
    if (!(r.br || r.kind === "format" || /[=()]|\$\{|\?\./.test(r.old))) continue;
    if (lines.some((l) => Math.abs(l - c.line) <= 2)) { c.by = "line"; return r.id; }
  }
  return null;
}
// a string on an error channel that reports a failure, wherever the word sits ("Authorization failed", "Upload failed."), needs a row
const ERRORISH = /^(failed|could not|couldn't|unable|cannot|can't|error|an error|something went wrong|please|invalid)|\b(fail(ed|ure|s)?|errors?|unable|cannot|can't|couldn't|could not|went wrong|unavailable|not found|denied|expired|not allowed)\b/i;
const violations = [], errorish = [];
for (const c of candidates) {
  if (EXEMPT.some(([re]) => re.test(c.text))) continue;
  const hits = lintSource(c.text, c.kind === "lit" || c.kind === "trunc" || c.kind === "phrase" ? "label" : c.kind);
  // straight quotes only (C5): the sweep normalises curly quotes before it reads, so the raw text is read here
  if (/[\u2018\u2019\u201C\u201D]/.test(c.raw || "")) hits.push("curly quotes in the string: straight quotes only (C5)");
  const isErrChannel = /^call:(setError|setSnackbar|setSnackbarMessage|showSnackbar|alert|confirm|prompt|setErrorMessage|setRosterError)$/.test(c.kind) || c.kind === "message" || c.kind === "lit";
  if (hits.length) { c.hits = hits; violations.push({ ...c, hits }); }
  else if (isErrChannel && ERRORISH.test(c.text)) errorish.push({ ...c, hits: ["error-channel string"] });
}
const need = [...violations, ...errorish];
const uncovered = need.filter((c) => !covered(c));
const byLineOnly = need.filter((c) => c.by === "line");
if (process.argv.includes("--proximity")) for (const c of byLineOnly) console.log(`PROXIMITY ${c.file}:${c.line} [${c.kind}] ${c.text.slice(0, 90)}`);
// node check-copy.mjs --unchanged lists the candidate strings that no row touches and no lint hits (the strings the design leaves as they are), by kind
if (process.argv.includes("--unchanged")) {
  const hitSet = new Set(need);
  // strict: only a row whose Old text is this string (or contains it) counts; a row a few lines away does not
  const strictCovered = (c) => { const t = strip(c.text.replace(/\$\{[^}]*$/, "")); return (oldTexts.get(c.file) || []).some((e) => e.old.length >= 3 && t.length >= 3 && (e.old.includes(t) || t.includes(e.old))) || keptTexts.some((k) => k === t.toLowerCase()); };
  const rest = candidates.filter((c) => !hitSet.has(c) && !EXEMPT.some(([re]) => re.test(c.text)) && !strictCovered(c));
  const byKind = {};
  for (const c of rest) (byKind[c.kind] = byKind[c.kind] || []).push(c);
  for (const [k, v] of Object.entries(byKind).sort()) { console.log(`UNCHANGED [${k}] ${v.length}`); for (const c of v) console.log(`   ${c.file}:${c.line}  ${c.text.slice(0, 110)}`); }
}
const exemptSeen = candidates.filter((c) => EXEMPT.some(([re]) => re.test(c.text))).length;
check("H1", "source scan: every rule-violating or error-channel string in scope has a revision row (single words, \"...\", \"Are you sure\", \"(s)\" and slot-bearing message templates included)", uncovered.length === 0,
  uncovered.length ? `\n        ${list(uncovered.map((c) => `${c.file}:${c.line} [${c.kind}] ${c.text.slice(0, 80)} -> ${c.hits.slice(0, 2).join(" | ")}`), 80)}` : `${candidates.length} candidate strings in scope; ${violations.length} violate a rule and ${errorish.length} more are error-channel strings; all ${need.length} covered (${need.length - byLineOnly.length} by the old text, ${byLineOnly.length} by an adjacent row); ${exemptSeen} exempt (format tokens, protocol text); ${censusAdded.length} of the candidates come from the visible-text census (a JSX sentence with an expression inside, a literal that starts with a quote mark or a slot)`);
stats.scan = { candidates: candidates.length, violations: violations.length, errorChannel: errorish.length, covered: need.length - uncovered.length, outOfScope: outCount, exempt: exemptSeen, census: censusAdded.length };
// E10: a row anchored by section only (a design-system placeholder, a Companion twin, a backend file) cannot carry a test reference, so none of its old texts may be
// a string a UI component draws today: where one is, the row is anchored to that component (DS.12 "Copy" is CopyButton.tsx) and its Tests cell lists the references.
{
  const litsBy = new Map();
  for (const f of walk(srcDir)) {
    const relf = path.relative(UI, f).split(path.sep).join("/");
    if (OUT.some(([re]) => re.test(relf))) continue;
    fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => { for (const m of line.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n]){3,300}?)\1/g)) { if (!litsBy.has(m[2])) litsBy.set(m[2], []); litsBy.get(m[2]).push(`${relf}:${i + 1}`); } });
  }
  const sectionOnly = rows.filter((r) => r.old && !r.anchors.some((a) => a.file && !a.file.startsWith("..")));
  const e10 = sectionOnly.filter((r) => litsBy.has(r.old.replace(/^"|"$/g, "")) && !r.x.some((x) => /^other-use/.test(x))).map((r) => `${r.id}: "${r.old.slice(0, 40)}" is drawn at ${litsBy.get(r.old.replace(/^"|"$/g, ""))[0]}: anchor the row there`);
  check("E10", "a row anchored by section only has an old text that no UI component draws as a whole string (else it is anchored to the component, so its Tests cell can list the references)", e10.length === 0,
    e10.length ? `\n        ${list(e10)}` : `${sectionOnly.length} section-anchored rows with an old text (design-system placeholders ${sectionOnly.filter((r) => r.group === "DS").length}, Companion twins ${sectionOnly.filter((r) => r.group === "CP").length}, backend files ${sectionOnly.filter((r) => r.anchors.some((a) => a.file && a.file.startsWith(".."))).length}); none is drawn by a component today`);
  stats.sectionOnly = sectionOnly.length;
}

// H17: what the design keeps follows the guide too (the review's n6). The lints of a new string run over every kept string (each page's `Kept as is`
// list) and every kept row: D2 (a statement that something could not be done), D6 (an alternation of forms), C4 (a count with a plural noun and no
// singular), C5 and C6 (marks, banned terms, case). A kept string that trips one is fixed (it becomes a row) or listed in kept-exempt.json with the reason.
const keptExempt = JSON.parse(fs.readFileSync(path.join(HERE, "kept-exempt.json"), "utf8")).exempt;
const NEG_RE = /\b(can't|cannot|couldn't|unable to|failed|didn't (?:go through|work)|doesn't work)\b/i;
const ALT_RES = [
  [/\w\((s|es|ies)\)/, "D6: a (s) plural"], [/\{[^{}]*\bor\b[^{}]*\}/, "D6: a slot that names two values"], [/\b1 \w+,? or [{\d]/, "D6: a singular, then or and the plural"],
  [/\{(\w+)\}\s+(\w+)\s+or\s+\{\1\}\s+\2(s|es)\b/, "D6: a count with both forms"], [/\b(\w{3,})\/\1(s|es)\b/, "D6: a slash between the forms"],
];
// the rule a lint message belongs to, so that an exemption names the rule it excuses
const ruleOf = (msg) => /^(C\d+):/.test(msg) ? msg.slice(0, msg.indexOf(":")) : /we, our or I/.test(msg) ? "C8" : /^terminology|payload|whitelist|engine|course/.test(msg) ? "C6" : /capital|title case/.test(msg) ? "C1" : /exclamation|ellipsis|em dash|en dash|straight quotes|emoji|real plurals|and, not &|successfully/.test(msg) ? "C5" : "C5";
const keptLints = (text, x = [], listEntry = false, where = {}) => {
  const hits = [...scopedTermHits(text, where)];
  if (NEG_RE.test(text) && !x.includes("not-an-error")) hits.push("D2: says something could not be done");
  for (const [re, w] of ALT_RES) if (re.test(text)) hits.push(w);
  for (const h of bareCountHits(text, { source: true })) hits.push(`C4: a bare count before a plural noun (${h}): write {n: count noun}`);
  for (const h of agreeCountHits(text)) hits.push(`C4: a verb that must agree follows the count helper (${h}): it reads wrong at one of the two numbers`);
  for (const h of lintString(text, /[.?!…]$/.test(text) && text.split(/\s+/).length > 3 ? "body" : "label")) {
    // the end-punctuation rules need the string's kind, which a kept string does not give; the case, term and mark rules do not
    if (/sentence has no end|a longer message|one-clause result|label ends with a period/.test(h)) continue;
    const w = /^(?:title case|capital mid-sentence): (.+)$/.exec(h);
    if (w && (UI_REFS.has(w[1].replace(/'s$/, "")) || PROPER.has(w[1].replace(/'s$/, "")))) continue;
    // a list entry may be a fragment ("repeated steps") or a description of a string, so the first-letter lint is not run on it
    if (listEntry && /^C1: begins with a lowercase letter/.test(h)) continue;
    hits.push(ruleOf(h) + ": " + h);
  }
  for (const h of lintSource(text, "label")) {
    const w = /^title case: (.+)$/.exec(h);
    if (w && (UI_REFS.has(w[1].replace(/'s$/, "")) || PROPER.has(w[1].replace(/'s$/, "")))) continue; // the name of a page or a control a sentence points to (C1)
    hits.push(ruleOf(h) + ": " + h);
  }
  if (/^[A-Z]/.test(text) && text.split(/\s+/).length <= 3 && /[^.]\.$/.test(text) && !/…$/.test(text) && !/\b(Kiwi|You|It|Select|Sign|Enter|Choose|Try|Check|Contact)\b/.test(text)) hits.push("C5: a short name ends with a full stop");
  return [...new Set(hits)];
};
const keptStrings = [];
for (const g of groups) {
  for (const k of g.kept || []) {
    const plain = normText(k.replace(/\s+\([^)]* [^)]*\)\s*$/, ""));
    // a list of names ("Student copy, Answer key, Reference", "Reading class analytics and Running code") is each name on its own
    const parts = !/[.?!:]/.test(plain) && /, | and /.test(plain) ? plain.split(/, | and /).map((x) => x.trim()).filter(Boolean) : [plain];
    const asList = parts.length > 1 && parts.every((x) => x.split(/\s+/).length <= 4);
    for (const part of asList ? parts : [plain]) keptStrings.push({ group: g.id, text: part, x: [], from: k });
  }
  for (const r of g.rowsResolved) if (r.keep && r.group !== "DS") keptStrings.push({ group: g.id, text: normText(r.new), x: r.x || [], from: r.id });
}
// Every string in scope that no row touches is kept as well, listed or not: the source scan's candidates that no lint hits and no row names (`--unchanged`).
// A fragment of a longer sentence (the text after a link, a lowercase run) is read with its sentence by the census, so a fragment is skipped here.
const hitSetK = new Set(need);
// the kept population is Phase 5's: a string a Phase 6 row revises was kept as it was by Phase 5 and is still linted here (its revision is linted in Q1), so the coverage test reads Phase 5 rows
const oldTexts5 = new Map();
for (const { r } of rawRows) if (!r.phase6) for (const a of r.anchors) if (a.file) { if (!oldTexts5.has(a.file)) oldTexts5.set(a.file, []); oldTexts5.get(a.file).push({ id: r.id, old: strip(r.old) }); }
const strictCoveredK = (c) => { const t = strip(c.text.replace(/\$\{[^}]*$/, "")); return (oldTexts5.get(c.file) || []).some((e) => e.old.length >= 3 && t.length >= 3 && (e.old.includes(t) || t.includes(e.old))) || keptTexts.some((k) => k === t.toLowerCase()); };
const unchangedCands = candidates.filter((c) => !hitSetK.has(c) && !EXEMPT.some(([re]) => re.test(c.text)) && !strictCoveredK(c) && /^[A-Z"“{]/.test(c.text) && c.text.split(/\s+/).length >= 2);
for (const c of unchangedCands) keptStrings.push({ group: c.file.split("/").pop(), file: c.file, text: normText(c.text.replace(/\$\{[^}]*\}/g, "{x}")), x: [], from: `${c.file}:${c.line}`, source: true });
const keptBad = []; const keptExemptUsed = new Set();
for (const ks of keptStrings) {
  for (const h of keptLints(ks.text, ks.x, ks.from !== undefined && !/^[A-Z]{1,3}-\d/.test(String(ks.from)) && !ks.source, { group: ks.source ? "" : ks.group, file: ks.file })) {
    const lint = h.split(":")[0].split("/")[0];
    const ex = keptExempt.find((e) => (ks.source ? e.file === ks.file : e.group === ks.group) && e.text === ks.text && (e.lint === lint || e.lint === "*"));
    if (ex) { keptExemptUsed.add(ex); continue; }
    keptBad.push(`${ks.group} "${ks.from}": ${h}`);
  }
}
const keptStale = keptExempt.filter((e) => !keptExemptUsed.has(e)).map((e) => `kept-exempt.json: ${e.group || e.file} "${e.text}" (${e.lint}) trips nothing now`);
check("H17", "every kept string and kept row passes the lints of a new string (D2, D6, C4, C5, C6, C8); an exception is written down with its reason", keptBad.length === 0 && keptStale.length === 0,
  keptBad.length || keptStale.length ? `\n        ${list([...keptBad, ...keptStale], 40)}` : `${keptStrings.length} kept strings read (${keptStrings.length - unchangedCands.length} from the pages' lists and kept rows, ${unchangedCands.length} source strings no row touches); ${keptExemptUsed.size} exempt, each with its reason`);
stats.keptStrings = { read: keptStrings.length, listed: keptStrings.length - unchangedCands.length, unchanged: unchangedCands.length, exempt: keptExemptUsed.size, groups: groups.filter((g) => (g.kept || []).length).length };
// H18: on the MCP pages the record is "MCP server" in full, and a cause line there names Kiwi's server (m1): "server" alone would read as either. Every new string,
// kept string and kept row of A-07, A-22 and S-08 is read, and so is every string in the pages' source files that no row touches; the transport's name,
// "Server-sent events", is the one other use of the word.
{
  const OK_SERVER = /MCP servers?|Kiwi's server|Kiwi couldn't reach its server|Server-sent events/g;
  const bareServer = (t) => /\bservers?\b/i.test(String(t).replace(OK_SERVER, ""));
  const mcpFiles = new Set(resolved.filter((r) => MCP_GROUPS.includes(r.group)).flatMap((r) => r.anchors.filter((a) => a.file && !a.file.startsWith("..")).map((a) => a.file)));
  const bad = []; let read = 0;
  for (const r of resolved) if (MCP_GROUPS.includes(r.group)) { read++; if (bareServer(r.new)) bad.push(`${r.id} [${r.kind}] ${r.new.slice(0, 90)}`); }
  for (const g of groups) if (MCP_GROUPS.includes(g.id)) for (const k of g.kept || []) { read++; if (bareServer(k)) bad.push(`${g.id} kept: ${k}`); }
  const mcpUnchanged = candidates.filter((c) => mcpFiles.has(c.file) && !hitSetK.has(c) && !strictCoveredK(c));
  for (const c of mcpUnchanged) { read++; if (bareServer(c.text.replace(/\$\{[^}]*\}/g, "{x}"))) bad.push(`${c.file}:${c.line} ${c.text.slice(0, 80)}`); }
  check("H18", "on the MCP pages (A-07, A-22, S-08) the record is \"MCP server\" in full and a cause line names Kiwi's server: no string says \"server\" alone, whether a row writes it or the source keeps it", bad.length === 0,
    bad.length ? `\n        ${list(bad, 40)}` : `${read} strings read (${mcpUnchanged.length} source strings no row touches, in ${mcpFiles.size} files)`);
  stats.mcpWording = { read, unchanged: mcpUnchanged.length, files: mcpFiles.size };
}
// message branches: every place the code shows a message taken from the failed call has a row that says what the interface shows instead
const brRows = (file) => (rowsByFile.get(file) || []).filter(({ r }) => r.br);
const msgUncovered = messageSites.filter((s) => !brRows(s.file).some(({ lines }) => lines.some((l) => Math.abs(l - s.line) <= 10)));
check("H5", "every message branch (the code shows a message, a body or a status line taken from the failed call) has a row: the server's words quoted after Kiwi's sentence (C10), the client library's text removed, or the status line replaced", msgUncovered.length === 0,
  msgUncovered.length ? `\n        ${list(msgUncovered.map((s) => `${s.file}:${s.line}  ${s.text}`), 80)}` : `${messageSites.length} sites in scope, ${Object.values(messageExempt).reduce((a, b) => a + b, 0)} exempt (${Object.keys(messageExempt).join("; ")}); rows: ${resolved.filter((r) => r.br === "srv").length} server-message, ${resolved.filter((r) => r.br === "http").length} status-line, ${resolved.filter((r) => r.br === "dev").length} client-message`);
stats.messageBranches = { sites: messageSites.length, exempt: Object.values(messageExempt).reduce((a, b) => a + b, 0), srv: resolved.filter((r) => r.br === "srv").length, http: resolved.filter((r) => r.br === "http").length, dev: resolved.filter((r) => r.br === "dev").length };
// date and number call sites
const locSites = [];
for (const f of walk(srcDir)) {
  const rel = path.relative(UI, f).split(path.sep).join("/");
  if (OUT.some(([re]) => re.test(rel))) continue;
  fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/toLocale(Date|Time)?String\(\s*(\)|undefined)/.test(l) && !/^\s*(\/\/|\*)/.test(l)) locSites.push({ file: rel, line: i + 1 }); });
}
const locUncovered = locSites.filter((s) => !(rowsByFile.get(s.file) || []).some(({ r, lines }) => /C3|C4/.test(r.rules.join()) && r.kind === "format" && lines.includes(s.line)));
// date-fns format() with a display pattern (month or weekday names, locale-formatted or am/pm tokens) draws a date too: "MMM d" shows
// "Oct 1 – Oct 7" with no year, "MMMM yyyy" and "EEEE" take their names from the library's locale. Each needs a C3 row on its own line.
const fnsSites = [];
for (const f of walk(srcDir)) {
  const rel = path.relative(UI, f).split(path.sep).join("/");
  if (OUT.some(([re]) => re.test(rel))) continue;
  const text = fs.readFileSync(f, "utf8");
  if (!/from ["']date-fns["']/.test(text)) continue;
  text.split("\n").forEach((l, i) => {
    if (/^\s*(\/\/|\*)/.test(l)) return;
    for (const m of l.matchAll(/\bformat\(\s*[^,]+?,\s*(["'`])((?:\\.|(?!\1).)*?)\1/g)) if (/M{3,}|E{3,}|L{3,}|P{1,4}|p{1,4}|c{3,}|a{1,5}|B{1,5}/.test(m[2])) fnsSites.push({ file: rel, line: i + 1, pattern: m[2] });
  });
}
const fnsUncovered = fnsSites.filter((s) => !(rowsByFile.get(s.file) || []).some(({ r, lines }) => /C3/.test(r.rules.join()) && r.kind === "format" && lines.includes(s.line)));
check("H2", "every default-locale toLocale…String() call site and every date-fns format() with a display pattern in scope is covered by a C3 or C4 format row (explicit en-US calls in the chart axis helper are Phase 6\'s)", locUncovered.length === 0 && fnsUncovered.length === 0,
  (locUncovered.length || fnsUncovered.length) ? `\n        ${list([...locUncovered.map((s) => `${s.file}:${s.line}`), ...fnsUncovered.map((s) => `${s.file}:${s.line} format(…, "${s.pattern}")`)])}` : `${locSites.length} call sites in ${new Set(locSites.map((s) => s.file)).size} files; ${fnsSites.length} date-fns display formats in ${new Set(fnsSites.map((s) => s.file)).size} files`);
stats.locale = { sites: locSites.length, files: new Set(locSites.map((s) => s.file)).size, fns: fnsSites.length, fnsFiles: new Set(fnsSites.map((s) => s.file)).size };
// native date and time inputs: the browser draws them in its own locale, so each is replaced by the DateTimeField (C3)
const dateSites = [];
for (const f of walk(srcDir)) {
  const rel = path.relative(UI, f).split(path.sep).join("/");
  if (OUT.some(([re]) => re.test(rel))) continue;
  fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { const m = l.match(/\btype=\{?["'](date|datetime-local|time|month|week)["']\}?/); if (m && !/^\s*(\/\/|\*)/.test(l)) dateSites.push({ file: rel, line: i + 1, type: m[1] }); });
}
const dateUncovered = dateSites.filter((s) => !(rowsByFile.get(s.file) || []).some(({ r, lines }) => r.kind === "format" && r.dt && r.rules.includes("C3") && lines.includes(s.line)));
check("H4", "every native date, date-time and time input in scope is replaced by the DateTimeField through a C3 format row", dateUncovered.length === 0, dateUncovered.length ? `\n        ${list(dateUncovered.map((s) => `${s.file}:${s.line} type="${s.type}"`))}` : `${dateSites.length} controls in ${new Set(dateSites.map((s) => s.file)).size} files (${["datetime-local", "date", "time"].map((t) => `${dateSites.filter((s) => s.type === t).length} ${t}`).join(", ")})`);
stats.dateControls = { sites: dateSites.length, files: new Set(dateSites.map((s) => s.file)).size, byType: Object.fromEntries(["datetime-local", "date", "time"].map((t) => [t, dateSites.filter((s) => s.type === t).length])) };
runF14();
// H19: the empty-value glyph. A lone dash that stands for "no value" is one glyph, the em dash, exempt from C5 (it is a glyph, not punctuation), and
// each carries the accessible name "No value". Every lone-dash literal in scope is found in the source (a hyphen, an en dash or an em dash drawn as
// the whole string; a comparison, a separator argument and a repeated rule line are code) and has the rows.
{
  const sites = [];
  for (const f of walk(srcDir)) {
    const rl = path.relative(UI, f).split(path.sep).join("/");
    if (OUT.some(([re]) => re.test(rl))) continue;
    fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
      // a lone dash ("-", "–", "—") or two joined by a slash or a colon ("– / –", the page indicator with nothing to show): the whole literal is the glyph
      const re = /(["'`])([-–—](?:\s*[\/:]\s*[-–—])*)\1/g; let m;
      while ((m = re.exec(l))) {
        const before = l.slice(0, m.index), after = l.slice(m.index + m[0].length);
        if (/(===?|!==?|\bcase)\s*$/.test(before)) continue;
        if (/\.(split|join|repeat|replace|replaceAll|startsWith|endsWith|includes|indexOf|lastIndexOf|padStart|padEnd)\(\s*$/.test(before)) continue;
        if (/^\.(repeat|split|join|replace|replaceAll)\(/.test(after)) continue;
        sites.push({ file: rl, line: i + 1, glyph: m[2] });
      }
      const jsx = l.match(/>\s*([-–—])\s*</); if (jsx) sites.push({ file: rl, line: i + 1, glyph: jsx[1] });
    });
  }
  const bad = [];
  for (const s of sites) {
    const near = (rowsByFile.get(s.file) || []).filter(({ lines }) => lines.includes(s.line)).map(({ r }) => r);
    if (!near.some((r) => r.kind === "aria" && r.new === "No value")) bad.push(`${s.file}:${s.line} "${s.glyph}" has no row that gives it the accessible name "No value"`);
    const want = s.glyph.replace(/[-–]/g, "—");
    if (s.glyph !== want && !near.some((r) => r.kind === "format" && r.old === s.glyph && r.new === want)) bad.push(`${s.file}:${s.line} draws "${s.glyph}" for no value and no row replaces it with "${want}"`);
  }
  const c5 = (voice.match(/^\| `C5` \|.*$/m) || [""])[0];
  if (!/Two dashes are kept\.\*\* The first is the glyph for an empty value[^.]*\(DS\.53\)\. It is a glyph, not punctuation[^.]*never "-", an en dash or "N\/A"[^.]*accessible name "No value" \(DS\.54\)[^.]*\. The second is the en dash in a date or number range[^.]*nowhere else/.test(c5)) bad.push("C5 does not state the two kept dashes: the empty-value glyph with its accessible name, and the en dash in a range");
  const dsr = groups.find((g) => g.id === "DS").rowsResolved;
  if (!dsr.some((r) => r.id === "DS.53" && r.new === "—" && r.x.includes("em dash")) || !dsr.some((r) => r.id === "DS.54" && r.new === "No value" && r.kind === "aria")) bad.push("DS.53 (the glyph, with its written exemption) and DS.54 (its name) are missing");
  const glyphRows = rows.filter((r) => r.new === "—");
  const unexempt = glyphRows.filter((r) => !r.x.includes("em dash")).map((r) => r.id);
  if (unexempt.length) bad.push(`rows whose New is the em dash glyph without a written exemption: ${unexempt.join(", ")}`);
  const byGlyph = (g) => sites.filter((s) => s.glyph === g).length;
  const compound = sites.filter((s) => s.glyph.length > 1).length;
  check("H19", "every empty-value glyph in scope (a lone hyphen, en dash or em dash, or two joined by a slash, drawn for no value) is the one glyph, the em dash, exempt from C5 in writing, and carries the accessible name \"No value\"; the en dash stays only in a date or number range", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : `${sites.length} sites in ${new Set(sites.map((s) => s.file)).size} files (${byGlyph("—")} em dash kept, ${byGlyph("-")} hyphen, ${byGlyph("–")} en dash and ${compound} joined pair replaced by it), each named "No value" (DS.53, DS.54); the en dash is left only in the date range`);
  stats.emptyGlyphs = { sites: sites.length, files: new Set(sites.map((s) => s.file)).size, emDash: byGlyph("—"), hyphen: byGlyph("-"), enDash: byGlyph("–"), pair: compound };
}
// H20: the date guard rejects a default-locale toLocale…String() call and any explicit locale other than the fixed English one; every explicit
// non-English locale call in the source, in scope or in an orphan, is named in § Dates, times and numbers (timeUtils.ts:4 passes 'zh-CN')
{
  const sites = [];
  const re = /\b(toLocale(?:Date|Time)?String|Intl\.(?:DateTimeFormat|NumberFormat))\(\s*(["'`])([A-Za-z-]+)\2/g;
  for (const f of walk(srcDir)) {
    const rl = path.relative(UI, f).split(path.sep).join("/");
    fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/^\s*(\/\/|\*)/.test(l)) return; let m; re.lastIndex = 0; while ((m = re.exec(l))) if (!/^en(-US)?$/i.test(m[3])) sites.push({ file: rl, line: i + 1, locale: m[3], call: m[1] }); });
  }
  const dateS = sect("Dates, times and numbers"), hand = sect("Hand-offs");
  const bad = [];
  if (!/fails on a `toLocale\*String\(\)` call with no locale and on one with any explicit locale other than the fixed English one/.test(dateS)) bad.push("§ Dates, times and numbers does not define the guard as rejecting a default locale and any explicit non-English locale");
  if (!/any explicit non-English locale/.test(hand)) bad.push("the implementation hand-off's guard does not say so");
  for (const s of sites) {
    const named = dateS.includes(`${path.basename(s.file)}:${s.line}`) && dateS.includes(s.locale);
    const covered = (rowsByFile.get(s.file) || []).some(({ r, lines }) => /C3|C4/.test(r.rules.join()) && r.kind === "format" && lines.includes(s.line));
    if (!named && !covered) bad.push(`${s.file}:${s.line} passes the locale '${s.locale}' to ${s.call} and neither a C3 or C4 row nor § Dates, times and numbers names it`);
  }
  // m11: an explicit English call (en, en-US) is allowed by the guard but is not C3 when it draws a date: every one is named by file:line, a display format in the
  // Phase 6 hand-off (the chart ticks and tooltip) and the rest in § Dates, times and numbers (one reads parts as numbers, one is an orphan)
  const enSites = [];
  const reEn = /\b(toLocale(?:Date|Time)?String|Intl\.(?:DateTimeFormat|NumberFormat))\(\s*(["'`])(en(?:-US)?)\2/gi;
  for (const f of walk(srcDir)) {
    const rl = path.relative(UI, f).split(path.sep).join("/");
    fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/^\s*(\/\/|\*)/.test(l)) return; let m; reEn.lastIndex = 0; while ((m = reEn.exec(l))) enSites.push({ file: rl, line: i + 1, call: m[1] }); });
  }
  const phase6 = hand.slice(hand.indexOf("**Phase 6"), hand.indexOf("**Phase 7"));
  let nP6 = 0, nDates = 0;
  for (const s of enSites) {
    const cite = `${path.basename(s.file)}:${s.line}`;
    if (phase6.includes(cite)) nP6++;
    else if (dateS.includes(cite)) nDates++;
    else bad.push(`${s.file}:${s.line} passes an explicit English locale to ${s.call} and neither the Phase 6 hand-off nor § Dates, times and numbers names it (${cite})`);
  }
  stats.englishLocale = { sites: enSites.length, phase6: nP6, dates: nDates };
  check("H20", "the date guard rejects an explicit non-English locale as well as a default-locale call, every such call in the source (in scope or in an orphan) is named in § Dates, times and numbers, and every explicit en-US call is named by file and line: the chart ticks and tooltip in the Phase 6 hand-off, the rest in § Dates, times and numbers", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : `${sites.length} explicit non-English locale call${sites.length === 1 ? "" : "s"} (${sites.map((s) => `${path.basename(s.file)}:${s.line} '${s.locale}'`).join(", ") || "none"}), each named; the guard's definition and the hand-off say "any explicit non-English locale"; ${enSites.length} explicit en-US calls: ${nP6} named in the Phase 6 hand-off (${enSites.filter((x) => phase6.includes(`${path.basename(x.file)}:${x.line}`)).map((x) => `${path.basename(x.file)}:${x.line}`).join(", ")}), ${nDates} in § Dates, times and numbers`);
  stats.nonEnglishLocale = { sites: sites.length };
}
// H6: an engine id drawn as it is ("openai") instead of by its display name (the model-names table in § Terminology)
const engineSites = [];
for (const f of walk(srcDir)) {
  const rel = path.relative(UI, f).split(path.sep).join("/");
  if (OUT.some(([re]) => re.test(rel)) || /StandaloneUserEngine\.tsx$/.test(rel)) continue; // that file's labels come from the mapping rows
  fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => {
    if (/^\s*(\/\/|\*)/.test(l) || /===|!==|\bvalue=|\bengine:|\bengine\s*=[^=]/.test(l)) return;
    if (/label=\{[^}]*\bengine\b[^}]*\}|\{\s*[\w.?]+\.engine\s*\}|\$\{[\w.?]*\.?engine\}|^\s*\{eng\}\s*$/.test(l)) engineSites.push({ file: rel, line: i + 1 });
  });
}
// the old display labels typed into a string ('OpenAI', 'QWEN'), in a mapping and again in the empty chart's zero baseline: each line has its row
const engineLabelSites = [];
for (const f of walk(srcDir)) {
  const rel = path.relative(UI, f).split(path.sep).join("/");
  if (OUT.some(([re]) => re.test(rel))) continue;
  fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/["'](OpenAI|QWEN)["']/.test(l) && !/^\s*(\/\/|\*)/.test(l) && !/===|!==/.test(l)) engineLabelSites.push({ file: rel, line: i + 1 }); });
}
engineSites.push(...engineLabelSites);
const engineUncovered = engineSites.filter((x) => !(rowsByFile.get(x.file) || []).some(({ r, lines }) => lines.includes(x.line) && /ChatGPT|Qwen|display name/.test(r.new)));
check("H6", "every place that draws an engine id shows its display name from the model-names table (ChatGPT, Qwen), never the raw id", engineUncovered.length === 0, engineUncovered.length ? `\n        ${list(engineUncovered.map((x) => `${x.file}:${x.line}`))}` : `${engineSites.length} sites in ${new Set(engineSites.map((x) => x.file)).size} files`);
stats.engineSites = { sites: engineSites.length, files: new Set(engineSites.map((x) => x.file)).size };
// H8: a dialog's confirming button repeats the verb and the object (C11): "Create webhook", not "Create". The last button of each
// <DialogActions> is the confirming one; every bare-verb label it can show (a ternary lists several) needs a row whose New names the object.
const BARE_CONFIRM = /^(Create|Update|Add|Save|Delete|Remove|Approve|Reject|Revoke|Send|Submit|Apply|Confirm|Continue|Register|Upload|Download|Disable|Enable|Authorize|Assign|Unassign)$/;
const confirmSites = [];
for (const f of walk(srcDir)) {
  const rel = path.relative(UI, f).split(path.sep).join("/");
  if (OUT.some(([re]) => re.test(rel))) continue;
  const text = fs.readFileSync(f, "utf8");
  for (const m of text.matchAll(/<DialogActions[^>]*>([\s\S]*?)<\/DialogActions>/g)) {
    const buttons = [...m[1].matchAll(/<Button\b[^>]*>([\s\S]*?)<\/Button>/g)];
    if (!buttons.length) continue;
    const last = buttons[buttons.length - 1];
    const inner = last[1];
    const lits = [...inner.matchAll(/(["'`])([^"'`\n]{2,40})\1/g)].filter((x) => !/(\.\.\.|…)/.test(x[2])).map((x) => ({ label: x[2], at: x.index + 1 }));
    const labels = lits.length ? lits : [{ label: inner.replace(/\s+/g, " ").trim(), at: Math.max(0, inner.search(/\S/)) }];
    // the line of the label itself (a literal inside a ternary sits lines below the button's opening tag), so an exact anchor matches it
    const innerAt = m.index + m[0].indexOf(last[0]) + last[0].lastIndexOf(inner);
    for (const { label, at } of labels) {
      if (!BARE_CONFIRM.test(label)) continue;
      confirmSites.push({ file: rel, line: text.slice(0, innerAt + at).split("\n").length, label });
    }
  }
}
const confirmBad = confirmSites.filter((x) => !(rowsByFile.get(x.file) || []).some(({ r, lines }) => r.old === x.label && r.new.trim().split(/\s+/).length >= 2 && lines.some((l) => Math.abs(l - x.line) <= 1)));
check("H8", "every bare-verb label a dialog's confirming button can show has a row whose New repeats the verb and names the object (C11)", confirmBad.length === 0, confirmBad.length ? `\n        ${list(confirmBad.map((x) => `${x.file}:${x.line} "${x.label}"`))}` : `${confirmSites.length} labels in ${new Set(confirmSites.map((x) => x.file)).size} files`);
stats.confirmLabels = confirmSites.length;
// H7: CSS capitals (and lowercase) drawn over a string: the lock bans them, so the implementation hand-off names every site
const capSites = [];
for (const f of walk(srcDir)) {
  const rel = path.relative(UI, f).split(path.sep).join("/");
  if (OUT.some(([re]) => re.test(rel))) continue;
  fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/textTransform:\s*["'](uppercase|lowercase|capitalize)["']/.test(l) && !/^\s*(\/\/|\*)/.test(l)) capSites.push({ file: rel, line: i + 1, how: l.match(/uppercase|lowercase|capitalize/)[0] }); });
}
const handoffText = (voice.slice(voice.lastIndexOf("### Hand-offs")) || "");
const capMissing = capSites.filter((x) => !handoffText.includes(`${path.basename(x.file)}:${x.line}`));
// the ninth review: a test that asserts a CSS capital changes with the component (PrimaryButton.test.tsx:43 asserts `uppercase`), so the hand-off names it too
const capTests = [];
(function walkTests(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!["node_modules", "services"].includes(e.name)) walkTests(p); }
    else if (/\.test\.(tsx?|jsx?)$/.test(e.name)) fs.readFileSync(p, "utf8").split("\n").forEach((l, i) => { if (/textTransform:\s*["'](uppercase|lowercase|capitalize)["']/.test(l) && !/^\s*(\/\/|\*)/.test(l)) capTests.push({ file: path.relative(UI, p).split(path.sep).join("/"), line: i + 1, how: l.match(/uppercase|lowercase|capitalize/)[0] }); });
  }
})(srcDir);
const capTestMissing = capTests.filter((x) => !handoffText.includes(`${path.basename(x.file)}:${x.line}`));
check("H7", "every CSS text-transform that draws capitals or lowercase over a string in scope, and every test that asserts one, is named in the implementation hand-off (the lock bans CSS capitals)", capMissing.length === 0 && capTestMissing.length === 0, capMissing.length || capTestMissing.length ? `\n        ${list([...capMissing, ...capTestMissing].map((x) => `${x.file}:${x.line} (${x.how})`))}` : `${capSites.length} sites and ${capTests.length} test assertion named: ${[...capSites, ...capTests].map((x) => `${path.basename(x.file)}:${x.line}`).join(", ")}`);
stats.capSites = capSites.length; stats.capTests = capTests.length;
// H10: a count shown with a plural noun has a real singular (C4: "1 student", not "1 students"). Every line in scope that writes a number
// slot or expression and a plural noun after it ("${n} students", "{count} recipients selected") has a row on that line whose New picks the
// noun by the count ("{n: count student}") or whose note gives the singular reading ("1 student"). A line where the count can never be 1 is
// exempt, with the reason.
const COUNT_EXEMPT = [
  { file: /EmailSelectedUsersDialog\.tsx$/, re: /failedTypes/, why: "a list of user types (\"student, instructor users\"), not a count" },
  { file: /EmailAudit\.tsx$/, re: /toEmails\.length\} recipients/, why: "shown only when the count is not 1: the address itself is shown for one recipient" },
];
const countSites = [];
for (const f of walk(srcDir)) {
  const relf = path.relative(UI, f).split(path.sep).join("/");
  if (OUT.some(([re]) => re.test(relf))) continue;
  fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
    for (const m of l.matchAll(/(?:\$?\{[^{}]*\})\s+(?:[a-z]{3,}\s+)?([a-z]{3,}s)\b(?!\s*[:=])/g)) {
      if (NOT_NOUN.has(m[1])) continue;
      countSites.push({ file: relf, line: i + 1, noun: m[1], src: l.trim() });
    }
  });
}
const countBad = []; const countExempt = [];
for (const s of countSites) {
  const ex = COUNT_EXEMPT.find((e) => e.file.test(s.file) && e.re.test(s.src));
  if (ex) { countExempt.push(s); continue; }
  const singular = s.noun.endsWith("ies") ? s.noun.slice(0, -3) + "y" : /(sh|ch|x|s|z)es$/.test(s.noun) ? s.noun.slice(0, -2) : s.noun.slice(0, -1);
  // the row writes the noun with the helper (a note that gives the singular reading is not the string, D3)
  const declares = ({ r }) => /\{[\w.]+: count [a-z]+(?: [a-z]+)*\}/.test(r.new);
  const ok = (rowsByFile.get(s.file) || []).some((e) => e.lines.some((l) => Math.abs(l - s.line) <= 1) && declares(e));
  if (!ok) countBad.push(s);
}
check("H10", "every count shown with a plural noun in scope has a row that picks the noun by the count with the helper (C4); a note that gives the singular reading does not count", countBad.length === 0,
  countBad.length ? `\n        ${list(countBad.map((s) => `${s.file}:${s.line} {…} ${s.noun}`), 40)}` : `${countSites.length} lines in ${new Set(countSites.map((s) => s.file)).size} files; ${countExempt.length} exempt (${[...new Set(COUNT_EXEMPT.map((e) => e.why))].join("; ")})`);
stats.countSites = { lines: countSites.length, files: new Set(countSites.map((s) => s.file)).size, exempt: countExempt.length };
// H9: a change goes everywhere the string goes. Every place in scope that draws a changed row's Old text, as a whole string literal or
// a whole JSX text, sits within two lines of an anchor of a row with that Old: the same toast in two pages, an aria-label beside its
// tooltip, a fallback label that repeats a mapping. A comparison against the text (=== "x", case "x") is code, not a drawing. Generic
// single words stay with H1 and H8; a one-word tooltip or aria name is read in its title=, aria-label= and tooltip= slots only.
const OCC_EXEMPT = [
  { file: "src/pages/MCPAuthorize.tsx", text: "Authorization failed", why: "thrown inside handleAuthorize and caught at the catch below it, which navigates home and shows nothing; S-08.10 covers the login handler's fallback" },
];
const occTargets = new Map();
for (const r of resolved) {
  if (r.keep || !r.old || r.phase6) continue; // Phase 5's strings: the figure is the Phase 5 evidence's; a Phase 6 row anchors every line that holds its old text (Q2)
  const o = normText(r.old);
  if (/[{}$()=]|\.\.\./.test(o)) continue; // a slot, a code expression or a truncation: not a whole literal
  const icon = r.kind === "tooltip" || r.kind === "aria";
  const spaced = /\s/.test(o);
  // a phrase of 8 or more characters; a single word only as an icon name (a raw status or mode id is code, and a generic word is H1's)
  if (!(spaced ? o.length >= 8 : icon && o.length >= 4)) continue;
  if (!occTargets.has(o)) occTargets.set(o, { rows: [], spaced });
  occTargets.get(o).rows.push(r);
}
const occSites = []; const occExempt = [];
const esc9 = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const f of walk(srcDir)) {
  const relf = path.relative(UI, f).split(path.sep).join("/");
  if (OUT.some(([re]) => re.test(relf))) continue;
  const src = readSource(relf); if (!src) continue;
  for (const [o, t] of occTargets) {
    const short = !t.spaced; // an icon name of one word: only where it is a title, aria-label or tooltip value
    const re = new RegExp("(?<=[\"'`>])\\s*" + esc9(o) + "\\s*(?=[\"'`<])", "g");
    let m;
    while ((m = re.exec(src.hay))) {
      const before = src.hay.slice(0, m.index).trimEnd(); const after = src.hay.slice(m.index + m[0].length).trimStart();
      if (/(?:===|!==|==|!=|\bcase)\s*["'`]$/.test(before) || /^["'`]\s*(?:===|!==|==|!=)/.test(after)) continue;
      if (short && !/(?:title|aria-label|tooltip)\s*[:=]\s*\{?\s*["'`]$/.test(before)) continue;
      const line = lineOfOffset(src.starts, m.index + (m[0].length - m[0].trimStart().length));
      const code = (src.lines[line - 1] || "").trim();
      if (/^(\/\/|\*|\/\*)/.test(code) || /console\./.test(code)) continue;
      occSites.push({ file: relf, line, text: o });
    }
  }
}
const occBad = [];
for (const s of occSites) {
  const ex = OCC_EXEMPT.find((e) => e.file === s.file && e.text === s.text);
  if (ex) { occExempt.push(s); continue; }
  const ok = (rowsByFile.get(s.file) || []).some(({ r, lines }) => normText(r.old) === s.text && lines.some((l) => Math.abs(l - s.line) <= 2));
  if (!ok) occBad.push(s);
}
check("H9", "every place in scope that draws a changed string (a whole literal or JSX text equal to a row's Old) sits at an anchor of a row with that Old, so a change reaches every copy of the string", occBad.length === 0,
  occBad.length ? `\n        ${list(occBad.map((s) => `${s.file}:${s.line} "${s.text.slice(0, 60)}"`))}` : `${occSites.length} sites in ${new Set(occSites.map((s) => s.file)).size} files for ${occTargets.size} strings; ${occExempt.length} exempt (${[...new Set(OCC_EXEMPT.map((e) => e.why))].join("; ")})`);
stats.occurrences = { strings: occTargets.size, sites: occSites.length, files: new Set(occSites.map((s) => s.file)).size, exempt: occExempt.length };

// ---------------------------------------------------------------- the three scans that read types (scan-ts.mjs)
const idData = loadIdentifiers();
const nearRows = (file, line, radius) => (rowsByFile.get(file) || []).filter(({ lines }) => lines.some((l) => Math.abs(l - line) <= radius)).map(({ r }) => r);

// F21: the lookups block in DESIGN.md is the one identifiers.json and the rows produce, and every lookup row lists values its lookup has
{
  const a = design.indexOf("<!-- copy:lookups:start -->"), b = design.indexOf("<!-- copy:lookups:end -->");
  const want = lookupsBlockText(loadIdentifiers(), resolved);
  const have = a >= 0 && b > a ? design.slice(a + "<!-- copy:lookups:start -->".length, b).trim() : null;
  check("F21", "the Labels for ids and codes block in DESIGN.md (the lookup tables, the ids shown by name, the identifiers drawn as they are) is generated from identifiers.json and the rows", have !== null && have === want.trim(), have === null ? "no copy:lookups markers in DESIGN.md" : have === want.trim() ? `${Object.keys(loadIdentifiers().lookups).length} lookups, ${loadIdentifiers().exempt.reduce((n, e) => n + e.sites.length, 0)} exempt sites` : "the block is out of date: run build-copy.mjs");
}

// H11: an identifier is never drawn as it is. An enum value, a key, an id or a code that a page draws as visible text or as an accessible name
// (a select option, a table cell, a chip, a tooltip, a dialog sentence, a toast, a DataGrid column) has a lookup row (`lk`, the words from
// identifiers.json: every value the place can show has its words) or a written exemption with its reason (an id an admin copies, an identifier
// the admin chose, an event name, a word inside a sentence whose row covers it).
if (!tsScan) check("H11", "every identifier drawn as text has a lookup row or a written exemption", false, tsScanError);
else {
  const exemptFor = (s) => idData.exempt.find((e) => e.file === s.file && e.sites.some((x) => x.expr === s.expr && x.line === s.line));
  const idBad = [], idLookup = [], idExempt = [];
  for (const s of tsScan.identifiers) {
    if (exemptFor(s)) { idExempt.push(s); continue; }
    const lkRows = nearRows(s.file, s.line, 3).filter((r) => r.lk || r.uses);
    if (s.kind === "literal" && nearRows(s.file, s.line, 3).some((r) => r.old === s.members[0])) { idLookup.push(s); continue; }
    if (lkRows.length) {
      const have = new Set(lkRows.flatMap((r) => r.lkVals || []));
      const missing = s.members.filter((m) => !have.has(m));
      if (missing.length) { idBad.push(`${s.file}:${s.line} ${s.expr} has no words for ${missing.join(", ")}`); continue; }
      idLookup.push(s); continue;
    }
    if (s.kind === "literal" && nearRows(s.file, s.line, 3).some((r) => r.old === JSON.parse(s.expr))) { idLookup.push(s); continue; }
    idBad.push(`${s.file}:${s.line} [${s.kind}] ${s.expr}${s.members.length ? " : " + s.members.join(" | ") : ""}`);
  }
  // an exemption that no longer matches a site is stale
  const stale = idData.exempt.flatMap((e) => e.sites.filter((x) => !/(toUpperCase|toLowerCase)\(/.test(x.expr) && !tsScan.identifiers.some((s) => s.file === e.file && s.expr === x.expr && s.line === x.line)).map((x) => `${e.file}:${x.line} ${x.expr}`));
  check("H11", "every enum value, key, id or code drawn as visible text or as an accessible name has a lookup row (every value it can show, with its words) or a written exemption with its reason", idBad.length === 0 && stale.length === 0,
    idBad.length || stale.length ? `\n        ${list([...idBad, ...stale.map((x) => `stale exemption ${x}`)], 50)}` : `${tsScan.identifiers.length} sites in ${new Set(tsScan.identifiers.map((s) => s.file)).size} files: ${idLookup.length} through ${Object.keys(idData.lookups).length} lookups, ${idExempt.length} exempt (${new Set(idData.exempt.map((e) => e.reason)).size} reasons)`);
  stats.identifiers = { sites: tsScan.identifiers.length, files: new Set(tsScan.identifiers.map((s) => s.file)).size, lookup: idLookup.length, exempt: idExempt.length, lookups: Object.keys(idData.lookups).length, reasons: new Set(idData.exempt.map((e) => e.reason)).size };
}

// H14: a function that sends requests one after another and then tells the reader how it went is a batch, and its failure is a partial result: it has a
// row whose cause is `partial` (what went through, why the rest did not, what to do), or it is a read written down below with its reason.
if (!tsScan) check("H14", "every batch has a partial-result row", false, tsScanError);
else {
  const loops = tsScan.batches.filter((b) => b.reports);
  const fns = new Map(); for (const b of loops) fns.set(`${b.file}:${b.from}-${b.to}`, b);
  const batchBad = [], batchExempt = [];
  for (const b of fns.values()) {
    const ex = idData.batches.find((e) => e.file === b.file && loops.some((l) => l.file === b.file && l.from === b.from && l.line === e.line));
    if (ex) { batchExempt.push(b); continue; }
    const ok = resolved.some((r) => !r.keep && r.kind === "error" && r.err && r.err.c === "partial" && r.anchors.some((a) => a.file === b.file && a.lines.some((l) => l >= b.from && l <= b.to)));
    if (!ok) batchBad.push(`${b.file}:${b.line} ${b.loop} (the function runs lines ${b.from} to ${b.to})`);
  }
  check("H14", "every function that sends requests one after another and then reports how it went has a partial-result row (what went through, why the rest did not, what to do), or is a read listed with its reason", batchBad.length === 0, batchBad.length ? `\n        ${list(batchBad)}` : `${loops.length} loops in ${fns.size} functions: ${fns.size - batchExempt.length} have a partial row, ${batchExempt.length} is a read`);
  stats.batches = { loops: loops.length, functions: fns.size, partial: fns.size - batchExempt.length, reads: batchExempt.length };
}

// H15: a code is not turned into words by changing its case. Where the source capitalises a name, or draws one in capitals or lower case
// (`charAt(0).toUpperCase()`, `.toUpperCase()` on a drawn value), the result is a label of the code's own making: it has a row that says what the
// reader sees, or an exemption with its reason.
if (!tsScan) check("H15", "every code turned into words by changing its case has a row or an exemption", false, tsScanError);
else {
  const dBad = [], dExempt = [];
  for (const s of tsScan.derived) {
    if (idData.exempt.some((e) => e.file === s.file && e.sites.some((x) => x.line === s.line && x.expr === s.expr))) { dExempt.push(s); continue; }
    if (!nearRows(s.file, s.line, 3).length) dBad.push(`${s.file}:${s.line} ${s.expr}`);
  }
  const dStale = idData.exempt.flatMap((e) => e.sites.filter((x) => /(toUpperCase|toLowerCase)\(/.test(x.expr) && !tsScan.derived.some((s) => s.file === e.file && s.line === x.line && s.expr === x.expr)).map((x) => `${e.file}:${x.line} ${x.expr}`));
  check("H15", "every place that turns a code into words by changing its case (a capitalised tool name, an upper-cased key) has a row or a written exemption", dBad.length === 0 && dStale.length === 0, dBad.length || dStale.length ? `\n        ${list([...dBad, ...dStale.map((x) => `stale exemption ${x}`)])}` : `${tsScan.derived.length} sites: ${tsScan.derived.length - dExempt.length} have a row, ${dExempt.length} are exempt`);
  stats.derived = { sites: tsScan.derived.length, exempt: dExempt.length };
}

// H12: a button is a verb and an object (C2). A button whose label is one word is either in the closed carve-out (Retry, Dismiss, Undo, Stop, Copy,
// Apply, Refresh), an exit (Cancel, Close), a word the design system's component tables already name (the PDF toolbar and its search panel), a state
// toggle that names its state, or it has a row that gives it an object. Every label a button can show is read, a ternary's branches included.
const BTN_NAMED = new Map([
  ...["Search", "Thumbnails", "First", "Previous", "Next", "Last", "Fullscreen", "Find"].map((w) => [w, "a word the PDF toolbar or its search panel already has in the component tables (locked wording)"]),
  ...["Ascending", "Descending"].map((w) => [w, "a sort-direction toggle names its state, not an action"]),
  ["Registered", "a disabled button that names the state it reached"],
]);
if (!tsScan) check("H12", "every one-word and every two-word verb-only button has an object, is in the closed carve-out or is named by the component tables", false, tsScanError);
else {
  const btnBad = []; let btnWords = 0, btnTwo = 0;
  for (const b of tsScan.buttons) {
    for (const label of b.labels) {
      const l = label.trim();
      const w = l.split(/\s+/);
      const oneWord = /^[A-Za-z]+(-[A-Za-z]+)?$/.test(l);
      // two words whose second is a particle or a quantifier ("Select all", "Sign in", "Approve selected"): a verb with no object
      const twoWordVerbOnly = w.length === 2 && /^[A-Za-z]+$/.test(w[0]) && /^[A-Za-z]+$/.test(w[1]) && NON_OBJECT.has(w[1].toLowerCase());
      if (!oneWord && !twoWordVerbOnly) continue;
      if (oneWord) btnWords++; else btnTwo++;
      if (oneWord && (SINGLE_VERB_OK.has(l.toLowerCase()) || EXIT_WORDS.has(l.toLowerCase()) || BTN_NAMED.has(l))) continue;
      if (twoWordVerbOnly && TWO_WORD_OK.has(l.toLowerCase())) continue;
      const row = nearRows(b.file, b.line, 8).find((r) => r.old === l && namesObject(r.new)) || nearRows(b.file, b.line, 8).find((r) => r.lk && (r.lkVals || []).includes(l));
      if (!row) btnBad.push(`${b.file}:${b.line} "${l}"`);
    }
  }
  check("H12", "every one-word button label and every two-word verb-only label (\"Select all\", \"Approve selected\") in scope is in C2's closed carve-out (Retry, Dismiss, Undo, Stop, Copy, Apply, Refresh; the exits Cancel and Close; the account controls Sign in and Sign out), is a word the component tables name, or has a row whose New gives it an object", btnBad.length === 0,
    btnBad.length ? `\n        ${list(btnBad, 40)}` : `${tsScan.buttons.length} buttons read, ${btnWords} one-word labels and ${btnTwo} two-word verb-only labels: every one is allowed or has its object`);
  stats.buttons = { read: tsScan.buttons.length, oneWord: btnWords, twoWord: btnTwo };
}

// H13: a string with two branches ("a ? x : y") has a row for each branch, or the branch is listed as already right. A row for one branch and
// nothing for the other leaves the other as it was (SR-5.02 and SR-5.03 are the two branches of AuthLayout.tsx:95-97).
if (!tsScan) check("H13", "every text branch of a conditional string has a row or is kept", false, tsScanError);
else {
  // a branch that is a sentence or a phrase; a bare word, an empty string, a busy form ("Saving…") and a template of slots are read by other rows
  const isTextBranch = (t) => /[A-Za-z]{3}/.test(t) && /\s/.test(t.trim()) && !/\{x\}/.test(t) && !/^[A-Z][a-z]+ing…$/.test(t.trim());
  const brCovered = (file, line, t) => {
    const n = normText(t);
    return nearRows(file, line, 3).some((r) => { const o = normText(r.old || ""); return o && (o === n || (o.includes(n) && n.length >= 8) || (n.includes(o) && o.length >= 0.7 * n.length)); }) || keptTexts.includes(n.toLowerCase());
  };
  const brBad = []; let brPairs = 0;
  for (const cnd of tsScan.conditionals) {
    if (!isTextBranch(cnd.a) || !isTextBranch(cnd.b)) continue;
    brPairs++;
    const ca = brCovered(cnd.file, cnd.line, cnd.a), cb = brCovered(cnd.file, cnd.line, cnd.b);
    if (ca !== cb) brBad.push(`${cnd.file}:${cnd.line} "${(ca ? cnd.b : cnd.a).slice(0, 60)}" has no row, and its other branch does`);
  }
  // The eighth review: a conditional whose two branches are two values of one lookup ("webhook.isActive ? "active" : "inactive"") has one lookup row per value (§ Terminology: one
  // value per row), not one row that lists both: A-09.04 listed both until then. A row of a lookup with two values or more is read at each line it anchors.
  const COND2 = /\?\s*(["'`])([^"'`]+)\1\s*:\s*(["'`])([^"'`]+)\3/g;
  let lkRows = 0;
  for (const r of rows) {
    if (!r.lk || (r.lkVals || []).length < 2) continue;
    lkRows++;
    for (const a of r.anchors) {
      if (!a.file || a.file.startsWith("..")) continue;
      const srcLines = fs.readFileSync(path.join(UI, a.file), "utf8").split("\n");
      for (const ln of a.lines) for (const mm of (srcLines[ln - 1] || "").matchAll(COND2)) if ([mm[2], mm[4]].every((v) => r.lkVals.includes(v))) brBad.push(`${r.id}: ${a.file.split("/").pop()}:${ln} has a conditional whose two branches ("${mm[2]}", "${mm[4]}") are two values of the ${r.lk} lookup, and this one row lists both: one row per value`);
    }
  }
  // The tenth review (C-2): the same for a conditional piece INSIDE a template literal (`Login failed.${support ? ` Please contact ${support}.` : ""}`, which draws two texts). The
  // ternary above never sees it: its branches are a suffix and an empty string. The type scan reads the texts such a template can draw (its readings, scan-ts.mjs `templates`);
  // where one text of two words or more has a row of its own (its Old is that whole text, or an `{a or b}` Old that stands for it), every other text of two words or more has
  // one too, or is kept. A template none of whose texts has a row is unchanged, as with a ternary. S-07.04 and S-07.05 carried the longer text as their Old, so the text they
  // were written for had no row.
  let tplRead = 0, tplTexts = 0, tplCovered = 0;
  for (const t of tsScan.templates) {
    if (!isTextTemplate(t)) continue;
    tplRead++;
    const rowsHere = rows.filter((r) => r.anchors.some((a) => a.file === t.file && a.lines.some((l) => l >= t.line - 1 && l <= t.endLine + 1)));
    const texts = t.readings.filter(isTextReading);
    const covered = texts.map((x) => rowsHere.some((r) => oldKeys(r.old).includes(readingKey(x))) || keptTexts.includes(normText(x).toLowerCase()));
    tplTexts += texts.length; tplCovered += covered.filter(Boolean).length;
    if (covered.some(Boolean) && !covered.every(Boolean)) for (let k = 0; k < texts.length; k++) if (!covered[k]) brBad.push(`${t.file}:${t.line} builds its text with a conditional: ${shownReading(texts[k])} has no row (its Old) and is not kept, and ${shownReading(texts[covered.indexOf(true)])} has one`);
  }
  check("H13", "every text branch of a conditional string (a ? x : y) has a row or is kept when its other branch has one, the same for the texts a template literal with a conditional piece can draw, and a conditional whose two branches are two values of one lookup has a lookup row for each, never one row for both", brBad.length === 0, brBad.length ? `\n        ${list(brBad, 40)}` : `${brPairs} conditional strings read; both branches are covered or neither is; ${tplRead} templates with a conditional piece read, ${tplTexts} texts of two words or more, ${tplCovered} with a row of their own and the rest in templates that no row touches; ${lkRows} rows of lookups with two values or more read: none lists both branches of a conditional`);
  stats.conditionals = { read: brPairs, lookupRows: lkRows, templates: tplRead, templateTexts: tplTexts, templateRows: tplCovered };
}

// H16: a confirmation says what it affects and whether it can be undone, or how to get it back (C11: the consequence, then permanence, then the
// way out). The places that ask the person to confirm are found with the TypeScript compiler (a Dialog whose title asks a question or starts with
// a destructive verb or whose confirm button is coloured, the shared DeleteConfirmDialog, a native confirm()); each is listed in confirmations.json
// with the rows that carry its words, and the joined New text of those rows must say it is permanent or give the way back.
const UNDO_RE = /\bcan(?:'|\u2019)?t (?:be )?(?:undo|undone|restored|reversed)\b|\bcannot be (?:undone|restored|reversed)\b|\bfor good\b|\bpermanent(?:ly)?\b|\byou can [^.]*\bagain\b/i;
if (!tsScan) check("H16", "every confirmation says whether it can be undone", false, tsScanError);
else {
  const conf = JSON.parse(fs.readFileSync(path.join(HERE, "confirmations.json"), "utf8"));
  const DESTRUCTIVE = /^(Confirm|Delete|Remove|Revoke|Regenerate|Reset|Disable|Unassign|Unregister|Reject|Approve|Replace|Discard|Clear)\b/i;
  const sites = tsScan.dialogs.filter((d) => d.kind !== "dialog" || (d.title && (d.coloured || d.title.split(" / ").some((t) => DESTRUCTIVE.test(t.trim()) || /\?$/.test(t.trim())))));
  const keyOf = (d) => `${d.file}:${d.title}`;
  const listedKeys = new Set(conf.dialogs.map((c) => c.key));
  const confBad = [];
  for (const d of sites) if (!listedKeys.has(keyOf(d))) confBad.push(`${d.file}:${d.line} "${d.title}" asks the person to confirm and is not in confirmations.json`);
  for (const c of conf.dialogs) if (!sites.some((d) => keyOf(d) === c.key)) confBad.push(`confirmations.json lists ${c.key}, which the source no longer has`);
  const rowById = new Map(resolved.map((r) => [r.id, r]));
  for (const c of conf.dialogs) {
    const rs = c.rows.map((id) => rowById.get(id));
    const gone = c.rows.filter((id, i) => !rs[i] || rs[i].keep);
    if (gone.length) { confBad.push(`${c.key}: no such row ${gone.join(", ")}`); continue; }
    const file = c.key.slice(0, c.key.indexOf(":"));
    const away = c.rows.filter((id, i) => !rs[i].anchors.some((a) => a.file === file));
    if (away.length) confBad.push(`${c.key}: ${away.join(", ")} not anchored in ${file}`);
    if (!UNDO_RE.test(rs.map((r) => r.new).join(" "))) confBad.push(`${c.key}: its rows (${c.rows.join(", ")}) do not say whether the action can be undone, or how to get it back`);
    // the title asks the question: a title row's New, a native confirm's opening sentence, or a kept title in the source
    const site = sites.find((d) => keyOf(d) === c.key);
    const tr = (c.titles || []).map((id) => rowById.get(id));
    if (tr.some((r) => !r || r.keep)) confBad.push(`${c.key}: no such title row ${(c.titles || []).join(", ")}`);
    else if (tr.length) { for (const r of tr) if (!/\?$/.test(r.new.trim())) confBad.push(`${c.key}: the title ${r.id} "${r.new}" is not a question`); }
    else if (site && site.kind === "native") { if (!/\?/.test(rs[0].new.split(/(?<=[.?!])\s/)[0])) confBad.push(`${c.key}: the native confirm does not open with a question`); }
    else if (site && !site.title.split(" / ").every((t) => /\?$/.test(t.trim()))) confBad.push(`${c.key}: the kept title "${site.title}" is not a question and has no title row`);
  }
  const nDialog = sites.filter((d) => d.kind === "dialog").length, nNative = sites.filter((d) => d.kind === "native").length, nShared = sites.filter((d) => d.kind === "delete-confirm").length;
  check("H16", "every place that asks the person to confirm (a dialog, the shared delete dialog, a native confirm) is listed with its rows: the title asks the question, and the rows say whether the action can be undone or how to get it back (C11)", confBad.length === 0,
    confBad.length ? `\n        ${list(confBad, 30)}` : `${sites.length} places (${nDialog} dialogs, ${nShared} through DeleteConfirmDialog, ${nNative} native confirm calls) in ${new Set(sites.map((d) => d.file)).size} files: each lists its rows; the title is a question, and the rows say it is permanent or give the way back`);
  stats.confirmations = { sites: sites.length, dialogs: nDialog, shared: nShared, native: nNative, files: new Set(sites.map((d) => d.file)).size };
}

const nativeSites = [];
for (const f of walk(srcDir)) {
  const rel = path.relative(UI, f).split(path.sep).join("/");
  if (OUT.some(([re]) => re.test(rel))) continue;
  fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (/\b(window\.)?(alert|confirm|prompt)\(/.test(l) && !/^\s*(\/\/|\*)/.test(l) && !/\.(test)\./.test(rel)) nativeSites.push({ file: rel, line: i + 1 }); });
}
const nativeUncovered = nativeSites.filter((s) => !(rowsByFile.get(s.file) || []).some(({ lines }) => lines.some((l) => Math.abs(l - s.line) <= 3)) && !/IDE\.tsx|FileTabs\.tsx/.test(s.file));
check("H3", "every native alert, confirm and prompt in scope has its text revised (the Scratchpad's input() prompt is the student's own)", nativeUncovered.length === 0, nativeUncovered.map((s) => `${s.file}:${s.line}`).join(", ") || `${nativeSites.length} call sites`);

// K9: no hand-off keeps a string the index revises. Round 6: two hand-off lines said the native confirms "keep their copy until a flow change" while A-08.40 and
// A-09.36 revise those very strings, so a reader who followed the hand-off would have shipped "Are you sure". Every clause of every hand-off that says something
// keeps its copy, its wording or its text is read: a string it quotes must not be the Old of a changed row (unless the clause is about another place that
// keeps the same words, listed below with its reason), and the native dialogs, whose every call H3 shows has a row, are never said to keep their copy.
{
  const bad = [];
  const KEEP = /\b(keeps?|kept|stays?|remains?|unchanged|left as|leaves?|retains?)\b/i;
  const SUBJ = /\b(copy|wording|words?|text|strings?|labels?|dialogs?|confirms?|alerts?|prompts?|messages?)\b/i;
  const KEEP_OK = [{ text: "Processing failed", why: "the filter option's own name, a kept row (A-14.34); the chip of the same name is A-14.28" }];
  const sections = [...design.matchAll(/^### Hand-offs\n([\s\S]*?)(?=\n##+ |(?![\s\S]))/gm)].map((m) => m[1]);
  let clauses = 0, keepClauses = 0;
  for (const sec of sections) for (const line of sec.split("\n").filter((l) => /^- /.test(l))) for (const clause of line.split(/;\s|\.\s(?=[A-Z`"(])/)) {
    clauses++;
    if (!(KEEP.test(clause) && SUBJ.test(clause))) continue;
    keepClauses++;
    for (const q of xQuoted(clause)) if (xOld.has(q) && !KEEP_OK.some((k) => k.text === q)) bad.push(`a hand-off keeps "${q}", which ${xOld.get(q)} revises: ${clause.slice(0, 110)}`);
    if (/\bnative\b|`(?:confirm|alert|prompt)\(\)`/i.test(clause) && /\b(keeps?|kept|unchanged|leaves?|left)\b[^;.]*\b(copy|wording|words|text|strings?)\b/i.test(clause)) bad.push(`a hand-off says the native dialogs keep their copy, and every native call has a row (H3): ${clause.slice(0, 110)}`);
  }
  const vh = sect("Hand-offs");
  if (nativeUncovered.length) bad.push("a native call has no row, so the hand-off's account of the native dialogs is not true (H3)");
  if (!/pass the index's New text as the string the browser shows/.test(vh) || !/ship the index's New text in every native `alert\(\)`, `confirm\(\)` and `prompt\(\)` call/.test(vh)) bad.push("the hand-offs do not say that the index's New text ships on the native mechanism");
  if (!/only the browser's own OK and Cancel buttons stay until a flow change[^.;]*because C2 cannot reach them/.test(vh)) bad.push("the hand-offs do not say that only the browser's own OK and Cancel buttons stay, and why");
  const nativeRows = ["A-08.40", "A-09.36"].filter((id) => rows.some((r) => r.id === id));
  if (nativeRows.length !== 2) bad.push("A-08.40 and A-09.36, the native confirms' rows, are missing");
  check("K9", "no hand-off keeps a string the index revises: the native alert, confirm and prompt calls ship the index's New text, and only the browser's own OK and Cancel buttons stay until a flow change (C2 cannot reach them)", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : `${clauses} hand-off clauses read in ${sections.length} sections, ${keepClauses} say something keeps its copy and none keeps a string a row revises; the ${nativeSites.length} native calls all have rows (A-08.40 and A-09.36 are the two confirms)`);
  stats.handoffKeeps = { clauses, keepClauses, sections: sections.length, native: nativeSites.length };
}
stats.native = nativeSites.length;

// D12: the destructive actions (the seventh review's X1: the webhook's "delete" only sets it inactive, and the copy said delete and "can't be undone"). Every call in the source
// that removes, deactivates, disables or revokes something is listed in destructive-actions.json with what the backend does when it runs; the backend cite must show it (the
// entry's regular expression is read in the cited lines); the copy of a soft action says its own verb, never delete, remove or permanent; an archive the person cannot see or
// undo says why it is still called delete; and every New row with a removal word belongs to an action or to a written `other` line. A new call, a changed backend, or a new
// row with such a word fails here until it is classified.
{
  const da = JSON.parse(fs.readFileSync(path.join(HERE, "destructive-actions.json"), "utf8"));
  const bad = [];
  const EFFECTS = new Set(["hard", "soft", "archive", "state", "client"]);
  const SOFT_WORDS = /\bdelet(?:e|es|ed|ing)\b|\bremov(?:e|es|ed|ing)\b|\bpermanent(?:ly)?\b|can't be undone|cannot be undone|can't undo\b/i;
  const FAMILY = /delet|remov|permanent|undone|\bundo\b|unassign|unregist|revok|deactivat|archiv|disabl|discard|erase|turn(?:ed)? off|inactive/i;
  const callRe = /\b([A-Za-z]+Controller(?:Delete|Remove|Unassign|Disable|Revoke|Unregister|Archive|Deactivate)[A-Za-z]*)\s*\(/g;
  const found = new Map();
  for (const f of walk(srcDir)) {
    const rl = path.relative(UI, f).split(path.sep).join("/");
    if (/^src\/services\//.test(rl) || /\.test\.[tj]sx?$/.test(rl)) continue;
    fs.readFileSync(f, "utf8").split("\n").forEach((l) => {
      if (/^\s*(\/\/|\*)/.test(l)) return;
      let m; callRe.lastIndex = 0;
      while ((m = callRe.exec(l))) found.set(`${rl}::${m[1]}`, (found.get(`${rl}::${m[1]}`) || 0) + 1);
      if (/method:\s*["']DELETE["']/.test(l)) found.set(`${rl}::fetch DELETE`, (found.get(`${rl}::fetch DELETE`) || 0) + 1);
    });
  }
  const listed = new Map();
  for (const a of da.actions) for (const [file, call] of a.calls) listed.set(`${file}::${call}`, (listed.get(`${file}::${call}`) || 0) + 1);
  for (const [k, n] of found) if (listed.get(k) !== n) bad.push(`${k}: ${n} call${n === 1 ? "" : "s"} in the source, ${listed.get(k) || 0} in destructive-actions.json: classify what the backend does when it runs`);
  for (const [k] of listed) if (!found.has(k)) bad.push(`destructive-actions.json lists ${k}, which the source no longer has`);
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const showsAt = (cite, regex, where) => {
    const cs = citesIn(cite);
    if (cs.length !== 1 || cs[0].error) { bad.push(`${where}: the cite "${cite}" does not name one file and lines inside it${cs[0]?.error ? ` (${cs[0].error})` : ""}`); return false; }
    const text = fs.readFileSync(cs[0].abs, "utf8").split("\n").slice(cs[0].from - 1, cs[0].to).join("\n");
    if (!new RegExp(regex).test(text)) { bad.push(`${where}: ${cite} does not show /${regex}/, so it no longer says what the entry says the backend does`); return false; }
    return true;
  };
  const inAction = new Set(); const effects = {};
  for (const a of da.actions) {
    const w = `action ${a.id}`;
    effects[a.effect] = (effects[a.effect] || 0) + 1;
    if (!EFFECTS.has(a.effect)) bad.push(`${w}: effect "${a.effect}" is not hard, soft, archive, state or client`);
    showsAt(a.backend, a.evidence, w);
    for (const id of a.rows) {
      inAction.add(id);
      const r = rowById.get(id);
      if (!r) { bad.push(`${w}: row ${id} is not a New row`); continue; }
      if (["soft", "state"].includes(a.effect) && SOFT_WORDS.test(r.new)) bad.push(`${w} is ${a.effect}, so the copy must not say delete, remove or permanent, and ${id} does: ${r.new.slice(0, 100)}`);
    }
    if (a.effect === "soft") {
      if (!a.verb || !a.button || !a.visible || !a.visibleCite) bad.push(`${w}: a soft action names its verb, its button row and what the person sees afterwards`);
      else {
        showsAt(a.visibleCite, a.visibleEvidence, `${w} (what the person sees)`);
        const b = rowById.get(a.button);
        if (!b || !new RegExp(`^${a.verb}\\b`, "i").test(b.new)) bad.push(`${w}: the button ${a.button} must open with its own verb, ${a.verb}`);
      }
    }
    if (a.effect === "archive") {
      if (!a.why || a.why.length < 40 || !a.visibleCite) bad.push(`${w}: an archive that is still called delete needs a reason and the cite that shows nothing lists it`);
      else showsAt(a.visibleCite, a.visibleEvidence, `${w} (what the person sees)`);
    }
  }
  for (const [id, why] of Object.entries(da.other)) {
    const r = rowById.get(id);
    if (!r) bad.push(`other ${id}: not a New row`);
    else if (!FAMILY.test(r.new)) bad.push(`other ${id}: its text no longer has a removal word, so the line is stale`);
    if (String(why).length < 20) bad.push(`other ${id}: gives no reason`);
    if (inAction.has(id)) bad.push(`other ${id}: is also in an action`);
  }
  const unclassified = rows.filter((r) => r.kind !== "remove" && FAMILY.test(r.new) && !inAction.has(r.id) && !(r.id in da.other)).map((r) => `${r.id} [${r.kind}] ${r.new.slice(0, 90)}`);
  for (const u of unclassified) bad.push(`${u}: a removal word that no action or \`other\` line accounts for`);
  stats.destructive = { calls: [...found.values()].reduce((a, b) => a + b, 0), keys: found.size, actions: da.actions.length, effects, rows: inAction.size, other: Object.keys(da.other).length, wording: rows.filter((r) => r.kind !== "remove" && FAMILY.test(r.new)).length };
  check("D12", "every call in the source that removes, deactivates, disables or revokes something is classified by what the backend does (the cited lines show it), the copy of a soft action says its own verb and never delete, remove or permanent, an archive the person cannot see or undo says why it is still called delete, and every New row with a removal word belongs to a classified action", bad.length === 0, bad.length ? `\n        ${list(bad, 30)}` : `${stats.destructive.calls} calls in ${new Set([...found.keys()].map((k) => k.split("::")[0])).size} files, ${da.actions.length} actions (${Object.entries(effects).map(([k, v]) => `${v} ${k}`).join(", ")}); ${stats.destructive.wording} rows with a removal word, all accounted for (${inAction.size} in an action, ${Object.keys(da.other).length} on a written line)`);
}

// D13: every New string that says who can act is a claim about the product's access model (the seventh review's follow-up: fix round 7 had written today's menu into S-01.07).
// The model is the user's decision of 2026-10-16, built on the branch fix/access-control (docs/logic-changes.md: LC-2 and LC-7), not today's menus and guards. access-claims.json
// lists each claim: its rows, who it names, the facts that back it (a sentence quoted from that page, or a cite of code that holds on both sides of the merge) and its effect:
// confirmed, fixed, or gated. A gated row ships with or after the merge and says so in its note, in § Errors and in the hand-offs. The rows are found by their wording, so a new
// string that names who can act has to be classified before the check passes.
{
  const bad = [];
  const ac = JSON.parse(fs.readFileSync(path.join(HERE, "access-claims.json"), "utf8"));
  const WHO = /\bonly (?:an? |the )?(?:administrator|admin|instructor)s?\b|\bask (?:an? |your |the )?(?:administrator|admin|instructor)s?\b|\b(?:an?|your|the) (?:administrator|instructor)s? (?:adds|assigns|added|hasn.t|can|will|turns)\b/i;
  const found = rows.filter((r) => WHO.test(r.new));
  const listed = new Map();
  for (const c of ac.claims) for (const id of c.rows) { if (listed.has(id)) bad.push(`${id} is in two claims`); listed.set(id, c); }
  for (const r of found) if (!listed.has(r.id)) bad.push(`${r.id} says who can act ("${r.new.slice(0, 70)}") and no claim lists it: add it to access-claims.json with the facts that back it`);
  for (const id of listed.keys()) { const r = rows.find((x) => x.id === id); if (!r) bad.push(`${id} is listed but is not a row`); else if (!WHO.test(r.new)) bad.push(`${id} no longer says who can act, so its claim is stale`); }
  // the page the facts quote: the working tree's copy once it has merged, else the branch's, else none (a copy of the repository without git: the quotes are then not read)
  const norm = (t) => String(t).replace(/\s+/g, " ").trim();
  let page = null, pageFrom = "";
  if (fs.existsSync(path.join(ROOT, ac.page))) { page = fs.readFileSync(path.join(ROOT, ac.page), "utf8"); pageFrom = ac.page; }
  else { const t = git("show", `${ac.branch}:${ac.page}`); if (t) { page = t; pageFrom = `${ac.branch}:${ac.page}`; } }
  const npage = page === null ? null : norm(page);
  let quoted = 0, unread = 0, cited = 0;
  const used = new Set();
  const errT = sect("Errors"), handT = sect("Hand-offs");
  for (const c of ac.claims) {
    if (!["confirmed", "fixed", "gated"].includes(c.effect)) bad.push(`${c.id}: the effect "${c.effect}" is none of confirmed, fixed, gated`);
    if (!c.who || !c.says || String(c.why || "").length < 30) bad.push(`${c.id}: needs who, what and a reason`);
    if (!(c.facts || []).length) bad.push(`${c.id}: no fact backs it`);
    for (const f of c.facts || []) { used.add(f); if (!ac.facts[f]) bad.push(`${c.id}: the fact ${f} does not exist`); }
    if (c.effect === "gated") for (const id of c.rows) {
      const r = rows.find((x) => x.id === id);
      const idRe = id.replace(".", "\\.");
      if (r && !(/fix\/access-control/.test(r.note) && /[Ss]hips with or after/.test(r.note))) bad.push(`${id} is gated on the merge, and its note does not say that it ships with or after it`);
      if (!new RegExp(idRe).test(errT)) bad.push(`${id} is gated on the merge, and § Errors does not list it beside S-05.06`);
      if (!new RegExp(idRe + "[^.]{0,80}with or after the `fix\\/access-control` merge").test(handT)) bad.push(`${id} is gated on the merge, and the hand-offs do not say that it ships with or after the \`fix/access-control\` merge`);
    }
  }
  for (const [id, f] of Object.entries(ac.facts)) {
    if (!used.has(id)) bad.push(`the fact ${id} backs no claim`);
    if (f.quote) { quoted++; if (npage === null) unread++; else if (!npage.includes(norm(f.quote))) bad.push(`the fact ${id} is not on ${pageFrom}: "${String(f.quote).slice(0, 70)}"`); }
    else if (f.cite) { cited++; const cs = citesIn(f.cite); if (!cs.length || cs.some((x) => x.error)) bad.push(`the fact ${id} cites code that does not resolve: ${(cs.find((x) => x.error) || {}).error || "no cite"}`); }
    else bad.push(`the fact ${id} has neither a quote nor a cite`);
  }
  if (!/copy that says who can act follows the access model the user decided on 2026-10-16, which `fix\/access-control` builds/.test(handT)) bad.push("the hand-offs do not state the rule that copy follows the access model built on fix/access-control");
  const by = (e) => ac.claims.filter((c) => c.effect === e).length;
  stats.accessClaims = { rows: found.length, claims: ac.claims.length, confirmed: by("confirmed"), fixed: by("fixed"), gated: by("gated"), facts: Object.keys(ac.facts).length, quoted, cited, unread, page: pageFrom || "none readable" };
  check("D13", "every New string that says who can act is a claim about the access model the user decided on 2026-10-16 and fix/access-control builds: it is listed in access-claims.json with the facts that back it (quotes read against the page, cites resolved) and an effect; a gated claim ships with or after the merge and says so in its note, in § Errors and in the hand-offs; and the hand-offs state the rule", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : `${found.length} rows say who can act, in ${ac.claims.length} claims (${by("confirmed")} confirmed, ${by("fixed")} fixed, ${by("gated")} gated); ${Object.keys(ac.facts).length} facts: ${quoted} quoted from ${pageFrom || "no page (not readable here)"}${unread ? ` (${unread} not read)` : ""}, ${cited} cited in code`);
}

// K10: every source cite in a row's note, a page's note and the Voice section ("File.tsx:123", "File.tsx:123-130", "dir/file.ts:9") names one file, and its line is inside
// the file (the sixth review's m10: a cite that points past the end, or at one of two files of one name, sends the reader to the wrong place).
{
  const bad = []; let nNotes = 0, nVoice = 0;
  const scan = (label, text, counter) => { for (const c of citesIn(text)) { counter(); if (c.error) bad.push(`${label}: ${c.error}`); } };
  let nNotes6 = 0;
  for (const r of resolved) scan(`${r.id} note`, r.note, () => (r.phase6 ? nNotes6++ : nNotes++));
  for (const g of groups) for (const t of [g.note, g.noChange, ...(g.kept || [])]) scan(`${g.id} page note`, t || "", () => (g.phase === 6 ? nNotes6++ : nNotes++));
  scan("§ Voice and tone", design.slice(design.indexOf("## Voice and tone"), voiceEnd < 0 ? undefined : voiceEnd), () => nVoice++); // the Phase 5 figure as Phase 5 computed it (its start is the first mention of the heading), ended where Phase 6's section begins; the Phase 6 cites are counted in its own block
  stats.noteCites6 = nNotes6;
  const uniq = [...new Set(bad)];
  stats.noteCites = { notes: nNotes, voice: nVoice };
  check("K10", "every source cite in a note and in the Voice section (File.tsx:123 or File.tsx:123-130) names one file, and its line is inside it", uniq.length === 0, uniq.length ? `\n        ${list(uniq, 20)}` : `${nNotes} cites in notes and ${nVoice} in the Voice section resolve to one file and a line inside it`);
}

// K11: the guide's own examples hold to C16 like any string (the seventh review's X2). Every row that a voice attribute's in-range sample or a tone-map sample quotes
// is one of three things: VERIFIED (a cite shows the code that makes what the sample says true), declared to CLAIM NOTHING about the product (an instruction, or the
// name of a control), or true only once a HAND-OFF step is taken (a cite shows the gap, and the Voice section states the step). The list is exactly the rows the
// samples quote: a quoted row in none of the three fails, and so does an entry nothing quotes, a cite that does not resolve, and a step the section does not state.
{
  const bad = [];
  const cov = JSON.parse(fs.readFileSync(path.join(HERE, "rule-coverage.json"), "utf8"));
  const exRows = new Map();
  for (const q of xExamples) if (/^(?:[A-Z]{1,3}-\d+|CP|DS|EM|SR-\d+)\.\d+$/.test(String(q.id))) { if (!exRows.has(q.id)) exRows.set(q.id, []); exRows.get(q.id).push(q.S); }
  const have = cov.examples?.rows || {};
  const handT = sect("Hand-offs"); // the step is read here, not in the whole section: the coverage table below repeats every step it lists
  for (const [id, quotes] of exRows) if (!have[id]) bad.push(`${id} is quoted by a sample (${JSON.stringify(quotes[0]).slice(0, 60)}) and is neither verified, declared to claim nothing, nor waiting on a hand-off step`);
  for (const [id, e] of Object.entries(have)) {
    if (!exRows.has(id)) { bad.push(`${id} is listed, but no sample quotes it any more`); continue; }
    const cites = citesIn(e.cite || ""), badCite = cites.find((c) => c.error);
    if (e.kind === "nonClaim") { if (String(e.why || "").length < 20) bad.push(`${id} is declared to claim nothing, without a reason`); continue; }
    if (e.kind !== "verified" && e.kind !== "handoff") { bad.push(`${id} is of kind "${e.kind}": it must be verified, nonClaim or handoff`); continue; }
    if (String(e.says || "").length < 12) bad.push(`${id} does not say what the sample claims`);
    if (!cites.length) bad.push(`${id} is ${e.kind} without a cite`); else if (badCite) bad.push(`${id}: ${badCite.error}`);
    if (e.kind === "handoff" && (!e.needs || !handT.includes(e.needs))) bad.push(`${id} is true only once a hand-off step is taken, and the Voice section's hand-offs do not say: ${String(e.needs).slice(0, 70)}`);
    if (e.kind === "verified" && e.needs) bad.push(`${id} is verified, so it needs no hand-off step`);
  }
  const by = (k) => Object.values(have).filter((e) => e.kind === k).length;
  stats.exampleRows = { rows: exRows.size, verified: by("verified"), nonClaim: by("nonClaim"), handoff: by("handoff") };
  check("K11", "every row that a voice sample or a tone-map sample quotes holds to C16: verified against the code (a cite that resolves), declared to claim nothing about the product, or true only once a hand-off step that the Voice section's hand-offs state is taken; the list is exactly the rows the samples quote", bad.length === 0, bad.length ? `\n        ${list(bad, 20)}` : `${exRows.size} rows quoted by the samples: ${by("verified")} verified, ${by("nonClaim")} claim nothing, ${by("handoff")} wait on a hand-off step`);
}

// ---------------------------------------------------------------- 7b. Phase 6 (Data surfaces): the chart rows
// The rows of revisions/09-data-surfaces.json (`phase: 6`) are linted with the Phase 5 lints and kept out of every Phase 5 count; their place in the two documents is their
// own: a `Copy (Phase 6)` bullet under `copy:P6-<page>` markers after the entry's Phase 5 block, and a table under "Rows appended by later phases" below the sentence Phase 5 left.
{
  const bad1 = [];
  for (const r of rows6) {
    for (const h of lintString(r.new, r.kind, r.x)) bad1.push(`${r.id}: ${h}`);
    for (const c of r.rules) if (!RULES[c]) bad1.push(`${r.id}: unknown rule ${c}`);
    if (r.kind === "error") bad1.push(`${r.id}: Phase 6 adds no error message`);
  }
  check("Q1", "every Phase 6 string passes the Phase 5 lints (case, marks, terms, person, plurals, dates) and cites rules that exist", bad1.length === 0, bad1.length ? `\n        ${list(bad1)}` : `${rows6.length} strings in ${groups6.length} groups`);
  const bad2 = [];
  for (const r of rows6) {
    if (!r.anchors.length) bad2.push(`${r.id}: no anchor`);
    for (const a of r.anchors) if (a.at) { const c = citesIn(a.at); if (!c.length || c.some((x) => x.error)) bad2.push(`${r.id}: the anchor "${a.at.slice(0, 70)}" names no file and line that exists`); }
    if (r.old && !r.anchors.some((a) => a.file)) bad2.push(`${r.id}: an old string with no source anchor`);
  }
  check("Q2", "every Phase 6 row is anchored: a changed string at the source line that holds it, a new string at the file and line it will be drawn at", bad2.length === 0, bad2.length ? `\n        ${list(bad2)}` : `${rows6.filter((r) => r.anchors.some((a) => a.file)).length} source-anchored, ${rows6.filter((r) => r.anchors.some((a) => a.at)).length} new strings anchored to a file and line`);
  const bad3 = [];
  for (const g of groups6) {
    const a = journey.indexOf(`<!-- copy:${g.id}:start -->`), b = journey.indexOf(`<!-- copy:${g.id}:end -->`);
    if (a < 0 || b < a) { bad3.push(`${g.id}: no Copy (Phase 6) block`); continue; }
    const block = journey.slice(a, b);
    if (!/\*\*Copy \(Phase 6\):\*\*/.test(block)) bad3.push(`${g.id}: no Copy (Phase 6) bullet`);
    for (const r of g.rowsResolved.filter((x) => !x.keep)) if (!block.includes(`\`${r.id}\``)) bad3.push(`${g.id}: ${r.id} missing from its bullet`);
    const pEnd = journey.indexOf(`<!-- copy:${g.page}:end -->`);
    if (pEnd < 0 || pEnd > a) bad3.push(`${g.id}: its block does not follow ${g.page}'s Phase 5 block`);
  }
  const aa = journey.indexOf("<!-- copy:appended:start -->"), ab = journey.indexOf("<!-- copy:appended:end -->");
  const appendedText = aa >= 0 && ab > aa ? journey.slice(aa, ab) : "";
  const appendedIds = [...appendedText.matchAll(/^\| `(P6-[A-Za-z0-9-]+\.\d+)` \|/gm)].map((m) => m[1]);
  const want6 = rows6.map((r) => r.id);
  const miss6 = want6.filter((i) => !appendedIds.includes(i)), extra6 = appendedIds.filter((i) => !want6.includes(i));
  if (!appendedText.includes("Later phases append their rows here, in the same columns")) bad3.push("the sentence Phase 5 left in the appended block is gone");
  if (miss6.length) bad3.push(`missing from the appended table: ${miss6.slice(0, 6).join(", ")}`);
  if (extra6.length || appendedIds.length !== want6.length) bad3.push(`extra or repeated in the appended table: ${extra6.slice(0, 6).join(", ")}`);
  check("Q3", "every Phase 6 row is in its page's Copy (Phase 6) bullet, which follows the entry's Phase 5 block, and once in the table under \"Rows appended by later phases\", below the sentence Phase 5 left", bad3.length === 0, bad3.length ? `\n        ${list(bad3)}` : `${appendedIds.length} appended rows, ${groups6.length} bullets`);
  const bad4 = [];
  const want4 = { 50: /^\d{1,2} [A-Z][a-z]{2}$/, 80: /^\d{1,2} [A-Z][a-z]{2}$/, 85: /^\d{2}:\d{2}$/, 91: /^\d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}$/ };
  for (const [ln, re] of Object.entries(want4)) {
    const row = rows6.find((r) => r.kind === "format" && r.anchors.some((a) => a.file === "src/components/Analytics/chartXAxis.ts" && a.lines.includes(Number(ln))));
    if (!row) { bad4.push(`chartXAxis.ts:${ln}: no format row`); continue; }
    if (!re.test(row.new)) bad4.push(`${row.id}: "${row.new}" is not the C3 form for chartXAxis.ts:${ln}`);
    if (!/en-US/.test(row.old)) bad4.push(`${row.id}: its Old is not the en-US call`);
  }
  const n4 = rows6.filter((r) => r.anchors.some((a) => a.file === "src/components/Analytics/chartXAxis.ts")).length;
  if (n4 !== 4) bad4.push(`${n4} rows anchored in chartXAxis.ts, expected 4`);
  check("Q4", "the four explicit en-US display calls of chartXAxis.ts (:50, :80, :85, :91) each have a Phase 6 format row whose New is the C3 form (D MMM for a date tick, HH:mm for an hour, D MMM YYYY, HH:mm for the tooltip)", bad4.length === 0, bad4.length ? `\n        ${list(bad4)}` : "4 of 4 sites, 4 rows");
  const bad5 = [];
  const CHARTS = [["P6-A-03", "StandaloneUserActivity.tsx", 2], ["P6-A-03", "StandaloneDailySessions.tsx", 2], ["P6-A-03", "StandaloneTopActions.tsx", 1], ["P6-A-03", "StandaloneUserDuration.tsx", 1], ["P6-A-03", "StandaloneUserEngine.tsx", 1], ["P6-A-18", "IntentsPanel.tsx", 2], ["P6-A-18", "TopicsPanel.tsx", 2]];
  const sums = rows6.filter((r) => r.sum);
  for (const [g, file, n] of CHARTS) { const have = sums.filter((r) => r.group === g && r.anchors.some((a) => a.at && a.at.includes(file))).length; if (have !== n) bad5.push(`${file}: ${have} summaries, expected ${n}`); }
  const CLAIM = /\b(improv|better|worse|trend|grow|declin|increas|decreas|healthy|engag|popular|success)\w*/i;
  for (const r of sums) {
    if (!/\{[a-zA-Z]+: count [a-z ]+\}/.test(r.new.split(";")[0])) bad5.push(`${r.id}: no count helper in the first clause (the key figure first)`);
    if (r.group === "P6-A-03" && !r.new.includes("{range}")) bad5.push(`${r.id}: the period is not stated`);
    if (!/\.$/.test(r.new)) bad5.push(`${r.id}: no full stop`);
    if (CLAIM.test(r.new)) bad5.push(`${r.id}: a claim word the counts cannot back: ${r.new.match(CLAIM)[0]}`);
    if (r.kind !== "body") bad5.push(`${r.id}: a summary is a body row`);
  }
  if (sums.length !== CHARTS.reduce((n, c) => n + c[2], 0)) bad5.push(`${sums.length} summaries in all`);
  check("Q5", "every chart has a text summary row (the nine charts, in each reading they have): a sentence with the key figure first, the period or the scope stated and no claim the counts cannot back", bad5.length === 0, bad5.length ? `\n        ${list(bad5)}` : `${sums.length} summaries for ${CHARTS.length} charts`);
  const p5Index = [...(indexText || "").matchAll(/^\| `([A-Za-z0-9-]+\.\d+)` \|/gm)].map((m) => m[1]).filter((id) => id.startsWith("P6-") && !appendedIds.includes(id));
  check("Q6", "no Phase 6 row is counted among the Phase 5 rows, and none sits in the Phase 5 index table", rows.every((r) => !r.phase6) && p5Index.length === 0, p5Index.length ? `in the Phase 5 table: ${p5Index.slice(0, 5).join(", ")}` : `${rows.length} Phase 5 rows, ${rows6.length} Phase 6 rows`);
  stats.phase6 = { rows: rows6.length, groups: groups6.length, summaries: sums.length, sourceAnchored: rows6.filter((r) => r.anchors.some((a) => a.file)).length, newText: rows6.filter((r) => !r.old).length };
}

// ---------------------------------------------------------------- 8. the lock
// The lock is Phase 5's: the ways DESIGN.md and JOURNEY.md may differ from what Phase 4 left. So the diff is read against the commit before Phase 5 (aed7b42, "address Phase 4 review
// minor findings"), not against HEAD. HEAD holds Phase 5 since it was committed (b5a9cf9), so a diff against it shows no change at all, and after a later phase it would show that
// phase's. A later phase that only appends to the two documents leaves these checks as they are. Only the lock reads git: every other check reads the working tree.
const LOCK_BASE = "aed7b4291518fff1f54237ba6e49fafc267641c3";
function git(...args) { try { return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return null; } }
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const dDiff = git("diff", "-U0", LOCK_BASE, "--", rel(DESIGN_MD));
if (dDiff === null) check("L1", "DESIGN.md: only the Companion's text-twin cells changed, and the new section was appended", false, "git diff against the commit before Phase 5 (aed7b42) is unavailable: is that commit in this clone?");
else {
  const headText = git("show", `${LOCK_BASE}:${rel(DESIGN_MD)}`) || "";
  const oldLines = headText.split("\n").length - (headText.endsWith("\n") ? 1 : 0);
  const bad = []; let appended = 0, cellEdits = 0, principleEdits = 0, draftEdits = 0, handoffEdits = 0, introEdits = 0, tableIntroEdits = 0;
  // the Companion state table's intro paragraph said the twins are drafts; the seventh review asked for the final form (one sentence, the coordinator recorded it)
  const TW_OLD = "Text twins are **drafts**: Phase 5 revises them in place (plan carve-out 1) and every change lands in the revision index.";
  const TW_NEW = "Text twins are final: Phase 5 revised them in place (plan carve-out 1); every change is in the revision index.";
  const I4_OLD = "ai-native (calibrate; every state has a text twin; the canon gap is marked)";
  const I4_NEW = "ai-native (calibrate; every state that conveys information has a text twin; the canon gap is marked)";
  const H5_OLD = ["(drafts); the welcome frame's line; the offline line and the pending row's static \"Paused: no connection.\";"];
  const H5_NEW = ["(drafts when handed over, final since Phase 5); the welcome frame's line; the offline line and the pending row's static text (handed over as \"Paused: no connection.\", now \"Paused while you're offline\");"];
  const P4_OLD = "Every state has a text twin (the table's last column)";
  const P4_NEW = "Every state that conveys information has a text twin (the table's last column; `peek`, `retract` and `idle` convey nothing, so their twin is \"none\")";
  const hunks = dDiff.split(/^@@ /m).slice(1);
  for (const h of hunks) {
    const m = h.match(/^-(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    const oStart = +m[1], oCount = m[2] === undefined ? 1 : +m[2];
    const body = h.split("\n").slice(1);
    const removed = body.filter((l) => l.startsWith("-")).map((l) => l.slice(1)), added = body.filter((l) => l.startsWith("+")).map((l) => l.slice(1));
    if (oCount === 0 && oStart >= oldLines) { appended += added.length; if (removed.length) bad.push("removal in an append hunk"); continue; }
    // (a later phase's append is counted by its own lock check, L4, and taken off the Phase 5 figure below)
    if (removed.length === added.length && removed.length > 0) {
      removed.forEach((o, i) => {
        // the two one-line edits the fix round allows outside the twin column: principle 4 and the line that called the twins drafts
        if (/^4\. \*\*Never the only signal\*\*/.test(o)) { if (added[i].replace(P4_NEW, P4_OLD) === o) principleEdits++; else bad.push(`hunk at line ${oStart}: principle 4 changed beyond its wording`); return; }
        if (/^\*\*Phase 4 \(2026-10-17\), appended under the lock;/.test(o)) { if (added[i].replace(I4_NEW, I4_OLD) === o) introEdits++; else bad.push(`hunk at line ${oStart}: the Phase 4 intro changed beyond one phrase`); return; }
        if (/^- \*\*Phase 5 \(Words\):\*\* the text twins in the state table \(drafts\)/.test(o)) { if (added[i].replace(H5_NEW[0], H5_OLD[0]) === o) handoffEdits++; else bad.push(`hunk at line ${oStart}: the Phase 5 hand-off changed beyond its draft wording`); return; }
        if (/^Timeline: a 24 Hz clock; a drawing may occupy several ticks/.test(o)) { if (added[i].replace(TW_NEW, TW_OLD) === o) tableIntroEdits++; else bad.push(`hunk at line ${oStart}: the state-table intro changed beyond its one sentence`); return; }
        if (/^- \*\*Text twins are drafts:\*\*/.test(o)) { if (/^- \*\*Text twins are final:\*\*/.test(added[i])) draftEdits++; else bad.push(`hunk at line ${oStart}: the drafts line changed beyond its wording`); return; }
        const oc = o.split(" | "), nc = added[i].split(" | ");
        const inTable = /^\| `(peek|retract|walk|speaking|hop|wave|error|offline|idle)` /.test(o) || /^\| State \| Moment/.test(o);
        if (!inTable || oc.length !== nc.length || oc.slice(0, -1).some((c, k) => c !== nc[k])) bad.push(`hunk at line ${oStart}: not a twin-cell edit`);
        else cellEdits++;
      });
      continue;
    }
    bad.push(`hunk at line ${oStart}: ${removed.length} removed, ${added.length} added`);
  }
  check("L1", "DESIGN.md: only the Companion's text-twin cells, principle 4, the drafts line, the state-table intro's one sentence, the hand-off's draft wording and the intro's one phrase changed, and the new section was appended", bad.length === 0 && appended > 0 && principleEdits === 1 && draftEdits === 1 && handoffEdits === 1 && introEdits === 1 && tableIntroEdits === 1, bad.length ? list(bad) : `${cellEdits} twin lines edited (last cell only), principle 4 (${principleEdits}), the drafts line (${draftEdits}), the state-table intro's one sentence (${tableIntroEdits}), the hand-off's two draft words (${handoffEdits}) and the intro's one phrase (${introEdits}) reworded, ${appended} lines appended`);
  const appendedSince6 = (() => { const d6 = git("diff", "-U0", "bd45ade6238f3747ab98f3c15d6208d169411e54", "--", rel(DESIGN_MD)); if (d6 === null) return 0; const t6 = git("show", `bd45ade6238f3747ab98f3c15d6208d169411e54:${rel(DESIGN_MD)}`) || ""; const n6 = t6.split("\n").length - (t6.endsWith("\n") ? 1 : 0); let n = 0; for (const h of d6.split(/^@@ /m).slice(1)) { const m = h.match(/^-(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/); if (+m[1] >= n6 && (m[2] === undefined ? 1 : +m[2]) === 0) n += h.split("\n").slice(1).filter((l) => l.startsWith("+")).length; } return n; })();
  stats.designDiff = { twinLinesEdited: cellEdits, principleEdits, draftEdits, tableIntroEdits, handoffEdits, introEdits, linesAppended: appended - appendedSince6 }; // Phase 5's own append: what Phase 6 appended after it (L4) is taken off
}
const jDiff = git("diff", "-U0", LOCK_BASE, "--", rel(JOURNEY_MD));
if (jDiff === null) check("L2", "JOURNEY.md: insertions only, apart from the intro line and the SR-6 Companion bullet's draft strings", false, "git diff against the commit before Phase 5 (aed7b42) is unavailable: is that commit in this clone?");
else {
  const dl = jDiff.split("\n");
  const removed = dl.filter((l) => l.startsWith("-") && !l.startsWith("---")).map((l) => l.slice(1));
  const added = dl.filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
  const intro = removed.filter((l) => /^This file records the interface \*\*as it is today\*\*/.test(l));
  // the SR-6 Companion (Phase 4) bullet quoted one draft string; the final one replaces it and nothing else changes
  const sr6Old = removed.filter((l) => /^- \*\*Companion \(Phase 4\):\*\* \(1\) \*\*Tutor avatar\*\*/.test(l));
  const sr6New = added.filter((l) => /^- \*\*Companion \(Phase 4\):\*\* \(1\) \*\*Tutor avatar\*\*/.test(l));
  const DRAFT = '"Paused: no connection.", a Phase 5 draft', FINAL = '"Paused while you\'re offline" (final, Phase 5)';
  const sr6ok = sr6Old.length === 1 && sr6New.length === 1 && sr6New[0].replace(FINAL, DRAFT) === sr6Old[0];
  const other = removed.filter((l) => !intro.includes(l) && !sr6Old.includes(l));
  check("L2", "JOURNEY.md: insertions only, apart from the one intro paragraph that gains a sentence and the SR-6 Companion bullet's draft string, replaced by the final one", other.length === 0 && sr6ok, other.map((l) => l.slice(0, 80)).join(" / ") || (sr6ok ? `${removed.length} lines replaced (the intro paragraph, the SR-6 bullet), ${added.length - 2} lines added` : "the SR-6 bullet changed beyond its draft string"));
}
// L3 reads the working tree against the same base: a file under the three paths that differs from what Phase 4 left, committed, staged, unstaged or untracked, fails it
const protectedChanged = git("diff", "--name-only", LOCK_BASE, "--", "kiwi-ui/src", "kiwi-ui/public", "kiwi");
const protectedNew = git("ls-files", "--others", "--exclude-standard", "--", "kiwi-ui/src", "kiwi-ui/public", "kiwi");
check("L3", "nothing under kiwi-ui/src, kiwi-ui/public or kiwi/ differs from the commit before Phase 5 (committed, staged, unstaged or untracked)", protectedChanged !== null && protectedNew !== null && protectedChanged.trim() === "" && protectedNew.trim() === "", `${protectedChanged || ""} ${protectedNew || ""}`.trim().slice(0, 200));
// Phase 6 (Data surfaces) extends the lock and changes nothing in L1 to L3. Against the commit before Phase 6 (bd45ade, "address Phase 5 review minor findings"): DESIGN.md may only
// grow at its end (`## Chart tokens`, whose generated Phase 6 evidence block lives inside it, so no Phase 5 line is rewritten), JOURNEY.md may only gain lines (the data-surface
// bullets, the Copy (Phase 6) bullets and the appended rows), and the three protected paths must not differ at all.
const LOCK_BASE_6 = "bd45ade6238f3747ab98f3c15d6208d169411e54";
const dDiff6 = git("diff", "-U0", LOCK_BASE_6, "--", rel(DESIGN_MD));
if (dDiff6 === null) check("L4", "DESIGN.md: only appended since the commit before Phase 6", false, "git diff against the commit before Phase 6 (bd45ade) is unavailable: is that commit in this clone?");
else {
  const headText6 = git("show", `${LOCK_BASE_6}:${rel(DESIGN_MD)}`) || "";
  const oldLines6 = headText6.split("\n").length - (headText6.endsWith("\n") ? 1 : 0);
  const bad6 = []; let appended6 = 0;
  for (const h of dDiff6.split(/^@@ /m).slice(1)) {
    const m = h.match(/^-(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    const oStart = +m[1], oCount = m[2] === undefined ? 1 : +m[2];
    const body = h.split("\n").slice(1);
    const removed = body.filter((l) => l.startsWith("-")).length, added = body.filter((l) => l.startsWith("+")).length;
    if (oCount === 0 && oStart >= oldLines6 && removed === 0) appended6 += added; else bad6.push(`hunk at line ${oStart}: ${removed} removed, ${added} added, not an append`);
  }
  check("L4", "DESIGN.md: since the commit before Phase 6 (bd45ade) the file only grew at its end (## Chart tokens), and no earlier line changed", bad6.length === 0 && appended6 > 0, bad6.length ? list(bad6) : `${appended6} lines appended, nothing else`);
  stats.designDiff6 = { linesAppended: appended6 };
}
const jDiff6 = git("diff", "-U0", LOCK_BASE_6, "--", rel(JOURNEY_MD));
if (jDiff6 === null) check("L5", "JOURNEY.md: insertions only since the commit before Phase 6", false, "git diff against the commit before Phase 6 (bd45ade) is unavailable: is that commit in this clone?");
else {
  const dl6 = jDiff6.split("\n");
  const removed6 = dl6.filter((l) => l.startsWith("-") && !l.startsWith("---")).map((l) => l.slice(1));
  const added6 = dl6.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
  check("L5", "JOURNEY.md: since the commit before Phase 6 (bd45ade) the file only gained lines (the data-surface bullets, the Copy (Phase 6) bullets, the appended rows); none was changed or removed", removed6.length === 0, removed6.length ? removed6.map((l) => l.slice(0, 80)).join(" / ") : `${added6} lines added, none removed`);
  stats.journeyDiff6 = { added: added6, removed: removed6.length };
}
const protectedChanged6 = git("diff", "--name-only", LOCK_BASE_6, "--", "kiwi-ui/src", "kiwi-ui/public", "kiwi");
check("L6", "nothing under kiwi-ui/src, kiwi-ui/public or kiwi/ differs from the commit before Phase 6 (committed, staged, unstaged or untracked)", protectedChanged6 !== null && protectedNew !== null && protectedChanged6.trim() === "" && protectedNew.trim() === "", `${protectedChanged6 || ""} ${protectedNew || ""}`.trim().slice(0, 200));

// ---------------------------------------------------------------- 9. paths
const pathRe = /(\/Users\/|\/private\/|\/home\/[a-z]|[A-Z]:\\\\|\/tmp\/claude)/;
const pathHits = [];
for (const f of fs.readdirSync(HERE).filter((x) => /\.(mjs|json)$/.test(x)).map((x) => path.join(HERE, x)).concat(fs.readdirSync(path.join(HERE, "revisions")).map((x) => path.join(HERE, "revisions", x)))) {
  fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (pathRe.test(l)) pathHits.push(`${path.basename(f)}:${i + 1}`); });
}
for (const [name, text] of [["DESIGN.md (new section)", voice], ["JOURNEY.md (generated blocks)", journey.split("\n").filter((l) => /copy:|`[A-Z]+(-\d+)?\.\d+`/.test(l)).join("\n")]]) if (pathRe.test(text)) pathHits.push(name);
check("P1", "no machine-specific path in the scripts, the data or the generated text", pathHits.length === 0, pathHits.join(", "));
// P2: no security detail in a committed file (the ninth review's MAJ-2). The plan's Decision Log rule is that security findings stay out of committed files until they are fixed,
// and the repository is public. A private, git-ignored list of phrases, `.design-foundations/build/security-phrases.txt`, holds the phrases of security detail that no committed file may
// carry; this check fails if a committed path (kiwi-ui/DESIGN.md, kiwi-ui/JOURNEY.md, everything under .design-foundations/copy/) contains one, case aside. The list is not in
// the repository, so the checker never contains the phrases itself, and where the list is absent the check is skipped with a notice. A failure names the file, the line and the
// phrase's number in the list, never the phrase, so that a failing run does not write it into a generated file.
{
  const listFile = path.join(ROOT, ".design-foundations", "build", "security-phrases.txt");
  if (!fs.existsSync(listFile)) {
    check("P2", "no phrase of the private security list is in a committed file (DESIGN.md, JOURNEY.md, .design-foundations/copy/**)", true, "skipped: the private phrase list is not here (.design-foundations/build/security-phrases.txt is git-ignored and exists only where the security notes are kept)");
    stats.securityPhrases = { skipped: true };
  } else {
    const phrases = fs.readFileSync(listFile, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => l.toLowerCase());
    const files = [DESIGN_MD, JOURNEY_MD];
    (function walkCopy(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walkCopy(p); else files.push(p); } })(HERE);
    const hits = [];
    for (const f of files) fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { const low = l.toLowerCase(); phrases.forEach((ph, k) => { if (low.includes(ph)) hits.push(`${path.relative(ROOT, f).split(path.sep).join("/")}:${i + 1} contains phrase #${k + 1} of the private list`); }); });
    stats.securityPhrases = { skipped: false, phrases: phrases.length, files: files.length };
    check("P2", "no phrase of the private security list is in a committed file (DESIGN.md, JOURNEY.md, .design-foundations/copy/**)", hits.length === 0 && phrases.length > 0, hits.length ? `\n        ${list(hits, 20)}` : phrases.length ? `${phrases.length} phrases read from the private list; none is in the ${files.length} committed files` : "the private list holds no phrase");
  }
}

// R1: the rule-coverage table (the sixth review's audit). Every written rule (C1 to C18), every item of § Errors, every row of § Dates, times and numbers, every
// kind of § Step labels and every row of the terminology table has an entry in rule-coverage.json: a lint that runs over the strings, with the planted defects
// (proofs.mjs) that prove it fails, or a statement of what a lint cannot see, with the rows read by hand and the result. This check fails on a rule, an item or a row
// with no entry; on a lint that names no check that exists, or a proof that does not exist, was not caught, or plants into another corpus than the lint claims;
// on an AUDIT lint no rule claims or no unit proof names; on a proof summary written for other code; on a hand-checked sample whose population has changed since it
// was read; and on a coverage table in DESIGN.md that is not what the data says.
const coverageBlockText = (cov, counts) => {
  const over = { new: "new", kept: "kept", source: "source", code: "code", data: "data", guide: "guide", examples: "examples" };
  const lintCell = (ls) => ls.map((l) => `${l.check}${l.over ? ` (${over[l.over]})` : ""}`).join(", ");
  const cell = (t) => String(t).replace(/\|/g, "\\|").replace(/\n/g, " ");
  const out = [];
  out.push(`Read from \`.design-foundations/copy/rule-coverage.json\` and \`generated/proof-summary.json\` at assembly time, never typed. A **lint** is a check that runs over strings (\`over\`: **new** every New string, **kept** every kept string and every source string no row touches, **source** every string in the source, **examples** the guide's own examples, **code** the source code the checks read, **data** the revision data, **guide** this text); a **planted defect** is a string or an edit that breaks the rule, put into a throwaway copy by \`prove-checks.mjs\`, and the lint is proved only when the run reports it caught (${counts.unit} unit proofs, ${counts.controls} of them controls that must stay quiet, and ${counts.e2e} end-to-end proofs, ${counts.e2eControls} of them a control that must stay quiet, all behaving as planted). What no lint can see is checked by hand: the rows read, and the result.`);
  out.push("");
  out.push("| Rule | Lints that run over the strings | Planted defects | Checked by hand |", "|---|---|---|---|");
  for (const [id, r] of Object.entries(cov.rules)) {
    const audit = r.audit.length ? `; the audit's own: ${r.audit.join(", ")}` : "";
    const man = r.manual ? `${r.manual.rows} rows read: ${cell(r.manual.result)}` : "nothing a lint cannot see";
    out.push(`| \`${id}\` ${r.name} | ${lintCell(r.lints)}${audit} | ${counts.unitBy[id] || 0} unit, ${counts.e2eBy[id] || 0} end to end | ${man} |`);
  }
  out.push("");
  const secTable = (title, key) => {
    out.push(`**${title}.**`, "", "| Item | Lints | Checked by hand |", "|---|---|---|");
    for (const [name, it] of Object.entries(cov.sections[key].items)) out.push(`| ${cell(name)} | ${lintCell(it.lints)}${it.note ? ` (${cell(it.note)})` : ""} | ${it.manual ? `${it.manual.rows} rows read: ${cell(it.manual.result)}` : "nothing a lint cannot see"} |`);
    out.push("");
  };
  secTable("§ Errors", "errors"); secTable("§ Dates, times and numbers", "dates"); secTable("§ Step labels", "stepLabels"); secTable("The terminology table", "terminology");
  // the guide's own examples (K11): each row a voice or tone-map sample quotes, and what makes the sample true
  const ex = Object.entries(cov.examples?.rows || {});
  const holds = (e) => e.kind === "nonClaim" ? cell(e.why) : `${e.kind === "handoff" ? "waits on a hand-off step (" + cell(e.needs) + "); the gap: " : "verified: "}${cell(e.cite)}`;
  out.push("**The guide's own examples (K11).** Every row that a voice attribute's in-range sample or a tone-map sample quotes holds to C16 like any string: verified against the code, declared to claim nothing about the product, or true only once a hand-off step is taken.", "", "| Row | The sample says | It holds because |", "|---|---|---|");
  for (const [id, e] of ex) out.push(`| \`${id}\` | ${e.kind === "nonClaim" ? "nothing about the product" : cell(e.says)} | ${holds(e)} |`);
  out.push("");
  return out.join("\n").replace(/\n+$/, "");
};
{
  const bad = [];
  const cov = JSON.parse(fs.readFileSync(path.join(HERE, "rule-coverage.json"), "utf8"));
  const sumPath = path.join(OUT_DIR, "proof-summary.json");
  const summary = fs.existsSync(sumPath) ? JSON.parse(fs.readFileSync(sumPath, "utf8")) : null;
  const caught = new Map();
  if (!summary) bad.push("generated/proof-summary.json is missing: run node .design-foundations/copy/prove-checks.mjs");
  else {
    if (summary.codeHash !== codeHash()) bad.push(`generated/proof-summary.json was written for other code (${summary.codeHash}, the code is now ${codeHash()}): run prove-checks.mjs again`);
    for (const c of summary.unit.cases) caught.set(c.id, c.ok);
    for (const c of summary.e2e.cases) caught.set(c.id, c.ok);
    if (!summary.e2e.baselineClean) bad.push("the proof run's copy was not clean before a defect was planted");
  }
  const unitById = new Map(UNIT.map((c) => [c.id, c])), e2eById = new Map(E2E.map((p) => [p.id, p]));
  if (summary) for (const id of [...unitById.keys(), ...e2eById.keys()]) if (caught.get(id) !== true) bad.push(`proof ${id} ${caught.has(id) ? "was missed" : "has no record in the proof summary"}`);
  const checkIds = new Set(report.map((r) => r.id));
  const verifyLint = (where, l, note) => {
    if (!checkIds.has(l.check)) bad.push(`${where}: ${l.check} is not a check`);
    if (!(l.proofs || []).length && !note) bad.push(`${where}: ${l.check} names no planted defect and gives no reason`);
    for (const id of l.proofs || []) {
      const e = e2eById.get(id), u2 = unitById.get(id);
      if (!e && !u2) { bad.push(`${where}: proof ${id} does not exist`); continue; }
      if (e && e.expect !== l.check) bad.push(`${where}: proof ${id} expects ${e.expect}, not ${l.check}`);
      if (e && l.over && e.corpus !== l.over) bad.push(`${where}: proof ${id} plants into ${e.corpus}, but the lint claims ${l.over}`);
      if (u2 && u2.expect === null) bad.push(`${where}: ${id} is a control, not a defect`);
    }
  };
  const verifyManual = (where, m) => {
    if (!m.what || !m.result || !m.population) { bad.push(`${where}: a hand-checked entry needs what, population and result`); return; }
    const n = manualPopulation(rows, m.population).length;
    if (!n) bad.push(`${where}: the population of its sample is empty`);
    if (m.rows !== n) bad.push(`${where}: read from ${m.rows} rows, the data now has ${n}: read them again and update rows`);
  };
  // the rules
  const ruleKeys = Object.keys(RULES);
  for (const k of ruleKeys) if (!cov.rules[k]) bad.push(`rule ${k} has no coverage entry`);
  for (const k of Object.keys(cov.rules)) if (!RULES[k]) bad.push(`coverage entry ${k} is not a rule`);
  const auditClaimed = new Map();
  for (const [id, r] of Object.entries(cov.rules)) {
    if (!(r.lints || []).length) bad.push(`${id}: no lint`);
    for (const l of r.lints || []) verifyLint(id, l);
    if (!UNIT.some((c) => c.rule === id && c.expect !== null)) bad.push(`${id}: no unit proof`);
    for (const a of r.audit || []) { auditClaimed.set(a, (auditClaimed.get(a) || 0) + 1); const entry = AUDIT.find((x) => x.id === a); if (!entry) bad.push(`${id}: audit lint ${a} does not exist`); else if (entry.rule !== id && !(id === "C6" && a === "C6-A")) bad.push(`${id}: audit lint ${a} belongs to ${entry.rule}`); }
    if (r.manual) verifyManual(id, r.manual);
  }
  for (const a of AUDIT) {
    if (auditClaimed.get(a.id) !== 1) bad.push(`audit lint ${a.id} is claimed by ${auditClaimed.get(a.id) || 0} rules, not one`);
    if (!UNIT.some((c) => c.audit === a.id)) bad.push(`audit lint ${a.id} has no unit proof that names it`);
  }
  // the wiring: the four corpora each have a proof
  for (const [corpus, w] of Object.entries(cov.wiring || {})) verifyLint(`wiring ${corpus}`, { check: w.check, proofs: w.proofs, over: corpus === "examples" ? "examples" : corpus });
  for (const c of ["new", "kept", "source", "examples"]) if (!(cov.wiring || {})[c]) bad.push(`the ${c} corpus has no wiring proof`);
  // the sections: the entries are exactly the items the guide writes
  const norm = (x) => String(x).replace(/[`*]/g, "").trim();
  const sectionItems = (key, wanted) => {
    const have = Object.keys(cov.sections[key].items);
    for (const w of wanted) if (!have.some((h) => norm(w) === norm(h) || norm(w).startsWith(norm(h)))) bad.push(`${key}: "${norm(w).slice(0, 60)}" has no coverage entry`);
    for (const h of have) if (!wanted.some((w) => norm(w) === norm(h) || norm(w).startsWith(norm(h)))) bad.push(`${key}: the entry "${norm(h).slice(0, 60)}" matches nothing in the guide`);
    for (const [name, it] of Object.entries(cov.sections[key].items)) { for (const l of it.lints || []) verifyLint(`${key} › ${name}`, l, it.note); if (it.manual) verifyManual(`${key} › ${name}`, it.manual); if (!(it.lints || []).length && !it.manual) bad.push(`${key} › ${name}: neither a lint nor a hand-checked sample`); }
    return wanted.length;
  };
  const errT = sect("Errors"), dateT2 = sect("Dates, times and numbers"), stepT = sect("Step labels"), termT2 = sect("Terminology");
  const nErr = sectionItems("errors", [...errT.matchAll(/^\*\*([^*]+?)\*\*/gm)].map((m) => m[1].replace(/\.$/, "") + (/\.\*\*/.test(m[0]) ? "." : "")));
  const firstTable = (t, head) => { const lines = t.split("\n"); const i = lines.findIndex((l) => l.startsWith(head)); if (i < 0) return []; const out2 = []; for (let j = i + 2; j < lines.length && lines[j].startsWith("|"); j++) out2.push(lines[j].split("|")[1].trim()); return out2; };
  const nDates = sectionItems("dates", firstTable(dateT2, "| What | Format |"));
  const nStep = sectionItems("stepLabels", firstTable(stepT, "| Moment or kind |"));
  const nTerm = sectionItems("terminology", firstTable(termT2, "| Say | Not |"));
  // the table in DESIGN.md is the data, written out
  const counts = { unit: UNIT.length, controls: UNIT.filter((c) => c.expect === null).length, e2e: E2E.length, e2eControls: E2E.filter((p) => p.expect.startsWith("!")).length, unitBy: {}, e2eBy: {} };
  for (const c of UNIT) counts.unitBy[c.rule] = (counts.unitBy[c.rule] || 0) + 1;
  for (const p of E2E) counts.e2eBy[p.rule] = (counts.e2eBy[p.rule] || 0) + 1;
  const withRows = (m) => m;
  const block = coverageBlockText(cov, counts);
  const have = (design.match(/<!-- copy:coverage:start -->\n([\s\S]*?)\n<!-- copy:coverage:end -->/) || [])[1];
  if (have === undefined) bad.push("DESIGN.md has no copy:coverage block: run check-copy.mjs --write");
  else if (have.trim() !== block.trim() && !WRITE) bad.push("the coverage table in DESIGN.md is not what rule-coverage.json says: run check-copy.mjs --write");
  stats.coverage = { rules: Object.keys(cov.rules).length, auditLints: AUDIT.length, unit: UNIT.length, controls: counts.controls, e2e: E2E.length, e2eControls: counts.e2eControls, manual: [...Object.values(cov.rules), ...Object.values(cov.sections).flatMap((x) => Object.values(x.items))].filter((x) => x.manual || false).length, manualRows: [...Object.values(cov.rules).map((r) => r.manual), ...Object.values(cov.sections).flatMap((x) => Object.values(x.items).map((i) => i.manual))].filter(Boolean).reduce((n, m) => n + m.rows, 0), errorItems: nErr, dateRows: nDates, stepKinds: nStep, terminologyRows: nTerm, block };
  check("R1", "every written rule (C1 to C18), every item of § Errors, every row of § Dates, every kind of § Step labels and every row of the terminology table has a lint that runs over the strings with a planted defect that proves it, or a statement of what no lint can see with the rows read by hand and the result; the proof run was made against this code and caught every defect, and each hand-checked population is the one that was read", bad.length === 0, bad.length ? `\n        ${list(bad, 40)}` : `${Object.keys(cov.rules).length} rules, ${nErr} § Errors items, ${nDates} § Dates rows, ${nStep} step kinds and ${nTerm} terminology rows covered; ${AUDIT.length} new lints, each claimed once and named by a unit proof; ${UNIT.length} unit proofs (${counts.controls} controls) and ${E2E.length} end-to-end proofs all caught; ${stats.coverage.manualRows} rows read by hand in ${stats.coverage.manual} samples`);
}

// ---------------------------------------------------------------- summary
stats.checks = report.length; stats.failed = failed;
stats.groups = groups.length; stats.dsRows = dsRows.length; stats.attributes = { students: studentRows.length, staff: staffRows.length };
stats.rules = ruleIds.length; stats.usedRules = [...usedRules].length;
const byRoute = {}; for (const r of rows) byRoute[r.group] = (byRoute[r.group] || 0) + 1;
stats.byRoute = byRoute;
console.log(`\n${failed ? "FAILED" : "PASSED"}: ${report.length - failed} of ${report.length} checks passed`);
if (WRITE) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "check-summary.json"), JSON.stringify({ stats, report }, null, 1) + "\n");
  const s = stats;
  const inv = s.inventory || {};
  const mb = s.messageBranches || {}, dc = s.dateControls || {};
  const ev = [
    "| Check | Result | Source |", "|---|---|---|",
    `| Revision rows | ${s.rows} changed strings in ${Object.keys(s.byRoute).length} routes and shared groups (${s.errors} error messages), plus ${s.keptShared} rows that were already right (shared strings, and rows kept so that ids do not move) | \`generated/revisions.json\` |`,
    `| Anchors | ${s.sourceAnchored} of ${s.sourceAnchored} source-anchored rows have the old string found at the cited \`file:line\`, and the cited line itself holds it: ${s.anchors?.exact} lines hold it as a whole word or phrase, ${s.anchors?.fragment} a fragment of a sentence the code splits, ${s.anchors?.reading} a whole text that the code builds with a conditional (\`Login failed.\` and \`Login failed. Please contact {SUPPORT_EMAIL}.\` are two, each with its own row; a fragment is not enough there, and a row that drops a slot is the reading without it), ${s.anchors?.exempt} are lookups, code or slots, and ${s.anchors?.stated} in ${s.anchors?.axRows} rows cite a neighbouring line with a stated reason (\`ax\`); a text is found as a word, never inside an identifier; the other ${s.rows - s.sourceAnchored} rows are anchored by section (DESIGN.md, JOURNEY.md) | \`check-copy.mjs\` A1 |`,
    `| Source cites | ${s.noteCites?.notes} cites in the rows' and pages' notes and ${s.noteCites?.voice} in the Voice section (a file name, a colon and a line number) each name one file and a line inside it | K10 |`,
    `| Failed writes | ${s.failedWrites?.total} error rows are failed writes (a save, create, update, send, change, add, upload, assign, enroll or register): ${s.failedWrites?.safe} keep what was typed and say "Your changes are still in the form.", each citing the line that keeps it, and ${s.failedWrites?.nosafe} say why not (an inline switch or a one-click action, a batch, a page that clears the form, a loop that stopped partway); ${s.failedWrites?.cites} cites resolve and ${s.failedWrites?.catchBlocks} catch blocks are read to see that none clears the form; ${s.failedWrites?.exemptRows} other failures open with a verb that is listed as exempt, with its reason | D11 |`,
    `| Lints on new strings | ${s.rows} strings: case (a capital on the first word, none typed), the marks and dashes, terminology (the table's words, retired page names and the terms scoped to pages), person (we, our, let's), plurals (a count slot bare before a noun, singular or plural, with up to three words between, and a verb that must agree after a count helper, unless the row splits the singular), digits and units, dates (the day before the month, no numeric date, no 12-hour clock), vague and blaming errors, a colour used as a pointer ("Each red row"), claims and spelling, with ${s.coverage?.auditLints} lints added by the rule-coverage audit; ${s.exempted} carry a written exemption | B1, D2, D3, D4, D6, D8 |`,
    `| Error anatomy | ${s.errors} errors, each with what happened, why and what to do, with no exception: a row that opens with its cause fails; the ${s.inputRows} input-error rows each open with a statement of what is wrong, the rule applied to the field, and then give the correction (one that opens with the instruction fails), and ${s.inputWhyless} of them leave the cause to that statement; by cause ${JSON.stringify(s.byCause)}; a string that says something could not be done is always an error row | D1, D2 |`,
    `| Page coverage | ${s.entries} of 46 entries (7 shared regions, 34 pages, 5 redirects) carry a \`Copy (Phase 5)\` bullet; ${s.noChange} say "no change" with a reason | E1, E2 |`,
    `| Revision index | ${s.rows} rows, one per changed string, none extra; no string is both kept as it is and changed in the same group | E3, E6 |`,
    `| Tests column | untruncated and regex-aware: ${s.testRefs} references from ${s.testsRows} rows to ${s.testFiles} test files, each a \`file:line\` (a regular-expression query ends in \`r\`: \`Login.test.tsx:140r\` is on S-05.14); a reference counts only when the test reaches the row's source file through its imports; \`n\` marks a test that already queries the row's New text and \`k\` one that queries a part of the old string the row keeps (${s.nkRefs?.n} and ${s.nkRefs?.k}: \`AgentStepChain.test.tsx:80n\` is on SR-6.49, the loader's dot queries are \`k\` on SR-6.69). Inventory: ${inv.queries} text queries and assertions in ${inv.queryFiles} of ${inv.testFiles} test files (${inv.string} string literals, ${inv.regex} regular expressions in ${inv.regexFiles} files, ${inv.roleOnly} role queries with no name, ${inv.dynamic} dynamic); the research brief's "about 529 queries in 78 files" is ${inv.briefKinds} \`getByText\`, \`getByRole\`, \`getByLabelText\` and \`getAllByText\` calls in ${inv.briefFiles} files (${inv.briefMentions} mentions of the four names, two of them in imports), and 78 is the count of all test files. A second count made apart from the generator (every quoted literal in a test that equals a changed old string and reaches the row's file through the whole import closure, a negative assertion or a fixture included) finds ${s.testReach?.reached} references, and all ${s.testReach?.listed} are in the cells (${s.testReach?.notReached} more quote an old string in a test of another page); ${s.testReach?.readings} more literals equal one text that a conditional template draws, and each has a row of its own and is in its cell; ${s.testReach?.sentences} more are a whole sentence of an old string (12 characters or more), each in its cell. The index header says how the two counts relate: ${s.testReconcile?.total} references = ${s.testReconcile?.equal} that hold the old string as a literal (the scan's ${s.testReconcile?.scanReached} that reach an anchor) + ${s.testReconcile?.other} of the kinds a literal scan cannot see (${s.testReconcile?.regex} regular-expression queries, ${s.testReconcile?.asksNew} n, ${s.testReconcile?.asksKept} k, ${s.testReconcile?.otherString} sentence queries by containment, ${s.testReconcile?.otherText} lines that quote part of the string) | E5, E9, E11, E12 |`,
    `| Rows with no source anchor | ${s.sectionOnly} rows are anchored by section (the design system's placeholders, the Companion's twins) or by a backend file, so no UI test can reach them; none of their old texts is a string a component draws today (where one is, the row is anchored to the component: DS.12 is \`CopyButton.tsx\`) | E10 |`,
    `| Source scan | ${s.scan.candidates} candidate strings in scope (single words, "...", "Are you sure", "(s)", em dashes, curly quotes, placeholders that are not examples, helpers and descriptions without a full stop, and slot-bearing templates read too); ${s.scan.census} of them come from the visible-text census, which reads every piece of text whole with the TypeScript compiler (a JSX sentence with an expression inside it, a literal that starts with a quote mark or a slot); ${s.scan.violations} violate a rule and ${s.scan.errorChannel} more are error-channel strings; ${s.scan.covered} of ${s.scan.violations + s.scan.errorChannel} covered; ${s.scan.exempt} exempt (format tokens, protocol text, internal thrown errors) | H1 |`,
    `| Confirmations | ${s.confirmations?.sites} places ask the person to confirm (${s.confirmations?.dialogs} dialogs, ${s.confirmations?.shared} through the shared delete dialog, ${s.confirmations?.native} native confirm calls, in ${s.confirmations?.files} files), found with the TypeScript compiler; each is listed in confirmations.json with the rows that carry its words; the title is a question, and the rows say whether the action can be undone or how to get it back (C11) | H16 |`,
    `| Kept strings | ${s.keptStrings?.read} strings and rows the design leaves as they are (the \`Kept as is\` list of ${s.keptStrings?.groups} pages and every kept row) pass the lints of a new string: nothing that says something could not be done (D2), no alternation of forms (D6), no count with a plural noun and no singular (C4), the marks and terms of C5 and C6, the person of C8; ${s.keptStrings?.exempt} is exempt, with its reason in \`kept-exempt.json\` | H17 |`,
    `| The MCP pages | every new string, kept string and kept row of A-07, A-22 and S-08 (${s.mcpWording?.read} read, ${s.mcpWording?.unchanged} of them source strings no row touches) says "MCP server" in full for the record and names Kiwi's server in a cause line; "Server-sent events" is the one other use of the word | H18 |`,
    `| Error rows and C9 | ${s.errors} error rows, each citing C9 (what happened, why, what to do), some also C10 or C16 or C4; ${s.c9Other?.length} other rows cite C9 without being error rows (${(s.c9Other || []).join(", ")}), so ${s.c9Total} rows cite it in all | D9 |`,
    `| Reason phrases | no string quotes a response's reason phrase ("Internal Server Error") or the JSON parser's text: a status line or phrase always takes the cause line "The server returned an error ({status})." (${mb.http} status-line rows, ${mb.srv} rows that quote a response body's message only, ${mb.dev} that drop developer text) | D10, H5 |`,
    `| Message branches | ${mb.sites} places where the code shows a message, a body or a status line taken from a failed call (${mb.exempt} more are exempt, with a reason); each has a row: ${mb.srv} quote the server's words after Kiwi's sentence, ${mb.http} replace a status line with words, ${mb.dev} drop the client library's text | H5 |`,
    `| Changes reach every copy | ${s.occurrences?.sites} places in ${s.occurrences?.files} files draw one of ${s.occurrences?.strings} changed phrases as a whole literal or text; each sits at an anchor of a row with that Old (${s.occurrences?.exempt} exempt, with a reason): the same toast on two pages, an aria-label beside its tooltip, a fallback that repeats a mapping | H9 |`,
    `| Counts with a noun | ${s.countSites?.lines} lines in ${s.countSites?.files} files show a count and a plural noun; each has a row that picks the noun by the count (\`{n: count student}\`) or gives the singular reading (${s.countSites?.exempt} exempt, with a reason) | H10 |`,
    `| The section's own examples | ${s.proseExamples} examples (each voice attribute's in-range sample, the right side of each wrong \u2192 right pair) pass the same lints as a new string | F20 |`,
    `| Identifiers drawn as text | ${s.identifiers?.sites} places in ${s.identifiers?.files} files draw an enum value, a key, an id or a code as visible text or as an accessible name (a select option, a table cell, a chip, a tooltip, a sentence, a toast, a DataGrid column), found with the TypeScript compiler: ${s.identifiers?.lookup} through ${s.identifiers?.lookups} lookups (every value the place can show has its words) and ${s.identifiers?.exempt} exempt, in ${s.identifiers?.reasons} listed reasons (an id an admin copies, an identifier the admin chose, an event name, a word inside a sentence); ${s.derived?.sites} more places turn a code into words by changing its case (a capitalised tool name, an upper-cased key): ${s.derived?.sites - s.derived?.exempt} have a row and ${s.derived?.exempt} are exempt | H11, H15, F21 |`,
    `| One-word buttons | ${s.buttons?.read} buttons read, ${s.buttons?.oneWord} one-word labels: each is in C2's closed carve-out (Retry, Dismiss, Undo, Stop, Copy, Apply, Refresh), an exit, a word the component tables name, or has a row that gives it an object | H12 |`,
    `| Conditional strings | ${s.conditionals?.read} strings with two text branches: both branches have a row or are kept, or neither does (SR-5.02 and SR-5.03 are the two branches of one line); ${s.conditionals?.templates} template literals with a conditional piece draw ${s.conditionals?.templateTexts} texts of two words or more, read with the TypeScript compiler (a plural is not one): where one text has a row, every text has one, ${s.conditionals?.templateRows} of them in all (S-07.02 to S-07.05 are the two readings of two templates) | H13 |`,
    `| Batches | ${s.batches?.loops} loops in ${s.batches?.functions} functions send requests one after another and report how it went: ${s.batches?.partial} have a partial-result row (what went through, why the rest did not, what to do) and ${s.batches?.reads} is a read written down with its reason | H14, D1 |`,
    `| Forms, sign-in and shared lines | no new string holds an alternation of forms (\`student(s)\`, "1 class, or {n} classes", \`{enabled or disabled}\`); "session" appears only on the analytics page; ${s.sharedLineRows} rows share a source line and an old text with another row of their page and kind, and each says when it shows | D6, D8, E7 |`,
    `| Out of scope, by reason | ${Object.entries(s.scan.outOfScope).map(([k, v]) => `${k}: ${v}`).join("; ")} | H1 |`,
    `| Dates and counts | ${s.locale.sites} default-locale \`toLocale…String()\` call sites in ${s.locale.files} files and ${s.locale.fns} date-fns \`format()\` display patterns in ${s.locale.fnsFiles} files (the range label, the calendar's header, day and weekday names), all covered by a C3 or C4 row; ${s.native} native alert, confirm or prompt calls, all revised or student-owned | H2, H3 |`,
    `| Slots | ${s.slotRows} rows have a {slot} in Old; every one is kept in New (a date or number slot names its formatter, \`{date: D MMM YYYY}\`) or named in the row's note | D5 |`,
    `| Confirming buttons | ${s.confirmLabels} bare-verb labels that a dialog's confirming button can show, each with a row that repeats the verb and names the object (\`Create webhook\`, \`Approve prompt\`) | H8 |`,
    `| Engine ids and CSS capitals | ${s.engineSites?.sites} places draw an engine id and each shows its display name; ${s.capSites} CSS text-transforms over a string are each named in the implementation hand-off | H6, H7 |`,
    `| Date controls | ${dc.sites} native date, date-time and time inputs in ${dc.files} files (${dc.byType ? Object.entries(dc.byType).map(([k, v]) => `${v} ${k}`).join(", ") : ""}), each replaced by the \`DateTimeField\` through a C3 row and listed in \`§ Dates, times and numbers\` | H4, F14 |`,
    `| Voice and tone | ${s.attributes.students} student and ${s.attributes.staff} staff attributes, 6 tone moments, ${s.rules} rules, ${Object.keys(CAUSES).length} cause codes, ${s.dsRows} shared strings | F1 to F19, F22, F23 |`,
    `| Email | one source per string: the welcome heading rule, the enrollment body and the sender defaults agree between the preview and the mail | F13 |`,
    `| Cross-section words | the sections that state the words of a state quote ${Object.values(s.crossSection?.regions || {}).reduce((n, v) => n + v.read, 0)} words (distinct within each place) in ${Object.keys(s.crossSection?.regions || {}).length} places (${Object.entries(s.crossSection?.regions || {}).map(([k, v]) => `${k}: ${v.read}`).join("; ")}); every one is an index row, a kept string or a closed cause line (${Object.values(s.crossSection?.regions || {}).reduce((n, v) => n + v.viaRow, 0)}) or one of the ${s.crossSection?.declared} declared non-product quotes in \`doc-strings.json\` (${Object.entries(s.crossSection?.byKind || {}).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(", ")}; an entry can stand in two places), and no declaration is stale; the last place is the committed text that points at Phase 5 or tells a chat state's words (${s.crossSection?.regions?.["committed lines that name Phase 5"]?.lines} lines) | K1, K2 |`,
    `| The walk state's words | ${s.stepLabels?.drawn} labels the source can draw (the chain, its header, the fallback, the tool pill) are classified in \`§ Step labels\` as ${Object.entries(s.stepLabels?.kinds || {}).map(([k, v]) => `${k} ${v}`).join(", ")} and sit under the kind their shape says; the walk twin, the Companion text and the SR-6 rows list the same labels; the fallback step and the header are one string ("Working…"); ${s.stepLabels?.thinkingLines} lines quote "Thinking…" and all of them say it is the wait; the loader row names its ${s.stepLabels?.loaderSites} places and its dot tests | K3 |`,
    `| The expired subtype | \`§ Errors\` supersedes the locked Companion hand-off for "No token" (expired, no Retry) and "Token expired" (the automatic renewal, never an error row), and says what the student sees when the renewal fails; the twin, the Companion text, the hand-off and SR-6.13 agree; ${s.expired?.rows} rows have the expired cause and none offers Retry; the source still sends \`?sessionExpired=true\` and the sign-in page still reads only \`?timeout=true\` | K4 |`,
    `| Twins and rows | ${s.twinPairs} Companion twins restate a row (the composer's reason, the quota, permission and expired errors, the retryable bubble with its generic cause line) and each does so word for word; every design-system row names a string that exists (${s.supersedes?.text} placeholders quoted in the committed text, ${s.supersedes?.source} strings the code shows today) | K7, K8 |`,
    `| One name, one cite | no new string says Kiwi twice in a row (a cause line reads "It" after a sentence that names it); ${s.cites?.ids} row ids exist and every cite of one, in the Voice section and in ${s.cites?.notes} notes, resolves (a kept row has no index entry) | K5, K6 |`,
    `| Empty values | ${s.emptyGlyphs?.sites} lone dashes in ${s.emptyGlyphs?.files} files stand for "no value" (${s.emptyGlyphs?.emDash} em dash, ${s.emptyGlyphs?.hyphen} hyphen, ${s.emptyGlyphs?.enDash} en dash, ${s.emptyGlyphs?.pair} pair joined by a slash): one glyph, the em dash, exempt from C5 in writing as a glyph and not punctuation, each with the accessible name "No value" (DS.53, DS.54); the en dash is kept only in a date or number range (C5), and the lint fails on one anywhere else | H19 |`,
    `| The date guard | the guard rejects a default-locale call and any explicit non-English locale; ${s.nonEnglishLocale?.sites} such call in the source (\`timeUtils.ts:4\`, \`'zh-CN'\`, in an orphan) is named; ${s.englishLocale?.sites} explicit en-US calls are named by file and line: ${s.englishLocale?.phase6} in the Phase 6 hand-off (the chart ticks and tooltip), ${s.englishLocale?.dates} in § Dates, times and numbers | H20 |`,
    `| Rule coverage | ${s.coverage?.rules} rules, ${s.coverage?.errorItems} § Errors items, ${s.coverage?.dateRows} § Dates rows, ${s.coverage?.stepKinds} step kinds and ${s.coverage?.terminologyRows} terminology rows each have a lint over the strings with a planted defect that proves it, or a statement of what no lint can see with the rows read by hand (${s.coverage?.manualRows} rows in ${s.coverage?.manual} samples); the proof run (\`prove-checks.mjs\`) plants ${s.coverage?.unit} strings into the lints (${s.coverage?.controls} controls that must stay quiet) and ${s.coverage?.e2e - s.coverage?.e2eControls} defects into a throwaway copy of the data, the guide and the source, and every one is caught by the check it names (${s.coverage?.e2eControls} further change to a copy is a control that must leave its check quiet); the table is in \`§ Rule coverage\` | R1 |`,
    `| Removing actions | ${s.destructive?.calls} calls in the source that remove, deactivate, disable or revoke something (a generated client method whose name says so, or a DELETE request) are classified in \`destructive-actions.json\` by what the backend does, with the cited lines read: ${s.destructive?.actions} actions (${Object.entries(s.destructive?.effects || {}).map(([k, v]) => `${v} ${k}`).join(", ")}); the copy of a soft action says its own verb and never delete, remove or permanent (the webhook's Delete only sets it inactive, so it says deactivate), an archive the person cannot see or undo says why it is still called delete, and ${s.destructive?.wording} New rows with a removal word are each in an action (${s.destructive?.rows}) or on a written line (${s.destructive?.other}) | D12 |`,
    `| Who can act | ${s.accessClaims?.rows} New strings say who can act (an administrator, an instructor: "Only an administrator can…", "Ask your instructor…") and are listed in \`access-claims.json\` as ${s.accessClaims?.claims} claims about the access model that the user decided on 2026-10-16 and \`fix/access-control\` builds (\`docs/logic-changes.md\`, LC-2 and LC-7), not today's menus and guards: ${s.accessClaims?.confirmed} confirmed, ${s.accessClaims?.fixed} fixed (a row that followed today's menu and was reworded) and ${s.accessClaims?.gated} gated (true once the branch merges, so the row ships with or after it, like S-05.06); ${s.accessClaims?.facts} facts back them, ${s.accessClaims?.quoted} quoted from \`docs/logic-changes.md\` (read against the page whenever the tree or the branch has it) and ${s.accessClaims?.cited} cited in code; the hand-offs state the rule | D13 |`,
    `| The guide's own examples | ${s.exampleRows?.rows} rows are quoted by the voice attributes' in-range samples and the tone map's samples; each is verified against the code (${s.exampleRows?.verified}, a cite that resolves), declared to claim nothing about the product (${s.exampleRows?.nonClaim}) or true only once a hand-off step the Voice section states is taken (${s.exampleRows?.handoff}); \`§ Rule coverage\` lists them | K11 |`,
    `| The round-8 statements | the refused sign-in opens with what happened like its three siblings (S-05.04), and D1 keeps no cause-first exception; the two counts that read wrong at 1 use the helper (S-02.07, A-04.40) and D3 reads a count slot before a singular noun and before a modifier and a noun; the webhook's state chip is two lookup rows, one value each, and H13 fails a conditional whose two branches are one lookup row; the Tests column lists a part of a sentence only when the query is a whole sentence of it | F24, D1, D3, H13 |`,
    `| The email table | ${s.emailTable?.rows} EM rows occur word for word in \`§ Email templates\`, and the ${s.emailTable?.quoted} quoted strings of its ${s.emailTable?.templates} template rows are each exactly a New text or a kept string: the match is exact, so a sentence cannot lose a part the table keeps (EM.21 once dropped the instructor's name) and a slot is spelled one way ({SUPPORT_EMAIL}) in both | F25, F13 |`,
    `| The follow-up statements | A-16.55 reads at every count ("Some entries don't look like email addresses") and D3 now fails a verb that must agree after a count helper unless the row splits the singular; A-14.03 says "Each failed row", its note says which row carries the text status, and C14-C fails a colour used as a pointer; the Voice sample about a repeated step has its cite beside it and the cited lines hold the detection (\`AgentStepChain.tsx:206\`) and the sentence (\`:354-359\`); the Voice intro names all six touches that the lock allows; the index header says that some New cells show a control's or formatter's output; the clamped server text is a focusable element (F22) | F28, F22, D3 |`,
    `| The round-10 statements | the DateTimeField's field errors (DS.45 to DS.49) open with what is wrong and give the correction second; S-07.04 and S-07.05 have the Old of their own reading (the text with no support address), S-07.02 and S-07.03 the text with it, and S-07.05 lists the two asserts of \`Login failed.\`; the generic sign-in fallback (S-05.03) does not point at the password, which stays in S-05.04; the instructor's empty class list says who acts (SR-1.10); the Voice section names no archetype; the two branches of the sign-in aside cite a content principle first; the experiment form's save error names the rules it can break | F27 |`,
    `| The round-9 statements | the enrollment mail keeps the instructor's name where the backend template writes it, and the two template lines its note cites are read; the class list is "Your classes" in the sidebar and as the page title, for both roles; the no-access heading says whose account lacks access; C3 lists the ${s.c3Variants} formats of \`§ Dates, times and numbers\`, the seconds of an audit log and the weekday's full name, read from the table; every finding after SEC-1 in the Security finding table is a pointer and a severity | F26 |`,
    `| The round-7 statements | the webhook's Delete is a deactivate in the title, the button, the row's control, the toast and the failed-action line, and the decision is in the hand-off; the file delete names what it removes and says chats keep their answers; the offline line keeps what happened first and the tone rule says so; the twins are final in every sentence of the Companion; the expired chat error says what happens to the question; the input error's anatomy is explained (the tenth review refined it: it opens with a statement of what is wrong, never with the correction); the one step of two kinds is classified | F23, G3 |`,
    `| The round-5 statements | clamped server text is a focusable element whose accessible description is the full text (\`§ Errors\`, C10 and the hand-off), with the touch control as well (DS.51, DS.52), user-safe backend messages in the hand-off, the "assistant" terminology row, S-10's way-back links, no cite of a kept row, one string for one state (A-01 and SR-1, SR-5.01 and SR-6.01) | F22 |`,
    `| Companion | ${cpRows.length} twin and announcement rows occur verbatim in \`§ Companion\`; the like and dislike text is neutral on A-7; principle 4, the drafts line and the state-table intro's one sentence are reworded; G3 reads every claim that the twins are drafts | G1 to G3 |`,
    `| The lock | read against the commit before Phase 5 (aed7b42), because HEAD holds Phase 5 since it was committed; DESIGN.md: ${s.designDiff?.twinLinesEdited ?? "?"} twin lines edited (last cell only), principle 4, the drafts line, the state-table intro's one sentence (it called the twins drafts), the Phase 5 hand-off's draft wording and the Phase 4 intro's one phrase reworded, and ${s.designDiff?.linesAppended ?? "?"} lines appended, nothing else; JOURNEY.md: insertions only, apart from the intro paragraph and the SR-6 bullet's one draft string; nothing under \`kiwi-ui/src\`, \`kiwi-ui/public\` or \`kiwi/\` differs from that commit, committed or not | L1 to L3 |`,
    `| Paths | no machine-specific path in the scripts, data or generated text | P1 |`,
    `| Security detail | no phrase of a private, git-ignored list (kept with the security notes, outside the repository) is in DESIGN.md, JOURNEY.md or any file under \`.design-foundations/copy/\`, generated files and data included; where the list is not present the check says that it was skipped, and the committed checker holds no phrase | P2 |`,
  ].join("\n");
  const a = design.indexOf("<!-- copy:evidence:start -->"), b = design.indexOf("<!-- copy:evidence:end -->");
  let outDesign = design;
  if (a >= 0 && b > a) outDesign = design.slice(0, a) + "<!-- copy:evidence:start -->\n" + `Read from \`generated/check-summary.json\` (written by \`node .design-foundations/copy/check-copy.mjs --write\`) at assembly time, never typed; a re-run rewrites this table. Run it before every change to the data.\n\n` + ev + "\n" + design.slice(b);
  // the coverage table (R1): the data, written out
  const ca = outDesign.indexOf("<!-- copy:coverage:start -->"), cb = outDesign.indexOf("<!-- copy:coverage:end -->");
  if (ca >= 0 && cb > ca && s.coverage?.block) outDesign = outDesign.slice(0, ca) + "<!-- copy:coverage:start -->\n" + s.coverage.block + "\n" + outDesign.slice(cb);
  // Phase 6: its own evidence block inside `## Chart tokens`; the Phase 5 table above is rewritten from unchanged numbers, so it stays byte-identical
  const pa = outDesign.indexOf("<!-- copy:evidence-p6:start -->"), pb = outDesign.indexOf("<!-- copy:evidence-p6:end -->");
  if (pa >= 0 && pb > pa) {
    const p6 = s.phase6 || {};
    const q = (id) => { const r = report.find((x) => x.id === id); return r ? (r.ok ? "PASS" : "FAIL") : "not run"; };
    const ev6 = [
      "| Check | Result | Source |", "|---|---|---|",
      `| Phase 6 rows | ${p6.rows} strings in ${p6.groups} groups: ${p6.sourceAnchored} anchored at the source line that holds the old string and ${p6.newText} new strings anchored to the file and line they will be drawn at, all linted with the Phase 5 lints (case, marks, terms, person, plurals, dates); ${p6.summaries} chart summaries, each with the key figure first, the period or scope stated and no claim the counts cannot back | Q1, Q2, Q5 |`,
      `| Placement | each row once in its page's \`Copy (Phase 6)\` bullet, after the entry's Phase 5 block, and once under "Rows appended by later phases" below the sentence Phase 5 left; no Phase 6 row in a Phase 5 count or table | Q3, Q6 |`,
      `| Chart ticks | the four explicit en-US display calls of \`chartXAxis.ts\` (:50, :80, :85, :91) each have a format row with the C3 form | Q4 |`,
      `| The Phase 6 lock | against the commit before Phase 6 (bd45ade): DESIGN.md grew only at its end (${s.designDiff6?.linesAppended ?? "?"} lines); JOURNEY.md gained ${s.journeyDiff6?.added ?? "?"} lines and lost none; nothing under \`kiwi-ui/src\`, \`kiwi-ui/public\` or \`kiwi/\` differs; L1 to L3 are unchanged and still pass | L4, L5, L6 |`,
      `| Results | Q1 ${q("Q1")} · Q2 ${q("Q2")} · Q3 ${q("Q3")} · Q4 ${q("Q4")} · Q5 ${q("Q5")} · Q6 ${q("Q6")} · L4 ${q("L4")} · L5 ${q("L5")} · L6 ${q("L6")} | this run |`,
    ].join("\n");
    outDesign = outDesign.slice(0, pa) + "<!-- copy:evidence-p6:start -->\n" + `Read from \`generated/check-summary.json\` (written by \`node .design-foundations/copy/check-copy.mjs --write\`) at assembly time, never typed; a re-run rewrites this table.\n\n` + ev6 + "\n" + outDesign.slice(pb);
  }
  if (outDesign !== design) fs.writeFileSync(DESIGN_MD, outDesign);
  console.log("wrote generated/check-summary.json, the Evidence table and the coverage table");
}
process.exit(failed ? 1 : 0);
