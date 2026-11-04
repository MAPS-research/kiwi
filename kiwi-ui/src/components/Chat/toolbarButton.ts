/**
 * The answer's small toolbar buttons (kiwi-ui/DESIGN.md, The tutor-message
 * surface): a 16 px glyph on a 28 px square, on one 28 px line, with a 44 px hit
 * area on a coarse pointer. Used by the feedback toolbar and the code block's
 * Import and Copy buttons. They have no border, so focus is the global 2 px ring.
 */
export const toolbarButtonSx = {
  position: "relative",
  width: "var(--tutor-message-toolbar-button)",
  height: "var(--tutor-message-toolbar-button)",
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  borderRadius: "var(--radius-small)",
  color: "var(--tutor-message-toolbar)",
  "& .MuiSvgIcon-root": { fontSize: "var(--size-icon-sm)" },
  "&:hover": {
    backgroundColor: "var(--tutor-message-hover-toolbar-fill)",
    color: "var(--tutor-message-hover-toolbar)",
  },
  "&:active": {
    backgroundColor: "var(--tutor-message-active-toolbar-fill)",
    color: "var(--tutor-message-active-toolbar)",
  },
  "&[aria-disabled='true'], &[aria-disabled='true']:hover, &[aria-disabled='true']:active": {
    backgroundColor: "transparent",
    color: "var(--tutor-message-disabled-toolbar)",
    transform: "none",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "max(100%, var(--tutor-message-toolbar-hit))",
    height: "max(100%, var(--tutor-message-toolbar-hit))",
    transform: "translate(-50%, -50%)",
  },
} as const;
