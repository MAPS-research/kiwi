// import AddCommentIcon from "@mui/icons-material/AddComment";
// import SendIcon from "@mui/icons-material/Send";
import React, {
  FormEvent,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../redux/store.ts";
import { toggleCodeView } from "../../redux/codePanelSlice.ts";

// import { v4 as uuidv4 } from "uuid";
import PanelHeader from '../PanelHeader/PanelHeader.tsx';
import apiClient, { basePath } from "../../utils/api.ts";
import type { ChatMessage } from "./ChatMessages.tsx";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
} from "@mui/material";
import { CodeInterpreter } from "../CodeInterpreter/CodeInterpreter.tsx";
import { ChatContext } from "../../pages/ClassLayout.tsx";
import ChatField from "./ChatField.tsx";
import ChatMessages from "./ChatMessages.tsx";
// import { useSaveInteraction } from "../../utils/useSaveInteraction";
import { useAuth } from "../../auth/AuthContext.tsx";
import { featureFlagChecker } from "../../utils/featureFlagChecker.ts";

// Detect tool execution from bot response content
const detectToolExecution = (
  content: string
): { toolName: string; status: "running" | "complete" } | undefined => {
  // Match patterns like "Using [ToolName]..." at the start
  const toolPatterns = [
    /^Using\s+([^.]+)\.\.\./i,
    /^#\s*Using\s+([^:]+?)(?:\s+Tool)?:/i,
  ];

  for (const pattern of toolPatterns) {
    const match = content.match(pattern);
    if (match) {
      return {
        toolName: match[1].trim(),
        status: "running",
      };
    }
  }

  return undefined;
};

export const IDEContext = React.createContext(
  {} as {
    IDECode: string;
    setIDECode: (code: string) => void;
    IDEOutputCode: string;
    setIDEOutputCode: (code: string) => void;
    IDEfileNameState: string[];
    setIDEFileNameState: React.Dispatch<React.SetStateAction<string[]>>;
    IDEFileBufferState: ArrayBuffer[];
    setIDEFileBufferState: React.Dispatch<React.SetStateAction<ArrayBuffer[]>>;
    IDEModifiedFileBufferState: ArrayBuffer[];
    setModifiedFileBufferState: React.Dispatch<
      React.SetStateAction<ArrayBuffer[]>
    >;
    IDETabs: { label: string; content: string }[];
    setIDETabs: React.Dispatch<
      React.SetStateAction<{ label: string; content: string }[]>
    >;
    IDETabvalue: number;
    setIDETabValue: React.Dispatch<React.SetStateAction<number>>;
  }
);

export const ChatComponent: React.FC = () => {
  // const { saveInteraction } = useSaveInteraction();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState<string>("");
  const [botAnswering, setBotAnswering] = useState<boolean>(false);

  const messageEndRef = useRef<HTMLDivElement>(null!);
  const formRef = useRef<HTMLFormElement>(null!);

  // tabs
  const [tabIndex, setTabIndex] = useState<number>(0); // TODO: change back 0

  // class
  const {
    class: selectedClass,
    currentPDFID: selectedPdfId,
    currentPDFPage: selectedPdfPage,
    currentPDFMaterialType: selectedPDFMaterialType,
    engineChoice,
    setEngineChoice,
  } = useContext(ChatContext);

  // Check Available Features
  const { availableFeatures } = useAuth();
  // Check if the user has the feature to use Qwen
  // Qwen engine is available to everyone — no longer gated by the QwenModel flag.
  const qwenEnabled = true;

  // IDE
  const [IDECode, setIDECode] = useState<string>("");
  const [IDEOuputCode, setIDEOutputCode] = useState<string>("");
  const [IDEfileNameState, setIDEFileNameState] = useState<string[]>([]);
  const [IDEFileBufferState, setIDEFileBufferState] = useState<ArrayBuffer[]>(
    []
  );
  const [IDEModifiedFileBufferState, setModifiedFileBufferState] = useState<
    ArrayBuffer[]
  >([]);
  const [IDEtabs, setIDETabs] = React.useState([
    { label: "Code Space", content: "Code space" },
  ]);
  const [IDETabvalue, setIDETabValue] = React.useState(0);

  const loaderIdRef = useRef("");

  // OAuth authorization state for MCP tools
  interface OAuthRequiredState {
    serverId: string;
    serverName: string;
    toolName: string;
    authorizationUrl: string;
    message: string;
  }
  const [oAuthRequired, setOAuthRequired] = useState<OAuthRequiredState | null>(
    null
  );

  const dispatch = useDispatch();
  const showCode = useSelector((state: RootState) => state.codePanel.isCodeViewVisible);
  // Timer for tracking time on page, we actually have a duplicated one in ChatPdf.tsx. TODO: cleanup to keep only one timer
  const [pageTimer, setPageTimer] = useState<NodeJS.Timeout | null>(null);
 



  const toggleCode = () => {
    dispatch(toggleCodeView());
    setTabIndex(showCode ? 0 : 1);
  };


  useEffect(() => {
    const handleBeforeUnload = () => {
      navigator.sendBeacon(`${basePath}/student/beacon`);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup the event listener when the component unmounts
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []); // Only re-run the effect if elapsedTime change

  useEffect(() => {
    // Start a timer when the page is viewed
    const timer = setTimeout(() => {
      console.log("User has been on the page for more than 1 second");
    }, 1000); // 1 second

    setPageTimer(timer);

    // Cleanup the timer if the user navigates away
    return () => {
      clearTimeout(timer); // Use the timer directly instead of pageTimer state
    };
  }, [selectedPdfId, selectedPdfPage]); // Removed pageTimer from dependencies to prevent infinite loop


  // save the lastest dialog between user and assistent as interaction
  useEffect(() => {
    const lastPrompt = chatMessages[chatMessages.length - 2];
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (
      lastMessage &&
      typeof lastMessage.content !== "undefined" &&
      lastPrompt &&
      lastMessage.content !== "..." &&
      lastMessage.streaming === "stop"
    ) {
      console.log("The new prompt content:", lastPrompt.content);
      console.log("The new response content:", lastMessage.content);

      // saveInteraction({
      //   type: "frontend-interaction-chat",
      //   context: {
      //     uniqueID: lastMessage.uniqueId,
      //     content: {
      //       prompt: lastPrompt.content,
      //       answer: lastMessage.content,
      //     },
      //     engineChoice: engineChoice,
      //   },
      //   pdfId: selectedPdfId,
      //   pdfPage: selectedPdfPage,
      //   pdfMaterialType: selectedPDFMaterialType,
      // });
    }
  }, [
    chatMessages,
    selectedPdfId,
    selectedPDFMaterialType,
    // saveInteraction,
    // selectedPdfPage,
    engineChoice,
  ]);

  const handleSendRetryMessage = async (message: ChatMessage) => {
    // remove last two messages from chatmessages
    console.log("retrying message", message);
    // find the index of message that needs to be retried, remove it and previous message
    const index = chatMessages.findIndex(
      (msg) => msg.uniqueId === message.uniqueId
    );
    console.log("index", index);
    // find the element before the message that needs to be retried
    const previousElement = chatMessages[index - 1];
    if (index === -1 || !previousElement) return;
    setChatMessages((prevMessages) =>
      prevMessages.filter((_, i) => i !== index && i !== index - 1)
    );
    console.log("retrying message", previousElement.content);
    handleSendMessage(previousElement.content);
  };

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const makeLLMAPICall = (promptMessage: string, chatSummary: string, type: 'pdf' = 'pdf') => {
    const payload: any = {
      prompt: promptMessage,
      chatSummary: chatSummary,
      type: type,
      engineChoice: engineChoice || "openai",
    };

    if (type === 'pdf') {
      console.log("Sending page number", (selectedPdfPage || 0) + 1);
      payload.studentContext = {
        classId: selectedClass?.classID,
        pdfId: selectedPdfId,
        pageNumber: (selectedPdfPage || 0) + 1,
        materialType: selectedPDFMaterialType,
      };
    }

    startChat(payload);
  };

  const startChat = (payload: any) => {
    setBotAnswering(true);
    const url = `${basePath}/student/chat`;
    const token = localStorage.getItem("authToken");

    if (!token) {
      setSnackbarOpen(true);
      setSnackbarMessage("No token found, please login again");
      return;
    }
    console.log("payload", payload);
    return new Promise((resolve, reject) => {
      const makeRequest = (token: string) => {
        const abort = new AbortController();
        fetchEventSource(url, {
          method: "POST",
          signal: abort.signal,
          headers: {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          openWhenHidden: true,
          body: JSON.stringify(payload),
          credentials: "include",
          onopen(response) {
            return new Promise((resolve, reject) => {
              if (response.ok && response.status === 200) {
                console.log("Connection opened!");
                setSnackbarOpen(true);
                setSnackbarMessage("Connected to Kiwi");
                resolve();
              } else if (response.status === 401) {
                // Try to get the key again via refresh token
                setSnackbarOpen(true);
                setSnackbarMessage("Token expired, refreshing...");
                const failRefresh = () => {
                  localStorage.removeItem("authToken");
                  localStorage.removeItem("authUser");
                  abort.abort();
                  if (!window.location.href.includes("/login")) {
                    window.location.href = "/login?sessionExpired=true";
                  }
                  reject(new Error("Failed to refresh token"));
                };
                apiClient
                  .authControllerRefreshAccessToken()
                  .then((accessTokenResponse) => {
                    if (accessTokenResponse.accessToken) {
                      localStorage.setItem(
                        "authToken",
                        accessTokenResponse.accessToken
                      );
                      setSnackbarMessage("Token refreshed, retrying...");
                      abort.abort();
                      makeRequest(accessTokenResponse.accessToken); // Retry with the new token
                      reject(new Error("Request superseded after token refresh"));
                      return;
                    }
                    failRefresh();
                  })
                  .catch(failRefresh);
              } else if (
                response.status >= 400 &&
                response.status < 500 &&
                response.status !== 429 &&
                response.status !== 403
              ) {
                setSnackbarOpen(true);
                console.log("Client side error, stop the request");
                setSnackbarMessage(`An error occurred: ${response.statusText}`);
                reject(new Error("Client side error, stop the request"));
              } else {
                if (response.status === 429) {
                  setSnackbarOpen(true);
                  setSnackbarMessage("You are out of tokens.");
                }
                if (response.status === 403) {
                  setSnackbarOpen(true);
                  setSnackbarMessage(
                    "You are not allowed to use this feature."
                  );
                }
                resolve(); // resolve even if there's no specific action to take
              }
            });
          },
          onmessage(event) {
            // console.log("event", event);
            try {
              if (event.data) {
                const parsedData = JSON.parse(event.data);

                // Check for OAuth requirement first
                if (parsedData.data?.oauthRequired) {
                  const {
                    serverId,
                    serverName,
                    toolName,
                    authorizationUrl,
                    message,
                  } = parsedData.data.oauthRequired;
                  setOAuthRequired({
                    serverId,
                    serverName,
                    toolName,
                    authorizationUrl,
                    message,
                  });
                  // Update the last message to show the OAuth requirement message
                  setChatMessages((prevMessages) => {
                    const lastMessage = prevMessages[prevMessages.length - 1];
                    if (lastMessage.uniqueId === loaderIdRef.current) {
                      lastMessage.content = message;
                      lastMessage.typing = false;
                      lastMessage.streaming = "stop";
                      return [...prevMessages];
                    }
                    return prevMessages;
                  });
                  setBotAnswering(false);
                  return; // Don't process as normal message
                }

                const { botResponse, streaming, citations, id } =
                  parsedData.bot;
                setChatMessages((prevMessages) => {
                  const lastMessage = prevMessages[prevMessages.length - 1];
                  // console.log("lastMessage", lastMessage);
                  // Detect tool execution from response content
                  const toolExecution = detectToolExecution(botResponse);
                  // If streaming stopped and there was a tool, mark it complete
                  const finalToolExecution =
                    streaming === "stop" && lastMessage.toolExecution
                      ? { ...lastMessage.toolExecution, status: "complete" as const }
                      : toolExecution;

                  // check if lastMessage is the loader,
                  // change the response of the last message
                  if (
                    lastMessage.uniqueId === loaderIdRef.current ||
                    lastMessage.uniqueId === id
                  ) {
                    lastMessage.uniqueId = id;
                    lastMessage.content = botResponse;
                    lastMessage.streaming = streaming;
                    lastMessage.typing = false;
                    lastMessage.citations = citations;
                    lastMessage.toolExecution = finalToolExecution;
                    return [...prevMessages];
                  } else {
                    return [
                      ...prevMessages,
                      {
                        isAi: true,
                        content: botResponse,
                        streaming: streaming,
                        error: false,
                        toolExecution: finalToolExecution,
                      },
                    ];
                  }
                });

                // // check if the streaming == 'stop' -> show feedback area
                // if (lastMessage.isAi && lastMessage.streaming !== "stop") {
                //     lastMessage.content = botResponse;
                //     lastMessage.streaming = streaming;
                //     return [...prevMessages];
                // } else {
                //     return [
                //         ...prevMessages,
                //         { isAi: true, content: botResponse, streaming: streaming, error: false}
                //     ];
                // }

                if (streaming === "stop") {
                  setBotAnswering(false);
                }
              }
            } catch (error) {
              console.error("Error parsing JSON:", error, event.data);
            }
          },
          onerror(err) {
            console.log("HERE");
            setSnackbarOpen(true);
            setSnackbarMessage("Connection lost. Reconnecting...");
            console.error("Error:", err);
            console.error("Error message", err.message);
            setBotAnswering(false);
            if (err.code === 429) throw new Error("You are out of tokens.");
            if (err.code === 403)
              throw new Error("You are not allowed to use this feature.");
          },
          onclose() {
            console.log("Connection closed by the server");
            setBotAnswering(false);
          },
        });
      };

      try {
        makeRequest(token);
      } catch (error: any) {
        console.log("error at catch", error);
        setSnackbarOpen(true);
        setSnackbarMessage(error.message);
        setBotAnswering(false);
      }
    });
  };

  // Handle OAuth authorization for MCP tools
  const handleStudentAuthorize = () => {
    if (!oAuthRequired) return;

    // Store context for return redirect
    sessionStorage.setItem(
      "mcp_oauth_return",
      JSON.stringify({
        classId: selectedClass?.classID,
        pdfId: selectedPdfId,
      })
    );

    // Backend already provides the authorization URL with PKCE
    window.location.href = oAuthRequired.authorizationUrl;
  };

  interface SummaryRequest {
    role: string;
    content: string;
  }
  // Handle form submission
  const handleSendMessage = async (promptMessage: string) => {
    const newMessage: ChatMessage = {
      isAi: false,
      content: promptMessage,
      error: false,
    };
    setChatMessages((prevMessages) => [...prevMessages, newMessage]);
    // eslint-disable-next-line no-useless-concat
    console.log("student prompt", promptMessage);
    setPrompt("");
    setBotAnswering(true);

    // Simulate the loader
    const loaderId = `loading-${new Date().getTime()}`;
    const loaderMessage: ChatMessage = {
      isAi: true,
      content: "...",
      typing: true,
      uniqueId: loaderId,
      imgURLs: [],
      error: false,
      streaming: "null",
    };
    loaderIdRef.current = loaderId;
    setChatMessages((prevMessages) => [...prevMessages, loaderMessage]);

    console.log("chat messages", chatMessages);
    const summaryProps: SummaryRequest[] = chatMessages.map((msg) => {
      if (msg.isAi) {
        return { role: "assistant", content: msg.content };
      } else {
        return { role: "user", content: msg.content };
      }
    });
    console.log("summaryProps", summaryProps);

    let summary = "";
    try {
      if (summaryProps.length >= 2) {
        const summaryResponse = await apiClient.studentControllerSummary({
          studentSummaryRequest: {
            conversation: summaryProps,
            studentContext: {
              classId: selectedClass?.classID || "",
              pdfId: selectedPdfId || "",
              pageNumber: `${(selectedPdfPage || 0) + 1}`,
              materialType: selectedPDFMaterialType || "",
            },
            engineChoice: engineChoice || "openai",
          },
        });
        summary = summaryResponse.summary;
      }
      console.log("chat length", chatMessages.length);
    } catch (error: any) {
      console.error("Error getting summary:", error);
      setSnackbarOpen(true);
      if (error.status === 429) {
        setSnackbarMessage("You are out of tokens.");
      }
    }

    makeLLMAPICall(promptMessage, summary);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSendMessage(prompt);
  };

  const exportCode = (prompt: string) => {
    setPrompt(prompt);
    setTabIndex(0);
  };

  const importCode = (code: string) => {
    setIDECode(code);
    setTabIndex(1);
  };

  return (
    <Box height="100%">
      <Stack height="100%">
        
        <PanelHeader label={tabIndex === 0 ? "Chat" : "Code"} 
          onCodeToggle={toggleCode}
          isCodeActive={showCode}
        />
        

        {!showCode ? (
        <Box
          role="tabpanel"
          hidden={tabIndex !== 0}
          id="vertical-tabpanel-0"
          aria-labelledby="vertical-tab-0"
          height="100%"
          width="100%"
          overflow="auto"
        >
          <Stack
            useFlexGap
            direction="column"
            justifyContent="space-between"
            height="100%"
          >
            
          
            <Box sx={{ position: "relative", height: "100%", width: "100%" }}>
              <Box sx={{ position: "absolute", height: "100%", width: "100%", top: 0, left: 0, bottom: 0, right: 0, overflow: "scroll" }}>
              
                <ChatMessages
                  chatMessages={chatMessages}
                  handleSendRetryMessage={handleSendRetryMessage}
                  messageEndRef={messageEndRef}
                  importCode={importCode}
                />
              </Box>
            </Box>

            <Divider />

            <Box padding={1}>
              <form ref={formRef} onSubmit={handleSubmit}>
                <Grid container columnSpacing={1} columns={16} direction="row">
                  {qwenEnabled && (
                    <Grid display="flex" justifyContent="center" alignItems="center" size={16}>
                      <FormControl size="small">
                        <InputLabel id="model-select-label">Model</InputLabel>
                        <Select
                          labelId="model-select-label"
                          id="model-select"
                          value={engineChoice}
                          label="Model"
                          sx={{ fontSize: "0.875rem" }}
                          onChange={(e) => {
                            if (e.target.value) {
                              localStorage.setItem(
                                "engineChoice",
                                e.target.value
                              );
                              if (setEngineChoice)
                                setEngineChoice(e.target.value);
                            }
                          }}
                        >
                          <MenuItem value={"openai"}>ChatGPT</MenuItem>
                          <MenuItem value={"qwen"}>Qwen</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}

                  <Grid
                    size={{
                      xs: 15,
                      sm: 13,
                      md: 16
                    }}>
                    <ChatField
                      botAnswering={botAnswering}
                      setPrompt={setPrompt}
                      prompt={prompt}
                      formRef={formRef}
                    />
                  </Grid>
                </Grid>
              </form>
            </Box>
          </Stack>
        </Box>
        ):(
        <Box
          role="tabpanel"
          hidden={tabIndex !== 1}
          id="vertical-tabpanel-1"
          aria-labelledby="vertical-tab-1"
          height="100%"
          width="100%"
          overflow="auto"
        >
          <Box sx={{ px: 2, maxWidth: '100%', mx: 'auto', height: '100%' }}>
            <IDEContext.Provider
              value={{
                IDECode,
                setIDECode,
                IDEOutputCode: IDEOuputCode,
                setIDEOutputCode,
                IDEfileNameState: IDEfileNameState,
                setIDEFileNameState,
                IDEFileBufferState: IDEFileBufferState,
                setIDEFileBufferState,
                IDEModifiedFileBufferState: IDEModifiedFileBufferState,
                setModifiedFileBufferState,
                IDETabs: IDEtabs,
                setIDETabs,
                IDETabvalue,
                setIDETabValue,
              }}
            >
              <CodeInterpreter
                pdfInfo={selectedPdfId || ""}
                handleSendMessage={handleSendMessage}
                Messages={chatMessages}
                exportCode={exportCode}
              />
            </IDEContext.Provider>
          </Box>
        </Box>
        )}
      </Stack>
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

      {/* OAuth Authorization Dialog for MCP Tools */}
      <Dialog open={!!oAuthRequired} onClose={() => setOAuthRequired(null)}>
        <DialogTitle>Authorization Required</DialogTitle>
        <DialogContent>
          <DialogContentText>{oAuthRequired?.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOAuthRequired(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleStudentAuthorize}>
            Connect Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

};
