import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmptyState from "./EmptyState.tsx";

describe("EmptyState", () => {
  it("shows the logo, the title, the copy and the one call to action", async () => {
    const onClick = vi.fn();
    const { container } = render(
      <EmptyState title="No classes yet" description="Create your first class." action={{ label: "Create class", onClick }} />
    );

    expect(screen.getByRole("heading", { name: "No classes yet" })).toBeInTheDocument();
    expect(screen.getByText("Create your first class.")).toBeInTheDocument();
    expect(container.querySelector('img[src="/assets/images/kiwi-mark.svg"]')).toHaveAttribute("alt", "");
    expect(container.firstChild).toHaveClass("kiwi-ruled");
    expect(container.firstChild).toHaveAttribute("data-density", "comfortable");

    await userEvent.click(screen.getByRole("button", { name: "Create class" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("has no call to action for a role without one: hidden, never disabled", () => {
    render(<EmptyState title="No classes yet" description="Your instructor adds you to a class." />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("states an error with Retry in place of the call to action", async () => {
    const onRetry = vi.fn();
    render(
      <EmptyState
        title="Couldn't load your classes"
        description="Check your connection, then try again."
        action={{ label: "Create class", onClick: vi.fn() }}
        error={{ onRetry }}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Check your connection, then try again.");
    expect(screen.queryByRole("button", { name: "Create class" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
