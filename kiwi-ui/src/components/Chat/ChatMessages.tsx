import { Feedback } from "../Feedback/Feedback.tsx";
import { ReactNode, RefObject, useCallback, useContext, useEffect } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { BlockMath, InlineMath } from "react-katex";

import { Box, Button, ButtonBase, IconButton, Tooltip, Typography } from "@mui/material";
import CopyButton from "../CopyButton/CopyButton.tsx";
import {
  ExitToApp as ExitToAppIcon,
  HighlightOffOutlined as ErrorIcon,
} from "@mui/icons-material";
import { ChatContext } from "../../pages/ClassLayout.tsx";
import React from "react";
import { useDispatch } from "react-redux";
import { toggleCodeView } from "../../redux/codePanelSlice.ts";
import apiClient from "../../utils/api.ts";
import { kiwiPrism } from "../../theme/codeThemes.ts";
import { useColorMode } from "../../theme/useColorMode.ts";
import KiwiLogo from "../Brand/KiwiLogo.tsx";
import ToolStatusIndicator, { getDisplayName } from "./ToolStatusIndicator.tsx";
import AgentStepChain, { agentStepOf, stepLabel, type AgentStep } from "./AgentStepChain.tsx";
import KiwiStatusLine from "./statusLine/KiwiStatusLine.tsx";
import { STREAM_LABEL, stepLabelFor, waitVerbFor } from "./statusLine/words.ts";
import { toolbarButtonSx } from "./toolbarButton.ts";

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

/**
 * The status line of the turn in flight (the companion v2 decision): it sits in
 * the newest tutor row's toolbar row from the send until the answer is complete
 * and its flight has ended, when ChatCore drops it.
 */
export interface StatusLineState {
  /** The turn the line belongs to. */
  turn: number;
  /** The turn's clock origin, `performance.now()` at the send. */
  startedAt: number;
  /** The n-th answer of this chat (1-based), which picks the wait verb. */
  answerNumber: number;
  /** The answer completed: the line flies, fades and leaves. */
  complete: boolean;
}

const WELCOME = "Ask about your class materials or your code.";

/** Whether more than half of a block's non-space characters are CJK, so it reads at the CJK leading and upright emphasis. */
const CJK_CHARACTER = /[⺀-⿟　-ヿ㐀-䶿一-鿿가-힯豈-﫿＀-￯]/g;
export const isCjkDominant = (text: string): boolean => {
  const characters = text.replace(/\s/g, "");
  if (!characters) return false;
  return (characters.match(CJK_CHARACTER)?.length ?? 0) / characters.length > 0.5;
};

type HastNode = { type?: string; value?: string; tagName?: string; children?: HastNode[]; properties?: { className?: unknown } };
const hastText = (node?: HastNode): string =>
  !node ? "" : node.type === "text" ? node.value ?? "" : (node.children ?? []).map(hastText).join("");

interface ImportCodeButtonProps {
  code: string;
  importCode: (code: string) => void;
}

const ImportCodeButton: React.FC<ImportCodeButtonProps> = ({ code, importCode }) => {
  const dispatch = useDispatch();

  const handleImport = useCallback(() => {
    importCode(code);
    dispatch(toggleCodeView()); // Call the toggle function to open the code panel
  }, [code, importCode, dispatch]);

  return (
    <Tooltip title="Import to scratchpad">
      <IconButton aria-label="Import to scratchpad" onClick={handleImport} sx={toolbarButtonSx}>
        <ExitToAppIcon />
      </IconButton>
    </Tooltip>
  );
};

/** A code block: a 2 px rule on its left, no box, with its two actions floated at the top right. */
const CodeBlock: React.FC<{ code: string; language: string; importCode: (code: string) => void }> = ({
  code,
  language,
  importCode,
}) => {
  const colorMode = useColorMode();
  return (
    <Box
      className="kiwi-code-block"
      sx={{
        borderLeft: "var(--tutor-message-code-rule-width) solid var(--tutor-message-code-rule)",
        pl: "var(--space-3)",
        color: "var(--tutor-message-code)",
      }}
    >
      <Box role="group" aria-label="Code actions" sx={{ float: "right", display: "flex", gap: "2px", ml: "var(--space-2)" }}>
        <ImportCodeButton code={code} importCode={importCode} />
        <CopyButton>{code}</CopyButton>
      </Box>
      <SyntaxHighlighter
        language={language}
        style={kiwiPrism(colorMode)}
        PreTag="div"
        wrapLongLines
        customStyle={{ margin: 0, padding: 0, background: "transparent" }}
        codeTagProps={{
          style: {
            fontFamily: "var(--font-mono)",
            fontSize: "var(--type-code-size)",
            lineHeight: "var(--type-code-leading)",
            whiteSpace: "pre-wrap",
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </Box>
  );
};

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

/** The reading surface's prose rules: blocks 12 px apart, links underlined, inline code on its tonal step, bare display math. */
const proseSx = {
  overflowWrap: "anywhere",
  // WHY :where(): the reset adds no specificity, so the block gap below still wins.
  // A plain `& p { margin: 0 }` (0,1,1) beat `& > * + *` (0,1,0) and the blocks touched.
  "& :where(p, ul, ol)": { m: 0 },
  "& :where(ul, ol)": { pl: "var(--space-5)" },
  "& > * + *": { mt: "var(--tutor-message-block-gap)" },
  "& li + li": { mt: "var(--space-1)" },
  "& a": {
    color: "var(--tutor-message-link)",
    textDecoration: "underline",
    textDecorationThickness: "var(--border-width-underline)",
    textUnderlineOffset: "2px",
  },
  "& a:hover": { textDecorationThickness: "var(--border-width-underline-hover)" },
  "& :not(pre) > code": {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--type-code-size)",
    backgroundColor: "var(--tutor-message-inline-code-bg)",
    borderRadius: "var(--radius-small)",
    padding: "0 4px",
  },
  // The highlighter wraps a block's code in a div, not a pre, so the inline rule above
  // matched it and drew a tinted band behind every line; a block's code is on the
  // transparent ground (DESIGN.md, the tutor-message surface: code blocks).
  "& .kiwi-code-block code": { backgroundColor: "transparent", borderRadius: 0, padding: 0 },
  "& .katex-display": { m: 0, textAlign: "center", overflowX: "auto", overflowY: "hidden" },
  "& .katex-display > .katex": { fontSize: "var(--text-lg)" },
} as const;

const renderText = (
  text: string,
  importCode: (code: string) => void,
  toolExecution?: { toolName: string; status: "running" | "complete" }
) => {
  // Extract any tool info from the text
  const { toolName: extractedTool, cleanedText } = extractToolInfo(text);

  // Determine the tool to display (prefer passed toolExecution, fallback to extracted)
  const toolToShow = toolExecution || (extractedTool ? { toolName: extractedTool, status: "running" as const } : null);

  return (
    <>
      {toolToShow && (
        <ToolStatusIndicator
          toolName={toolToShow.toolName}
          status={toolToShow.status}
        />
      )}
      {cleanedText && (
        <Box className="kiwi-answer" sx={proseSx}>
          <Markdown
            children={cleanedText}
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              p({ children, node }) {
                const cjk = isCjkDominant(hastText(node as HastNode));
                return (
                  <p
                    data-script={cjk ? "cjk" : undefined}
                    lang={cjk ? "zh-Hans" : undefined}
                    style={cjk ? { lineHeight: "var(--leading-base-cjk)", maxWidth: "var(--tutor-message-measure-cjk)" } : undefined}
                  >
                    {children}
                  </p>
                );
              },
              pre({ node }) {
                const codeNode = (node as HastNode | undefined)?.children?.find((child) => child.tagName === "code");
                const className = codeNode?.properties?.className;
                const classes = Array.isArray(className) ? className.map(String) : [];
                const language = /language-(\w+)/.exec(classes.join(" "))?.[1] ?? "text";
                const code = hastText(codeNode).replace(/\n$/, "");
                if (language === "latex") {
                  const math = code.trim();
                  return math.startsWith("$") && math.endsWith("$") ? (
                    <InlineMath math={math.slice(1, -1)} />
                  ) : (
                    <BlockMath math={code} />
                  );
                }
                return <CodeBlock code={code} language={language} importCode={importCode} />;
              },
            }}
          />
        </Box>
      )}
    </>
  );
};

interface RetryProps {
  handleSendRetryMessage: (message: ChatMessage) => void;
  message: ChatMessage;
}

/** An error row: the cross icon, what happened and how to retry, on the error surface, with a secondary Retry. */
const ErrorRow: React.FC<RetryProps> = ({ handleSendRetryMessage, message }) => (
  <Box
    role="alert"
    className="retry"
    sx={{
      display: "flex",
      gap: "var(--space-3)",
      p: "var(--space-3)",
      borderRadius: "var(--radius-control)",
      bgcolor: "var(--tutor-message-error-fill)",
      color: "var(--tutor-message-error-text)",
      fontSize: "var(--text-sm)",
      lineHeight: "var(--leading-sm)",
    }}
  >
    <ErrorIcon aria-hidden sx={{ fontSize: "var(--alert-icon-size)", color: "var(--tutor-message-error-icon)", flexShrink: 0 }} />
    <Box sx={{ minWidth: 0 }}>
      <Box>{message.content || "Kiwi couldn't answer. The server didn't respond as expected. Try again."}</Box>
      <Button variant="outlined" onClick={() => handleSendRetryMessage(message)} sx={{ mt: "var(--space-2)" }}>
        Retry
      </Button>
    </Box>
  </Box>
);

interface RenderOptions {
  handleSendRetryMessage: (message: ChatMessage) => void;
  importCode: (code: string) => void;
  getPdfById: (pdfId: string) => Promise<any>;
  context: React.ContextType<typeof ChatContext>;
  statusLine?: StatusLineState | null;
  motion: boolean;
  onStatusLineGone?: (turn: number) => void;
}

/** The words of the line for the turn's newest row: a running step, the tool in use, the streaming text, or the wait verb. */
const lineLabelFor = (message: ChatMessage, steps: AgentStep[], answerNumber: number) => {
  const running = steps.find((step) => step.status === "running");
  if (running) return stepLabelFor(stepLabel(running.toolName));
  const { toolName, cleanedText } = message.typing
    ? { toolName: null, cleanedText: "" }
    : extractToolInfo(message.content || "");
  const tool = message.toolExecution?.status === "running" ? message.toolExecution.toolName : toolName;
  if (tool && !cleanedText) return `Using ${getDisplayName(tool)}…`;
  if (cleanedText) return STREAM_LABEL;
  return waitVerbFor(answerNumber);
};

const renderChatMessages = (chatMessages: ChatMessage[], options: RenderOptions) => {
  const { handleSendRetryMessage, importCode, getPdfById, context, statusLine, motion, onStatusLineGone } = options;
  let lastAiIndex = -1;
  chatMessages.forEach((message, index) => {
    if (message.isAi) lastAiIndex = index;
  });

  const renderCitations = (message: ChatMessage) => {
    const jumpToPage = (page: number) => context.pdfNavigationRef?.current?.(page);
    const { setCurrentPDFID, currentPDFID, setPdfContent } = context;
    if (!message.citations?.length) return null;
    return [...message.citations]
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((citation, idx) => (
        <ButtonBase
          key={idx}
          className="cite"
          onClick={async () => {
            if (currentPDFID && setCurrentPDFID && setPdfContent && citation.pdfID !== currentPDFID) {
              setCurrentPDFID(citation.pdfID);
              setPdfContent("");
              const pdf = await getPdfById(citation.pdfID);
              setPdfContent(pdf.documentContent);
              setTimeout(() => {
                if (jumpToPage) jumpToPage(citation.pageNumber - 1);
              }, 300);
            } else if (jumpToPage) {
              jumpToPage(citation.pageNumber - 1);
            }
          }}
          sx={{
            position: "relative",
            fontSize: "var(--text-xs)",
            lineHeight: "var(--tutor-message-toolbar-line)",
            fontVariantNumeric: "tabular-nums",
            color: "var(--tutor-message-citation)",
            textDecoration: "underline",
            textUnderlineOffset: "2px",
            "&:hover": { textDecorationThickness: "var(--border-width-underline-hover)" },
            "&::before": {
              content: '""',
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "max(100%, var(--tutor-message-citation-hit))",
              height: "max(100%, var(--tutor-message-citation-hit))",
              transform: "translate(-50%, -50%)",
            },
          }}
        >
          [Page {citation.pageNumber}]
        </ButtonBase>
      ));
  };

  const renderTutorRow = (message: ChatMessage, key: React.Key, leading: ReactNode, steps: AgentStep[], hostsLine: boolean) => {
    const line = hostsLine && statusLine ? statusLine : null;
    const flying = !!line && line.complete;
    // The line owns this row through the flight and fade. Mount the controls
    // only after onGone removes it, so they cannot flash during the handover.
    const showToolbar = !message.typing && !line;
    const citations = showToolbar ? renderCitations(message) : null;
    const feedback = showToolbar && message.uniqueId ? <Feedback index={message.uniqueId} /> : null;

    return (
      <Box key={key} className="tutor-row" sx={{ maxWidth: "var(--tutor-message-measure)" }}>
        {leading}
        {message.typing ? null : renderText(message.content, importCode, message.toolExecution)}
        {line || citations || feedback ? (
          <Box
            sx={{
              position: "relative",
              display: "flex",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "var(--space-2)",
              minHeight: "var(--tutor-message-toolbar-line)",
              mt: message.typing && !leading ? 0 : "var(--tutor-message-block-gap)",
              color: "var(--text-secondary)",
            }}
          >
            {line ? (
              <KiwiStatusLine
                key={line.turn}
                label={flying ? "" : lineLabelFor(message, steps, line.answerNumber)}
                complete={line.complete}
                startedAt={line.startedAt}
                motion={motion}
                onGone={() => onStatusLineGone?.(line.turn)}
              />
            ) : null}
            {/* The feedback buttons open the row (the user's decision of 2026-10-19).
                Kiwi flies off from that spot, so they wait for it, as the citations do. */}
            {feedback}
            {citations}
          </Box>
        ) : null}
      </Box>
    );
  };

  const renderOne = (message: ChatMessage, index: number, leading?: ReactNode, steps: AgentStep[] = [], hostsLine = false) => {
    if (message.error) {
      return (
        <Box key={index} id={message.uniqueId || undefined} sx={{ maxWidth: "var(--tutor-message-measure)" }}>
          <ErrorRow handleSendRetryMessage={handleSendRetryMessage} message={message} />
        </Box>
      );
    }

    if (message.isAi) return renderTutorRow(message, index, leading, steps, hostsLine);

    // The student's question: right-aligned and a step larger, in a bubble (the
    // user's decision of 2026-10-19); Kiwi's answers stay on the sheet without one.
    const cjk = /[㐀-鿿]/.test(message.content);
    return (
      <Box
        key={index}
        className="user-row"
        sx={{
          alignSelf: "flex-end",
          maxWidth: "min(85%, var(--tutor-message-measure))",
          px: "var(--space-3)",
          py: "var(--space-2)",
          borderRadius: "var(--radius-sheet)",
          // WHY: there is no bubble token yet. surface-active (neutral 4 light,
          // 5 dark) clears the panel sheet by 1.16:1 and 1.23:1; surface-hover
          // fades to 1.11:1 in dark.
          bgcolor: "var(--surface-active)",
          overflowWrap: "anywhere",
          fontSize: "var(--text-lg)",
          lineHeight: cjk ? "var(--leading-lg-cjk)" : "var(--leading-lg)",
          color: "var(--text)",
          "& p": { lineHeight: "inherit" },
        }}
      >
        {renderText(message.content, importCode, message.toolExecution)}
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
      // chain on top, answer underneath.
      const steps = message.agentSteps ?? [];
      nodes.push(renderOne(message, i, steps.length ? chainFor(steps, i) : undefined, steps, i === lastAiIndex));
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
    const loaderIndex = running ? i : -1;
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
      nodes.push(renderOne(answer, i, chain, bubbleSteps, i === lastAiIndex));
      i += 1;
    } else {
      // The chain alone: a turn still working through its steps.
      const host = running ? (chatMessages[loaderIndex] as ChatMessage) : chatMessages[i - 1];
      const hostsLine = lastAiIndex >= startIndex && lastAiIndex < i;
      nodes.push(
        renderTutorRow({ ...host, typing: true }, `agent-chain-row-${startIndex}`, chain, bubbleSteps, hostsLine)
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
  /** The status line of the turn in flight, if any. */
  statusLine?: StatusLineState | null;
  /** Every motion level allows Kiwi to move. */
  motion?: boolean;
  /** Called when the status line has gone after its turn completed. */
  onStatusLineGone?: (turn: number) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  chatMessages,
  handleSendRetryMessage,
  messageEndRef,
  importCode,
  statusLine = null,
  motion = false,
  onStatusLineGone,
}) => {
  const context = useContext(ChatContext);
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

  return (
    <Box
      data-density="comfortable"
      className="kiwi-ruled"
      sx={{
        minHeight: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "var(--tutor-message-message-gap)",
        p: { xs: "var(--space-5) var(--space-4) var(--space-5) var(--space-3)", sm: "var(--space-5) var(--space-4) var(--space-5) var(--space-reading-gutter)" },
        color: "var(--tutor-message-text)",
        fontSize: "var(--type-body-size)",
        lineHeight: "var(--type-body-leading)",
      }}
    >
      {chatMessages.length === 0 ? (
        <Box className="welcome">
          <KiwiLogo size="var(--companion-slot-inline)" />
          <Typography sx={{ mt: "var(--space-5)" }}>{WELCOME}</Typography>
        </Box>
      ) : (
        <Typography className="welcome">{WELCOME}</Typography>
      )}
      {renderChatMessages(chatMessages, {
        handleSendRetryMessage,
        importCode,
        getPdfById,
        context,
        statusLine,
        motion,
        onStatusLineGone,
      })}
      <Box ref={messageEndRef} />
    </Box>
  );
};

export default ChatMessages;
