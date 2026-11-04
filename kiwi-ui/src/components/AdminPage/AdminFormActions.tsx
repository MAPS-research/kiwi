import type { BoxProps } from "@mui/material";
import { Box } from "@mui/material";

export interface AdminFormActionsProps extends BoxProps {
  sticky?: boolean;
}

/**
 * The action row at the foot of an admin form panel: right-aligned from 600 px,
 * stacked below it with the primary on top, over a --border-subtle rule. Even
 * when it sticks to the bottom of the panel it is docked, not floating, so it
 * casts no shadow: the rule is its only edge. Buttons keep the height of the
 * region's density.
 */
const AdminFormActions = ({ children, sticky = false, sx, ...props }: AdminFormActionsProps) => (
  <Box
    {...props}
    sx={[
      {
        display: "flex",
        flexDirection: { xs: "column-reverse", sm: "row" },
        justifyContent: "flex-end",
        alignItems: { xs: "stretch", sm: "center" },
        gap: "var(--space-inline)",
        px: { xs: "var(--space-4)", sm: "var(--space-5)" },
        py: "var(--space-4)",
        borderTop: "1px solid var(--border-subtle)",
        bgcolor: "background.paper",
        position: sticky ? "sticky" : "static",
        bottom: sticky ? 0 : "auto",
        zIndex: sticky ? 10 : "auto",
        boxShadow: "none",
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);

export default AdminFormActions;
