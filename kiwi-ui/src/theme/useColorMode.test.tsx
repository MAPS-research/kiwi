import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { createKiwiTheme } from "../Theme.ts";
import { useColorMode } from "./useColorMode.ts";

const Probe = () => <span data-testid="mode">{useColorMode()}</span>;

describe("useColorMode", () => {
  it("reads dark when the page shows the dark scheme, which palette.mode never does", () => {
    const theme = createKiwiTheme({ dark: true });
    render(
      <ThemeProvider theme={theme} defaultMode="dark" storageManager={null}>
        <Probe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    expect(theme.palette.mode).toBe("light");
  });

  it("reads light in the light scheme", () => {
    render(
      <ThemeProvider theme={createKiwiTheme({ dark: true })} defaultMode="light" storageManager={null}>
        <Probe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("light");
  });

  it("is light outside a theme provider", () => {
    render(<Probe />);

    expect(screen.getByTestId("mode")).toHaveTextContent("light");
  });
});
