#!/usr/bin/env node
// coarse-audit.mjs — hit-tests the component sheet (.design-foundations/mocks/component-sheet.html) under REAL
// (pointer: coarse) / (hover: none) emulation over the DevTools protocol (touch emulation on), not the sheet's own
// .emu-coarse class. For every control it scrolls the control into view and measures the extent, along both axes
// through the control's centre, of the area that really hit-tests to it (document.elementFromPoint at pixel centres);
// a control "reaches 44" when both extents are at least 44 px. The S-02 drawer's file rows, the comment pins, the
// admin tables' name-link cells and links in running prose are their own classes, so the stated exceptions can be told
// from the controls that must pass. Writes generated/coarse-audit.json, which the DESIGN.md evidence quotes.
//   node coarse-audit.mjs        (needs Chrome or Chromium: $CHROME, $CHROME_PATH, or a usual install location)
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { withPage } from "./tools/cdp.mjs";
import { TOKENS_DIR, REPO_ROOT } from "./tokens-lib.mjs";

const SHEET = pathToFileURL(join(REPO_ROOT, ".design-foundations", "mocks", "component-sheet.html")).href;
const OUT = join(TOKENS_DIR, "generated", "coarse-audit.json");

const probe = `(() => {
  const main = document.querySelector("main");
  const vis = (el) => { const cs = getComputedStyle(el); return cs.display !== "none" && cs.visibility !== "hidden" && el.getClientRects().length > 0; };
  const CLASSES = [
    ["icon button", ".c-icon-button"], ["feedback toolbar button", ".c-chat .tb button"], ["filter chip", '.c-chip[data-v="filter"]'], ["switch", ".c-switch .track"], ["checkbox / radio", ".c-check .box"],
    ["menu item", ".c-menu-item"], ["text action (alert, toast, banner)", ".c-alert .act, .c-toast .act"], ["citation", ".c-chat .meta .cite"], ["button", ".c-button"], ["tab", ".c-tab"], ["drawer file row (S-02)", ".pdf-rail .drawer .c-sidebar-item"], ["comment pin (on the paper)", ".c-pdf .pin"], ["sidebar row (admin)", ".c-sidebar-item"], ["table row", "tr.c-row"], ["table link cell (admin)", ".c-table td a"], ["inline prose link (WCAG 2.5.8 inline exception)", ".c-chat .ans p a"], ["launcher", ".c-launcher"], ["field", ".c-field .ctl"], ["page / search field", ".pfield"],
  ];
  const seen = new Set(); const groups = {}; const clipped = [];
  for (const [name, sel] of CLASSES) {
    for (const el of main.querySelectorAll(sel)) {
      if (seen.has(el) || !vis(el)) continue; seen.add(el);
      if (el.closest(".emu-coarse") || el.closest(".emu-forced")) continue; // the class-emulated demos are not the subject here
      const dens = (el.closest("[data-density]") || { dataset: {} }).dataset.density || "comfortable";
      if (el.closest('[data-s="active"]') || getComputedStyle(el).transform !== "none") continue; // a pressed control (scale 0.98) is already under the finger
      el.scrollIntoView({ block: "center", inline: "nearest" });
      const r = el.getBoundingClientRect(); const cx = Math.floor(r.left + r.width / 2) + 0.5, cy = Math.floor(r.top + r.height / 2) + 0.5;
      const mine = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit)); };
      const extent = (dx, dy) => { let a = 0, b = 0; while (a < 40 && mine(cx - (a + 1) * dx, cy - (a + 1) * dy)) a++; while (b < 40 && mine(cx + (b + 1) * dx, cy + (b + 1) * dy)) b++; return mine(cx, cy) ? a + b + 1 : 0; };
      if (!mine(cx, cy)) { clipped.push(name + " · " + dens); continue; } // scrolled out of a clip (the overflow exhibit's hidden tabs): not a target on screen
      const w = extent(1, 0), hgt = extent(0, 1); const ok = w >= 44 && hgt >= 44;
      const rowBox = name === "checkbox / radio" && !!el.closest("tr"); // a row's or the header's checkbox: a compact 36 px row clips its hit area to the row (the stated admin-only exception)
      const k = (rowBox ? "table checkbox (in a row or the header)" : name) + " · " + dens; (groups[k] ||= { n: 0, reach44: 0, drawn: new Set(), minHit: 99 }); groups[k].n++; if (ok) groups[k].reach44++; groups[k].drawn.add(Math.round(r.width) + "x" + Math.round(r.height)); groups[k].minHit = Math.min(groups[k].minHit, Math.min(w, hgt));
    }
  }
  // named student-route controls: compact tool chrome, the drawer's rows, the pins
  const named = [];
  const nameOf = (el) => el.getAttribute("aria-label") || el.textContent.trim().replace(/\\s+/g, " ").slice(0, 32);
  for (const [label, sel, pick] of [["compact tab", '#c-coarse [data-density="compact"] .c-tab', 0], ["Find", "#c-coarse .pdf-search .c-button", 0], ["Next match", "#c-coarse .pdf-search .c-button", 1], ["Send", '#c-coarse .c-chat .composer .c-button', 0], ["search field", "#c-coarse .pdf-search .pfield", 0], ["drawer file row", "#c-pdf-toolbar .pdf-rail .drawer .c-sidebar-item", 1], ["comment pin", "#c-pdf-toolbar .c-pdf .pin.visible", 0], ["hidden comment pin", "#c-pdf-toolbar .c-pdf .pin.hidden", 0]]) {
    const els = [...main.querySelectorAll(sel)].filter((e) => vis(e) && !e.closest(".emu-coarse")); const el = els[pick]; if (!el) { named.push([label, 0, 0]); continue; }
    el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); const cx = Math.floor(r.left + r.width / 2) + 0.5, cy = Math.floor(r.top + r.height / 2) + 0.5;
    const mine = (x, y) => { const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit)); };
    const extent = (dx, dy) => { let a = 0, b = 0; while (a < 40 && mine(cx - (a + 1) * dx, cy - (a + 1) * dy)) a++; while (b < 40 && mine(cx + (b + 1) * dx, cy + (b + 1) * dy)) b++; return mine(cx, cy) ? a + b + 1 : 0; };
    named.push([label + " (" + nameOf(el) + ")", extent(1, 0), extent(0, 1)]);
  }
  window.scrollTo(0, 0);
  const out = {}; for (const [k, v] of Object.entries(groups)) out[k] = { n: v.n, reach44: v.reach44, minHit: v.minHit, drawn: [...v.drawn].slice(0, 6) };
  return { pointerCoarse: matchMedia("(pointer: coarse)").matches, hoverNone: matchMedia("(hover: none)").matches, groups: out, named, clipped: clipped.length, clippedWhat: [...new Set(clipped)], total: Object.values(out).reduce((a, g) => a + g.n, 0), reach44: Object.values(out).reduce((a, g) => a + g.reach44, 0), emuToolbarPitch: (() => { const b = [...document.querySelectorAll('#c-coarse .coarse-demo:not(.emu-coarse) .c-chat .tb button')]; return b.length > 1 ? Math.round(b[1].getBoundingClientRect().left - b[0].getBoundingClientRect().left) : null; })() };
})()`;

const result = await withPage({ url: "about:blank", width: 1440, height: 900 }, async ({ send, evaluate }) => {
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "pointer", value: "coarse" }, { name: "hover", value: "none" }, { name: "any-pointer", value: "coarse" }, { name: "any-hover", value: "none" }] });
  await send("Page.navigate", { url: SHEET });
  for (let i = 0; i < 400; i++) { if (await evaluate("!!document.documentElement.dataset.auditDone").catch(() => false)) break; await new Promise((r) => setTimeout(r, 200)); }
  const audit = JSON.parse(await evaluate("document.documentElement.dataset.audit"));
  const res = await evaluate(probe);
  return { date: new Date().toISOString().slice(0, 10), sheet: ".design-foundations/mocks/component-sheet.html", ...res, audit: { browserPointerCoarse: audit.coarse.browserPointerCoarse, fineToolbarPitchUnderCoarse: audit.coarse.finePitch, fineToolbarHitUnderCoarse: audit.coarse.fineHit, scrollWidth: audit.scrollWidth, clientWidth: audit.clientWidth, cue: audit.cue, disabled: audit.disabled } };
});
writeFileSync(OUT, JSON.stringify(result, null, 1) + "\n");
const exceptions = Object.entries(result.groups).filter(([, g]) => g.reach44 < g.n);
console.log(`real coarse emulation: pointer coarse ${result.pointerCoarse}, hover none ${result.hoverNone}; ${result.reach44} of ${result.total} controls reach 44 × 44; toolbar pitch under the media block ${result.emuToolbarPitch}; hit tests by class:`);
for (const [k, g] of Object.entries(result.groups)) console.log(`  ${g.reach44}/${g.n}  ${k}  (drawn ${g.drawn.join(", ")}; smallest hit extent ${g.minHit} px)`);
console.log(`clipped (scrolled out of a clip, not targets): ${result.clipped} (${(result.clippedWhat || []).join("; ")})`);
console.log("named student-route controls (hit extent w × h):", result.named.map(([k, w, h]) => `${k} ${w}×${h}`).join("; "));
if (exceptions.length) console.log("not reaching 44:", exceptions.map(([k, g]) => `${k} ${g.reach44}/${g.n}`).join("; "));
console.log("wrote", OUT.replace(REPO_ROOT + "/", ""));
