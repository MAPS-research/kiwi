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
      gap: { xs: 2, md: 3 },
      mb: { xs: 3, md: 4 },
    }}
  >
    <Stack
      direction="row"
      spacing={{ xs: 1, sm: 1.5 }}
      alignItems="flex-start"
      sx={{ minWidth: 0, width: { xs: "100%", md: "auto" } }}
    >
      {back && (
        <IconButton
          size="small"
          aria-label={`Back to ${back.label}`}
          onClick={back.onClick}
          sx={{ mt: 0.25, flexShrink: 0 }}
        >
          <ArrowBackOutlinedIcon fontSize="small" />
        </IconButton>
      )}

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <Typography
            component="h1"
            variant="h5"
            sx={{
              fontWeight: 600,
              lineHeight: 1.3,
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </Typography>
          {status}
        </Stack>

        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 720, overflowWrap: "anywhere" }}
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
          gap: 1,
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
