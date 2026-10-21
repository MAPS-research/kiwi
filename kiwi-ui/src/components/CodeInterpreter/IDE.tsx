import React, { useEffect, useState, useRef } from "react";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-r";
import "ace-builds/src-noconflict/mode-text";

import { runPythonCode } from "./Pyodide.tsx";
import { runRCode } from "./WebR.tsx";

// MUI components and icons
import { Button, IconButton, Tabs, Tab, Select, MenuItem, FormControl, Tooltip } from "@mui/material";
import { BasicTabs } from "./FileTabs.tsx";
import { InfoToast } from "./InfoToast.tsx";
import { CODE_TAB_LABEL } from "./codeTab.ts";
import { IDEContext } from "../Chat/ChatComponent.tsx";

import {
  Box,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  // Avatar
} from "@mui/material";
import PlayArrowOutlined from "@mui/icons-material/PlayArrowOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import { useSaveInteraction } from "../../utils/useSaveInteraction.ts";
import { useDispatch } from "react-redux";
import { toggleCodeView } from "../../redux/codePanelSlice.ts";
import { aceThemeFor, registerKiwiAceThemes } from "../../theme/codeThemes.ts";
import { useColorMode } from "../../theme/useColorMode.ts";

// WHY: react-ace applies its theme when the editor mounts, and Ace fetches a theme it
// has not been given from the network; registering first makes ace/theme/kiwi-light
// and kiwi-dark (DESIGN.md, Code surfaces) resolve locally. It runs once per page load.
registerKiwiAceThemes();

/**
 * The editable editor's host (DESIGN.md, Code surfaces): a control, so its
 * boundary is the 1 px --editor-border-editable on --radius-sheet. On focus it
 * takes the one frame of a bordered control (the preview's `.editor:focus-within`):
 * the border recoloured plus a second pixel inward. Ace covers the host's own
 * inset shadow and its gutter and scrollbars sit at z-index 4 to 6, so that pixel
 * is drawn by a pseudo-element just above them, never as a ring outside.
 */
const EDITOR_HOST = {
  position: "relative",
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  border: "1px solid var(--editor-border-editable)",
  borderRadius: "var(--radius-sheet)",
  backgroundColor: "var(--editor-bg)",
  "&:focus-within": { borderColor: "var(--focus-ring)" },
  "&:focus-within::after": {
    content: '""',
    position: "absolute",
    inset: 0,
    zIndex: 7,
    borderRadius: "calc(var(--radius-sheet) - 1px)",
    boxShadow: "inset 0 0 0 1px var(--focus-ring)",
    pointerEvents: "none",
  },
  "@media (forced-colors: active)": {
    "&:focus-within": { outline: "2px solid Highlight", outlineOffset: "-2px" },
  },
} as const;

/** A read-only surface in the editor's place (an image preview): the 1 px --editor-border hairline. */
const VIEWER_HOST = {
  position: "relative",
  flex: 1,
  minHeight: 0,
  width: "100%",
  overflow: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  p: "var(--space-2)",
  border: "1px solid var(--editor-border)",
  borderRadius: "var(--radius-sheet)",
  backgroundColor: "var(--editor-bg)",
} as const;

/** The editor overlay (compact tool chrome): bottom right, 8 px in. */
const OVERLAY = {
  position: "absolute",
  right: "var(--space-2)",
  bottom: "var(--space-2)",
  display: "inline-flex",
  gap: "var(--icon-button-row-gap)",
} as const;

/** An empty line inside the console ("No plots generated", "No variables"). */
const CONSOLE_EMPTY = {
  p: "var(--space-4)",
  textAlign: "center",
  color: "var(--text-secondary)",
} as const;

/** Shown in the editor when a file tab has lost its buffer (copy row S-03.13). */
const FILE_GONE =
  "This file is no longer available. Uploaded files are cleared when you leave the scratchpad. Upload it again.";

/** R's printed values keep their columns: the code face at the code size. */
const CODE_TEXT = {
  m: 0,
  whiteSpace: "pre-wrap",
  fontFamily: "var(--type-code-family)",
  fontSize: "var(--type-code-size)",
  lineHeight: "var(--type-code-leading)",
} as const;

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
  // Whether the console shows an error (stderr look) rather than the program's output.
  const [outputIsError, setOutputIsError] = useState<boolean>(false);

  // Code is not paper: the editor follows the colour mode (DESIGN.md, Code surfaces).
  const colorMode = useColorMode();

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
      setOutputIsError(true);
    } else {
      setOutputIsError(false);
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

    if (value === CODE_TAB_LABEL) {
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
          setEditText(FILE_GONE);
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
          setEditText(FILE_GONE);
        } else {
          setEditorMode("image");
          addImageToDiv("editorImage", modifiedFileBuffers[fileid]);
        }
      } else {
        setEditorMode("text");
        setEditText("This file can't be opened here. The editor opens text files only. Open a text file instead.");
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

  // A click elsewhere on the page never closes the notice (InfoToast ignores clickaway).
  const handleSnackbarClose = () => {
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

  // The overlay in the editor's corner (compact tool chrome). The info toast is
  // rendered right after Run, so one Tab from Run reaches its Dismiss.
  const editorOverlay = (
    <Box data-density="compact" sx={OVERLAY}>
      <Tooltip title="Run code">
        <IconButton
          aria-label="Run code"
          onClick={() => {
            runCode(IDECode);
            SnackbarActivate();
          }}
        >
          <PlayArrowOutlined />
        </IconButton>
      </Tooltip>
      <InfoToast open={SnackbarOpen} message="Running your code…" onClose={handleSnackbarClose} />
      <Tooltip title="Upload files">
        <IconButton aria-label="Upload files" onClick={handleUploadButtonClick}>
          <FileUploadOutlined />
        </IconButton>
      </Tooltip>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleManyFileChange}
        style={{ display: "none" }}
      />
    </Box>
  );

  return (
    <Stack
      sx={{
        height: "100%",
        gap: "var(--space-3)",
        bgcolor: "background.default",
        color: "text.primary",
      }}>
      {/* -------------------- TABS (TOP) -------------------- */}
      <Box id="tab" sx={{ flex: "0 0 auto" }}>
        <BasicTabs
          fileNames={newFileNames}
          value_change={value_change}
          addCodeInterpreterActions={addCodeInterpreterActions}
          modifiedFileBuffers={modifiedFileBuffers}
          handleManyFileChange={handleManyFileChange}
        />
      </Box>

      {/* -------------------- CODE EDITOR AREA -------------------- */}
      {/* Flex-fill the remaining height so the tab bar (auto height) plus the
          fixed-height output area lay out without overflowing the Stack.
          minHeight:0 lets the editor shrink in short viewports. */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {/* Language Selector — only when this class has the R feature. */}
        {allowR && (
        <Box sx={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <FormControl data-density="compact" sx={{ width: "132px" }}>
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
            >
              <MenuItem value="python">Python</MenuItem>
              <MenuItem value="r">R</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" sx={{ color: "var(--text-secondary)" }}>
            {selectedLanguage === "python" ? "Python" : "R"}
          </Typography>
        </Box>
        )}

        {/* Editor or Image */}
        {editorMode !== "image" ? (
          <Box sx={EDITOR_HOST}>
            <AceEditor
              mode={editorMode}
              theme={aceThemeFor(colorMode)}
              name="editor"
              value={editText}
              onChange={handleEditorChange}
              // The code role, 14/24 mono (--type-code); the theme sheet sets the face.
              fontSize="var(--type-code-size)"
              lineHeight="var(--type-code-leading)"
              width="100%"
              height="100%"
              setOptions={{ showPrintMargin: false }}
            />
            {/* Overlay: Bottom-right icon buttons */}
            {editorOverlay}
          </Box>
        ) : (
          // Uploaded images are shown as drawn: never recoloured or dimmed.
          <Box id="editorImage" sx={VIEWER_HOST}>
            {/* Overlay icon buttons for image mode */}
            {editorOverlay}
          </Box>
        )}
      </Box>

      {/* -------------------- EXECUTION RESULT AREA -------------------- */}
      <Box
        sx={{
          height: "35%",
          minHeight: 0,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {/* Output Tabs: compact tool chrome on a hairline rule */}
        <Box data-density="compact" sx={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <Tabs
            value={outputTabValue}
            onChange={(event, newValue) => setOutputTabValue(newValue)}
          >
            <Tab label="Output" />
            {selectedLanguage === "r" && (
              <Tab label={`Plots (${outputImages.length})`} />
            )}
            {selectedLanguage === "r" && (
              <Tab label={`Variables (${variables.length})`} />
            )}
          </Tabs>
        </Box>

        {/* Output Content: the console (generated .kiwi-console look; it follows the mode) */}
        <Box
          className="kiwi-console"
          sx={{
            flex: 1,
            minHeight: 0,
            mt: "var(--space-2)",
            p: "var(--space-3)",
            borderRadius: "var(--radius-sheet)",
            overflow: "auto",
          }}
        >
          {outputTabValue === 0 ? (
            <Box
              component="pre"
              id="code-output"
              className={
                IDEOutputCode
                  ? outputIsError
                    ? "kiwi-console-stderr"
                    : "kiwi-console-stdout"
                  : undefined
              }
              sx={{
                m: 0,
                font: "inherit",
                width: "100%",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                ...(IDEOutputCode ? {} : { color: "var(--text-secondary)" }),
              }}>
              {IDEOutputCode || "Output will appear here."}
            </Box>
          ) : outputTabValue === 1 && selectedLanguage === "r" ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
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
                    {/* R plots are shown as drawn: never recoloured or dimmed. */}
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
                <Typography variant="body2" sx={CONSOLE_EMPTY}>
                  No plots generated
                </Typography>
              )}
            </Box>
          ) : selectedLanguage === "r" && outputTabValue === 2 ? (
            <Box sx={{ overflow: "auto", height: "100%" }}>
              {variables.length > 0 ? (
                // The header's fill is transparent; stuck, it takes the console's ground so rows never show through.
                <TableContainer sx={{ maxHeight: "400px", "& .MuiTableCell-stickyHeader": { backgroundColor: "var(--console-bg)" } }}>
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
                                <TableContainer sx={{ maxHeight: "200px" }}>
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
                                            <TableCell key={ci} sx={{ fontVariantNumeric: "tabular-nums" }}>
                                              {cell}
                                            </TableCell>
                                          ))}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              ) : (
                                <Box component="pre" sx={CODE_TEXT}>
                                  {v.preview}
                                </Box>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" sx={CONSOLE_EMPTY}>
                  No variables
                </Typography>
              )}
            </Box>
          ) : null}
        </Box>

        {/* The page's actions, centred: one filled primary (Ask Kiwi to check), a
            secondary and a tertiary (preview SPEC § 6). */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "var(--space-inline)",
            pb: "var(--space-2)",
          }}>
          <Button
            variant="outlined"
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
            Open in chat
          </Button>
          <Button
            variant="contained"
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
            Ask Kiwi to check
          </Button>
          <Button
            variant="text"
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
            Save code
          </Button>
        </Box>
      </Box>
    </Stack>
  );
};
