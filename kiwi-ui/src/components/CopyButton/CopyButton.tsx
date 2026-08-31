import { createElement, ReactNode, useCallback, useState } from "react";
import { renderToString } from "react-dom/server";
import { Check, ContentCopy } from "@mui/icons-material";
import { Button } from "@mui/material";

export default function CodeCopyButton({
  children,
}: {
  children: ReactNode | ReactNode[];
}) {
  const [buttonState, setButtonState] = useState<"Copy" | "Copied">("Copy");

  const handleCopy = useCallback((reactChildren: ReactNode | ReactNode[]) => {
    const textString = renderToString(
      createElement("div", null, reactChildren)
    );
    const tempElement = document.createElement("div");
    tempElement.innerHTML = textString;
    const unencodedText = tempElement.textContent || "";

    navigator.clipboard.writeText(unencodedText).then(
      () => {
        setButtonState("Copied");
        // console.log('Copied to clipboard:', unencodedText);
      },
      (err) => {
        console.error("Failed to copy to clipboard:", err);
      }
    );
  }, []);

  return (
    <Button
      variant="contained"
      startIcon={buttonState === "Copy" ? <ContentCopy /> : <Check />}
      onClick={() => handleCopy(children)}
    >
      {buttonState}
    </Button>
  );
}
