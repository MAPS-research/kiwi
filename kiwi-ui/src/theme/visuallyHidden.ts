/**
 * Hides text from the eye but not from assistive technology (a live region, a
 * description). The sizes are strings on purpose: in MUI's `sx` a bare 1 means
 * 100%, so a hand-written `width: 1` was as wide as its container and pushed the
 * chat into a horizontal scroll. The same values as MUI's own @mui/utils helper,
 * which this app does not depend on directly.
 */
export const visuallyHidden = {
  border: 0,
  clipPath: "inset(50%)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
} as const;
