import type { ReactElement } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import FirstPageOutlined from "@mui/icons-material/FirstPageOutlined";
import LastPageOutlined from "@mui/icons-material/LastPageOutlined";
import DisabledReason from "./DisabledReason.tsx";
import { formatCount } from "./countNoun.ts";

export interface AdminTablePaginationProps {
  /** The current page, from 1. */
  page: number;
  pageSize: number;
  /** The number of rows across all pages. */
  total: number;
  onPageChange: (page: number) => void;
}

/** The disabled reasons of the page buttons (shared strings DS.13 and DS.14). */
const FIRST_PAGE_REASON = "This is the first page.";
const LAST_PAGE_REASON = "This is the last page.";

/**
 * The footer of an admin table (DESIGN.md, DataGrid mapping > Footer): one row
 * at the table's row height under its closing rule, the row count ("1–15 of 20")
 * in caption type, secondary and tabular, then first / previous / next / last as
 * compact icon buttons. A button that cannot act stays focusable and says why.
 */
const AdminTablePagination = ({ page, pageSize, total, onPageChange }: AdminTablePaginationProps) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 1), pageCount);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);
  const onFirst = current <= 1;
  const onLast = current >= pageCount;

  const pageButton = (label: string, target: number, unavailable: boolean, reason: string, icon: ReactElement) => (
    <DisabledReason reason={unavailable ? reason : null}>
      <IconButton
        aria-label={label}
        aria-disabled={unavailable || undefined}
        onClick={() => {
          if (!unavailable) onPageChange(target);
        }}
      >
        {icon}
      </IconButton>
    </DisabledReason>
  );

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        gap: "var(--icon-button-row-gap)",
        minHeight: "var(--table-row-height)",
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums", mr: "var(--space-3)" }}
      >
        {`${formatCount(from)}–${formatCount(to)} of ${formatCount(total)}`}
      </Typography>
      {pageButton("First page", 1, onFirst, FIRST_PAGE_REASON, <FirstPageOutlined />)}
      {pageButton("Previous page", current - 1, onFirst, FIRST_PAGE_REASON, <ChevronLeftOutlined />)}
      {pageButton("Next page", current + 1, onLast, LAST_PAGE_REASON, <ChevronRightOutlined />)}
      {pageButton("Last page", pageCount, onLast, LAST_PAGE_REASON, <LastPageOutlined />)}
    </Box>
  );
};

export default AdminTablePagination;
