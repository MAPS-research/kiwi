import type { ReactElement } from "react";
import { Chip, SvgIcon, type ChipProps, type SvgIconProps } from "@mui/material";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";

export type StatusKind = "success" | "warning" | "error" | "info" | "neutral";

/** The static dashed ring of the neutral in-progress status (never a spinner). */
const DashedRing = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 2" />
  </SvgIcon>
);

/** Elements, not components: Chip clones its icon to add its own class. */
const ICONS: Record<StatusKind, ReactElement> = {
  success: <CheckOutlined aria-hidden />,
  warning: <WarningAmberOutlined aria-hidden />,
  error: <CloseOutlined aria-hidden />,
  info: <InfoOutlined aria-hidden />,
  neutral: <DashedRing aria-hidden />,
};

const COLOR: Record<StatusKind, ChipProps["color"]> = {
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
  neutral: "default",
};

interface StatusChipProps {
  kind: StatusKind;
  label: string;
  size?: ChipProps["size"];
}

/**
 * A status chip (kiwi-ui/DESIGN.md, Chips and Functional colour usage): the
 * status -3 surface, its -11 text and a shape icon (check, triangle, cross, i,
 * or the dashed ring for in progress), so a status is never colour alone. The
 * only tinted chip; role and label chips stay neutral.
 */
const StatusChip = ({ kind, label, size }: StatusChipProps) => {
  return (
    <Chip
      size={size}
      color={COLOR[kind]}
      icon={ICONS[kind]}
      label={label}
      sx={
        kind === "neutral"
          ? {
              backgroundColor: "var(--chip-status-variant-neutral-fill)",
              color: "var(--chip-status-variant-neutral-text)",
              "& .MuiChip-icon": { color: "var(--chip-status-variant-neutral-icon)" },
            }
          : undefined
      }
    />
  );
};

export default StatusChip;
