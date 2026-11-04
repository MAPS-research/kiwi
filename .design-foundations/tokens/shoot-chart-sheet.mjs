#!/usr/bin/env node
// shoot-chart-sheet.mjs — the render evidence of Phase 6 (kiwi-ui/DESIGN.md § Chart tokens › Evidence).
// 1. Pastes the emitter's CSS (generated/kiwi-ui.tokens.css) into the chart sheet's first <style> block, so the sheet's tokens are the generated tokens.
// 2. Opens the sheet in headless Chrome over the DevTools protocol (tools/cdp.mjs) and captures, per colour mode, the 1440 × 900 viewport and the full page.
// 3. Captures the five-series strip under Chrome's vision-deficiency emulation (Emulation.setEmulatedVisionDeficiency: none, deuteranopia, protanopia):
//    the colour-vision strip the plan asks for (an acceptable equivalent of Coblis), and reads the sheet's own audit (the pairwise minima from the rendered tokens).
// 4. Measures the sheet 1:1 (the SVG scale, bar thickness, line and hairline widths, chart text size, the tile icon) and hit-tests the truncated cell's tooltip
//    (drawn open, on hover, on keyboard focus: the element under the tip's centre must be the tip), and captures the table with the first identifier focused.
// 5. Since the follow-up after review round 2: measures the donuts' identifiability (every slice named by a direct label inside the figure, no two labels
//    overlapping, the slices' distances under simulation), the bar charts' label gutters and the absence of a value axis there, the hourly ticks' rhythm, the daily
//    extreme's label, the figure naming (one named and described element per chart, every chart SVG hidden), the topic bars (no track, widths proportional to the
//    counts), the absence of a progress bar, the swatch captions' contrast, and the tooltip's face, width, wrapping, ring and Escape; and captures the two donuts
//    under the same colour-vision emulation (chart-sheet.donuts.cvd-*.png).
// 6. Since the follow-up's re-review: walks a real pointer from the truncated span to its tip in 1, 4, 8 and 12 px steps (the tip must never close on the way:
//    WCAG 1.4.13, hoverable), checks that a Tab after an Escape at load shows the tip, that the full-width dialog's table cuts nothing, the Questions tile's trend
//    (its glyph hidden and in the line's colour, the direction in the words), the near-empty chart's missing value axis and the legend's row gap.
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
    // switch the mode on <html>: the sheet redraws and re-audits itself on a data-theme change (its MutationObserver), so the audit reads the mode's rendered tokens
    await evaluate(`(() => { delete document.documentElement.dataset.auditDone; document.documentElement.dataset.theme = ${JSON.stringify(mode)}; return true; })()`);
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
    // the two donuts under the same emulation (review round 2, Minor 1): the slices are told apart by their labels, not their hues
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const drect = await evaluate(`(() => { const a = document.getElementById("fig-duration").getBoundingClientRect(), b = document.getElementById("fig-model").getBoundingClientRect(); const x = Math.min(a.left, b.left), y = Math.min(a.top, b.top); return { x: x + scrollX, y: y + scrollY, width: Math.max(a.right, b.right) - x, height: Math.max(a.bottom, b.bottom) - y }; })()`);
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: Math.ceil(drect.y + drect.height + 24), deviceScaleFactor: 1, mobile: false });
    for (const type of ["none", "deuteranopia", "protanopia"]) {
      await send("Emulation.setEmulatedVisionDeficiency", { type });
      await new Promise((r) => setTimeout(r, 150));
      png((await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: Math.floor(drect.x), y: Math.floor(drect.y), width: Math.ceil(drect.width), height: Math.ceil(drect.height), scale: 1 } })).data, `chart-sheet.donuts.cvd-${type}${mode === "dark" ? ".dark" : ""}.png`);
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
      const tip = document.getElementById("tip1"), trunc = tip.closest(".trunc"), clip = trunc.querySelector(".clip"), cell = trunc.closest("td");
      const rg = document.createRange(); rg.selectNodeContents(clip); const textW = rg.getBoundingClientRect().width;
      const hitTip = () => { const r = tip.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { display: getComputedStyle(tip).display, hit: e === tip ? "tip" : (e && e.tagName.toLowerCase() + (e.id ? "#" + e.id : "")), visibleWidth: +r.width.toFixed(1) }; };
      const box = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
      const overlap = (p, q) => p.l < q.r - 0.5 && q.l < p.r - 0.5 && p.t < q.b - 0.5 && q.t < p.b - 0.5;
      // the donuts: every slice named by a direct label inside the figure, no two labels overlapping, a leader to a thin slice; the colour distances come from the page's own audit
      const donuts = Object.fromEntries(["svg-duration", "svg-model"].map((id) => {
        const root = document.getElementById(id), fig = root.closest("figure"), fb = box(fig), sb = box(root);
        const slices = [...root.querySelectorAll("path[data-name]")].map((p) => p.dataset.name), labels = [...root.querySelectorAll("text.dl")];
        const lb = labels.map(box), named = slices.every((n) => labels.some((t) => t.dataset.for === n && t.textContent.startsWith(n)));
        let overlaps = 0; for (let i = 0; i < lb.length; i++) for (let j = i + 1; j < lb.length; j++) if (overlap(lb[i], lb[j])) overlaps++;
        const ringOverlaps = lb.filter((q) => { const cx = (sb.l + sb.r) / 2, cy = sb.t + 80, R = 66; const nx = Math.max(q.l, Math.min(cx, q.r)), ny = Math.max(q.t, Math.min(cy, q.b)); return Math.hypot(nx - cx, ny - cy) < R; }).length;
        return [id, { slices, labels: labels.map((t) => [...t.querySelectorAll("tspan")].map((x) => x.textContent).join(" ")), named, labelsInsideFigure: lb.every((q) => q.l >= fb.l && q.r <= fb.r && q.t >= fb.t && q.b <= fb.b), labelsInsideSvg: lb.every((q) => q.l >= sb.l - 0.5 && q.r <= sb.r + 0.5 && q.t >= sb.t - 0.5 && q.b <= sb.b + 0.5), labelOverlaps: overlaps, labelsOverRing: ringOverlaps, leaders: root.querySelectorAll("path.leader").length, legendShares: [...fig.querySelectorAll(".legend .v")].some((v) => /%/.test(v.textContent)) }];
      }));
      // the horizontal bar charts: the gutter fits the longest label, no value axis (no numeric tick), a value label at every bar's tip
      const hb = Object.fromEntries(["svg-actions", "svg-intents"].map((id) => {
        const root = document.getElementById(id), sb = box(root), cats = [...root.querySelectorAll("text.cat")];
        return [id, { gutterPx: +root.dataset.gutter, longestLabelPx: +Math.max(...cats.map((t) => t.getComputedTextLength())).toFixed(1), spillPx: +Math.max(0, ...cats.map((t) => sb.l - box(t).l)).toFixed(1), valueTicks: root.querySelectorAll("text.tick.num").length, bars: root.querySelectorAll("path.s1").length, tipLabels: [...root.querySelectorAll("text.tipl")].map((t) => t.textContent) }];
      }));
      // the hourly ticks: one rhythm from midnight, none of their own for the last bucket
      const xt = [...document.querySelectorAll("#svg-hourly text.xt")].map((t) => ({ text: t.textContent, hour: +t.dataset.hour, x: +parseFloat(t.getAttribute("x")).toFixed(1) }));
      const steps = xt.slice(1).map((t, i) => t.hour - xt[i].hour), gaps = xt.slice(1).map((t, i) => +(t.x - xt[i].x).toFixed(1));
      // the extreme of each time series carries its value
      const peakLabels = Object.fromEntries(["svg-daily", "svg-hourly"].map((id) => [id, [...document.querySelectorAll("#" + id + " text.label")].map((t) => t.textContent)]));
      // naming: the figure is the one element named and described; every chart SVG is hidden and names nothing
      const figs = [...document.querySelectorAll("figure.chart")].map((f) => ({ name: f.getAttribute("aria-labelledby"), nameOk: !!document.getElementById(f.getAttribute("aria-labelledby") || "-"), desc: f.getAttribute("aria-describedby"), descOk: !f.getAttribute("aria-describedby") || (document.getElementById(f.getAttribute("aria-describedby")) || {}).tagName === "FIGCAPTION" }));
      const svgNaming = svgs.map((s) => ({ id: s.id, hidden: s.getAttribute("aria-hidden") === "true", named: ["role", "aria-labelledby", "aria-describedby", "aria-label"].some((a) => s.hasAttribute(a)) }));
      // the topic bars: no track, each width the count over the largest count; no progress bar beside the in-progress alert
      const tb = [...document.querySelectorAll(".topic .tb")], rowW = tb.length ? tb[0].parentElement.getBoundingClientRect().width : 0, tmax = Math.max(...tb.map((b) => +b.dataset.n));
      const topicBars = { tracks: document.querySelectorAll(".topic .track").length, bars: tb.length, worstRatioError: +Math.max(...tb.map((b) => Math.abs(b.getBoundingClientRect().width / rowW - +b.dataset.n / tmax))).toFixed(4), leftEdges: [...new Set(tb.map((b) => +b.getBoundingClientRect().left.toFixed(1)))] };
      const progress = { bars: document.querySelectorAll(".bar, [role=progressbar], progress").length, alert: !!document.querySelector(".inprog[role=status]") };
      const cs = (e) => getComputedStyle(e);
      return { scale, maxBarPx: maxBar, linePx: line, hairlinePx: hair, chartTextPx: [...new Set(text)].sort(), donutCentrePx: [...new Set(centre)], tileIconPx: [+ico.width.toFixed(1), +ico.height.toFixed(1)], tokenIconPx: tokenIcon, idTextWidth: +textW.toFixed(1), idCellWidth: +clip.getBoundingClientRect().width.toFixed(1), truncates: textW > clip.getBoundingClientRect().width + 0.5, idCellPx: num(cs(cell).fontSize), idCellFamily: cs(cell).fontFamily, tipPx: num(cs(tip).fontSize), tipFamily: cs(tip).fontFamily, tipFaceIsCell: cs(tip).fontFamily === cs(cell).fontFamily, tipMaxWidth: cs(tip).maxWidth, tipBelowSpanPx: +(tip.getBoundingClientRect().top - trunc.getBoundingClientRect().bottom).toFixed(1), tipPreopened: hitTip(), donuts, hbars: hb, hourlyTicks: { ticks: xt.map((t) => t.text), steps, gaps, oneRhythm: new Set(steps).size === 1 && new Set(gaps).size === 1, last: xt.length ? xt[xt.length - 1].text : null }, peakLabels, figures: figs, svgNaming, topicBars, progress };
    })()`;
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await evaluate(`document.getElementById("tbl-cut").scrollIntoView({ block: "center" }); true`); await new Promise((r) => setTimeout(r, 150)); // the hit-tests need the table inside the viewport
    const m = await evaluate(MEASURE);
    // Minor 1: from a fresh state (the demo tip open, the focus at the top), Tab twice: row 2's span is focused and nothing covers it
    const tabFromTop = async (n) => { await evaluate(`(() => { const h = document.querySelector("h1"); h.setAttribute("tabindex", "-1"); h.focus(); h.blur(); return true; })()`); for (let k = 0; k < n; k++) { await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }); } await evaluate(`document.querySelector("h1").removeAttribute("tabindex"); true`); await new Promise((r) => setTimeout(r, 80)); };
    await tabFromTop(2);
    m.demoTipOnTab2 = await evaluate(`(() => { const t2 = document.querySelectorAll(".trunc")[1], r = t2.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { focusedRow2: document.activeElement === t2, demoTip: getComputedStyle(document.getElementById("tip1")).display, underRow2Centre: t2.contains(e) ? "its own span" : (e ? e.tagName.toLowerCase() + "." + e.className : null), ringVisible: getComputedStyle(t2).outlineStyle !== "none" }; })()`);
    // Minor 2: Escape at load with nothing hovered or focused closes the demo tip and dismisses no span; the first hover then opens the tip
    await evaluate(`(() => { document.activeElement && document.activeElement.blur(); document.querySelectorAll(".trunc").forEach((t) => t.classList.remove("dismissed")); document.getElementById("tip1").classList.add("shown"); return true; })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 4, y: 4 }); await new Promise((r) => setTimeout(r, 40));
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await new Promise((r) => setTimeout(r, 40));
    const escLoad = await evaluate(`({ demoTip: getComputedStyle(document.getElementById("tip1")).display, dismissedSpans: document.querySelectorAll(".trunc.dismissed").length })`);
    const c1 = await evaluate(`(() => { const r = document.querySelector(".trunc").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c1.x, y: c1.y }); await new Promise((r) => setTimeout(r, 80));
    m.escapeAtLoadThenHover = { ...escLoad, tipOnFirstHover: await evaluate(`getComputedStyle(document.getElementById("tip1")).display`) };
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 4, y: 4 }); await new Promise((r) => setTimeout(r, 40));
    await evaluate(`document.getElementById("tip1").classList.add("shown"); true`);
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
    m.ring = await evaluate(`(() => { const a = document.activeElement, s = getComputedStyle(a), tip = document.getElementById("tip1"); return { outlineOffset: s.outlineOffset, outlineWidth: s.outlineWidth, tipClearOfRingPx: +(tip.getBoundingClientRect().top - a.getBoundingClientRect().bottom).toFixed(1) }; })()`);
    // Escape dismisses the tooltip and keeps the focus where it is (WCAG 1.4.13); a blur and a new focus bring it back
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await new Promise((r) => setTimeout(r, 100));
    m.tipEscape = await evaluate(`(() => { const a = document.activeElement, tip = document.getElementById("tip1"); const after = { display: getComputedStyle(tip).display, focusKept: !!a && a.classList.contains("trunc") && a.contains(tip) }; a.blur(); a.focus(); return { ...after, returnsOnNextFocus: getComputedStyle(tip).display }; })()`);
    m.tipLong = await evaluate(`(() => { const tip = document.getElementById("tip2"), keep = tip.textContent; tip.textContent = "x".repeat(36) + " " + "a long server message ".repeat(16).trim(); tip.classList.add("shown"); const r = tip.getBoundingClientRect(), lh = parseFloat(getComputedStyle(tip).lineHeight); const out = { chars: tip.textContent.length, widthPx: +r.width.toFixed(1), maxWidthPx: parseFloat(getComputedStyle(tip).maxWidth), lines: Math.round((r.height - parseFloat(getComputedStyle(tip).paddingTop) - parseFloat(getComputedStyle(tip).paddingBottom) - 2) / lh) }; tip.textContent = keep; tip.classList.remove("shown"); return out; })()`);
    // M1: the pointer walks from the span's centre to the tip's centre and on to its far end, in 1, 4, 8 and 12 px steps; the tip must stay open all the way
    await evaluate(`document.activeElement && document.activeElement.blur(); document.getElementById("tip1").classList.remove("shown"); document.querySelectorAll(".trunc").forEach((t) => t.classList.remove("dismissed")); true`);
    const visible = (i) => evaluate(`getComputedStyle(document.querySelectorAll(".trunc")[${i}].querySelector(".tip")).display !== "none"`);
    m.pointerPath = [];
    for (const i of [0, 1]) for (const step of [1, 4, 8, 12]) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 4, y: 4 }); await new Promise((r) => setTimeout(r, 30));
      const sp = await evaluate(`(() => { const b = document.querySelectorAll(".trunc")[${i}].getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; })()`);
      let x = (sp[0] + sp[2]) / 2, y = (sp[1] + sp[3]) / 2;
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); await new Promise((r) => setTimeout(r, 30));
      const tp = await evaluate(`(() => { const b = document.querySelectorAll(".trunc")[${i}].querySelector(".tip").getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; })()`);
      const hidden = []; let steps = 0;
      const ty = (tp[1] + tp[3]) / 2;
      while (y < ty) { y = Math.min(ty, y + step); await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); steps++; if (!(await visible(i))) hidden.push(+y.toFixed(1)); }
      const tx = tp[2] - 6; // then along the tip to its far end (an id read to its last character)
      while (x < tx) { x = Math.min(tx, x + step); await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }); steps++; if (!(await visible(i))) hidden.push(`x${x.toFixed(1)}`); }
      m.pointerPath.push({ row: i + 1, stepPx: step, steps, gapPx: +(tp[1] - sp[3]).toFixed(1), hiddenAt: hidden, openOnArrival: await visible(i) });
    }
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 4, y: 4 });
    // m5: Escape with nothing focused closes the drawn-open tip; the next Tab still shows it
    // the focus navigation starts at the top again, as at load: a heading takes a programmatic focus (tabindex -1) and the next Tab leaves it for the first tab stop
    await evaluate(`(() => { document.querySelectorAll(".trunc").forEach((t) => t.classList.remove("dismissed")); document.getElementById("tip1").classList.add("shown"); const h = document.querySelector("h1"); h.setAttribute("tabindex", "-1"); h.focus(); h.blur(); return true; })()`);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await new Promise((r) => setTimeout(r, 60));
    const escAtLoad = await evaluate(`getComputedStyle(document.getElementById("tip1")).display`);
    for (let k = 0; k < 4; k++) { await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }); if (await evaluate(`document.activeElement && document.activeElement.classList.contains("trunc")`)) break; }
    await new Promise((r) => setTimeout(r, 60));
    m.escapeThenTab = { afterEscape: escAtLoad, afterTab: await evaluate(`getComputedStyle(document.getElementById("tip1")).display`), focused: await evaluate(`document.activeElement === document.querySelector(".trunc")`) };
    await evaluate(`document.querySelector("h1").removeAttribute("tabindex"); true`);
    // m3, M2, m2, m4 and m1: the full-width table cuts nothing; the trend; the near-empty chart; the legend's row gap; the legend's about
    m.extra = await evaluate(`(() => {
      const full = document.getElementById("tbl-full"), cut = document.getElementById("tbl-cut");
      const cw = (tb) => [...tb.querySelectorAll("thead th")].map((th) => Math.round(th.getBoundingClientRect().width));
      const cutCells = (tb) => [...tb.querySelectorAll("td, th")].filter((c) => { const t = c.querySelector(".clip") || c; return t.scrollWidth > t.clientWidth + 0.5; }).length;
      const base = [...document.querySelectorAll(".tile .base")].find((b) => b.querySelector("svg.tg")), g = base && base.querySelector("svg.tg");
      const sparse = document.getElementById("svg-sparse");
      const lg = document.querySelector("#fig-model .legend"), lgs = getComputedStyle(lg);
      const items = [...lg.children].map((e) => e.getBoundingClientRect());
      return {
        fullTable: { widthPx: Math.round(full.getBoundingClientRect().width), columnsPx: cw(full), cellsCut: cutCells(full), tabStops: full.querySelectorAll("[tabindex]").length },
        cutTable: { widthPx: Math.round(cut.getBoundingClientRect().width), columnsPx: cw(cut), idsCut: [...cut.querySelectorAll(".clip")].filter((c) => c.scrollWidth > c.clientWidth + 0.5).length, tabStops: cut.querySelectorAll("[tabindex]").length },
        trend: base ? { text: base.textContent, glyph: g.dataset.dir, glyphHidden: g.getAttribute("aria-hidden") === "true", glyphColour: getComputedStyle(g).color, lineColour: getComputedStyle(base).color, sameColour: getComputedStyle(g).color === getComputedStyle(base).color, directionInWords: /\\b(up from|down from|the same as)\\b/.test(base.textContent) } : null,
        nearEmpty: { valueTicks: sparse.querySelectorAll("text.tick.num").length, gridlines: sparse.querySelectorAll("line.grid").length, baseline: sparse.querySelectorAll("line.baseline").length, labels: [...sparse.querySelectorAll("text.label")].map((t) => t.textContent) },
        legend: { rowGap: lgs.rowGap, columnGap: lgs.columnGap, rows: new Set(items.map((r) => Math.round(r.top))).size, lineGapPx: items.length > 1 ? Math.round(Math.max(...items.map((r) => r.top)) - Math.min(...items.map((r) => r.bottom))) : null },
        durationLegend: [...document.querySelectorAll("#fig-duration .legend .v")].map((v) => v.textContent),
      };
    })()`);
    await evaluate(`(() => { const t = document.querySelector(".trunc"); t.classList.remove("dismissed"); t.focus(); return true; })()`); await new Promise((r) => setTimeout(r, 100));
    // the table, with the identifier focused and its tooltip open (2× for the ring)
    const tr = await evaluate(`(() => { const r = document.getElementById("tbl-cut").getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY - 8, width: r.width, height: r.height + 56 }; })()`);
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: Math.ceil(tr.y + tr.height + 8), deviceScaleFactor: 2, mobile: false }); await new Promise((r) => setTimeout(r, 150));
    png((await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: Math.floor(tr.x), y: Math.floor(tr.y), width: Math.ceil(tr.width), height: Math.ceil(tr.height), scale: 1 } })).data, `chart-sheet.table-focus${mode === "dark" ? ".dark" : ""}.png`);
    await evaluate(`document.activeElement && document.activeElement.blur(); document.getElementById("tip1").classList.add("shown"); window.scrollTo(0, 0); true`);
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    audit.modes[mode].measure = m;
    audit.cvd[mode] = { method: "Chrome Emulation.setEmulatedVisionDeficiency (DevTools › Rendering › Emulate vision deficiencies) on the sheet's series strip", files: ["none", "deuteranopia", "protanopia"].map((t) => `chart-sheet.cvd-${t}${mode === "dark" ? ".dark" : ""}.png`), donutFiles: ["none", "deuteranopia", "protanopia"].map((t) => `chart-sheet.donuts.cvd-${t}${mode === "dark" ? ".dark" : ""}.png`), donuts: audit.modes[mode].donuts, minPairwiseDistanceAfterSimulation: audit.modes[mode].minCvd, minAdjacent: audit.modes[mode].minAdjacentCvd, minNormal: audit.modes[mode].minNormal };
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  }
});
writeFileSync(OUT, JSON.stringify(audit, null, 1) + "\n");
for (const [mode, a] of Object.entries(audit.modes)) {
  console.log(`${mode}: plot ${a.plot}; series ${a.series.join(" ")}; contrasts ${a.contrasts.join(" / ")}; min pairwise dE after simulation ${a.minCvd.toFixed(2)} (adjacent ${a.minAdjacentCvd.toFixed(2)}), normal ${a.minNormal.toFixed(2)}, neutral ${a.minOtherCvd.toFixed(2)}`);
  const m = a.measure; console.log(`  1:1 scale ${JSON.stringify(m.scale)} · max bar ${m.maxBarPx} px · line ${m.linePx} px · hairline ${m.hairlinePx} px · chart text ${m.chartTextPx.join("/")} px · tile icon ${m.tileIconPx.join("×")} (token ${m.tokenIconPx}) · id ${m.idTextWidth} px in a ${m.idCellWidth} px cell, truncates ${m.truncates} · tip hit: pre-opened ${m.tipPreopened.hit}, hover ${m.tipHover.hit}, focus ${m.tipFocus.hit} (focus-visible ${m.tipFocus.focusVisible}, outline ${m.tipFocus.outline})`);
  console.log(`  donuts: ${Object.entries(m.donuts).map(([id, d]) => `${id} named ${d.named}, labels ${d.labels.join(" | ")}, inside figure ${d.labelsInsideFigure}, overlaps ${d.labelOverlaps}, over ring ${d.labelsOverRing}, leaders ${d.leaders}, min dE after simulation ${a.donuts[id].minCvd.toFixed(2)}`).join("; ")}`);
  console.log(`  bars: ${Object.entries(m.hbars).map(([id, h]) => `${id} gutter ${h.gutterPx} px for a ${h.longestLabelPx} px label, spill ${h.spillPx} px, value ticks ${h.valueTicks}, tip labels ${h.tipLabels.length}/${h.bars}`).join("; ")} · hourly ticks ${m.hourlyTicks.ticks.join(" ")} (one rhythm ${m.hourlyTicks.oneRhythm}) · peaks ${JSON.stringify(m.peakLabels)}`);
  console.log(`  naming: ${m.figures.filter((f) => f.nameOk && f.descOk).length}/${m.figures.length} figures named and described, ${m.svgNaming.filter((x) => x.hidden && !x.named).length}/${m.svgNaming.length} SVGs hidden and unnamed · topics ${m.topicBars.bars} bars, ${m.topicBars.tracks} tracks, ratio error ${m.topicBars.worstRatioError} · progress bars ${m.progress.bars} · swatch captions ${a.swatchCaptionMinContrast}:1`);
  console.log(`  demo tip on Tab ×2: row 2 focused ${m.demoTipOnTab2.focusedRow2}, demo tip ${m.demoTipOnTab2.demoTip}, under row 2's centre ${m.demoTipOnTab2.underRow2Centre}, ring ${m.demoTipOnTab2.ringVisible} · Escape at load: demo tip ${m.escapeAtLoadThenHover.demoTip}, spans dismissed ${m.escapeAtLoadThenHover.dismissedSpans}, first hover ${m.escapeAtLoadThenHover.tipOnFirstHover} · donut shares sum ${Object.entries(a.donuts).map(([id, d]) => `${id} ${d.slices.map((x) => x.share).join("+")}=${d.shareSum}`).join(", ")}`);
  console.log(`  pointer path: ${m.pointerPath.map((p) => `row ${p.row} at ${p.stepPx} px steps (${p.steps} moves, gap ${p.gapPx} px): closed ${p.hiddenAt.length} times, open on arrival ${p.openOnArrival}`).join("; ")}`);
  console.log(`  Escape at load then Tab: ${m.escapeThenTab.afterEscape} then ${m.escapeThenTab.afterTab} (focused ${m.escapeThenTab.focused}) · full-width table ${m.extra.fullTable.widthPx} px, columns ${m.extra.fullTable.columnsPx.join("/")}, cells cut ${m.extra.fullTable.cellsCut}, tab stops ${m.extra.fullTable.tabStops} · narrow table ${m.extra.cutTable.widthPx} px, columns ${m.extra.cutTable.columnsPx.join("/")}, ids cut ${m.extra.cutTable.idsCut}, tab stops ${m.extra.cutTable.tabStops}`);
  console.log(`  trend: "${m.extra.trend.text}" glyph ${m.extra.trend.glyph}, hidden ${m.extra.trend.glyphHidden}, glyph colour = line colour ${m.extra.trend.sameColour}, direction in words ${m.extra.trend.directionInWords} · near-empty: value ticks ${m.extra.nearEmpty.valueTicks}, gridlines ${m.extra.nearEmpty.gridlines}, labels ${m.extra.nearEmpty.labels.join("/")} · Model legend row gap ${m.extra.legend.rowGap} (${m.extra.legend.rows} rows, ${m.extra.legend.lineGapPx} px between them) · duration legend ${m.extra.durationLegend.join(" | ")}`);
  console.log(`  tooltip: ${m.tipPx} px ${m.tipFaceIsCell ? "in the cell's face" : "in another face"} (cell ${m.idCellPx} px), max width ${m.tipMaxWidth}, a ${m.tipLong.chars}-character text ${m.tipLong.widthPx} px wide on ${m.tipLong.lines} lines, ${m.ring.tipClearOfRingPx} px below the ring (offset ${m.ring.outlineOffset}) · Escape: display ${m.tipEscape.display}, focus kept ${m.tipEscape.focusKept}, back on the next focus ${m.tipEscape.returnsOnNextFocus}`);
}
console.log("wrote", OUT.replace(REPO_ROOT + "/", ""), "· Chrome", audit.chrome);
