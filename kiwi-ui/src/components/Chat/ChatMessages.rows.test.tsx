import { act, render, screen, within, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@mui/material/styles";
import { createKiwiTheme } from "../../Theme.ts";
import codePanelReducer from "../../redux/codePanelSlice.ts";
import interactionIdReducer from "../../redux/interactionIdSlice.ts";
import ChatMessages, { isCjkDominant, type ChatMessage, type StatusLineState } from "./ChatMessages.tsx";

vi.mock("../../utils/api.ts", () => ({
  default: {
    documentControllerRetrieveDocument: vi.fn().mockResolvedValue({ document: { documentContent: "" } }),
    interactionControllerAddInteraction: vi.fn().mockResolvedValue({}),
  },
}));

const question: ChatMessage = { isAi: false, content: "Why does mean() return NA?", error: false };
const answer: ChatMessage = {
  isAi: true,
  content: "In R, `mean()` returns `NA` as soon as one value is missing.",
  uniqueId: "answer-1",
  streaming: "stop",
  error: false,
};

function renderMessages(
  chatMessages: ChatMessage[],
  { statusLine = null, handleSendRetryMessage = vi.fn(), motion = false, onStatusLineGone }: {
    statusLine?: StatusLineState | null;
    handleSendRetryMessage?: (message: ChatMessage) => void;
    motion?: boolean;
    onStatusLineGone?: (turn: number) => void;
  } = {}
) {
  const store = configureStore({ reducer: { interactionId: interactionIdReducer, codePanel: codePanelReducer } });
  const ui = (messages: ChatMessage[], line: StatusLineState | null) => (
    <Provider store={store}>
      <ThemeProvider theme={createKiwiTheme({ dark: false })}>
        <ChatMessages
          chatMessages={messages}
          handleSendRetryMessage={handleSendRetryMessage}
          messageEndRef={{ current: null } as unknown as React.RefObject<HTMLDivElement>}
          importCode={vi.fn()}
          statusLine={line}
          motion={motion}
          onStatusLineGone={onStatusLineGone}
        />
      </ThemeProvider>
    </Provider>
  );
  const view = render(ui(chatMessages, statusLine));
  return {
    ...view,
    rerenderMessages: (messages: ChatMessage[], line: StatusLineState | null) => view.rerender(ui(messages, line)),
  };
}

const running = (overrides: Partial<StatusLineState> = {}): StatusLineState => ({
  turn: 1,
  startedAt: 0,
  answerNumber: 1,
  complete: false,
  ...overrides,
});

describe("ChatMessages rows", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("opens an empty chat with Kiwi's logo and the welcome line, on the ruled column", () => {
    const { container } = renderMessages([]);

    expect(screen.getByText("Ask about your class materials or your code.")).toBeInTheDocument();
    expect(container.querySelector('img[src="/assets/images/kiwi-mark.svg"]')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("kiwi-ruled");
  });

  it("draws no avatar beside the tutor or the student", () => {
    renderMessages([question, answer]);

    expect(screen.getByText("Why does mean() return NA?", { exact: false })).toBeInTheDocument();
    expect(screen.queryByTestId("SmartToyIcon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("PersonIcon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("AndroidIcon")).not.toBeInTheDocument();
  });

  it("runs the status line with the chat's first verb while Kiwi waits, and hides the toolbar", () => {
    renderMessages([question, { isAi: true, content: "...", typing: true, uniqueId: "loading-1", streaming: "null", error: false }], {
      statusLine: running(),
    });

    expect(screen.getByText("Foraging…")).toBeInTheDocument();
    expect(screen.queryByRole("toolbar", { name: "Feedback" })).not.toBeInTheDocument();
    expect(screen.queryByText("...")).not.toBeInTheDocument();
  });

  it("picks the verb of the chat's n-th answer", () => {
    renderMessages([question, { isAi: true, content: "...", typing: true, error: false }], {
      statusLine: running({ answerNumber: 3 }),
    });

    expect(screen.getByText("Rummaging around…")).toBeInTheDocument();
  });

  it("jots the answer down while its text streams", () => {
    renderMessages([question, { ...answer, streaming: "null" }], { statusLine: running() });

    expect(screen.getByText("Jotting it down…")).toBeInTheDocument();
    expect(screen.queryByRole("toolbar", { name: "Feedback" })).not.toBeInTheDocument();
  });

  it("names the step in flight in its playful form", () => {
    renderMessages(
      [
        question,
        {
          isAi: true,
          content: "...",
          typing: true,
          error: false,
          agentSteps: [{ toolName: "get_sitemap", status: "running" }],
        },
      ],
      { statusLine: running() }
    );

    expect(screen.getByText("Peeking at the page list…")).toBeInTheDocument();
  });

  it("names a tool on the pill plainly in the status line, as the pill does", () => {
    const { container } = renderMessages(
      [question, { isAi: true, content: "", error: false, toolExecution: { toolName: "rag", status: "running" } }],
      { statusLine: running() }
    );

    expect(container.querySelector(".kiwi-status-line")).toHaveTextContent("Using Materials search…");
  });

  it("gives a finished answer its toolbar and its citations", () => {
    renderMessages([question, { ...answer, citations: [{ pdfID: "pdf-1", pageNumber: 3 }] }]);

    expect(screen.getByRole("toolbar", { name: "Feedback" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "[Page 3]" })).toBeInTheDocument();
  });

  it("sets the student's question in a bubble and leaves Kiwi's answer without one", () => {
    const { container } = renderMessages([question, answer]);

    expect(container.querySelector(".user-row")).toHaveStyle({
      backgroundColor: "var(--surface-active)",
      borderRadius: "var(--radius-sheet)",
    });
    expect(container.querySelector(".tutor-row")).not.toHaveStyle({ backgroundColor: "var(--surface-active)" });
  });

  it("starts the answer's toolbar row with the feedback buttons, before the citations", () => {
    renderMessages([question, { ...answer, citations: [{ pdfID: "pdf-1", pageNumber: 3 }] }]);

    const toolbar = screen.getByRole("toolbar", { name: "Feedback" });
    const citation = screen.getByRole("button", { name: "[Page 3]" });
    expect(toolbar.compareDocumentPosition(citation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toolbar.parentElement).not.toHaveStyle({ marginLeft: "auto" });
  });

  it("keeps the same Kiwi in place through the run, flight and fade before mounting feedback", () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"],
    });
    try {
      const onGone = vi.fn();
      const line = running({ startedAt: performance.now() });
      const messages = [question, { ...answer, citations: [{ pdfID: "pdf-1", pageNumber: 3 }] }];
      const { container, rerenderMessages } = renderMessages([question, { ...answer, typing: true }], {
        statusLine: line,
        motion: true,
        onStatusLineGone: onGone,
      });
      const camera = screen.getByTestId("kiwi-status-line-camera");
      const status = container.querySelector(".kiwi-status-line");
      const row = status?.parentElement;
      act(() => vi.advanceTimersByTime(500));
      expect(camera).toHaveAttribute("data-atlas", "walk");

      // The final text and the completion signal may render separately.
      rerenderMessages(messages, line);
      expect(container.querySelector('[role="toolbar"]')).toBeNull();
      rerenderMessages(messages, { ...line, complete: true });
      expect(screen.getByTestId("kiwi-status-line-camera")).toBe(camera);
      expect(status?.parentElement).toBe(row);
      expect(status?.parentElement).not.toHaveStyle({ position: "absolute" });
      expect(container.querySelector('[role="toolbar"]')).toBeNull();
      expect(screen.queryByRole("button", { name: "[Page 3]" })).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(200));
      expect(camera).toHaveAttribute("data-atlas", "hop");
      expect(onGone).not.toHaveBeenCalled();
      expect(container.querySelector('[role="toolbar"]')).toBeNull();

      act(() => vi.advanceTimersByTime(1000));
      expect(status).toHaveStyle({ opacity: "0" });
      expect(onGone).not.toHaveBeenCalled();
      expect(container.querySelector('[role="toolbar"]')).toBeNull();

      act(() => vi.advanceTimersByTime(200));
      expect(onGone).toHaveBeenCalledExactlyOnceWith(line.turn);
      rerenderMessages(messages, null);
      expect(screen.queryByTestId("kiwi-status-line-camera")).not.toBeInTheDocument();
      expect(screen.getByRole("toolbar", { name: "Feedback" })).toBeVisible();
      expect(screen.getByRole("button", { name: "[Page 3]" })).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });

  it("sets a CJK-dominant paragraph at the CJK leading, with upright emphasis", () => {
    const { container } = renderMessages([
      question,
      { ...answer, content: "在删除缺失值之前，先检查两件事：缺失了多少，以及它们是否随机缺失。" },
    ]);

    const paragraph = container.querySelector('p[data-script="cjk"]');
    expect(paragraph).toHaveAttribute("lang", "zh-Hans");
    expect(isCjkDominant("Here n counts only the values that are present.")).toBe(false);
  });

  it("gives a code block its two actions", () => {
    renderMessages([question, { ...answer, content: "```r\nmean(income, na.rm = TRUE)\n```" }]);

    const actions = screen.getByRole("group", { name: "Code actions" });
    expect(within(actions).getByRole("button", { name: "Import to scratchpad" })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: "Copy code" })).toBeInTheDocument();
  });

  it("states an error with Retry", () => {
    const retry = vi.fn();
    const failed: ChatMessage = {
      isAi: true,
      content: "Kiwi couldn't finish answering. The server didn't respond as expected. Try again.",
      error: true,
    };
    renderMessages([question, failed], { handleSendRetryMessage: retry });

    expect(screen.getByRole("alert")).toHaveTextContent("Kiwi couldn't finish answering.");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledWith(failed);
  });
});
