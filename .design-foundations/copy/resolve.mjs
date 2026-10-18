// resolve.mjs: read the revision data, resolve every anchor against the source, compose error messages, derive rules.
// Shared by build-copy.mjs (which writes) and check-copy.mjs (which verifies). Read-only.
import {
  RULES, KIND_RULE, loadGroups, rowObject, composeError, findLines, testRefs, newTextRefs, keptRefs, normText, readSource, lineOfOffset, loadIdentifiers,
} from "./copy-lib.mjs";


// The first reason that applies to a change: [rule, a short phrase]. Used when a row has no explicit note.
function autoWhy(old, neu, kind, refs = "") {
  const o = old || "";
  if (/TD-21/.test(refs) && (kind === "label" || kind === "heading" || kind === "button")) return ["C7", "the sidebar label is the page title"];
  if (kind === "error") return ["C9", "what happened, why, and what to do"];
  if (kind === "remove") return ["C16", "text the product cannot back or the reader cannot use"];
  if (kind === "format") return /toLocale/.test(o) ? ["C3", "one date format, whatever the browser locale"] : /\(s\)|classes|groups|students|events|\bn\b/.test(o + neu) ? ["C4", "a real singular and plural"] : ["C4", "one format, whatever the browser locale"];
  if (/!/.test(o)) return ["C5", "no exclamation mark"];
  if (/whitelist/i.test(o)) return ["C6", "allowlist, not whitelist"];
  if (/kiwi platform/i.test(o)) return ["C6", "Kiwi, not Kiwi Platform"];
  if (/\blog ?in\b|login|logout|log out/i.test(o)) return ["C6", "sign in and sign out"];
  if (/professor/i.test(o)) return ["C6", "instructor, not professor"];
  if (/system prompt/i.test(o)) return ["C6", "instructions, not system prompt"];
  if (/course image/i.test(o)) return ["C6", "cover image, not course image"];
  if (/\.\.\./.test(o)) return ["C5", "the ellipsis character"];
  if (/ & /.test(o)) return ["C5", "\"and\", not \"&\""];
  if (/unnamed|\btbd\b/i.test(o)) return ["C6", "one fallback for a missing name"];
  if (/\bslug\b/i.test(o)) return ["C6", "identifier, not slug"];
  if (/\bengine\b/i.test(o)) return ["C6", "model, not engine"];
  if ((kind === "heading" || kind === "button") && /^no |first |match|couldn't load/i.test(neu)) return ["C12", "an empty state names what is missing and the first step"];
  if ((kind === "heading" || kind === "button") && (/^\{verb\}/i.test(neu) || /\?$/.test(neu))) return ["C11", "a confirmation title asks the question"];
  if (kind === "heading" && /access to this page/.test(neu)) return ["C9", "what happened and who can change it"];
  if (/\bplease\b/i.test(o)) return ["C8", "no \"please\""];
  if (/\bclick\b/i.test(o)) return ["C2", "\"select\", not \"click\""];
  if (/\(s\)/.test(o)) return ["C4", "a real singular"];
  if (o && o.toLowerCase() === neu.toLowerCase()) return ["C1", "sentence case"];
  if (kind === "confirm") return ["C11", "the consequence first"];
  if (kind === "cbutton") return ["C11", "the button repeats the verb and the object"];
  if (kind === "empty" || kind === "new") return ["C12", "says the first step, or who acts"];
  if (kind === "aria" || kind === "tooltip") return ["C15", "a name for an icon-only control"];
  if (kind === "status") return ["C13", "says what is happening or what happened"];
  if (kind === "helper" || kind === "placeholder") return ["C14", "a helper adds information; a placeholder is an example"];
  if (kind === "button") return ["C2", "plain words that name the outcome"];
  if (kind === "label" || kind === "heading") return ["C6", "one name for one thing"];
  return ["C8", "plain words"];
}

export function resolveAll() {
  const problems = [];
  const bad = (m) => problems.push(m);
  const groups = loadGroups();
  const identifiers = loadIdentifiers();
  const seenGroup = new Set();
  const resolved = []; // flat rows
  for (const g of groups) {
    if (seenGroup.has(g.id)) bad(`duplicate group id ${g.id}`);
    seenGroup.add(g.id);
    g.rowsResolved = [];
    (g.rows || []).forEach((raw, i) => {
      const r = rowObject(raw);
      const id = `${g.id}.${String(i + 1).padStart(2, "0")}`;
      const kind = r.k || "label";
      if (!KIND_RULE[kind]) bad(`${id}: unknown kind "${kind}"`);
      let old = r.o ?? "";
      let neu = r.n;
      // a lookup row: the ids a place can draw and the words that replace them, composed from identifiers.json so that the rows, the
      // tables in DESIGN.md and the checker never disagree. `only` narrows the lookup to the values that place can show.
      let lkVals = null;
      if (r.lk) {
        const lk = identifiers.lookups[r.lk];
        if (!lk) bad(`${id}: unknown lookup "${r.lk}"`);
        else if (!lk.dynamic) {
          const wanted = r.only ? [].concat(r.only) : lk.values.map((v) => v.raw);
          const picked = wanted.map((w) => lk.values.find((v) => v.raw === w));
          wanted.forEach((w, k) => { if (!picked[k]) bad(`${id}: "${w}" is not a value of the ${r.lk} lookup`); });
          if (picked.every(Boolean)) { old = picked.map((v) => v.raw).join(" · "); neu = picked.map((v) => v.label).join(" · "); lkVals = picked.map((v) => v.raw); }
        } else lkVals = [];
      }
      // a sentence that draws through lookups (the edit-expiration line names a flag and its target): old and new are written, and the
      // lookups it uses are named so that the checker knows which values it can show
      if (r.uses) {
        lkVals = [];
        for (const u of [].concat(r.uses)) {
          const lk = identifiers.lookups[u];
          if (!lk) bad(`${id}: unknown lookup "${u}"`);
          else if (!lk.dynamic) lkVals.push(...lk.values.map((v) => v.raw));
        }
      }
      if (kind === "remove" && (neu === undefined || neu === null || neu === "")) neu = "(removed)";
      if (kind === "error") {
        try { neu = composeError(r); } catch (e) { bad(`${id}: ${e.message}`); neu = ""; }
      }
      if (neu === undefined || neu === null || String(neu).trim() === "") bad(`${id}: no new text`);
      if (old === neu && !r.keep) bad(`${id}: old equals new (${old})`);
      if (r.keep && old !== neu) bad(`${id}: a kept row must have the same old and new text`);
      // anchors
      const files = [].concat(r.f || g.file || []);
      const needle = r.m === undefined ? old : r.m;
      const anchors = [];
      if (r.at) anchors.push({ at: r.at });
      if (!r.at || r.m) {
        if (needle === false || needle === "" || needle === null) { if (!r.at) bad(`${id}: no anchor (give "m", "o" or "at")`); }
        else {
          for (const f of files) {
            let lines = findLines(f, needle);
            // `ln` names the lines a row belongs to when the same text sits in places that need different rows (one row per handler)
            if (r.ln && lines.length) lines = lines.filter((l) => [].concat(r.ln).includes(l));
            if (!lines.length) bad(`${id}: "${String(needle).slice(0, 70)}" not found in ${f}${r.ln ? ` at line ${[].concat(r.ln).join(", ")}` : ""}`);
            else anchors.push({ file: f, lines });
          }
          if (!files.length && !r.at) bad(`${id}: no file`);
        }
      }
      // rules and the one-line rationale: an explicit note wins; otherwise the first matching reason names the change
      const auto = autoWhy(old, String(neu ?? ""), kind, r.refs || "");
      const noteCodes = [...new Set((r.t || "").match(/\bC(?:1[0-8]|[1-9])\b/g) || [])].slice(0, 3);
      let codes = r.r ? String(r.r).split(/[,\s]+/).filter(Boolean) : noteCodes.length ? noteCodes : [auto[0]];
      // an error row is built to C9 (what happened, why, what to do) whatever else it applies: a server's quoted words are C10 as well, never instead
      if (kind === "error" && !codes.includes("C9")) codes.push("C9");
      codes = [...new Set(codes)];
      for (const c of codes) if (!RULES[c]) bad(`${id}: unknown rule ${c}`);
      const primary = codes[0];
      // a failed write says whether the page keeps what was typed: the row's `safe` (what keeps it, and the line) or `nosafe` (why the sentence is not used)
      const inputNote = kind === "error" && r.safe ? ` Input kept: ${r.safe}.` : kind === "error" && r.nosafe ? ` No "still in the form" sentence: ${r.nosafe}.` : "";
      const baseWhy = r.t || auto[1];
      const why = `${baseWhy}${inputNote && !/[.!?`]$/.test(baseWhy) ? "." : ""}${inputNote} (${codes.slice(0, 3).join(", ")}: ${RULES[primary]?.[1] ?? ""})`;
      // only a string that is in the source can be queried by a test: a row anchored by section has none
      const srcFiles = [...new Set(anchors.filter((a) => a.file && !a.file.startsWith("..")).map((a) => a.file))];
      let tests = old && srcFiles.length ? testRefs(old, srcFiles) : [];
      // the other two kinds of reference: a test that already queries the row's New text (n), and one that queries a part of the old
      // string the row keeps, named in the row's `tq` (k: the loader's dots)
      if (srcFiles.length && !r.keep) tests = tests.concat(newTextRefs(String(neu ?? ""), srcFiles, tests));
      if (srcFiles.length && r.tq) tests = tests.concat(keptRefs(r.tq, srcFiles, tests));
      tests.sort((a, b) => a.name.localeCompare(b.name) || a.line - b.line);
      // a message branch: the code shows text taken from the failed call. "srv" is the server's own words (the row quotes
      // them after Kiwi's sentence, C10); "http" is a status line ("HTTP 500: …"), replaced by words with the status as a
      // support reference; "dev" is the client library's text, which is never shown (a remove row).
      if (r.br !== undefined && !["srv", "dev", "http"].includes(r.br)) bad(`${id}: br must be "srv", "http" or "dev"`);
      if (r.br === "srv" && !(kind === "error" && /(server|parser) said: "\{[a-zA-Z.]+\}"/.test(String(neu)))) bad(`${id}: a server-message branch is an error row that quotes the server's (or parser's) words`);
      if (r.br === "http" && !((kind === "error" || kind === "format") && /\(\{status\}\)/.test(String(neu)))) bad(`${id}: a status-line branch is a row that names the status as ({status}) after words`);
      if (r.br === "dev" && !((kind === "remove" || (kind === "error" && !/said:/.test(String(neu)))) && /(library|error\.message)/i.test(r.t || ""))) bad(`${id}: a client-message branch is a remove row, or an error row without a quote, whose note says the library's error.message is never shown`);
      const out = { id, group: g.id, kind, old, new: String(neu ?? ""), anchors, rules: codes, why, note: r.t || "", refs: r.refs || "", tests, tq: r.tq ? [].concat(r.tq) : null, shared: !!r.shared || g.id === "DS", keep: !!r.keep, m: r.m === undefined ? null : r.m, ax: r.ax || null, lnPin: r.ln === undefined ? null : [].concat(r.ln), x: r.x ? [].concat(r.x) : [], br: r.br || null, dt: r.dt || null, lk: r.lk || null, uses: r.uses ? [].concat(r.uses) : null, lkVals, err: kind === "error" ? { what: r.what, c: r.c, why: r.why, fix: r.fix, safe: r.safe, nosafe: r.nosafe } : null };
      g.rowsResolved.push(out);
      resolved.push(out);
    });
  }

  // A short Old text is found inside the longer string of another row ("Delivery History" inside "Webhook Delivery History"). The row for the
  // longer string owns that line, so the shorter row's anchor there is dropped (a row never loses its last line, and a row anchored by an
  // explicit match, or by section, keeps what it was given).
  const rawOf = new Map();
  for (const g of groups) (g.rows || []).forEach((raw, i) => rawOf.set(`${g.id}.${String(i + 1).padStart(2, "0")}`, rowObject(raw)));
  const owners = new Map(); // "file:line" -> rows anchored there
  for (const r of resolved) for (const a of r.anchors) if (a.file) for (const l of a.lines) { const k = `${a.file}:${l}`; if (!owners.has(k)) owners.set(k, []); owners.get(k).push(r); }
  const nt = (x) => normText(x);
  // the text stands alone on the line (a whole literal or a whole piece of JSX text, a lookup key included): that line stays, because
  // changing the label without its key breaks the lookup
  const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const whole = (file, line, old) => {
    const src = readSource(file); if (!src) return false;
    const re = new RegExp("(?<=[\"'`>}])\\s*" + escRe(nt(old)) + "\\s*(?=[\"'`<{])", "g");
    let m; while ((m = re.exec(src.hay))) if (lineOfOffset(src.starts, m.index + (m[0].length - m[0].trimStart().length)) === line) return true;
    return false;
  };
  let pruned = 0;
  for (const r of resolved) {
    if (r.keep || !r.old) continue;
    const raw = rawOf.get(r.id);
    if (raw.m !== undefined && nt(raw.m) !== nt(r.old)) continue;
    const total = r.anchors.reduce((n, a) => n + (a.lines ? a.lines.length : 0), 0);
    if (total <= 1) continue;
    for (const a of r.anchors) {
      if (!a.file) continue;
      const keep = a.lines.filter((l) => whole(a.file, l, r.old) || !(owners.get(`${a.file}:${l}`) || []).some((o) => o !== r && !o.keep && o.old && nt(o.old).length > nt(r.old).length && nt(o.old).includes(nt(r.old))));
      const remaining = total - pruned - (a.lines.length - keep.length);
      if (keep.length !== a.lines.length && remaining >= 1) { pruned += a.lines.length - keep.length; a.lines = keep; }
    }
    pruned = 0;
  }
  // an anchor that lost every line is removed
  for (const r of resolved) r.anchors = r.anchors.filter((a) => !a.file || a.lines.length);
  return { groups, resolved, problems };
}
