import React from "react";
import { Box, TextField, IconButton, useTheme } from "@mui/material";
import ChatCommands from "./ChatCommands.tsx";
import { useRef, useState } from "react";
import { useFloating, offset } from "@floating-ui/react";
import { 
  Send as SendIcon } from "@mui/icons-material";

interface ChatFieldProps {
  botAnswering: boolean;
  setPrompt: (prompt: string) => void;
  prompt: string;
  formRef: React.RefObject<HTMLFormElement>;
}

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

const ChatField: React.FC<ChatFieldProps> = ({
  botAnswering,
  setPrompt,
  prompt,
  formRef,
}) => {
  const theme = useTheme();

  const [visible, setVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ mainAxis: 0, crossAxis: 0 });
  const commandListRef = useRef<HTMLLIElement>(null!);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const { refs, floatingStyles } = useFloating({
    placement: "top-start",
    strategy: "absolute",
    open: visible,
    middleware: [offset(menuPosition)],
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputText = e.target.value;

    const shouldShowCommands = /(?:^|\s)(\/\S+)$|(?:^|\s)\/$/.test(inputText); // regexr.com/7up7h
    // const inputCommand = /\/(\w+)(?=\s*$)/.exec(inputText)?.[1] || ""; // regexr.com/7up86
    // console.log(inputCommand);

    if (shouldShowCommands && !visible) {
      const pos = getCaretCoordinates(e.target, e.target.selectionEnd);
      setMenuPosition({ crossAxis: pos.left, mainAxis: -pos.top });
    }
    setVisible(shouldShowCommands);
    setPrompt(inputText);
  };

  const handleSendClick = () => {
    formRef.current?.dispatchEvent(
      new Event("submit", {
        cancelable: true,
        bubbles: true,
      })
    );
  };

  return (
    <>
      <Box
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          p: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
        ref={refs.setReference}
      >
        
        {/* Main content area with TextField*/}
        <Box sx={{ display: "flex", width: "100%", alignItems: "center" }}>
          <TextField
            disabled={botAnswering}
            name="prompt"
            multiline
            fullWidth
            rows={3}
            placeholder="Ask Kiwi... You can type / to see available commands."
            value={prompt}
            onChange={handleChange}
            inputRef={promptRef}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendClick();
              }
              if (visible && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                e.preventDefault();
                commandListRef.current?.focus();
              }
            }}
            variant="standard"
            sx={{
              flexGrow: 1,
            }}
            slotProps={{
              input: {
                disableUnderline: true,
                sx: {
                  backgroundColor: "transparent",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  padding: 1,
                },
              }
            }}
          />
        </Box>

        {/* Bottom toolbar with send button */}
        <Box
          sx={{
            position: "flex",
            width: "100%",
            justifyContent: "flex-end",
            display: "flex",
            alignItems: "center",
            mt: 1,
          }}
        >
          <IconButton
            color="primary"
            size="large"
            disabled={botAnswering}
            onClick={handleSendClick}
          >
            <SendIcon />
          </IconButton>
        </Box>     
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
