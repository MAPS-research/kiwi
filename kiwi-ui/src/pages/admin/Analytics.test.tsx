import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router-dom";
import theme from "../../Theme.ts";
import apiClient from "../../utils/api.ts";
import { Analytics } from "./Analytics.tsx";

vi.mock("../../components/Analytics/StandaloneUserActivity.tsx", () => ({
  StandaloneUserActivity: () => null,
}));
vi.mock("../../components/Analytics/StandaloneDailySessions.tsx", () => ({
  StandaloneDailySessions: () => null,
}));
vi.mock("../../components/Analytics/StandaloneTopActions.tsx", () => ({
  StandaloneTopActions: () => null,
}));
vi.mock("../../components/Analytics/StandaloneUserDuration.tsx", () => ({
  StandaloneUserDuration: () => null,
}));
vi.mock("../../components/Analytics/StandaloneUserEngine.tsx", () => ({
  StandaloneUserEngine: () => null,
}));
vi.mock("../../components/Analytics/StandaloneTopTokenUsers.tsx", async () => {
  const React = await import("react");

  return {
    StandaloneTopTokenUsers: React.forwardRef((_props, ref) => {
      React.useImperativeHandle(ref, () => ({ refresh: async () => undefined }));
      return null;
    }),
  };
});

describe("System Analytics", () => {
  const loadInteractions = vi.mocked(
    apiClient.analyticsControllerPresentDateFilteredInteractions,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.authControllerGetUserRole).mockResolvedValue({ role: "admin" });
    loadInteractions.mockResolvedValue([] as never);
  });

  it("shows the refresh loading state while applying a new date range", async () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <Analytics />
        </ThemeProvider>
      </MemoryRouter>,
    );

    const refreshButton = screen.getByRole("button", { name: "Refresh analytics" });
    await waitFor(() => expect(refreshButton).toBeEnabled());

    let resolveRangeRequest: ((value: unknown[]) => void) | undefined;
    loadInteractions.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveRangeRequest = resolve;
      }) as never,
    );

    fireEvent.click(screen.getByRole("button", { name: /Select analytics period:/i }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Last 30 Days" }));

    await waitFor(() => {
      expect(refreshButton).toBeDisabled();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    resolveRangeRequest?.([]);
    await waitFor(() => expect(refreshButton).toBeEnabled());
    expect(loadInteractions).toHaveBeenCalledTimes(2);
  });
});
