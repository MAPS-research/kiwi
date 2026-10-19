import type { PaperProps } from "@mui/material";
import { Paper } from "@mui/material";

export type AdminFormSurfaceProps = PaperProps;

/**
 * A panel for admin forms, filters and tabular work areas (DESIGN.md, Panels): a
 * --surface sheet on the canvas with a 1 px --border hairline and the 8 px sheet
 * radius. It is docked, so it casts no shadow; shadows belong to floating
 * surfaces only. Sections inside are divided by rules, never by another panel.
 */
const AdminFormSurface = ({ children, sx, ...props }: AdminFormSurfaceProps) => (
  <Paper
    {...props}
    elevation={0}
    variant="outlined"
    sx={[
      {
        borderRadius: "var(--panel-radius)",
        borderColor: "var(--panel-border)",
        bgcolor: "background.paper",
        boxShadow: "none",
        backgroundImage: "none",
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Paper>
);

export default AdminFormSurface;
