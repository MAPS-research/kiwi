#!/usr/bin/env node
// shoot-chart-sheet.mjs — the render evidence of Phase 6 (kiwi-ui/DESIGN.md § Chart tokens › Evidence).
// 1. Pastes the emitter's CSS (generated/kiwi-ui.tokens.css) into the chart sheet's first <style> block, so the sheet's tokens are the generated tokens.
// 2. Opens the sheet in headless Chrome over the DevTools protocol (tools/cdp.mjs) and captures, per colour mode, the 1440 × 900 viewport and the full page.
// 3. Captures the five-series strip under Chrome's vision-deficiency emulation (Emulation.setEmulatedVisionDeficiency: none, deuteranopia, protanopia):
//    the colour-vision strip the plan asks for (an acceptable equivalent of Coblis), and reads the sheet's own audit (the pairwise minima from the rendered tokens).
// 4. Measures the sheet 1:1 (the SVG scale, bar thickness, line and hairline widths, chart text size, the tile icon) and hit-tests the truncated cell's tooltip
//    (drawn open, on hover, on keyboard focus: the element under the tip's centre must be the tip), and captures the table with the first identifier focused.
// Writes the PNGs to .design-foundations/mocks/screenshots/ and generated/chart-sheet-audit.json. Nothing here is machine-specific.
//   node shoot-chart-sheet.mjs        (needs Chrome or Chromium: $CHROME, $CHROME_PATH, or a usual install location)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { withPage } from "./tools/cdp.mjs";
import { TOKENS_DIR, REPO_ROOT } from "./tokens-lib.mjs";

const SHEET = join(REPO_ROOT, ".design-foundations", "mocks", "chart-sheet.html");
const SHOTS = join(REPO_ROOT, ".design-foundations", "mocks", "screenshots");
const OUT = join(TOKENS_DIR, "generated", "chart-sheet-audit.json");

// 1. the tokens, pasted verbatim between the markers of the sheet's first style block
{
  const css = readFileSync(join(TOKENS_DIR, "generated", "kiwi-ui.tokens.css"), "utf8");
  const html = readFileSync(SHEET, "utf8");
  const re = /(<style id="tokens">\n)[\s\S]*?(\n<\/style>)/;
  if (!re.test(html)) throw new Error("the chart sheet has no <style id=\"tokens\"> block");
  writeFileSync(SHEET, html.replace(re, `$1/* GENERATED: .design-foundations/tokens/generated/kiwi-ui.tokens.css, pasted by shoot-chart-sheet.mjs. Do not edit. */\n${css.trimEnd()}$2`));
  console.log(`pasted ${css.length} bytes of generated CSS into chart-sheet.html`);
}

const url = pathToFileURL(SHEET).href;
const audit = { date: new Date().toISOString().slice(0, 10), sheet: ".design-foundations/mocks/chart-sheet.html", chrome: null, modes: {}, cvd: {} };
const png = (b64, name) => { writeFileSync(join(SHOTS, name), Buffer.from(b64, "base64")); console.log("wrote", join(".design-foundations", "mocks", "screenshots", name)); };
const waitAudit = async (evaluate) => { for (let i = 0; i < 200; i++) { if (await evaluate("!!document.documentElement.dataset.auditDone").catch(() => false)) return; await new Promise((r) => setTimeout(r, 100)); } throw new Error("the sheet did not finish its audit"); };

await withPage({ url, width: 1440, height: 900 }, async ({ send, evaluate }) => {
  const ver = await send("Browser.getVersion").catch(() => null); audit.chrome = ver?.product || null;
  await waitAudit(evaluate);
  for (const mode of ["light", "dark"]) {
    // switch the mode on <html>, clear what the sheet's script drew, and run that script again so the audit reads the mode's rendered tokens
    await evaluate(`(() => { document.documentElement.dataset.theme = ${JSON.stringify(mode)}; delete document.documentElement.dataset.auditDone; for (const id of ["swatches", "pairs", "tiles-row", "topics"]) document.getElementById(id).innerHTML = ""; for (const s of document.querySelectorAll("svg[id^=svg-]")) s.innerHTML = ""; const src = document.querySelector("body > script").textContent; const re = document.createElement("script"); re.textContent = src; document.body.appendChild(re); return true; })()`);
    await waitAudit(evaluate);
    audit.modes[mode] = await evaluate("window.__chartAudit");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    png((await send("Page.captureScreenshot", { format: "png" })).data, `chart-sheet.1440x900${mode === "dark" ? ".dark" : ""}.png`);
    const full = Math.ceil(await evaluate("document.documentElement.scrollHeight"));
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: full, deviceScaleFactor: 1, mobile: false });
    await new Promise((r) => setTimeout(r, 200));
    png((await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true })).data, `chart-sheet.1440.full${mode === "dark" ? ".dark" : ""}.png`);
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    // the colour-vision strip: the series section under Chrome's emulation, light and dark
    const rect = await evaluate(`(() => { const r = document.getElementById("series-strip").getBoundingClientRect(); return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height }; })()`);
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: Math.ceil(rect.y + rect.height + 24), deviceScaleFactor: 1, mobile: false });
    for (const type of ["none", "deuteranopia", "protanopia"]) {
      await send("Emulation.setEmulatedVisionDeficiency", { type });
      await new Promise((r) => setTimeout(r, 150));
      png((await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: Math.floor(rect.x), y: Math.floor(rect.y), width: Math.ceil(rect.width), height: Math.ceil(rect.height), scale: 1 } })).data, `chart-sheet.cvd-${type}${mode === "dark" ? ".dark" : ""}.png`);
    }
    await send("Emulation.setEmulatedVisionDeficiency", { type: "none" });
    // 4. measurements (review round 1, F1 and F2): everything 1:1, and the tooltip reachable by hit-test in its three states
    const MEASURE = `(() => {
      const num = (v) => +parseFloat(v).toFixed(2);
      const svgs = [...document.querySelectorAll("svg[id^=svg-]")];
      const scale = Object.fromEntries(svgs.map((s) => [s.id, +(s.getBoundingClientRect().width / s.viewBox.baseVal.width).toFixed(3)]));
      const bars = (id, axis) => [...document.querySelectorAll("#" + id + " path.s1")].map((p) => num(p.getBoundingClientRect()[axis]));
      const maxBar = Math.max(...bars("svg-daily", "width"), ...bars("svg-sparse", "width"), ...bars("svg-actions", "height"), ...bars("svg-intents", "height"));
      const line = num(getComputedStyle(document.querySelector("#svg-hourly path.line1")).strokeWidth);
      const hair = num(getComputedStyle(document.querySelector("#svg-daily line.grid")).strokeWidth);
      const text = [...document.querySelectorAll("svg text.tick, svg text.label")].filter((t) => !t.getAttribute("style")).map((t) => num(getComputedStyle(t).fontSize)); // ticks and direct labels; the donut's centre figure is a hero figure (20 px) and is reported apart
      const centre = [...document.querySelectorAll("svg text.label[style]")].map((t) => num(getComputedStyle(t).fontSize));
      const ico = document.querySelector(".tile .ico").getBoundingClientRect();
      const tokenIcon = num(getComputedStyle(document.documentElement).getPropertyValue("--size-icon"));
      const tip = document.getElementById("tip1"), trunc = tip.closest(".trunc"), clip = trunc.querySelector(".clip");
      const rg = document.createRange(); rg.selectNodeContents(clip); const textW = rg.getBoundingClientRect().width;
      const hitTip = () => { const r = tip.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { display: getComputedStyle(tip).display, hit: e === tip ? "tip" : (e && e.tagName.toLowerCase() + (e.id ? "#" + e.id : "")), visibleWidth: +r.width.toFixed(1) }; };
      return { scale, maxBarPx: maxBar, linePx: line, hairlinePx: hair, chartTextPx: [...new Set(text)].sort(), donutCentrePx: [...new Set(centre)], tileIconPx: [+ico.width.toFixed(1), +ico.height.toFixed(1)], tokenIconPx: tokenIcon, idTextWidth: +textW.toFixed(1), idCellWidth: +clip.getBoundingClientRect().width.toFixed(1), truncates: textW > clip.getBoundingClientRect().width + 0.5, tipPreopened: hitTip() };
    })()`;
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await evaluate(`document.querySelector("table.data").scrollIntoView({ block: "center" }); true`); await new Promise((r) => setTimeout(r, 150)); // the hit-tests need the table inside the viewport
    const m = await evaluate(MEASURE);
    // hover: from a clean state (the pre-opened class removed), move the pointer onto the span
    await evaluate(`document.getElementById("tip1").classList.remove("shown"); true`);
    const c = await evaluate(`(() => { const r = document.querySelector(".trunc").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.x, y: c.y }); await new Promise((r) => setTimeout(r, 150));
    m.tipHover = await evaluate(`(() => { const tip = document.getElementById("tip1"); const r = tip.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { display: getComputedStyle(tip).display, hit: e === tip ? "tip" : (e && e.tagName.toLowerCase()) }; })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 4, y: 4 });
    // keyboard focus: a Tab from the document start lands on the first truncated span (the sheet's only tab stops)
    await evaluate(`document.activeElement && document.activeElement.blur(); true`);
    for (let i = 0; i < 4; i++) { await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }); if (await evaluate(`document.activeElement && document.activeElement.classList.contains("trunc")`)) break; }
    await new Promise((r) => setTimeout(r, 150));
    m.tipFocus = await evaluate(`(() => { const a = document.activeElement, tip = document.getElementById("tip1"); const r = tip.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { focusVisible: a.matches(":focus-visible"), outline: getComputedStyle(a).outlineStyle + " " + getComputedStyle(a).outlineWidth, display: getComputedStyle(tip).display, hit: e === tip ? "tip" : (e && e.tagName.toLowerCase()) }; })()`);
    // the table, with the identifier focused and its tooltip open (2× for the ring)
    const tr = await evaluate(`(() => { const r = document.querySelector("table.data").getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY - 8, width: r.width, height: r.height + 56 }; })()`);
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: Math.ceil(tr.y + tr.height + 8), deviceScaleFactor: 2, mobile: false }); await new Promise((r) => setTimeout(r, 150));
    png((await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: Math.floor(tr.x), y: Math.floor(tr.y), width: Math.ceil(tr.width), height: Math.ceil(tr.height), scale: 1 } })).data, `chart-sheet.table-focus${mode === "dark" ? ".dark" : ""}.png`);
    await evaluate(`document.activeElement && document.activeElement.blur(); document.getElementById("tip1").classList.add("shown"); window.scrollTo(0, 0); true`);
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    audit.modes[mode].measure = m;
    audit.cvd[mode] = { method: "Chrome Emulation.setEmulatedVisionDeficiency (DevTools › Rendering › Emulate vision deficiencies) on the sheet's series strip", files: ["none", "deuteranopia", "protanopia"].map((t) => `chart-sheet.cvd-${t}${mode === "dark" ? ".dark" : ""}.png`), minPairwiseDistanceAfterSimulation: audit.modes[mode].minCvd, minAdjacent: audit.modes[mode].minAdjacentCvd, minNormal: audit.modes[mode].minNormal };
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  }
});
writeFileSync(OUT, JSON.stringify(audit, null, 1) + "\n");
for (const [mode, a] of Object.entries(audit.modes)) {
  console.log(`${mode}: plot ${a.plot}; series ${a.series.join(" ")}; contrasts ${a.contrasts.join(" / ")}; min pairwise dE after simulation ${a.minCvd.toFixed(2)} (adjacent ${a.minAdjacentCvd.toFixed(2)}), normal ${a.minNormal.toFixed(2)}, neutral ${a.minOtherCvd.toFixed(2)}`);
  const m = a.measure; console.log(`  1:1 scale ${JSON.stringify(m.scale)} · max bar ${m.maxBarPx} px · line ${m.linePx} px · hairline ${m.hairlinePx} px · chart text ${m.chartTextPx.join("/")} px · tile icon ${m.tileIconPx.join("×")} (token ${m.tokenIconPx}) · id ${m.idTextWidth} px in a ${m.idCellWidth} px cell, truncates ${m.truncates} · tip hit: pre-opened ${m.tipPreopened.hit}, hover ${m.tipHover.hit}, focus ${m.tipFocus.hit} (focus-visible ${m.tipFocus.focusVisible}, outline ${m.tipFocus.outline})`);
}
console.log("wrote", OUT.replace(REPO_ROOT + "/", ""), "· Chrome", audit.chrome);
