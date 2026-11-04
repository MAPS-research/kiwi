/**
 * Overlays (tooltips, menus, dialogs) render in a portal at the end of the body,
 * outside the `data-density` region that opened them, so they would fall back to
 * the comfortable tokens on `:root`. This reads the density of the region a node
 * sits in, as an attribute to put on the overlay's own root.
 */
export const densityAttr = (node: Element | null | undefined): Record<string, string> => {
  const density = node?.closest("[data-density]")?.getAttribute("data-density");
  return density ? { "data-density": density } : {};
};
