#!/usr/bin/env node
// build-signoff.mjs: .design-foundations/mocks/sign-off.html, the index the user signs off from (DW-7.6): the 16 renders by
// their screenshots, the clickable preview, the Phase 2 swatch sheet, the Phase 6 chart sheet with its colour-vision
// strips, the companion sheet, the audit's numbers, and the open questions that are the user's. Run after shoot-mocks.mjs.
//   node build-signoff.mjs
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { MOCKS, SHOTS, PREVIEW, TOOLS, rel } from "./lib/paths.mjs";
import { SCREENS } from "./lib/screens.mjs";
import { esc } from "./lib/ui.mjs";
import { tokensCss } from "./build-mocks.mjs";

const audit = JSON.parse(readFileSync(join(SHOTS, "final-audit.json"), "utf8"));
const S = audit.summary;
// The detector pre-run (screenshots/final-detect.json) is optional evidence: written once with its rationale, not rebuilt here.
const detect = existsSync(join(SHOTS, "final-detect.json")) ? JSON.parse(readFileSync(join(SHOTS, "final-detect.json"), "utf8")) : null;
const must = (p) => { if (!existsSync(join(MOCKS, p))) throw new Error(`missing ${p}`); return p; };
const fig = (img, title, links, alt) => `<figure class="shot"><a href="${must(img)}"><img src="${img}" alt="${esc(alt)}" loading="lazy" width="720" height="450"></a><figcaption><span class="t">${esc(title)}</span><span class="links">${links.map(([h, l]) => `<a href="${must(h)}">${esc(l)}</a>`).join(" · ")}</span></figcaption></figure>`;
const desktop = SCREENS.flatMap((s) => ["light", "dark"].map((m) => fig(`screenshots/final-${s.key}.${m}.1440x900.png`, `${s.name} · ${m}`, [[`screens/${s.key}.${m}.html`, "open the mock"], [`screenshots/final-${s.key}.${m}.1440.full.png`, "full page"], [`screenshots/final-${s.key}.${m}.1280x800.png`, "1280 × 800"]], `${s.name}, ${m} mode, 1440 by 900`)));
const phone = SCREENS.filter((s) => s.phone).map((s) => fig(`screenshots/final-${s.key}.light.390x844.png`, `${s.name} · 390 × 844`, [[`screens/${s.key}.light.html`, "open the mock"], [`screenshots/final-${s.key}.light.390.full.png`, "full page"]], `${s.name}, light mode, phone width`));
const pvBytes = statSync(join(PREVIEW, "kiwi-ui-preview.html")).size;
const row = (k, v) => `<tr><th scope="row">${esc(k)}</th><td>${v}</td></tr>`;
const phoneRows = Object.entries(S["DW-7.3"]).map(([f, x]) => `${esc(f.replace("final-", "").replace(".390x844.png", ""))}: scroll width ${x.scrollWidth} px, ${x.controls} controls, ${x.under44} under 44 px`).join("<br>");
const html = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kiwi UI Stage 1 · sign-off</title>
<meta name="description" content="The Stage 1 sign-off index: the six screens in light and dark and at phone width, the clickable preview and the sheets of Phases 2, 4 and 6.">
<link rel="stylesheet" href="assets/fonts/source-sans-3.css">
<style id="tokens">
${tokensCss()}
</style>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; background: var(--background); color: var(--text); font-family: var(--font-ui); font-size: var(--text-base); line-height: var(--leading-base); }
  main { max-width: 1240px; margin: 0 auto; padding: var(--space-7) var(--space-5) var(--space-8); }
  h1 { margin: 0 0 var(--space-3); font-size: var(--text-3xl); line-height: var(--leading-3xl); font-weight: var(--weight-semibold); letter-spacing: var(--tracking-tight); }
  h2 { margin: var(--space-7) 0 var(--space-3); font-size: var(--text-2xl); line-height: var(--leading-2xl); font-weight: var(--weight-semibold); }
  p { margin: 0 0 var(--space-3); max-width: 72ch; }
  .lede { font-size: var(--text-lg); line-height: var(--leading-lg); }
  .ask { margin: var(--space-5) 0; padding: var(--space-4) var(--space-5); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sheet); }
  .ask p:last-child { margin-bottom: 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr)); gap: var(--space-5) var(--space-5); }
  .grid.phone { grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); }
  .shot { margin: 0; }
  .shot img { display: block; width: 100%; height: auto; border: 1px solid var(--border); }
  .shot figcaption { display: grid; gap: 2px; margin-top: var(--space-2); font-size: var(--text-sm); line-height: var(--leading-sm); }
  .shot .t { font-weight: var(--weight-semibold); }
  .shot .links { color: var(--text-secondary); }
  a { color: var(--link); text-underline-offset: 2px; }
  table { border-collapse: collapse; width: 100%; max-width: 980px; font-size: var(--text-sm); line-height: var(--leading-sm); }
  th, td { text-align: left; vertical-align: top; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border-subtle); }
  th { width: 220px; color: var(--text-secondary); font-weight: var(--weight-semibold); }
  ul.open { padding-left: var(--space-5); max-width: 80ch; }
  ul.open li { margin-bottom: var(--space-2); }
  code { font-family: var(--font-mono); font-size: 0.875em; }
</style>
</head>
<body>
<main>
  <h1>Kiwi UI Stage 1 · sign-off</h1>
  <p class="lede">The six named screens, composed from <code>kiwi-ui/DESIGN.md</code> and the page specs of <code>kiwi-ui/JOURNEY.md</code>, in light and dark at 1440 × 900 and, for the four student and sign-in screens, at 390 × 844. Every colour on them is a token, every word is the Phase 5 copy, and the mascot is the Phase 4 drawings.</p>
  <div class="ask"><p><strong>The question for you (DW-7.6):</strong> seen beside the mascot, do these screens read as one product?</p><p>Open the clickable preview to try them: switch screen, theme and width in the frame above the product, type a question in the chat to watch Kiwi run until the answer is complete, then hop and fly once and stand, like an answer to see the wave, and use the frame's Offline and Fail the next answer to reach those states.</p></div>
  <p><a href="preview/kiwi-ui-preview.html"><strong>Open the clickable preview</strong></a> (one self-contained file, ${(pvBytes / 1048576).toFixed(2)} MB, works offline).</p>

  <h2>The 12 mocks (1440 × 900)</h2>
  <div class="grid">${desktop.join("\n")}</div>

  <h2>The four student and sign-in screens at 390 × 844 (light)</h2>
  <div class="grid phone">${phone.join("\n")}</div>

  <h2>The sheets behind them</h2>
  <div class="grid">
    ${fig("screenshots/swatch-sheet.1440x900.png", "Phase 2 · the swatch sheet (the locked tokens)", [["swatch-sheet.html", "open the sheet"], ["screenshots/swatch-sheet.1440.full.png", "full page"]], "The Phase 2 swatch sheet")}
    ${fig("screenshots/companion-sheet.1440x900.png", "Phase 4 · the companion sheet (the nine states, playing)", [["companion-sheet.html", "open the sheet"], ["screenshots/companion-states.strip.gif", "the nine states, animated"]], "The Phase 4 companion sheet")}
    ${fig("screenshots/chart-sheet.1440x900.png", "Phase 6 · the chart sheet (the six screens draw no chart)", [["chart-sheet.html", "open the sheet"], ["screenshots/chart-sheet.1440.full.png", "full page"]], "The Phase 6 chart sheet")}
    ${fig("screenshots/chart-sheet.cvd-deuteranopia.png", "Phase 6 · the colour-vision strip (deuteranopia)", [["screenshots/chart-sheet.cvd-none.png", "normal vision"], ["screenshots/chart-sheet.cvd-protanopia.png", "protanopia"], ["screenshots/chart-sheet.cvd-deuteranopia.dark.png", "dark"], ["screenshots/chart-sheet.donuts.cvd-deuteranopia.png", "the donuts"]].filter(([h]) => existsSync(join(MOCKS, h))), "The chart series under deuteranopia simulation")}
  </div>

  <h2>What is still yours to decide</h2>
  <ul class="open">
    <li><strong>The sign-off itself</strong> (DW-7.6), above.</li>
    <li><strong>Phase 6, F12:</strong> chart slot 1 is the accent green, so on System analytics one green carries three meanings, and in the donuts slot 1 sits close to Other under colour-vision simulation. Should a categorical chart skip slot 1 and start at slot 2? See the chart sheet.</li>
    <li><strong>Phase 4, A-7:</strong> whether a dislike gets a brief, neutral mascot acknowledgement as a like gets the wave. Today a dislike fills its thumb and says "Feedback saved." with no clip, in the strip and in the preview.</li>
    <li><strong>Paper in dark mode</strong> (DESIGN.md open question): the PDF page stays white and is dimmed to 92 %. See the dark chat mock.</li>
    <li><strong>The ruler's ticks in Safari</strong> (DESIGN.md open question): Chrome draws one tick per line on Latin (24 px) and CJK (28 px) blocks; please open <a href="screens/chat.light.html">the chat mock</a> in Safari to confirm the same.</li>
    <li><strong>Three calls made in this phase</strong> you may overrule: on the code page "Ask Kiwi to check" is the one filled button (TD-15), with "Open in chat" outlined and "Save code" as text; on a phone the sign-in aside's two lines follow the form instead of being hidden; and below 600 px, where the chat panel is always fullscreen, its four view buttons are hidden (today they stay, and one of them shows a view the panel is not in).</li>
    <li><strong>The sign-in page at 1440</strong> (polish, the review's item 9): the aside is a framed sheet with about 600 px of empty middle between the wordmark and its two lines. Keep it as the folio's quiet margin, or tighten it?</li>
  </ul>

  <h2>Noted for the implementation plan</h2>
  <ul class="open">
    <li><strong>No page heading on the chat and code pages, as today.</strong> <code>ClassChat.tsx</code> and <code>ClassIDE.tsx</code> render no <code>h1</code>; the mocks keep the page structure Stage 1 does not change. The plan should give both routes an <code>h1</code> (it may be visually hidden), as Sign in, Your classes and the admin pages already have.</li>
    <li><strong>The launcher overlaps the end of the content on phones</strong> (the floating disc over the last lines at scroll end); its resting place is Stage 2.</li>
    <li><strong>No institution logo is exercised</strong> in these renders: the top bar shows Kiwi's own mark, as the branding default does.</li>
  </ul>

  <h2>Evidence (from the audit)</h2>
  <table>
    ${row("Renders", `12 mocks + 4 phone renders; ${S["DW-7.1"].failedRequests} failed requests, ${S["DW-7.1"].consoleErrors} console errors, ${S["DW-7.1"].imagesFailed} images not decoded; ${esc(audit.chrome || "")}`)}
    ${row("Colour (DW-7.2)", `${S["DW-7.2"].staticLiterals} colour literals outside the pasted token block; ${S["DW-7.2"].runtimeChecked.toLocaleString("en-US")} painted colours checked, ${S["DW-7.2"].runtimeOffToken} off-token`)}
    ${row("Phone (DW-7.3)", phoneRows)}
    ${row("Companion and menu (DW-7.4)", `one turn, frame by frame: ${esc((S["DW-7.4"].sequence || []).join(" → "))}; then peek, retract, wave, error and offline; every state shown (${esc((S["DW-7.4"].states || []).join(", "))}); ${S["DW-7.4"].avatars.sharedFraming} of ${S["DW-7.4"].avatars.checked} avatar drawings in the one shared full-body framing, ${S["DW-7.4"].avatars.notFullBody} portrait; the Display menu's groups: ${esc((S["DW-7.4"].menuGroups || []).join(", "))}`)}
    ${row("Words, type, paper, mascot (DW-7.7)", `${S["DW-7.7"].unmatchedStrings} strings outside the revision index, the kept lists and the page specs; ${S["DW-7.7"].montserratOutsideWordmark} Montserrat outside the wordmark; ${S["DW-7.7"].mascotFilesNotPhase4} mascot images outside the Phase 4 export`)}
    ${row("Contrast (beyond the DW list)", `lowest text contrast ${S.contrast.min.toFixed(2)}:1; ${S.contrast.below} texts below their AA target`)}
    ${S.axe ? row("Accessibility (beyond the DW list)", `axe-core ${esc(S.axe.version)} on the 12 mocks (the WCAG 2.0, 2.1 and 2.2 A and AA rule tags): ${S.axe.violations} violations`) : ""}
    ${row("Round 1 fixes", `the composer peek's slot on the field's top-right corner in ${S.peek.exhibits} exhibits (largest offset ${S.peek.maxRightDelta} px right, ${S.peek.maxBottomDelta} px bottom); ${Object.keys(S.grips).length} resize grips in <code>--border-interactive</code>: ${esc(Object.entries(S.grips).map(([k, v]) => `${k}, ${v}`).join("; "))}; ${S.fields.checked} text fields whose input fills its box (smallest share of the box that hit-tests as the input: ${S.fields.minHitShare}; at 390 with a coarse pointer the fields hit-test ${esc(S.fields.phoneFieldHits.map((h) => h.split("x")[1]).join(", "))} px tall)`)}
    ${detect ? row("AI-tell detector", `on the 12 mocks ${detect.runs.mocks.findings.length} findings, all <code>nested-cards</code> on controls and floating surfaces inside the chat sheets (DESIGN.md: Controls are not cards); on the preview ${detect.runs.preview.findings.length}, <code>overused-font</code>, the inlined face of the wordmark only (G6), a false positive. The rationale for each is in <a href="${must("screenshots/final-detect.json")}">screenshots/final-detect.json</a>`) : ""}
    ${row("Audit file", `<a href="${must("screenshots/final-audit.json")}">screenshots/final-audit.json</a> (tokens sha256 ${esc(audit.tokens)})`)}
  </table>
</main>
</body>
</html>
`;
writeFileSync(join(MOCKS, "sign-off.html"), html);
console.log("wrote", rel(join(MOCKS, "sign-off.html")));
