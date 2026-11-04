import { useLayoutEffect, useRef, useState } from "react";
import { Box, Tooltip } from "@mui/material";
import { densityAttr } from "./regionDensity.ts";

export interface TruncatedTextProps {
  /** The cell's full text (an email, a name, an identifier). */
  text: string;
}

/**
 * One line of a table cell with an ellipsis (DESIGN.md, Chart tokens > Tables,
 * truncation). While the text fits it is plain text: no tab stop, no tooltip.
 * While it is cut (measured, `scrollWidth > clientWidth`, again on resize) the
 * span becomes focusable and shows the full text in a tooltip on hover and on
 * focus, linked as its description; its focus ring sits inset so the cell's
 * clipping never hides it.
 */
const TruncatedText = ({ text }: TruncatedTextProps) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [cut, setCut] = useState(false);
  const [portalAttr, setPortalAttr] = useState<Record<string, string>>({});

  useLayoutEffect(() => {
    const node = spanRef.current;
    if (!node) return undefined;
    const measure = () => setCut(node.scrollWidth > node.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [text]);

  return (
    <Tooltip
      title={cut ? text : ""}
      describeChild
      placement="bottom-start"
      disableHoverListener={!cut}
      disableFocusListener={!cut}
      disableTouchListener={!cut}
      onOpen={() => setPortalAttr(densityAttr(spanRef.current))}
      slotProps={{
        popper: { ...portalAttr },
        tooltip: { sx: { overflowWrap: "anywhere" } },
      }}
    >
      <Box
        component="span"
        ref={spanRef}
        tabIndex={cut ? 0 : undefined}
        sx={{
          display: "block",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          "&:focus-visible": { outlineOffset: "calc(-1 * var(--size-focus-ring))" },
        }}
      >
        {text}
      </Box>
    </Tooltip>
  );
};

export default TruncatedText;
