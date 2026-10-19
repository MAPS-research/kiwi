import { createElement, ReactNode, useCallback, useEffect, useState } from "react";
import { renderToString } from "react-dom/server";
import Check from "@mui/icons-material/Check";
import ContentCopy from "@mui/icons-material/ContentCopy";
import { Box, IconButton, Tooltip } from "@mui/material";
import { visuallyHidden } from "../../theme/visuallyHidden.ts";
import { toolbarButtonSx } from "../Chat/toolbarButton.ts";

/** How long the copied state shows before the button reverts (an idempotent action's label swap). */
const COPIED_MS = 2000;

/**
 * The code block's Copy button (kiwi-ui/DESIGN.md, The tutor-message surface): a
 * 28 px toolbar button named "Copy code". After a copy it shows the check for
 * 2 s and says "Copied" once to assistive technology.
 */
export default function CodeCopyButton({
  children,
}: {
  children: ReactNode | ReactNode[];
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = useCallback((reactChildren: ReactNode | ReactNode[]) => {
    const textString = renderToString(
      createElement("div", null, reactChildren)
    );
    const tempElement = document.createElement("div");
    tempElement.innerHTML = textString;
    const unencodedText = tempElement.textContent || "";

    navigator.clipboard.writeText(unencodedText).then(
      () => {
        setCopied(true);
      },
      (err) => {
        console.error("Failed to copy to clipboard:", err);
      }
    );
  }, []);

  return (
    <>
      <Tooltip title={copied ? "Copied" : "Copy code"}>
        <IconButton aria-label="Copy code" onClick={() => handleCopy(children)} sx={toolbarButtonSx}>
          {copied ? <Check /> : <ContentCopy />}
        </IconButton>
      </Tooltip>
      <Box
        component="span"
        role="status"
        sx={visuallyHidden}
      >
        {copied ? "Copied" : ""}
      </Box>
    </>
  );
}
