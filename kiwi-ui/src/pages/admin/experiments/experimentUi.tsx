import { Box, Chip, Typography } from "@mui/material";
import {
  alpha,
  createTheme,
  ThemeProvider,
  useTheme,
} from "@mui/material/styles";
import { motion } from "framer-motion";
import React from "react";
import theme from "../../../Theme.ts";
import { AdminPageHeader } from "../../../components/AdminPage/index.ts";

// Scoped theme for the experiment section: rounder buttons + input boxes
// (applies to all MUI Buttons / OutlinedInputs / Selects under it).
export const ExperimentTheme: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ThemeProvider
    theme={(outer) =>
      createTheme(outer, {
        components: {
          MuiButton: { styleOverrides: { root: { borderRadius: 14 } } },
          MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 14 } } },
        },
      })
    }
  >
    {children}
  </ThemeProvider>
);

// Shared visual language for the experiment pages: violet gradient header,
// semantic status chips, and a motion card. Keeps the four pages cohesive.

export const VIOLET = theme.palette.primary.main;
export const VIOLET_DEEP = theme.palette.secondary.main;
export const violetGradient = `linear-gradient(135deg, ${VIOLET} 0%, ${VIOLET_DEEP} 100%)`;

/**
 * The per-variant system-prompt fields, shared by the form + detail pages.
 * Only defaultSystemMessage remains: it is the one prompt the v2 unified chat
 * injects for an experiment variant. The legacy classMaterials/recitation
 * fields belonged to the retired v1 PDF chat and are no longer editable
 * (old configs carrying them still validate; the values are just unused).
 */
export const PROMPT_FIELDS = [
  {
    key: "defaultSystemMessage",
    label: "System prompt",
    caption: "AI chat behavior for this group",
  },
] as const;

/** Animated container that fades/rises children in with an optional stagger. */
export const MotionStack: React.FC<{
  children: React.ReactNode;
  delay?: number;
  sx?: object;
}> = ({ children, delay = 0, sx }) => (
  <Box
    component={motion.div}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
    sx={sx}
  >
    {children}
  </Box>
);

/** A card that lifts on hover. */
export const HoverCard: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  sx?: object;
}> = ({ children, onClick, sx }) => {
  const theme = useTheme();
  return (
    <Box
      onClick={onClick}
      sx={{
        borderRadius: 5,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
        transition: "all .2s ease",
        cursor: onClick ? "pointer" : "default",
        "&:hover": onClick
          ? {
            borderColor: alpha(VIOLET, 0.4),
            boxShadow: `0 8px 24px ${alpha(VIOLET, 0.12)}`,
            transform: "translateY(-2px)",
          }
          : undefined,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

/** Compatibility wrapper while experiment pages migrate to the shared Admin header. */
export const PageHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  status?: React.ReactNode;
}> = ({ icon: _icon, title, subtitle, onBack, actions, status }) => (
  <AdminPageHeader
    title={title}
    description={subtitle}
    back={onBack ? { label: "Experiments", onClick: onBack } : undefined}
    actions={actions}
    status={status}
  />
);

const STATUS_STYLE: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Draft", color: "#92600a", bg: "#fff4e0" },
  active: { label: "Active", color: "#1b6b3a", bg: "#e3f6ea" },
  completed: { label: "Completed", color: "#475569", bg: "#eef1f5" },
};

export const StatusChip: React.FC<{ status: string; onLight?: boolean }> = ({
  status,
  onLight,
}) => {
  const s = STATUS_STYLE[status] ?? {
    label: status,
    color: "#475569",
    bg: "#eef1f5",
  };
  return (
    <Chip
      size="small"
      label={s.label}
      sx={{
        fontWeight: 600,
        height: 24,
        color: onLight ? s.color : "#fff",
        bgcolor: onLight ? s.bg : alpha("#fff", 0.22),
        border: onLight ? "none" : `1px solid ${alpha("#fff", 0.3)}`,
      }}
    />
  );
};
