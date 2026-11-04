import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider } from "@mui/material/styles";
import { createKiwiTheme } from "../../Theme.ts";
import codePanelReducer from "../../redux/codePanelSlice.ts";
import interactionIdReducer from "../../redux/interactionIdSlice.ts";
import type { ChatMessage } from "./ChatMessages.tsx";
import ExperimentCompare from "./ExperimentCompare.tsx";
import type { ChatLane } from "./useChatLane.ts";

vi.mock("../../utils/api.ts", () => ({
  default: {
    documentControllerRetrieveDocument: vi.fn().mockResolvedValue({ document: { documentContent: "" } }),
    interactionControllerAddInteraction: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../../theme/displayPreferences.tsx", () => ({
  useDisplayPreferences: () => ({ motionAllowed: true }),
}));

const question: ChatMessage = { isAi: false, content: "What does na.rm do?", error: false };
const waiting: ChatMessage = { isAi: true, content: "...", typing: true, error: false, streaming: "null" };
const streaming: ChatMessage = { isAi: true, content: "It drops", error: false, streaming: "null" };
const finished: ChatMessage = { isAi: true, content: "It drops missing values.", error: false, streaming: "stop" };

const lane = (overrides: Partial<ChatLane> = {}): ChatLane => ({
  variantKey: "v",
  messages: [],
  busy: false,
  error: null,
  send: vi.fn(),
  stop: vi.fn(),
  stopped: false,
  reset: vi.fn(),
  ...overrides,
});

const store = configureStore({ reducer: { interactionId: interactionIdReducer, codePanel: codePanelReducer } });

const ui = (laneA: ChatLane, laneB: ChatLane) => (
  <Provider store={store}>
    <ThemeProvider theme={createKiwiTheme({ dark: false })}>
      <ExperimentCompare laneA={laneA} laneB={laneB} variantA={null} variantB={null} importCode={vi.fn()} />
    </ThemeProvider>
  </Provider>
);

/** A column's status line, or null when it has none. */
const lineOf = (container: HTMLElement, slot: "A" | "B") =>
  container.querySelector<HTMLElement>(`[data-slot="${slot}"] .kiwi-status-line`);

describe("ExperimentCompare status lines", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("plays only column A's line when one send starts both, and hands over to B at B's first token", () => {
    const { container, rerender } = render(ui(lane(), lane()));

    rerender(ui(lane({ busy: true, messages: [question, waiting] }), lane({ busy: true, messages: [question, waiting] })));
    expect(lineOf(container, "A")).toHaveAttribute("data-motion", "on");
    expect(lineOf(container, "B")).toHaveAttribute("data-motion", "off");
    expect(lineOf(container, "B")).toHaveTextContent("Foraging…");

    rerender(ui(lane({ busy: true, messages: [question, waiting] }), lane({ busy: true, messages: [question, streaming] })));
    expect(lineOf(container, "A")).toHaveAttribute("data-motion", "off");
    expect(lineOf(container, "B")).toHaveAttribute("data-motion", "on");
    expect(lineOf(container, "B")).toHaveTextContent("Jotting it down…");
  });

  it("lets the column that is not the mover leave with no flight when it completes", () => {
    const { container, rerender } = render(ui(lane(), lane()));
    rerender(ui(lane({ busy: true, messages: [question, waiting] }), lane({ busy: true, messages: [question, waiting] })));
    rerender(ui(lane({ busy: true, messages: [question, waiting] }), lane({ busy: true, messages: [question, streaming] })));

    rerender(ui(lane({ busy: false, messages: [question, finished] }), lane({ busy: true, messages: [question, streaming] })));

    expect(lineOf(container, "A")).toBeNull();
    expect(lineOf(container, "B")).toHaveAttribute("data-motion", "on");
  });

  it("cuts a stopped column's line at once", () => {
    const { container, rerender } = render(ui(lane(), lane()));
    rerender(ui(lane({ busy: true, messages: [question, waiting] }), lane({ busy: true, messages: [question, waiting] })));

    rerender(ui(lane({ busy: false, stopped: true, messages: [question, { ...streaming, streaming: "stop" }] }), lane({ busy: true, messages: [question, waiting] })));

    expect(lineOf(container, "A")).toBeNull();
    // With A gone, B's line is the only one left, so it plays.
    expect(lineOf(container, "B")).toHaveAttribute("data-motion", "on");
  });
});
