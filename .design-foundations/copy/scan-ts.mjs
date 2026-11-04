// scan-ts.mjs: read kiwi-ui/src with the TypeScript compiler (from kiwi-ui/node_modules, read-only) and report what a regular expression cannot
// see: the types of the expressions a page draws as text. check-copy.mjs uses it for three checks:
//   identifiers   an enum value, key, id or code drawn as visible text (H11)
//   buttons       the labels a button can show (H12)
//   conditionals  a string that has two branches (H13)
//   templates     a template literal with a conditional piece, read as the texts it can draw ("Login failed.${on ? ` Please contact ${x}.` : ""}" draws two): A1, H13 and E9
//   texts         the census of visible text, each piece read whole, JSX sentences with expressions inside included (H1)
//   dialogs       the places that ask the person to confirm: a Dialog with a destructive or question title, DeleteConfirmDialog, a native confirm() (H16)
// Nothing is written. If TypeScript is not installed (npm install in kiwi-ui), scanSources throws and the checks fail with that message.
import { createRequire } from "node:module";
import path from "node:path";
import { UI } from "./copy-lib.mjs";

const LABEL_ATTRS = new Set(["label", "placeholder", "title", "aria-label", "helperText", "alt", "tooltip", "subtitle", "description", "caption", "emptyText", "text", "message", "heading", "content", "primary", "secondary", "subheader"]);
const MESSAGE_CALLS = /^(alert|confirm|prompt|showSnackbar|setSnackbar|showMessage|setError|setErrorMessage|setSuccessMessage|setSnackbarMessage|enqueueSnackbar|toast|setRosterError|setInfo|setFeedback|setNotice|setToast)$/;
const MSG_PROPS = new Set(["message", "label", "title", "description", "text", "content", "primary", "secondary", "heading", "subtitle"]);
const BUTTON_TAGS = new Set(["Button", "LoadingButton", "PrimaryButton", "SecondaryButton", "TertiaryButton", "ToggleButton"]);
// a value that is code, not a word: lowercase or snake_case ("pending", "frontend_only"), camelCase, two or more capitalised words ("QwenModel"), UPPER_SNAKE
const RAW = [/^[a-z][a-z0-9]*([_.:-][a-z0-9]+)*$/, /^[a-z]+([A-Z][a-z0-9]*)+$/, /^([A-Z][a-z0-9]+){2,}$/, /^[A-Z][A-Z0-9_]{2,}$/];
const ACRONYMS = new Set(["PDF", "API", "CSV", "SSO", "URL", "MCP", "SSE", "HTTP", "HTTPS", "JSON", "HTML", "RAG", "UUID", "OAuth", "ID", "LLM", "UTC", "IDE", "AI"]);
export const isRawValue = (v) => !/\s/.test(v) && v.length >= 3 && !ACRONYMS.has(v) && RAW.some((re) => re.test(v));
const ID_NAME = /(^|\.)(id|ids|slug|key|uuid|jti)$|(Id|ID|Ids|Slug|Uuid|Key|Code)$/;
const ENUMISH_NAME = /(^|\.)(status|role|type|kind|mode|category|engine|transport|appType|placement|severity|level|state|action|eventType|event|systemRole|targetType|method|scope|permission|decision|result)$/;

let cached = null;
export function scanSources(isOut) {
  if (cached) return cached;
  let ts;
  try { ts = createRequire(path.join(UI, "package.json"))("typescript"); }
  catch { throw new Error("TypeScript is not installed: run npm install in kiwi-ui (scan-ts.mjs reads the source with its compiler)"); }
  const cfg = ts.readConfigFile(path.join(UI, "tsconfig.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, UI);
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
  const checker = program.getTypeChecker();
  const identifiers = [], buttons = [], conditionals = [], batches = [], derived = [], texts = [], dialogs = [], templates = [];

  const calleeName = (call) => (call.expression.getText().split(".").pop() || "");
  // the words under a node in reading order (attributes left out); a conditional lists its two branches, "A / B"
  const wordsUnder = (root, sf) => {
    const out = [];
    (function walk(n) {
      if (ts.isJsxAttribute(n)) return;
      if (ts.isJsxText(n)) { const t = n.getText(sf).replace(/\s+/g, " ").trim(); if (t) out.push(t); return; }
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) { out.push(n.text); return; }
      if (ts.isConditionalExpression(n)) {
        const side = (e) => { const keep = out.length; walk(e); return out.splice(keep).join(" "); };
        out.push(side(n.whenTrue) + " / " + side(n.whenFalse));
        return;
      }
      ts.forEachChild(n, walk);
    })(root);
    return out.join(" ").replace(/\s+/g, " ").trim();
  };
  // the message function a node is the first argument of (or a message property of): "setSnackbar", "alert"
  const callOf = (node) => {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isCallExpression(p)) return calleeName(p);
      if (ts.isArrowFunction(p) || ts.isFunctionExpression(p) || ts.isFunctionDeclaration(p) || ts.isSourceFile(p)) return "";
    }
    return "";
  };
  // where a node's text reaches the reader: "child" (JSX text position), "attr:name", "call" (a message function's first argument), or null
  function visibleContext(node) {
    for (let p = node.parent, prev = node; p; prev = p, p = p.parent) {
      if (ts.isJsxAttribute(p)) return LABEL_ATTRS.has(p.name.getText()) ? "attr:" + p.name.getText() : null;
      if (ts.isJsxExpression(p) && p.parent && (ts.isJsxElement(p.parent) || ts.isJsxFragment(p.parent))) return "child";
      // an argument of any other call is an input ("format(day, "EEEE")", `list.includes("processing")`), not text
      if (ts.isCallExpression(p)) return MESSAGE_CALLS.test(calleeName(p)) && p.arguments[0] === prev ? "call" : null;
      if (ts.isPropertyAssignment(p)) {
        // the text of a message object passed to a message function ({ message: "…" }); any other property ({ severity: "error" }) is code
        if (!MSG_PROPS.has(p.name.getText())) return null;
        const call = p.parent && p.parent.parent;
        return call && ts.isCallExpression(call) && MESSAGE_CALLS.test(calleeName(call)) ? "call" : null;
      }
      if (ts.isArrowFunction(p) || ts.isFunctionExpression(p) || ts.isFunctionDeclaration(p)) {
        if (!(p.parent && ts.isCallExpression(p.parent))) return null; // a render callback (map) continues; a handler stops
      }
      if (ts.isSourceFile(p)) return null;
    }
    return null;
  }
  function typeInfo(expr) {
    const t = checker.getTypeAtLocation(expr);
    const members = t.isUnion() ? t.types : [t];
    const nonNullish = members.filter((m) => !(m.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)));
    const lits = nonNullish.filter((m) => m.isStringLiteral()).map((m) => m.value);
    return { text: checker.typeToString(t), lits, allLits: nonNullish.length > 0 && lits.length === nonNullish.length, isString: nonNullish.length > 0 && nonNullish.every((m) => m.flags & ts.TypeFlags.String) };
  }
  function checkExpr(expr, ctx, sf, rel) {
    const text = expr.getText(sf);
    if (/^["'`]/.test(text) && !text.includes("${")) return; // a literal on its own is read by the literal pass below
    const info = typeInfo(expr);
    const tail = text.replace(/\?\./g, ".").replace(/!$/, "");
    const pair = info.lits.length === 2 && (info.lits[0] + "s" === info.lits[1] || info.lits[1] + "s" === info.lits[0] || info.lits[0].replace(/y$/, "ies") === info.lits[1] || info.lits[1].replace(/y$/, "ies") === info.lits[0]);
    let kind = null;
    if (info.allLits && !pair && info.lits.some(isRawValue)) kind = "enum";
    else if (info.isString && ID_NAME.test(tail)) kind = "id";
    else if (ENUMISH_NAME.test(tail) && (info.isString || info.allLits)) kind = "named";
    if (!kind) return;
    identifiers.push({ file: rel, line: sf.getLineAndCharacterOfPosition(expr.getStart(sf)).line + 1, ctx, kind, expr: text.replace(/\s+/g, " ").slice(0, 100), members: info.allLits ? info.lits : [], type: info.text.slice(0, 80) });
  }
  // an await inside a loop body (not inside a function nested in it)
  const containsAwait = (n) => { let found = false; (function look(x) { if (found) return; if (ts.isAwaitExpression(x)) { found = true; return; } if (ts.isArrowFunction(x) || ts.isFunctionExpression(x) || ts.isFunctionDeclaration(x)) return; ts.forEachChild(x, look); })(n); return found; };
  // every string a (possibly nested) conditional can produce
  const leaves = (e) => ts.isConditionalExpression(e) ? [...leaves(e.whenTrue), ...leaves(e.whenFalse)] : ts.isParenthesizedExpression(e) ? leaves(e.expression) : (strOf(e) !== null ? [strOf(e)] : []);
  const strOf = (e) => ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) ? e.text : ts.isTemplateExpression(e) ? e.head.text + e.templateSpans.map((s) => "{x}" + s.literal.text).join("") : null;

  // The texts a template literal can draw. A span that is a conditional with a text branch ("on ? ` Please contact ${x}.` : \"\"") gives each of its branches; any other
  // span is opaque and reads "{x}". A conditional whose two branches are one noun's singular and plural ("" and "s", "question" and "questions") is a plural, not a
  // second text: it is read as its plural branch and marked `plural`, because the count helper writes those (H10), never a row of its own.
  const unparen = (e) => (ts.isParenthesizedExpression(e) ? unparen(e.expression) : e);
  const isStrish = (e) => { e = unparen(e); return ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || ts.isTemplateExpression(e); };
  const isNullish = (e) => { e = unparen(e); return e.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(e) && e.text === "undefined"); };
  const pluralPair = (a, b) => { const [x, y] = [a.trim(), b.trim()]; return (x === "" && /^(s|es)$/.test(y)) || (y === "" && /^(s|es)$/.test(x)) || (x !== "" && (x + "s" === y || y + "s" === x || x + "es" === y || y + "es" === x || x.replace(/y$/, "ies") === y || y.replace(/y$/, "ies") === x)); };
  const templateTexts = (root) => {
    const spans = [];
    const branch = (e) => {
      e = unparen(e);
      if (isNullish(e)) return [""];
      if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return [e.text];
      if (ts.isTemplateExpression(e)) return tmpl(e);
      if (ts.isConditionalExpression(e)) return [...branch(e.whenTrue), ...branch(e.whenFalse)];
      return ["{x}"];
    };
    const tmpl = (t) => {
      let acc = [t.head.text];
      for (const sp of t.templateSpans) {
        const x = unparen(sp.expression);
        let alt = ["{x}"];
        if (ts.isConditionalExpression(x) && (isStrish(x.whenTrue) || isStrish(x.whenFalse))) {
          const a = branch(x.whenTrue), b = branch(x.whenFalse);
          const plural = a.length === 1 && b.length === 1 && pluralPair(a[0], b[0]);
          spans.push({ a: a.join(" | "), b: b.join(" | "), plural });
          alt = plural ? [a[0].length >= b[0].length ? a[0] : b[0]] : [...a, ...b];
        }
        acc = acc.flatMap((p) => alt.map((q) => p + q + sp.literal.text));
      }
      return acc;
    };
    return { texts: [...new Set(tmpl(root))], spans };
  };
  const insideTemplate = (n) => { for (let p = n.parent; p; p = p.parent) if (ts.isTemplateExpression(p)) return true; return false; };

  for (const sf of program.getSourceFiles()) {
    const rel = path.relative(UI, sf.fileName).split(path.sep).join("/");
    if (!rel.startsWith("src/") || /\.(test|stories|d)\.tsx?$/.test(rel) || /^src\/services\//.test(rel) || isOut(rel)) continue;
    (function visit(node) {
      // identifiers
      if (ts.isJsxExpression(node) && node.expression) {
        const par = node.parent;
        const ctx = (par && (ts.isJsxElement(par) || ts.isJsxFragment(par))) ? "child" : (par && ts.isJsxAttribute(par) && LABEL_ATTRS.has(par.name.getText()) ? "attr:" + par.name.getText() : null);
        if (ctx) checkExpr(node.expression, ctx, sf, rel);
      }
      if (ts.isTemplateExpression(node)) {
        const ctx = visibleContext(node);
        if (ctx) for (const span of node.templateSpans) checkExpr(span.expression, "tpl-" + ctx, sf, rel);
      }
      // a template literal that draws more than one text (a conditional piece that is not just a plural), wherever it ends up: a message, a label, a variable the page draws
      if (ts.isTemplateExpression(node) && !insideTemplate(node)) {
        const { texts: tx, spans } = templateTexts(node);
        if (spans.some((sp) => !sp.plural)) templates.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, endLine: sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1, readings: tx, spans: spans.map((sp) => ({ a: sp.a, b: sp.b, plural: sp.plural })) });
      }
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && isRawValue(node.text)) {
        const ctx = visibleContext(node);
        // a literal compared with, or the severity argument of a message call, is code
        const par = node.parent;
        const compared = par && ts.isBinaryExpression(par) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(par.operatorToken.kind);
        // "n === 1 ? 'student' : 'students'": the two forms of one noun are a plural, not a code
        let pluralForm = false;
        if (par && ts.isConditionalExpression(par)) {
          const other = par.whenTrue === node ? par.whenFalse : par.whenTrue;
          const o = other && (ts.isStringLiteral(other) || ts.isNoSubstitutionTemplateLiteral(other)) ? other.text : null;
          if (o !== null) pluralForm = o + "s" === node.text || node.text + "s" === o || o.replace(/y$/, "ies") === node.text || node.text.replace(/y$/, "ies") === o;
        }
        if (ctx && !compared && !pluralForm) identifiers.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, ctx, kind: "literal", expr: JSON.stringify(node.text), members: [node.text], type: "literal" });
      }
      // a DataGrid column with a field and no renderer draws the raw field
      if (ts.isObjectLiteralExpression(node)) {
        const props = new Map(node.properties.filter(ts.isPropertyAssignment).map((p) => [p.name.getText(), p]));
        const field = props.get("field");
        if (field && ts.isStringLiteral(field.initializer) && !props.has("renderCell") && !props.has("valueGetter") && !props.has("valueFormatter") && props.has("headerName") && (ID_NAME.test(field.initializer.text) || ENUMISH_NAME.test(field.initializer.text)))
          identifiers.push({ file: rel, line: sf.getLineAndCharacterOfPosition(field.getStart(sf)).line + 1, ctx: "grid-column", kind: "grid", expr: `field: ${JSON.stringify(field.initializer.text)}`, members: [], type: "string" });
      }
      // button labels
      if (ts.isJsxElement(node) && BUTTON_TAGS.has(node.openingElement.tagName.getText(sf))) {
        let words = [];
        let branches = null;
        for (const c of node.children) {
          if (ts.isJsxText(c)) { const t = c.getText(sf).replace(/\s+/g, " ").trim(); if (t) words.push(t); }
          else if (ts.isJsxExpression(c) && c.expression) {
            const e = c.expression;
            if (ts.isConditionalExpression(e)) { branches = leaves(e); if (!branches.length) words.push("{…}"); }
            else { const s = strOf(e); if (s !== null) words.push(s); else words.push("{…}"); }
          }
        }
        const rest = words.join(" ").trim();
        const labels = branches ? branches.map((b) => `${b} ${rest}`.trim()) : [rest];
        // the line of the label itself, not of the opening tag (a long sx prop puts them far apart)
        const first = node.children.find((c) => (ts.isJsxText(c) && c.getText(sf).trim()) || (ts.isJsxExpression(c) && c.expression));
        buttons.push({ file: rel, line: sf.getLineAndCharacterOfPosition((first || node).getStart(sf)).line + (first && ts.isJsxText(first) ? 1 + (first.getText(sf).match(/^\s*/)[0].split("\n").length - 1) : 1), tag: node.openingElement.tagName.getText(sf), labels });
      }
      // the census of visible text: every piece of text that reaches the reader, read whole. A regular expression cannot see a JSX
      // sentence with an expression inside it ("“{fileName}” is swapped for the file you pick next…": the text is split at the braces),
      // nor a literal that starts with a quote mark or a slot.
      if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
        let seg = [], segLine = null;
        const flush = () => {
          const t = seg.join("").replace(/\s+/g, " ").trim();
          // the words outside the slots: an element that only holds expressions has no text of its own
          if (/[A-Za-z]{2}/.test(t.replace(/\{x\}/g, ""))) texts.push({ file: rel, line: segLine || sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, ctx: "jsx", text: t });
          seg = []; segLine = null;
        };
        for (const c of node.children) {
          if (ts.isJsxText(c)) {
            const t = c.getText(sf);
            if (t.trim() && segLine === null) segLine = sf.getLineAndCharacterOfPosition(c.getStart(sf)).line + 1 + (t.match(/^\s*/)[0].split("\n").length - 1);
            seg.push(t);
          } else if (ts.isJsxExpression(c) && c.expression) {
            const s = strOf(c.expression);
            seg.push(s !== null ? s : "{x}");
            if (segLine === null && s !== null && /[A-Za-z]/.test(s)) segLine = sf.getLineAndCharacterOfPosition(c.getStart(sf)).line + 1;
          } else flush();
        }
        flush();
      }
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) && !(node.parent && ts.isTemplateSpan(node.parent))) {
        const ctx = visibleContext(node);
        const s = ctx ? strOf(node) : null;
        if (s !== null && /[A-Za-z]{2}/.test(s)) texts.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, ctx: ctx === "call" ? "call:" + callOf(node) : ctx, text: s });
      }
      // the places that ask the person to confirm: a Dialog (its title, and whether a button in it is coloured error, warning or success),
      // the shared DeleteConfirmDialog, and a native confirm()
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(sf) === "Dialog") {
        let title = "", coloured = false;
        (function look(n) {
          if (ts.isJsxElement(n) && n.openingElement.tagName.getText(sf) === "DialogTitle" && !title) title = wordsUnder(n, sf);
          const open = ts.isJsxElement(n) ? n.openingElement : ts.isJsxSelfClosingElement(n) ? n : null;
          if (open && open.tagName.getText(sf) === "Button") {
            for (const at of open.attributes.properties) if (ts.isJsxAttribute(at) && at.name.getText(sf) === "color" && at.initializer && ts.isStringLiteral(at.initializer) && /^(error|warning|success)$/.test(at.initializer.text)) coloured = true;
          }
          ts.forEachChild(n, look);
        })(node);
        dialogs.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, kind: "dialog", title, coloured });
      }
      if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        if (node.tagName.getText(sf) === "DeleteConfirmDialog" && node.getSourceFile() === sf) {
          const at = node.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "title");
          dialogs.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, kind: "delete-confirm", title: at && at.initializer && ts.isStringLiteral(at.initializer) ? at.initializer.text : "", coloured: true });
        }
      }
      if (ts.isCallExpression(node) && /^(window\.)?confirm$/.test(node.expression.getText(sf))) {
        dialogs.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, kind: "native", title: "confirm()", coloured: true });
      }
      // a string with two branches in a place the reader sees
      if (ts.isConditionalExpression(node)) {
        const a = strOf(node.whenTrue), b = strOf(node.whenFalse);
        if (a !== null && b !== null && (a.trim() || b.trim())) {
          const ctx = visibleContext(node);
          if (ctx) conditionals.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, ctx, a, b });
        }
      }
      // a code turned into words by changing its case: "charAt(0).toUpperCase()" anywhere, or toUpperCase / toLowerCase on a value a page draws
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && /^(toUpperCase|toLowerCase)$/.test(node.expression.name.text)) {
        const text = node.getText(sf).replace(/\s+/g, " ");
        const idiom = node.expression.name.text === "toUpperCase" && /charAt\(0\)$/.test(node.expression.expression.getText(sf).replace(/\s+/g, ""));
        const ctx = visibleContext(node);
        if (idiom || ctx) derived.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, ctx: ctx || "capitalise", expr: text.slice(0, 100), idiom });
      }
      // a loop that issues requests one after another and a function that tells the reader how it went: a batch
      if ((ts.isForOfStatement(node) || ts.isForStatement(node) || ts.isForInStatement(node) || ts.isWhileStatement(node)) && containsAwait(node.statement)) {
        let fn = node.parent;
        while (fn && !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) || ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn))) fn = fn.parent;
        if (fn) {
          let reports = false;
          (function look(n) { if (ts.isCallExpression(n) && MESSAGE_CALLS.test(calleeName(n))) reports = true; ts.forEachChild(n, look); })(fn);
          batches.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, from: sf.getLineAndCharacterOfPosition(fn.getStart(sf)).line + 1, to: sf.getLineAndCharacterOfPosition(fn.getEnd()).line + 1, reports, loop: node.getText(sf).split("\n")[0].slice(0, 80) });
        }
      }
      ts.forEachChild(node, visit);
    })(sf);
  }
  cached = { identifiers, buttons, conditionals, batches, derived, texts, dialogs, templates };
  return cached;
}
