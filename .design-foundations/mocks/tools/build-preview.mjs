#!/usr/bin/env node
// build-preview.mjs: the clickable preview (plan Decision Log, "Phase 7 also delivers a clickable preview"):
// .design-foundations/mocks/preview/kiwi-ui-preview.html, ONE self-contained file. The product is the same six screens
// the gated mocks render (lib/screens.mjs in "preview" mode: access-changing, sign-in and email actions drawn disabled with
// the Phase 3 reason pattern and the preview-chrome reason), with the fonts and every image inlined as data URIs, inside
// an iframe (srcdoc) so 1440 and 390 are real viewports; the preview frame around it is plainly not the product.
//   node build-preview.mjs
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { ASSETS as ASSET_DIR, PREVIEW, TOOLS, rel } from "./lib/paths.mjs";
import { SCREENS, chatPanel, tutorRow, userRow, welcome, metaLine, PREVIEW_REASON } from "./lib/screens.mjs";
import { launcher, button, esc, mi, si, resetIds } from "./lib/ui.mjs";
import { t, q, kept, asis, doc } from "./lib/copy.mjs";
import { still, cell, CLIPS, GEOMETRY, STILL_ATLAS, AVATAR_STILL, REST } from "./lib/mascot.mjs";
import * as D from "./lib/demo.mjs";
import { tokensCss, tokensHash, mockCss } from "./build-mocks.mjs";

const MIME = { ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const dataUri = (p) => `data:${MIME[extname(p)]};base64,${readFileSync(join(ASSET_DIR, p)).toString("base64")}`;
const used = new Set();
const url = (p) => { used.add(p); return `asset:${p}`; };

// ---------- the product: templates for the six screens, the chat panel and the snippets the demo inserts ----------
resetIds();
const ctx = { theme: "light", mode: "preview", url };
const TITLES = { "sign-in": "Sign in to Kiwi", "course-list": "Your classes", chat: "Materials", code: "Scratchpad", "enroll-students": "Enroll students", "edit-class": "Edit class" }; // DESIGN.md § Page names
const templates = SCREENS.map((s) => `<template id="tpl-${s.key}" data-title="${esc(TITLES[s.key])}">${s.build(ctx)}</template>`).join("\n");
const thinking = `<p class="tk wait">${esc(t("SR-6.69", { dots: "" }))}<span class="dots" aria-hidden="true">…</span></p>`;
const SNIP = {
  panel: chatPanel(ctx),
  launcher: launcher(),
  peek: `<span class="peek">${cell("stamp-peek", 0, 48, 96, { url })}</span>`,
  userRow: userRow("{TEXT}"),
  tutorWalk: tutorRow(ctx, { state: "walk", blocks: [thinking], attrs: ` data-newest="true"` }),
  thinking,
  meta: metaLine(ctx, { cite: 4 }),
  errorRow: tutorRow(ctx, { state: "error", blocks: [`<div class="err-row tk" role="alert">${si("cross")}<div><p>${esc(t("SR-6.21"))}</p>${button(t("DS.18"), "secondary", { act: "retry" })}</div></div>`] }),
  offline: `<p class="status-line" role="status" id="composer-offline">${si("triangle")}${esc(q("CP.10"))}</p>`,
  send: `<button type="button" class="send" aria-label="${esc(t("SR-6.03"))}" title="${esc(t("SR-6.03"))}" data-act="send">${mi("SendOutlined")}</button>`,
  stop: `<button type="button" class="btn btn-secondary" aria-label="${esc(t("DS.08"))}" data-act="stop">${esc(doc("DS.08", "Stop"))}</button>`,
  welcomeEmpty: `<div class="empty-inline">${still(AVATAR_STILL.idle, 64, { url, as: "idle", ink: true })}<p class="tk">${esc(t("SR-6.01"))}</p></div>`, // the welcome frame: the standing still in the shared framing, ink-aligned in light mode
  welcomeRow: welcome(ctx),
  thumb_up_on: mi("ThumbUp"), thumb_up_off: mi("ThumbUpOutlined"), thumb_down_on: mi("ThumbDown"), thumb_down_off: mi("ThumbDownOutlined"),
  iconCheck: si("check"), iconDash: si("dash"), iconInfo: si("info"),
};
const COPY = {
  dismiss: t("DS.19"), fullscreen: t("SR-6.32"), exitFullscreen: t("SR-6.33"), noPrevious: t("SR-6.06"), copied: t("DS.22"),
  answering: t("DS.07"), finished: t("CP.12"), feedbackSaved: t("CP.13"), paused: q("CP.11"), reducedReason: t("DS.05"), storageCaption: t("DS.06"),
  noRecitations: t("S-02.17"), running: t("S-03.12"), removeSelected: t("A-16.08", { n: "{n}" }), emailSelected: t("A-16.07", { n: "{n}" }),
  noMatch: t("A-16.13", { query: "{query}" }), untitled: t("S-01.04"), noInstructor: t("S-01.05"),
  instructionsOff: asis("A-13", "Kiwi uses only its built-in instructions for this class."), replaceImage: kept("A-13", "Replace image"), saving: t("A-13.08"), classSaved: t("A-13.09"),
  // preview chrome (the frame speaks these; never in a gated render)
  previewNotHere: "That page isn't part of this preview.", previewOneClass: "This preview has one demo class.", previewOneLecture: "This preview has one lecture to show.",
  previewTwoPages: "This preview shows pages 3 and 4 of the lecture.", previewFlag: "Flag opens the browser's own prompt in the product; it isn't part of this preview.",
  previewCite: "In the product the citation opens that page of the lecture.",
};
const code = D.CODE.map((l) => l.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")).join("\n");
const DEMO = {
  classTitle: D.CLASS.title, answer: D.FRAME.answer, output: D.OUTPUT,
  openInChat: `${asis("S-03", "I have the following solution for question #.")}\n\n\`\`\`python\n${code}\n\`\`\`\nOutput:\n\`\n${D.OUTPUT}\n\``,
  checkAnswer: `${asis("S-03", "Check my answer for question #.")}\n\n\`\`\`python\n${code}\n\`\`\``,
};
// the runtime's drawings, read off the clip table: every clip's atlas (the avatar's at 64 px, the peek's at 96 px) and the
// still each avatar state rests on at 64 px (the 32 px avatar at 2x); the 64 px slots' 128 px stills come with the templates
// (the runtime gets only the tables it plays from: no name of an atlas or still it never shows)
const PLAYED = Object.values(CLIPS).filter((c) => c.seq.length).map((c) => c.atlas);
const AVATAR = Object.fromEntries(Object.entries(AVATAR_STILL).filter(([state]) => CLIPS[state].atlas !== "stamp-peek")); // the peek is removed, never stilled
const RESTS = Object.fromEntries([...new Set(Object.values(AVATAR))].map((n) => [n, STILL_ATLAS[n]]));
const GEO = Object.fromEntries([...new Set([...PLAYED, ...Object.values(RESTS)])].map((a) => [a, GEOMETRY[a]]));
for (const a of new Set(PLAYED)) used.add(a === "stamp-peek" ? "mascot/atlas/stamp-peek.96.webp" : `mascot/atlas/${a}.64.webp`);
for (const n of Object.keys(RESTS)) used.add(`mascot/stills/${n}.64.webp`);
const ASSETS = Object.fromEntries([...used].sort().map((p) => [p, dataUri(p)]));
// each face is listed twice in the CSS (format "woff2-variations", then "woff2" for older engines); inlined, that would carry
// every font twice, so one entry stays (every engine that runs this file reads a variable woff2 under "woff2")
const fontCss = (file) => readFileSync(join(ASSET_DIR, "fonts", file), "utf8")
  .replace(/url\(\.\/([^)]+)\) format\("woff2-variations"\),\s*url\(\.\/\1\) format\("woff2"\)/g, 'url(./$1) format("woff2")')
  .replace(/url\(\.\/([^)]+)\)/g, (_, f) => `url(${dataUri(`fonts/${f}`)})`);
const CFG = { ASSETS, COPY, CLIPS, GEOMETRY: GEO, STILL_ATLAS: RESTS, AVATAR_STILL: AVATAR, REST, SNIP, DEMO, START: "chat" };
const tokens = tokensCss(); const hash = tokensHash(tokens);
const product = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Kiwi</title>
<style id="fonts">
${fontCss("source-sans-3.css")}
${fontCss("montserrat-wordmark.css")}
</style>
<style id="tokens">
/* GENERATED: .design-foundations/tokens/generated/kiwi-ui.tokens.css (sha256 ${hash}), pasted verbatim. */
${tokens}
</style>
<style id="mock">
${mockCss()}
</style>
<style id="preview">
${readFileSync(join(TOOLS, "preview", "product.css"), "utf8")}
</style>
</head>
<body>
${templates}
<script>window.__KIWI_PREVIEW__ = ${JSON.stringify(CFG)};</script>
<script>
${readFileSync(join(TOOLS, "preview", "app.js"), "utf8")}
</script>
</body>
</html>`;

// ---------- the preview frame (outside the product) ----------
const btn = (group, value, label, pressed) => `<button type="button" class="pv-btn" data-group="${group}" data-value="${value}" aria-pressed="${pressed}">${esc(label)}</button>`;
const tog = (key, label, extra = "") => `<button type="button" class="pv-btn pv-toggle" data-toggle="${key}" aria-pressed="false"${extra}>${esc(label)}</button>`;
const escaped = product.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
const frameCss = readFileSync(join(TOOLS, "preview", "frame.css"), "utf8");
const page = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kiwi UI Stage 1 · clickable preview</title>
<meta name="description" content="A clickable preview of the six Stage 1 screens of the Kiwi UI redesign: one self-contained file, no network.">
<!-- Kiwi UI Stage 1, Phase 7: the clickable preview. Generated by .design-foundations/mocks/tools/build-preview.mjs from the
     same screens as the gated mocks (.design-foundations/mocks/screens/). One self-contained file: fonts and images inlined,
     no network, nothing sent anywhere. The bar above the product is the preview frame, not the product. -->
<style id="tokens">
${tokens}
</style>
<style id="frame">
${frameCss}
</style>
</head>
<body class="pv">
<header class="pv-bar">
  <div class="pv-head"><p class="pv-title">Kiwi UI · Stage 1 preview</p><p class="pv-sub">Preview frame: these controls are not part of the product.</p></div>
  <div class="pv-groups">
    <div class="pv-group" role="group" aria-label="Screen"><span class="pv-label">Screen</span>${[["sign-in", "Sign-in"], ["course-list", "Course list"], ["chat", "Chat"], ["code", "Code page"], ["enroll-students", "Enroll students"], ["edit-class", "Edit class"]].map(([k, l]) => btn("screen", k, l, k === "chat")).join("")}</div>
    <div class="pv-group" role="group" aria-label="Theme"><span class="pv-label">Theme</span>${btn("theme", "light", "Light", true)}${btn("theme", "dark", "Dark (behind its flag)", false)}</div>
    <div class="pv-group" role="group" aria-label="Width"><span class="pv-label">Width</span>${btn("width", "1440", "1440", true)}${btn("width", "390", "390", false)}</div>
    <div class="pv-group" role="group" aria-label="Chat demo"><span class="pv-label">Chat demo</span>${tog("offline", "Offline", ` data-on-note="Going offline: the change shows after 2 s, as the product waits out a flapping connection." data-off-note="Back online: the change shows after 2 s."`)}${tog("failNext", "Fail the next answer", ` data-on-note="The next answer fails: send a question to see the error state."`)}${tog("reduced", "Reduced motion")}</div>
  </div>
  <p class="pv-note" id="pv-note" role="status" aria-live="polite"></p>
</header>
<main class="pv-stage" id="stage">
  <div class="pv-device-box" id="device-box"><div class="pv-device" id="device"><iframe id="product" title="Kiwi (preview)"></iframe></div></div>
  <p class="pv-foot"><span id="pv-scale"></span> · Nothing you do here is sent anywhere. Typing a question in the chat runs a scripted answer. Sign-in, enrolment, removals and email are drawn disabled: ${esc(PREVIEW_REASON)}.</p>
</main>
<script type="text/plain" id="product-html">${escaped}</script>
<script>
${readFileSync(join(TOOLS, "preview", "frame.js"), "utf8")}
</script>
</body>
</html>
`;
mkdirSync(PREVIEW, { recursive: true });
const out = join(PREVIEW, "kiwi-ui-preview.html");
writeFileSync(out, page);
const bytes = statSync(out).size;
console.log(`wrote ${rel(out)}: ${(bytes / 1048576).toFixed(2)} MB (${bytes} B); ${Object.keys(ASSETS).length} inlined images; tokens sha256 ${hash}`);
if (bytes > 8 * 1048576) { console.error("over the 8 MB budget"); process.exit(2); }
