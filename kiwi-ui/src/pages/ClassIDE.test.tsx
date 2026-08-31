import { render, screen, act, fireEvent } from "@testing-library/react";
import { useContext } from "react";
import { ChatContext } from "./ClassLayout.tsx";
import { IDEContext } from "../components/Chat/ChatComponent.tsx";
import ClassIDE from "./ClassIDE.tsx";

/**
 * Tests for the localStorage persistence added to the Code tab (ClassIDE).
 * IDECode is persisted per class (key `ideState_${classId}`) so it survives a
 * remount (tab-switch) and a refresh. Uploaded-file buffers are intentionally
 * NOT persisted, so file tabs reset to [Code Space] on remount.
 */

// Mock the pending-code / global-chat surface so ClassIDE can mount without a
// Router. We expose the pendingCode value per-test via a mutable holder.
// clearPendingCode is a plain spy: the real context would only drop pendingCode
// on its own state tick, so keeping it stable here avoids a mid-render flip that
// wouldn't happen in production.
const globalChatState: { pendingCode: string | undefined } = { pendingCode: undefined };
const clearPendingCode = vi.fn();
// Stable spy so tests can assert the app-context string ClassIDE publishes.
const setAppContext = vi.fn();
vi.mock("../context/GlobalChatContext.tsx", () => ({
  useGlobalChat: () => ({
    openChat: vi.fn(),
    setPendingPrompt: vi.fn(),
    setActiveTab: vi.fn(),
    setActiveView: vi.fn(),
    setActiveAppSlug: vi.fn(),
    setActiveAppName: vi.fn(),
    setAppContext,
    setAppTutoringMode: vi.fn(),
    setCurrentClassId: vi.fn(),
    pendingCode: globalChatState.pendingCode,
    clearPendingCode,
  }),
}));

// Mock CodeInterpreter to surface the IDECode coming through IDEContext, so we
// can assert what ClassIDE hydrated without pulling in Ace / Pyodide / WebR.
// Buttons let tests drive run output and language changes the way the real IDE
// component would.
vi.mock("../components/CodeInterpreter/CodeInterpreter.tsx", () => ({
  CodeInterpreter: ({ onLanguageChange }: { onLanguageChange?: (lang: "python" | "r") => void }) => {
    const { IDECode, setIDEOutputCode } = useContext(IDEContext);
    return (
      <div>
        <div data-testid="ide-code">{IDECode}</div>
        <button data-testid="set-output" onClick={() => setIDEOutputCode("42\n")} />
        <button data-testid="switch-to-r" onClick={() => onLanguageChange?.("r")} />
      </div>
    );
  },
}));

// Real in-memory localStorage (the global setup mock is a bare vi.fn()).
function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  Object.defineProperty(window, "localStorage", { value: mock, configurable: true });
  return store;
}

const renderClassIDE = (classID: string | undefined) =>
  render(
    <ChatContext.Provider value={{ class: classID ? ({ classID } as any) : undefined }}>
      <ClassIDE />
    </ChatContext.Provider>
  );

describe("ClassIDE persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalChatState.pendingCode = undefined;
  });

  it("hydrates IDECode from localStorage for the class on mount", () => {
    const store = installMemoryLocalStorage();
    store.set("ideState_class-1", JSON.stringify({ code: "print('restored')" }));

    renderClassIDE("class-1");
    expect(screen.getByTestId("ide-code").textContent).toBe("print('restored')");
  });

  it("keeps each class's code isolated (per-class key)", () => {
    const store = installMemoryLocalStorage();
    store.set("ideState_class-A", JSON.stringify({ code: "A code" }));

    // Class B has nothing stored → should render empty, not class A's code.
    renderClassIDE("class-B");
    expect(screen.getByTestId("ide-code").textContent).toBe("");
  });

  it("does not overwrite pending imported code (#177) with stored code", () => {
    const store = installMemoryLocalStorage();
    store.set("ideState_class-1", JSON.stringify({ code: "stored code" }));
    globalChatState.pendingCode = "imported code";

    renderClassIDE("class-1");
    // The #177 pendingCode effect wins over hydration.
    expect(screen.getByTestId("ide-code").textContent).toBe("imported code");
  });

  it("renders defaults without crashing when localStorage throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", { value: throwing, configurable: true });

    expect(() => renderClassIDE("class-1")).not.toThrow();
    expect(screen.getByTestId("ide-code").textContent).toBe("");
  });

  it("persists IDECode to localStorage (debounced) after import", async () => {
    vi.useFakeTimers();
    const store = installMemoryLocalStorage();
    globalChatState.pendingCode = "code to persist";

    renderClassIDE("class-1");
    // Flush the 400ms debounce on the persist effect.
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    const saved = store.get("ideState_class-1");
    expect(saved).toBeDefined();
    expect(JSON.parse(saved!).code).toBe("code to persist");
    vi.useRealTimers();
  });
});

describe("ClassIDE app context for the AI chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalChatState.pendingCode = undefined;
  });

  const lastAppContext = () =>
    setAppContext.mock.calls[setAppContext.mock.calls.length - 1]?.[0];

  it("publishes the current code with the language to the app context", () => {
    const store = installMemoryLocalStorage();
    store.set("ideState_class-1", JSON.stringify({ code: "print('hi')" }));

    renderClassIDE("class-1");
    const ctx = lastAppContext();
    expect(ctx).toContain("language: Python");
    expect(ctx).toContain("print('hi')");
    expect(ctx).not.toContain("Latest run output");
  });

  it("includes the latest run output when present", () => {
    const store = installMemoryLocalStorage();
    store.set("ideState_class-1", JSON.stringify({ code: "print(42)" }));

    renderClassIDE("class-1");
    fireEvent.click(screen.getByTestId("set-output"));
    const ctx = lastAppContext();
    expect(ctx).toContain("Latest run output");
    expect(ctx).toContain("42");
  });

  it("reflects a language switch in the app context", () => {
    const store = installMemoryLocalStorage();
    store.set("ideState_class-1", JSON.stringify({ code: "x <- 1" }));

    renderClassIDE("class-1");
    fireEvent.click(screen.getByTestId("switch-to-r"));
    expect(lastAppContext()).toContain("language: R");
  });

  it("clears the app context when the editor is empty", () => {
    installMemoryLocalStorage();

    renderClassIDE("class-1");
    expect(lastAppContext()).toBeUndefined();
  });
});
