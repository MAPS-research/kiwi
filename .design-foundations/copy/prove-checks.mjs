// prove-checks.mjs: run the planted defects of proofs.mjs and write generated/proof-summary.json.
//
//   node prove-checks.mjs                  every unit proof, then every end-to-end proof (4 workers; about 3 minutes)
//   node prove-checks.mjs --unit-only      the unit proofs only (a second)
//   node prove-checks.mjs --only ID,ID     named proofs only (the summary is not written)
//   node prove-checks.mjs --jobs N         N workers (default 4)
//   node prove-checks.mjs --root DIR       where the throwaway copies go (default: the system temp directory)
//
// An end-to-end proof copies the data, the guide and the source into a throwaway root, plants ONE defect, runs check-copy.mjs there and asks whether the named check
// failed (an expected check written "!ID" is a control: the copy is changed in a way that must leave that check quiet); the real files are never written, and the copy is deleted afterwards. The copy is checked first with no defect: it must pass everything but the lock checks
// (L1 to L3 read git, which a copy does not have). Exit code 1 if a proof is missed or the baseline is not clean.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ROOT, UI, HERE, OUT_DIR, codeHash } from "./copy-lib.mjs";
import { UNIT, E2E, runUnit } from "./proofs.mjs";

const run = promisify(execFile);
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const ONLY = opt("--only", "") ? new Set(opt("--only", "").split(",")) : null;
const JOBS = Number(opt("--jobs", "4"));
const BASE = opt("--root", os.tmpdir());

// ---------------------------------------------------------------------------------------------------------------- the context a mutation works through
function context(root) {
  const copy = path.join(root, ".design-foundations", "copy");
  const revDir = path.join(copy, "revisions");
  const backups = new Map();
  const touch = (p) => { if (!backups.has(p)) backups.set(p, fs.readFileSync(p, "utf8")); };
  const write = (p, text) => { touch(p); fs.writeFileSync(p, text); };
  const edit = (p, fn) => { const before = fs.readFileSync(p, "utf8"); const after = fn(before); if (after === before) throw new Error(`the mutation did not change ${path.relative(root, p)}`); write(p, after); };
  const POS = { o: 0, n: 1, k: 2, refs: 3, t: 4, m: 5, f: 6, r: 7, x: 8 };
  const KEYS = ["k", "o", "n", "m", "f", "r", "t", "refs", "x"];
  const findRow = (id) => {
    const m = /^(.*)\.(\d+)$/.exec(id); if (!m) throw new Error(`bad row id ${id}`);
    for (const f of fs.readdirSync(revDir).filter((x) => x.endsWith(".json"))) {
      const p = path.join(revDir, f); const data = JSON.parse(fs.readFileSync(p, "utf8"));
      const g = data.find((x) => x.id === m[1]); if (g) return { p, data, g, i: Number(m[2]) - 1 };
    }
    throw new Error(`no group ${m[1]}`);
  };
  const toObject = (g, i) => {
    const row = g.rows[i]; if (!Array.isArray(row)) return row;
    const o = {}; KEYS.forEach((k) => { const v = row[POS[k]]; if (v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)) o[k] = v; });
    return (g.rows[i] = o);
  };
  const created = [];
  return {
    // a file the mutation adds (the private phrase list of check P2, planted with a harmless phrase): removed again by restore()
    create(rel, text) { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); if (fs.existsSync(p)) touch(p); else created.push(p); fs.writeFileSync(p, text); },
    restore() { for (const [p, text] of backups) fs.writeFileSync(p, text); for (const p of created.splice(0)) fs.rmSync(p, { force: true }); },
    row(id, fields) {
      const { p, data, g, i } = findRow(id);
      const arrayOk = Object.keys(fields).every((k) => k in POS) && Array.isArray(g.rows[i]);
      const row = arrayOk ? g.rows[i] : toObject(g, i);
      for (const [k, v] of Object.entries(fields)) {
        if (Array.isArray(row)) row[POS[k]] = v;
        else if (v === undefined) delete row[k]; else row[k] = v;
      }
      write(p, JSON.stringify(data, null, 1) + "\n");
    },
    dropRow(id) { const { p, data, g, i } = findRow(id); g.rows.splice(i, 1); write(p, JSON.stringify(data, null, 1) + "\n"); },
    keep(groupId, text) {
      for (const f of fs.readdirSync(revDir).filter((x) => x.endsWith(".json"))) {
        const p = path.join(revDir, f); const data = JSON.parse(fs.readFileSync(p, "utf8"));
        const g = data.find((x) => x.id === groupId); if (!g) continue;
        (g.kept ||= []).push(text); write(p, JSON.stringify(data, null, 1) + "\n"); return;
      }
      throw new Error(`no group ${groupId}`);
    },
    src(rel, text) { const p = path.join(root, "kiwi-ui", rel); write(p, fs.readFileSync(p, "utf8") + text); },
    srcEdit(rel, fn) { edit(path.join(root, "kiwi-ui", rel), fn); },
    copyEdit(rel, fn) { edit(path.join(copy, rel), fn); },
    design(fn) { edit(path.join(root, "kiwi-ui", "DESIGN.md"), fn); },
    journey(fn) { edit(path.join(root, "kiwi-ui", "JOURNEY.md"), fn); },
    json(rel, fn) { const p = path.join(copy, rel); write(p, JSON.stringify(fn(JSON.parse(fs.readFileSync(p, "utf8"))), null, 1) + "\n"); },
  };
}

// ---------------------------------------------------------------------------------------------------------------- the throwaway root
function buildRoot(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "kiwi-ui"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".design-foundations"), { recursive: true });
  fs.cpSync(path.join(UI, "src"), path.join(dir, "kiwi-ui", "src"), { recursive: true });
  for (const f of ["package.json", "tsconfig.json", "vite.config.ts", "DESIGN.md", "JOURNEY.md"]) if (fs.existsSync(path.join(UI, f))) fs.copyFileSync(path.join(UI, f), path.join(dir, "kiwi-ui", f));
  if (fs.existsSync(path.join(UI, "node_modules"))) fs.symlinkSync(path.join(UI, "node_modules"), path.join(dir, "kiwi-ui", "node_modules"));
  if (fs.existsSync(path.join(ROOT, "kiwi"))) fs.symlinkSync(path.join(ROOT, "kiwi"), path.join(dir, "kiwi"));
  fs.cpSync(HERE, path.join(dir, ".design-foundations", "copy"), { recursive: true });
}
async function check(dir) {
  const script = path.join(dir, ".design-foundations", "copy", "check-copy.mjs");
  try { const r = await run("node", [script], { maxBuffer: 256 * 1024 * 1024 }); return { out: r.stdout }; }
  catch (e) { return { out: String(e.stdout || "") }; }
}
// L1 to L3 read git, which a copy does not have; R1 reads the summary this run is about to write, so it cannot be a baseline of the run that writes it
const failing = (out) => [...out.matchAll(/^FAIL  (\S+)/gm)].map((m) => m[1]).filter((id) => !/^(L[123]|R1)$/.test(id));

// ---------------------------------------------------------------------------------------------------------------- unit proofs
const unit = [];
for (const c of UNIT) {
  if (ONLY && !ONLY.has(c.id)) continue;
  const r = runUnit(c);
  unit.push({ id: c.id, rule: c.rule, how: c.how, negative: c.expect === null, ok: r.ok, ...(r.ok ? {} : { text: c.text, hits: r.hits }) });
}
const unitMiss = unit.filter((x) => !x.ok);
console.log(`unit proofs: ${unit.length - unitMiss.length} of ${unit.length} behave as planted (${unit.filter((x) => x.negative).length} are controls that must stay quiet)`);
for (const m of unitMiss) console.log(`  MISSED ${m.id} (${m.rule}) ${JSON.stringify(m.text)} -> ${JSON.stringify(m.hits)}`);

// ---------------------------------------------------------------------------------------------------------------- end-to-end proofs
let e2e = [], baselineBad = [];
if (!flag("--unit-only")) {
  const cases = E2E.filter((c) => !ONLY || ONLY.has(c.id));
  const stamp = `kiwi-proof-${process.pid}`;
  const roots = Array.from({ length: Math.max(1, Math.min(JOBS, cases.length || 1)) }, (_, i) => path.join(BASE, `${stamp}-${i}`));
  try {
    await Promise.all(roots.map(async (dir) => buildRoot(dir)));
    const base = await check(roots[0]);
    baselineBad = failing(base.out);
    console.log(`baseline copy: ${baselineBad.length ? "FAILS " + baselineBad.join(", ") : "passes every check but the lock checks"}`);
    const queue = [...cases];
    const take = async (dir) => {
      const ctx = context(dir);
      for (let c = queue.shift(); c; c = queue.shift()) {
        let rec;
        try {
          c.mutate(ctx);
          const r = await check(dir);
          const f = failing(r.out);
          // an expect that starts with "!" is a control: the copy is changed in a way that must NOT trip the named check
          const control = c.expect.startsWith("!");
          rec = { id: c.id, rule: c.rule, corpus: c.corpus, expect: c.expect, name: c.name, failing: f, ok: control ? !f.includes(c.expect.slice(1)) : f.includes(c.expect) };
        } catch (err) { rec = { id: c.id, rule: c.rule, corpus: c.corpus, expect: c.expect, name: c.name, failing: [`(${err.message})`], ok: false }; }
        finally { ctx.restore(); }
        e2e.push(rec);
        console.log(`  ${rec.ok ? (c.expect.startsWith("!") ? "QUIET " : "CAUGHT") : "MISSED"} ${rec.id}  [${c.expect}]${rec.ok ? "" : "  failing: " + rec.failing.join(", ")}`);
      }
    };
    await Promise.all(roots.map((dir) => take(dir)));
    // the copies must be back to the baseline: compare every file the mutations could touch with the real ones
    for (const dir of roots) { const again = await check(dir); const f = failing(again.out); if (f.length !== baselineBad.length) { baselineBad.push(`(a copy did not return to the baseline: ${f.join(", ")})`); } }
  } finally {
    if (!flag("--keep")) for (const dir of roots) fs.rmSync(dir, { recursive: true, force: true });
  }
}
e2e.sort((a, b) => a.id.localeCompare(b.id));
const e2eMiss = e2e.filter((x) => !x.ok);
if (e2e.length) console.log(`end-to-end proofs: ${e2e.length - e2eMiss.length} of ${e2e.length} caught by the check they name (${e2e.filter((x) => x.expect.startsWith("!")).length} of them ${e2e.filter((x) => x.expect.startsWith("!")).length === 1 ? "is a control" : "are controls"} that must stay quiet)`);

// ---------------------------------------------------------------------------------------------------------------- the summary
if (!ONLY && !flag("--unit-only")) {
  const summary = {
    about: "Written by prove-checks.mjs. check-copy.mjs (R1) reads it: every proof the coverage table names is here and was caught, and codeHash is the hash of the checker, its library, the resolver, the proofs and the TypeScript scanner, so a summary older than a change to any of them is stale.",
    codeHash: codeHash(),
    unit: { total: unit.length, ok: unit.length - unitMiss.length, controls: unit.filter((x) => x.negative).length, cases: unit.map((x) => ({ id: x.id, rule: x.rule, ok: x.ok })) },
    e2e: { total: e2e.length, caught: e2e.length - e2eMiss.length, baselineClean: baselineBad.length === 0, cases: e2e.map((x) => ({ id: x.id, rule: x.rule, corpus: x.corpus, expect: x.expect, ok: x.ok })) },
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "proof-summary.json"), JSON.stringify(summary, null, 1) + "\n");
  console.log(`wrote generated/proof-summary.json (codeHash ${summary.codeHash})`);
}
process.exit(unitMiss.length || e2eMiss.length || baselineBad.length ? 1 : 0);
