// copy-lib.mjs: shared by build-copy.mjs and check-copy.mjs (Phase 5, Words).
//
// The revision data in ./revisions/*.json is the single source for the words: the page bullets and the revision index
// in kiwi-ui/JOURNEY.md and the shared-strings table in kiwi-ui/DESIGN.md are generated from it, so they cannot drift.
// Nothing here is machine-specific: the repository root is found by walking up from this file to the directory that
// holds kiwi-ui/JOURNEY.md, and every anchor is relative to kiwi-ui/ (the JOURNEY convention; the backend is ../kiwi/).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
function findRoot(dir) {
  for (let d = dir; d !== path.dirname(d); d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, "kiwi-ui", "JOURNEY.md"))) return d;
  }
  throw new Error("repository root not found (no kiwi-ui/JOURNEY.md above this file)");
}
export const ROOT = findRoot(HERE);
export const UI = path.join(ROOT, "kiwi-ui");
export const DESIGN_MD = path.join(UI, "DESIGN.md");
export const JOURNEY_MD = path.join(UI, "JOURNEY.md");
export const REV_DIR = path.join(HERE, "revisions");
export const OUT_DIR = path.join(HERE, "generated");

// ---------------------------------------------------------------------------------------------------------------
// Rules. The ids are the rule table in DESIGN.md § Voice and tone; the checker asserts the two lists agree.
// ---------------------------------------------------------------------------------------------------------------
export const RULES = {
  C1: ["sentence case: one case everywhere, no capitals typed or drawn by CSS", "Redish: lowercase-led labels scan faster; Nielsen #4; the lock's Never list"],
  C2: ["a button names its outcome: verb + object, never Submit, OK or Yes", "Yifrah; Nielsen #2"],
  C3: ["one date and time format, never the browser locale", "Nielsen #4; G12"],
  C4: ["digits, real singulars and plurals, units spelled once", "Redish; Nielsen #4"],
  C5: ["no exclamation marks; the ellipsis character; no emoji; and, not &; no em dashes, but one glyph for no value", "Yifrah; G12 voice rule"],
  C6: ["one word per concept", "Podmajersky terminology agreement; Nielsen #4"],
  C7: ["the sidebar label is the page title", "Nielsen #4; Redish: meaningful headings; TD-21"],
  C8: ["you and Kiwi; never we, our or I; please only for a real favour", "Podmajersky; Yifrah: we-language"],
  C9: ["an error says what happened, why, and what to do", "Yifrah; Nielsen #9"],
  C10: ["raw backend and developer text is quoted after Kiwi's own sentence, or removed", "Nielsen #9; Richards: user need, not system output"],
  C11: ["a confirmation states the consequence first, then permanence, then the way out", "Yifrah stakes-clarity; Nielsen #5"],
  C12: ["an empty state says what goes here and the first step, or who acts", "Redish; NN/g empty-state types; peak-end"],
  C13: ["progress names what is happening, in the present tense", "Nielsen #1; Doherty threshold"],
  C14: ["labels persist, helper text adds information, placeholders are examples, and a line points at a place in words, not by colour", "Redish; WCAG 3.3.2, 1.3.3, 1.4.1; Yifrah"],
  C15: ["an icon-only control is named by a verb phrase, in its tooltip and its aria-label alike", "Nielsen #6; WCAG 4.1.2"],
  C16: ["no claim the product cannot back, and no developer text in the interface", "G12; ai-native: calibrate"],
  C17: ["institution and support details come only from branding config", "plan constraint; src/config/branding.ts"],
  C18: ["American English spelling", "Nielsen #4; the strings already read this way"],
};

// Kinds a row can have, and the rule each one implies by default.
export const KIND_RULE = {
  heading: "C1", button: "C2", cbutton: "C11", label: "C1", helper: "C14", placeholder: "C14", error: "C9",
  empty: "C12", confirm: "C11", announce: "C13", status: "C13", tooltip: "C15", aria: "C15", body: "C8", new: "C12", format: "C3", remove: "C16",
};
export const LABEL_KINDS = new Set(["heading", "button", "cbutton", "label", "tooltip", "aria", "placeholder"]);
// C2's closed carve-out: conventional single-verb controls whose object is clear from context, and the two exits.
export const SINGLE_VERB_OK = new Set(["retry", "dismiss", "undo", "stop", "copy", "apply", "refresh"]);
export const EXIT_WORDS = new Set(["cancel", "close"]);
// ...and the two conventional account controls, whose object is the account. A two-word label whose second word is a particle or a quantifier ("Select all",
// "Approve selected", "Try again") names no object either, so it is held to the same closed list (H12 reads the source's labels, B1 every New one).
export const TWO_WORD_OK = new Set(["sign in", "sign out"]);
export const NON_OBJECT = new Set("in out up down on off again back over all selected more less now next previous first last one it them this that here there".split(" "));
export const namesObject = (label) => {
  const t = String(label).trim(), w = t.split(/\s+/);
  if (w.length >= 3) return true;
  if (w.length === 2) return !NON_OBJECT.has(w[1].toLowerCase()) || TWO_WORD_OK.has(t.toLowerCase());
  return false;
};
export const SENTENCE_KINDS = new Set(["helper", "error", "empty", "confirm", "status", "body", "new", "announce"]);
// Kinds whose text is an explanatory sentence: always ends with a period, a question mark or an ellipsis.
export const PERIOD_KINDS = new Set(["helper", "error", "empty", "confirm", "body", "announce"]);

// ---------------------------------------------------------------------------------------------------------------
// Error anatomy (rule C9): what happened, why (a cause from a closed set), what to do.
// ---------------------------------------------------------------------------------------------------------------
export const CAUSES = {
  net: { line: "Kiwi couldn't reach the server.", fix: "Check your connection, then try again." },
  server: { line: "The server returned an error.", fix: "Try again in a moment." },
  unknown: { line: "The server didn't respond as expected.", fix: "Try again." },
  expired: { line: "Your sign-in has expired.", fix: "Sign in again." },
  denied: { line: null, fix: null }, // custom: who lacks what
  input: { line: null, fix: null }, // custom: the rule that was broken
  conflict: { line: null, fix: null },
  quota: { line: null, fix: null },
  missing: { line: null, fix: null },
  // part of a batch went through: the cause line scopes the same failure to what is left; a page that lists a reason per item
  // ("the results table", "each red row") or counts nothing ("partway through") words it its own way, with the same stem
  partial: { line: "The server didn't respond as expected for the other {m}.", fix: "Refresh the list and try those again." },
};
// On the MCP pages (A-07, A-22, S-08) "the server" would read as the MCP server, so the same four lines name Kiwi's own server instead (a row
// says so with `v: "mcp"`); a line about the MCP server itself names it ("The MCP server didn't respond as expected.") in the row's own why.
export const CAUSES_MCP = {
  net: { line: "Kiwi couldn't reach its server." },
  server: { line: "Kiwi's server returned an error." },
  unknown: { line: "Kiwi's server didn't respond as expected." },
  partial: { line: "Kiwi's server didn't respond as expected for the other {m}." },
};
export const MCP_GROUPS = ["A-07", "A-22", "S-08"];
// The stems a partial result's why must start from: the closed causes it narrows (D1).
export const CAUSE_STEMS = /(?:The|Kiwi's) server (didn't respond as expected|returned an error|didn't accept|refused)|Kiwi couldn't reach (?:the|its) server/;
// A failed write that leaves the form as the person filled it says so, between the cause and the next step. The sentence is one closed string, so a row
// either carries it (`safe`: what keeps the input, with the line that does) or says why it does not (`nosafe`: the reason, with the line that decides it);
// the checker (D11) reads every failed-write row, and reads the page's own catch block to see that it leaves the form alone.
export const SAFE_LINE = "Your changes are still in the form.";
// The verbs of a failed write whose input a person may have typed or chosen; every other "Couldn't <verb>" is an action on an item that exists, a read, or an
// open (EXEMPT_VERBS), and the checker fails on a verb that is in neither list, so a new kind of failure has to be decided.
export const WRITE_VERBS = ["save", "create", "update", "send", "change", "add", "upload", "assign", "enroll", "register"];
export const EXEMPT_VERBS = {
  load: "a read", open: "a read", find: "a read", search: "a read", look: "a read", export: "a download, nothing typed", analyze: "a read of a chart",
  sign: "the sign-in form is the page itself", test: "a button on a saved item", start: "a button on a saved item", process: "a button on a saved file",
  delete: "an action on an item that exists", deactivate: "an action on an item that exists", remove: "an action on an item that exists", unregister: "an action on an item that exists",
  unassign: "an action on an item that exists", revoke: "an action on an item that exists", approve: "an action on a row", reject: "an action on a row",
  reset: "an action on an account", regenerate: "an action on a saved item", copy: "a clipboard action", disable: "a switch", allow: "a button on a request",
  record: "a background write", reorder: "a drag", preview: "a read",
};
export function composeError(r) {
  if (!r.what || !r.c) throw new Error(`error row needs what and c: ${JSON.stringify(r)}`);
  const cause = r.v === "mcp" && CAUSES_MCP[r.c] ? { ...CAUSES[r.c], ...CAUSES_MCP[r.c] } : CAUSES[r.c];
  if (!cause) throw new Error(`unknown cause code "${r.c}"`);
  const why = r.why ?? cause.line;
  const fix = r.fix ?? cause.fix;
  return [r.what, why, r.safe ? SAFE_LINE : null, fix].filter((p) => p && p.trim()).join(" ");
}

// ---------------------------------------------------------------------------------------------------------------
// Source reading with line anchors. Needles and haystacks are normalised the same way: entities decoded, curly quotes
// straightened, escapes removed, whitespace collapsed, so JSX text that wraps across lines still matches.
// ---------------------------------------------------------------------------------------------------------------
export function normText(s) {
  return String(s)
    .replace(/&apos;|&#39;|&rsquo;|&lsquo;|[‘’]/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|[“”]/g, '"')
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&hellip;/g, "…")
    .replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, " ")
    .replace(/\s+/g, " ").trim();
}
const fileCache = new Map();
export function readSource(rel) {
  if (fileCache.has(rel)) return fileCache.get(rel);
  const abs = path.resolve(UI, rel);
  if (!abs.startsWith(ROOT)) throw new Error(`path escapes the repository: ${rel}`);
  if (!fs.existsSync(abs)) { fileCache.set(rel, null); return null; }
  const lines = fs.readFileSync(abs, "utf8").split("\n");
  let hay = ""; const starts = [];
  lines.forEach((l, i) => { starts.push(hay.length); hay += normText(l) + " "; });
  const entry = { hay, starts, lines };
  fileCache.set(rel, entry);
  return entry;
}
export function lineOfOffset(starts, off) {
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= off) lo = mid; else hi = mid - 1; }
  return lo + 1;
}
// All line numbers (1-based) where the needle occurs in the file; [] if absent.
export function findLines(rel, needle) {
  const src = readSource(rel);
  if (!src || !needle) return [];
  const n = normText(needle);
  if (!n) return [];
  const out = []; let from = 0;
  for (;;) {
    const i = src.hay.indexOf(n, from);
    if (i < 0) break;
    // a text that starts or ends with a letter or digit is found as a word or phrase, never inside a longer word: "Delete" is not in "handleDeleteWebhook" (m10)
    const insideWord = (/\w/.test(n[0]) && i > 0 && /\w/.test(src.hay[i - 1])) || (/\w/.test(n[n.length - 1]) && /\w/.test(src.hay[i + n.length] || " "));
    if (insideWord) { from = i + 1; continue; }
    const ln = lineOfOffset(src.starts, i);
    // a comment is not the string: a line that is a comment ("// …", "* …", "{/* … */}") is never an anchor
    const isComment = /^\s*(\/\/|\*|\/\*|\{\s*\/\*)/.test(src.lines[ln - 1] || "");
    if (!isComment && !out.includes(ln)) out.push(ln);
    from = i + Math.max(1, n.length);
    if (out.length >= 40) break;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Exact anchors (the sixth review's m10). An anchor is the line a row's old text sits on, so an implementer opens it and finds the string. A row anchored by a
// neighbouring line (the handler the button runs, the constant that holds the text) passes only when it says why (`ax`) and the text is within 8 lines.
// ---------------------------------------------------------------------------------------------------------------
const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const canonSlots = (s) => normText(s).replace(/\$?\{[^}]*\}/g, "{}");
// The tenth review (C-2): a string the code builds with a conditional piece ("Login failed." and "Login failed. Please contact {SUPPORT_EMAIL}.") is more than one text, one
// reading per branch, and a row's Old is the whole text of ONE reading. readingKey is the form two texts are compared in (every slot reads "{}"); oldKeys is the readings an
// Old stands for (a row whose Old holds `{enabled or disabled}` is the one row both branches share, so it stands for both); isTextReading is a reading of two words or more
// (a one-word label is H12's).
export const readingKey = (s) => canonSlots(s);
export function oldKeys(old) {
  let outs = [normText(old)];
  const alt = /\{([^{}]+?) or ([^{}]+?)\}/;
  for (let i = 0; i < 4; i++) {
    let any = false; const next = [];
    for (const t of outs) { const m = alt.exec(t); if (!m) { next.push(t); continue; } any = true; next.push(t.replace(alt, m[1]), t.replace(alt, m[2])); }
    outs = next; if (!any) break;
  }
  return [...new Set(outs.map(canonSlots))];
}
export const isTextReading = (r) => readingKey(r).replace(/\{\}/g, " ").split(/\s+/).filter((w) => /^[A-Za-z][A-Za-z'\u2019]*[.,!?:;]*$/.test(w)).length >= 2;
const longestPiece = (o) => o.split(/\$?\{[^}]*\}/).map((x) => x.trim()).sort((a, b) => b.length - a.length)[0] || "";
// the text stands alone where it starts on the line: a whole quoted literal or the whole text of a JSX element (the same test resolve.mjs uses to keep a line)
export function wholeAt(file, line, old) {
  const src = readSource(file); if (!src) return false;
  const re = new RegExp("(?<=[\"'`>}])\\s*" + escapeRe(normText(old)) + "\\s*(?=[\"'`<{])", "g");
  let m; while ((m = re.exec(src.hay))) if (lineOfOffset(src.starts, m.index + (m[0].length - m[0].trimStart().length)) === line) return true;
  return false;
}
export function anchorVerdict(file, ln, { old, m, lk, ax, kind }) {
  const src = readSource(file);
  if (!src) return { v: "missing" };
  const o = normText(old);
  if (lk || / · /.test(o)) return { v: "exempt", why: "lookup values" };
  if (kind === "format" || /=>|\.\w+\(|\bnew Date\b|\btoLocale|^type=|^format\(/.test(o)) return { v: "exempt", why: "code expression: the old text is what the code at the anchor shows" };
  const p = longestPiece(o);
  if (p.length < 3) return { v: "exempt", why: "slot only" };
  const lineText = normText(src.lines[ln - 1] || "");
  const tokenRe = new RegExp("(?<![\\w])" + escapeRe(p) + "(?![\\w])");
  // a one-word label ("Delete") is the whole literal or the whole text on its line: the same word inside a longer phrase ("Delete token") is another string, so a row for
  // the word must not anchor it (the seventh review: A-09.10 listed the API token's own tooltip as a site of the webhook's button)
  const oneWord = !/\s/.test(o) && o.length <= 24 && !/[{}]/.test(o);
  if (oneWord) {
    if (wholeAt(file, ln, o)) return { v: "exact" };
  } else if (tokenRe.test(lineText)) return { v: "exact" };
  if (p.length >= 12) {
    const win = [0, 1, 2, 3, 4, 5, 6].map((d) => normText(src.lines[ln - 1 + d] || "")).join(" ");
    if (lineText.includes(p.slice(0, 12)) && win.includes(p)) return { v: "exact", why: "wrapped" };
  }
  // the row matched a fragment of the old text (a sentence split across expressions or lines) and the cited line holds that fragment
  if (!oneWord && m !== undefined && m !== null && m !== false) {
    const mc = canonSlots(m), oc = canonSlots(o);
    const frag = mc.length >= 3 && (oc.includes(mc) || mc.includes(oc) || oc.split("{}").map((x) => x.trim()).filter((x) => x.length >= 3).some((x) => mc.includes(x)));
    if (frag && canonSlots(src.lines[ln - 1] || "").includes(mc.trim())) return { v: "fragment" };
  }
  if (ax) {
    // a stated neighbour: a word of the old text (4 letters or more) stands within 8 lines, or the reason cites the line where the text really is
    const words = o.split(/[^\w']+/).filter((w) => w.length >= 4);
    for (let d = -8; d <= 8; d++) {
      const t = normText(src.lines[ln - 1 + d] || "");
      if (tokenRe.test(t) || words.some((w) => new RegExp("(?<![\\w])" + escapeRe(w) + "(?![\\w])").test(t))) return { v: "stated", d };
    }
    for (const c of citesIn(ax)) {
      if (c.error) continue;
      const lines = fs.readFileSync(c.abs, "utf8").split("\n");
      for (let l = c.from; l <= Math.min(c.to, lines.length); l++) if (tokenRe.test(normText(lines[l - 1] || ""))) return { v: "stated", cited: c.text };
    }
    return { v: "far" };
  }
  // where the text really stands, for the message
  let near = null;
  for (let d = 1; d <= 30 && near === null; d++) for (const t of [d, -d]) if (tokenRe.test(normText(src.lines[ln - 1 + t] || ""))) { near = t; break; }
  return { v: "drift", near };
}

// ---------------------------------------------------------------------------------------------------------------
// Source cites in prose: `File.tsx:123`, `File.tsx:123-130`, `src/pages/File.tsx:12`, `../kiwi/src/x/y.ts:5`. A bare file name resolves to the one file of that
// name in the UI, the backend or the SDK; two files of one name are ambiguous, and a cite then has to say which (a directory in front).
// ---------------------------------------------------------------------------------------------------------------
export const CITE_RE = /(?<![\w./-])((?:\.\.\/)?(?:[\w.-]+\/)*[\w.-]+\.(?:tsx|ts|mjs)):(\d+)(?:-(\d+))?(?![\d-])/g;
let NAME_INDEX = null;
function nameIndex() {
  if (NAME_INDEX) return NAME_INDEX;
  NAME_INDEX = new Map();
  const walk = (d) => {
    let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else { if (!NAME_INDEX.has(e.name)) NAME_INDEX.set(e.name, []); NAME_INDEX.get(e.name).push(p); }
    }
  };
  for (const r of [path.join(UI, "src"), path.join(ROOT, "kiwi", "src"), path.join(ROOT, "kiwi-app-sdk")]) walk(r);
  return NAME_INDEX;
}
const lineCount = (abs) => fs.readFileSync(abs, "utf8").split("\n").length;
// -> { abs, length } or { error }
export function resolveCite(name) {
  const direct = path.resolve(UI, name);
  if (/^\.\.\//.test(name) || /^src\//.test(name)) return fs.existsSync(direct) ? { abs: direct, length: lineCount(direct) } : { error: `${name}: no such file` };
  let cands = nameIndex().get(path.basename(name)) || [];
  if (name.includes("/")) cands = cands.filter((c) => c.endsWith("/" + name));
  if (!cands.length) return { error: `${name}: no such file` };
  if (cands.length > 1) return { error: `${name} is ambiguous (${cands.length} files of that name: write a directory in front)` };
  return { abs: cands[0], length: lineCount(cands[0]) };
}
// The cites in a text, each resolved: [{ text, file, from, to, abs, length, error }]
export function citesIn(text) {
  const out = []; let m; CITE_RE.lastIndex = 0;
  while ((m = CITE_RE.exec(String(text)))) {
    const from = Number(m[2]), to = m[3] ? Number(m[3]) : from;
    const r = resolveCite(m[1]);
    out.push({ text: m[0], file: m[1], from, to, ...r, error: r.error || (from < 1 || to < from || to > r.length ? `${m[0]}: the file has ${r.length} lines` : undefined) });
  }
  return out;
}


// ---------------------------------------------------------------------------------------------------------------
// The proof run and the hand-checked samples (rule-coverage.json). codeHash names the code a proof run was made against, so a summary older than a change to
// the checker, its library, the resolver, the proofs or the TypeScript scanner is stale; manualPopulation counts the rows a hand-checked sample was taken from, so a sample whose
// population has changed since it was read is stale too.
// ---------------------------------------------------------------------------------------------------------------
import crypto from "node:crypto";
export const CODE_FILES = ["check-copy.mjs", "copy-lib.mjs", "resolve.mjs", "proofs.mjs", "scan-ts.mjs"];
export const codeHash = () => crypto.createHash("sha256").update(CODE_FILES.map((f) => fs.readFileSync(path.join(HERE, f), "utf8")).join("\n\u0000\n")).digest("hex").slice(0, 16);
// the New strings (non-kept rows) a hand-checked sample was taken from: {kind: [...], minWords?}, {ids: [...]} or {regex}
export function manualPopulation(rows, pop) {
  return rows.filter((r) => {
    if (r.keep) return false;
    if (pop.ids) return pop.ids.includes(r.id);
    if (pop.regex) return new RegExp(pop.regex, "i").test(r.new);
    if (pop.kind && !pop.kind.includes(r.kind)) return false;
    if (pop.minWords && r.new.trim().split(/\s+/).length < pop.minWords) return false;
    return !!pop.kind;
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Test inventory (the revision index's Tests column). Two kinds of reference, both listed as file:line:
//   - a Testing Library query or text assertion whose argument is a string or a regular expression literal
//     (getByText("Cancel"), getByRole("button", { name: /sign in/i }), getByLabelText, getByPlaceholderText,
//     getByDisplayValue, getByAltText, getByTitle, toHaveTextContent, toHaveAccessibleName, toHaveAttribute("aria-label", …)),
//     matched against the old string: a string literal by equality (or, when it is a sentence of 12 or more characters,
//     by containment either way), a regular expression by running it on the old string;
//   - any other test line with a string literal equal to the old string (or, for a sentence, containing it), such as an expect(…).toBe("…").
// A query with no literal argument (a variable, a function matcher) or a role query with no name cannot break on a
// wording change by itself; the stats count them so the inventory is complete.
// ---------------------------------------------------------------------------------------------------------------
const QUERY_CALL = /\b(get|query|find)(All)?By(Text|Role|LabelText|PlaceholderText|DisplayValue|AltText|Title)\s*\(/g;
const MATCHER_CALL = /\b(toHaveTextContent|toHaveAccessibleName|toHaveDisplayValue|toHaveAccessibleDescription)\s*\(/g;
const ATTR_CALL = /\btoHaveAttribute\(\s*(["'])(aria-label|placeholder|title|alt)\1\s*,/g;
const skipWs = (s, i) => { while (i < s.length && /\s/.test(s[i])) i++; return i; };
// Read a string, template or regular-expression literal at s[i]; anything else (or a template with a slot) is "dynamic".
function readLiteral(s, i) {
  i = skipWs(s, i);
  const c = s[i];
  if (c === '"' || c === "'" || c === "`") {
    let j = i + 1, out = "";
    while (j < s.length && s[j] !== c) {
      if (s[j] === "\\") { out += s[j + 1]; j += 2; continue; }
      if (c === "`" && s[j] === "$" && s[j + 1] === "{") return { kind: "dynamic", end: j };
      out += s[j]; j++;
    }
    return { kind: "string", value: out, end: j + 1 };
  }
  if (c === "/") {
    let j = i + 1, inClass = false, out = "";
    while (j < s.length) {
      if (s[j] === "\\") { out += s[j] + s[j + 1]; j += 2; continue; }
      if (s[j] === "[") inClass = true;
      if (s[j] === "]") inClass = false;
      if (s[j] === "/" && !inClass) break;
      out += s[j]; j++;
    }
    let k = j + 1, flags = ""; while (/[a-z]/.test(s[k] || "")) flags += s[k++];
    return { kind: "regex", value: out, flags, end: k };
  }
  return { kind: "dynamic", end: i };
}
// For getByRole(role, { name: <literal>, exact? }): the name option, or null when there is none.
function roleNameOption(s, i) {
  i = skipWs(s, i);
  if (s[i] !== ",") return null;
  i = skipWs(s, i + 1);
  if (s[i] !== "{") return null;
  let depth = 0, j = i;
  for (; j < s.length; j++) { if (s[j] === "{") depth++; else if (s[j] === "}") { depth--; if (depth === 0) break; } }
  const obj = s.slice(i, j + 1);
  const m = /\bname\s*:\s*/.exec(obj);
  if (!m) return null;
  return { ...readLiteral(obj, m.index + m[0].length), exact: !/exact\s*:\s*false/.test(obj) };
}
// A test can only break on a string that its own rendering reaches, so a reference counts for a row only when the test file
// (directly or through the modules it imports, to a depth of 6) imports a source file the row is anchored to. A regular
// expression such as /password/i would otherwise match every old string that happens to contain the word.
let importGraph = null;
function loadImportGraph() {
  if (importGraph) return importGraph;
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!["node_modules", "dist", "services"].includes(e.name)) walk(p); }
      else if (/\.(tsx?|jsx?)$/.test(e.name)) files.push(p);
    }
  })(path.join(UI, "src"));
  const known = new Set(files);
  const resolveSpec = (from, spec) => {
    if (!spec.startsWith(".")) return null;
    const base = path.resolve(path.dirname(from), spec);
    for (const cand of [base, base + ".ts", base + ".tsx", path.join(base, "index.ts"), path.join(base, "index.tsx")]) if (known.has(cand)) return cand;
    return null;
  };
  const deps = new Map();
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8");
    const out = new Set();
    for (const m of text.matchAll(/(?:import|export)\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)) {
      const r = resolveSpec(f, m[1] || m[2]);
      if (r) out.add(r);
    }
    deps.set(f, out);
  }
  importGraph = { deps, rel: (f) => path.relative(UI, f).split(path.sep).join("/") };
  return importGraph;
}
function closureOf(absTestFile, depth = 6) {
  const { deps, rel } = loadImportGraph();
  const seen = new Set([absTestFile]); let frontier = [absTestFile];
  for (let d = 0; d < depth && frontier.length; d++) {
    const next = [];
    for (const f of frontier) for (const t of deps.get(f) || []) if (!seen.has(t)) { seen.add(t); next.push(t); }
    frontier = next;
  }
  return new Set([...seen].map(rel));
}

let testInv = null;
export function loadTestInventory() {
  if (testInv) return testInv;
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!["node_modules", "services", "dist"].includes(e.name)) walk(p); }
      else if (/\.test\.(tsx?|jsx?)$/.test(e.name)) files.push(p);
    }
  })(path.join(UI, "src"));
  const queries = []; const fileInfo = [];
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8");
    const name = path.basename(f);
    const reach = closureOf(f);
    const lines = text.split("\n");
    const lineOf = (idx) => text.slice(0, idx).split("\n").length;
    let m;
    QUERY_CALL.lastIndex = 0;
    while ((m = QUERY_CALL.exec(text))) {
      const by = m[3];
      const lit = readLiteral(text, QUERY_CALL.lastIndex);
      const q = { name, reach, line: lineOf(m.index), fn: m[0].replace(/\s*\($/, ""), by };
      if (by === "Role") {
        const opt = roleNameOption(text, lit.end);
        if (!opt) q.kind = "role";
        else { q.kind = opt.kind; q.value = opt.value; q.flags = opt.flags; q.exact = opt.exact; }
      } else {
        q.kind = lit.kind; q.value = lit.value; q.flags = lit.flags;
        q.exact = !/exact\s*:\s*false/.test((text.slice(lit.end, lit.end + 160).split(")")[0]) || "");
      }
      queries.push(q);
    }
    MATCHER_CALL.lastIndex = 0;
    while ((m = MATCHER_CALL.exec(text))) {
      const lit = readLiteral(text, MATCHER_CALL.lastIndex);
      queries.push({ name, reach, line: lineOf(m.index), fn: m[1], by: "Matcher", kind: lit.kind, value: lit.value, flags: lit.flags, exact: false });
    }
    ATTR_CALL.lastIndex = 0;
    while ((m = ATTR_CALL.exec(text))) {
      const lit = readLiteral(text, ATTR_CALL.lastIndex);
      queries.push({ name, reach, line: lineOf(m.index), fn: "toHaveAttribute " + m[2], by: "Attr", kind: lit.kind, value: lit.value, flags: lit.flags, exact: true });
    }
    fileInfo.push({ name, reach, lines: lines.map((l) => [...l.matchAll(/(["'`])((?:\\.|(?!\1).)*?)\1/g)].map((m) => normText(m[2])).filter(Boolean)) });
  }
  const stats = {
    testFiles: files.length,
    queries: queries.length,
    queryFiles: new Set(queries.map((q) => q.name)).size,
    string: queries.filter((q) => q.kind === "string").length,
    regex: queries.filter((q) => q.kind === "regex").length,
    regexFiles: new Set(queries.filter((q) => q.kind === "regex").map((q) => q.name)).size,
    roleOnly: queries.filter((q) => q.kind === "role").length,
    dynamic: queries.filter((q) => q.kind === "dynamic").length,
    // the figure the research brief quoted: getByText + getByRole + getByLabelText + getAllByText
    briefKinds: 0, briefFiles: 0,
  };
  const brief = new Set(); let briefN = 0, mentions = 0;
  for (const f of files) {
    const t = fs.readFileSync(f, "utf8");
    // the calls, not the mentions: an import or a destructuring names the function without calling it
    const n = (t.match(/\b(getByText|getByRole|getByLabelText|getAllByText)\s*\(/g) || []).length;
    mentions += (t.match(/\b(getByText|getByRole|getByLabelText|getAllByText)\b/g) || []).length;
    if (n) { briefN += n; brief.add(f); }
  }
  stats.briefKinds = briefN; stats.briefFiles = brief.size; stats.briefMentions = mentions;
  testInv = { queries, fileInfo, stats };
  return testInv;
}
// All test references to an old string: [{ name, line, via }], via = "string" | "regex" | "text".
// The eighth review: a string query that is a PART of the old string (not the whole of it, and not containing it) is a reference to the sentence only when it is a whole
// sentence of it: it starts where a sentence starts and ends where one ends. A query for a term that the sentence happens to contain ("Code Interpreter" inside A-22.31's
// sentence, where the tool's own name and badge are drawn by other elements) is not a reference to the sentence, so the Tests column does not list it.
export function sentencePartOf(v, n) {
  if (!v || !n || !n.includes(v)) return false;
  if (v === n) return true;
  const i = n.indexOf(v), j = i + v.length;
  const starts = i === 0 || /[.?!\u2026]\s$/.test(n.slice(0, i));
  const ends = j === n.length || (/[.?!\u2026]$/.test(v) && /^\s/.test(n.slice(j))) || /^[.?!\u2026]+(?:\s|$)/.test(n.slice(j));
  return starts && ends;
}
export function testRefs(old, srcFiles = []) {
  const n = normText(old);
  // a two- or three-letter old text ("OR", "RAG") counts only as an equal literal or an equal query: a substring would match everything
  const short = n.length < 4;
  if (n.length < 2) return [];
  const reaches = (reach) => srcFiles.some((f) => reach.has(f));
  const nl = n.toLowerCase();
  const variants = [n, n.replace(/\{[^}]*\}/g, "1"), n.replace(/\{[^}]*\}/g, "x")];
  const { queries, fileInfo } = loadTestInventory();
  const out = []; const seen = new Set();
  const push = (name, line, via) => { const k = name + ":" + line; if (!seen.has(k)) { seen.add(k); out.push({ name, line, via }); } };
  for (const q of queries) {
    if (!reaches(q.reach)) continue;
    if (q.kind === "string") {
      const v = normText(q.value);
      if (!v) continue;
      const vl = v.toLowerCase();
      // a substring query ("Kiwi") would match every old string that contains the word, so it counts only when it is a
      // phrase of 10 or more characters, or the whole old string
      const hit = short
        ? (q.exact ? v === n : vl === nl)
        : q.exact
          ? v === n || (v.length >= 12 && sentencePartOf(v, n)) || (n.length >= 12 && v.includes(n))
          : vl === nl || (vl.length >= 10 && nl.includes(vl)) || (nl.length >= 10 && vl.includes(nl));
      if (hit) push(q.name, q.line, "string");
    } else if (q.kind === "regex") {
      let rx; try { rx = new RegExp(q.value, q.flags); } catch { continue; }
      if (variants.some((v) => { rx.lastIndex = 0; return rx.test(v); })) push(q.name, q.line, "regex");
    }
  }
  // any other test line that quotes the old string: an equal string literal, or for a sentence (12 or more characters)
  // a literal that contains it or is contained by it; a bare word in a variable name or a comment is not a mention
  // (an equal literal counts at any length, as a fixture or a query argument: `toolType: "RAG"`; the containment tests need a sentence)
  {
    for (const f of fileInfo) if (reaches(f.reach)) f.lines.forEach((lits, i) => {
      // a literal that is a WHOLE SENTENCE of the old string counts from 12 characters, the bar a query has (the tenth review: `alert('Login failed.')` is 13 characters, under the 20 that a
      // fragment needs, and was in no cell although it is the first sentence of S-07.03's Old)
      if (lits.some((t) => t === n || (n.length >= 12 && t.includes(n)) || (n.length >= 12 && t.length >= 20 && t.split(" ").length >= 3 && n.includes(t)) || (n.length >= 12 && t.length >= 12 && /\s/.test(t) && sentencePartOf(t, n)))) push(f.name, i + 1, "text");
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.line - b.line);
}
// Test references of the other two kinds (the Tests column's `n` and `k`):
//   n  a test that ALREADY queries the row's NEW text. It is a reference because the string it asks for is about to appear in a second
//      place, or in the first (AgentStepChain.test.tsx:80 asks for the header "Working…", and the row that makes "Working…" the label of a
//      step with no name would make that query find two elements). Only a string query that equals the New text counts (a regular
//      expression that happens to match it would list nearly every row).
//   k  a test that queries a part of the old string the row KEEPS (the dots of the loader: `getByText('.')`, '..', '...'); the row names
//      the strings in `tq`, and an equal query that reaches the row's source file is listed.
// Both skip a line the old string already lists.
function stringQueryRefs(wanted, srcFiles, via, alreadyListed, minLen) {
  const out = []; const seen = new Set(alreadyListed.map((t) => t.name + ":" + t.line));
  if (!srcFiles.length) return out;
  const want = new Set(wanted.map((w) => normText(w)).filter((w) => w.length >= minLen));
  if (!want.size) return out;
  const reaches = (reach) => srcFiles.some((f) => reach.has(f));
  for (const q of loadTestInventory().queries) {
    if (q.kind !== "string" || !reaches(q.reach)) continue;
    const v = normText(q.value || "");
    if (!want.has(v)) continue;
    const k = q.name + ":" + q.line;
    if (seen.has(k)) continue;
    seen.add(k); out.push({ name: q.name, line: q.line, via });
  }
  return out;
}
export function newTextRefs(neu, srcFiles = [], alreadyListed = []) {
  const n = normText(neu);
  // a template or an example is not a literal a test can ask for; a very short string would match every query for the same word
  if (!n || /[{}]/.test(n) || n.length < 4) return [];
  return stringQueryRefs([n], srcFiles, "new", alreadyListed, 4);
}
export function keptRefs(strings, srcFiles = [], alreadyListed = []) {
  return stringQueryRefs([].concat(strings || []), srcFiles, "kept", alreadyListed, 1);
}

// ---------------------------------------------------------------------------------------------------------------
// Lints. Used on every new string (the checker fails on a hit) and, in a kind-independent subset, on the whole source.
// ---------------------------------------------------------------------------------------------------------------
export const PROPER = new Set([
  "Kiwi", "Google", "OAuth", "OpenID", "MCP", "PDF", "API", "CSV", "SSO", "ID", "IDs", "URL", "URLs", "HTML", "JSON", "HMAC",
  "HTTP", "HTTPS", "SSE", "UTC", "AI", "Python", "R", "ChatGPT", "OpenAI", "Qwen", "KaTeX", "PNG", "JPG", "JPEG", "WebP", "RFC",
  "Shift", "Enter", "Esc", "Escape", "Tab", "SMTP", "UUID", "URI", "LLM", "UI", "OK",
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "January", "February", "March", "April", "June", "July", "August", "September", "October", "November", "December",
]);
// Names of controls and pages that a sentence may refer to exactly as the screen spells them ("Select Retry").
export const UI_REFS = new Set(["Retry", "Stop", "Dismiss", "Undo", "Cancel", "Refresh", "Apply", "Close", "Send", "Save", "Copy", "Edit", "Display", "Experiments", "Materials", "Scratchpad", "Classes", "Users", "Webhooks", "Reshuffle", "Recompute", "Seeded", "Error", "Enroll"]);
const ACRONYMS_OK = new Set([...PROPER].filter((w) => /^[A-Z]{2,}s?$/.test(w)));
const BANNED = [
  [/whitelist/i, "terminology: allowlist, not whitelist"],
  [/kiwi platform/i, "terminology: Kiwi, not Kiwi Platform"],
  [/\blog ?in\b|\blogin\b|\blogout\b|\blog ?out\b|\blogged in\b|\blogged out\b/i, "terminology: sign in and sign out"],
  [/\bprofessor/i, "terminology: instructor"],
  [/system prompt/i, "terminology: instructions"],
  [/\bthe tutor\b/i, "terminology: Kiwi, not \"the tutor\" (C8)"],
  [/course image/i, "terminology: cover image"],
  [/\boops\b|\bwhoops\b|\buh-?oh\b/i, "no Oops"],
  [/\bplease\b/i, "no please (ask directly)"],
  [/\bfailed to\b/i, "no 'Failed to': say what could not be done"],
  [/^invalid\b/i, "no 'Invalid …': say what is wrong"],
  [/\bclick\b/i, "select, not click (works for keyboard, touch and pointer)"],
  [/are you sure/i, "no 'Are you sure?': state the consequence"],
  [/\bai-powered\b|powered by ai|supercharge|seamless|\bunlock\b|\bleverage\b|\bmagic\b|\bsmart\b/i, "no hype or AI claims"],
  [/\b(we|our|ours)\b|\bus\b|\bI('m|'ll|'ve|'d)?\b/, "no we, our or I in product chrome"],
  // the ninth review: "My classes" is first person; what belongs to the reader is "Your" (C8)
  [/\b[Mm]y\b|\b[Mm]ine\b/, "no we, our or I in product chrome: Your, not My, for what belongs to the reader"],
  [/\(s\)|\(es\)|\(ies\)/, "real plurals, not (s)"],
  [/ & /, "and, not &"],
  [/\.\.\./, "use the ellipsis character"],
  [/!/, "no exclamation marks"],
  [/\u2014/, "no em dashes in interface copy (C5)"],
  [/[\u2018\u2019\u201C\u201D]/, "straight quotes only (C5)"],
  [/VITE_|\.env\b|\bbackend\b|known issue|restart (the )?(server|backend)|stack ?trace/i, "no developer text in the interface"],
  [/\bpayloads?\b/i, "terminology: data, not payload"],
  [/\bengines?\b/i, "terminology: model, not engine"],
  [/\bsuccessful(ly)?\b/i, "no \"successfully\": say what happened, in one past-tense line (Success tone)"],
  [/\bcourses?\b/i, "terminology: class, not course"],
  [/\bpick(s|ed|ing)?\b/i, "terminology: choose, not pick (one verb for taking an option, a file or a date)"],
  [/\bnull\b|\bundefined\b|\bNaN\b|\bmalformed\b|\bexception\b|\bHTTP \d{3}\b/, "no developer text in the interface"],
  [/\p{Extended_Pictographic}/u, "no emoji"],
  [/\btoLocale(Date|Time)?String\b/, "no browser-locale date formats"],
];
const stripSlots = (s) => s.replace(/\{[^}]*\}/g, "§");
// ---------------------------------------------------------------------------------------------------------------
// The rule-coverage audit (sixth review). Rules the guide wrote that had no code behind them. Each entry is a lint with an id; lintString runs it over every
// New string, every kept string and every example the guide writes, and lintSource (scope "both") over every string in the source. `prove-checks.mjs`
// plants a defect for each entry and fails if the lint does not catch it.
// ---------------------------------------------------------------------------------------------------------------
const MON_RE = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
const MONTH_NAMES = "January|February|March|April|June|July|August|September|October|November|December";
// American spellings (C18): the British forms the product's own strings could slip into
const BRITISH = "enrol|enrols|enrolment|enrolments|enrolled(?!\\b)|analyse|analysed|analysing|analyses(?= (?:the|your|a|data)\\b)|cancelled|cancelling|colour|colours|behaviour|behaviours|organisation|organisations|organise|organised|organising|favourite|favourites|centre|centres|licence|catalogue|catalogues|programme|programmes|grey|whilst|amongst|judgement|fulfil|travelling|labelled|labelling|modelling|customise|customised|customisation|optimise|optimised|summarise|summarised|recognise|recognised|authorise|authorised|authorisation|initialise|initialised|synchronise|synchronised|minimise|maximise|visualise|visualisation|normalise|neighbour|honour|favour|practise|defence|offence|artefact|aeroplane|storey|tyre|cheque|mum";
const TERM_LINTS = [
  [/\bslugs?\b/i, "C6: identifier, not slug"],
  [/\bconfigs?\b/i, "C6: setup, not config"],
  [/\bvariant groups?\b/i, "C6: group (the students) and variant (the chat setup), not variant groups"],
  [/\benrolled users\b/i, "C6: student, user or roster, not enrolled users"],
  [/\bconversations?\b/i, "C6: chat, not conversation"],
  [/\b(?:AI|design|chat) assistant\b/i, "C6: the assistant, not an AI, design or chat assistant"],
  [/\bout of tokens\b/i, "C6: usage limit, not out of tokens"],
  [/\bcode space\b|\bIDE\b/, "C6: scratchpad (the tab) and Code (its first file tab), not code space or IDE"],
  [/\bsession (?:has |is )?(?:expired|timed out)\b/i, "C6: the sign-in has expired, not the session"],
  // C6 and C16: the webhook's Delete only switches it off (webhooks.service.ts:173-177: isActive false), so a string says deactivate for it (the seventh review's X1)
  [/\b(?:delete|deletes|deleted|deleting|remove|removes|removed|removing) (?:this |the |a |an |your )?(?:active |inactive )?webhooks?\b|\bwebhooks? (?:was |is |has been |will be )?(?:deleted|removed)\b/i, "C6: deactivate, for a webhook (it stops receiving events and can be turned on again), not delete or remove"],
  // C7: a page is named by its sidebar label (§ Page names), never by the title it had
  [/\buser management\b/i, "C7: Users is the page's name, not User Management"],
  [/\bemail management\b/i, "C7: System email is the page's name, not Email Management"],
  [/\bMCP server (?:registry|management)\b/i, "C7: MCP servers is the page's name, not MCP Server Registry or Management"],
  [/\bkiwi apps management\b/i, "C7: App registry is the page's name, not Kiwi Apps Management"],
  [/\bwebhook management\b/i, "C7: Webhooks is the page's name, not Webhook Management"],
  [/\bwebhook event approvals\b|\bevent approvals\b/i, "C7: Webhook approvals is the page's name, not Event Approvals"],
  [/\bMCP settings\b/i, "C7: Class MCP and tools is the page's name, not MCP Settings"],
];
// Terms the guide scopes to pages (§ Terminology): a word the table allows in one place and bans in another. `where` names the groups (a page id) and the files (a
// path fragment) the ban applies to, or, for `only`, the places that are the one exception. Read over every New string by D8, and over every kept string and every
// source string no row touches by H17.
export const SCOPED_TERMS = [
  { id: "session", re: /\bsessions?\b/i, only: { groups: ["A-03", "A-18"], files: [/Analytics/] }, msg: "C6: session is the analytics word; a chat is a chat and the signed-in period is the sign-in" },
  { id: "assignment", re: /\bassignments?\b/i, bans: { groups: ["A-06", "A-15"], files: [/FeatureFlags/] }, msg: "C6: feature flag or flag, not assignment, on the flag pages" },
  { id: "prompt", re: /\bprompts?\b/i, bans: { groups: ["A-13", "A-20", "A-21"], files: [/pages\/admin\/ClassEdit/, /experiments\//] }, msg: "C6: instructions (what staff write for Kiwi), not prompt, on the class and experiment pages" },
  { id: "response", re: /\bresponses?\b/i, bans: { groups: ["SR-6"], files: [/components\/Chat\//] }, msg: "C6: answer, not response, in the chat" },
  { id: "assistant", re: /\bassistants?\b/i, bans: { groups: ["S-01", "S-02", "S-03", "S-04", "S-05", "S-06", "S-07", "S-08", "S-09", "S-10", "SR-6"], files: [/components\/Chat\//, /pages\/(?:Login|Register|Consent)/] }, msg: "C6: Kiwi is the tutor and the assistant is the experiment panel; students never see the word assistant for Kiwi" },
];
export function scopedTermHits(text, where = {}) {
  const hits = [];
  const inGroup = (gs) => gs.includes(where.group || "");
  const inFile = (fs_) => fs_.some((re) => re.test(where.file || ""));
  for (const t of SCOPED_TERMS) {
    if (!t.re.test(text)) continue;
    if (t.only) { if (!(inGroup(t.only.groups) || inFile(t.only.files))) hits.push(t.msg); }
    else if (inGroup(t.bans.groups) || inFile(t.bans.files)) hits.push(t.msg);
  }
  return hits;
}
export const AUDIT = [
  // C1: a capital on the first word and nowhere else but names; a standalone capital "A" in the middle of a sentence is a typed capital
  { id: "C1-A", rule: "C1", scope: "both", test: (t) => {
    const w = stripSlots(t).split(/\s+/).filter(Boolean); const out = [];
    w.forEach((x, i) => { if (i > 0 && /^A[,.;:]?$/.test(x) && !/[.!?:…]$/.test(w[i - 1]) && w[i - 1] !== "e.g." && !/^(?:Variant|Plan|Option|Lane|Group|Column|Version|Type|Part|Section|Step|Page|Response|Answer|Class|Model|Side|Arm|Condition|Vitamin|Grade)$/.test(w[i - 1]) && /^[a-z]/.test(w[i + 1] || "")) out.push("C1: capital mid-sentence: A"); });
    return out; } },
  // C1: every label, button, tooltip, name, heading and sentence opens with a capital (an e.g. example, a bracket, a digit, a slot and a code name are not words)
  { id: "C1-B", rule: "C1", scope: "string", test: (t, ctx) => {
    if (!(LABEL_KINDS.has(ctx.kind) || SENTENCE_KINDS.has(ctx.kind))) return [];
    const u = t.trim().replace(/^["'“]+/, "");
    if (!u || /^(e\.g\.|\{|\(|\[|\d|[^A-Za-z])/.test(u) || /^[a-z0-9]+([_.:-][a-z0-9]+)+\b/.test(u) || /^[a-z][a-z0-9]*_/.test(u) || /\.[a-z]{2,4}$/.test(u)) return [];
    return /^[a-z]/.test(u) ? [`C1: begins with a lowercase letter (${u.split(/\s+/)[0]})`] : []; } },
  // C2: a button is a verb and an object on one line: five words is the longest in the product, so a longer label is a sentence
  { id: "C2-A", rule: "C2", scope: "string", test: (t, ctx) => (ctx.kind === "button" || ctx.kind === "cbutton") && t.trim().split(/\s+/).length > 5 ? ["C2: a button of more than five words is a sentence, not a verb and an object (one line at 1280 px)"] : [] },
  // C3: one date format. A month before the day, a numeric date, a 12-hour clock and a month-first long date are the shapes the browser's locale writes
  { id: "C3-A", rule: "C3", scope: "both", test: (t) => {
    const s = t.replace(/`[^`]*`/g, " "); const out = [];
    if (new RegExp(`\\b(?:${MON_RE}|${MONTH_NAMES})[a-z]*\\.?\\s+\\d{1,2}(?!\\d)(?!:)`).test(s)) out.push("C3: a date writes the day before the month (17 Oct 2026), not Oct 17");
    if (/(?<![\w.:/-])\d{1,2}\/\d{1,2}\/\d{2,4}(?![\w/])/.test(s) || /\b\d{4}[/.]\d{1,2}[/.]\d{1,2}\b/.test(s) || /\b\d{1,2}[-.]\d{1,2}[-.]\d{2,4}\b/.test(s)) out.push("C3: a numeric date (10/17/2026, 2026/10/17, 17-10-2026) is the browser's locale, not D MMM YYYY");
    if (/(?<![\d:])(?:1[0-2]|[1-9])(?::[0-5]\d)?\s?(?:am|pm|a\.m\.|p\.m\.)\b/i.test(s)) out.push("C3: a time is 24-hour HH:mm, not a 12-hour clock");
    if (/(?<![\w-])\d{4}-\d{2}-\d{2}(?![\w.-]*\.(?:csv|json|txt))(?!T)(?<![_/-]\d{4}-\d{2}-\d{2})/.test(s) && !/_\d{4}-\d{2}-\d{2}/.test(s)) out.push("C3: an ISO date belongs in a file name, not in a sentence");
    return out; } },
  // C4: digits, a comma from 1,000, a unit written one way
  { id: "C4-A", rule: "C4", scope: "both", test: (t) => {
    const s = t.replace(/`[^`]*`/g, " ").replace(/\{[^}]*\}/g, "§"); const out = [];
    for (const m of s.matchAll(/(?<![\w.,:/#$§-])(\d{4,})(?![\w,]|\.\d)/g)) if (!/^(19|20)\d\d$/.test(m[1])) out.push(`C4: a number from 1,000 has a comma (${m[1]})`);
    return out; } },
  { id: "C4-B", rule: "C4", scope: "both", test: (t) => {
    const s = t.replace(/`[^`]*`/g, " ").replace(/"[^"]*"/g, "§");
    const m = /\b(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:[a-z]+\s+)?[a-z]{3,}s\b/i.exec(s);
    return m ? [`C4: digits for numbers (${m[0]})`] : []; } },
  { id: "C4-C", rule: "C4", scope: "both", test: (t) => {
    const s = t.replace(/`[^`]*`/g, " "); const out = [];
    for (const m of s.matchAll(/(?:\d|\}|§)\s?(mins|minutes?|hrs?|secs?)\b/gi)) out.push(`C4: a unit is written one way: min, hours, days, seconds (${m[0].trim()})`);
    for (const m of s.matchAll(/\bcount (minute|min|hr|sec)\b/g)) out.push(`C4: write the unit in its one form: {n} min, {n: count hour}, {n: count day}, {n: count second} (${m[0]})`);
    return out; } },
  // C5: no dash of any kind in a sentence (the two kept dashes are the empty-value glyph and the en dash in a range, both read by enDashHits and H19)
  { id: "C5-A", rule: "C5", scope: "both", test: (t) => /(?<=\S)\s(?:-{1,2}|[‐-‒])\s(?=\S)/.test(t.replace(/`[^`]*`/g, " ")) ? ["C5: no dash in a sentence: a hyphen with spaces around it is a dash (use a full stop, a colon or a comma)"] : [] },
  { id: "C5-B", rule: "C5", scope: "string", test: (t, ctx) => LABEL_KINDS.has(ctx.kind) && ctx.kind !== "placeholder" && /:$/.test(t.trim()) ? ["C5: a name (a label, a heading, a button) takes no colon"] : [] },
  // C6: the words of the terminology table that no earlier lint held
  { id: "C6-A", rule: "C6", scope: "both", test: (t) => { const s = stripSlots(t).replace(/"[^"]*"/g, "§"); return TERM_LINTS.filter(([re]) => re.test(s)).map(([, m]) => m); } },
  // C8: "We", "Our" and "Let's" are the same person as "we" and "our" (the case-insensitive form of the pronoun rule)
  { id: "C8-A", rule: "C8", scope: "string", test: (t) => { const s = stripSlots(t).replace(/"[^"]*"/g, "§"); return /\b(?:we|our|ours)\b|\blet'?s\b|\blet us\b/i.test(s) ? ["C8: no we, our or let's in product chrome (Kiwi in the third person)"] : []; } },
  // C9: a vague error is a dead end, and a blame sentence puts the reader at fault
  { id: "C9-A", rule: "C9", scope: "both", test: (t) => /\bsomething went wrong\b|\ban? (?:unexpected |unknown )?error (?:has )?occurred\b|\bunexpected error\b|\bunknown error\b|\bwent wrong\b/i.test(t) ? ["C9: a vague error is a dead end: say what could not be done, why, and what to do"] : [] },
  { id: "C9-B", rule: "C9", scope: "both", test: (t) => /\byou (?:entered|typed|forgot|failed|must have|made a mistake|did not|didn't enter)\b|invalid input|\byour fault\b/i.test(t) ? ["C9: no blame: the rule that was broken is stated, not the reader's act"] : [] },
  // C10: a reason phrase is not the server's words
  { id: "C10-A", rule: "C10", scope: "both", test: (t) => /\{(statusText|reason|statusMessage)\}/.test(t) ? ["C10: a reason phrase is never quoted: the cause line stands in for it"] : [] },
  // C11: a confirmation states what happens, then that it is permanent; "This action cannot be undone" says only the second
  { id: "C11-A", rule: "C11", scope: "both", test: (t) => /\bthis action (?:cannot|can't|can not) be undone\b/i.test(t) ? ["C11: say what happens, then \"This can't be undone.\", not \"This action cannot be undone\""] : [] },
  // C12: an empty state names what is missing and the first step, never "Nothing here" or "No results found"
  { id: "C12-A", rule: "C12", scope: "both", test: (t) => /^\s*(?:nothing here|nothing found|no results?(?: found)?|no (?:data|items?|entries|records|results) (?:available|found)|no [a-z ]{2,30} found)\s*[.!]?\s*$/i.test(t) ? ["C12: an empty state says \"No {things} yet\" or \"No {things} match\", not \"Nothing here\" or \"No … found\""] : [] },
  // C13: a progress line never invents a percentage
  { id: "C13-A", rule: "C13", scope: "string", test: (t, ctx) => (ctx.kind === "status" || ctx.kind === "announce") && /^\s*[A-Z][a-z]+ing\b/.test(t) && /\d\s?%/.test(t) ? ["C13: a progress line states no percentage nobody measured"] : [] },
  // C13: a progress line is an -ing verb and its object, then the ellipsis character (a caption such as "Showing the first 50 users" is not progress)
  { id: "C13-B", rule: "C13", scope: "string", test: (t, ctx) => (ctx.kind === "status" || ctx.kind === "announce" || ctx.kind === "progress") && /^(?:Loading|Saving|Sending|Creating|Updating|Deleting|Uploading|Searching|Analyzing|Connecting|Signing|Opening|Checking|Reading|Registering|Testing|Enrolling|Approving|Rejecting|Adding|Removing|Assigning|Downloading|Exporting|Importing|Refreshing|Retrying|Starting|Stopping|Preparing|Generating|Fetching|Syncing|Running|Applying|Disabling|Enabling|Regenerating|Revoking)\s+\S/.test(t.trim()) && !/…$/.test(t.trim()) && !/\{dots\}$/.test(t.trim()) ? ["C13: a progress line ends with the ellipsis character (Loading chats…)"] : [] },
  // C14: a label carries no asterisk and says "(optional)" in lowercase, and a placeholder is an example, never an instruction
  { id: "C14-A", rule: "C14", scope: "string", test: (t, ctx) => (["label", "heading"].includes(ctx.kind) && (/\*\s*$/.test(t.trim()) || /\((?:Optional|required|Required)\)/.test(t))) ? ["C14: no asterisk in a label; an optional field ends \"(optional)\" and a required one says nothing"] : [] },
  { id: "C14-B", rule: "C14", scope: "string", test: (t, ctx) => ctx.kind === "placeholder" && /^(?:Enter|Type|Select|Choose|Input|Please|Your|Put)\b/.test(t.trim()) ? ["C14: a placeholder is an example (e.g. …), not an instruction or a second label"] : [] },
  // C14: text that points at a place says where in words. A colour is not a pointer: "Each red row says why" fails the reader who cannot tell red from the row's other colours and the
  // one who hears the page read aloud (WCAG 1.3.3 and 1.4.1; the lock's "Never the only signal"). The nouns are the places and things a line points at; the verbs are how it says what it points with.
  { id: "C14-C", rule: "C14", scope: "both", test: (t) => {
    const colour = "red|green|blue|yellow|orange|amber|purple|violet|pink|gr[ae]y|teal|cyan|magenta";
    const noun = "rows?|chips?|buttons?|banners?|badges?|icons?|text|labels?|cells?|dots?|lines?|items?|fields?|boxe?s?|messages?|alerts?|sections?|tabs?|links?|bars?|cards?|columns?|tags?|markers?|marks?|flags?|borders?|outlines?|highlights?|warnings?|errors?|notices?|ones?|stars?|asterisks?|entries|entry|files?";
    const verb = "marked|shown|highlighted|colou?red|indicated|flagged|outlined|displayed|written|printed|underlined|circled";
    const s = stripSlots(t).replace(/`[^`]*`/g, " ");
    const m = new RegExp(`\\b(?:${colour})\\s+(?:${noun})\\b|\\b(?:${verb})\\s+(?:in\\s+)?(?:${colour})\\b`, "i").exec(s);
    return m ? [`C14: a colour is not a pointer (WCAG 1.3.3, 1.4.1): say where in words ("Each failed row"), not by colour ("${m[0]}")`] : []; } },
  // C16: a claim the product cannot back
  { id: "C16-A", rule: "C16", scope: "both", test: (t) => /\b(?:knows everything|understands (?:you|how|your)|guarantee[ds]?|accurate (?:answers?|results?)|always (?:right|correct|accurate)|never (?:wrong|makes? mistakes?)|100% (?:accurate|correct|private|safe)|perfect(?:ly)?|flawless(?:ly)?|effortless(?:ly)?|revolutionary|cutting-edge|state-of-the-art|best-in-class|world-class)\b/i.test(t) ? ["C16: a claim the product cannot back (accuracy, understanding, perfection)"] : [] },
  // C17: an email address or an institution's name typed into a string (branding config holds both)
  { id: "C17-A", rule: "C17", scope: "both", test: (t) => { const s = t.replace(/`[^`]*`/g, " ").replace(/\{[^}]*\}/g, "§"); const out = [];
    if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(s) && !/(?:e\.g\.|example\.(?:com|org|edu)|your-?(?:name|email)|user@|name@)/i.test(s)) out.push("C17: a support or institution email address comes from branding config ({SUPPORT_EMAIL}), never typed");
    if (/\b(?:University|College|Institute)\b/.test(s) && !/\b(?:university|college|institute)\b/i.test(s.replace(/\b(?:University|College|Institute)\b/g, ""))) out.push("C17: an institution's name comes from branding config ({INSTITUTION_NAME}), never typed");
    return out; } },
  // C18: American English
  { id: "C18-A", rule: "C18", scope: "both", test: (t) => { const m = new RegExp(`\\b(?:${BRITISH})\\b`, "i").exec(stripSlots(t).replace(/"[^"]*"/g, "§")); return m ? [`C18: American spelling (${m[0]})`] : []; } },
];
export function lintString(text, kind, allow = []) {
  const t = String(text);
  const hits = [];
  if (!t.trim() || kind === "remove") return hits;
  for (const [re, msg] of BANNED) {
    // a quoted label ("I agree to participate") or quoted server text may contain a pronoun; the pronoun rule skips quotes
    const subject = msg.startsWith("no we, our or I") ? stripSlots(t).replace(/"[^"]*"/g, "§") : stripSlots(t);
    if (re.test(subject)) hits.push(msg);
  }
  for (const h of enDashHits(t)) hits.push(`an en dash outside a date or number range (C5): "${h}"`);
  const words = stripSlots(t).replace(/"([^"]*[.!?])"/g, "§.").replace(/"[^"]*"/g, "§").split(/\s+/).filter(Boolean);
  // all-caps words
  for (const w of words) {
    const core = w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
    if (core.length >= 2 && core === core.toUpperCase() && /[A-Z]/.test(core) && !ACRONYMS_OK.has(core) && !/\d/.test(core)) hits.push(`capitals typed in the string: ${core}`);
  }
  // case
  const lowerThanSentence = (idx, w, prev) => {
    const core = w.replace(/^[^A-Za-z§]+|[^A-Za-z§]+$/g, "").replace(/'s$/, "");
    if (!/^[A-Z][a-z]/.test(core) || PROPER.has(core) || UI_REFS.has(core)) return false;
    if (idx === 0) return false;
    if (prev && /[.!?:…]["')\]]*$/.test(prev)) return false; // new sentence
    if (prev && /^["'(“]$/.test(prev)) return false;
    return true;
  };
  if (LABEL_KINDS.has(kind) && words.length >= 2) {
    words.forEach((w, i) => { if (lowerThanSentence(i, w, words[i - 1])) hits.push(`title case: ${w}`); });
  } else if (SENTENCE_KINDS.has(kind)) {
    words.forEach((w, i) => { if (lowerThanSentence(i, w, words[i - 1])) hits.push(`capital mid-sentence: ${w}`); });
  }
  // end punctuation
  if (LABEL_KINDS.has(kind) && /\.$/.test(t.trim()) && !/\.\.\.$|…$/.test(t.trim())) hits.push("label ends with a period");
  const nWords = t.trim().split(/\s+/).length;
  const oneClause = nWords <= 8 && !/[.!?]\s/.test(t.trim());
  // a line that reports a state in one clause of eight words or fewer ("No classes yet") is an empty-state heading in effect: no full stop (C5, DS.23)
  const stateLine = kind !== "helper" && oneClause && /^(No|Nothing|None)\b/.test(t.trim());
  if (stateLine && /\.$/.test(t.trim()) && !/\.\.\.$|…$/.test(t.trim())) hits.push("a one-clause state line takes no full stop (C5)");
  if (PERIOD_KINDS.has(kind) && !stateLine && !/[.?…:)"]$/.test(t.trim()) && !/\}$/.test(t.trim())) hits.push("sentence has no end punctuation");
  if ((kind === "status" || kind === "new") && !oneClause && !/[.?…:)"]$/.test(t.trim()) && !/\}$/.test(t.trim())) hits.push("a longer message needs end punctuation");
  if ((kind === "status" || kind === "new") && oneClause && /[^.]\.$/.test(t.trim()) && !/…$/.test(t.trim())) hits.push("a one-clause result takes no period");
  if ((kind === "button" || kind === "cbutton") && /^(ok|yes|no|submit|confirm|done)$/i.test(t.trim())) hits.push("generic button label");
  // C2: a button is a verb and an object. The only single words that stand alone are the conventional controls whose object is clear
  // from context (SINGLE_VERB_OK) and the two exits (EXIT_WORDS); the set is closed.
  if ((kind === "button" || kind === "cbutton") && !/…$/.test(t.trim()) && !SINGLE_VERB_OK.has(t.trim().toLowerCase()) && !EXIT_WORDS.has(t.trim().toLowerCase()) && !namesObject(t)) hits.push("a button is a verb and an object (C2): only Retry, Dismiss, Undo, Stop, Copy, Apply and Refresh stand alone, with the exits Cancel and Close and the account controls Sign in and Sign out; \"Select all\" or \"Approve selected\" names no object");
  for (const a of AUDIT) if (a.scope !== "source") hits.push(...a.test(t, { kind, source: false }));
  const keep = [...new Set(hits)].filter((h) => !allow.some((a) => h.toLowerCase().includes(String(a).toLowerCase())));
  return keep;
}

// ---------------------------------------------------------------------------------------------------------------
// Counts (C4). A count slot with no formatter that stands before a plural noun ("{n} events"), or one word before it ("{n} selected users"),
// reads "1 events" when n is 1. The helper writes the noun by the count: `{n: count event}`, a noun phrase takes the plural on its last word
// (`{n: count more user}`). A note that says what the singular reads is not the string: an implementer copies the New text, so the text is what is
// linted, in every New string, every kept string and every example the guide writes, with or without a note.
// ---------------------------------------------------------------------------------------------------------------
export const NOT_NOUN = new Set("is was has does this its us as less across plus status process access address progress business always perhaps series analysis lens bus gas thus focus bonus mass pass unless boss miss class continuous remains means needs keeps shows starts ends takes lets makes gets uses runs stops works appears becomes contains includes requires says goes comes holds sits stays".split(" "));
// the slot names a count goes by in this guide's strings; `x` is the stand-in for any `${expression}` in a source string
export const COUNT_SLOT = /^(?:n|m|k|a|p|c|count|total|selected|\w+Count|num\w*)$/;
const BARE_COUNT = /\{([A-Za-z_][\w.]*)\}\s+(?:([a-z]{2,})\s+)?([a-z]{3,}s)\b/g;
const LITERAL_ONE = /(?<![\w.{])1\s+(?:([a-z]{2,})\s+)?([a-z]{3,}s)\b/g;
// The eighth review: a named count slot is just as wrong before a SINGULAR noun ("Your instructor added {n} summary" reads "2 summary") and before a modifier and a noun
// ("{n} more pending users"), where the lint used to look one word ahead for a plural. The helper writes the noun by the count: `{n: count summary}`,
// `{n: count more pending user}`. After a named count slot only a word that is not the noun it counts may follow: a preposition or a conjunction (what comes after it is not the
// count's noun), a state or participle word ("({a} active, {p} pending)", "{m} assigned"), a comparative, a unit, or a verb. Any other word in the run is read as the noun.
// NOT_NOUN lists plural-looking words that are not plurals; some are nouns a count can precede ("{n} class" wants `{n: count class}`), so only its verbs and function words are kept
const NOUNISH = new Set("status process access address progress business series analysis lens bus gas focus bonus mass pass boss miss class".split(" "));
export const COUNT_FOLLOW_STOP = new Set([..."of in on to for from by at with and or but if as than then so".split(" "), ...[...NOT_NOUN].filter((w) => !NOUNISH.has(w))]);
export const COUNT_FOLLOW_OK = new Set("more less fewer other others left remaining total active inactive pending assigned selected failed approved rejected added removed created updated sent saved deleted enabled disabled ready done used available min mins ms sec secs ago now later x".split(" "));
const BARE_NAMED = /\{([A-Za-z_][\w.]*)\}((?:[ \t]+[a-z][a-z'-]*){1,4})/g;
export function bareCountHits(text, { source = false } = {}) {
  const t = String(text).replace(/`[^`]*`/g, " ");
  const hits = [];
  for (const m of t.matchAll(BARE_COUNT)) {
    const noun = m[3];
    if (!(COUNT_SLOT.test(m[1]) || (source && m[1] === "x"))) continue;
    if (NOT_NOUN.has(noun) || /(ss|us|is)$/.test(noun) || (m[2] && NOT_NOUN.has(m[2]))) continue;
    hits.push(m[0]);
  }
  // a named slot before a singular noun, or before a modifier and a noun
  for (const m of t.matchAll(BARE_NAMED)) {
    if (!COUNT_SLOT.test(m[1])) continue;
    let words = m[2].trim().split(/\s+/);
    const stop = words.findIndex((w) => COUNT_FOLLOW_STOP.has(w));
    if (stop >= 0) words = words.slice(0, stop);
    if (!words.length || words.every((w) => COUNT_FOLLOW_OK.has(w))) continue;
    const hit = `{${m[1]}} ${words.join(" ")}`;
    if (!hits.some((h) => h.replace(/\s+/g, " ").startsWith(hit) || hit.startsWith(h.replace(/\s+/g, " ")))) hits.push(hit);
  }
  // a literal one with a plural noun ("1 events")
  for (const m of t.matchAll(LITERAL_ONE)) {
    const noun = m[2];
    if (NOT_NOUN.has(noun) || /(ss|us|is)$/.test(noun) || (m[1] && NOT_NOUN.has(m[1]))) continue;
    hits.push(m[0]);
  }
  return hits;
}

// The follow-up to the eleventh review: a count helper writes the noun by the count, and a verb that must agree with it does not follow ("{n: count entry} don't look like email addresses"
// reads "1 entry don't" at n = 1). The verbs that take a number are the ones in the list: the forms of "be", "have" and "do", and the plain verbs a line of this product uses after a
// count; a participle ("removed", "selected") and a preposition do not agree with anything. A row that has such a count must split the singular (its note says which counts it is for,
// and a sibling row at the same anchor says the singular without the helper), or the line must be worded so that it reads at every count ("Some entries don't look like email addresses").
const AGREE_VERB = /^(?:don't|doesn't|aren't|isn't|weren't|wasn't|haven't|hasn't|are|is|were|was|have|has|do|does|need|needs|look|looks|match|matches|remain|remains|fail|fails|exist|exists|contain|contains|appear|appears|stay|stays|seem|seems|show|shows|keep|keeps|expire|expires|belong|belongs|work|works|miss|misses)$/i;
export function agreeCountHits(text) {
  const t = String(text).replace(/`[^`]*`/g, " ");
  const hits = [];
  for (const m of t.matchAll(/(\{[A-Za-z_][\w.]*:\s*count\s[^}]*\})\s+(?:(?:still|also|now|already|just|all|both|each)\s+)?([A-Za-z']+)/g)) if (AGREE_VERB.test(m[2])) hits.push(`${m[1]} ${m[2]}`);
  return hits;
}

// ---------------------------------------------------------------------------------------------------------------
// Dashes (C5). Two dashes are kept: the em dash as the glyph for an empty value (a lone "—", or "— / —" for two), and the en dash in a date or number
// range ("1 Oct – 7 Oct 2026", "3–5"). An en dash anywhere else is a dash in a sentence, which the interface does not use.
// ---------------------------------------------------------------------------------------------------------------
const MONTH = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
export function enDashHits(text) {
  const t = String(text);
  const hits = [];
  for (const m of t.matchAll(/\u2013/g)) {
    const before = t.slice(0, m.index).trimEnd(), after = t.slice(m.index + 1).trimStart();
    const left = new RegExp(`(?:\\d|\\}|(?:^|[^A-Za-z])(?:${MONTH}))$`).test(before);
    const right = new RegExp(`^(?:\\d|\\{|(?:${MONTH})\\b)`).test(after);
    if (!(left && right)) hits.push(t.slice(Math.max(0, m.index - 12), m.index + 13).trim());
  }
  return hits;
}

// Kind-independent subset used on source strings: what is wrong whatever the string is for.
export function lintSource(text, attrKind) {
  const t = String(text).replace(/\$\{[^}]*\}/g, "{x}");
  const hits = [];
  if (t.trim().length < 3) return hits;
  for (const [re, msg] of BANNED) {
    if (msg.startsWith("no we, our or I")) continue; // the pronoun rule is noisy on code, so it runs on new strings only
    if (re.test(stripSlots(t))) hits.push(msg);
  }
  for (const h of enDashHits(t)) hits.push(`an en dash outside a date or number range (C5): "${h}"`);
  if (/^HTTP\b.*[{$]/.test(t)) hits.push("an HTTP status line stands in for words");
  // an icon control in a repeated row names its object: "Edit webhook", not "Edit" (C15)
  if (/^(title|aria-label|tooltip)$/.test(attrKind || "") && /^(Edit|Delete|Remove|Test|Approve|Reject|Revoke|Disable|Enable|View|Download|Upload|Rename|Duplicate|Regenerate|Unregister|Annotate|Replace|Reset|Archive|Restore)$/.test(t.trim())) hits.push("an icon control in a repeated row names its object (C15)");
  { const tt = t.trim(); if (/^(No|Nothing|None)\b/.test(tt) && tt.split(/\s+/).length <= 8 && !/[.!?]\s/.test(tt) && /\.$/.test(tt) && !/\.\.\.$|…$/.test(tt)) hits.push("a one-clause state line takes no full stop (C5)"); }
  // a helper or a page description is a sentence: it ends with a full stop, a question mark or a colon (C5)
  if (/^(helperText|description)$/.test(attrKind || "") && t.trim().split(/\s+/).length >= 2 && !/[.?!:\u2026)"]$/.test(t.trim()) && !/\{x\}$/.test(t.trim())) hits.push("a helper or description is a sentence and takes a full stop (C5)");
  // a placeholder is an example (an e.g., a value) or, in a search or message box with no label, the name of what the box does (C14)
  if (attrKind === "placeholder" && !/^e\.g\. /.test(t) && !/^(Search|Ask|Find|Describe)\b/.test(t) && !/@|:\/\/|^[{\[]/.test(t)) hits.push("a placeholder is an example (e.g. …), not an instruction or a second label (C14)");
  if (attrKind === "placeholder" && /^e\.g\.,/.test(t)) hits.push("write \"e.g.\" without the comma, as the guide does (C14)");
  const words = stripSlots(t).split(/\s+/).filter(Boolean);
  for (const w of words) {
    const core = w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
    if (core.length >= 3 && core === core.toUpperCase() && !ACRONYMS_OK.has(core) && !/[\d_]/.test(core)) hits.push(`capitals typed in the string: ${core}`);
  }
  const short = words.length >= 2 && words.length <= 6 && t.length <= 48 && !/[.,:;?]/.test(t.replace(/\.\.\.$/, ""));
  if (short && /label|title|aria|placeholder|caption|tooltip|jsx|button/.test(attrKind || "jsx")) {
    words.forEach((w, i) => {
      const core = w.replace(/^[^A-Za-z§]+|[^A-Za-z§]+$/g, "");
      if (i > 0 && /^[A-Z][a-z]/.test(core) && !PROPER.has(core)) hits.push(`title case: ${w}`);
    });
  }
  // a label before a colon ("Last Used: …", "Event Type: …") is a label like any other: sentence case (C1)
  { const m = /^([A-Z][a-z]+(?: [A-Za-z][A-Za-z-]*){1,3}):(?:\s|$)/.exec(stripSlots(t).trim());
    if (m) m[1].split(" ").slice(1).forEach((w) => { if (/^[A-Z][a-z]/.test(w) && !PROPER.has(w)) hits.push(`title case: ${w}`); }); }
  for (const a of AUDIT) if (a.scope === "both") hits.push(...a.test(t, { kind: attrKind || "jsx", source: true }));
  return [...new Set(hits)];
}

export function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
// The lookups from an id or code to the word the reader knows, and the identifiers drawn as they are (with the reason): ./identifiers.json.
export function loadIdentifiers() { return readJson(path.join(HERE, "identifiers.json")); }
export function loadGroups() {
  const files = fs.readdirSync(REV_DIR).filter((f) => f.endsWith(".json")).sort();
  const groups = [];
  for (const f of files) {
    const data = readJson(path.join(REV_DIR, f));
    for (const g of Array.isArray(data) ? data : [data]) groups.push({ ...g, _file: f });
  }
  return groups;
}

// Normalise a row (array or object form) to an object.
export function rowObject(r) {
  if (!Array.isArray(r)) return { ...r };
  const [o, n, k, refs, note, match, file, rules, x] = r;
  return { o, n, k, refs, t: note, m: match === "" ? undefined : match, f: file === "" ? undefined : file, r: rules || undefined, x: x || undefined };
}
export function esc(s) { return String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " "); }
export function code(s) {
  const t = String(s ?? "");
  if (!t) return "(none)";
  return t.includes("`") ? "``" + t + "``" : "`" + t + "`";
}

// ---------------------------------------------------------------------------------------------------------------
// N-5 (the seventh review): how the Tests column's references relate to an independent count of equal literals. A reference is one row and one test line.
// A line "holds the old string" when a quoted literal on it equals the row's Old exactly. The independent scan is the one a reviewer would make: every quoted
// literal in a test file that equals a changed Old, over the test file's whole import closure, counted as reaching a row's anchor file or not. The index
// header states the numbers (reconcileText), and E12 fails when the header, the column and the scan disagree.
// ---------------------------------------------------------------------------------------------------------------
export function reconcileTests(rows) {
  const srcRoot = path.join(UI, "src");
  const testAbs = [];
  (function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!["node_modules", "dist"].includes(e.name)) w(p); } else if (/\.test\.(tsx?|jsx?)$/.test(e.name)) testAbs.push(p); } })(srcRoot);
  const byName = new Map(); for (const f of testAbs) { const k = path.basename(f); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(f); }
  const exts = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"];
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
  const linesOf = new Map(); const lines = (f) => { if (!linesOf.has(f)) linesOf.set(f, fs.readFileSync(f, "utf8").split("\n")); return linesOf.get(f); };
  const litRe = /(['"`])((?:\\.|(?!\1)[^\\\n]){2,300}?)\1/g;
  const literals = (line) => { const out = []; let m; litRe.lastIndex = 0; while ((m = litRe.exec(line))) out.push(m[2].replace(/\\(.)/g, "$1")); return out; };
  // the scan
  const oldMap = new Map();
  for (const r of rows) if (r.old && !r.old.includes("{") && r.anchors.some((a) => a.file && !a.file.startsWith(".."))) { if (!oldMap.has(r.old)) oldMap.set(r.old, []); oldMap.get(r.old).push(r); }
  const scan = new Set(); let notReached = 0;
  for (const tf of testAbs) {
    const cl = closure(tf); const base = path.basename(tf);
    lines(tf).forEach((line, idx) => {
      for (const lit of literals(line)) for (const r of oldMap.get(lit) || []) {
        if (r.anchors.some((a) => a.file && !a.file.startsWith("..") && cl.has(path.join(UI, a.file)))) scan.add(`${r.id}|${base}:${idx + 1}`); else notReached++;
      }
    });
  }
  // the column
  const rec = { total: 0, equal: 0, eqString: 0, eqText: 0, other: 0, regex: 0, asksNew: 0, asksKept: 0, otherString: 0, otherText: 0, scanReached: scan.size, notReached, agree: true };
  const holds = new Set();
  for (const r of rows) for (const t of r.tests || []) {
    rec.total++;
    const files = byName.get(t.name) || [];
    const eq = !!r.old && files.some((f) => literals(lines(f)[t.line - 1] || "").includes(r.old));
    if (eq) { rec.equal++; holds.add(`${r.id}|${t.name}:${t.line}`); if (t.via === "text") rec.eqText++; else rec.eqString++; }
    else { rec.other++; if (t.via === "regex") rec.regex++; else if (t.via === "new") rec.asksNew++; else if (t.via === "kept") rec.asksKept++; else if (t.via === "text") rec.otherText++; else rec.otherString++; }
  }
  rec.agree = holds.size === scan.size && [...holds].every((x) => scan.has(x));
  return rec;
}
// the sentence of the index header that states the reconciliation, generated from the numbers
export function reconcileText(c) {
  return `**Reconciling the counts.** The Tests column holds ${c.total} references (a reference is one row and one test line). ${c.equal} of them are a line that holds the old string as a quoted literal (${c.eqString} string queries and ${c.eqText} other lines that quote it). A scan of the test files that does not use the column, over each test file's whole import closure, finds ${c.scanReached + c.notReached} pairs of a row and a line where a quoted literal equals an old string: ${c.scanReached} reach the row's anchor file, and they are the ${c.equal} the column holds; ${c.notReached} do not, because the test is another page's and quotes the same word (the reach rule above), so ${c.scanReached} + ${c.notReached} = ${c.scanReached + c.notReached}. The other ${c.other} references are what a scan for literals cannot see: ${c.regex} regular-expression queries (\`r\`), ${c.asksNew} queries for the new text (\`n\`), ${c.asksKept} for a part the row keeps (\`k\`), ${c.otherString} sentence queries matched by containment and ${c.otherText} lines that quote only part of the string (\`m\`), so ${c.equal} + ${c.other} = ${c.total}.`;
}


// ---------------------------------------------------------------------------------------------------------------
// The lock amendments (check-copy.mjs § 8b, checks L7 and L8; lock-amendments.json). A pure function of the texts, so proofs.mjs can plant
// defects in process: L7 and L8 read the base texts from git, which a throwaway copy does not have. Given DESIGN.md and JOURNEY.md as they were
// at the amendment's base commit, the working texts and the recorded amendment, it returns what differs from the record:
//   DESIGN.md: every line before `## Companion`, and every line from `## Voice and tone` to the base's end, is the base's, byte for byte; inside
//   `## Companion` the lines that left are exactly the recorded replaced lines and the lines that arrived exactly their replacements and the
//   recorded insertions (as multisets of SHA-256, each as often as recorded); the file ends with the recorded `## Lock amendments`, line for line.
//   JOURNEY.md: the working text is the base with exactly the recorded lines inserted after their anchor.
// ---------------------------------------------------------------------------------------------------------------
export const sha256hex = (t) => crypto.createHash("sha256").update(t, "utf8").digest("hex");
// the blocks check-copy.mjs writes into DESIGN.md with --write: the Phase 5 Evidence table, the coverage table, the Phase 6 Evidence table
export const WRITTEN_BLOCKS = ["evidence", "coverage", "evidence-p6"];
export function generatedBlocks(text) {
  const out = {};
  for (const n of WRITTEN_BLOCKS) { const a = text.indexOf(`<!-- copy:${n}:start -->`), b = text.indexOf(`<!-- copy:${n}:end -->`); if (a >= 0 && b > a) out[n] = text.slice(a, b); }
  return out;
}
const withBlocks = (text, blocks) => { let t = text; for (const [n, body] of Object.entries(blocks)) { const a = t.indexOf(`<!-- copy:${n}:start -->`), b = t.indexOf(`<!-- copy:${n}:end -->`); if (a >= 0 && b > a) t = t.slice(0, a) + body + t.slice(b); } return t; };
// `written`: the blocks this run of the checker writes. They are the checker's output, not the amendment's: both texts are read with them in place, and a
// block in the working text that is not what the checker writes (a hand edit, or a run without --write after the data changed) is reported.
export function amendmentHits({ baseDesign, design, baseJourney, journey, amendment, written = {} }) {
  const out = { design: [], journey: [] };
  const have = generatedBlocks(design);
  for (const [n, body] of Object.entries(written)) if (n in have && have[n] !== body) out.design.push(`the generated block copy:${n} is not what the checker writes: run check-copy.mjs --write`);
  baseDesign = withBlocks(baseDesign, written); design = withBlocks(design, written);
  const tally = (arr) => arr.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const minus = (a, b) => { const left = tally(b), r = []; for (const x of a) { const n = left.get(x) || 0; if (n) left.set(x, n - 1); else r.push(x); } return r; };
  const short = (hs) => hs.map((h) => h.slice(0, 12)).join(", ");
  const bl = baseDesign.split("\n"), wl = design.split("\n");
  const bS = bl.indexOf("## Companion"), bE = bl.indexOf("## Voice and tone"), wS = wl.indexOf("## Companion"), wE = wl.indexOf("## Voice and tone");
  if (bS < 0 || bE < 0 || wS < 0 || wE < 0) out.design.push("## Companion or ## Voice and tone is missing");
  else {
    const bTrail = bl[bl.length - 1] === "" ? 1 : 0, wTrail = wl[wl.length - 1] === "" ? 1 : 0;
    const app = amendment.design.appended.lines, tail = wl.length - wTrail - app.length;
    if (tail < wE || wl.slice(tail, wl.length - wTrail).map(sha256hex).join() !== app.join()) out.design.push("the file does not end with the recorded ## Lock amendments");
    if (bl.slice(0, bS).join("\n") !== wl.slice(0, wS).join("\n")) out.design.push("a line before ## Companion differs from the base");
    if (bl.slice(bE, bl.length - bTrail).join("\n") !== wl.slice(wE, Math.max(wE, tail)).join("\n")) out.design.push("a line from ## Voice and tone to the base's end differs from the base");
    const bComp = bl.slice(bS, bE).map(sha256hex), wComp = wl.slice(wS, wE).map(sha256hex);
    const left = minus(bComp, wComp), arrived = minus(wComp, bComp);
    const wantLeft = amendment.design.replaced.map((r) => r.was);
    const wantArrived = [...amendment.design.replaced.map((r) => r.is), ...amendment.design.inserted.flatMap((x) => x.lines)];
    const l1 = minus(left, wantLeft), l2 = minus(wantLeft, left), a1 = minus(arrived, wantArrived), a2 = minus(wantArrived, arrived);
    if (l1.length || l2.length) out.design.push(`the lines that left ## Companion are not the recorded ones (unrecorded: ${short(l1) || "none"}; recorded but kept: ${short(l2) || "none"})`);
    if (a1.length || a2.length) out.design.push(`the lines that arrived in ## Companion are not the recorded ones (unrecorded: ${short(a1) || "none"}; recorded but missing: ${short(a2) || "none"})`);
  }
  let jw = journey.split("\n");
  for (const ins of amendment.journey.inserted) {
    const k = jw.findIndex((l) => l.startsWith(ins.after));
    if (k < 0) { out.journey.push(`the anchor "${ins.after.slice(0, 40)}…" is missing`); continue; }
    if (jw.slice(k + 1, k + 1 + ins.lines.length).map(sha256hex).join() !== ins.lines.join()) { out.journey.push(`the recorded lines do not follow "${ins.after.slice(0, 40)}…"`); continue; }
    jw = [...jw.slice(0, k + 1), ...jw.slice(k + 1 + ins.lines.length)];
  }
  if (!out.journey.length && jw.join("\n") !== baseJourney) out.journey.push("a line other than the recorded insertion differs from the base");
  return out;
}
