import { useRef, useState } from "react";
import { Box, Button, TextField } from "@mui/material";
import type { DocumentProps } from "react-pdf";

export type PdfDocument = Parameters<
  NonNullable<DocumentProps["onLoadSuccess"]>
>[0];

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
    setStatus("Searching…");
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
        result.length ? `${result.length} matching pages` : "No matches",
      );
      if (result.length) onSelect(result[0]);
    } catch {
      setStatus("Search failed. Try again.");
    } finally {
      searching.current = false;
    }
  }
  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        void search();
      }}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        alignItems: "center",
        px: 1,
        pb: 1,
      }}
    >
      <TextField
        label="Search PDF"
        size="small"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Button type="submit" disabled={status === "Searching…" || !query.trim()}>
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
      <span role="status">{status}</span>
    </Box>
  );
}
