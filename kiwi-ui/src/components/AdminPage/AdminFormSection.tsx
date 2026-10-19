import { useId, type ReactNode } from "react";
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
 * One section of the admin form frame (SR-4, the Edit class pattern): an "about"
 * column (the group title and 14/20 secondary copy) beside the fields, one
 * column below 900 px and 190 px | 1fr from 900 px, gap 12 / 32 px, padded
 * 24 px top and bottom over a --border-subtle rule. Whitespace and the rule
 * carry the hierarchy: no card around a section. The section is a region named
 * by its title.
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
}: AdminFormSectionProps) => {
  const titleId = useId();

  return (
    <Box
      aria-labelledby={titleId}
      {...props}
      component="section"
      sx={[
        {
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "190px minmax(0, 1fr)" },
          rowGap: "var(--space-3)",
          columnGap: "var(--space-6)",
          py: "var(--space-5)",
          borderBottom: divided ? "1px solid var(--border-subtle)" : "none",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack
          direction="row"
          sx={{
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--space-2)",
          }}
        >
          <Typography id={titleId} component="h2" variant="subtitle1">
            {title}
          </Typography>
          {actions}
        </Stack>
        {description && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mt: "var(--space-1)",
            }}
          >
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
};

export default AdminFormSection;
