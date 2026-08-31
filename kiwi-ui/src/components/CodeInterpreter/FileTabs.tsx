import * as React from "react";
import { Box, Tabs, Tab, Button } from "@mui/material";
import { useEffect } from "react";
// import Grid from "@mui/material/Grid";
// import { Link, useLocation } from "react-router-dom";
import { Stack } from "@mui/material";
import { IDEContext } from "../Chat/ChatComponent.tsx";
import { VisuallyHiddenInput } from "./VisuallyHiddenInput.tsx";
import {Close, CloudUpload} from "@mui/icons-material";

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
  //   { label: "Code Space", content: "Code space" },
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
      value_change("Code Space");
    }
    // This should be a label name
  };

  const handleAddTab = (name: string) => {
    const newTab = {
      label: `${name}`,
      content: `The file ${name}`,
    };
    setTabs([...tabs, newTab]);
  };

  const handleDeleteTab = (index: number) => {
    if (index !== 0) {
      const updatedTabs = tabs.filter((_, i) => i !== index);
      setTabs(updatedTabs);
      if (value === index) {
        setValue(0);
        value_change("Code Space");
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
    <Box width="100%">
      <Box width="100%" minHeight="50px" overflow="auto">
        <Box>
          <Tabs
            value={value}
            variant="scrollable"
            scrollButtons="auto"
            onChange={handleChange}
            aria-label="basic tabs example"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                {...a11yProps(index)}
                onDoubleClick={() => handleDeleteTab(index)}
                sx={{ height: '10px' }}
                label={
                  <div>
                    {tab.label}
                    {index !== 0 && (
                      <Button
                        endIcon={<Close />}
                        onClick={() => handleDeleteTab(index)}
                      />
                    )}
                  </div>
                }
              />
            ))}
          </Tabs>
        </Box>
      </Box>

      <Box height="45px" width="100%">
        <Stack direction="row" sx={{ minWidth: 0 }} overflow="auto" spacing={1}>
          <Button
            size="small"
            component="label"
            role={undefined}
            variant="outlined"
            tabIndex={-1}
            sx={{
              height: "30px",
              minWidth: "100px",
            }}
            startIcon={<CloudUpload />}
          >
            Upload
            <VisuallyHiddenInput
              type="file"
              multiple
              onChange={handleManyFileChange}
            />
          </Button>
          {fileNames &&
            fileNames.map((name, index) => {
              return (
                <Button
                  key={index}
                  variant="contained"
                  sx={{
                    height: "30px",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
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
                >
                  {name}
                </Button>
              );
            })}
        </Stack>
      </Box>
    </Box>
  );
};
