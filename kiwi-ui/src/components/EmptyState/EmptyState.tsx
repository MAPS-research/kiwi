import type { ElementType, ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";
import HighlightOffOutlined from "@mui/icons-material/HighlightOffOutlined";
import KiwiLogo from "../Brand/KiwiLogo.tsx";

interface EmptyStateProps {
  /** The one line that says what is empty (or what failed). */
  title: ReactNode;
  /** The copy under it: who acts and what the first item does. */
  description?: ReactNode;
  /** "page" for a page-level empty state (display line, 96 px logo from md), "inline" inside a region. */
  variant?: "page" | "inline";
  /** The heading element for the title; the visual size follows `variant`. */
  headingComponent?: ElementType;
  /** The frame's one call to action, a primary button. Omit it for a role without the action (hidden, never disabled). */
  action?: { label: string; onClick: () => void };
  /** The error state: the description becomes the error copy, with the cross icon and a Retry button. */
  error?: { onRetry?: () => void; retryLabel?: string };
}

/**
 * The empty-state frame (kiwi-ui/DESIGN.md, Design system > The empty-state
 * frame): Kiwi's logo, a title and copy on the ruled reading column, and at most
 * one primary button. No illustration, no card, no gradient. It is a reading
 * surface, comfortable in every density, and never shown while loading (a
 * skeleton holds the slot until the request settles).
 */
const EmptyState = ({
  title,
  description,
  variant = "inline",
  headingComponent = "h2",
  action,
  error,
}: EmptyStateProps) => {
  const page = variant === "page";

  return (
    <Box
      data-density="comfortable"
      className="kiwi-ruled"
      sx={{
        pl: { xs: "var(--space-3)", sm: "var(--space-reading-gutter)" },
        py: "var(--space-2)",
        maxWidth: "calc(var(--empty-state-max-width) + var(--space-reading-gutter))",
      }}
    >
      <KiwiLogo
        size={page ? "var(--companion-slot-empty)" : "var(--companion-slot-inline)"}
        sx={page ? { width: { xs: "var(--companion-slot-inline)", md: "var(--companion-slot-empty)" }, height: { xs: "var(--companion-slot-inline)", md: "var(--companion-slot-empty)" } } : undefined}
      />
      <Typography
        component={headingComponent}
        sx={{
          mt: "var(--empty-state-slot-gap)",
          color: "var(--text)",
          fontFamily: page ? "var(--type-display-lg-family)" : "var(--type-page-title-family)",
          fontSize: page ? "var(--type-display-lg-size)" : "var(--type-page-title-size)",
          lineHeight: page ? "var(--type-display-lg-leading)" : "var(--type-page-title-leading)",
          fontWeight: "var(--weight-semibold)",
          letterSpacing: "var(--tracking-tight)",
        }}
      >
        {title}
      </Typography>
      {description ? (
        <Typography
          component="p"
          role={error ? "alert" : undefined}
          sx={{
            mt: "var(--empty-state-line-gap)",
            color: error ? "var(--status-error-text)" : "var(--text-secondary)",
            fontSize: "var(--type-body-size)",
            lineHeight: "var(--type-body-leading)",
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "flex-start",
          }}
        >
          {error ? (
            <HighlightOffOutlined aria-hidden sx={{ fontSize: "var(--size-icon)", flexShrink: 0 }} />
          ) : null}
          <span>{description}</span>
        </Typography>
      ) : null}
      {error?.onRetry ? (
        <Button variant="outlined" onClick={error.onRetry} sx={{ mt: "var(--empty-state-cta-gap)" }}>
          {error.retryLabel ?? "Retry"}
        </Button>
      ) : action ? (
        <Button variant="contained" onClick={action.onClick} sx={{ mt: "var(--empty-state-cta-gap)" }}>
          {action.label}
        </Button>
      ) : null}
    </Box>
  );
};

export default EmptyState;
