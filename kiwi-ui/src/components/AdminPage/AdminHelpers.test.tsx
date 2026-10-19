import { act, fireEvent, render, screen } from "@testing-library/react";
import { Button } from "@mui/material";
import AdminTablePagination from "./AdminTablePagination.tsx";
import AdminToast, { TOAST_AUTO_HIDE_MS } from "./AdminToast.tsx";
import DisabledReason from "./DisabledReason.tsx";
import TruncatedText from "./TruncatedText.tsx";
import { countNoun, formatCount } from "./countNoun.ts";
import { densityAttr } from "./regionDensity.ts";

describe("countNoun", () => {
  it("writes the singular for exactly one and the plural otherwise", () => {
    expect(countNoun(1, "user")).toBe("1 user");
    expect(countNoun(0, "user")).toBe("0 users");
    expect(countNoun(12, "user")).toBe("12 users");
    expect(countNoun(1234, "student")).toBe("1,234 students");
  });

  it("pluralises the last word of a noun phrase with the regular endings", () => {
    expect(countNoun(1, "selected user")).toBe("1 selected user");
    expect(countNoun(3, "pending user")).toBe("3 pending users");
    expect(countNoun(2, "class")).toBe("2 classes");
    expect(countNoun(2, "entry")).toBe("2 entries");
    expect(countNoun(2, "day")).toBe("2 days");
  });

  it("groups counts with a fixed en-US format", () => {
    expect(formatCount(1234567)).toBe("1,234,567");
  });
});

describe("densityAttr", () => {
  it("reads the density of the region a node sits in", () => {
    const { container } = render(
      <div data-density="compact">
        <span id="inside">x</span>
      </div>,
    );
    expect(densityAttr(container.querySelector("#inside"))).toEqual({ "data-density": "compact" });
    expect(densityAttr(null)).toEqual({});
  });
});

describe("DisabledReason", () => {
  it("states the reason of an unavailable control on hover, linked as its description", async () => {
    render(
      <DisabledReason reason="Select users to remove.">
        <Button aria-disabled>Remove selected (0)</Button>
      </DisabledReason>,
    );

    const button = screen.getByRole("button", { name: "Remove selected (0)" });
    fireEvent.mouseOver(button);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Select users to remove.");
    expect(button).toHaveAccessibleDescription("Select users to remove.");
  });

  it("stays silent while the control is available", () => {
    render(
      <DisabledReason reason={null}>
        <Button>Remove selected (2)</Button>
      </DisabledReason>,
    );

    const button = screen.getByRole("button", { name: "Remove selected (2)" });
    fireEvent.mouseOver(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(button).not.toHaveAttribute("title");
  });
});

describe("TruncatedText", () => {
  it("is plain text with no tab stop while it fits", () => {
    render(<TruncatedText text="lena.hartmann@example.edu" />);

    const span = screen.getByText("lena.hartmann@example.edu");
    expect(span).not.toHaveAttribute("tabindex");
    expect(span).toHaveStyle({ whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" });
  });

  it("becomes focusable and offers its full text while it is cut", async () => {
    const scrollWidth = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(400);
    const clientWidth = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(120);

    try {
      render(<TruncatedText text="jordan.lee.teaching-assistant-coordinator@example.edu" />);

      const span = screen.getByText("jordan.lee.teaching-assistant-coordinator@example.edu");
      expect(span).toHaveAttribute("tabindex", "0");
      fireEvent.mouseOver(span);
      expect(await screen.findByRole("tooltip")).toHaveTextContent(
        "jordan.lee.teaching-assistant-coordinator@example.edu",
      );
    } finally {
      scrollWidth.mockRestore();
      clientWidth.mockRestore();
    }
  });
});

describe("AdminTablePagination", () => {
  it("counts the rows shown and moves between pages", () => {
    const onPageChange = vi.fn();
    render(<AdminTablePagination page={1} pageSize={15} total={20} onPageChange={onPageChange} />);

    expect(screen.getByText("1–15 of 20")).toHaveStyle({ fontVariantNumeric: "tabular-nums" });

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "Last page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it("keeps the unavailable buttons focusable, inert and explained", async () => {
    const onPageChange = vi.fn();
    render(<AdminTablePagination page={2} pageSize={15} total={20} onPageChange={onPageChange} />);

    expect(screen.getByText("16–20 of 20")).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "Next page" });
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next).not.toBeDisabled();
    fireEvent.click(next);
    expect(onPageChange).not.toHaveBeenCalled();

    fireEvent.mouseOver(next);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("This is the last page.");

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});

describe("AdminToast", () => {
  it("shows a success toast with its icon and Dismiss, and leaves after 6 s", () => {
    vi.useFakeTimers();
    try {
      const onClose = vi.fn();
      render(<AdminToast open severity="success" message="Class saved" onClose={onClose} />);

      expect(screen.getByRole("status")).toHaveTextContent("Class saved");
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(onClose).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(TOAST_AUTO_HIDE_MS + 10);
      });
      expect(onClose).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps an error toast until it is dismissed", () => {
    vi.useFakeTimers();
    try {
      const onClose = vi.fn();
      render(
        <AdminToast open severity="error" message="Couldn't remove everyone you selected." onClose={onClose} />,
      );

      expect(screen.getByRole("alert")).toHaveTextContent("Couldn't remove everyone you selected.");
      act(() => {
        vi.advanceTimersByTime(TOAST_AUTO_HIDE_MS * 3);
      });
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
