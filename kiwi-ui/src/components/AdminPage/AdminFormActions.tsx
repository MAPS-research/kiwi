import type { BoxProps } from "@mui/material";
import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";

export interface AdminFormActionsProps extends BoxProps {
  sticky?: boolean;
}

/** Responsive action row with one visual boundary and no card elevation. */
const AdminFormActions = ({ children, sticky = false, sx, ...props }: AdminFormActionsProps) => (
  <Box
    {...props}
    sx={[
      {
        display: "flex",
        flexDirection: { xs: "column-reverse", sm: "row" },
        justifyContent: "flex-end",
        alignItems: { xs: "stretch", sm: "center" },
        gap: 1.5,
        px: { xs: 2, sm: 3 },
        py: 2,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        position: sticky ? "sticky" : "static",
        bottom: sticky ? 0 : "auto",
        zIndex: sticky ? 10 : "auto",
        boxShadow: sticky
          ? (theme) => `0 -8px 20px ${alpha(theme.palette.common.black, 0.06)}`
          : "none",
        "& > .MuiButton-root": {
          minHeight: 44,
        },
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);

export default AdminFormActions;
