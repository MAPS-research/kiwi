import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../../Theme.ts";
import { AnalyticsDateRangeControl } from "./AnalyticsDateRangeControl.tsx";

const renderControl = (overrides?: Partial<React.ComponentProps<typeof AnalyticsDateRangeControl>>) => {
  const onApply = vi.fn();
  const onRefresh = vi.fn();
  const props = {
    value: {
      startDate: "2026-08-12",
      startTime: "00:00",
      endDate: "2026-08-19",
      endTime: "23:59",
    },
    now: new Date("2026-08-19T18:45:00+08:00"),
    timeZone: "Asia/Shanghai",
    ...overrides,
    onApply,
    onRefresh,
  };

  render(
    <ThemeProvider theme={theme}>
      <AnalyticsDateRangeControl {...props} />
    </ThemeProvider>,
  );

  return props;
};

describe("AnalyticsDateRangeControl", () => {
  it("submits draft dates and times only when Apply is clicked", async () => {
    const props = renderControl();

    fireEvent.click(screen.getByRole("button", { name: "Choose analytics date range" }));

    const startDate = await screen.findByLabelText("Start");
    fireEvent.change(startDate, { target: { value: "2026-08-10" } });
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "06:00" } });
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2026-08-18" } });
    fireEvent.change(screen.getByLabelText("End time"), { target: { value: "18:59" } });

    expect(props.onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(props.onApply).toHaveBeenCalledWith({
      startDate: "2026-08-10",
      startTime: "06:00",
      endDate: "2026-08-18",
      endTime: "18:59",
    });
  });

  it("keeps presets in the period menu and refresh as a separate action", async () => {
    const props = renderControl();

    const trigger = screen.getByRole("button", { name: /Select analytics period:/i });
    expect(trigger).toHaveStyle({ fontSize: "0.875rem", lineHeight: "1.25rem" });
    fireEvent.click(trigger);
    const menuItem = await screen.findByRole("menuitem", { name: "Last 3 Months" });
    expect(menuItem).toHaveStyle({ fontSize: "0.875rem", lineHeight: "1.25rem" });
    const popup = document.querySelector<HTMLElement>(".MuiPopover-paper");
    expect(popup?.style.transition).toMatch(/^opacity 50ms /);
    expect(popup?.style.transition).not.toContain("transform");
    expect(popup).toHaveStyle({ minWidth: "184px" });
    expect(screen.getByRole("menuitem", { name: "Last 6 Months" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Last 12 Months" })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Last 30 Days" }));

    expect(props.onApply).toHaveBeenCalledTimes(1);
    const quickRange = props.onApply.mock.calls[0][0];
    expect(quickRange.startTime).toBe("00:00");
    expect(quickRange.endTime).toBe("23:59");
    expect(
      Math.round(
        (new Date(quickRange.endDate).getTime() - new Date(quickRange.startDate).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    ).toBe(29);

    fireEvent.click(screen.getByRole("button", { name: "Refresh analytics" }));
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });

  it("opens the calendar only from the calendar button and displays custom ranges", async () => {
    renderControl({
      value: {
        startDate: "2026-07-28",
        startTime: "00:00",
        endDate: "2026-08-06",
        endTime: "23:59",
      },
    });

    expect(screen.getByRole("button", { name: "Select analytics period: Jul 28 – Aug 6" }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Select analytics period:/i }));
    expect(await screen.findByRole("menuitem", { name: "Last 7 Days" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Start")).not.toBeInTheDocument();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Choose analytics date range" }));
    expect(await screen.findByLabelText("Start")).toBeInTheDocument();
    expect(screen.getByLabelText("Start time")).toBeInTheDocument();
    expect(screen.getByLabelText("End time")).toBeInTheDocument();
    expect(screen.queryByText("Start time")).not.toBeInTheDocument();
    expect(screen.queryByText("End time")).not.toBeInTheDocument();
  });

  it("does not label a historical 24-hour custom range as Last 24 Hours", () => {
    renderControl({
      value: {
        startDate: "2026-08-10",
        startTime: "06:00",
        endDate: "2026-08-11",
        endTime: "06:00",
      },
    });

    expect(screen.getByRole("button", {
      name: "Select analytics period: Aug 10 – Aug 11",
    })).toBeInTheDocument();
  });

  it("accepts reusable preset definitions", async () => {
    const props = renderControl({
      presets: [{
        id: "month-to-date",
        label: "Month to Date",
        resolve: () => ({
          startDate: "2026-08-01",
          startTime: "00:00",
          endDate: "2026-08-19",
          endTime: "23:59",
        }),
      }],
    });

    fireEvent.click(screen.getByRole("button", { name: /Select analytics period:/i }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Month to Date" }));

    expect(props.onApply).toHaveBeenCalledWith({
      startDate: "2026-08-01",
      startTime: "00:00",
      endDate: "2026-08-19",
      endTime: "23:59",
    });
  });
});
