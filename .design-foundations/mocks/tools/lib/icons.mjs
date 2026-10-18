// Icons for the Phase 7 mocks (kiwi-ui/DESIGN.md § Icon policy): Material Outlined for actions and system affordances
// (24 px grid, from material-icons.mjs), the system's own 16 px shape icons for status (check, triangle, cross, i, the
// dashed in-progress ring, the disabled-tab lock), and the companion's launcher glyph (assets/mascot/launcher-glyph.svg).
// Every glyph is currentColor: an icon never names a colour. KiwiIcons (feature glyphs) are not in this repository;
// the Material glyphs today's code uses stand in for them, as the policy anticipates.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MATERIAL } from "./material-icons.mjs";
import { ASSETS } from "./paths.mjs";

const SHAPES = {
  check: '<path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  cross: '<path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  info: '<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 7.4v3.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="4.9" r="1" fill="currentColor"/>',
  triangle: '<path d="M8 2.2L14.5 13.5H1.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.2v3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.6" r="1" fill="currentColor"/>',
  ring: '<circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="18 10" stroke-linecap="round"/>',
  lock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  chevronDown: '<path d="M4 6.5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  dash: '<path d="M4 8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};

/** A Material Outlined glyph; decorative (aria-hidden) unless it is the whole content of a control, which carries the name. */
export function mi(name, cls = "ic") {
  const body = MATERIAL[name];
  if (!body) throw new Error(`no Material glyph ${name}`);
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
}
/** One of the system's own 16 px shape icons (status, ring, lock). */
export function si(name, cls = "ic") {
  const body = SHAPES[name];
  if (!body) throw new Error(`no shape icon ${name}`);
  return `<svg class="${cls}" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${body}</svg>`;
}
/** The launcher glyph: one currentColor path (the companion's portrait with a speech bubble), inlined. */
const GLYPH = readFileSync(join(ASSETS, "mascot", "launcher-glyph.svg"), "utf8")
  .replace(/<\?xml[^>]*>/, "").replace(/<!--[\s\S]*?-->/g, "").trim();
export function launcherGlyph(cls = "launcher-glyph") {
  if (!/currentColor/.test(GLYPH) || /#[0-9a-f]{3,8}\b/i.test(GLYPH)) throw new Error("the launcher glyph must be currentColor only");
  return GLYPH.replace("<svg", `<svg class="${cls}" aria-hidden="true" focusable="false"`);
}
