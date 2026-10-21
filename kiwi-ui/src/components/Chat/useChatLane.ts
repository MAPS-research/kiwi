import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useCallback, useEffect, useRef, useState } from "react";
import apiClient, { basePath } from "../../utils/api.ts";
import type { ChatContextParams } from "./chatContext.ts";
import { buildChatContext } from "./chatContext.ts";
import type { ChatMessage } from "./ChatMessages.tsx";

/**
 * One independent chat stream pinned to a single experiment variant.
 *
 * Compare mode runs two of these against the same prompt, so each lane owns its
 * own message list and conversationId: the backend groups history by
 * conversationId, and interleaving two variants into one thread would corrupt
 * both the transcript and the follow-up context each variant sees.
 *
 * Deliberately narrower than ChatCore's stream: no client-tool round-trips and
 * no navigation. Two agents driving the same page at once would fight over it,
 * and compare mode exists to diff *answers*, not page automation.
 */
export interface ChatLane {
  /** Variant this lane previews; empty when the lane is unconfigured. */
  variantKey: string;
  messages: ChatMessage[];
  busy: boolean;
  error: string | null;
  send: (prompt: string) => void;
  /** Stops the answer in flight: what arrived stays, an answer with no text yet goes. */
  stop: () => void;
  /** The last answer was stopped, not finished (until the next send or reset). */
  stopped: boolean;
  reset: () => void;
}

export interface UseChatLaneOptions extends ChatContextParams {
  /** Experiment being previewed; the lane is inert without it. */
  experimentId?: string;
  variantKey?: string;
  /** Turn the lane off entirely (compare mode closed). */
  enabled: boolean;
}

const SIGN_IN_EXPIRED =
  "Couldn't send your question. Your sign-in has expired. Your question isn't saved. Copy it, then reload the page to sign in again.";

const newConversationId = (): string =>
  (globalThis.crypto?.randomUUID?.() as string) ||
  `conv-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

export const useChatLane = ({
  enabled,
  experimentId,
  variantKey,
  ...contextParams
}: UseChatLaneOptions): ChatLane => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);

  const conversationIdRef = useRef<string | null>(null);
  const loaderIdRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);

  // React may defer a functional setState, so the transcript is mirrored in a
  // ref: `send` has to read the history it just appended to in the same tick to
  // build the request body.
  const messagesRef = useRef<ChatMessage[]>([]);
  const applyMessages = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      messagesRef.current = updater(messagesRef.current);
      setMessages(messagesRef.current);
    },
    [],
  );

  // Latest context/variant without re-creating `send` on every keystroke
  // upstream (pdfPage, appContext, etc. change constantly).
  const contextRef = useRef(contextParams);
  contextRef.current = contextParams;
  const variantRef = useRef({ experimentId, variantKey });
  variantRef.current = { experimentId, variantKey };

  useEffect(() => () => abortRef.current?.abort(), []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    conversationIdRef.current = null;
    messagesRef.current = [];
    setMessages([]);
    setBusy(false);
    setError(null);
    setStopped(false);
  }, []);

  // Switching variant makes the existing transcript meaningless — it was
  // produced by a different configuration. Start the lane clean.
  useEffect(() => {
    clear();
  }, [experimentId, variantKey, clear]);

  /** Real turns only — the loader bubble and typing placeholders are UI-only. */
  const conversationHistory = (
    current: ChatMessage[],
  ): { role: "user" | "assistant"; content: string }[] =>
    current
      .filter((m) => !m.typing && !m.error && m.content && m.content !== "...")
      .map((m) => ({
        role: m.isAi ? ("assistant" as const) : ("user" as const),
        content: m.content.trim(),
      }))
      .filter((t) => t.content)
      .slice(-10);

  /** Close out the pending loader bubble with a final message. */
  const finalizeLoader = (content: string, isError: boolean) => {
    applyMessages((prev) =>
      prev.map((msg) =>
        msg.uniqueId === loaderIdRef.current && msg.typing
          ? {
              ...msg,
              typing: false,
              streaming: "stop",
              content,
              error: isError,
            }
          : msg,
      ),
    );
  };

  const stream = (payload: Record<string, any>) => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setBusy(false);
      setError(SIGN_IN_EXPIRED);
      finalizeLoader(SIGN_IN_EXPIRED, true);
      return;
    }

    abortRef.current?.abort();

    const makeRequest = (authToken: string) => {
      const abort = new AbortController();
      abortRef.current = abort;
      fetchEventSource(`${basePath}/student/chat/v2`, {
        method: "POST",
        signal: abort.signal,
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        openWhenHidden: true,
        body: JSON.stringify(payload),
        credentials: "include",
        onopen(response) {
          return new Promise<void>((resolve, reject) => {
            if (response.ok && response.status === 200) {
              resolve();
            } else if (response.status === 401) {
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
                      accessTokenResponse.accessToken,
                    );
                    abort.abort();
                    makeRequest(accessTokenResponse.accessToken);
                    reject(new Error("Request superseded after token refresh"));
                    return;
                  }
                  failRefresh();
                })
                .catch(failRefresh);
            } else {
              const message =
                response.status === 429
                  ? "Kiwi can't answer right now. You've reached your usage limit. Ask your instructor or an administrator about it."
                  : response.status === 403
                    ? "Kiwi can't answer in this preview. Your account can't preview this variant. Ask an administrator for access."
                    : `Kiwi couldn't answer in this preview. The server returned an error (${response.status}). Try again in a moment.`;
              setError(message);
              setBusy(false);
              finalizeLoader(message, true);
              reject(new Error(message));
            }
          });
        },
        onmessage(event) {
          if (!event.data) return;
          try {
            const parsedData = JSON.parse(event.data);

            // Compare lanes don't drive the page (see the note on ChatLane).
            // Close the bubble out rather than letting it hang on "...".
            const clientAction =
              parsedData.clientAction || parsedData.data?.clientAction;
            if (clientAction) {
              finalizeLoader(
                "This variant asked to act on the page. Page actions are off in compare mode. " +
                  "Run it in the normal chat to try them.",
                false,
              );
              setBusy(false);
              abort.abort();
              return;
            }

            if (!parsedData.bot) return;

            const { botResponse, streaming, citations, id } = parsedData.bot;
            applyMessages((prev) =>
              prev.map((msg, idx) =>
                idx === prev.length - 1 &&
                (msg.uniqueId === loaderIdRef.current || msg.uniqueId === id)
                  ? {
                      ...msg,
                      uniqueId: id,
                      content: botResponse,
                      streaming,
                      typing: false,
                      citations,
                    }
                  : msg,
              ),
            );

            if (streaming === "stop") setBusy(false);
          } catch (err) {
            console.error("[useChatLane] Error parsing JSON:", err, event.data);
          }
        },
        onerror(err) {
          console.error("[useChatLane] Stream error:", err);
          setBusy(false);
          setError(
            "Kiwi couldn't finish answering. The connection was lost. Check your connection, then try again.",
          );
          // Returning stops fetch-event-source from retrying forever; throwing
          // is how the library is told to give up.
          throw err instanceof Error ? err : new Error("Stream error");
        },
        onclose() {
          setBusy(false);
          // A stream that closed before any bot frame arrived would otherwise
          // leave the "..." loader spinning forever.
          finalizeLoader(
            "Kiwi couldn't finish answering. The server didn't respond as expected. Try again.",
            true,
          );
        },
      }).catch(() => {
        // onopen/onerror already surfaced the failure to the user.
        setBusy(false);
      });
    };

    makeRequest(token);
  };

  const send = useCallback(
    (promptMessage: string) => {
      const { experimentId: expId, variantKey: variant } = variantRef.current;
      if (!enabled || !expId || !variant || !promptMessage.trim()) return;

      setError(null);
      setStopped(false);
      setBusy(true);

      const loaderId = `loading-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      loaderIdRef.current = loaderId;

      const conversation = conversationHistory(messagesRef.current);
      applyMessages((prev) => [
        ...prev,
        { isAi: false, content: promptMessage, error: false },
        {
          isAi: true,
          content: "...",
          typing: true,
          uniqueId: loaderId,
          imgURLs: [],
          error: false,
          streaming: "null",
        },
      ]);

      if (!conversationIdRef.current) {
        conversationIdRef.current = newConversationId();
      }

      stream({
        prompt: promptMessage,
        conversationId: conversationIdRef.current,
        ...(conversation.length > 0 && { conversation }),
        // engineChoice is intentionally omitted: the previewed variant's config
        // decides the engine server-side, and sending one here would only ever
        // be overridden.
        context: buildChatContext({
          ...contextRef.current,
          experiment: { experimentId: expId, variantKey: variant },
        }),
      });
    },
    [enabled, applyMessages],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setBusy(false);
    setStopped(true);
    applyMessages((prev) => {
      const last = prev[prev.length - 1];
      if (!last?.isAi || last.error || last.streaming === "stop") return prev;
      // Nothing arrived yet: there is no answer to keep.
      if (last.typing) return prev.slice(0, -1);
      return prev.map((msg, idx) => (idx === prev.length - 1 ? { ...msg, streaming: "stop" } : msg));
    });
  }, [applyMessages]);

  return { variantKey: variantKey ?? "", messages, busy, error, send, stop, stopped, reset: clear };
};
