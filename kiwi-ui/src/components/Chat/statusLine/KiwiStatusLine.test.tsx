import { render, screen } from "@testing-library/react";
import KiwiStatusLine from "./KiwiStatusLine.tsx";

const camera = () => screen.getByTestId("kiwi-status-line-camera");

describe("KiwiStatusLine", () => {
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  it("shows its words, with Kiwi hidden from assistive technology", () => {
    render(<KiwiStatusLine label="Foraging…" complete={false} startedAt={0} motion onGone={vi.fn()} />);

    expect(screen.getByText("Foraging…")).toBeInTheDocument();
    expect(camera().parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("runs while the answer is on its way", () => {
    render(<KiwiStatusLine label="Foraging…" complete={false} startedAt={performance.now()} motion onGone={vi.fn()} />);

    expect(camera()).toHaveAttribute("data-atlas", "walk");
  });

  it("stands still with motion off, and leaves at once when the answer completes", () => {
    const onGone = vi.fn();
    const { rerender } = render(
      <KiwiStatusLine label="Foraging…" complete={false} startedAt={0} motion={false} onGone={onGone} />
    );

    expect(camera()).toHaveAttribute("data-atlas", "stand");

    rerender(<KiwiStatusLine label="" complete startedAt={0} motion={false} onGone={onGone} />);
    expect(onGone).toHaveBeenCalledTimes(1);
  });

  it("never flies late: a completion in a hidden tab leaves at once", () => {
    const onGone = vi.fn();
    const { rerender } = render(
      <KiwiStatusLine label="Jotting it down…" complete={false} startedAt={performance.now()} motion onGone={onGone} />
    );
    Object.defineProperty(document, "hidden", { configurable: true, value: true });

    rerender(<KiwiStatusLine label="" complete startedAt={performance.now()} motion onGone={onGone} />);
    expect(onGone).toHaveBeenCalledTimes(1);
  });

  it("flies once at completion, fades, then leaves the row", () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"],
    });
    const onGone = vi.fn();
    const startedAt = performance.now();
    const { rerender } = render(
      <KiwiStatusLine label="Jotting it down…" complete={false} startedAt={startedAt} motion onGone={onGone} />
    );
    vi.advanceTimersByTime(500);

    rerender(<KiwiStatusLine label="" complete startedAt={startedAt} motion onGone={onGone} />);
    vi.advanceTimersByTime(200);
    expect(camera()).toHaveAttribute("data-atlas", "hop");
    expect(onGone).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);
    expect(onGone).toHaveBeenCalledTimes(1);
  });
});
