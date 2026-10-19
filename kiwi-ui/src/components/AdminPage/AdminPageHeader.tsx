import type { ReactNode } from "react";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import { Box, IconButton, Stack, Typography } from "@mui/material";

export interface AdminPageHeaderBackAction {
  label: string;
  onClick: () => void;
}

export interface AdminPageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  back?: AdminPageHeaderBackAction;
  status?: ReactNode;
  actions?: ReactNode;
}

/**
 * The page header of the admin frame (SR-4): the page title as the document's
 * h1 in the page-title role (24/32, `variant="h2"`), a 4 px gap, the deck in
 * 14/20 secondary at most 720 px wide, and 24 px below. Actions wrap beside the
 * title from `md`, under it below.
 */
const AdminPageHeader = ({
  title,
  description,
  back,
  status,
  actions,
}: AdminPageHeaderProps) => (
  <Box
    component="header"
    sx={{
      display: "flex",
      flexDirection: { xs: "column", md: "row" },
      alignItems: { xs: "stretch", md: "flex-start" },
      justifyContent: "space-between",
      gap: { xs: "var(--space-4)", md: "var(--space-5)" },
      mb: "var(--space-5)",
    }}
  >
    <Stack
      direction="row"
      sx={{
        alignItems: "flex-start",
        gap: "var(--space-2)",
        minWidth: 0,
        width: { xs: "100%", md: "auto" },
      }}
    >
      {back && (
        <IconButton
          aria-label={`Back to ${back.label}`}
          onClick={back.onClick}
          sx={{
            flexShrink: 0,
            // Centre the button on the title's first line.
            mt: "calc((var(--type-page-title-leading) - var(--icon-button-size)) / 2)",
          }}
        >
          <ArrowBackOutlinedIcon />
        </IconButton>
      )}

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack
          direction="row"
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-3)",
          }}
        >
          <Typography component="h1" variant="h2" sx={{ overflowWrap: "anywhere" }}>
            {title}
          </Typography>
          {status}
        </Stack>

        {description && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mt: "var(--space-1)",
              maxWidth: 720,
              overflowWrap: "anywhere",
            }}
          >
            {description}
          </Typography>
        )}
      </Box>
    </Stack>

    {actions && (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: { xs: "flex-start", md: "flex-end" },
          gap: "var(--space-inline)",
          flexWrap: "wrap",
          width: { xs: "100%", md: "auto" },
          flexShrink: { xs: 1, md: 0 },
          "& > .MuiButton-root": {
            flex: { xs: "1 1 140px", md: "0 0 auto" },
          },
          "& > .MuiBadge-root": {
            flex: { xs: "1 1 140px", md: "0 0 auto" },
            "& > .MuiButton-root": { width: { xs: "100%", md: "auto" } },
          },
        }}
      >
        {actions}
      </Box>
    )}
  </Box>
);

export default AdminPageHeader;
