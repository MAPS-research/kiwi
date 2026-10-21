#!/usr/bin/env node
// shoot-mocks.mjs: the Phase 7 evidence. Re-pastes the generated tokens (build-mocks.mjs), then opens each of the 12
// renders from disk in one headless Chrome over the DevTools protocol (tokens/tools/cdp.mjs) and, per render:
//   DW-7.1  zero failed requests, zero console errors, every image decoded, the faces loaded; screenshots at
//           1440 × 900 and 1280 × 800 and the full page;
//   DW-7.2  static: no colour literal outside the pasted token block; runtime: every painted colour of every element
//           (text, fills, borders, outlines, decorations, SVG fill and stroke, shadows, gradient stops) is one of the
//           mode's resolved token values (or transparent); artwork and content rasters are images, listed apart;
//   DW-7.3  for the four student/auth renders at 390 × 844 with touch and (pointer: coarse) emulated: no horizontal
//           scroll, and every control's hit extent (elementFromPoint along both axes through its centre) ≥ 44 × 44;
//   DW-7.4  the chat render: the nine states of the strip and the Display menu's two groups;
//   DW-7.7  every visible string and accessible name is in the strings manifest the build wrote (index, kept, as-is,
//           design, branding; content and the strip's annotation counted apart); Montserrat only inside the wordmark;
//           paper on the frozen white at 92 % in dark; the logo text on the G2 neutral; every mascot image a Phase 4 file;
//   and, beyond the DW list, the text contrast of every rendered text against its effective background.
// Writes ../screenshots/final-*.png and ../screenshots/final-audit.json. Nothing here is machine-specific.
//   node shoot-mocks.mjs
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { SCREENS as OUTDIR, SHOTS, ASSETS, CDP, TOOLS, REPO, rel } from "./lib/paths.mjs";
import { SCREENS } from "./lib/screens.mjs";
import { phase4Files, inventoryBytes, GEOMETRY, AVATAR_ATLASES } from "./lib/mascot.mjs";
import { buildGated } from "./build-mocks.mjs";

const { withPage } = await import(pathToFileURL(CDP).href);
// optional: axe-core from kiwi-ui's own dev dependencies, when installed (a local file; no network), for an accessibility pass
const AXE_FILE = join(REPO, "kiwi-ui", "node_modules", "axe-core", "axe.min.js");
const AXE = existsSync(AXE_FILE) ? readFileSync(AXE_FILE, "utf8") : null;
const AXE_RUN = `axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] }).then((r) => ({ version: axe.version, violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })) }))`;
const built = buildGated();
const manifest = JSON.parse(readFileSync(join(TOOLS, "generated", "strings-manifest.json"), "utf8"));
const audit = { date: new Date().toISOString().slice(0, 10), tokens: built.hash, chrome: null, renders: {}, phone: {}, static: {}, summary: {} };

// ---------- static scan (DW-7.2): no colour literal outside <style id="tokens"> ----------
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color|color-mix|light-dark)\(|\b(?:black|white|red|green|blue|gray|grey|silver|purple|orange|yellow|navy|teal|maroon|olive|lime|aqua|fuchsia)\b(?=\s*[;}"'])/gi;
for (const s of SCREENS) for (const theme of ["light", "dark"]) {
  const file = join(OUTDIR, `${s.key}.${theme}.html`);
  const html = readFileSync(file, "utf8");
  const rest = html.replace(/<style id="tokens">[\s\S]*?<\/style>/, "").replace(/<!--[\s\S]*?-->/g, "");
  const hits = [...rest.matchAll(COLOUR)].map((m) => m[0]);
  audit.static[`${s.key}.${theme}`] = { literals: hits.length, sample: hits.slice(0, 5), tokenBlock: /<style id="tokens">\n\/\* GENERATED/.test(html) };
}

// ---------- the in-page audit ----------
const IN_PAGE = String.raw`(async () => {
  const tokenCss = document.getElementById("tokens").textContent;
  const names = [...new Set([...tokenCss.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))];
  const root = getComputedStyle(document.documentElement);
  const probe = document.createElement("i"); probe.style.display = "none"; document.body.appendChild(probe);
  const canon = (v) => { probe.style.color = ""; probe.style.color = v; return probe.style.color ? getComputedStyle(probe).color : null; };
  const colourIn = (v) => (v.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b/g) || []).map(canon).filter(Boolean);
  const allowed = new Set(["rgba(0, 0, 0, 0)"]); const tokenOf = {};
  for (const n of names) { const v = root.getPropertyValue(n).trim(); if (!v) continue; for (const c of [canon(v), ...colourIn(v)].filter(Boolean)) { allowed.add(c); (tokenOf[c] ||= n); } }
  probe.remove();
  // painted colours of every element and its ::before / ::after
  const bad = []; let checked = 0;
  const SHAPES = new Set(["path", "circle", "rect", "line", "polyline", "polygon", "ellipse"]);
  const visit = (el, pseudo) => {
    const cs = getComputedStyle(el, pseudo);
    if (pseudo && (cs.content === "none" || cs.content === "normal")) return;
    if (cs.display === "none") return;
    const take = (prop, val) => { if (!val) return; checked++; if (!allowed.has(val)) bad.push({ el: (el.className && el.className.baseVal !== undefined ? el.tagName : el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : "")) + (pseudo || ""), prop, val }); };
    const tag = el.tagName.toLowerCase();
    if (el instanceof SVGElement) { if (SHAPES.has(tag)) { if (cs.fill !== "none") take("fill", cs.fill); if (cs.stroke !== "none") take("stroke", cs.stroke); } return; }
    take("color", cs.color);
    take("background-color", cs.backgroundColor);
    for (const side of ["top", "right", "bottom", "left"]) if (parseFloat(cs["border-" + side + "-width"]) > 0 && cs["border-" + side + "-style"] !== "none") take("border-" + side + "-color", cs["border-" + side + "-color"]);
    if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) take("outline-color", cs.outlineColor);
    if (cs.textDecorationLine !== "none") take("text-decoration-color", cs.textDecorationColor);
    if (cs.boxShadow !== "none") for (const c of colourIn(cs.boxShadow)) take("box-shadow", c);
    if (cs.backgroundImage !== "none" && !/^url\(/.test(cs.backgroundImage)) for (const c of colourIn(cs.backgroundImage)) take("background-image", c);
  };
  const all = [...document.body.querySelectorAll("*")];
  for (const el of all) { visit(el, null); if (!(el instanceof SVGElement)) { visit(el, "::before"); visit(el, "::after"); } }
  for (const el of document.querySelectorAll("input, textarea")) { const cs = getComputedStyle(el, "::placeholder"); checked++; if (!allowed.has(cs.color)) bad.push({ el: el.tagName.toLowerCase() + "::placeholder", prop: "color", val: cs.color }); }
  const images = [...document.images].map((im) => ({ src: decodeURI(im.getAttribute("src")), ok: im.complete && im.naturalWidth > 0 }));
  const bgUrls = [...new Set(all.map((el) => getComputedStyle(el).backgroundImage).filter((b) => /url\(/.test(b)).flatMap((b) => [...b.matchAll(/url\("?([^")]+)"?\)/g)].map((m) => decodeURI(m[1]))))];
  // decode the background images too (a sprite that failed would leave an empty slot)
  const bgOk = await Promise.all(bgUrls.map((u) => new Promise((res) => { const im = new Image(); im.onload = () => res({ u, ok: im.naturalWidth > 0 }); im.onerror = () => res({ u, ok: false }); im.src = u; })));
  // strings (DW-7.7)
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const texts = []; let n;
  while ((n = walker.nextNode())) { const s = n.nodeValue.replace(/\s+/g, " ").trim(); if (!s) continue; const p = n.parentElement; if (p.closest("script, style")) continue; const cs = getComputedStyle(p); if (cs.display === "none" || cs.visibility === "hidden") continue; texts.push({ s, annotation: !!p.closest("[data-annotation]"), content: !!p.closest("[data-content], math, code") }); }
  const attrs = [];
  for (const el of document.body.querySelectorAll("[aria-label], [title], [placeholder], img[alt]")) for (const a of ["aria-label", "title", "placeholder", "alt"]) { const v = el.getAttribute(a); if (v && v.trim()) attrs.push({ a, s: v.trim() }); }
  // fonts, Montserrat, paper, logo, mascot
  await document.fonts.ready;
  const montserrat = all.filter((el) => /montserrat/i.test(getComputedStyle(el).fontFamily)).map((el) => ({ inWordmark: !!el.closest(".kiwi-wordmark"), tag: el.tagName.toLowerCase(), text: el.textContent.trim().slice(0, 20) }));
  const facesLoaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "") + " " + f.style + " " + f.weight);
  const paper = [...document.querySelectorAll(".paper")].map((p) => ({ bg: getComputedStyle(p).backgroundColor, imgOpacity: getComputedStyle(p.querySelector("img")).opacity, frame: getComputedStyle(p).borderTopColor }));
  const logo = [...document.querySelectorAll(".logo-text")].map((l) => ({ color: getComputedStyle(l).color, token: tokenOf[getComputedStyle(l).color] }));
  const mascot = [...document.querySelectorAll("[data-mascot]")].map((m) => ({ kind: m.dataset.mascot, state: m.dataset.state || null, atlas: m.dataset.atlas || null, cell: m.dataset.cell, url: decodeURI((getComputedStyle(m.firstElementChild).backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1] || ""), size: getComputedStyle(m).width }));
  // contrast of every rendered text against its effective background (WCAG 2.x)
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const L = (c) => { const [r, g, b] = parse(c); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
  const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const a = parse(c)[3]; if (a === undefined || a > 0.5) return c; } return getComputedStyle(document.documentElement).backgroundColor; };
  const contrast = []; const seen = new Set();
  for (const t of document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT) && (() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let x; while ((x = w.nextNode())) if (x.nodeValue.trim()) out.push(x.parentElement); return out; })()) {
    if (seen.has(t)) continue; seen.add(t);
    if (t.closest("script, style, math, [inert] .kiwi, .paper")) continue;
    const cs = getComputedStyle(t); if (cs.display === "none" || cs.visibility === "hidden" || !t.getClientRects().length) continue;
    const inert = !!t.closest('[aria-disabled="true"]');
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 600;
    const large = size >= 24 || (bold && size >= 18.66);
    const r = ratio(cs.color, bgOf(t));
    contrast.push({ r: +r.toFixed(2), need: inert ? 0 : large ? 3 : 4.5, text: t.textContent.trim().slice(0, 40), inert });
  }
  const failsContrast = contrast.filter((c) => c.r < c.need);
  // chat: the strip and the Display menu (DW-7.4)
  // every frame of the strip is a fixed-height crop: the newest row's controls (Retry, the feedback row) and the composer's must show whole
  const stripClip = [...document.querySelectorAll(".frame[data-state]")].map((f) => { const box = f.querySelector(".chat").getBoundingClientRect(); const ctrls = [...f.querySelectorAll("[data-newest] button, .composer button, .composer .control")]; const cut = ctrls.filter((c) => { const r = c.getBoundingClientRect(); return r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5 || r.left < box.left - 0.5 || r.right > box.right + 0.5; }).map((c) => (c.getAttribute("aria-label") || c.textContent || c.className).trim().slice(0, 30)); return { state: f.dataset.state, step: f.dataset.step || null, controls: ctrls.length, clipped: cut }; });
  const peeks = [...document.querySelectorAll(".kiwi.is-peek")].map((pk) => { const ctl = pk.closest(".control"); const a = pk.getBoundingClientRect(), c = ctl ? ctl.getBoundingClientRect() : null; return c ? { rightDelta: +(a.right - c.right).toFixed(2), bottomDelta: +(a.bottom - c.top).toFixed(2), size: Math.round(a.width) } : { anchored: false }; });
  const grips = [...document.querySelectorAll(".grip")].filter((g) => getComputedStyle(g).display !== "none" && g.getClientRects().length).map((g) => {
    const bar = getComputedStyle(g, "::before"); const r = g.getBoundingClientRect(); const cy = r.top + r.height / 2, cx = r.left + r.width / 2;
    const side = (x) => bgOf(document.elementsFromPoint(x, cy).find((e) => e !== g && !g.contains(e)) || document.body);
    const left = side(cx - 6), right = side(cx + 6);
    return { name: g.getAttribute("aria-label"), role: g.getAttribute("role"), tabindex: g.getAttribute("tabindex"), bar: bar.backgroundColor, size: bar.width + " x " + bar.height, contrastLeft: +ratio(bar.backgroundColor, left).toFixed(2), contrastRight: +ratio(bar.backgroundColor, right).toFixed(2) };
  });
  const fields = [...document.querySelectorAll(".control")].filter((c) => !c.closest("[inert]") && c.querySelector(":scope > input, :scope > textarea") && c.getClientRects().length).map((ctl) => {
    const inp = ctl.querySelector(":scope > input, :scope > textarea"); const c = ctl.getBoundingClientRect(); const i = inp.getBoundingClientRect();
    let n = 0, hit = 0; for (let y = 0; y < 7; y++) for (let x = 0; x < 9; x++) { const e = document.elementFromPoint(c.left + 0.6 + (c.width - 1.2) * x / 8, c.top + 0.6 + (c.height - 1.2) * y / 6); if (!e || !ctl.contains(e)) continue; n++; if (e === inp || (e.closest("button") && ctl.contains(e))) hit++; }
    return { tag: inp.tagName.toLowerCase(), box: Math.round(c.width) + "x" + (+c.height.toFixed(1)), input: Math.round(i.width) + "x" + (+i.height.toFixed(1)), hitShare: n ? +(hit / n).toFixed(3) : null };
  });
  const avatars = [...document.querySelectorAll(".tutor-row > .kiwi, .empty-inline > .kiwi")].map((k) => { const f = k.firstElementChild; return { left: f.style.left, top: f.style.top, width: f.style.width, image: (f.style.backgroundImage.match(/mascot\/[^"')]+/) || [""])[0] }; });
  const strip = [...document.querySelectorAll(".frame[data-state]")].map((f) => ({ state: f.dataset.state, step: f.dataset.step || null, drawings: [...f.querySelectorAll(".film [data-mascot]")].map((m) => (m.dataset.atlas || "still") + ":" + m.dataset.cell), newest: (f.querySelector("[data-newest] [data-mascot]") || {}).dataset ? { kind: f.querySelector("[data-newest] [data-mascot]").dataset.mascot, atlas: f.querySelector("[data-newest] [data-mascot]").dataset.atlas || null, cell: f.querySelector("[data-newest] [data-mascot]").dataset.cell } : null, olderStill: [...f.querySelectorAll(".tutor-row:not([data-newest]) [data-mascot]")].every((m) => m.dataset.mascot === "still"), peek: !!f.querySelector(".peek [data-mascot]") }));
  const menu = document.getElementById("display-menu");
  const menuGroups = menu ? [...menu.querySelectorAll('[role="group"]')].map((g) => ({ label: g.getAttribute("aria-label") || (document.getElementById(g.getAttribute("aria-labelledby")) || {}).textContent, items: [...g.querySelectorAll('[role="menuitemradio"], [role="menuitemcheckbox"], [role="switch"]')].map((i) => ({ role: i.getAttribute("role"), checked: i.getAttribute("aria-checked"), name: (i.textContent.trim() || (document.getElementById(i.getAttribute("aria-labelledby")) || {}).textContent || "").trim() })) })) : [];
  return { theme: document.documentElement.dataset.theme, tokens: names.length, colours: { allowed: allowed.size, checked, bad: bad.slice(0, 40), badCount: bad.length }, images, background: bgOk, texts, attrs, montserrat, facesLoaded, paper, logo, mascot, contrast: { n: contrast.length, min: Math.min(...contrast.filter((c) => !c.inert).map((c) => c.r)), fails: failsContrast.slice(0, 20), failCount: failsContrast.length }, strip, stripClip, avatars, peeks, grips, fields, menuGroups, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
})()`;

// hit-test every control (DW-7.3), under real (pointer: coarse) emulation
const HIT = String.raw`(() => {
  const vis = (el) => { const cs = getComputedStyle(el); return cs.display !== "none" && cs.visibility !== "hidden" && el.getClientRects().length > 0; };
  const sel = 'button, a[href], .control, [role="checkbox"], [role="switch"], [role="tab"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="combobox"], [tabindex="0"]';
  const out = []; const seen = new Set();
  for (const el of document.querySelectorAll(sel)) {
    if (seen.has(el) || !vis(el) || el.closest("[inert]") || el.closest("[data-annotation]")) continue;
    if (el.matches(".control input, .control textarea, .control [role=combobox]")) continue; // a field is its control
    seen.add(el);
    const r0 = el.getBoundingClientRect(); window.scrollTo(0, Math.max(0, r0.top + scrollY - innerHeight / 2 + r0.height / 2)); // the document only: an inner clip (the fullscreen chat panel) is never scrolled
    const b = el.getBoundingClientRect(); const cx = Math.floor(b.left + b.width / 2) + 0.5, cy = Math.floor(b.top + b.height / 2) + 0.5;
    const target = el.matches(".control") ? (el.querySelector(":scope > input, :scope > textarea, [role=combobox]") || el) : el; // a field counts only its input
    const mine = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === target || target.contains(h)); };
    const ext = (dx, dy) => { let a = 0, c = 0; while (a < 60 && mine(cx - (a + 1) * dx, cy - (a + 1) * dy)) a++; while (c < 60 && mine(cx + (c + 1) * dx, cy + (c + 1) * dy)) c++; return mine(cx, cy) ? a + c + 1 : 0; };
    const name = (el.getAttribute("aria-label") || el.textContent || el.className).trim().replace(/\s+/g, " ").slice(0, 36);
    const w = ext(1, 0), h = ext(0, 1);
    out.push({ name, cls: String(el.className).split(" ")[0] || el.tagName.toLowerCase(), drawn: Math.round(b.width) + "x" + Math.round(b.height), hit: w + "x" + h, ok: w >= 44 && h >= 44, covered: !mine(cx, cy) });
  }
  window.scrollTo(0, 0);
  return { coarse: matchMedia("(pointer: coarse)").matches, hoverNone: matchMedia("(hover: none)").matches, controls: out.length, under44: out.filter((c) => !c.ok && !c.covered), covered: out.filter((c) => c.covered).length, list: out, scrollWidth: document.documentElement.scrollWidth, innerWidth };
})()`;

const png = (b64, name) => { writeFileSync(join(SHOTS, name), Buffer.from(b64, "base64")); return name; };
await withPage({ url: "about:blank", width: 1440, height: 900 }, async ({ send, evaluate, on }) => {
  audit.chrome = (await send("Browser.getVersion").catch(() => ({}))).product || null;
  await send("Network.enable"); await send("Log.enable");
  let failed = [], errors = [];
  on((m) => {
    if (m.method === "Network.loadingFailed") failed.push(m.params.errorText + " " + (m.params.requestId || ""));
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) failed.push(m.params.response.status + " " + m.params.response.url);
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.text);
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errors.push(m.params.entry.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push("console.error");
  });
  const open = async (url, w, h, mobile) => {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
    await send("Emulation.setTouchEmulationEnabled", { enabled: !!mobile, maxTouchPoints: mobile ? 5 : 1 });
    failed = []; errors = [];
    const loaded = new Promise((res) => { const f = (m) => { if (m.method === "Page.loadEventFired") res(); }; on(f); });
    await send("Page.navigate", { url }); await Promise.race([loaded, new Promise((r) => setTimeout(r, 30000))]);
    await evaluate("document.fonts.ready.then(() => Promise.all([...document.images].map((i) => i.decode().catch(() => null)))).then(() => true)");
    await new Promise((r) => setTimeout(r, 250));
  };
  const full = async (w, h, name, mobile) => {
    await evaluate(`document.documentElement.style.setProperty("--screen-h", "${h}px"); true`);
    const H = Math.ceil(await evaluate("document.documentElement.scrollHeight"));
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: H, deviceScaleFactor: 1, mobile: !!mobile }); await new Promise((r) => setTimeout(r, 250));
    png((await send("Page.captureScreenshot", { format: "png" })).data, name);
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
    await evaluate(`document.documentElement.style.removeProperty("--screen-h"); true`);
    return H;
  };
  for (const s of SCREENS) for (const theme of ["light", "dark"]) {
    const key = `${s.key}.${theme}`; const url = pathToFileURL(join(OUTDIR, `${key}.html`)).href;
    await open(url, 1440, 900);
    const shots = [png((await send("Page.captureScreenshot", { format: "png" })).data, `final-${key}.1440x900.png`)];
    const a = await evaluate(IN_PAGE);
    a.failedRequests = failed.slice(); a.consoleErrors = errors.slice();
    if (AXE) { await evaluate(AXE + "; true"); a.axe = await evaluate(AXE_RUN); }
    a.fullHeight = await full(1440, 900, `final-${key}.1440.full.png`); shots.push(`final-${key}.1440.full.png`);
    await open(url, 1280, 800);
    shots.push(png((await send("Page.captureScreenshot", { format: "png" })).data, `final-${key}.1280x800.png`));
    a.scroll1280 = await evaluate("document.documentElement.scrollWidth");
    a.shots = shots;
    audit.renders[key] = a;
    if (a.axe) console.log(`${key}: axe ${a.axe.version}: ${a.axe.violations.length ? a.axe.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes})`).join("; ") : "no violations"}`);
    console.log(`${key}: colours ${a.colours.checked} checked, ${a.colours.badCount} off-token · images ${a.images.filter((i) => i.ok).length}/${a.images.length} + ${a.background.filter((b) => b.ok).length}/${a.background.length} bg · failed ${a.failedRequests.length} · errors ${a.consoleErrors.length} · contrast min ${a.contrast.min.toFixed(2)} (${a.contrast.failCount} below) · scroll ${a.scrollWidth}/${a.scroll1280}`);
  }
  // DW-7.3: the four student/auth screens at 390 × 844, light, touch and coarse pointer emulated
  for (const s of SCREENS.filter((x) => x.phone)) {
    const key = `${s.key}.light`; const url = pathToFileURL(join(OUTDIR, `${key}.html`)).href;
    await open(url, 390, 844, true);
    const shot = png((await send("Page.captureScreenshot", { format: "png" })).data, `final-${key}.390x844.png`);
    const hit = await evaluate(HIT);
    const a = await evaluate(IN_PAGE);
    const H = await full(390, 844, `final-${key}.390.full.png`, true);
    audit.phone[key] = { shot, full: `final-${key}.390.full.png`, fullHeight: H, ...hit, colours: { checked: a.colours.checked, badCount: a.colours.badCount, bad: a.colours.bad }, fields: a.fields, peeks: a.peeks, stripClip: a.stripClip, contrastMin: a.contrast.min, contrastFails: a.contrast.fails, texts: a.texts, attrs: a.attrs, failedRequests: failed.slice(), consoleErrors: errors.slice() };
    console.log(`${key} @390: coarse ${hit.coarse}, hover:none ${hit.hoverNone}, scrollWidth ${hit.scrollWidth}/${hit.innerWidth}, ${hit.controls} controls, ${hit.under44.length} under 44, ${hit.covered} covered`);
  }
  await send("Emulation.setTouchEmulationEnabled", { enabled: false });
});

// ---------- strings (DW-7.7) against the manifest ----------
const norm = (x) => x.replace(/\s+/g, " ").trim();
const entries = manifest.strings.map((e) => ({ ...e, text: norm(e.text) })); const exact = new Map(entries.map((e) => [e.text, e.sources]));
const kinds = (s) => [...new Set(entries.filter((e) => e.text.includes(s)).flatMap((e) => e.sources.map((x) => x.kind)))];
const strings = {};
for (const [key, a] of [...Object.entries(audit.renders), ...Object.entries(audit.phone).map(([k, v]) => [k + "@390", v])]) {
  const unmatched = [], byKind = {};
  for (const t of a.texts) { const k = kinds(t.s); if (!k.length) unmatched.push(t.s); else for (const x of k.includes("index") || k.includes("kept") || k.includes("as-is") || k.includes("design") || k.includes("branding") ? ["ui"] : k) byKind[x] = (byKind[x] || 0) + 1; }
  const attrBad = a.attrs.filter((x) => !exact.has(x.s)).map((x) => `${x.a}="${x.s}"`);
  strings[key] = { textNodes: a.texts.length, byKind, unmatched: [...new Set(unmatched)], attributes: a.attrs.length, attributesUnmatched: [...new Set(attrBad)] };
}
audit.strings = strings;

// ---------- mascot frames (DW-7.7): every URL a Phase 4 file, byte sizes as the inventory records ----------
const p4 = new Set(phase4Files());
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const urls = new Set(); for (const a of Object.values(audit.renders)) for (const m of a.mascot) urls.add(m.url);
const mascotFiles = [...urls].map((u) => { const relPath = u.replace(/^.*\/assets\//, "").replace(/^\.\.\/assets\//, ""); const f = join(ASSETS, relPath); return { file: relPath, phase4: p4.has(relPath), bytes: statSync(f).size, sha256: sha(f).slice(0, 16) }; });
const invBytes = inventoryBytes(); // the atlases, the nine state stills and the amendment's standing still
for (const m of mascotFiles) m.inventoryBytes = invBytes[m.file] ?? null;
audit.mascotFiles = mascotFiles;

// ---------- the avatar (DESIGN.md § Companion, amended 2026-10-18): one shared full-body framing, no portrait drawing ----------
function avatarCheck() {
  const shared = GEOMETRY[AVATAR_ATLASES[0]];
  const all = Object.entries(audit.renders).flatMap(([k, a]) => (a.avatars || []).map((x) => ({ render: k, ...x })));
  const off = all.filter((x) => x.left !== shared.left || x.top !== shared.top || x.width !== shared.width);
  const portrait = all.filter((x) => !/mascot\/(stills\/stand\.|atlas\/(full-walk|full-hop-flight|full-wave-bow)\.)/.test(x.image));
  return { checked: all.length, sharedFraming: all.length - off.length, offFraming: off.slice(0, 10), notFullBody: portrait.length, notFullBodySample: portrait.slice(0, 10) };
}

// ---------- summary ----------
const R = Object.values(audit.renders), P = Object.values(audit.phone);
audit.summary = {
  "DW-7.1": { renders: R.length, failedRequests: R.reduce((n, a) => n + a.failedRequests.length, 0), consoleErrors: R.reduce((n, a) => n + a.consoleErrors.length, 0), imagesFailed: R.reduce((n, a) => n + a.images.filter((i) => !i.ok).length + a.background.filter((b) => !b.ok).length, 0), shots: R.reduce((n, a) => n + a.shots.length, 0) + P.length * 2 },
  "DW-7.2": { staticLiterals: Object.values(audit.static).reduce((n, x) => n + x.literals, 0), runtimeChecked: R.reduce((n, a) => n + a.colours.checked, 0) + P.reduce((n, a) => n + a.colours.checked, 0), runtimeOffToken: R.reduce((n, a) => n + a.colours.badCount, 0) + P.reduce((n, a) => n + a.colours.badCount, 0) },
  "DW-7.3": Object.fromEntries(P.map((p) => [p.shot, { coarse: p.coarse, scrollWidth: p.scrollWidth, controls: p.controls, under44: p.under44.length }])),
  "DW-7.4": { states: [...new Set((audit.renders["chat.light"] || {}).strip?.map((f) => f.state) || [])], sequence: (audit.renders["chat.light"] || {}).strip?.filter((f) => f.step).map((f) => f.step), menuGroups: (audit.renders["chat.light"] || {}).menuGroups?.map((g) => g.label), avatars: avatarCheck() },
  "DW-7.7": { unmatchedStrings: Object.values(strings).reduce((n, s) => n + s.unmatched.length + s.attributesUnmatched.length, 0), montserratOutsideWordmark: R.reduce((n, a) => n + a.montserrat.filter((m) => !m.inWordmark).length, 0), mascotFilesNotPhase4: mascotFiles.filter((m) => !m.phase4).length, mascotBytesMismatch: mascotFiles.filter((m) => m.inventoryBytes !== null && m.inventoryBytes !== m.bytes).length, darkPaper: (audit.renders["chat.dark"] || {}).paper, logo: Object.fromEntries(R.map((a) => [a.theme + " " + (a.logo[0] || {}).token, (a.logo[0] || {}).color])) },
  contrast: { min: Math.min(...R.map((a) => a.contrast.min)), below: R.reduce((n, a) => n + a.contrast.failCount, 0) },
  stripClip: (() => { const all = [...R, ...P].flatMap((a) => a.stripClip || []); return { frames: all.length, controls: all.reduce((n, f) => n + f.controls, 0), clipped: all.flatMap((f) => f.clipped.map((c) => `${f.step || f.state}: ${c}`)) }; })(),
  peek: (() => { const all = [...R, ...P].flatMap((a) => a.peeks || []); return { exhibits: all.length, unanchored: all.filter((x) => x.anchored === false).length, maxRightDelta: Math.max(0, ...all.map((x) => Math.abs(x.rightDelta || 0))), maxBottomDelta: Math.max(0, ...all.map((x) => Math.abs(x.bottomDelta || 0))) }; })(),
  grips: Object.fromEntries(Object.entries(audit.renders).flatMap(([k, a]) => (a.grips || []).map((g) => [`${k} ${g.name}`, `${g.bar} ${g.size}; ${g.contrastLeft}:1 and ${g.contrastRight}:1 against its two sides`]))),
  fields: (() => { const all = [...R, ...P].flatMap((a) => a.fields || []); const H = P.flatMap((p) => (p.list || []).filter((c) => c.cls === "control").map((c) => c.hit)); return { checked: all.length, minHitShare: Math.min(...all.map((f) => f.hitShare)), inputSmallerThanBox: all.filter((f) => f.box !== f.input).length, phoneFieldHits: H }; })(),
  axe: AXE ? { version: R[0].axe?.version, violations: R.reduce((n, a) => n + (a.axe?.violations.length || 0), 0), byRule: [...new Set(R.flatMap((a) => (a.axe?.violations || []).map((v) => v.id)))] } : "axe-core not installed: skipped",
};
for (const a of R) { delete a.texts; delete a.attrs; }
for (const p of P) { delete p.texts; delete p.attrs; delete p.list; }
// URLs the browser resolved are written relative to the repository root, so the file names no machine path
const repoUrl = pathToFileURL(REPO).href.replace(/\/?$/, "/");
writeFileSync(join(SHOTS, "final-audit.json"), JSON.stringify(audit, null, 1).split(repoUrl).join("").split(REPO + "/").join("") + "\n");
console.log(JSON.stringify(audit.summary, null, 1));
console.log("wrote", rel(join(SHOTS, "final-audit.json")));
