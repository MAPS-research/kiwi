import type { PaperProps } from "@mui/material";
import { Paper } from "@mui/material";

export type AdminFormSurfaceProps = PaperProps;

/**
 * A calm, outlined surface for Admin forms, filters, and tabular work areas.
 * Elevation is intentionally fixed at zero; reserve shadows for true overlays.
 */
const AdminFormSurface = ({ children, sx, ...props }: AdminFormSurfaceProps) => (
  <Paper
    {...props}
    elevation={0}
    variant="outlined"
    sx={[
      {
        borderRadius: 3,
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
