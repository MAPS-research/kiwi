import { fetchEventSource } from "@microsoft/fetch-event-source";
import AddIcon from "@mui/icons-material/Add";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HistoryIcon from "@mui/icons-material/History";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import React, {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { executeClientAction } from "../../agent/AgentBridge.tsx";
import { useAuth } from "../../auth/AuthContext.tsx";
import type { EnvironmentContextActiveTabEnum } from "../../services/models/EnvironmentContext.ts";
import type { NavigationAction } from "../../services/models/NavigationAction.ts";
import { NavigationActionFromJSON } from "../../services/models/NavigationAction.ts";
import apiClient, { basePath } from "../../utils/api.ts";
import { Experiment, experimentApi } from "../../utils/experimentApi.ts";
import { buildChatContext } from "./chatContext.ts";
import ChatField from "./ChatField.tsx";
import ExperimentCompare from "./ExperimentCompare.tsx";
import { useChatLane } from "./useChatLane.ts";
import type { ChatMessage } from "./ChatMessages.tsx";
import ChatMessages from "./ChatMessages.tsx";
import { foldAgentStep, type AgentStep } from "./AgentStepChain.tsx";

// Detect tool execution from bot response content
const detectToolExecution = (
  content: string
): { toolName: string; status: "running" | "complete" } | undefined => {
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

export interface ChatCoreProps {
  /** Class ID for context */
  classId?: string;
  /** PDF ID for context */
  pdfId?: string;
  /** Current PDF page number */
  pdfPage?: number;
  /** PDF material type */
  pdfMaterialType?: string;
  /** PDF content for context */
  pdfContent?: string;
  /** Chat messages to display (optional - if provided, uses external state) */
  messages?: ChatMessage[];
  /** Callback when messages change (optional - if provided, uses external state) */
  onMessagesChange?: (messages: ChatMessage[]) => void;
  /** Initial prompt to pre-fill the input (e.g., from IDE export) */
  initialPrompt?: string;
  /** Callback when initial prompt is consumed */
  onInitialPromptConsumed?: () => void;
  /** Callback when AI requests navigation (from tool response) */
  onNavigate?: (action: NavigationAction) => void;
  /** Current active tab in the UI for environment context */
  activeTab?: EnvironmentContextActiveTabEnum;
  /** Sub-view within the active tab (e.g. 'code' for the IDE) */
  activeView?: string;
  /** Current URL path */
  currentPath?: string;
  /** Active app slug (when activeTab is 'app') */
  activeAppSlug?: string;
  /** Active app name (when activeTab is 'app') */
  activeAppName?: string;
  /** App context from kiwi:updateContext (when activeTab is 'app') */
  appContext?: string;
  /** Tutoring mode from kiwi:updateContext (e.g. 'guidance' → hints, not answers) */
  appTutoringMode?: string;
  /** Import a code block into the IDE (host provides routing; core has no IDE). */
  onImportCode?: (code: string) => void;
}

/**
 * Core chat component without IDE integration.
 * Can be used standalone in modals or embedded in other components.
 */
export const ChatCore: React.FC<ChatCoreProps> = ({
  classId,
  pdfId,
  pdfPage,
  pdfMaterialType,
  pdfContent,
  messages: externalMessages,
  onMessagesChange,
  initialPrompt,
  onInitialPromptConsumed,
  onNavigate,
  activeTab = 'materials',
  activeView,
  currentPath,
  activeAppSlug,
  activeAppName,
  appContext,
  appTutoringMode,
  onImportCode,
}) => {
  // Session storage key for current conversation
  const SESSION_KEY = 'globalChat_conversationId';

  // Use internal state if no external messages provided
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const chatMessages = externalMessages ?? internalMessages;
  const setChatMessages = onMessagesChange ?? setInternalMessages;

  // Session management
  interface ConversationSummary {
    conversationId: string;
    firstMessage: string;
    timestamp: string;
    messageCount: number;
  }
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    return sessionStorage.getItem(SESSION_KEY);
  });
  const [availableSessions, setAvailableSessions] = useState<ConversationSummary[]>([]);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // For functional updates in async callbacks (avoids stale closure)
  const updateMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    if (onMessagesChange) {
      // External state - can't use functional update, but this is rare
      onMessagesChange(updater(chatMessages));
    } else {
      setInternalMessages(updater);
    }
  };

  // Load available sessions
  const loadAvailableSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await apiClient.studentControllerGetChatHistory({
        limit: 100,
        interactionType: 'frontend-interaction-chat',
      });

      if (response.messages && response.messages.length > 0) {
        // Group by conversationId
        const sessionMap = new Map<string, { messages: typeof response.messages }>();
        response.messages.forEach((msg) => {
          if (!sessionMap.has(msg.conversationId)) {
            sessionMap.set(msg.conversationId, { messages: [] });
          }
          sessionMap.get(msg.conversationId)!.messages.push(msg);
        });

        // Convert to summaries
        const summaries: ConversationSummary[] = Array.from(sessionMap.entries())
          .map(([conversationId, data]) => {
            const sortedMsgs = data.messages.sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            const firstUserMsg = sortedMsgs.find((m) => m.role === 'user');
            return {
              conversationId,
              firstMessage: firstUserMsg?.content.slice(0, 50) || 'New conversation',
              timestamp: sortedMsgs[0]?.timestamp || '',
              messageCount: data.messages.length,
            };
          })
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setAvailableSessions(summaries);
      }
    } catch (err) {
      console.warn('[ChatCore] Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Load messages for a specific conversation
  const loadConversation = async (conversationId: string) => {
    try {
      const response = await apiClient.studentControllerGetChatHistory({
        conversationId,
        limit: 100,
      });

      if (response.messages && response.messages.length > 0) {
        const historicalMessages: ChatMessage[] = response.messages
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .map((msg) => ({
            isAi: msg.role === 'assistant',
            content: msg.content,
            uniqueId: msg.id,
            error: false,
          }));

        setInternalMessages(historicalMessages);
      }

      setCurrentConversationId(conversationId);
      sessionStorage.setItem(SESSION_KEY, conversationId);
      setShowSessionPicker(false);
    } catch (err) {
      console.warn('[ChatCore] Failed to load conversation:', err);
    }
  };

  // Start new conversation
  const startNewConversation = () => {
    setInternalMessages([]);
    setCurrentConversationId(null);
    sessionStorage.removeItem(SESSION_KEY);
    setShowSessionPicker(false);
  };

  // Load current session on mount (only for internal state)
  useEffect(() => {
    if (externalMessages || historyLoaded) return;

    const loadCurrentSession = async () => {
      const savedConversationId = sessionStorage.getItem(SESSION_KEY);

      if (savedConversationId) {
        // Load the saved conversation
        await loadConversation(savedConversationId);
      }
      // If no saved conversation, start fresh (don't auto-load anything)

      setHistoryLoaded(true);
    };

    loadCurrentSession();
  }, [externalMessages, historyLoaded]);

  const [prompt, setPrompt] = useState<string>("");

  // Handle initial prompt from external source (e.g., IDE export code)
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      onInitialPromptConsumed?.();
    }
  }, [initialPrompt, onInitialPromptConsumed]);
  const [botAnswering, setBotAnswering] = useState<boolean>(false);
  const [engineChoice, setEngineChoice] = useState<string>(() => {
    return localStorage.getItem("engineChoice") || "openai";
  });

  const messageEndRef = useRef<HTMLDivElement>(null!);
  const formRef = useRef<HTMLFormElement>(null!);
  const loaderIdRef = useRef("");
  // Last chat payload, so a client-tool round-trip can resume with the same context.
  const lastPayloadRef = useRef<any>(null);
  // The original user goal for the current turn, re-sent on each round-trip so the
  // agent doesn't lose track of what it's working toward across tool steps.
  const agentGoalRef = useRef<string>("");
  // Aborts the in-flight SSE connection before starting the next round-trip (and
  // on unmount), so connections don't leak across the agent loop.
  const sseAbortRef = useRef<AbortController | null>(null);
  // Counts consecutive client-tool round-trips in the current turn, to stop a
  // confused agent from looping forever.
  const roundTripRef = useRef(0);
  const MAX_ROUND_TRIPS = 15;
  // Every client tool run so far in THIS turn, oldest first. The backend rebuilds
  // its message list from scratch on each resume, so this trail is the agent's
  // only memory of its own earlier steps: without it, it forgot the sitemap as
  // soon as it listed classes and looped re-fetching what it already had.
  const toolTrailRef = useRef<
    {
      toolCallId: string;
      tool: string;
      args: Record<string, unknown>;
      result: unknown;
      isError?: boolean;
    }[]
  >([]);
  // Keep the trail bounded — a turn can't outlive MAX_ROUND_TRIPS anyway.
  const MAX_TRAIL_STEPS = 12;
  // The turn's tool steps, in order. Held here rather than read back off the
  // messages because the backend overwrites the narration bubble with the answer:
  // by the time the turn ends, the only record of a server-side tool call is
  // whatever we captured while it streamed.
  const turnStepsRef = useRef<AgentStep[]>([]);

  const recordAgentStep = (botResponse: string, streaming?: string) => {
    turnStepsRef.current = foldAgentStep(turnStepsRef.current, botResponse, streaming);
    return turnStepsRef.current;
  };

  // Abort any in-flight SSE on unmount.
  useEffect(() => {
    return () => sseAbortRef.current?.abort();
  }, []);

  // Check Available Features
  const { user } = useAuth();
  // Qwen engine is available to everyone — no longer gated by the QwenModel flag.
  const qwenEnabled = true;
  const canUseExperimentMode =
    user?.systemRole === "admin" ||
    user?.systemRole === "instructor" ||
    user?.isAdmin === true;
  const [experimentMode, setExperimentMode] = useState(false);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loadingExperiments, setLoadingExperiments] = useState(false);
  const [experimentError, setExperimentError] = useState<string | null>(null);
  const [selectedExperimentId, setSelectedExperimentId] = useState("");
  const [selectedVariantKey, setSelectedVariantKey] = useState("");
  // Side-by-side comparison of two variants answering the same prompts.
  const [compareMode, setCompareMode] = useState(false);
  const [compareVariantKeyA, setCompareVariantKeyA] = useState("");
  const [compareVariantKeyB, setCompareVariantKeyB] = useState("");

  const selectedExperiment =
    experiments.find((experiment) => experiment.id === selectedExperimentId) ??
    null;
  const selectedVariant =
    selectedExperiment?.config.variants.find(
      (variant) => variant.key === selectedVariantKey,
    ) ?? null;
  const experimentVariants = selectedExperiment?.config.variants ?? [];
  const compareVariantA =
    experimentVariants.find((variant) => variant.key === compareVariantKeyA) ??
    null;
  const compareVariantB =
    experimentVariants.find((variant) => variant.key === compareVariantKeyB) ??
    null;
  // Comparison needs two distinct variants to be meaningful.
  const canCompare = experimentVariants.length >= 2;
  const compareActive = Boolean(
    experimentMode &&
      compareMode &&
      selectedExperiment &&
      compareVariantA &&
      compareVariantB,
  );

  // Shared surface context; each lane adds its own experiment override.
  const laneContext = {
    classId,
    pdfId,
    pdfPage,
    pdfMaterialType,
    activeTab,
    activeView,
    currentPath,
    activeAppSlug,
    activeAppName,
    appContext,
    appTutoringMode,
  };
  const laneA = useChatLane({
    ...laneContext,
    enabled: compareActive,
    experimentId: selectedExperiment?.id,
    variantKey: compareVariantA?.key,
  });
  const laneB = useChatLane({
    ...laneContext,
    enabled: compareActive,
    experimentId: selectedExperiment?.id,
    variantKey: compareVariantB?.key,
  });

  useEffect(() => {
    if (!canUseExperimentMode || !experimentMode || !classId) return;
    let ignore = false;
    setLoadingExperiments(true);
    setExperimentError(null);
    experimentApi
      .list(classId)
      .then((items) => {
        if (ignore) return;
        setExperiments(items);
        const firstExperiment =
          items.find((item) => item.status === "active") ?? items[0] ?? null;
        setSelectedExperimentId((current) =>
          current && items.some((item) => item.id === current)
            ? current
            : firstExperiment?.id ?? "",
        );
        setSelectedVariantKey((current) =>
          firstExperiment?.config.variants.some((variant) => variant.key === current)
            ? current
            : firstExperiment?.config.variants[0]?.key ?? "",
        );
      })
      .catch((error: any) => {
        console.warn("[ChatCore] Failed to load experiments:", error);
        if (!ignore) {
          setExperiments([]);
          setExperimentError("Experiments are currently unavailable.");
        }
      })
      .finally(() => {
        if (!ignore) setLoadingExperiments(false);
      });
    return () => {
      ignore = true;
    };
  }, [canUseExperimentMode, classId, experimentMode]);

  useEffect(() => {
    if (!selectedExperiment) {
      setSelectedVariantKey("");
      return;
    }
    if (
      !selectedVariantKey ||
      !selectedExperiment.config.variants.some(
        (variant) => variant.key === selectedVariantKey,
      )
    ) {
      setSelectedVariantKey(selectedExperiment.config.variants[0]?.key ?? "");
    }
  }, [selectedExperiment, selectedVariantKey]);

  // Default the comparison to the experiment's first two variants (usually
  // control vs. treatment) and drop keys that no longer exist after a switch.
  useEffect(() => {
    if (!selectedExperiment) {
      setCompareVariantKeyA("");
      setCompareVariantKeyB("");
      return;
    }
    const variants = selectedExperiment.config.variants;
    const has = (key: string) => variants.some((v) => v.key === key);
    setCompareVariantKeyA((current) =>
      current && has(current) ? current : variants[0]?.key ?? "",
    );
    setCompareVariantKeyB((current) =>
      current && has(current) ? current : variants[1]?.key ?? "",
    );
  }, [selectedExperiment]);

  // OAuth authorization state for MCP tools
  interface OAuthRequiredState {
    serverId: string;
    serverName: string;
    toolName: string;
    authorizationUrl: string;
    message: string;
  }
  const [oAuthRequired, setOAuthRequired] = useState<OAuthRequiredState | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Beacon on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      navigator.sendBeacon(`${basePath}/student/beacon`);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleSendRetryMessage = async (message: ChatMessage) => {
    const index = chatMessages.findIndex(
      (msg) => msg.uniqueId === message.uniqueId
    );
    const previousElement = chatMessages[index - 1];
    if (index === -1 || !previousElement) return;
    setChatMessages(
      chatMessages.filter((_, i) => i !== index && i !== index - 1)
    );
    handleSendMessage(previousElement.content);
  };

  // Build the conversation history sent to the agent. Real user/assistant turns
  // are kept verbatim; runs of transient agent tool-narration bubbles
  // ("Using click...", "I filled X") are collapsed into a single compact
  // "[actions: ...]" summary so the actual back-and-forth (especially the user's
  // request) isn't pushed out of the window by step-by-step narration.
  const buildConversationHistory = (): { role: "user" | "assistant"; content: string }[] => {
    // Narration is a whole-bubble "Using <tool>..." (matching the backend's
    // replay filter) or a SHORT action report. Length-guarded so a genuine
    // answer that happens to start with "Set ..." / "Select ..." isn't
    // misclassified and compacted away.
    const isToolNarration = (c: string) =>
      /^using\s+\w+\.\.\.$/i.test(c) ||
      (c.length < 160 &&
        /^\s*(i('ve| have| will|'ll)?\s+)?(filled|clicked|navigat|observ|select|typed|entered|set )/i.test(
          c,
        ));

    // The backend appends "Using <tool>..." lines onto real streamed content;
    // strip those from mixed bubbles so the actual answer survives in history.
    const stripEmbeddedNarration = (c: string) =>
      c.replace(/(?:^|\n)\s*using\s+\w+\.\.\.\s*(?=\n|$)/gi, "\n").trim();

    const turns = chatMessages
      .filter((m) => !m.typing && m.content && m.content !== "...")
      .map((m) => {
        const content = m.content.trim();
        return {
          role: m.isAi ? ("assistant" as const) : ("user" as const),
          content:
            m.isAi && !isToolNarration(content)
              ? stripEmbeddedNarration(content)
              : content,
        };
      })
      .filter((t) => t.content);

    const out: { role: "user" | "assistant"; content: string }[] = [];
    let pendingActions: string[] = [];
    const flush = () => {
      if (pendingActions.length) {
        out.push({
          role: "assistant",
          content: `[actions taken: ${pendingActions.join("; ")}]`,
        });
        pendingActions = [];
      }
    };
    for (const t of turns) {
      if (t.role === "assistant" && isToolNarration(t.content)) {
        // Compress narration to a short verb phrase (first ~80 chars).
        pendingActions.push(t.content.replace(/\s+/g, " ").slice(0, 80));
      } else {
        flush();
        out.push(t);
      }
    }
    flush();

    // Always keep the FIRST user turn (the goal), plus the most recent context.
    const firstUser = out.find((t) => t.role === "user");
    const recent = out.slice(-10);
    if (firstUser && !recent.includes(firstUser)) {
      return [firstUser, ...recent];
    }
    return recent;
  };

  // Get the current chat thread's conversationId, creating one on first use.
  // All messages in this session share it so backend history groups them into a
  // single conversation (stored as the interaction stringTag).
  const getOrCreateConversationId = (): string => {
    let id = currentConversationId;
    if (!id) {
      id =
        (globalThis.crypto?.randomUUID?.() as string) ||
        `conv-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
      setCurrentConversationId(id);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  };

  const makeLLMAPICall = (promptMessage: string, chatSummary: string) => {
    // Remember the user's goal for this turn so client-tool round-trips can
    // remind the agent what it's working toward.
    agentGoalRef.current = promptMessage;
    const conversation = buildConversationHistory();
    const experimentPreview =
      experimentMode && selectedExperiment && selectedVariant
        ? {
          experimentId: selectedExperiment.id,
          variantKey: selectedVariant.key,
        }
        : undefined;

    // Build v2 request format with unified context (shared with the experiment
    // compare lanes — see chatContext.ts).
    const payload: any = {
      prompt: promptMessage,
      ...(chatSummary && { chatSummary }),
      ...(engineChoice && { engineChoice }),
      conversationId: getOrCreateConversationId(),
      ...(conversation.length > 0 && { conversation }),
      context: buildChatContext({
        classId,
        pdfId,
        pdfPage,
        pdfMaterialType,
        activeTab,
        activeView,
        currentPath,
        activeAppSlug,
        activeAppName,
        appContext,
        appTutoringMode,
        experiment: experimentPreview,
      }),
    };

    startChat(payload);
  };

  // Execute a client tool the agent requested, then resume the agent loop by
  // re-invoking the chat with the tool result. Chains for multi-step UI control.
  const handleClientAction = async (action: {
    toolCallId: string;
    tool: string;
    args: Record<string, unknown>;
    interactionId?: string;
  }) => {
    const result = await executeClientAction(action);

    toolTrailRef.current = [
      ...toolTrailRef.current,
      {
        toolCallId: result.toolCallId,
        tool: result.name,
        args: action.args,
        result: result.result,
        isError: result.isError,
      },
    ].slice(-MAX_TRAIL_STEPS);

    roundTripRef.current += 1;

    // HARD STOP: if the agent has looped past the cap, do NOT resume the loop at
    // all (a soft "please stop" message in the tool result is ignored by weaker
    // models, which keep calling observe forever). Finalize the turn with a
    // user-facing message and abort the SSE connection.
    if (roundTripRef.current >= MAX_ROUND_TRIPS) {
      sseAbortRef.current?.abort();
      setBotAnswering(false);
      updateMessages((prev) => [
        ...prev.filter((m) => !m.typing),
        {
          isAi: true,
          content:
            "I went in circles trying to complete that on the page and stopped to avoid looping. " +
            "I may have filled some fields — please check the form and finish the last step yourself, " +
            "or tell me more specifically what to do.",
          error: false,
        },
      ]);
      roundTripRef.current = 0;
      toolTrailRef.current = [];
      return;
    }

    const basePayload = lastPayloadRef.current ?? {};
    // Resume with a MINIMAL context: keep the environment/current tab AND the app
    // context, but drop the PDF/RAG context. The PDF context pulls the agent back
    // into "answer about the slide" mode and it abandons the UI task; the app
    // context (the embedded Kiwi App's challenge + code) is the SUBJECT of that
    // task, so it must survive every observe/tool round-trip — otherwise the agent
    // goes blind about the app after its first observe (issue #213).
    const resumeContext = {
      environment: {
        ...(basePayload.context?.environment ?? {}),
        // Reflect where the user actually is now (navigation may have moved them).
        ...(currentPath ? { currentPath } : {}),
      },
      // Preserve app context across the round-trip when present.
      ...(basePayload.context?.app && { app: basePayload.context.app }),
      ...(basePayload.context?.experiment
        ? { experiment: basePayload.context.experiment }
        : {}),
    };
    // Replay the conversation (with tool-narration collapsed) so the agent
    // remembers the goal + what it's done across the round-trip. Without it,
    // resume turns are near-blind and the agent gets confused (e.g. treats
    // "token limit" as a question instead of the feature-flag value).
    const conversation = buildConversationHistory();

    const resumePayload = {
      // Re-send the original goal so the agent keeps working toward it across
      // the round-trip instead of forgetting and greeting.
      prompt: agentGoalRef.current || "",
      ...(engineChoice && { engineChoice }),
      ...(currentConversationId && { conversationId: currentConversationId }),
      ...(conversation.length > 0 && { conversation }),
      context: resumeContext,
      clientToolResult: {
        toolCallId: result.toolCallId,
        tool: result.name,
        result: result.result,
        isError: result.isError,
        args: action.args,
        // Reuse the original turn's interaction so the multi-step agent action
        // is stored as a single history entry, not one per tool step.
        interactionId: action.interactionId,
      },
      // The full play-by-play, so the agent still remembers the sitemap it read
      // and the classID it looked up several steps ago. Older results are trimmed
      // to what the backend would keep anyway — they're there to be remembered,
      // not re-read in full (an observe snapshot alone can be tens of KB).
      clientToolTrail: toolTrailRef.current.map((step, index, all) => ({
        ...step,
        result:
          index === all.length - 1
            ? step.result
            : JSON.stringify(step.result ?? null).slice(0, 2000),
      })),
    };

    // Add a fresh loader bubble for the resumed turn so the next streamed
    // response (which carries a new id) has a message to render into. Without
    // this, the resume response has no target bubble and nothing shows.
    const loaderId = `loading-${new Date().getTime()}`;
    loaderIdRef.current = loaderId;
    updateMessages((prev) => [
      ...prev,
      {
        isAi: true,
        content: "...",
        typing: true,
        uniqueId: loaderId,
        imgURLs: [],
        error: false,
        streaming: "null",
        // Without this the chain would blink out for the length of every
        // round-trip: the fresh loader is the last message, and it would carry
        // no record of the steps already taken.
        agentSteps: turnStepsRef.current,
      },
    ]);

    startChat(resumePayload);
  };

  const startChat = (payload: any) => {
    setBotAnswering(true);
    lastPayloadRef.current = payload;
    const url = `${basePath}/student/chat/v2`;
    const token = localStorage.getItem("authToken");

    if (!token) {
      setSnackbarOpen(true);
      setSnackbarMessage("No token found, please login again");
      return;
    }

    // Close any previous SSE connection before opening a new one (prevents the
    // round-trip loop from leaking connections).
    sseAbortRef.current?.abort();

    return new Promise((resolve, reject) => {
      const makeRequest = (token: string) => {
        const abort = new AbortController();
        sseAbortRef.current = abort;
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
                setSnackbarOpen(true);
                setSnackbarMessage("Connected to Kiwi");
                resolve();
              } else if (response.status === 401) {
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
                      // Abort the 401 response before replaying. Resolving this
                      // onopen would make fetch-event-source read and close the
                      // original empty response, marking the shared loader as an
                      // error while the authenticated replay was succeeding.
                      abort.abort();
                      makeRequest(accessTokenResponse.accessToken);
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
                setSnackbarMessage(`An error occurred: ${response.statusText}`);
                reject(new Error("Client side error, stop the request"));
              } else {
                if (response.status === 429) {
                  setSnackbarOpen(true);
                  setSnackbarMessage("You are out of tokens.");
                }
                if (response.status === 403) {
                  setSnackbarOpen(true);
                  setSnackbarMessage("You are not allowed to use this feature.");
                }
                if (response.status >= 500) {
                  setSnackbarOpen(true);
                  setSnackbarMessage(
                    `Server error (${response.status}). Please try again.`
                  );
                }
                resolve();
              }
            });
          },
          onmessage(event) {
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
                  updateMessages((prevMessages) =>
                    prevMessages.map((msg, idx) => {
                      if (idx === prevMessages.length - 1 && msg.uniqueId === loaderIdRef.current) {
                        return {
                          ...msg,
                          content: message,
                          typing: false,
                          streaming: "stop",
                        };
                      }
                      return msg;
                    })
                  );
                  setBotAnswering(false);
                  return;
                }

                // Handle navigation action from AI tool response
                // Check both top-level and nested data.navigation (UnifiedChatResponseData)
                const navigationData = parsedData.data?.navigation || parsedData.navigation;
                if (navigationData && onNavigate) {
                  const action = NavigationActionFromJSON(navigationData);
                  onNavigate(action);
                }

                // Handle a client-tool action (navigate/observe/click/fill).
                // The agent loop paused; execute the tool in the browser, then
                // resume the chat by re-invoking with the tool result. The stream
                // ends here for this turn (no `bot` payload follows).
                // Check both top-level and nested data.clientAction.
                const clientAction =
                  parsedData.clientAction || parsedData.data?.clientAction;
                if (clientAction) {
                  // Finalize the current in-progress assistant bubble (e.g. the
                  // "Using get_sitemap..." narration) so it doesn't hang while the
                  // round-trip resumes with a fresh loader.
                  updateMessages((prevMessages) =>
                    prevMessages.map((msg, idx) => {
                      if (
                        idx === prevMessages.length - 1 &&
                        (msg.uniqueId === loaderIdRef.current || msg.typing)
                      ) {
                        return { ...msg, typing: false, streaming: "stop" };
                      }
                      return msg;
                    })
                  );
                  handleClientAction(clientAction);
                  return;
                }

                // Some events (e.g. the clientAction pause) carry no `bot`
                // payload; guard against destructuring undefined.
                if (!parsedData.bot) {
                  return;
                }

                const { botResponse, streaming, citations, id } = parsedData.bot;
                const toolExecution = detectToolExecution(botResponse);
                const agentSteps = recordAgentStep(botResponse, streaming);

                updateMessages((prevMessages) =>
                  prevMessages.map((msg, idx) => {
                    if (idx === prevMessages.length - 1 && (msg.uniqueId === loaderIdRef.current || msg.uniqueId === id)) {
                      const finalToolExecution =
                        streaming === "stop" && msg.toolExecution
                          ? { ...msg.toolExecution, status: "complete" as const }
                          : toolExecution;
                      return {
                        ...msg,
                        uniqueId: id,
                        content: botResponse,
                        streaming: streaming,
                        typing: false,
                        citations: citations,
                        toolExecution: finalToolExecution,
                        agentSteps,
                      };
                    }
                    return msg;
                  })
                );

                if (streaming === "stop") {
                  setBotAnswering(false);
                }
              }
            } catch (error) {
              console.error("Error parsing JSON:", error, event.data);
            }
          },
          onerror(err) {
            setSnackbarOpen(true);
            setSnackbarMessage("Connection lost. Reconnecting...");
            console.error("Error:", err);
            setBotAnswering(false);
            if (err.code === 429) throw new Error("You are out of tokens.");
            if (err.code === 403) throw new Error("You are not allowed to use this feature.");
          },
          onclose() {
            console.log("Connection closed by the server");
            setBotAnswering(false);
            // If the stream closed before any bot frame arrived (e.g. the
            // request failed server-side), don't leave the "..." loader
            // hanging — turn it into a visible error bubble.
            updateMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.uniqueId === loaderIdRef.current && msg.typing
                  ? {
                      ...msg,
                      typing: false,
                      streaming: "stop",
                      content:
                        "Something went wrong while answering. Please try again.",
                      error: true,
                    }
                  : msg
              )
            );
          },
        });
      };

      try {
        makeRequest(token);
      } catch (error: any) {
        setSnackbarOpen(true);
        setSnackbarMessage(error.message);
        setBotAnswering(false);
      }
    });
  };

  // Handle OAuth authorization for MCP tools
  const handleStudentAuthorize = () => {
    if (!oAuthRequired) return;

    sessionStorage.setItem(
      "mcp_oauth_return",
      JSON.stringify({
        classId: classId,
        pdfId: pdfId,
      })
    );

    window.location.href = oAuthRequired.authorizationUrl;
  };

  interface SummaryRequest {
    role: string;
    content: string;
  }

  const handleSendMessage = async (promptMessage: string) => {
    // Fresh user turn: reset the per-turn round-trip counter, tool trail and steps.
    roundTripRef.current = 0;
    toolTrailRef.current = [];
    turnStepsRef.current = [];
    const newMessage: ChatMessage = {
      isAi: false,
      content: promptMessage,
      error: false,
    };
    setChatMessages([...chatMessages, newMessage]);
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
    setChatMessages([...chatMessages, newMessage, loaderMessage]);

    const summaryProps: SummaryRequest[] = chatMessages.map((msg) => {
      if (msg.isAi) {
        return { role: "assistant", content: msg.content };
      } else {
        return { role: "user", content: msg.content };
      }
    });

    let summary = "";
    try {
      if (summaryProps.length >= 2) {
        const summaryResponse = await apiClient.studentControllerSummary({
          studentSummaryRequest: {
            conversation: summaryProps,
            studentContext: {
              classId: classId || "",
              pdfId: pdfId || "",
              pageNumber: `${(pdfPage || 0) + 1}`,
              materialType: pdfMaterialType || "",
            },
            engineChoice: engineChoice || "openai",
          },
        });
        summary = summaryResponse.summary;
      }
    } catch (error: any) {
      console.error("Error getting summary:", error);
      setSnackbarOpen(true);
      if (error.status === 429) {
        setSnackbarMessage("You are out of tokens.");
      }
    }

    makeLLMAPICall(promptMessage, summary);
  };

  // Fan one prompt out to both comparison lanes. They stream independently, so
  // the columns fill in at their own pace.
  const handleSendCompareMessage = (promptMessage: string) => {
    if (!promptMessage.trim()) return;
    setPrompt("");
    laneA.send(promptMessage);
    laneB.send(promptMessage);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (compareActive) {
      handleSendCompareMessage(prompt);
      return;
    }
    handleSendMessage(prompt);
  };

  // Import a code block into the IDE. ChatCore itself has no IDE (it's a separate
  // route), so it delegates to the host via onImportCode, which navigates to the
  // Code tab and hands the code off. Without a handler this is a no-op (#177).
  const importCode = (code: string) => {
    onImportCode?.(code);
  };

  const experimentModeControls = canUseExperimentMode && classId ? (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: experimentMode ? "rgba(87, 6, 140, 0.04)" : "background.paper",
        transition: "background-color 0.2s ease",
      }}
    >
      {/* Toggle row stays put; the panel below drawers open beneath it. */}
      <Box sx={{ px: 2, py: 1.08 }}>
        <FormControlLabel
          label="Experiment"
          sx={{
            ml: 0,
            mr: 0,
            "& .MuiFormControlLabel-label": {
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              color: experimentMode ? "primary.main" : "#77777F",
            },
          }}
          control={
            <Switch
              size="small"
              checked={experimentMode}
              onChange={(event) => setExperimentMode(event.target.checked)}
              sx={{
                "& .MuiSwitch-track": {
                  borderRadius: 999,
                  opacity: 1,
                  bgcolor: "rgba(0,0,0,0.25)",
                },
                "& .MuiSwitch-thumb": {
                  borderRadius: "50%",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                },
                "& .MuiSwitch-switchBase.Mui-checked": { color: "#fff" },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  bgcolor: "primary.main",
                  opacity: 1,
                },
              }}
              slotProps={{
                input: { "aria-label": "Experiment mode" }
              }}
            />
          }
        />
      </Box>

      {/* Drawer-style reveal (no shadow) for the experiment/variant picker. */}
      <Collapse in={experimentMode} timeout={280} unmountOnExit>
        <Box sx={{ px: 2, pb: 1.25 }}>
          <Stack spacing={1.25}>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="experiment-preview-select-label">
                Experiment
              </InputLabel>
              <Select
                labelId="experiment-preview-select-label"
                id="experiment-preview-select"
                value={selectedExperimentId}
                label="Experiment"
                disabled={loadingExperiments || experiments.length === 0}
                onChange={(event) => {
                  const experimentId = event.target.value;
                  const experiment = experiments.find(
                    (item) => item.id === experimentId,
                  );
                  setSelectedExperimentId(experimentId);
                  setSelectedVariantKey(
                    experiment?.config.variants[0]?.key ?? "",
                  );
                }}
                sx={{ borderRadius: 2 }}
              >
                {experiments.map((experiment) => (
                  <MenuItem key={experiment.id} value={experiment.id}>
                    {experiment.name || "Untitled experiment"} · {experiment.status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {experimentError && (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {experimentError}
              </Typography>
            )}
            {loadingExperiments && (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                Loading experiments...
              </Typography>
            )}
            {!loadingExperiments && !experimentError && experiments.length === 0 && (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                No experiments have been created for this class.
              </Typography>
            )}
            {selectedExperiment && canCompare && (
              <FormControlLabel
                label="Compare two variants side by side"
                sx={{
                  ml: 0,
                  mr: 0,
                  "& .MuiFormControlLabel-label": {
                    fontSize: 12,
                    color: compareMode ? "primary.main" : "text.secondary",
                    fontWeight: compareMode ? 600 : 400,
                  },
                }}
                control={
                  <Switch
                    size="small"
                    checked={compareMode}
                    onChange={(event) => setCompareMode(event.target.checked)}
                    slotProps={{
                      input: { "aria-label": "Compare two variants" }
                    }}
                  />
                }
              />
            )}

            {/* Compare mode picks two variants; single mode keeps the chip row. */}
            {selectedExperiment && compareMode && canCompare && (
              <Stack direction="row" spacing={1}>
                {(
                  [
                    ["A", compareVariantKeyA, setCompareVariantKeyA],
                    ["B", compareVariantKeyB, setCompareVariantKeyB],
                  ] as const
                ).map(([slot, value, setValue]) => (
                  <FormControl key={slot} size="small" sx={{ flex: 1, minWidth: 0 }}>
                    <InputLabel id={`compare-variant-${slot}-label`}>
                      {`Variant ${slot}`}
                    </InputLabel>
                    <Select
                      labelId={`compare-variant-${slot}-label`}
                      id={`compare-variant-${slot}`}
                      value={value}
                      label={`Variant ${slot}`}
                      onChange={(event) => setValue(event.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      {experimentVariants.map((variant) => (
                        <MenuItem key={variant.key} value={variant.key}>
                          {variant.label} · {variant.config.engine}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ))}
              </Stack>
            )}

            {compareMode && canCompare && compareVariantKeyA === compareVariantKeyB && (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                Both columns run the same variant — pick two different ones to
                see a difference.
              </Typography>
            )}

            {selectedExperiment && !compareMode && (
              <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.25 }}>
                {selectedExperiment.config.variants.map((variant) => {
                  const selected = variant.key === selectedVariantKey;
                  return (
                    <Button
                      key={variant.key}
                      variant={selected ? "contained" : "outlined"}
                      onClick={() => setSelectedVariantKey(variant.key)}
                      sx={{
                        minWidth: 168,
                        flex: "1 0 168px",
                        justifyContent: "space-between",
                        textTransform: "none",
                        borderRadius: 3,
                        px: 1.5,
                        py: 0.85,
                        borderColor: selected ? "transparent" : "divider",
                        bgcolor: selected ? "primary.main" : "background.paper",
                        color: selected ? "primary.contrastText" : "text.primary",
                        boxShadow: "none",
                        "&:hover": {
                          boxShadow: "none",
                          borderColor: selected ? "transparent" : "primary.main",
                          bgcolor: selected ? "#4a0577" : "action.hover",
                        },
                      }}
                    >
                      <Box sx={{ minWidth: 0, textAlign: "left" }}>
                        <Typography variant="body2" noWrap sx={{
                          fontWeight: 700
                        }}>
                          {variant.label}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.75 }} noWrap>
                          {variant.key}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={variant.config.engine}
                        sx={{
                          ml: 1,
                          height: 22,
                          borderRadius: 999,
                          bgcolor: selected ? "rgba(255,255,255,0.22)" : "action.hover",
                          color: selected ? "#fff" : "text.secondary",
                        }}
                      />
                    </Button>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  ) : null;

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column"
      }}>
      <Stack
        sx={{
          height: "100%",
          flexGrow: 1
        }}>
        {/* Session Picker Header — 44px content + 1px border to match the main
            page's tab bar (44px Tabs + 1px border), so the divider below lines
            up with the tab strip's border in side-panel modes. */}
        <Box sx={{ px: 2, height: 45, flexShrink: 0, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => {
              if (!showSessionPicker) loadAvailableSessions();
              setShowSessionPicker(!showSessionPicker);
            }}
            title="Chat history"
          >
            <HistoryIcon fontSize="small" />
          </IconButton>
          <Typography
            sx={{
              flexGrow: 1,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: '#77777F',
            }}
          >
            {currentConversationId ? 'Current session' : 'New session'}
          </Typography>
          <IconButton size="small" onClick={startNewConversation} title="New chat">
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              if (!showSessionPicker) loadAvailableSessions();
              setShowSessionPicker(!showSessionPicker);
            }}
          >
            {showSessionPicker ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>

        {/* Session List */}
        <Collapse in={showSessionPicker}>
          <Box sx={{ maxHeight: 200, overflow: 'auto', borderBottom: 1, borderColor: 'divider' }}>
            {loadingSessions ? (
              <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                Loading sessions...
              </Typography>
            ) : availableSessions.length === 0 ? (
              <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                No previous sessions
              </Typography>
            ) : (
              <List dense disablePadding>
                {availableSessions.map((session) => (
                  <ListItemButton
                    key={session.conversationId}
                    selected={session.conversationId === currentConversationId}
                    onClick={() => loadConversation(session.conversationId)}
                    sx={{ py: 0.5 }}
                  >
                    <ListItemText
                      primary={session.firstMessage + (session.firstMessage.length >= 50 ? '...' : '')}
                      secondary={new Date(session.timestamp).toLocaleDateString()}
                      slotProps={{
                        primary: { variant: 'body2', noWrap: true },
                        secondary: { variant: 'caption' }
                      }} />
                    <Chip label={session.messageCount} size="small" sx={{ ml: 1 }} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Collapse>

        {experimentModeControls}

        <Box sx={{ position: "relative", flexGrow: 1, minHeight: 0 }}>
          {compareActive ? (
            <Box sx={{ position: "absolute", inset: 0 }}>
              <ExperimentCompare
                laneA={laneA}
                laneB={laneB}
                variantA={compareVariantA}
                variantB={compareVariantB}
                importCode={importCode}
              />
            </Box>
          ) : (
            <Box sx={{ position: "absolute", height: "100%", width: "100%", top: 0, left: 0, bottom: 0, right: 0, overflow: "auto" }}>
              <ChatMessages
                chatMessages={chatMessages}
                handleSendRetryMessage={handleSendRetryMessage}
                messageEndRef={messageEndRef}
                importCode={importCode}
              />
            </Box>
          )}
        </Box>

        <Divider />

        <Box sx={{
          padding: 1
        }}>
          <form ref={formRef} onSubmit={handleSubmit}>
            <Grid container columnSpacing={1} columns={16} direction="row">
              {qwenEnabled && !experimentMode && (
                <Grid
                  size={16}
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                  }}>
                  <FormControl size="small">
                    <InputLabel id="model-select-label">Model</InputLabel>
                    <Select
                      labelId="model-select-label"
                      id="model-select"
                      value={engineChoice}
                      label="Model"
                      onChange={(e) => {
                        if (e.target.value) {
                          localStorage.setItem("engineChoice", e.target.value);
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

              <Grid size={{ xs: 15, sm: 13, md: 16 }}>
                <ChatField
                  botAnswering={
                    compareActive ? laneA.busy || laneB.busy : botAnswering
                  }
                  setPrompt={setPrompt}
                  prompt={prompt}
                  formRef={formRef}
                />
              </Grid>
            </Grid>
          </form>
        </Box>
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

export default ChatCore;
