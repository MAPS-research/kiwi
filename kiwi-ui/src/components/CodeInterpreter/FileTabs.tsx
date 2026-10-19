import * as React from "react";
import { Box, Tabs, Tab, Button, Chip, IconButton } from "@mui/material";
import { useEffect } from "react";
// import Grid from "@mui/material/Grid";
// import { Link, useLocation } from "react-router-dom";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import { IDEContext } from "../Chat/ChatComponent.tsx";
import { VisuallyHiddenInput } from "./VisuallyHiddenInput.tsx";
import { CODE_TAB_LABEL } from "./codeTab.ts";

/**
 * A file in the sandbox (preview SPEC § 6, the file chip): the filter chip's
 * sheet, edge and ink from the theme, in the 12/16 monospace of a file name, with
 * a hit area that grows to 44 px on coarse pointers.
 */
const FILE_CHIP = {
  position: "relative",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-xs)",
  lineHeight: "var(--leading-xs)",
  "&::before": {
    content: '""',
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "max(100%, var(--chip-hit))",
    height: "var(--chip-hit)",
    transform: "translate(-50%, -50%)",
  },
} as const;

// interface TabPanelProps {
//   children?: React.ReactNode;
//   index: number;
//   value: number;
// }

// function CustomTabPanel(props: TabPanelProps) {
//   const { children, value, index, ...other } = props;

//   return (
//     <div
//       role="tabpanel"
//       hidden={value !== index}
//       id={`simple-tabpanel-${index}`}
//       aria-labelledby={`simple-tab-${index}`}
//       {...other}
//     >
//       {value === index && (
//         <Box sx={{ p: 3 }}>
//           <Typography>{children}</Typography>
//         </Box>
//       )}
//     </div>
//   );
// }

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

interface Interaction {
  // TODO: remove 
  type: string;
  context: {}
}

interface BasicTabsProps {
  fileNames: string[];
  value_change: (value: string) => void;
  addCodeInterpreterActions: (interaction: Interaction) => void;
  modifiedFileBuffers: ArrayBuffer[];
  handleManyFileChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
}

export const BasicTabs: React.FC<BasicTabsProps> = ({
  fileNames,
  value_change,
  addCodeInterpreterActions,
  modifiedFileBuffers,
  handleManyFileChange,
}) => {
  const {
    IDETabs: tabs,
    setIDETabs: setTabs,
    IDETabvalue: value,
    setIDETabValue: setValue,
  } = React.useContext(IDEContext);

  // const [tabs, setTabs] = React.useState([
  //   { label: CODE_TAB_LABEL, content: CODE_TAB_LABEL },
  // ]);
  // const [value, setValue] = React.useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_fileNamesState, setFileNamesState] = React.useState(fileNames);

  useEffect(() => {
    setFileNamesState(fileNames);
    console.log(fileNames);
  }, [fileNames]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    if (tabs[newValue].label) {
      value_change(tabs[newValue].label);
    } else {
      value_change(CODE_TAB_LABEL);
    }
    // This should be a label name
  };

  const handleAddTab = (name: string) => {
    const newTab = {
      label: `${name}`,
      content: name,
    };
    setTabs([...tabs, newTab]);
  };

  const handleDeleteTab = (index: number) => {
    if (index !== 0) {
      const updatedTabs = tabs.filter((_, i) => i !== index);
      setTabs(updatedTabs);
      if (value === index) {
        setValue(0);
        value_change(CODE_TAB_LABEL);
      } else if (value > index) {
        setValue(value - 1);
        value_change(tabs[value - 1].label);
      }
    }
  };

  // const downloadmodifiedfile = (name: string) => {
  //   // Convert ArrayBuffer to Uint8Array

  //   // var userInput =
  //   //   prompt(`Available files to download:${fileNames.join(",")}`) || "";
  //   // console.log("The user input is", userInput);

  //   // console.log(modifiedFileBuffers);

  //   // for (let i = 0;i<modifiedFileBuffers.length;i++){
  //   console.log(name);

  //   var index = fileNames.indexOf(name);
  //   if (index) {
  //     var oneBuffer = modifiedFileBuffers[index];

  //     const uint8Array = new Uint8Array(oneBuffer);

  //     // Create a Blob from the ArrayBuffer
  //     const blob = new Blob([uint8Array], { type: "application/octet-stream" });

  //     // Create a link element
  //     const link = document.createElement("a");

  //     // Set the href attribute of the link to a Blob URL
  //     link.href = window.URL.createObjectURL(blob);

  //     // Set the download attribute to the provided file name
  //     link.download = fileNames[index];

  //     // The issue here is that it can only use the name of this uploaded file

  //     // Programmatically click the link to trigger the download
  //     link.click();
  //   }
  // };

  return (
    <Box sx={{ width: "100%" }}>
      {/* The file-tab bar: compact tool chrome on its hairline rule. */}
      <Box data-density="compact" sx={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <Tabs
          value={value}
          variant="scrollable"
          scrollButtons="auto"
          onChange={handleChange}
          aria-label="Open files"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              {...a11yProps(index)}
              onDoubleClick={() => handleDeleteTab(index)}
              label={
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                  {tab.label}
                  {index !== 0 && (
                    // WHY: a span, not a <button>: the tab itself is a button and buttons cannot nest.
                    <IconButton component="span" onClick={() => handleDeleteTab(index)}>
                      <CloseOutlined />
                    </IconButton>
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* The upload row: compact tool chrome; one chip per file in the sandbox. */}
      <Box
        data-density="compact"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "var(--space-2)",
          pt: "var(--space-3)",
          pb: "var(--space-2)",
        }}
      >
        <Button
          component="label"
          role={undefined}
          variant="outlined"
          tabIndex={-1}
          startIcon={<CloudUploadOutlined />}
        >
          Upload files
          <VisuallyHiddenInput
            type="file"
            multiple
            onChange={handleManyFileChange}
          />
        </Button>
        {fileNames &&
          fileNames.map((name, index) => {
            return (
              <Chip
                key={index}
                variant="outlined"
                label={name}
                sx={FILE_CHIP}
                onClick={() => {
                  handleAddTab(name);

                  const Interaction: Interaction = {
                    type: `frontend-interaction-ide-addfile`,
                    context: {
                      fileName: name
                    }
                  };
                  addCodeInterpreterActions(Interaction);
                }}
              />
            );
          })}
      </Box>
    </Box>
  );
};
