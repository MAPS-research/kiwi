import { Box } from "@mui/material";
import React from "react";
import { AdminPageHeader } from "../../../components/AdminPage/index.ts";
import StatusChipBase, { type StatusKind } from "../../../components/StatusChip/StatusChip.tsx";

// Shared visual language for the experiment pages, drawn from the Stage 1
// tokens (kiwi-ui/DESIGN.md): plain sheets with a hairline edge, the theme's
// control and sheet radii, status chips with a shape icon. The violet gradient,
// the rounder nested theme, the hover lift and the staggered entrance are retired.

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

/**
 * A panel: a --surface sheet with a --border hairline and the sheet radius.
 * When it opens something (onClick), the hover fill says so; it never lifts.
 */
export const HoverCard: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  sx?: object;
}> = ({ children, onClick, sx }) => (
  <Box
    onClick={onClick}
    sx={{
      borderRadius: "var(--radius-sheet)",
      border: "1px solid var(--border)",
      bgcolor: "background.paper",
      cursor: onClick ? "pointer" : "default",
      "&:hover": onClick ? { bgcolor: "action.hover" } : undefined,
      ...sx,
    }}
  >
    {children}
  </Box>
);

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

/** Draft is informational, an active experiment is running, a completed one is off. */
const STATUS: Record<string, { label: string; kind: StatusKind }> = {
  draft: { label: "Draft", kind: "info" },
  active: { label: "Active", kind: "success" },
  completed: { label: "Completed", kind: "neutral" },
};

export const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS[status] ?? { label: status, kind: "neutral" as const };
  return <StatusChipBase kind={s.kind} label={s.label} size="small" />;
};
