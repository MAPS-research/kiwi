import React, { useId, useRef, useState } from "react";
import { Box, ButtonBase, InputBase, Typography } from "@mui/material";
import { useFloating, offset } from "@floating-ui/react";
import ChatCommands from "./ChatCommands.tsx";

interface ChatFieldProps {
  botAnswering: boolean;
  setPrompt: (prompt: string) => void;
  prompt: string;
  formRef: React.RefObject<HTMLFormElement>;
  /** Stops the answer in flight (Stop, or Escape in the composer). */
  onStop?: () => void;
}

const PLACEHOLDER = "Ask a question, or type / for commands";
const ANSWERING_REASON = "Kiwi is answering. Select Stop to interrupt.";

const getCaretCoordinates = (
  element: HTMLTextAreaElement,
  position: number | null
) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const style = getComputedStyle(element);
  const propsToMirror = [
    "width",
    "height",
    "font",
    "paddingLeft",
    "paddingTop",
    "paddingBottom",
    "paddingRight",
    "borderLeftWidth",
    "borderRightWidth",
    "borderTopWidth",
    "borderBottomWidth",
    "lineHeight",
    "textAlign",
    "letterSpacing",
    "wordSpacing",
  ];
  propsToMirror.forEach((prop: any) => (div.style[prop] = style[prop]));
  div.textContent = element.value.substring(0, position || 0);
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.overflow = "scroll";
  div.scrollTop = element.scrollTop;
  div.scrollLeft = element.scrollLeft;

  const span = document.createElement("span");
  span.textContent = element.value.substring(position || 0) || ".";
  div.appendChild(span);

  const { offsetLeft, offsetTop } = span;
  const adjustedLeft = offsetLeft - element.scrollLeft;
  const adjustedTop = offsetTop - element.scrollTop;

  document.body.removeChild(div);
  const PADDING_OFFSET = { top: 20, left: 10 };
  return {
    top: adjustedTop + PADDING_OFFSET.top,
    left: adjustedLeft + PADDING_OFFSET.left,
  };
};

/** The one frame of a bordered control: its border becomes 2 px of --focus-ring, the second pixel inward. */
const FRAME = {
  outline: "none",
  borderColor: "var(--focus-ring)",
  boxShadow: "inset 0 0 0 1px var(--focus-ring)",
};

/** Send and Stop: 32 px round buttons inside the box, at its right end; 44 px hit areas on a coarse pointer. */
const actionSx = {
  position: "absolute",
  right: "6px",
  bottom: "6px",
  width: "var(--tutor-message-composer-action)",
  height: "var(--tutor-message-composer-action)",
  borderRadius: "50%",
  boxSizing: "border-box",
  display: "grid",
  placeItems: "center",
  transition: "transform var(--motion-micro) var(--motion-ease-toggle)",
  "&::before": {
    content: '""',
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "var(--tutor-message-composer-action-hit)",
    height: "var(--tutor-message-composer-action-hit)",
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
  },
} as const;

/** The up arrow of Send, drawn 18 px in the label colour. */
const SendArrow = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <path
      d="M12 18.5V5.5M6.5 11 12 5.5 17.5 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Stop: a ring in the ink around a filled square, drawn 32 px. */
const StopGlyph = () => (
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
    <circle className="kiwi-stop-ring" cx="16" cy="16" r="15.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="11" width="10" height="10" rx="2" fill="currentColor" />
  </svg>
);

/**
 * The composer (kiwi-ui/DESIGN.md, The tutor-message surface; the user's
 * decision of 2026-10-19): one text box with Send and Stop inside it. Send is
 * the primary's up arrow, faded while the box is empty; while Kiwi answers it
 * becomes Stop, and the box stays focusable but read-only with its stated
 * reason underneath. Escape in the box stops an answer in flight.
 */
const ChatField: React.FC<ChatFieldProps> = ({
  botAnswering,
  setPrompt,
  prompt,
  formRef,
  onStop,
}) => {
  const [visible, setVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ mainAxis: 0, crossAxis: 0 });
  const commandListRef = useRef<HTMLLIElement>(null!);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const reasonId = useId();
  const empty = prompt.trim().length === 0;

  const { refs, floatingStyles } = useFloating({
    placement: "top-start",
    strategy: "absolute",
    open: visible,
    middleware: [offset(menuPosition)],
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputText = e.target.value;

    const shouldShowCommands = /(?:^|\s)(\/\S+)$|(?:^|\s)\/$/.test(inputText); // regexr.com/7up7h

    if (shouldShowCommands && !visible) {
      const pos = getCaretCoordinates(e.target, e.target.selectionEnd);
      setMenuPosition({ crossAxis: pos.left, mainAxis: -pos.top });
    }
    setVisible(shouldShowCommands);
    setPrompt(inputText);
  };

  const submit = () => {
    if (botAnswering || empty) return;
    formRef.current?.dispatchEvent(
      new Event("submit", {
        cancelable: true,
        bubbles: true,
      })
    );
  };

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <Box
          ref={refs.setReference}
          data-testid="chat-composer-box"
          sx={{
            position: "relative",
            minHeight: "var(--tutor-message-composer-min-height)",
            border: "1px solid var(--border-interactive)",
            borderRadius: "var(--tutor-message-composer-radius)",
            backgroundColor: botAnswering ? "var(--field-disabled-fill)" : "var(--field-fill)",
            "&:has(textarea:focus)": FRAME,
          }}
        >
          <InputBase
            name="prompt"
            multiline
            fullWidth
            minRows={2}
            maxRows={8}
            placeholder={PLACEHOLDER}
            value={prompt}
            onChange={handleChange}
            inputRef={promptRef}
            readOnly={botAnswering}
            onKeyDown={(e) => {
              if (e.key === "Escape" && botAnswering && onStop) {
                e.preventDefault();
                e.stopPropagation();
                onStop();
                return;
              }
              // Escape dismisses the open commands menu first; the chat panel keeps it.
              if (e.key === "Escape" && visible) {
                e.preventDefault();
                e.stopPropagation();
                setVisible(false);
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
              if (visible && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                e.preventDefault();
                commandListRef.current?.focus();
              }
            }}
            inputProps={{
              "aria-label": PLACEHOLDER,
              "aria-disabled": botAnswering || undefined,
              "aria-describedby": botAnswering ? reasonId : undefined,
            }}
            sx={{
              display: "block",
              padding: "var(--space-2) calc(var(--tutor-message-composer-action) + 6px + var(--space-2)) var(--space-2) var(--space-3)",
              color: "var(--field-text)",
              "& textarea": { cursor: botAnswering ? "not-allowed" : "text" },
            }}
          />

          {botAnswering ? (
            <ButtonBase
              aria-label="Stop answering"
              onClick={onStop}
              sx={{
                ...actionSx,
                backgroundColor: "var(--surface)",
                color: "var(--text)",
                "&:active": { transform: "scale(var(--motion-press-scale))" },
                "&:focus-visible": { outline: "none" },
                "&:focus-visible .kiwi-stop-ring": { stroke: "var(--focus-ring)", strokeWidth: 2, r: 15 },
              }}
            >
              <StopGlyph />
            </ButtonBase>
          ) : (
            <ButtonBase
              aria-label="Send message"
              aria-disabled={empty || undefined}
              onClick={submit}
              sx={{
                ...actionSx,
                backgroundColor: "var(--button-primary-fill)",
                border: "1px solid var(--button-primary-border)",
                color: "var(--button-primary-text)",
                "&:hover": {
                  backgroundColor: "var(--button-primary-hover-fill)",
                  borderColor: "var(--button-primary-hover-border)",
                },
                "&:active": {
                  backgroundColor: "var(--button-primary-active-fill)",
                  borderColor: "var(--button-primary-active-border)",
                  transform: "scale(var(--motion-press-scale))",
                },
                "&[aria-disabled='true'], &[aria-disabled='true']:hover, &[aria-disabled='true']:active": {
                  backgroundColor: "var(--disabled-solid)",
                  borderColor: "var(--disabled-solid-border)",
                  color: "var(--disabled-label)",
                  transform: "none",
                },
                "&:focus-visible": FRAME,
              }}
            >
              <SendArrow />
            </ButtonBase>
          )}
        </Box>

        {botAnswering ? (
          <Typography id={reasonId} variant="caption" component="p" sx={{ m: 0, color: "var(--text-secondary)" }}>
            {ANSWERING_REASON}
          </Typography>
        ) : null}
      </Box>

      <Box hidden={!visible} ref={refs.setFloating} style={floatingStyles}>
        <ChatCommands
          prompt={prompt}
          setPrompt={setPrompt}
          visible={visible}
          setVisible={setVisible}
          promptRef={promptRef}
          listRef={commandListRef}
        />
      </Box>
    </>
  );
};

export default ChatField;
