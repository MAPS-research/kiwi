// record-amendment.mjs: write a lock amendment's record into lock-amendments.json (check-copy.mjs section 8b, L7 and L8), so the record is written with the
// amendment, never typed.
//
//   node .design-foundations/copy/record-amendment.mjs --id 2026-10-18-relock-visual-layer --decided 2026-10-18 --decision "..." [--base <commit>] [--dry-run]
//
// It reads kiwi-ui/DESIGN.md and kiwi-ui/JOURNEY.md at the base from git and from the working tree, and records each file as a patch, the second record kind
// (copy-lib.mjs patchRecord: a deterministic line diff of the two texts, with the blocks the checker writes collapsed to one line first, so a rewritten block
// is not part of the record). The base is --base (a commit), else the newest entry's own base when this rewrites it, else HEAD. The entry is appended, or it
// replaces the newest entry when that has the same id, so it can be re-run after more edits; a re-run with no further edits leaves the file byte for byte.
// Before it writes, it holds the whole chain with the new entry the way L7 and L8 do (copy-lib.mjs chainHits; the working text's blocks stand for the ones
// the checker writes, which check-copy.mjs --write then puts in place): a record that no longer holds, or a base that does not follow the one before it,
// stops it and nothing is written. It writes nothing but lock-amendments.json, which is data, not code (the proof summary stays valid). Then run
// node .design-foundations/copy/check-copy.mjs --write and node .design-foundations/copy/check-copy.mjs. Exit code 1 if it refuses, 2 on a usage error.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, HERE, DESIGN_MD, JOURNEY_MD, WRITTEN_BLOCKS, patchRecord, chainHits, generatedBlocks, collapseBlocks } from "./copy-lib.mjs";

const USAGE = "usage: node .design-foundations/copy/record-amendment.mjs --id YYYY-MM-DD-name --decided YYYY-MM-DD --decision \"the user's decision\" [--base <commit>] [--dry-run]";
const args = process.argv.slice(2);
const usage = (msg) => { console.error(`record-amendment: ${msg}\n${USAGE}`); process.exit(2); };
const refuse = (msg) => { console.error(`record-amendment: ${msg}`); process.exit(1); };
if (args.includes("--help") || args.includes("-h")) { console.log(USAGE); process.exit(0); }
const VALUED = ["--id", "--decided", "--decision", "--base"], FLAGS = ["--dry-run"], opts = {};
for (let i = 0; i < args.length; i++) {
  if (FLAGS.includes(args[i])) { opts[args[i]] = true; continue; }
  if (!VALUED.includes(args[i])) usage(`unknown argument ${JSON.stringify(args[i])}`);
  if (i + 1 >= args.length || args[i + 1].startsWith("--")) usage(`${args[i]} needs a value`);
  if (args[i] in opts) usage(`${args[i]} is given twice`);
  opts[args[i]] = args[++i];
}
const id = opts["--id"], decided = opts["--decided"], decision = (opts["--decision"] || "").trim(), dry = !!opts["--dry-run"];
if (!id || !/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) usage("--id is the decision's date and a lowercase name joined by hyphens (2026-10-18-relock-visual-layer)");
if (!decided || !/^\d{4}-\d{2}-\d{2}$/.test(decided) || Number.isNaN(Date.parse(`${decided}T00:00:00Z`)) || new Date(`${decided}T00:00:00Z`).toISOString().slice(0, 10) !== decided) usage("--decided is the date of the user's decision, YYYY-MM-DD");
if (!decision) usage("--decision is the user's decision, in a sentence (the plan Decision Log's words)");

const git = (...a) => { try { return execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }); } catch { return null; } };
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const show = (commit, p) => git("show", `${commit}:${rel(p)}`);
const c7 = (x) => String(x).slice(0, 7);
const FILE = path.join(HERE, "lock-amendments.json");
const before = fs.readFileSync(FILE, "utf8");
const data = JSON.parse(before), list = data.amendments || [];
// only the newest entry is recorded again: an earlier one is held by the ones after it
const k = list.findIndex((a) => a.id === id);
if (k >= 0 && k !== list.length - 1) refuse(`${id} is not the newest amendment (${list[list.length - 1].id} is): only the newest can be recorded again`);
const prior = k >= 0 ? list.slice(0, k) : list, prev = prior[prior.length - 1];
const baseArg = opts["--base"] ?? (k >= 0 ? list[k].base : "HEAD");
const base = (git("rev-parse", "--verify", "--quiet", `${baseArg}^{commit}`) || "").trim();
if (!/^[0-9a-f]{40}$/.test(base)) refuse(`the base ${JSON.stringify(baseArg)} is not a commit in this clone`);
console.log(`base: ${c7(base)} (${opts["--base"] ? "--base" : k >= 0 ? `the base ${id} was recorded with; pass --base to change it` : "HEAD"})`);
if (prev && prev.base === base) refuse(`${c7(base)} is already the base of ${prev.id}: an amendment's base is the commit before it, after the amendment before it`);
if (prev && git("merge-base", "--is-ancestor", prev.base, base) === null) refuse(`${prev.id}'s base (${c7(prev.base)}) is not an ancestor of ${c7(base)}: the amendments are recorded in the order they are made`);
if (git("merge-base", "--is-ancestor", base, "HEAD") === null) refuse(`${c7(base)} is not HEAD or an ancestor of it`);
const baseDesign = show(base, DESIGN_MD), baseJourney = show(base, JOURNEY_MD);
if (baseDesign === null || baseJourney === null) refuse(`kiwi-ui/DESIGN.md or kiwi-ui/JOURNEY.md cannot be read at ${c7(base)}`);
const design = fs.readFileSync(DESIGN_MD, "utf8"), journey = fs.readFileSync(JOURNEY_MD, "utf8");
const entry = { id, base, decided, decision, design: patchRecord(baseDesign, design, [...WRITTEN_BLOCKS]), journey: patchRecord(baseJourney, journey, []) };
if (!entry.design.hunks.length && !entry.journey.hunks.length) refuse(`nothing to record: kiwi-ui/DESIGN.md and kiwi-ui/JOURNEY.md are as they were at ${c7(base)} (the blocks the checker writes aside)`);
// the chain with the new entry, held as L7 and L8 hold it
const amendments = [...prior, entry];
const texts = [...prior.map((a) => ({ design: show(a.base, DESIGN_MD), journey: show(a.base, JOURNEY_MD) })), { design: baseDesign, journey: baseJourney }, { design, journey }];
const hits = chainHits({ amendments, texts, written: generatedBlocks(design) });
const bad = [...hits.design.map((h) => `DESIGN.md: ${h}`), ...hits.journey.map((h) => `JOURNEY.md: ${h}`)];
if (bad.length) refuse(`the chain does not hold with the new entry, so nothing was written:\n  ${bad.join("\n  ")}`);
// what is recorded, hunk by hunk (the line is the base's, as a reader sees it)
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const count = (r) => (r.hunks.length ? `${plural(r.hunks.length, "hunk")}, ${plural(r.hunks.reduce((n, h) => n + h.removed.length, 0), "line")} removed and ${r.hunks.reduce((n, h) => n + h.added.length, 0)} added` : "unchanged");
console.log(`${dry ? "would record" : k >= 0 ? "recorded again" : "recorded"} ${id} (base ${c7(base)}): DESIGN.md ${count(entry.design)}; JOURNEY.md ${count(entry.journey)}`);
for (const [name, text, rec] of [["DESIGN.md", baseDesign, entry.design], ["JOURNEY.md", baseJourney, entry.journey]]) {
  const B = collapseBlocks(text, rec.blocks);
  // a hunk that removes is at its first removed line; one that only adds goes after the line before it (a collapsed block's last line is its end marker)
  for (const h of rec.hunks) console.log(`  ${name} ${h.removed.length || h.at < 2 ? `line ${h.at - 1 < B.at.length ? B.at[h.at - 1] + 1 : B.count + 1}` : `after line ${h.at - 1 < B.at.length ? B.at[h.at - 1] : B.count}`}: -${h.removed.length} +${h.added.length}  ${JSON.stringify(h.starts)}`);
}
if (dry) process.exit(0);
const text = JSON.stringify({ ...data, amendments: [...prior, entry] }, null, 1) + "\n";
if (text === before) console.log("lock-amendments.json is unchanged: the record is the one already there");
else { fs.writeFileSync(FILE, text); console.log("wrote lock-amendments.json"); }
console.log("next: node .design-foundations/copy/check-copy.mjs --write, then node .design-foundations/copy/check-copy.mjs");
