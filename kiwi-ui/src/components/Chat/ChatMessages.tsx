import Loader from "../Loader/Loader.tsx";
import { Feedback } from "../Feedback/Feedback.tsx";
import {
  ReactNode,
  RefObject,
  createElement,
  useCallback,
  useContext,
  useEffect,
} from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { BlockMath, InlineMath } from "react-katex";

import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardHeader,
  Grid,
  Paper,
  Stack,
  // Tooltip,
  Typography,
  // useTheme,
} from "@mui/material";
import CopyButton from "../CopyButton/CopyButton.tsx";
import { renderToString } from "react-dom/server";
import {
  ExitToApp as ExitToAppIcon,
  Android as AndroidIcon,
  Replay as ReplayIcon,
  Person as PersonIcon,
  SmartToy as SmartToyIcon } from "@mui/icons-material";
import { useAuth, User } from "../../auth/AuthContext.tsx";
import { ChatContext } from "../../pages/ClassLayout.tsx";
import React from "react";
import { useDispatch } from "react-redux";
import { toggleCodeView } from "../../redux/codePanelSlice.ts";
import apiClient from "../../utils/api.ts";
import ToolStatusIndicator from "./ToolStatusIndicator.tsx";
import AgentStepChain, { agentStepOf, type AgentStep } from "./AgentStepChain.tsx";

export interface ChatMessage {
  isAi: boolean;
  content: string;
  typing?: boolean;
  uniqueId?: string;
  imgURLs?: string[];
  comment?: string;
  streaming?: string;
  citations?: {
    pdfID: string;
    pageNumber: number;
  }[];
  error: boolean;
  toolExecution?: {
    toolName: string;
    status: "running" | "complete";
  };
  /**
   * Tool steps taken on the way to THIS message, accumulated by ChatCore.
   *
   * The backend narrates a tool call by appending "Using <tool>..." to the bubble
   * it is streaming, then overwrites that same bubble with the answer — so the
   * narration is transient and a server-side tool would flash a step and lose it.
   * The final frame also drops the text the agent produced before calling the
   * tool, so its reasoning is only recoverable if captured as it streams.
   */
  agentSteps?: AgentStep[];
}

interface ImportCodeButtonProps {
  children: ReactNode | ReactNode[];
  importCode: (code: string) => void;
}

const ImportCodeButton: React.FC<ImportCodeButtonProps> = ({
  children,
  importCode,
}) => {
  const dispatch = useDispatch();

  const handleImport = useCallback(
    (reactChildren: ReactNode | ReactNode[]) => {
      const textString = renderToString(
        createElement("div", null, reactChildren)
      );
      const tempElement = document.createElement("div");
      tempElement.innerHTML = textString;
      const unencodedText = tempElement.textContent || "";

      importCode(unencodedText);
      dispatch(toggleCodeView()); // Call the toggle function to open the code panel
    },
    [importCode, dispatch]
  );

  return (
    <Button
      variant="contained"
      startIcon={<ExitToAppIcon />}
      onClick={() => handleImport(children)}
    >
      Import to Scratchpad
    </Button>
  );
};

// const RAGIcon = () => (
//   <Stack
//     direction="row"
//     alignItems="center"
//     justifyContent="center"
//     position="relative"
//   >
//     <CropFreeIcon />
//     <ShortTextIcon sx={{ fontSize: "0.9em", position: "absolute" }} />
//   </Stack>
// );

// const CodeInterpreterIcon = () => (
//     <Stack
//       direction="row"
//       alignItems="center"
//       justifyContent="center"
//       position="relative"
//     >
//       <CropFreeIcon />
//     <CodeIcon sx={{ fontSize: "0.9em", position: "absolute" }} />
//     </Stack>
//   );

// Extract tool name from content and return cleaned content
const extractToolInfo = (
  text: string
): { toolName: string | null; cleanedText: string } => {
  // Match patterns like "Using [ToolName]..." or "# Using [ToolName] Tool:"
  const toolPatterns = [
    /^Using\s+([^.]+)\.\.\.\n*/i,
    /^#\s*Using\s+([^:]+?)(?:\s+Tool)?:\s*\n*/i,
  ];

  for (const pattern of toolPatterns) {
    const match = text.match(pattern);
    if (match) {
      const toolName = match[1].trim();
      const cleanedText = text.replace(pattern, "").trim();
      return { toolName, cleanedText };
    }
  }

  return { toolName: null, cleanedText: text };
};

const renderText = (
  text: string,
  importCode: (code: string) => void,
  toolExecution?: { toolName: string; status: "running" | "complete" }
) => {
  // Extract any tool info from the text
  const { toolName: extractedTool, cleanedText } = extractToolInfo(text);

  // Determine the tool to display (prefer passed toolExecution, fallback to extracted)
  const toolToShow = toolExecution || (extractedTool ? { toolName: extractedTool, status: "running" as const } : null);

  // Use cleaned text for rendering
  const displayText = cleanedText;

  return (
    <>
      {toolToShow && (
        <ToolStatusIndicator
          toolName={toolToShow.toolName}
          status={toolToShow.status}
        />
      )}
      {displayText && (
    <Typography component="div" sx={{ fontSize: "0.875rem" }}>
      <Markdown
        children={displayText}
remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Override paragraph rendering to remove extra vertical space
          p({ children, ...props }) {
            return (
              <p style={{ margin: 0, padding: 0, lineHeight: 1.618 }} {...props}>
                {children}
              </p>
            );
          },
          code(props) {
            const { children, className, ...rest } = props;
            const { node, ref, ...cleanRest } = rest;
            const match = /language-(\w+)/.exec(className || "");
if (match?.[1] === 'latex') {
              // Render block LaTeX
              if (typeof children === 'string') {
                if (children.trim().startsWith('$') && children.trim().endsWith('$')) {
                  return <InlineMath math={children.trim().slice(1, -1)} />;
                }
                return <BlockMath math={children} />;
              }
            }
            return match ? (
              <Card>
                <CardHeader
                  title={match[1] || ""}
                  action={
                    <ButtonGroup variant="contained" aria-label="Basic button group">
                      <ImportCodeButton importCode={importCode}>
                        {children}
                      </ImportCodeButton>
                      <CopyButton>{children}</CopyButton>
                    </ButtonGroup>
                  }
                />
                <SyntaxHighlighter
                  {...cleanRest}
                  PreTag="div"
                  children={String(children).replace(/\n$/, "")}
                  language={match[1]}
                  style={tomorrow}
                />
              </Card>
            ) : (
              <code {...cleanRest} className={className}>
                {children}
              </code>
            );
          },
        }}
      />
    </Typography>
      )}
    </>
  );
};


interface RetryProps {
  handleSendRetryMessage: (message: ChatMessage) => void;
  message: ChatMessage;
}

const Retry: React.FC<RetryProps> = ({ handleSendRetryMessage, message }) => (
  <Box className="retry">
    <Grid container alignItems="flex-start" margin="1em 0">
      <Grid size="grow">
        <Typography>
          {message.content || "Something went wrong. Please try again."}
        </Typography>
      </Grid>
      <Grid size="grow">
        <Button
          variant="contained"
          onClick={() => handleSendRetryMessage(message)}
          startIcon={<ReplayIcon />}
        >
          Retry
        </Button>
      </Grid>
    </Grid>
  </Box>
);

/** The assistant's 32px avatar — shared by message rows and the step chain. */
const BotAvatar: React.FC = () => (
  <Box
    sx={{
      width: 32,
      height: 32,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "primary.main",
      borderRadius: "50%",
    }}
  >
    <SmartToyIcon sx={{ color: "white", fontSize: 20 }} />
  </Box>
);

const renderChatMessages = (
  chatMessages: ChatMessage[],
  handleSendRetryMessage: (message: ChatMessage) => void,
  messageEndRef: RefObject<HTMLDivElement>,
  importCode: (code: string) => void,
  getPdfById: (pdfId: string) => Promise<any>,
  context: React.ContextType<typeof ChatContext>, // Add context as a parameter
  user: User | null // Add user as a parameter
) => {
  const renderOne = (
    message: ChatMessage,
    index: number,
    leading?: React.ReactNode,
  ) => {
    const jumpToPage = context.pageNavigationPluginInstance?.jumpToPage;
    const setCurrentPDFID = context.setCurrentPDFID;
    const currentPDFID = context.currentPDFID;
    const setPdfContent = context.setPdfContent;

    if (message.error) {
      return (
        <Box key={index}>
          <Paper elevation={3}>
            <Grid container alignItems="flex-start">
              <Grid margin="1em 0" padding={1} size={1}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'error.main',
                    borderRadius: '50%',
                  }}
                >
                  <AndroidIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
              </Grid>
              <Grid id={message.uniqueId || undefined} size={11}>
                <Retry handleSendRetryMessage={handleSendRetryMessage} message={message} />
              </Grid>
            </Grid>
            <Box ref={messageEndRef} />
          </Paper>
        </Box>
      );
    }

    // Bot message: aligned to left, no border, transparent background, bot icon
    if (message.isAi) {
      return (
        <Box key={index} display="flex" alignItems="flex-start" mb={1}>
          <Grid container spacing={1} alignItems="flex-start">
            <Grid>
              <BotAvatar />
            </Grid>
            <Grid size="grow">
              <Paper
                elevation={0}
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  p: 1,
                }}
              >
                {leading}
                {message.typing ? <Loader /> : renderText(message.content, importCode, message.toolExecution)}
                {message.citations &&
                  message.citations.length > 0 && (
                    <Box>
                      {message.citations
                        .sort((a, b) => a.pageNumber - b.pageNumber)
                        .map((citation, idx) => (
                          <Button
                            key={idx}
                            variant="text"
                            onClick={async () => {
                              if (
                                currentPDFID &&
                                setCurrentPDFID &&
                                setPdfContent &&
                                citation.pdfID !== currentPDFID
                              ) {
                                setCurrentPDFID(citation.pdfID);
                                setPdfContent("");
                                const pdf = await getPdfById(citation.pdfID);
                                setPdfContent(pdf.documentContent);
                                setTimeout(() => {
                                  if (jumpToPage)
                                    jumpToPage(citation.pageNumber - 1);
                                }, 300);
                              } else {
                                if (jumpToPage) jumpToPage(citation.pageNumber - 1);
                              }
                              console.log(citation.pdfID, citation.pageNumber);
                            }}
                          >
                            {"["}Page {citation.pageNumber}]
                          </Button>
                        ))}
                    </Box>
                  )}
                {!message.typing && message.isAi && message.uniqueId && (
                  <Feedback index={message.uniqueId} />
                )}
              </Paper>
            </Grid>
          </Grid>
          <Box ref={messageEndRef} />
        </Box>
      );
    }

    // User message: aligned to right, with user icon, plain text (no bubble)
    return (
      <Box key={index} display="flex" justifyContent="flex-end" alignItems="flex-start" mb={1}>
        <Grid container spacing={1} alignItems="center" justifyContent="flex-end">
          <Grid size="grow" textAlign="right">
            <Paper
              elevation={0}
              sx={{
                backgroundColor: "transparent",
                border: "none",
                p: 1,
              }}
            >
              {message.typing ? <Loader /> : renderText(message.content, importCode, message.toolExecution)}
              {message.citations &&
                message.citations.length > 0 && (
                  <Box>
                    {message.citations
                      .sort((a, b) => a.pageNumber - b.pageNumber)
                      .map((citation, idx) => (
                        <Button
                          key={idx}
                          variant="text"
                          onClick={async () => {
                            if (
                              currentPDFID &&
                              setCurrentPDFID &&
                              setPdfContent &&
                              citation.pdfID !== currentPDFID
                            ) {
                              setCurrentPDFID(citation.pdfID);
                              setPdfContent("");
                              const pdf = await getPdfById(citation.pdfID);
                              setPdfContent(pdf.documentContent);
                              setTimeout(() => {
                                if (jumpToPage) jumpToPage(citation.pageNumber - 1);
                              }, 300);
                            } else {
                              if (jumpToPage) jumpToPage(citation.pageNumber - 1);
                            }
                            console.log(citation.pdfID, citation.pageNumber);
                          }}
                        >
                          {"["}Page {citation.pageNumber}
                        </Button>
                      ))}
                  </Box>
                )}
            </Paper>
          </Grid>
          <Grid>
            <Box
              sx={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'primary.main',
                borderRadius: '50%',
              }}
            >
              <PersonIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
          </Grid>
        </Grid>
        <Box ref={messageEndRef} />
      </Box>
    );
  };

  const chainFor = (steps: AgentStep[], key: string | number) => (
    <AgentStepChain
      key={`agent-chain-${key}`}
      steps={steps}
      running={steps.some((step) => step.status === "running")}
    />
  );

  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < chatMessages.length) {
    const message = chatMessages[i];

    if (!agentStepOf(message)) {
      // Steps recorded by ChatCore are authoritative and outlive the narration
      // bubble they came from, so a message carrying them renders its own chain:
      // one avatar, chain on top, answer underneath.
      const steps = message.agentSteps ?? [];
      nodes.push(
        steps.length ? renderOne(message, i, chainFor(steps, i)) : renderOne(message, i),
      );
      i += 1;
      continue;
    }

    // A run of narration bubbles — one per browser round-trip, or replayed from
    // stored history where no step record exists.
    const startIndex = i;
    const bubbleSteps: AgentStep[] = [];
    while (i < chatMessages.length) {
      const step = agentStepOf(chatMessages[i]);
      if (!step) break;
      bubbleSteps.push(step);
      i += 1;
    }

    const next = i < chatMessages.length ? chatMessages[i] : undefined;

    // Whatever follows already knows the whole turn — drop these rather than
    // draw the same steps twice.
    if (next?.agentSteps?.length) continue;

    // A loader right after the run is this turn's next step starting, not a
    // bubble of its own.
    const running = !!next?.typing;
    if (running) {
      i += 1;
      bubbleSteps[bubbleSteps.length - 1] = {
        ...bubbleSteps[bubbleSteps.length - 1],
        status: "running",
      };
    }

    const chain = chainFor(bubbleSteps, startIndex);
    const answer = running ? undefined : next;
    const answersThisChain =
      answer && answer.isAi && !answer.error && !answer.typing && !agentStepOf(answer);

    if (answersThisChain) {
      nodes.push(renderOne(answer, i, chain));
      i += 1;
    } else {
      nodes.push(
        <Box
          key={`agent-chain-row-${startIndex}`}
          display="flex"
          alignItems="flex-start"
          mb={1}
        >
          <Grid container spacing={1} alignItems="flex-start">
            <Grid>
              <BotAvatar />
            </Grid>
            <Grid size="grow">
              <Box sx={{ p: 1 }}>{chain}</Box>
            </Grid>
          </Grid>
        </Box>,
      );
    }
  }
  return nodes;
};

interface ChatMessagesProps {
  chatMessages: ChatMessage[];
  handleSendRetryMessage: (message: ChatMessage) => void;
  messageEndRef: RefObject<HTMLDivElement>;
  importCode: (code: string) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  chatMessages,
  handleSendRetryMessage,
  messageEndRef,
  importCode,
}) => {
  const { user } = useAuth(); //  Call hooks at the component level
  const context = useContext(ChatContext); //  Call hooks at the component level
  const pdfCache = React.useRef(new Map<string, any>());

  const getPdfById = React.useCallback(async (pdfId: string) => {
    if (pdfCache.current.has(pdfId)) {
      return pdfCache.current.get(pdfId);
    }

    const res = await apiClient.documentControllerRetrieveDocument({
      chunkRequest: {
        id: pdfId,
      },
    });

    pdfCache.current.set(pdfId, res.document);
    return res.document;
  }, []);

  // Scroll to the last message when messages update
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, messageEndRef]);

  const initialMessages = [
    {
      isAi: true,
      content: "Welcome to Kiwi! How can I help you?",
      //content: "Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?   Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?   Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?   Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you? Welcome to Kiwi! How can I help you?",
      error: false,
    },
  ];

  const allMessages = initialMessages.concat(chatMessages);

  return (
    <Stack padding={1} spacing={1}>
      {renderChatMessages(
        allMessages,
        handleSendRetryMessage,
        messageEndRef,
        importCode,
        getPdfById,
        context, // Pass context as an argument
        user // Pass user as an argument
      )}
    </Stack>
  );
};

export default ChatMessages;
