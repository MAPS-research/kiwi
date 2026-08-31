import React, { useEffect, useState, useRef } from "react";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-r";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/theme-clouds";
import "ace-builds/src-noconflict/mode-text";

import { runPythonCode } from "./Pyodide.tsx";
import { runRCode } from "./WebR.tsx";

// MUI components and icons
import { Button, IconButton, Snackbar, Tabs, Tab, Select, MenuItem, FormControl } from "@mui/material";
import { BasicTabs } from "./FileTabs.tsx";
import { IDEContext } from "../Chat/ChatComponent.tsx";

import {
  Box,
  Paper,
  Stack,
  Typography,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  // Avatar
} from "@mui/material";
import { PlayArrow, FileUpload } from "@mui/icons-material";
import { useSaveInteraction } from "../../utils/useSaveInteraction.ts";
import { useDispatch } from "react-redux";
import { toggleCodeView } from "../../redux/codePanelSlice.ts";


interface ChatMessages {
  isAi: boolean;
  content: string;
  typing?: boolean;
  uniqueId?: string;
  imgURLs?: string[];
  comment?: string;
  error: boolean;
}

interface IDEProps {
  pdfInfo: string;
  Messages: ChatMessages[];
  handleSendMessage: (promptMessage: string) => Promise<void>;
  exportCode: (prompt: string) => void;
  onLanguageChange?: (lang: "python" | "r") => void;
  /**
   * Whether this class may use R. The language selector was rendered
   * unconditionally, so every class saw an R option regardless of the
   * RLanguageClass feature flag — which had no reader anywhere and so did
   * nothing when granted. Defaults to false: Python-only is the common case,
   * and a class that has not been given R should not be offered it.
   */
  allowR?: boolean;
}

interface Interaction {
  // TODO: remove
  type: string;
  context: {}
}

export const IDE: React.FC<IDEProps> = ({
  pdfInfo,
  Messages,
  exportCode,
  onLanguageChange,
  allowR = false,
}) => {
  const { saveInteraction } = useSaveInteraction();
  const dispatch = useDispatch();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fileName, _setFileName] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fileContent, _setFileContent] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fileBuffer, _setFileBuffer] = useState<ArrayBuffer>(
    new ArrayBuffer(0)
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_newfileBuffer, setNewFileBuffer] = useState<ArrayBuffer>(
    new ArrayBuffer(0)
  );

  const {
    IDECode,
    setIDECode,
    IDEOutputCode,
    setIDEOutputCode,
    IDEfileNameState: newFileNames,
    setIDEFileNameState: setNewFileNames,
    IDEFileBufferState: newFileBuffers, // eslint-disable-line @typescript-eslint/no-unused-vars
    setIDEFileBufferState: setNewFileBuffers,
    IDEModifiedFileBufferState: modifiedFileBuffers,
    setModifiedFileBufferState: setModifiedFileBuffers,
  } = React.useContext(IDEContext);

  const [tabValue, setTabValue] = useState<string>("");
  const [editText, setEditText] = useState<string>("");
  const [outputImages, setOutputImages] = useState<string[]>([]);
  const [variables, setVariables] = useState<Array<{name:string; preview:string}>>([]);
  const [outputTabValue, setOutputTabValue] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<"python" | "r">("python");

  const [SnackbarOpen, setSnackbarOpen] = React.useState(false);

  const theme = useTheme();
  const editorTheme = theme.palette.mode === "dark" ? "monokai" : "clouds";

  const [editorMode, setEditorMode] = useState<string>("python");
  const [editorSaveCodeFlag, setEditorSaveCodeFlag] = useState<boolean>(true);

  // Hidden file input ref for the upload icon action
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEditText(IDECode);
  }, [IDECode]);

  const handleEditorChange = (value: string) => {
    setEditText(value);
    if (editorSaveCodeFlag) {
      setIDECode(value);
    } else {
      const txtBuffer = textToArrayBuffer(value);
      const uint8Array = new Uint8Array(txtBuffer);

      const fileId = newFileNames.indexOf(tabValue);

      setModifiedFileBuffers((prevBuffers) => {
        const updatedBuffers = [...prevBuffers];
        updatedBuffers[fileId] = uint8Array.buffer;
        return updatedBuffers;
      });
    }
  };

  const runCode = async (code: string) => {
    // clear previous execution state
    setVariables([]);
    const pattern =
      /input\(\s*(?:(['"`])\1\1([^]*?)\1\1\1|(['"`])([^]*?)\3)\s*\)/g;
    const updatedCode = code.replace(pattern, (match, a, b, c, d) => {
      const capturedText = b || d;
      const newText = prompt(capturedText);
      return newText !== null ? `"${newText}"` : match;
    });

    code = updatedCode;

    let result;
    try {
      if (selectedLanguage === "python") {
        result = await runPythonCode(
          code,
          fileName,
          fileContent,
          fileBuffer,
          newFileNames,
          modifiedFileBuffers
        );
      } else if (selectedLanguage === "r") {
        result = await runRCode(
          code,
          fileName,
          fileContent,
          fileBuffer,
          newFileNames,
          modifiedFileBuffers
        );
      }
    } catch (runError) {
      console.error("Error during code execution:", runError);
      const errMsg = runError instanceof Error ? runError.message : String(runError);
      setIDEOutputCode(errMsg);
      result = { error: errMsg } as any;
    }

    console.log("result", result);
    let output = "";

    if (result?.stdoutLines) {
      output = result.stdoutLines.join("\n");
      setIDEOutputCode(output);
    } else if (result?.results) {
      // sometimes runRCode returns a results string
      output = result.results;
      setIDEOutputCode(output);
    }

    if (result?.modifiedFileBuffer) {
      console.log(
        "This is the modified filebuffer from IDE get",
        result?.modifiedFileBuffer
      );
      setNewFileBuffer(result?.modifiedFileBuffer);
    }

    if (result?.modifiedFileNames) {
      setNewFileNames(result?.modifiedFileNames);
      console.log("These are the new files from the FS", result?.modifiedFileNames);
      console.log("This is the modified filebuffers from IDE get", result?.modifiedFileBuffers);
      setModifiedFileBuffers(result?.modifiedFileBuffers);
    }

    if (result?.images && result.images.length > 0) {
      setOutputImages(result.images);
      // keep whatever tab was selected; user can switch manually
    } else {
      setOutputImages([]);
      // if there's no plot, reset to output tab
      setOutputTabValue(0);
    }
    if (result?.variables) {
      setVariables(result.variables);
    } else {
      setVariables([]);
    }

    if (result?.error) {
      output = result.error;
      setIDEOutputCode(output);
    } else {
      console.log("Error getting the result");
    }

    saveInteraction({
      type: "frontend-interaction-ide-runcode",
      context: {
        userCode: code,
        outputCode: output,
      },
    });
  };

  const handleManyFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    saveInteraction({
      type: "frontend-interaction-ide-uploadfile",
      context: {
      },
      pdfId: pdfInfo
    })

    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setNewFileNames((prevNames) => [...prevNames, file.name]);

        file.arrayBuffer().then((arrayBuffer) => {
          if (arrayBuffer instanceof ArrayBuffer) {
            const uint8Array = new Uint8Array(arrayBuffer);
            setNewFileBuffers((prevBuffers) => [...prevBuffers, uint8Array.buffer]);
            setModifiedFileBuffers((prevBuffers) => [
              ...prevBuffers,
              uint8Array.buffer,
            ]);
          } else {
            console.error(
              "file.arrayBuffer() did not return a valid ArrayBuffer."
            );
          }
        });
      }
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const saveCodeToFile = (code: string) => {
    const buffer = textToArrayBuffer(code) as ArrayBuffer;
    setNewFileBuffers((prevBuffers) => [...prevBuffers, buffer]);
    setModifiedFileBuffers((prevBuffers) => [...prevBuffers, buffer]);

    const time = new Date().getTime();
    setNewFileNames((prevNames) => [...prevNames, `code-${time}.txt`]);
  };

  const value_change = (value: string) => {
    saveInteraction({
      type: "frontend-interaction-ide-switchtab",
      context: {
        fileName: value,
      },
    });
    setTabValue(value);
    console.log("The newly chosen tab at IDE", value);

    if (value === "Code Space") {
      setEditorMode("python");
      setEditorSaveCodeFlag(true);
      setEditText(IDECode);
    } else {
      setEditorSaveCodeFlag(false);
      // A file tab can outlive its buffer (e.g. buffers reset on remount while a
      // stale tab lingers). Guard against a missing buffer so switching to it
      // degrades to a message instead of throwing (decode(undefined) / bad Blob).
      const fileid = newFileNames.indexOf(value);
      const bufferMissing = fileid === -1 || !modifiedFileBuffers[fileid];
      if (value.endsWith(".txt")) {
        setEditorMode("text");
        if (bufferMissing) {
          setEditText("File is no longer available. Please re-upload.");
        } else {
          const filect = arrayBufferToText(modifiedFileBuffers[fileid]);
          setEditText(filect);
        }
      } else if (
        value.endsWith(".png") ||
        value.endsWith(".jpg") ||
        value.endsWith(".jpeg") ||
        value.endsWith(".gif")
      ) {
        if (bufferMissing) {
          setEditorMode("text");
          setEditText("File is no longer available. Please re-upload.");
        } else {
          setEditorMode("image");
          addImageToDiv("editorImage", modifiedFileBuffers[fileid]);
        }
      } else {
        setEditorMode("text");
        setEditText("This file type is not supported.");
      }
    }
  };

  function arrayBufferToText(arrayBuffer: ArrayBuffer) {
    return new TextDecoder().decode(arrayBuffer);
  }

  function textToArrayBuffer(text: string) {
    const encoder = new TextEncoder();
    const unit8 = encoder.encode(text);
    const buffer = new ArrayBuffer(unit8.length);
    new Uint8Array(buffer).set(unit8);
    return buffer;
  }

  const handleSnackbarClose = (
    event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  const SnackbarActivate = () => {
    setSnackbarOpen(true);
  };

  const addCodeInterpreterActions = (interaction: Interaction) => {
    saveInteraction({
      type: interaction.type,
      context: interaction.context
    })
  };

  function addImageToDiv(divId: string, buffer: ArrayBuffer) {
    const image = new Image();
    const blob = new Blob([buffer], { type: "image/jpeg" });
    image.src = URL.createObjectURL(blob);

    const div = document.getElementById(divId);
    if (div) {
      div.innerHTML = "";
      div.appendChild(image);
    }
  }

  return (
    <Stack
      height="100%"
      sx={{
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      {/* -------------------- TABS (TOP) -------------------- */}
      <Box
        id="tab"
        sx={{
          flex: "0 0 auto",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.5),
          display: "flex",
          alignItems: "center",
        }}
      >
        <BasicTabs
          fileNames={newFileNames}
          value_change={value_change}
          addCodeInterpreterActions={addCodeInterpreterActions}
          modifiedFileBuffers={modifiedFileBuffers}
          handleManyFileChange={handleManyFileChange}
        />
      </Box>

      {/* -------------------- CODE EDITOR AREA -------------------- */}
      {/* Flex-fill the remaining height so the now-visible tab bar (auto height)
          plus the fixed-height output area lay out without overflowing the
          Stack. minHeight:0 lets the editor shrink in short viewports. */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          position: "relative",
          p: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Language Selector — only when this class has the R feature. */}
        {allowR && (
        <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={selectedLanguage}
              onChange={(e) => {
                const lang = e.target.value as "python" | "r";
                setSelectedLanguage(lang);
                onLanguageChange?.(lang);
                // adjust editor syntax mode
                setEditorMode(lang === "python" ? "python" : "r");
                // Clear plots and variables when switching languages
                setOutputImages([]);
                setVariables([]);
                setOutputTabValue(0);
              }}
              sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.6),
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: alpha(theme.palette.divider, 0.3),
                },
              }}
            >
              <MenuItem value="python">Python</MenuItem>
              <MenuItem value="r">R</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            {selectedLanguage === "python" ? "Python" : "R Language"}
          </Typography>
        </Box>
        )}

        {/* Editor or Image */}
        {editorMode !== "image" ? (
          <Box
            sx={{
              height: "calc(100% - 40px)", // reserve space for overlay icon buttons
              borderRadius: 1,
              position: "relative",
              flex: 1,
            }}
          >
            <AceEditor
              mode={editorMode}
              theme={editorTheme}
              name="editor"
              value={editText}
              onChange={handleEditorChange}
              fontSize={14}
              width="100%"
              height="100%"
              style={{
                borderRadius: 4,
                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              }}
              setOptions={{ showPrintMargin: false }}
            />
            {/* Overlay: Bottom-right icon buttons */}
            <Stack
              direction="row"
              spacing={1}
              sx={{
                position: "absolute",
                bottom: 8,
                right: 8,
              }}
            >
              <IconButton
                color="primary"
                onClick={() => {
                  runCode(IDECode);
                  SnackbarActivate();
                }}
              >
                <PlayArrow />
              </IconButton>

              <IconButton
                color="info"
                onClick={handleUploadButtonClick}
              >
                <FileUpload />
              </IconButton>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleManyFileChange}
                style={{ display: "none" }}
              />
            </Stack>
          </Box>
        ) : (
          <Box
            id="editorImage"
            sx={{
              width: "100%",
              flex: 1,
              overflow: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              borderRadius: 2,
              p: 1,
              position: "relative",
            }}
          >
            {/* Overlay icon buttons for image mode */}
            <Stack
              direction="row"
              spacing={1}
              sx={{
                position: "absolute",
                bottom: 8,
                right: 8,
              }}
            >
              <IconButton
                color="primary"
                onClick={() => {
                  runCode(IDECode);
                  SnackbarActivate();
                }}
              >
                <PlayArrow />
              </IconButton>
              <IconButton
                color="info"
                onClick={handleUploadButtonClick}
              >
                <FileUpload />
              </IconButton>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleManyFileChange}
                style={{ display: "none" }}
              />
            </Stack>
          </Box>
        )}
      </Box>

      {/* -------------------- SNACKBAR (GLOBAL) -------------------- */}
      <Snackbar
        open={SnackbarOpen}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message="Code executed and files updated."
      />

      {/* -------------------- EXECUTION RESULT AREA -------------------- */}
      <Box
        sx={{
          height: "35%",
          position: "relative",
          px: 1,
          pt: 0,
          pb: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Output Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={outputTabValue}
            onChange={(event, newValue) => setOutputTabValue(newValue)}
            sx={{ minHeight: 32 }}
          >
            <Tab label="Output" sx={{ py: 0, minHeight: 32 }} />
            {selectedLanguage === "r" && (
              <Tab label={`Plots (${outputImages.length})`} sx={{ py: 0, minHeight: 32 }} />
            )}
            {selectedLanguage === "r" && (
              <Tab label={`Vars (${variables.length})`} sx={{ py: 0, minHeight: 32 }} />
            )}
          </Tabs>
        </Box>

        {/* Output Content */}
        <Paper
          variant="outlined"
          sx={{
            height: "100%",
            flex: 1,
            p: 1,
            pb: 1,
            overflow: "auto",
            bgcolor: alpha(theme.palette.background.paper, 0.4),
          }}
        >
          {outputTabValue === 0 ? (
            <Typography
              component="pre"
              id="code-output"
              fontFamily="monospace"
              width="100%"
              sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {IDEOutputCode || "Output will appear here."}
            </Typography>
          ) : outputTabValue === 1 && selectedLanguage === "r" ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                height: "100%",
              }}
            >
              {outputImages.length > 0 ? (
                outputImages.map((imageBase64, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <img
                      src={imageBase64}
                      alt={`Plot ${index + 1}`}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "400px",
                        objectFit: "contain",
                      }}
                    />
                  </Box>
                ))
              ) : (
                <Typography sx={{ p: 2, textAlign: "center" }}>
                  No plots generated.
                </Typography>
              )}
            </Box>
          ) : selectedLanguage === "r" && outputTabValue === 2 ? (
            <Box sx={{ overflow: "auto", height: "100%" }}>
              {variables.length > 0 ? (
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Preview</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {variables.map((v, idx) => {
                        const lines = v.preview.trim().split('\n').map(l=>l.trim()).filter(l=>l);
                        let tableData: string[][] | null = null;
                        if (lines.length > 1) {
                          const cols = lines[0].split(/\s{2,}/);
                          if (cols.length > 1) {
                            tableData = lines.map((line) => line.split(/\s{2,}/));
                          }
                        }
                        return (
                          <TableRow key={idx}>
                            <TableCell>{v.name}</TableCell>
                            <TableCell>
                              {tableData ? (
                                <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        {tableData[0].map((cell, ci) => (
                                          <TableCell key={ci}>{cell}</TableCell>
                                        ))}
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {tableData.slice(1).map((row, ri) => (
                                        <TableRow key={ri}>
                                          {row.map((cell, ci) => (
                                            <TableCell key={ci}>{cell}</TableCell>
                                          ))}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              ) : (
                                <Typography component="pre" sx={{ whiteSpace: "pre-wrap" }}>
                                  {v.preview}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography sx={{ p: 2, textAlign: "center" }}>
                  No variables.
                </Typography>
              )}
            </Box>
          ) : null}
        </Paper>

        {/* Overlayed buttons at the bottom center of the output area */}
        <Stack
          direction="row"
          justifyContent="center"
          spacing={2}
          sx={{
            mt: 0.5,
            p: 0.5,
          }}
        >
          <Button
            variant="contained"
            // color="secondary"
            onClick={() => {
              const code_correction_prompt = `I have the following solution for question #.\n\n\`\`\`python\n${IDECode}\n\`\`\`\nOutput:\n\`\n${IDEOutputCode}\n\``;
              saveInteraction({
                type: "frontend-interaction-ide-movecodetochat",
                context: {
                  userCode: IDECode,
                  outputCode: IDEOutputCode,
                },
              });
              exportCode(code_correction_prompt);
              dispatch(toggleCodeView());
            }}
          >
            <Typography
              variant="button"
              noWrap
              sx={{
                letterSpacing: "-0.02em",
              }}
            >
              Move to Chat
            </Typography>
          </Button>
          <Button
            variant="contained"
            // color="secondary"
            onClick={() => {
              const code_correction_prompt = `Check my answer for question #.\n\n\`\`\`python\n${IDECode}\n\`\`\`\nOutput:\n\`\n${IDEOutputCode}\n\``;
              saveInteraction({
                type: "frontend-interaction-ide-checkanswer",
                context: {
                  userCode: IDECode,
                  outputCode: IDEOutputCode,
                },
              });
              exportCode(code_correction_prompt);
              dispatch(toggleCodeView());
            }}
          >
            <Typography
              variant="button"
              noWrap
              sx={{
                letterSpacing: "-0.02em",
              }}
            >
              Check Answer
            </Typography>
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              saveInteraction({
                type: "frontend-interaction-ide-savecodetofile",
                context: {
                  userCode: IDECode,
                  outputCode: IDEOutputCode,
                },
              });
              saveCodeToFile(IDECode);
            }}
          >
            Save Code
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
};
