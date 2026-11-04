import { useRef, useState } from "react";
import { Box, Button, TextField } from "@mui/material";
import type { DocumentProps } from "react-pdf";

export type PdfDocument = Parameters<
  NonNullable<DocumentProps["onLoadSuccess"]>
>[0];

const SEARCHING = "Searching…";
const SEARCH_FAILED =
  "Couldn't search this PDF. The server didn't respond as expected. Try again.";

/** The status line's colour: in progress, failed, or a plain result. */
const statusColor = (status: string) =>
  status === SEARCHING
    ? "var(--in-progress-text)"
    : status === SEARCH_FAILED
      ? "var(--status-error-text)"
      : "var(--pdf-toolbar-variant-search-panel-status)";

/** Search only when requested, so opening a PDF retains lazy range loading. */
export function PdfSearch({
  pdf,
  onSelect,
}: {
  pdf: PdfDocument;
  onSelect: (pageIndex: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<number[]>([]);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState("");
  const searching = useRef(false);
  async function search() {
    const term = query.trim().toLocaleLowerCase();
    if (!term || searching.current) return;
    searching.current = true;
    setStatus(SEARCHING);
    setMatches([]);
    try {
      const result: number[] = [];
      for (let number = 1; number <= pdf.numPages; number++) {
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        if (text.toLocaleLowerCase().includes(term)) result.push(number - 1);
      }
      setMatches(result);
      setSelected(0);
      setStatus(
        result.length
          ? `${result.length} ${result.length === 1 ? "matching page" : "matching pages"}`
          : "No matches",
      );
      if (result.length) onSelect(result[0]);
    } catch {
      setStatus(SEARCH_FAILED);
    } finally {
      searching.current = false;
    }
  }
  return (
    <Box
      component="form"
      data-density="compact"
      onSubmit={(event) => {
        event.preventDefault();
        void search();
      }}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-2)",
        alignItems: "flex-end",
        px: "var(--space-2)",
        py: "var(--space-2)",
        bgcolor: "var(--pdf-toolbar-variant-search-panel-fill)",
        color: "var(--pdf-toolbar-variant-search-panel-text)",
        borderBottom: "1px solid var(--pdf-toolbar-rule)",
      }}
    >
      <TextField
        label="Search PDF"
        size="small"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Button
        type="submit"
        variant="outlined"
        disabled={status === SEARCHING || !query.trim()}
      >
        Find
      </Button>
      <Button
        disabled={matches.length < 2}
        onClick={() => {
          const next = (selected + 1) % matches.length;
          setSelected(next);
          onSelect(matches[next]);
        }}
      >
        Next match
      </Button>
      <Box
        component="span"
        role="status"
        sx={{
          alignSelf: "center",
          color: statusColor(status),
          fontFamily: "var(--type-caption-family)",
          fontSize: "var(--type-caption-size)",
          lineHeight: "var(--type-caption-leading)",
        }}
      >
        {status}
      </Box>
    </Box>
  );
}
