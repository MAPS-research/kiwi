import type { ReactNode } from "react";
import type { BoxProps, SxProps, Theme } from "@mui/material";
import { Box, Stack, Typography } from "@mui/material";

export interface AdminFormSectionProps extends Omit<BoxProps, "title"> {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  divided?: boolean;
  contentSx?: SxProps<Theme>;
}

/**
 * Responsive Admin form section with a stable title/description column.
 * Whitespace and an optional divider provide hierarchy without nested cards.
 */
const AdminFormSection = ({
  title,
  description,
  actions,
  children,
  divided = true,
  contentSx,
  sx,
  ...props
}: AdminFormSectionProps) => (
  <Box
    {...props}
    component="section"
    sx={[
      {
        display: "grid",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "190px minmax(0, 1fr)" },
        gap: { xs: 2, md: 4 },
        py: 4,
        borderBottom: divided ? 1 : 0,
        borderColor: "divider",
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    <Box sx={{ minWidth: 0 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "flex-start",
          justifyContent: "space-between"
        }}>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {actions}
      </Stack>
      {description && (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 0.5
          }}>
          {description}
        </Typography>
      )}
    </Box>

    <Box
      sx={[
        { minWidth: 0 },
        ...(Array.isArray(contentSx) ? contentSx : [contentSx]),
      ]}
    >
      {children}
    </Box>
  </Box>
);

export default AdminFormSection;
