// import CommandPalette from "react-command-palette";
import { ReferenceType } from "@floating-ui/react";
import { Card, MenuList, MenuItem, ListItemText } from "@mui/material";
import { useContext, useState } from "react";
import { ChatContext } from "../../pages/ClassLayout.tsx";

interface ChatFieldProps {
  setPrompt: (prompt: string) => void;
  prompt: string;
  //   setCommand: (command: string) => void;
  //   command: string;
  visible: boolean;
  setVisible: (visible: boolean) => void;
  promptRef: React.MutableRefObject<ReferenceType | null>;
  listRef: React.RefObject<HTMLLIElement>;
}

type CommandListKeys = "class materials" | "recitation";

const commandList = {
  "class materials": [
    {
      templateName: "Grab code from slide",
      templatePrompt: "Extract the code present in this page.",
    },
    {
      templateName: "Explain this slide",
      templatePrompt: "Explain the contents of this page.",
    },
    {
      templateName: "Generate exercise",
      templatePrompt: "Give me an exercise based on this page.",
    },
  ],
  "recitation": [
    {
      templateName: "Guide me",
      templatePrompt: "Guide me through the question #",
    },
    {
      templateName: "Evaluate my answer",
      templatePrompt:
        "I have the following solution for question #.\nCan you help me check it?\n\n```python\n# your code here\n```",
    },
    {
      templateName: "Generate similar question",
      templatePrompt: "Generate a question similar to the question #",
    },
  ],
};

const ChatCommands: React.FC<ChatFieldProps> = ({
  setPrompt,
  prompt,
  //   command,
  visible,
  setVisible,
  //   setCommand,
  promptRef,
  listRef,
}) => {
  // const [command, setCommand] = useState(commandList[0].templatePrompt);
  const [commandIndex, setCommandIndex] = useState(0);

  const currentPDFMaterialType = (useContext(ChatContext)
    .currentPDFMaterialType || "class materials") as CommandListKeys;

  const handleFirstFocus = () => {
    // console.log("focus!");
    setPrompt(commandList[currentPDFMaterialType][0].templatePrompt);
    setCommandIndex(0);
  };

  // const handleCommandChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const selectedCommand = (event.target as HTMLInputElement).value;
  //   setPrompt(`${selectedCommand}`);
  //   // setCommand(selectedCommand);
  // };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLElement>) => {
    let newCommandIndex = commandIndex;
    // console.log("Here", newCommandIndex);
    if (event.key === "ArrowUp") {
      newCommandIndex =
        (newCommandIndex - 1 + commandList[currentPDFMaterialType].length) %
        commandList[currentPDFMaterialType].length;
    } else if (event.key === "ArrowDown") {
      newCommandIndex =
        (newCommandIndex + 1) % commandList[currentPDFMaterialType].length;
    }

    if (event.key === "Escape") {
      setVisible(false);
      if (promptRef.current instanceof HTMLElement) promptRef.current.focus();
    }
    // console.log("Here", newCommandIndex);

    setCommandIndex(newCommandIndex);

    setPrompt(
      commandList[currentPDFMaterialType][newCommandIndex].templatePrompt
    );
  };

  return (
    <Card>
      <MenuList dense onFocus={handleFirstFocus} onKeyDown={handleKeyPress}>
        {commandList[currentPDFMaterialType].map((cmd, index) => (
          <MenuItem
            key={index}
            ref={index === 0 ? listRef : undefined}
            onClick={() => {
              setPrompt(cmd.templatePrompt);
              setVisible(false);
              if (promptRef.current instanceof HTMLElement)
                promptRef.current.focus();
              setCommandIndex(0);
            }}
          >
            <ListItemText>{cmd.templateName}</ListItemText>
          </MenuItem>
        ))}
      </MenuList>
    </Card>
  );
};

export default ChatCommands;
