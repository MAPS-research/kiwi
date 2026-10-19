import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AgentStepChain, {
  agentStepOf,
  foldAgentStep,
  type AgentStep,
} from "./AgentStepChain.tsx";

describe("agentStepOf", () => {
  it("reads a bare tool narration bubble", () => {
    expect(agentStepOf({ isAi: true, content: "Using get_sitemap..." })).toEqual({
      toolName: "get_sitemap",
      thinking: undefined,
      status: "complete",
    });
  });

  it("keeps the text the agent said before the call as thinking", () => {
    expect(
      agentStepOf({
        isAi: true,
        content: "I'll open the analytics page.\n\nUsing navigate...",
      }),
    ).toEqual({
      toolName: "navigate",
      thinking: "I'll open the analytics page.",
      status: "complete",
    });
  });

  it("handles hyphenated tool names", () => {
    expect(agentStepOf({ isAi: true, content: "Using class-analytics..." })?.toolName).toBe(
      "class-analytics",
    );
  });

  it("does not mistake prose for a tool call", () => {
    // The marker is anchored at the end and the token is identifier-shaped, so
    // an answer that merely talks about "using" something stays an answer.
    expect(
      agentStepOf({
        isAi: true,
        content: "You can solve this using recursion... then return the base case.",
      }),
    ).toBeNull();
  });

  it("ignores user turns, loaders and errors", () => {
    expect(agentStepOf({ isAi: false, content: "Using navigate..." })).toBeNull();
    expect(agentStepOf({ isAi: true, content: "Using navigate...", typing: true })).toBeNull();
    expect(agentStepOf({ isAi: true, content: "Using navigate...", error: true })).toBeNull();
  });
});

const steps: AgentStep[] = [
  { toolName: "get_sitemap", status: "complete" },
  { toolName: "list_classes", status: "complete" },
  { toolName: "navigate", status: "complete" },
];

describe("AgentStepChain", () => {
  it("summarises a finished turn and starts collapsed", () => {
    render(<AgentStepChain steps={steps} running={false} />);
    expect(screen.getByText("3 steps")).toBeInTheDocument();
    expect(screen.queryByText("Checking the page list")).not.toBeInTheDocument();
  });

  it("expands and collapses on click", () => {
    render(<AgentStepChain steps={steps} running={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Show Kiwi's steps" }));
    expect(screen.getByText("Checking the page list")).toBeInTheDocument();
    expect(screen.getByText("Opening a page for you")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide Kiwi's steps" }));
    expect(screen.getByRole("button", { name: "Show Kiwi's steps" })).toBeInTheDocument();
  });

  it("opens itself while the turn is still running", () => {
    render(<AgentStepChain steps={steps} running />);
    expect(screen.getByText("Working…")).toBeInTheDocument();
    expect(screen.getByText("Checking the page list")).toBeInTheDocument();
  });

  it("folds a repeated tool into one row and flags it as stuck", () => {
    const looping: AgentStep[] = [
      { toolName: "get_sitemap", status: "complete" },
      { toolName: "get_sitemap", status: "complete" },
      { toolName: "get_sitemap", status: "complete" },
    ];
    render(<AgentStepChain steps={looping} running={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Show Kiwi's steps" }));
    expect(screen.getByText("×3")).toBeInTheDocument();
    expect(screen.getByText(/may be stuck/i)).toBeInTheDocument();
  });

  it("shows the thinking text alongside its step", () => {
    render(
      <AgentStepChain
        steps={[{ toolName: "navigate", thinking: "Opening analytics.", status: "complete" }]}
        running={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show Kiwi's steps" }));
    expect(screen.getByText("Opening analytics.")).toBeInTheDocument();
  });
});

/**
 * The backend overwrites the narration bubble with the answer, so these frames
 * are the only record a server-side tool call ever leaves.
 */
describe("foldAgentStep", () => {
  it("records a tool call from a streamed frame", () => {
    const steps = foldAgentStep([], "Using class-analytics...");
    expect(steps).toEqual([
      { toolName: "class-analytics", thinking: undefined, status: "running" },
    ]);
  });

  it("refreshes one in-flight call instead of stacking duplicates", () => {
    let steps = foldAgentStep([], "Using class-analytics...");
    steps = foldAgentStep(steps, "Let me pull the numbers.\n\nUsing class-analytics...");
    steps = foldAgentStep(steps, "Let me pull the numbers for you.\n\nUsing class-analytics...");
    expect(steps).toHaveLength(1);
    expect(steps[0].thinking).toBe("Let me pull the numbers for you.");
    expect(steps[0].status).toBe("running");
  });

  it("completes the previous step when a different tool starts", () => {
    let steps = foldAgentStep([], "Using get_sitemap...");
    steps = foldAgentStep(steps, "Using navigate...");
    expect(steps.map((s) => [s.toolName, s.status])).toEqual([
      ["get_sitemap", "complete"],
      ["navigate", "running"],
    ]);
  });

  it("completes everything when the stream stops", () => {
    let steps = foldAgentStep([], "Using navigate...");
    steps = foldAgentStep(steps, "Here are the analytics.", "stop");
    expect(steps).toHaveLength(1);
    expect(steps[0].status).toBe("complete");
  });

  it("leaves the list alone for frames that carry no tool call", () => {
    const steps = foldAgentStep([], "Here's a quick behavioural snapshot.");
    expect(steps).toEqual([]);
  });

  it("survives the answer overwriting the narration bubble", () => {
    // The exact sequence that used to make the chain vanish: narration frame,
    // then the final answer replacing that same bubble's content.
    let steps = foldAgentStep([], "Using class-analytics...");
    steps = foldAgentStep(steps, "Here's a quick behavioural snapshot for this class:", "stop");
    expect(steps.map((s) => s.toolName)).toEqual(["class-analytics"]);
  });
});
