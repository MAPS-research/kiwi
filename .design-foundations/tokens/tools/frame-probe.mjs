// tools/frame-probe.mjs — the one-frame check shared by coarse-audit.mjs and forced-audit.mjs (the user's decision of 2026-10-19):
// in every focus exhibit of the component sheet, a control that has a border shows focus on that border, never a second ring outside it.
// An element fails when it draws a visible outline outside its own border box while it, or a bordered element of the same box (within
// 2 px), has a visible border: two frames. With `highlight`, the focused frame must also be the forced palette's Highlight: the border of a
// bordered frame, the outline of a borderless one.
export const frameProbe = (highlight) => `(() => {
  const main = document.querySelector("main");
  const alpha = (c) => { const m = c && c.match(/rgba?\\(([^)]+)\\)/); if (!m) return 0; const p = m[1].split(",").map((s) => parseFloat(s.trim())); return p.length > 3 ? p[3] : 1; };
  const border = (c) => parseFloat(c.borderTopWidth) >= 1 && c.borderTopStyle !== "none" && alpha(c.borderTopColor) > 0;
  const outer = (c) => c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0 && alpha(c.outlineColor) > 0 && parseFloat(c.outlineOffset) > -parseFloat(c.outlineWidth);
  const hlCache = new Map(); // Highlight resolves per colour scheme (the dark column is color-scheme: dark), so it is read in the element's own context
  const hlOf = (n) => { const scope = n.closest("[data-theme]") || main; if (!hlCache.has(scope)) { const s = document.createElement("span"); s.style.color = "Highlight"; scope.appendChild(s); hlCache.set(scope, getComputedStyle(s).color); s.remove(); } return hlCache.get(scope); };
  const HL = hlOf(main);
  const near = (a, b) => Math.abs(a.left - b.left) <= 2 && Math.abs(a.top - b.top) <= 2 && Math.abs(a.right - b.right) <= 2 && Math.abs(a.bottom - b.bottom) <= 2;
  let exhibits = 0, frames = 0, rings = 0, doubled = 0, notHighlight = 0; const fails = [];
  const where = (n) => (n.closest("section.comp")?.querySelector("h2")?.textContent || "?") + " · " + (n.closest("[data-theme]")?.dataset.theme || "") + " · " + (n.dataset.c || n.closest("[data-c]")?.dataset.c || "") + " " + (n.dataset.v || "");
  for (const ex of main.querySelectorAll('[data-s="focus"]')) {
    if (ex.closest(".emu-forced, .emu-coarse") || getComputedStyle(ex).display === "none") continue; exhibits++;
    const nodes = [ex, ...ex.querySelectorAll("*")].filter((n) => getComputedStyle(n).display !== "none" && n.getClientRects().length);
    for (const n of nodes) {
      const c = getComputedStyle(n), b = border(c), o = outer(c);
      if (b && /0px 0px 0px 1px inset|inset 0px 0px 0px 1px/.test(c.boxShadow) || b && ${highlight} && c.borderTopColor === hlOf(n)) frames++;
      if (!o) continue; rings++;
      const r = n.getBoundingClientRect(); const framed = b || nodes.some((m) => m !== n && border(getComputedStyle(m)) && near(m.getBoundingClientRect(), r));
      if (framed) { doubled++; if (fails.length < 12) fails.push("two frames on focus: a ring outside a border (" + n.tagName.toLowerCase() + "." + String(n.className).split(" ").join(".") + ") @ " + where(n)); }
      else if (${highlight} && c.outlineColor !== hlOf(n)) { notHighlight++; if (fails.length < 12) fails.push("a focus ring not in Highlight (" + c.outlineColor + ") @ " + where(n)); }
    }
    if (${highlight}) for (const n of nodes) { const c = getComputedStyle(n); if (border(c) && c.outlineStyle !== "none" && parseFloat(c.outlineOffset) <= -parseFloat(c.outlineWidth) && c.borderTopColor !== hlOf(n)) { notHighlight++; if (fails.length < 12) fails.push("a focused frame not in Highlight (" + c.borderTopColor + ") @ " + where(n)); } }
  }
  return { exhibits, frames, rings, doubled, notHighlight, highlight: ${highlight} ? HL : null, fails };
})()`;
