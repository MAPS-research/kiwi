#!/usr/bin/env node
// record-detect.mjs: runs the design-for-ai static detector (Assessment B of the dual-blind review) on the 12 mocks and on
// the preview, and writes ../screenshots/final-detect.json with the written rationale for every hit on a deliberate choice.
// A hit the rationale does not cover (another rule, another element) is not accepted: the script lists it and exits 1.
//   node record-detect.mjs <path to design-for-ai's scripts/detect.mjs>
import { spawnSync } from "node:child_process";
import { readdirSync, writeFileSync, openSync, closeSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SCREENS, PREVIEW, SHOTS, rel } from "./lib/paths.mjs";

const detector = process.argv[2];
if (!detector) { console.error("usage: node record-detect.mjs <path to detect.mjs>"); process.exit(2); }
// the detector exits right after printing, so its JSON goes to a file, not a pipe (a pipe can lose the tail)
const tmp = mkdtempSync(join(tmpdir(), "detect-"));
function run(cwd, files) {
  const out = join(tmp, "out.json"); const fd = openSync(out, "w");
  const r = spawnSync(process.execPath, [detector, ...files], { cwd, stdio: ["ignore", fd, "inherit"] });
  closeSync(fd);
  if (r.status !== 0) throw new Error(`detect.mjs exited ${r.status}`);
  return JSON.parse(readFileSync(out, "utf8"));
}
const screens = run(SCREENS, readdirSync(SCREENS).filter((f) => f.endsWith(".html")).sort());
const preview = run(PREVIEW, ["kiwi-ui-preview.html"]);
rmSync(tmp, { recursive: true, force: true });

// What each accepted rule may hit, and why (DESIGN.md is the authority every reason cites).
const ACCEPT = {
  "nested-cards": {
    elements: /^<(div|span|button) class="(control multiline( is-focus| is-disabled)?|btn btn-secondary|chip chip-filter|chip chip-info|switch|menu|toggletip right)">$/,
    rationale: [
      "Every hit is a control or a floating surface inside a sheet, never a container inside a container. The detector counts any element with a border plus a radius or a fill as a card, so it reads controls the same way it reads cards.",
      "Controls (the composer field, the outlined Stop and Retry buttons, the Lecture and Recitation filter chips, the Shared with Kiwi chip, the switch track): DESIGN.md § Space, shape, depth, Controls are not cards: a control boundary inside a sheet is a signifier, not a container, and the review detector configuration must whitelist control boundaries inside sheets and flag only container-in-container nesting. § Never, Nested cards repeats it.",
      "Floating surfaces (the Display menu, and the toggletips that hold the stated reason of a disabled Regenerate or Share button): DESIGN.md § Space, shape, depth, Depth order: menus, popovers and tooltips are the floating surfaces that take --shadow-1; the disabled pattern puts the reason in a toggletip on the control itself. They float above the sheet; they do not nest inside it.",
      "The hits appear only in the two chat files, because only the chat screen holds bordered controls inside a hairline-framed region: the chat panel, the crops of its frame strip, the drawer, the PDF bar, and the top bar under the open Display menu.",
    ],
  },
  "overused-font": {
    elements: /^overused font "Montserrat" as a primary face$/,
    rationale: [
      "A false positive. The preview inlines its fonts, so the detector reads the @font-face that names the family Montserrat and takes it for a primary face. In the gated mocks the same @font-face sits in assets/fonts/montserrat-wordmark.css, which the detector does not scan.",
      "Montserrat is the wordmark's face only (G6; DESIGN.md § Type: the family is read through --font-wordmark by one selector, .kiwi-wordmark). Every other text uses --font-ui, Source Sans 3. The render audit counts every text element's computed family and finds none in Montserrat outside the wordmark (final-audit.json, DW-7.7).",
    ],
  },
};
const evidence = (f) => f.evidence.replace(/ is a card inside a card ancestor$/, "");
function accept(raw, label) {
  const out = [], bad = [];
  for (const [rule, a] of Object.entries(ACCEPT)) {
    const hits = raw.findings.filter((f) => f.rule === rule);
    if (!hits.length) continue;
    const elements = {}; for (const f of hits) { const e = evidence(f); elements[e] = (elements[e] || 0) + 1; if (!a.elements.test(e)) bad.push(`${label}: ${rule} ${e}`); }
    const files = [...new Set(hits.map((f) => f.source))];
    out.push({ rule, hits: hits.length, files, perFile: Object.fromEntries(files.map((s) => [s, hits.filter((f) => f.source === s).length])), elements, rationale: a.rationale });
  }
  for (const f of raw.findings) if (!ACCEPT[f.rule]) bad.push(`${label}: ${f.rule} ${evidence(f)}`);
  return { out, bad };
}
const a = accept(screens, "mocks"), b = accept(preview, "preview");
const record = {
  about: "The design-for-ai static detector (scripts/detect.mjs, Assessment B of the dual-blind review), run by record-detect.mjs on the 12 mocks (from mocks/screens/) and on the preview (from mocks/preview/). The raw output is under runs; accepted gives the written rationale for every hit, each on a deliberate choice.",
  accepted: { mocks: a.out, preview: b.out },
  runs: { mocks: screens, preview },
};
writeFileSync(join(SHOTS, "final-detect.json"), JSON.stringify(record, null, 1) + "\n");
console.log(`mocks: ${screens.findings.length} findings; preview: ${preview.findings.length} findings; wrote ${rel(join(SHOTS, "final-detect.json"))}`);
if (a.bad.length || b.bad.length) { console.error("not covered by a written rationale:\n" + [...a.bad, ...b.bad].join("\n")); process.exit(1); }
