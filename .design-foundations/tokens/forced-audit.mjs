#!/usr/bin/env node
// forced-audit.mjs — puts the component sheet into REAL forced colours over the DevTools protocol
// (Emulation.setEmulatedMedia forced-colors: active, under which Chrome drops box-shadow and repaints with its forced
// palette) and checks that every selected, pressed, current or checked control outside the emulation exhibits still
// carries a visible cue: a ≥ 2 px solid outline, an SVG glyph, a dot or dash whose fill differs from its surround,
// weight 600 on a chip, or the switch thumb with a border; the paper's marks (forced-color-adjust: none) keep their own
// asserted colours and are counted apart. Writes generated/forced-audit.json, which the DESIGN.md evidence quotes.
//   node forced-audit.mjs        (needs Chrome or Chromium: $CHROME, $CHROME_PATH, or a usual install location)
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { withPage } from "./tools/cdp.mjs";
import { TOKENS_DIR, REPO_ROOT } from "./tokens-lib.mjs";

const SHEET = pathToFileURL(join(REPO_ROOT, ".design-foundations", "mocks", "component-sheet.html")).href;
const OUT = join(TOKENS_DIR, "generated", "forced-audit.json");

const probe = `(() => {
  const main = document.querySelector("main");
  const vis = (el) => { const cs = getComputedStyle(el); return cs.display !== "none" && cs.visibility !== "hidden" && el.getClientRects().length > 0; };
  const parse = (c) => { const m = c && c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(",").map((s) => parseFloat(s.trim())); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const key = (c) => c ? [c.r, c.g, c.b].join(",") : "none";
  const sel = '[aria-pressed="true"], [role="tab"][aria-selected="true"], [aria-current="page"], [role="switch"][aria-checked="true"], tr[aria-selected="true"], [role="checkbox"][aria-checked="true"], [role="checkbox"][aria-checked="mixed"], [role="radio"][aria-checked="true"], [role="menuitemradio"][aria-checked="true"], .c-pdf .pin.hidden';
  const by = {}; const fails = []; let checked = 0, shadows = 0, outlines = 0, optOut = 0; const outlineColors = new Set();
  for (const el of main.querySelectorAll(sel)) {
    if (!vis(el) || el.closest(".emu-forced") || el.closest(".emu-coarse")) continue; checked++;
    const cs = getComputedStyle(el);
    if (cs.forcedColorAdjust === "none") { optOut++; const k0 = "mark on the paper (forced-color-adjust: none)"; (by[k0] ||= { n: 0, ok: 0, cue: {} }); by[k0].n++; by[k0].ok++; by[k0].cue["own colours"] = (by[k0].cue["own colours"] || 0) + 1; continue; } // content keeps its asserted colours
    const shadowLeft = /inset/.test(cs.boxShadow) || (el.matches("tr") && /inset/.test(getComputedStyle(el.querySelector("td")).boxShadow)); if (shadowLeft) shadows++;
    const outlinedEl = [el, ...el.querySelectorAll("*")].find((n) => { const c = getComputedStyle(n); return c.outlineStyle === "solid" && parseFloat(c.outlineWidth) >= 2 && parse(c.outlineColor) && parse(c.outlineColor).a > 0; });
    if (outlinedEl) { outlines++; outlineColors.add(getComputedStyle(outlinedEl).outlineColor); }
    const glyph = !!el.querySelector('svg path[fill="currentColor"], svg.ic');
    const dot = [...el.querySelectorAll(".dotg, .dash, .cdot")].some((n) => { const bg = parse(getComputedStyle(n).backgroundColor); const behind = parse(getComputedStyle(n.parentElement).backgroundColor); return bg && bg.a > 0 && (!behind || behind.a === 0 || key(bg) !== key(behind)); });
    const weight = el.matches(".c-chip") && parseInt(cs.fontWeight, 10) >= 600;
    const thumbEl = el.querySelector(".thumb"); const thumb = el.matches('[role="switch"]') && !!el.closest(".c-switch.on") && !!thumbEl && parseFloat(getComputedStyle(thumbEl).borderTopWidth) >= 1;
    const kind = el.matches(".c-icon-button") ? "icon button (aria-pressed)" : el.matches(".c-button") ? "tertiary toggle (aria-pressed)" : el.matches(".c-tab") ? "tab (aria-selected)" : el.matches(".c-sidebar-item") ? "sidebar / drawer row (aria-current)" : el.matches("tr") ? "table row (aria-selected)" : el.matches('[role="switch"]') ? "switch (on)" : el.matches('[role="checkbox"]') ? "checkbox (checked / mixed)" : el.matches('[role="radio"]') ? "radio (checked)" : el.matches(".c-chip") ? "filter chip (aria-pressed)" : el.matches('[role="menuitemradio"]') ? "menu item (checked)" : el.matches(".pin") ? "hidden pin (ring)" : el.matches('[role="listitem"]') ? "current thumbnail" : "other";
    const ok = !!outlinedEl || glyph || dot || weight || thumb;
    (by[kind] ||= { n: 0, ok: 0, cue: {} }); by[kind].n++; if (ok) by[kind].ok++; const cueName = outlinedEl ? "outline" : glyph ? "glyph" : dot ? "dot" : weight ? "weight" : thumb ? "thumb" : "none"; by[kind].cue[cueName] = (by[kind].cue[cueName] || 0) + 1;
    if (!ok && fails.length < 12) fails.push(kind + " without a surviving cue: " + (el.getAttribute("aria-label") || el.textContent.trim().slice(0, 24)) + " in " + (el.closest("section.comp")?.querySelector("h2")?.textContent || "?"));
  }
  const probeEl = main.querySelector('#c-icon-button .c-icon-button[data-s="variant-selected"]'); const pcs = probeEl ? getComputedStyle(probeEl) : null;
  return { forcedActive: matchMedia("(forced-colors: active)").matches, checked, optOut, shadowsLeft: shadows, outlines, outlineColors: [...outlineColors], by, fails, sample: pcs ? { boxShadow: pcs.boxShadow, background: pcs.backgroundColor, color: pcs.color, outline: pcs.outlineStyle + " " + pcs.outlineWidth + " " + pcs.outlineColor } : null };
})()`;

const result = await withPage({ url: "about:blank", width: 1440, height: 900 }, async ({ send, evaluate }) => {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
  await send("Page.navigate", { url: SHEET });
  for (let i = 0; i < 400; i++) { if (await evaluate("!!document.documentElement.dataset.auditDone").catch(() => false)) break; await new Promise((r) => setTimeout(r, 200)); }
  return { date: new Date().toISOString().slice(0, 10), sheet: ".design-foundations/mocks/component-sheet.html", ...(await evaluate(probe)) };
});
writeFileSync(OUT, JSON.stringify(result, null, 1) + "\n");
console.log(`real forced-colours emulation: (forced-colors: active) ${result.forcedActive}; ${result.checked} selected, pressed, current or checked controls (${result.optOut} marks on the paper opted out, keeping their own colours); box-shadow markers left on chrome ${result.shadowsLeft}; ${result.outlines} carry a ≥ 2 px outline (colours ${result.outlineColors.join(" / ")}); cues by kind:`);
for (const [k, v] of Object.entries(result.by)) console.log(`  ${v.ok}/${v.n}  ${k}  ${JSON.stringify(v.cue)}`);
console.log("sample (selected icon button):", JSON.stringify(result.sample));
console.log("wrote", OUT.replace(REPO_ROOT + "/", ""));
if (result.fails.length) { console.log("WITHOUT A CUE:", result.fails.join("; ")); process.exit(1); }
