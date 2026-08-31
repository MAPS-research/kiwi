import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { GlobalChatProvider, useGlobalChat } from "./GlobalChatContext.tsx";

/**
 * Tests for the pendingCode channel that carries a chat "Import Code to IDE"
 * click into the IDE (issue #177). GlobalChatModal.setPendingCode stashes the
 * code and ClassIDE consumes it via pendingCode + clearPendingCode.
 */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <GlobalChatProvider>{children}</GlobalChatProvider>
  </BrowserRouter>
);

describe("GlobalChatContext pendingCode (issue #177)", () => {
  it("starts with no pending code", () => {
    const { result } = renderHook(() => useGlobalChat(), { wrapper });
    expect(result.current.pendingCode).toBeUndefined();
  });

  it("setPendingCode stashes code for the IDE to consume", () => {
    const { result } = renderHook(() => useGlobalChat(), { wrapper });
    act(() => result.current.setPendingCode("print('hello')"));
    expect(result.current.pendingCode).toBe("print('hello')");
  });

  it("clearPendingCode resets it so re-entering the IDE won't re-import", () => {
    const { result } = renderHook(() => useGlobalChat(), { wrapper });
    act(() => result.current.setPendingCode("x = 1"));
    expect(result.current.pendingCode).toBe("x = 1");
    act(() => result.current.clearPendingCode());
    expect(result.current.pendingCode).toBeUndefined();
  });

  it("pendingCode is independent of pendingPrompt (opposite direction channel)", () => {
    const { result } = renderHook(() => useGlobalChat(), { wrapper });
    act(() => {
      result.current.setPendingCode("code");
      result.current.setPendingPrompt("prompt");
    });
    expect(result.current.pendingCode).toBe("code");
    expect(result.current.pendingPrompt).toBe("prompt");
    act(() => result.current.clearPendingCode());
    expect(result.current.pendingCode).toBeUndefined();
    expect(result.current.pendingPrompt).toBe("prompt");
  });
});

/**
 * The Code tab drives these to get the tutoring guardrail on its chat requests:
 * activeView labels the sub-view, appTutoringMode carries 'guidance' (the trigger
 * the backend keys on). Both are independent of activeTab, which the Code tab keeps
 * as 'materials'.
 */
describe("GlobalChatContext activeView + tutoring mode (Code tab guardrail)", () => {
  it("defaults activeView to undefined", () => {
    const { result } = renderHook(() => useGlobalChat(), { wrapper });
    expect(result.current.activeView).toBeUndefined();
  });

  it("setActiveView sets the sub-view without touching activeTab", () => {
    const { result } = renderHook(() => useGlobalChat(), { wrapper });
    act(() => result.current.setActiveView("code"));
    expect(result.current.activeView).toBe("code");
    expect(result.current.activeTab).toBe("materials"); // unchanged
  });

  it("appTutoringMode can be 'guidance' while activeTab stays 'materials'", () => {
    const { result } = renderHook(() => useGlobalChat(), { wrapper });
    act(() => result.current.setAppTutoringMode("guidance"));
    expect(result.current.appTutoringMode).toBe("guidance");
    expect(result.current.activeTab).toBe("materials");
  });
});
