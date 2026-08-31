import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../../Theme.ts";
import { DateTimeRangePicker } from "./DateTimeRangePicker.tsx";

const value = {
  startDate: "2026-08-12",
  startTime: "00:00",
  endDate: "2026-08-19",
  endTime: "23:59",
};

function renderPicker(overrides?: Partial<React.ComponentProps<typeof DateTimeRangePicker>>) {
  const props = {
    value,
    onApply: vi.fn(),
    timeZone: "Asia/Shanghai",
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <DateTimeRangePicker {...props} />
    </ThemeProvider>,
  );
  return props;
}

describe("DateTimeRangePicker", () => {
  it("enforces reusable minimum and maximum date constraints", async () => {
    renderPicker({ minDate: "2026-08-12", maxDate: "2026-08-19" });

    fireEvent.click(screen.getByRole("button", { name: "Choose date range" }));

    expect(await screen.findByRole("button", { name: "August 11, 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "August 12, 2026" })).toHaveStyle({
      fontSize: "0.875rem",
      lineHeight: "1.25rem",
    });
    expect(screen.getByText("August 2026")).toHaveStyle({
      fontSize: "0.875rem",
      lineHeight: "1.25rem",
    });
    expect(screen.getByText("Local (Asia/Shanghai)")).toHaveStyle({
      fontSize: "0.75rem",
      lineHeight: "1rem",
    });
    const popup = document.querySelector<HTMLElement>(".MuiPopover-paper");
    expect(popup?.style.transition).toMatch(/^opacity 50ms /);
    expect(popup?.style.transition).not.toContain("transform");
    expect(screen.getByRole("button", { name: "August 12, 2026" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "August 20, 2026" })).toBeDisabled();
  });

  it("supports arrow-key navigation with a single roving tab stop", async () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Choose date range" }));
    const endDay = await screen.findByRole("button", { name: "August 19, 2026" });
    await waitFor(() => expect(endDay).toHaveFocus());

    fireEvent.keyDown(endDay, { key: "ArrowLeft" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "August 18, 2026" })).toHaveFocus();
    });

    const tabbableDays = screen.getAllByRole("button", { name: /August \d+, 2026/ })
      .filter((button) => button.getAttribute("tabindex") === "0");
    expect(tabbableDays).toHaveLength(1);
  });
});
